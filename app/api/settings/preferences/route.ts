import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  DEFAULT_QC_SETTINGS_PREFERENCES,
  mergeQcSettingsPreferences,
  normalizeQcSettingsPreferences,
  type QcSettingsPreferences,
} from "@/lib/settingsPreferences";

type SettingsUpdatePayload = Partial<QcSettingsPreferences> & {
  timezoneFallback?: string;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const fallbackTimezone =
    typeof user.user_metadata?.timezone === "string"
      ? user.user_metadata.timezone
      : DEFAULT_QC_SETTINGS_PREFERENCES.delivery.defaultTimezone;

  const preferences = normalizeQcSettingsPreferences(
    user.user_metadata?.qc_preferences,
    fallbackTimezone
  );

  return NextResponse.json({ preferences });
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

  let body: SettingsUpdatePayload;
  try {
    body = (await req.json()) as SettingsUpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const fallbackTimezone =
    typeof body.timezoneFallback === "string" && body.timezoneFallback.trim()
      ? body.timezoneFallback.trim()
      : typeof user.user_metadata?.timezone === "string" &&
          user.user_metadata.timezone.trim()
        ? user.user_metadata.timezone.trim()
        : DEFAULT_QC_SETTINGS_PREFERENCES.delivery.defaultTimezone;

  const current = normalizeQcSettingsPreferences(
    user.user_metadata?.qc_preferences,
    fallbackTimezone
  );
  const next = mergeQcSettingsPreferences(current, body, fallbackTimezone);

  const { data: authData, error: saveError } = await supabase.auth.updateUser({
    data: { qc_preferences: next },
  });

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  const saved = normalizeQcSettingsPreferences(
    authData.user?.user_metadata?.qc_preferences ?? next,
    fallbackTimezone
  );

  return NextResponse.json({ preferences: saved });
}
