import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  isMissingProfilesTableError,
  readProfileFromUserMetadata,
} from "@/lib/profileFallback";

type ProfilePayload = {
  display_name?: unknown;
  username?: unknown;
  avatar_url?: unknown;
  bio?: unknown;
  phone?: unknown;
  timezone?: unknown;
  theme_preference?: unknown;
};

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeUsername(value: unknown) {
  const cleaned = sanitizeText(value, 32);
  if (!cleaned) return null;
  const normalized = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .replace(/^[_.-]+|[_.-]+$/g, "");
  return normalized.length > 0 ? normalized : null;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const fallbackProfile = readProfileFromUserMetadata(user);

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, username, avatar_url, bio, phone, timezone, theme_preference, created_at, updated_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    if (isMissingProfilesTableError(error)) {
      return NextResponse.json({
        profile: fallbackProfile,
        source: "auth_metadata",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data ?? fallbackProfile });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ProfilePayload;
  try {
    body = (await req.json()) as ProfilePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const displayName = sanitizeText(body.display_name, 80);
  const username = normalizeUsername(body.username);
  const avatarUrl = sanitizeText(body.avatar_url, 1024);
  const bio = sanitizeText(body.bio, 280);
  const phone = sanitizeText(body.phone, 32);
  const timezone = sanitizeText(body.timezone, 64);
  const themePreference = sanitizeText(body.theme_preference, 32);

  if (body.display_name !== undefined && !displayName) {
    return NextResponse.json(
      { error: "Display name is required." },
      { status: 400 }
    );
  }

  const updates: Record<string, string | null> = {
    id: user.id,
    display_name: displayName,
    username,
    avatar_url: avatarUrl,
    bio,
    phone,
    timezone,
    theme_preference: themePreference ?? "midnight",
  };
  const metadataUpdates: Record<string, string | null> = {};

  if (body.display_name !== undefined) metadataUpdates.display_name = displayName;
  if (body.username !== undefined) metadataUpdates.username = username;
  if (body.avatar_url !== undefined) metadataUpdates.avatar_url = avatarUrl;
  if (body.bio !== undefined) metadataUpdates.bio = bio;
  if (body.phone !== undefined) metadataUpdates.phone = phone;
  if (body.timezone !== undefined) metadataUpdates.timezone = timezone;
  if (body.theme_preference !== undefined) {
    metadataUpdates.theme_preference = themePreference ?? "midnight";
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(updates, { onConflict: "id" })
    .select(
      "id, display_name, username, avatar_url, bio, phone, timezone, theme_preference, created_at, updated_at"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }
    if (isMissingProfilesTableError(error)) {
      if (Object.keys(metadataUpdates).length === 0) {
        return NextResponse.json({
          profile: readProfileFromUserMetadata(user),
          source: "auth_metadata",
        });
      }

      const { data: authData, error: updateAuthError } =
        await supabase.auth.updateUser({
          data: metadataUpdates,
        });

      if (updateAuthError) {
        return NextResponse.json(
          {
            error:
              "Could not save profile. Database profile table is unavailable and auth metadata fallback failed.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        profile: readProfileFromUserMetadata(authData.user ?? user),
        source: "auth_metadata",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
