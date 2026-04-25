import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";
import LegalSummaryCard from "@/app/components/legal/LegalSummaryCard";

export default function TermsPage() {
  return (
    <InfoPageShell
      eyebrow="Terms"
      title="Terms of Service"
      intro="These terms govern use of QC web and app experiences, including account access, moment creation, and scheduled delivery features."
      updatedAt="April 2026"
      tone="legal"
    >
      <LegalSummaryCard
        summary="Use QC respectfully and lawfully. You own your content. QC may suspend misuse, and service behavior can evolve over time."
        bullets={[
          "You are responsible for content you schedule and send.",
          "You must protect your account credentials.",
          "Abusive, fraudulent, or unlawful use is prohibited.",
        ]}
      />

      <InfoSectionCard title="Eligibility and accounts">
        <p>
          You must meet the legal age requirements in your jurisdiction. You are responsible for
          account accuracy and security, including any actions taken through your account.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Acceptable use">
        <ul className="list-disc space-y-2 pl-5">
          <li>No unlawful, threatening, or abusive content.</li>
          <li>No impersonation or fraudulent behavior.</li>
          <li>No attempts to disrupt delivery systems or platform reliability.</li>
        </ul>
      </InfoSectionCard>

      <InfoSectionCard title="Scheduled delivery">
        <p>
          QC is designed for timing precision, but external providers and network factors may
          affect final delivery time in rare cases.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Intellectual property">
        <p>
          QC product, branding, and software are protected. Your submitted content remains yours,
          and you grant QC permission to process it only to operate the service.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Changes and contact">
        <p>
          We may update these terms as the product evolves. For questions, contact{" "}
          <a href="mailto:vera@qcapp.co">vera@qcapp.co</a>.
        </p>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
