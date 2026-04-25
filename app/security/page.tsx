import Link from "next/link";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";
import LegalSummaryCard from "@/app/components/legal/LegalSummaryCard";

export default function SecurityPage() {
  return (
    <InfoPageShell
      eyebrow="Security"
      title="Security at QC"
      intro="QC is built with defense-in-depth practices for authentication, storage, and delivery integrity."
      updatedAt="April 2026"
    >
      <LegalSummaryCard
        summary="We use secure infrastructure, encrypted transport, strict access controls, and monitored systems to protect accounts and scheduled moments."
        bullets={[
          "TLS encryption for data in transit.",
          "Role-based access for internal systems.",
          "Audit logging and incident response procedures.",
        ]}
      />

      <InfoSectionCard title="Infrastructure and encryption">
        <p>
          QC uses cloud infrastructure with network controls, encrypted transport, and hardened
          service boundaries between public and internal workloads.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Account protection">
        <p>
          Authentication checks and session controls help protect user access. You can strengthen
          your account using unique credentials and regular security hygiene.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Monitoring and response">
        <p>
          We monitor reliability and abnormal patterns. If we detect a critical issue, we respond,
          contain, and communicate through status updates.
        </p>
        <div className="pt-2">
          <Link href="/company/system-status" className="qc-button qc-button--secondary">
            View current status
          </Link>
        </div>
      </InfoSectionCard>

      <InfoSectionCard title="Responsible disclosure">
        <p>
          Found a vulnerability? Contact <a href="mailto:vera@qcapp.co">vera@qcapp.co</a>{" "}
          with reproduction details so our team can investigate quickly.
        </p>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
