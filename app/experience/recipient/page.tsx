import Link from "next/link";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";

const JOURNEY_STEPS = [
  {
    title: "Arrival window",
    description:
      "A private notification arrives at the scheduled time with enough context to signal that something meaningful is waiting.",
    meaning:
      "The message lands when attention is available instead of disappearing into a crowded feed.",
    example: "A support note appears minutes before an important exam, not hours too early or after it is already over.",
  },
  {
    title: "Anticipation and countdown",
    description:
      "QC can hold a short countdown before the full reveal so the recipient pauses before opening the message.",
    meaning:
      "That pacing creates focus. The moment feels intentional instead of dropped in abruptly.",
    example: 'A calm "opens in 00:30" countdown adds tension without turning the experience into a gimmick.',
  },
  {
    title: "Reveal sequence",
    description:
      "Message text, visuals, and optional voice layers can appear in a controlled order instead of all at once.",
    meaning:
      "The recipient experiences a composed emotional arc rather than a stack of content competing for attention.",
    example: "A photo appears first, then the message, then a voice layer that deepens the feeling.",
  },
  {
    title: "After the moment",
    description:
      "Delivered moments remain accessible in private history so they can be revisited later.",
    meaning:
      "Important words stay easy to return to when they matter again, instead of getting buried or lost.",
    example: "An anniversary message can be reopened months later and still feel preserved.",
  },
] as const;

export default function RecipientExperiencePage() {
  return (
    <InfoPageShell
      eyebrow="Recipient Experience"
      title="The moment should feel personal the second it arrives."
      intro="QC is designed as an emotional journey: arrival, anticipation, reveal, and memory. The recipient experiences pacing, not noise."
      updatedAt="April 2026"
    >
      {JOURNEY_STEPS.map((step) => (
        <InfoSectionCard key={step.title} title={step.title}>
          <p>{step.description}</p>
          <p>
            <span className="font-semibold text-[var(--qc-text-soft)]">Why it matters: </span>
            {step.meaning}
          </p>
          <p>
            <span className="font-semibold text-[var(--qc-text-soft)]">Example: </span>
            {step.example}
          </p>
        </InfoSectionCard>
      ))}

      <InfoSectionCard title="Experience direction">
        <p>
          The recipient flow should read like a quiet narrative, not a notification workflow. Motion,
          countdown, and reveal timing should support emotional clarity instead of chasing novelty.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use gentle fade and slide transitions between stages.</li>
          <li>Keep countdown motion calm and restrained, never abrupt.</li>
          <li>Let media add atmosphere without overpowering the message itself.</li>
        </ul>
      </InfoSectionCard>

      <InfoSectionCard title="Next step">
        <p>See how QC’s core features support that recipient experience across scheduling, delivery, and privacy.</p>
        <div className="pt-2">
          <Link href="/experience/feature-overview" className="qc-button qc-button--secondary">
            See the feature overview
          </Link>
        </div>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
