import Link from "next/link";
import { redirect } from "next/navigation";
import { isMissingColumnError } from "@/lib/supabaseColumnErrors";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import ScheduledMomentsClient, {
  type ScheduledMoment,
} from "./ScheduledMomentsClient";

export default async function ScheduledMomentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const nowIso = new Date().toISOString();

  let momentsResult: any = await supabase
    .from("moments")
    .select(
      "id, message_body, scheduled_for_utc, recipient_phone, recipient_email, delivery_timezone, status, created_at"
    )
    .eq("sender_id", user.id)
    .in("status", ["published", "sent"])
    .not("scheduled_for_utc", "is", null)
    .gte("scheduled_for_utc", nowIso)
    .order("scheduled_for_utc", { ascending: true });

  if (isMissingColumnError(momentsResult.error, "delivery_timezone")) {
    momentsResult = await supabase
      .from("moments")
      .select(
        "id, message_body, scheduled_for_utc, recipient_phone, recipient_email, status, created_at"
      )
      .eq("sender_id", user.id)
      .in("status", ["published", "sent"])
      .not("scheduled_for_utc", "is", null)
      .gte("scheduled_for_utc", nowIso)
      .order("scheduled_for_utc", { ascending: true });
  }

  if (momentsResult.error) {
    return (
      <div className="qc-app-section">
        <Link href="/app" className="qc-button qc-button--secondary">
          Back to dashboard
        </Link>
        <div className="qc-status qc-status--danger">
          Error loading scheduled moments: {momentsResult.error.message}
        </div>
      </div>
    );
  }

  const moments: ScheduledMoment[] = ((momentsResult.data ?? []) as ScheduledMoment[]).map((moment) => ({
    id: moment.id,
    message_body: moment.message_body,
    scheduled_for_utc: moment.scheduled_for_utc,
    recipient_phone: moment.recipient_phone,
    recipient_email: moment.recipient_email,
    delivery_timezone: moment.delivery_timezone ?? null,
    status: moment.status,
    created_at: moment.created_at,
  }));

  return (
    <div className="qc-app-section">
      <section className="qc-card qc-card--hero">
        <p className="qc-kicker">Scheduled</p>
        <h1 className="qc-heading-xl">Full delivery timeline</h1>
        <p className="qc-copy">All scheduled deliveries, ordered by release time.</p>
        <div style={{ marginTop: "0.8rem" }}>
          <Link href="/app" className="qc-button qc-button--secondary">
            Back to dashboard
          </Link>
        </div>
      </section>

      <ScheduledMomentsClient moments={moments} />
    </div>
  );
}
