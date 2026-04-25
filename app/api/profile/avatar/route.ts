import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const AVATAR_MAX_BYTES = 10 * 1024 * 1024;
const AVATAR_BUCKET = "avatars";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

type BucketCreateResult = {
  error: { message: string } | null;
};

type BucketStorage = {
  createBucket: (
    name: string,
    options: {
      public: boolean;
      fileSizeLimit: number;
      allowedMimeTypes: string[];
    }
  ) => Promise<BucketCreateResult>;
};

function sanitizeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  return cleaned || "avatar";
}

function inferFileExtension(file: File) {
  const mime = file.type.toLowerCase();
  const fromMime = MIME_TO_EXT[mime];
  if (fromMime) return fromMime;

  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  return "jpg";
}

function getStorageAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isBucketNotFoundError(message: string | undefined) {
  return (message ?? "").toLowerCase().includes("bucket not found");
}

async function ensureAvatarBucket(storage: BucketStorage) {
  const { error } = await storage.createBucket(AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: AVATAR_MAX_BYTES,
    allowedMimeTypes: Object.keys(MIME_TO_EXT),
  });

  if (!error) return;
  if (error.message.toLowerCase().includes("already exists")) return;
  throw new Error(error.message);
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid upload request." },
      { status: 400 }
    );
  }

  const fileField = formData.get("file");
  if (!(fileField instanceof File)) {
    return NextResponse.json(
      { error: "No image file was provided." },
      { status: 400 }
    );
  }

  const file = fileField;
  if (file.size <= 0) {
    return NextResponse.json(
      { error: "Image file is empty." },
      { status: 400 }
    );
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json(
      { error: "Photo must be 10MB or smaller." },
      { status: 400 }
    );
  }

  if (file.type && !file.type.toLowerCase().startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image uploads are allowed." },
      { status: 400 }
    );
  }

  const storageAdmin = getStorageAdminClient();
  if (!storageAdmin) {
    return NextResponse.json(
      { error: "Server storage is not configured." },
      { status: 500 }
    );
  }

  const ext = inferFileExtension(file);
  const baseName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, ""));
  const filePath = `${user.id}/${Date.now()}-${baseName}.${ext}`;

  const uploadObject = async () =>
    storageAdmin.storage.from(AVATAR_BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || undefined,
    });

  let { error: uploadError } = await uploadObject();

  if (uploadError && isBucketNotFoundError(uploadError.message)) {
    try {
      await ensureAvatarBucket(storageAdmin.storage as unknown as BucketStorage);
      ({ error: uploadError } = await uploadObject());
    } catch (bucketError) {
      return NextResponse.json(
        {
          error:
            bucketError instanceof Error
              ? `Upload failed: ${bucketError.message}`
              : "Upload failed while creating avatar bucket.",
        },
        { status: 500 }
      );
    }
  }

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = storageAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

  return NextResponse.json({ url: publicUrl });
}
