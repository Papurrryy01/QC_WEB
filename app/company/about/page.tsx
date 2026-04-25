import Link from "next/link";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";

const VALUES = [
  "Private by design",
  "Calm, premium experience",
  "Timing precision without noise",
] as const;

export default function CompanyAboutPage() {
  return (
    <InfoPageShell
      eyebrow="About QC"
      title="QC exists for moments that should not be rushed."
      intro="Most messaging tools optimize speed. QC optimizes intention so emotional communication lands with clarity and care."
      updatedAt="April 2026"
    >
      <InfoSectionCard title="Mission">
        <p>
          QC exists to help people deliver meaningful messages at the exact moment they matter
          most.
        </p>
        <p>
          Timing is part of emotional quality. A message that lands at the right second can feel
          thoughtful instead of late, calm instead of reactive, and memorable instead of routine.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Why QC exists">
        <p>
          Important messages are often delayed, rushed, or sent at the wrong time. QC gives that
          moment structure before real life gets in the way.
        </p>
        <p>
          Instead of remembering too late, you can prepare a note with intention and trust that it
          will arrive when it should.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Product values">
        <ul className="list-disc space-y-2 pl-5">
          {VALUES.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      </InfoSectionCard>

      <InfoSectionCard title="Long-term vision">
        <p>
          QC is being built as a trusted emotional scheduling layer for personal communication,
          where milestones, check-ins, care, and support all have a place to arrive with purpose.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Next step">
        <p>If you want to understand the trust model behind QC, continue into security.</p>
        <div className="pt-2">
          <Link href="/company/security" className="qc-button qc-button--secondary">
            Read our security approach
          </Link>
        </div>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
