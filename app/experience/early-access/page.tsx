import Link from "next/link";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";

export default function EarlyAccessPage() {
  return (
    <InfoPageShell
      eyebrow="Early Access"
      title="Join QC while the product is still being shaped."
      intro="Early users get access to the core experience first, see what is coming next, and influence what gets refined before wider release."
      updatedAt="April 2026"
    >
      <InfoSectionCard title="What early users get now">
        <p>
          Early access opens the core creation, scheduling, and private delivery flow without waiting for a broad public launch.
        </p>
        <p>
          That means you can use QC in real life now, not just reserve a spot and hope the product matures later.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="What is coming next">
        <p>
          The roadmap is focused on richer reveal styles, stronger voice layering, cleaner planning tools, and more expressive moment customization.
        </p>
        <p>
          Early members see those directions sooner and help pressure-test what deserves to become permanent.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="How feedback works">
        <p>
          Feedback from early users is reviewed as product signal, not treated like background noise. The point is to learn from real use, not collect vanity comments.
        </p>
        <p>
          If a workflow feels awkward, unclear, or emotionally off, that feedback can directly shape what gets refined next.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Who early access is for">
        <p>
          This stage is best for people who already know they want more control over timing, privacy, and emotional delivery than standard messaging tools allow.
        </p>
        <p>
          It is also for people willing to notice what feels sharp, what feels unfinished, and what should become more trustworthy before wider release.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Next step">
        <p>If QC already feels aligned with how you want meaningful delivery to work, request access directly from the landing flow.</p>
        <div className="pt-2">
          <Link href="/#early-access" className="qc-button qc-button--secondary">
            Request early access
          </Link>
        </div>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
