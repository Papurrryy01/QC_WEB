import Link from "next/link";

type LegalItem = {
  title: string;
  href: string;
  description: string;
};

const LEGAL_ITEMS: LegalItem[] = [
  {
    title: "Privacy",
    href: "/privacy",
    description: "How QC handles account, delivery, and profile data.",
  },
  {
    title: "Terms",
    href: "/terms",
    description: "Rules and responsibilities for using QC.",
  },
  {
    title: "Cookies",
    href: "/cookies",
    description: "Cookie usage for authentication, reliability, and analytics.",
  },
  {
    title: "Security",
    href: "/security",
    description: "Security posture, controls, and vulnerability reporting.",
  },
  {
    title: "System status",
    href: "/company/system-status",
    description: "Current service health and incident updates.",
  },
];

const INFO_ITEMS: LegalItem[] = [
  {
    title: "About QC",
    href: "/company/about",
    description: "Mission, delivery philosophy, and product direction.",
  },
  {
    title: "Help Center",
    href: "/help",
    description: "Answers for account, creation flow, and delivery behavior.",
  },
  {
    title: "Contact support",
    href: "/help#contact",
    description: "Reach the QC team for account and delivery assistance.",
  },
];

function LinkGrid({ heading, items }: { heading: string; items: LegalItem[] }) {
  return (
    <section className="qc-card qc-card--inset">
      <p className="qc-settings-section-label">{heading}</p>
      <div className="qc-settings-grid" style={{ marginTop: "0.7rem" }}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-[16px] border border-[var(--qc-border)] bg-[var(--qc-surface-strong)] px-4 py-3 transition hover:border-[var(--qc-border-strong)] hover:bg-[var(--qc-surface)]"
          >
            <p className="qc-heading-sm">{item.title}</p>
            <p className="qc-copy" style={{ marginTop: "0.25rem" }}>
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function LegalInfoCenter() {
  return (
    <section className="qc-card">
      <div className="qc-settings-section-head">
        <p className="qc-kicker">Legal and info</p>
        <h2 className="qc-heading-lg">Trust, policy, and product references</h2>
        <p className="qc-copy">
          One place for legal policies, security posture, system health, and support references.
        </p>
      </div>

      <div className="qc-settings-grid" style={{ marginTop: "1rem" }}>
        <LinkGrid heading="Legal" items={LEGAL_ITEMS} />
        <LinkGrid heading="Information" items={INFO_ITEMS} />
      </div>
    </section>
  );
}
