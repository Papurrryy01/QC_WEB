import type { User } from "@supabase/supabase-js";

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
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

export function isMissingProfilesTableError(error: SupabaseErrorLike | null | undefined) {
  if (!error) return false;

  const code = (error.code ?? "").toUpperCase();
  const message = (error.message ?? "").toLowerCase();

  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    message.includes("public.profiles") ||
    message.includes("relation \"profiles\" does not exist") ||
    message.includes("schema cache") ||
    (message.includes("profiles") && message.includes("column"))
  );
}

export function readProfileFromUserMetadata(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const emailFallback = user.email?.split("@")[0] ?? null;

  return {
    id: user.id,
    display_name: sanitizeText(meta.display_name, 80) ?? sanitizeText(emailFallback, 80),
    username: normalizeUsername(meta.username),
    avatar_url: sanitizeText(meta.avatar_url, 1024),
    bio: sanitizeText(meta.bio, 280),
    phone: sanitizeText(meta.phone, 32),
    timezone: sanitizeText(meta.timezone, 64),
    theme_preference: sanitizeText(meta.theme_preference, 32) ?? "midnight",
    created_at: user.created_at ?? null,
    updated_at: user.updated_at ?? null,
  };
}
