import Link from "next/link";
import { redirect } from "next/navigation";
import { formatAbsoluteInTimezone, formatRelativeUntil } from "@/lib/momentScheduling";
import { isMissingColumnError } from "@/lib/supabaseColumnErrors";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type MomentRow = {
  id: string;
  status: string;
  created_at: string;
  scheduled_for_utc: string | null;
  message_body: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  delivery_timezone?: string | null;
};

function parseMs(value: string | null) {
  if (!value) return NaN;
  return Date.parse(value);
}

function formatDate(value: string | null, timezone: string | null | undefined) {
  return formatAbsoluteInTimezone(value, timezone, { includeYear: false });
}

function relativeUntil(value: string | null) {
  const result = formatRelativeUntil(value);
  return result === "Not scheduled" ? "No schedule" : `in ${result}`;
}

function shortLabelForDay(value: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(value);
}

export default async function InsightsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const now = new Date();
  const nowMs = now.getTime();

  let momentsResult: any = await supabase
    .from("moments")
    .select("id,status,created_at,scheduled_for_utc,message_body,recipient_phone,recipient_email,delivery_timezone")
    .eq("sender_id", user.id)
    .order("created_at", { ascending: false });

  if (isMissingColumnError(momentsResult.error, "delivery_timezone")) {
    momentsResult = await supabase
      .from("moments")
      .select("id,status,created_at,scheduled_for_utc,message_body,recipient_phone,recipient_email")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false });
  }

  if (momentsResult.error) {
    return (
      <div className="qc-status qc-status--danger">
        Error loading insights: {momentsResult.error.message}
      </div>
    );
  }

  const moments: MomentRow[] = ((momentsResult.data ?? []) as MomentRow[]).map((moment) => ({
    ...moment,
    delivery_timezone: moment.delivery_timezone ?? null,
  }));
  const totalMoments = moments.length;
  const draftCount = moments.filter((moment) => moment.status === "draft").length;
  const publishedCount = moments.filter(
    (moment) => moment.status === "published" || moment.status === "sent"
  ).length;
  const sentCount = moments.filter((moment) => moment.status === "sent").length;

  const scheduledMoments = moments
    .filter(
      (moment) =>
        !!moment.scheduled_for_utc &&
        (moment.status === "published" || moment.status === "sent") &&
        parseMs(moment.scheduled_for_utc) >= nowMs
    )
    .sort((a, b) => parseMs(a.scheduled_for_utc) - parseMs(b.scheduled_for_utc));

  const scheduledCount = scheduledMoments.length;
  const readinessPercent =
    totalMoments > 0 ? Math.round((publishedCount / totalMoments) * 100) : 0;

  const sevenDayBuckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: shortLabelForDay(date),
      count: 0,
    };
  });

  for (const moment of moments) {
    const createdKey = new Date(moment.created_at).toISOString().slice(0, 10);
    const bucket = sevenDayBuckets.find((entry) => entry.key === createdKey);
    if (bucket) bucket.count += 1;
  }

  const maxDayCount = Math.max(1, ...sevenDayBuckets.map((entry) => entry.count));

  return (
    <div className="qc-app-section">
      <section className="qc-card qc-card--hero">
        <p className="qc-kicker">Insights</p>
        <h1 className="qc-heading-xl">
          {scheduledCount > 0
            ? `${scheduledCount} moments are on your calendar.`
            : "Your calendar is currently open."}
        </h1>
        <p className="qc-copy">
          Track your delivery cadence and keep momentum steady.
        </p>
      </section>

      <section className="qc-grid qc-grid--4">
        <article className="qc-card">
          <p className="qc-kicker">All</p>
          <p className="qc-metric">{totalMoments}</p>
        </article>
        <article className="qc-card">
          <p className="qc-kicker">Drafts</p>
          <p className="qc-metric">{draftCount}</p>
        </article>
        <article className="qc-card">
          <p className="qc-kicker">Published</p>
          <p className="qc-metric">{publishedCount}</p>
        </article>
        <article className="qc-card">
          <p className="qc-kicker">Sent</p>
          <p className="qc-metric">{sentCount}</p>
        </article>
      </section>

      <section className="qc-grid qc-grid--2">
        <article className="qc-card">
          <h2 className="qc-heading-lg">7-day activity</h2>
          <p className="qc-copy" style={{ marginTop: "0.45rem" }}>
            New moments created in the past week.
          </p>
          <div className="mt-5 grid grid-cols-7 items-end gap-2">
            {sevenDayBuckets.map((entry) => {
              const height = Math.max(8, Math.round((entry.count / maxDayCount) * 95));
              return (
                <div key={entry.key} className="flex flex-col items-center gap-2">
                  <div className="relative flex h-28 w-full items-end rounded-[10px] border border-[var(--qc-border)] bg-[var(--qc-surface-muted)]">
                    <div
                      className="w-full rounded-[10px] bg-[var(--qc-accent)]"
                      style={{ height: `${height}px`, opacity: 0.82 }}
                    />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--qc-text-muted)]">
                    {entry.label}
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="qc-card">
          <h2 className="qc-heading-lg">Delivery readiness</h2>
          <p className="qc-copy" style={{ marginTop: "0.55rem" }}>
            {readinessPercent}% of your moments are delivery-ready.
          </p>
          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full border border-[var(--qc-border)] bg-[var(--qc-surface-muted)]"
            aria-label="Delivery readiness"
          >
            <div
              className="h-full rounded-full bg-[var(--qc-accent)]"
              style={{ width: `${Math.max(8, readinessPercent)}%` }}
            />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/app/create" className="qc-button qc-button--primary">
              Create next moment
            </Link>
          </div>
        </article>
      </section>

      <section className="qc-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="qc-heading-lg">Upcoming deliveries</h2>
          <Link href="/app/moments/scheduled" className="qc-nav-link">
            View all
          </Link>
        </div>

        {scheduledMoments.length === 0 ? (
          <p className="qc-copy" style={{ marginTop: "0.8rem" }}>
            Nothing scheduled right now.
          </p>
        ) : (
          <ul className="qc-feature-list" style={{ marginTop: "1rem" }}>
            {scheduledMoments.slice(0, 5).map((moment) => (
              <li key={moment.id} className="qc-feature-item">
                <p className="qc-feature-name">{moment.message_body?.trim() || "Untitled moment"}</p>
                <p className="qc-feature-copy">
                  {formatDate(moment.scheduled_for_utc, moment.delivery_timezone)} ·{" "}
                  {relativeUntil(moment.scheduled_for_utc)}
                </p>
                <div style={{ marginTop: "0.55rem" }}>
                  <Link href={`/app/moments/${moment.id}`} className="qc-button qc-button--secondary">
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
