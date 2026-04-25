import Link from "next/link";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";

export default function CompanySecurityPage() {
  return (
    <InfoPageShell
      eyebrow="Security"
      title="Private by design, clear by default."
      intro="QC protects personal moments through careful access controls, secure delivery paths, and a minimal-data philosophy."
      updatedAt="April 2026"
    >
      <InfoSectionCard title="Privacy-first system">
        <p>
          QC is designed so private emotional content does not depend on public discovery surfaces
          or broad visibility defaults.
        </p>
        <p>
          Moments are scoped to the account and delivery context they were created for, not exposed
          as searchable public content.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Secure delivery links">
        <p>
          Delivery access is handled through controlled links and validation checks so the intended
          recipient experience stays aligned to the scheduled context.
        </p>
        <p>
          This reduces accidental sharing, premature access, and open-ended exposure.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Data protection philosophy">
        <p>
          QC stores only what is needed to operate scheduling, delivery, and account safety. The
          goal is a smaller exposure surface and clearer retention boundaries.
        </p>
        <p>
          That means operational data exists to run the service reliably, not to turn private
          communication into advertising inventory.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Transparency and status">
        <p>
          Reliability and incident communication should be easy to verify. When system health
          changes, status updates should be clear, current, and easy to find.
        </p>
        <div className="pt-2">
          <Link href="/company/system-status" className="qc-button qc-button--secondary">
            Check live system status
          </Link>
        </div>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
