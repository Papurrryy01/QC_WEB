import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VerifyState = "missing" | "invalid" | "error";

export type WaitlistVerifyResult =
  | { ok: true; signupId: string }
  | { ok: false; state: VerifyState };

export async function resolveWaitlistVerification(
  requestUrl: string
): Promise<WaitlistVerifyResult> {
  const parsed = new URL(requestUrl);
  const token = parsed.searchParams.get("token")?.trim();
  const signupParam = parsed.searchParams.get("signup")?.trim();
  const signupFromQuery =
    signupParam && UUID_REGEX.test(signupParam) ? signupParam : null;

  if (!token) {
    return { ok: false, state: "missing" };
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, state: "error" };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const nowIso = new Date().toISOString();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    const lookup = await supabase
      .from("waitlist_signups")
      .select("id,verified_at,verify_token_expires_at")
      .eq("verify_token_hash", tokenHash)
      .limit(1)
      .maybeSingle();

    if (lookup.error) {
      return { ok: false, state: "error" };
    }

    if (!lookup.data) {
      if (signupFromQuery) {
        const byId = await supabase
          .from("waitlist_signups")
          .select("id,verified_at")
          .eq("id", signupFromQuery)
          .limit(1)
          .maybeSingle();

        if (byId.error) {
          return { ok: false, state: "error" };
        }

        if (byId.data?.verified_at) {
          return { ok: true, signupId: byId.data.id };
        }
      }

      return { ok: false, state: "invalid" };
    }

    if (lookup.data.verified_at) {
      return { ok: true, signupId: lookup.data.id };
    }

    const expiresAt = lookup.data.verify_token_expires_at;
    if (!expiresAt || expiresAt <= nowIso) {
      return { ok: false, state: "invalid" };
    }

    const verifyResult = await supabase
      .from("waitlist_signups")
      .update({
        verified_at: nowIso,
      })
      .eq("id", lookup.data.id)
      .is("verified_at", null)
      .select("id")
      .maybeSingle();

    if (verifyResult.error) {
      return { ok: false, state: "error" };
    }

    return { ok: true, signupId: lookup.data.id };
  } catch {
    return { ok: false, state: "error" };
  }
}
