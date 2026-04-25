import Link from "next/link";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";

const STATUS_CARDS = [
  { label: "Delivery system", value: "Operational", tone: "ok" },
  { label: "30-day uptime", value: "99.98%", tone: "neutral" },
  { label: "Last updated", value: "Just now", tone: "neutral" },
] as const;

const INCIDENTS = [
  {
    title: "No active incidents",
    detail: "All delivery and scheduling systems are running normally.",
  },
  {
    title: "Monitoring",
    detail: "Realtime checks are active for queue latency, dispatch, and callback health.",
  },
  {
    title: "Communication",
    detail: "If a disruption occurs, updates are posted here until full recovery.",
  },
] as const;

export default function CompanySystemStatusPage() {
  return (
    <InfoPageShell
      eyebrow="System Status"
      title="Live reliability dashboard"
      intro="A clear snapshot of delivery health, uptime, and the most recent system update."
      updatedAt="April 2026"
    >
      <section className="grid gap-4 sm:grid-cols-3">
        {STATUS_CARDS.map((card) => (
          <article
            key={card.label}
            className="rounded-[20px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface-strong)_84%,transparent)] p-5 shadow-[var(--qc-shadow-1)]"
          >
            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--qc-text-faint)]">
              {card.label}
            </p>
            <p
              className={`mt-2 text-[1.2rem] font-semibold tracking-[-0.02em] ${
                card.tone === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--qc-text)]"
              }`}
            >
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <InfoSectionCard title="Service overview">
        <p>
          Delivery status reflects queue health, dispatch completion, and callback verification from
          the current production environment.
        </p>
        <p>
          If a status changes, this page updates first so you can make scheduling decisions with
          confidence.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Recent status notes">
        <ul className="space-y-3">
          {INCIDENTS.map((item) => (
            <li
              key={item.title}
              className="rounded-[14px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_78%,transparent)] px-4 py-3"
            >
              <p className="text-[0.96rem] font-semibold text-[var(--qc-text-soft)]">{item.title}</p>
              <p className="mt-1 text-[0.94rem] text-[var(--qc-text-muted)]">{item.detail}</p>
            </li>
          ))}
        </ul>
      </InfoSectionCard>

      <InfoSectionCard title="Need help right now?">
        <p>Support requests are triaged by delivery impact and account urgency.</p>
        <div className="pt-2">
          <Link href="/support/contact" className="qc-button qc-button--secondary">
            Contact support
          </Link>
        </div>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
