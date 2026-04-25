import Link from "next/link";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";

const CALENDAR_SECTIONS = [
  {
    title: "How scheduling works",
    description:
      "Each moment is attached to a specific date and time with timezone-aware delivery behavior built into the planning flow.",
    meaning:
      "You avoid accidental late-night sends, off-by-one-day mistakes, and delivery that lands at the wrong local moment.",
    example:
      "A birthday moment can be set to arrive at 8:00 AM in the recipient's city even if you created it while traveling.",
  },
  {
    title: "Day structure",
    description:
      "Calendar days reflect real activity instead of decorative filler, so busy dates and open dates are easy to read at a glance.",
    meaning:
      "You can spread meaningful moments intentionally instead of stacking too many on one day and flattening their impact.",
    example:
      "If Friday already carries several deliveries, you can move one check-in to Saturday to give it more room to breathe.",
  },
  {
    title: "Managing multiple moments",
    description:
      "Monthly and daily views keep upcoming deliveries, sent moments, and edits visible in one organized timeline.",
    meaning:
      "You do not have to remember what is scheduled where. QC keeps the emotional calendar readable and controlled.",
    example:
      "Anniversaries, encouragement notes, and check-ins can all live in the same week without becoming hard to track.",
  },
  {
    title: "Editing and rescheduling",
    description:
      "Before a moment goes live, timing and message details can be adjusted without rebuilding the whole experience from scratch.",
    meaning:
      "QC stays flexible when real life changes and the right moment shifts.",
    example:
      "A delivery can be moved by a day when travel plans change, while keeping the message and structure intact.",
  },
] as const;

export default function CalendarFlowPage() {
  return (
    <InfoPageShell
      eyebrow="Calendar Flow"
      title="Plan meaningful delivery across days, weeks, and milestones."
      intro="QC calendar keeps emotional scheduling organized so multiple moments stay visible, intentional, and easy to adjust."
      updatedAt="April 2026"
    >
      {CALENDAR_SECTIONS.map((section) => (
        <InfoSectionCard key={section.title} title={section.title}>
          <p>{section.description}</p>
          <p>
            <span className="font-semibold text-[var(--qc-text-soft)]">Why it matters: </span>
            {section.meaning}
          </p>
          <p>
            <span className="font-semibold text-[var(--qc-text-soft)]">Example: </span>
            {section.example}
          </p>
        </InfoSectionCard>
      ))}

      <InfoSectionCard title="Calendar behavior">
        <p>
          The calendar should feel practical first and expressive second. Motion, density indicators,
          and navigation need to support planning without turning the interface into a dashboard.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Month transitions should feel smooth, not jumpy.</li>
          <li>Density signals should appear only when real moments exist.</li>
          <li>Day views should open quickly and keep editing actions close to context.</li>
        </ul>
      </InfoSectionCard>

      <InfoSectionCard title="Next step">
        <p>If you want access before the full public rollout, early access is the next layer to understand.</p>
        <div className="pt-2">
          <Link href="/experience/early-access" className="qc-button qc-button--secondary">
            Explore early access
          </Link>
        </div>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
