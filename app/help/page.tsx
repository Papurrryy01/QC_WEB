import Link from "next/link";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";

const FAQ_GROUPS = [
  {
    title: "Account and access",
    items: [
      {
        q: "I created an account but did not receive the verification email.",
        a: "Check spam/promotions first, then request a new verification link from the sign-in screen.",
      },
      {
        q: "How do I reset my password?",
        a: "Use Forgot password on the login screen. We will email a secure reset link.",
      },
    ],
  },
  {
    title: "Creating moments",
    items: [
      {
        q: "Can I save and finish a moment later?",
        a: "Yes. Drafts save automatically while you create.",
      },
      {
        q: "Can I edit a scheduled moment?",
        a: "You can edit any moment before its scheduled delivery time.",
      },
    ],
  },
  {
    title: "Delivery and notifications",
    items: [
      {
        q: "Why did a delivery not send exactly on time?",
        a: "Most deliveries are exact. If a delay occurs, QC retries automatically and logs status in your timeline.",
      },
      {
        q: "How do reminder and countdown alerts work?",
        a: "You control alerts in Settings > Notifications. Enable only the channels you want.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <InfoPageShell
      eyebrow="Help Center"
      title="Support for account, moments, and delivery."
      intro="Fast answers for the most common questions. If you still need help, reach out and the QC team will respond."
      updatedAt="April 2026"
    >
      {FAQ_GROUPS.map((group) => (
        <InfoSectionCard key={group.title} title={group.title}>
          <div className="space-y-3">
            {group.items.map((item) => (
              <details
                key={item.q}
                className="rounded-[16px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_80%,transparent)] px-4 py-3"
              >
                <summary className="cursor-pointer list-none text-[0.98rem] font-medium text-[var(--qc-text-soft)] marker:hidden">
                  {item.q}
                </summary>
                <p className="pt-2 text-[0.94rem] text-[var(--qc-text-muted)]">{item.a}</p>
              </details>
            ))}
          </div>
        </InfoSectionCard>
      ))}

      <InfoSectionCard id="contact" title="Contact support">
        <p>Need direct support for your account or delivery issue?</p>
        <p>
          Email us at{" "}
          <a className="underline underline-offset-4" href="mailto:vera@qcapp.co">
            vera@qcapp.co
          </a>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/company/system-status" className="qc-button qc-button--secondary">
            View system status
          </Link>
          <Link href="/company/about" className="qc-button qc-button--secondary">
            Learn about QC
          </Link>
        </div>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
