import Link from "next/link";
import { redirect } from "next/navigation";
import { formatAbsoluteInTimezone, formatRelativeUntil } from "@/lib/momentScheduling";
import { isMissingColumnError } from "@/lib/supabaseColumnErrors";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { readProfileFromUserMetadata } from "@/lib/profileFallback";
import { QuickDraftButton } from "./HomeMomentActions";

type HomeMoment = {
  id: string;
  message_body: string | null;
  scheduled_for_utc: string | null;
  status: string | null;
  created_at: string;
  recipient_phone: string | null;
  recipient_email: string | null;
  delivery_timezone?: string | null;
  is_featured?: boolean | null;
};

function parseMs(value: string | null) {
  if (!value) return NaN;
  return Date.parse(value);
}

function isScheduled(moment: HomeMoment, nowMs: number) {
  const scheduled = parseMs(moment.scheduled_for_utc);
  return !Number.isNaN(scheduled) && scheduled > nowMs;
}

function normalizeStatus(moment: HomeMoment, nowMs: number): "draft" | "scheduled" | "sent" {
  if ((moment.status ?? "draft") === "draft") return "draft";
  if (isScheduled(moment, nowMs)) return "scheduled";
  return "sent";
}

function formatLocalDate(value: string | null, fallback: string) {
  const parsed = new Date(value ?? fallback);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function formatScheduledMomentDate(moment: HomeMoment) {
  if (moment.scheduled_for_utc) {
    return formatAbsoluteInTimezone(moment.scheduled_for_utc, moment.delivery_timezone);
  }

  return formatLocalDate(moment.created_at, moment.created_at);
}

function formatRecipient(email: string | null, phone: string | null) {
  const value = email?.trim() || phone?.trim() || "";
  if (!value) return "No recipient";

  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    if (!domain) return value;
    const visible = name.length <= 2 ? name : `${name.slice(0, 2)}${"•".repeat(Math.min(6, Math.max(name.length - 2, 1)))}`;
    return `${visible}@${domain}`;
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return value;
  return `${"•".repeat(Math.min(8, digits.length - 4))}${digits.slice(-4)}`;
}

function statusLabel(status: "draft" | "scheduled" | "sent") {
  if (status === "draft") return "Draft";
  if (status === "scheduled") return "Scheduled";
  return "Sent";
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const nowIso = new Date().toISOString();
  const nowMs = Date.parse(nowIso);

  const profilePromise = supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  let momentsResult: any = await supabase
    .from("moments")
    .select(
      "id,message_body,scheduled_for_utc,status,created_at,recipient_phone,recipient_email,delivery_timezone,is_featured"
    )
    .eq("sender_id", user.id)
    .order("created_at", { ascending: false });

  if (isMissingColumnError(momentsResult.error, "delivery_timezone")) {
    momentsResult = await supabase
      .from("moments")
      .select(
        "id,message_body,scheduled_for_utc,status,created_at,recipient_phone,recipient_email,is_featured"
      )
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false });
  }

  const profileResult = await profilePromise;

  if (momentsResult.error) {
    return (
      <div className="qc-status qc-status--danger">
        Could not load Home: {momentsResult.error.message}
      </div>
    );
  }

  const fallbackProfile = readProfileFromUserMetadata(user);
  const displayName =
    profileResult.data?.display_name?.trim() ||
    fallbackProfile.display_name ||
    user.email?.split("@")[0] ||
    "Member";

  const moments = ((momentsResult.data ?? []) as HomeMoment[]).map((moment) => ({
    ...moment,
    delivery_timezone: moment.delivery_timezone ?? null,
  }));
  const featuredMoments = moments.filter((moment) => moment.is_featured === true);
  const homeMoments = featuredMoments.length > 0 ? featuredMoments : moments;

  const upcomingMoments = homeMoments
    .filter((moment) => normalizeStatus(moment, nowMs) === "scheduled")
    .sort((a, b) => parseMs(a.scheduled_for_utc) - parseMs(b.scheduled_for_utc));
  const recentMoments = homeMoments.slice(0, 4);

  const draftCount = moments.filter((moment) => normalizeStatus(moment, nowMs) === "draft").length;
  const scheduledCount = upcomingMoments.length;
  const sentCount = moments.filter((moment) => normalizeStatus(moment, nowMs) === "sent").length;
  const totalMoments = moments.length;

  const nextMoment = upcomingMoments[0] ?? null;

  return (
    <div className="qc-dashboard">
      <section className="qc-dashboard-hero">
        <p className="qc-kicker">Dashboard</p>
        <h1 className="qc-dashboard-title">Welcome back, {displayName}.</h1>
        <p className="qc-dashboard-lede">
          Your account is ready. Start managing your scheduled moments and deliveries.
        </p>

        <div className="qc-dashboard-chip-row">
          <span className="qc-dashboard-chip">Total moments: {totalMoments}</span>
          <span className="qc-dashboard-chip">Scheduled: {scheduledCount}</span>
          <span className="qc-dashboard-chip">Sent: {sentCount}</span>
          <span className="qc-dashboard-chip">Drafts: {draftCount}</span>
        </div>

        <div className="qc-dashboard-next">
          <p className="qc-dashboard-next-kicker">Next release</p>
          {nextMoment ? (
            <>
              <p className="qc-dashboard-next-title">
                {formatRecipient(nextMoment.recipient_email, nextMoment.recipient_phone)} ·{" "}
                {formatScheduledMomentDate(nextMoment)}
              </p>
              <p className="qc-copy">
                Arriving in {formatRelativeUntil(nextMoment.scheduled_for_utc)}
              </p>
            </>
          ) : (
            <p className="qc-copy">
              {featuredMoments.length > 0
                ? "No featured deliveries are scheduled yet. Add one from Moments to surface it here."
                : "No upcoming deliveries yet. Create your first scheduled moment."}
            </p>
          )}
        </div>

        <div className="qc-dashboard-hero-actions">
          <Link href="/app/create" className="qc-button qc-button--primary">
            Create moment
          </Link>
          <QuickDraftButton />
          <Link href="/app/moments" className="qc-button qc-button--secondary">
            Open library
          </Link>
        </div>
      </section>

      <section className="qc-dashboard-metrics">
        <article className="qc-dashboard-metric qc-dashboard-metric--scheduled">
          <p className="qc-kicker">Scheduled</p>
          <p className="qc-metric">{scheduledCount}</p>
          <p className="qc-copy">Moments waiting to be delivered.</p>
        </article>
        <article className="qc-dashboard-metric qc-dashboard-metric--sent">
          <p className="qc-kicker">Sent</p>
          <p className="qc-metric">{sentCount}</p>
          <p className="qc-copy">Moments already opened or released.</p>
        </article>
        <article className="qc-dashboard-metric qc-dashboard-metric--draft">
          <p className="qc-kicker">Drafts</p>
          <p className="qc-metric">{draftCount}</p>
          <p className="qc-copy">Ideas still being shaped.</p>
        </article>
      </section>

      <section className="qc-dashboard-grid">
        <article className="qc-dashboard-panel">
          <div className="qc-dashboard-panel-head">
            <h2 className="qc-heading-lg">Upcoming moments</h2>
            <Link href="/app/moments?filter=scheduled" className="qc-dashboard-inline-link">
              View all
            </Link>
          </div>

          {upcomingMoments.length === 0 ? (
            <div className="qc-dashboard-empty">
              <p className="qc-copy">
                {featuredMoments.length > 0
                  ? "You have featured moments, but none are waiting to be delivered."
                  : "Your calendar is open. Schedule your next meaningful delivery."}
              </p>
              <Link
                href={featuredMoments.length > 0 ? "/app/moments" : "/app/create"}
                className="qc-button qc-button--secondary"
              >
                {featuredMoments.length > 0 ? "Open moments" : "Schedule now"}
              </Link>
            </div>
          ) : (
            <ul className="qc-dashboard-list">
              {upcomingMoments.slice(0, 4).map((moment) => (
                <li key={moment.id} className="qc-dashboard-item">
              <p className="qc-dashboard-item-title">
                {moment.message_body?.trim() || "Untitled moment"}
              </p>
              <p className="qc-dashboard-item-copy">
                {formatRecipient(moment.recipient_email, moment.recipient_phone)} ·{" "}
                {formatScheduledMomentDate(moment)}
              </p>
              <p className="qc-dashboard-item-meta">
                Arrives in {formatRelativeUntil(moment.scheduled_for_utc)}
              </p>
              <Link href={`/app/moments/${moment.id}`} className="qc-button qc-button--secondary">
                Open
              </Link>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="qc-dashboard-panel">
          <div className="qc-dashboard-panel-head">
            <h2 className="qc-heading-lg">Recent moments</h2>
            <Link href="/app/moments" className="qc-dashboard-inline-link">
              Library
            </Link>
          </div>

          {recentMoments.length === 0 ? (
            <div className="qc-dashboard-empty">
              <p className="qc-copy">
                {featuredMoments.length > 0
                  ? "No featured moments are available yet."
                  : "You have not created a moment yet."}
              </p>
              <Link href="/app/create" className="qc-button qc-button--secondary">
                Create first moment
              </Link>
            </div>
          ) : (
            <ul className="qc-dashboard-list">
              {recentMoments.map((moment) => {
                const status = normalizeStatus(moment, nowMs);
                return (
                  <li key={moment.id} className="qc-dashboard-item">
                    <p className={`qc-dashboard-status qc-dashboard-status--${status}`}>
                      {statusLabel(status)}
                    </p>
                    <p className="qc-dashboard-item-title">
                      {moment.message_body?.trim() || "Untitled moment"}
                    </p>
                    <p className="qc-dashboard-item-copy">
                      {formatRecipient(moment.recipient_email, moment.recipient_phone)} ·{" "}
                      {formatScheduledMomentDate(moment)}
                    </p>
                    <Link href={`/app/moments/${moment.id}`} className="qc-button qc-button--secondary">
                      Open
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
