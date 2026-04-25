import Link from "next/link";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";

const CATEGORIES = [
  {
    title: "Support",
    detail: "Account access, delivery reliability, and moment scheduling questions.",
  },
  {
    title: "Business",
    detail: "Product collaboration, integrations, and business operations inquiries.",
  },
  {
    title: "Partnerships",
    detail: "Creator, brand, and strategic partnership opportunities.",
  },
] as const;

export default function CompanyContactPage() {
  return (
    <InfoPageShell
      eyebrow="Contact"
      title="Reach the right QC team quickly"
      intro="Choose a category and send one focused request. We route it to the right team from the start."
      updatedAt="April 2026"
    >
      <InfoSectionCard title="Contact categories">
        <ul className="space-y-3">
          {CATEGORIES.map((category) => (
            <li
              key={category.title}
              className="rounded-[14px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_78%,transparent)] px-4 py-3"
            >
              <p className="text-[0.96rem] font-semibold text-[var(--qc-text-soft)]">{category.title}</p>
              <p className="mt-1 text-[0.94rem] text-[var(--qc-text-muted)]">{category.detail}</p>
            </li>
          ))}
        </ul>
      </InfoSectionCard>

      <InfoSectionCard title="Contact form">
        <form className="grid gap-4 sm:grid-cols-2" aria-label="Company contact form">
          <label className="space-y-1.5 text-[0.82rem] uppercase tracking-[0.14em] text-[var(--qc-text-faint)]">
            Category
            <select className="qc-input h-12 w-full" defaultValue="Support">
              <option>Support</option>
              <option>Business</option>
              <option>Partnerships</option>
            </select>
          </label>
          <label className="space-y-1.5 text-[0.82rem] uppercase tracking-[0.14em] text-[var(--qc-text-faint)]">
            Full name
            <input className="qc-input h-12 w-full" name="name" autoComplete="name" />
          </label>
          <label className="space-y-1.5 text-[0.82rem] uppercase tracking-[0.14em] text-[var(--qc-text-faint)]">
            Email
            <input className="qc-input h-12 w-full" name="email" type="email" autoComplete="email" />
          </label>
          <label className="space-y-1.5 text-[0.82rem] uppercase tracking-[0.14em] text-[var(--qc-text-faint)]">
            Subject
            <input className="qc-input h-12 w-full" name="subject" />
          </label>
          <label className="space-y-1.5 text-[0.82rem] uppercase tracking-[0.14em] text-[var(--qc-text-faint)] sm:col-span-2">
            Message
            <textarea className="qc-input min-h-[140px] w-full py-3" name="message" />
          </label>
          <label className="space-y-1.5 text-[0.82rem] uppercase tracking-[0.14em] text-[var(--qc-text-faint)]">
            Company (optional)
            <input className="qc-input h-12 w-full" name="company" />
          </label>
          <label className="space-y-1.5 text-[0.82rem] uppercase tracking-[0.14em] text-[var(--qc-text-faint)]">
            Links (optional)
            <input className="qc-input h-12 w-full" name="links" placeholder="https://" />
          </label>
          <div className="sm:col-span-2">
            <button type="button" className="qc-button qc-button--secondary">
              Send request
            </button>
          </div>
        </form>
      </InfoSectionCard>

      <InfoSectionCard title="Direct inbox">
        <p>
          If you prefer email, reach the team at <a href="mailto:vera@qcapp.co">vera@qcapp.co</a>.
        </p>
        <p>Include category + subject so your request routes correctly on first pass.</p>
      </InfoSectionCard>

      <InfoSectionCard title="Next step">
        <p>Need immediate product help instead of business contact?</p>
        <div className="pt-2">
          <Link href="/support/contact" className="qc-button qc-button--secondary">
            Open support contact
          </Link>
        </div>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
