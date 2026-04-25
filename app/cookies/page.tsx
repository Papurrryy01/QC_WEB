import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";
import LegalSummaryCard from "@/app/components/legal/LegalSummaryCard";

export default function CookiesPage() {
  return (
    <InfoPageShell
      eyebrow="Cookies"
      title="Cookie Policy"
      intro="This page explains how QC uses cookies and similar technologies to keep your session secure and improve product quality."
      updatedAt="April 2026"
      tone="legal"
    >
      <LegalSummaryCard
        summary="QC uses essential cookies for authentication and reliability. Optional analytics cookies help us improve product quality."
        bullets={[
          "Essential cookies are required for sign-in and secure sessions.",
          "Analytics cookies are used to improve performance and UX.",
          "You can control browser-level cookie preferences any time.",
        ]}
      />

      <InfoSectionCard title="Essential cookies">
        <p>
          Required for account authentication, session integrity, and security checks. Disabling
          them may prevent QC from functioning correctly.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Analytics and diagnostics">
        <p>
          We use limited analytics signals to understand load times, feature reliability, and UX
          friction. These insights help us improve the product.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Managing cookies">
        <p>
          You can clear cookies and adjust tracking preferences in your browser settings. For
          support, contact <a href="mailto:vera@qcapp.co">vera@qcapp.co</a>.
        </p>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
