import Link from "next/link";
import type React from "react";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";

export type StructuredSection = {
  title: string;
  explanation: string;
  practicalMeaning: string;
  example?: string;
};

export type StructuredUiSuggestions = {
  layout: string;
  interactions: string[];
};

export type StructuredBottomCta = {
  label: string;
  href: string;
};

export type StructuredInfoPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: StructuredSection[];
  uiSuggestions: StructuredUiSuggestions;
  bottomCta: StructuredBottomCta;
  tone?: "informational" | "legal";
  updatedAt?: string;
  children?: React.ReactNode;
};

function WhyLine({ label, text }: { label: string; text: string }) {
  return (
    <p>
      <span className="font-semibold text-[var(--qc-text-soft)]">{label} </span>
      {text}
    </p>
  );
}

export default function StructuredInfoPage({
  eyebrow,
  title,
  intro,
  sections,
  uiSuggestions,
  bottomCta,
  tone = "informational",
  updatedAt = "April 2026",
  children,
}: StructuredInfoPageProps) {
  return (
    <InfoPageShell eyebrow={eyebrow} title={title} intro={intro} tone={tone} updatedAt={updatedAt}>
      {sections.map((section) => (
        <InfoSectionCard key={section.title} title={section.title}>
          <WhyLine label="What this does:" text={section.explanation} />
          <WhyLine label="Why it matters:" text={section.practicalMeaning} />
          {section.example ? <WhyLine label="Example:" text={section.example} /> : null}
        </InfoSectionCard>
      ))}

      {children}

      <InfoSectionCard title="UI and interaction direction">
        <WhyLine label="Recommended layout:" text={uiSuggestions.layout} />
        <div>
          <p className="font-semibold text-[var(--qc-text-soft)]">Interaction notes</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[var(--qc-text-muted)]">
            {uiSuggestions.interactions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </InfoSectionCard>

      <InfoSectionCard title="Next step">
        <p className="text-[var(--qc-text-soft)]">Continue with the next relevant part of QC.</p>
        <div className="pt-2">
          <Link href={bottomCta.href} className="qc-button qc-button--secondary">
            {bottomCta.label}
          </Link>
        </div>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
