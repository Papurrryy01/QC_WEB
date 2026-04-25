import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import crypto from "crypto";
import RevealClient from "./RevealClient";

const RECIPIENT_COUNTDOWN_WINDOW_HOURS = 5;

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export default async function MomentPage({
  params,
  searchParams,
}: {
  params: Promise<{ public_id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ t: token }, { public_id }] = await Promise.all([
    searchParams,
    params,
  ]);
  if (!token) return notFound();

  const tokenHash = sha256(token);

  const supabase = await createSupabaseServerClient();
  const { data: moment, error } = await supabase
    .from("moments")
    .select(
      "message_body, theme, token_expires_at, access_token_hash, revealed_at, scheduled_for_utc"
    )
    .eq("public_id", public_id)
    .single();

  if (error || !moment) return notFound();

  // 🔐 token validation
  if (!moment.access_token_hash || moment.access_token_hash !== tokenHash) {
    return notFound();
  }

  // ⏰ expiry check
  if (moment.token_expires_at && new Date(moment.token_expires_at) < new Date()) {
    return notFound();
  }

  const nowMs = new Date().getTime();
  const scheduledMs = moment.scheduled_for_utc
    ? Date.parse(moment.scheduled_for_utc)
    : null;
  const hasValidSchedule =
    typeof scheduledMs === "number" && !Number.isNaN(scheduledMs);

  if (hasValidSchedule && scheduledMs > nowMs) {
    const countdownVisibleAfterMs =
      scheduledMs - RECIPIENT_COUNTDOWN_WINDOW_HOURS * 60 * 60 * 1000;

    return (
      <RevealClient
        mode={nowMs >= countdownVisibleAfterMs ? "countdown" : "hidden"}
        releaseAtIso={moment.scheduled_for_utc}
        message={moment.message_body}
        theme={moment.theme ?? "dark"}
      />
    );
  }

  // Mark revealed only once the moment is within unlock window.
  if (!moment.revealed_at) {
    await supabase
      .from("moments")
      .update({ revealed_at: new Date().toISOString() })
      .eq("public_id", public_id)
      .is("revealed_at", null);
  }

  return (
    <RevealClient
      mode="reveal"
      message={moment.message_body}
      theme={moment.theme ?? "dark"}
      releaseAtIso={moment.scheduled_for_utc}
    />
  );
}
