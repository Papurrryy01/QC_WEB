import Link from "next/link";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";

const FEATURES = [
  {
    title: "Precision scheduling",
    description:
      "Set exact delivery date, time, and timezone behavior before a moment is released.",
    meaning:
      "You control when the feeling arrives instead of leaving timing to habit or memory.",
    example: "Schedule a message for 9:13 PM recipient local time, even if you prepared it weeks earlier.",
  },
  {
    title: "Delivery system",
    description:
      "QC queues and dispatches moments through a reliability-first delivery flow built around timing integrity.",
    meaning:
      "A moment prepared early can still arrive at the right minute without manual follow-up.",
    example: "A birthday message drafted in advance still lands exactly when the day begins for the recipient.",
  },
  {
    title: "Private access",
    description:
      "Each delivery uses scoped visibility and private access behavior instead of public feed mechanics.",
    meaning:
      "Sensitive messages stay between the sender and the recipient, where they belong.",
    example: "A support note remains private instead of becoming another shareable public post.",
  },
  {
    title: "Emotional formatting",
    description:
      "QC supports tone shaping, pacing, and reveal style selection so the message can land with intention.",
    meaning:
      "The experience feels crafted instead of rushed or mechanically assembled.",
    example: "A tender message can open with a soft visual, then reveal the text a beat later.",
  },
] as const;

export default function FeatureOverviewPage() {
  return (
    <InfoPageShell
      eyebrow="Feature Overview"
      title="Every QC feature exists to protect timing and emotional clarity."
      intro="QC balances precision scheduling with private delivery and emotionally aware formatting so each moment lands the way you intended."
      updatedAt="April 2026"
    >
      {FEATURES.map((feature) => (
        <InfoSectionCard key={feature.title} title={feature.title}>
          <p>{feature.description}</p>
          <p>
            <span className="font-semibold text-[var(--qc-text-soft)]">Why it matters: </span>
            {feature.meaning}
          </p>
          <p>
            <span className="font-semibold text-[var(--qc-text-soft)]">Example: </span>
            {feature.example}
          </p>
        </InfoSectionCard>
      ))}

      <InfoSectionCard title="Product behavior">
        <p>
          The product should feel quiet and exact. Features should stay in the background while timing,
          privacy, and emotional pacing remain in the foreground.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Keep interactions light enough that the message always stays central.</li>
          <li>Use subtle motion to reinforce purpose, not to advertise functionality.</li>
          <li>Make planning and delivery feel dependable before they feel expressive.</li>
        </ul>
      </InfoSectionCard>

      <InfoSectionCard title="Next step">
        <p>Once the feature model is clear, the next layer is understanding how QC organizes everything in time.</p>
        <div className="pt-2">
          <Link href="/experience/calendar-flow" className="qc-button qc-button--secondary">
            Understand calendar flow
          </Link>
        </div>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
