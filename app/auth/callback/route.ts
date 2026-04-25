import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

const CALLBACK_DEFAULT_PATH = "/dashboard";
type ProfileWriteError = { code?: string; message?: string } | null;

function resolveSafeNextPath(candidate: string | null) {
  if (!candidate) return CALLBACK_DEFAULT_PATH;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return CALLBACK_DEFAULT_PATH;
  }
  return candidate;
}

function buildLoginRedirect(origin: string, message: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

async function ensureProfileExists({
  supabase,
  userId,
  email,
  displayName,
}: {
  supabase: ReturnType<typeof createServerClient>;
  userId: string;
  email: string | null;
  displayName: string | null;
}) {
  const profilesTable = supabase.from("profiles") as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: { id?: string } | null }>;
      };
    };
    insert: (values: {
      id: string;
      display_name: string;
      theme_preference: string;
    }) => Promise<{ error: ProfileWriteError }>;
  };
  const selectPromise = profilesTable
    .select("id")
    .eq("id", userId)
    .maybeSingle() as unknown as Promise<{ data: { id?: string } | null }>;
  const { data: existing } = await selectPromise;

  if (existing?.id) return;

  const fallbackName = (displayName || email?.split("@")[0] || "QC member").slice(0, 80);
  const insertPromise = profilesTable.insert({
    id: userId,
    display_name: fallbackName,
    theme_preference: "midnight",
  }) as unknown as Promise<{ error: ProfileWriteError }>;
  const { error } = await insertPromise;

  if (!error || error.code === "23505" || error.code === "42P01") return;
  // Do not block login on profile bootstrap errors.
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const nextPath = resolveSafeNextPath(requestUrl.searchParams.get("next"));
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type");
  const providerError =
    requestUrl.searchParams.get("error_description") ??
    requestUrl.searchParams.get("error");

  if (providerError) {
    return buildLoginRedirect(requestUrl.origin, providerError);
  }

  const response = NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  type CookieSetOptions = Parameters<typeof response.cookies.set>[2];
  type CookieToSet = { name: string; value: string; options?: CookieSetOptions };
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return buildLoginRedirect(requestUrl.origin, "Could not complete sign in.");
    }
  } else if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType,
    });
    if (error) {
      return buildLoginRedirect(requestUrl.origin, "Verification link is invalid or expired.");
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildLoginRedirect(requestUrl.origin, "Sign in session could not be established.");
  }

  const metadataDisplayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : null;

  await ensureProfileExists({
    supabase,
    userId: user.id,
    email: user.email ?? null,
    displayName: metadataDisplayName,
  });

  return response;
}
