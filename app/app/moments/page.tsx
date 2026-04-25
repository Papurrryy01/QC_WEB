import Link from "next/link";
import { redirect } from "next/navigation";
import { formatAbsoluteInTimezone } from "@/lib/momentScheduling";
import { isMissingColumnError } from "@/lib/supabaseColumnErrors";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import FeatureToggleButton from "@/app/app/components/FeatureToggleButton";
import DeleteMomentButton from "@/app/app/components/DeleteMomentButton";

type MomentRow = {
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

type Filter = "all" | "scheduled" | "sent" | "draft";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "sent", label: "Sent" },
  { key: "draft", label: "Draft" },
];

function parseMs(value: string | null) {
  if (!value) return NaN;
  return Date.parse(value);
}

function isScheduled(moment: MomentRow, nowMs: number) {
  const target = parseMs(moment.scheduled_for_utc);
  return !Number.isNaN(target) && target > nowMs;
}

function normalizedStatus(moment: MomentRow, nowMs: number): Filter {
  if ((moment.status ?? "draft") === "draft") return "draft";
  if (isScheduled(moment, nowMs)) return "scheduled";
  return "sent";
}

function formatRecipient(email: string | null, phone: string | null) {
  const value = email?.trim() || phone?.trim() || "";
  if (!value) return "No recipient";

  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    if (!domain) return value;
    const visible =
      name.length <= 2 ? name : `${name.slice(0, 2)}${"•".repeat(Math.min(6, Math.max(name.length - 2, 1)))}`;
    return `${visible}@${domain}`;
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return value;
  return `${"•".repeat(Math.min(8, digits.length - 4))}${digits.slice(-4)}`;
}

function formatLocalDate(value: string | null, fallback: string) {
  const date = new Date(value ?? fallback);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMomentDate(moment: MomentRow) {
  if (moment.scheduled_for_utc) {
    return formatAbsoluteInTimezone(moment.scheduled_for_utc, moment.delivery_timezone);
  }

  return formatLocalDate(moment.created_at, moment.created_at);
}

export default async function MomentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const requestedFilter = params.filter;
  const filter: Filter =
    requestedFilter === "scheduled" ||
    requestedFilter === "sent" ||
    requestedFilter === "draft"
      ? requestedFilter
      : "all";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  let momentsResult: any = await supabase
    .from("moments")
    .select(
      "id,message_body,scheduled_for_utc,status,created_at,recipient_phone,recipient_email,delivery_timezone,is_featured"
    )
    .eq("sender_id", user.id)
    .order("scheduled_for_utc", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (isMissingColumnError(momentsResult.error, "delivery_timezone")) {
    momentsResult = await supabase
      .from("moments")
      .select(
        "id,message_body,scheduled_for_utc,status,created_at,recipient_phone,recipient_email,is_featured"
      )
      .eq("sender_id", user.id)
      .order("scheduled_for_utc", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  if (momentsResult.error) {
    return (
      <div className="qc-status qc-status--danger">
        Error loading moments: {momentsResult.error.message}
      </div>
    );
  }

  const nowIso = new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const moments = ((momentsResult.data ?? []) as MomentRow[]).map((moment) => ({
    ...moment,
    delivery_timezone: moment.delivery_timezone ?? null,
  }));
  const filteredMoments = moments.filter((moment) => {
    if (filter === "all") return true;
    return normalizedStatus(moment, nowMs) === filter;
  });

  const summary = {
    all: moments.length,
    scheduled: moments.filter((moment) => normalizedStatus(moment, nowMs) === "scheduled")
      .length,
    sent: moments.filter((moment) => normalizedStatus(moment, nowMs) === "sent").length,
    draft: moments.filter((moment) => normalizedStatus(moment, nowMs) === "draft").length,
  };

  return (
    <div className="qc-app-section">
      <section className="qc-card qc-card--hero">
        <p className="qc-kicker">Library</p>
        <h1 className="qc-heading-xl">Every moment, one clean timeline.</h1>
        <p className="qc-copy">
          Filter by stage and open any moment to edit, preview, or deliver.
        </p>
      </section>

      <section className="qc-card">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <Link
                key={item.key}
                href={item.key === "all" ? "/app/moments" : `/app/moments?filter=${item.key}`}
                className={`qc-nav-link ${active ? "bg-[var(--qc-accent-soft)] text-[var(--qc-accent)]" : ""}`}
              >
                {item.label} ({summary[item.key]})
              </Link>
            );
          })}
        </div>
      </section>

      {filteredMoments.length === 0 ? (
        <section className="qc-card">
          <h2 className="qc-heading-lg">No moments in this view yet.</h2>
          <p className="qc-copy" style={{ marginTop: "0.6rem" }}>
            Start with a new moment and build your delivery sequence.
          </p>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/app/create" className="qc-button qc-button--primary">
              Create moment
            </Link>
          </div>
        </section>
      ) : (
        <section className="qc-grid qc-grid--2">
          {filteredMoments.map((moment) => {
            const status = normalizedStatus(moment, nowMs);
            return (
              <article key={moment.id} className="qc-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="qc-feature-name">{moment.message_body?.trim() || "Untitled moment"}</p>
                    <p className="qc-feature-copy">
                      {formatRecipient(moment.recipient_email, moment.recipient_phone)} · {formatMomentDate(moment)}
                    </p>
                  </div>
                  <span className="qc-pill">{status}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2" style={{ marginTop: "1rem" }}>
                  <Link href={`/app/moments/${moment.id}`} className="qc-button qc-button--secondary">
                    Open
                  </Link>
                  <FeatureToggleButton
                    momentId={moment.id}
                    initialFeatured={moment.is_featured === true}
                    variant="pill"
                  />
                  <DeleteMomentButton momentId={moment.id} />
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
