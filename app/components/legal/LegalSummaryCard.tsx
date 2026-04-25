type LegalSummaryCardProps = {
  title?: string;
  summary: string;
  bullets?: string[];
};

export default function LegalSummaryCard({
  title = "In plain language",
  summary,
  bullets,
}: LegalSummaryCardProps) {
  return (
    <section className="rounded-[24px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface-strong)_80%,transparent)] p-6 shadow-[var(--qc-shadow-1)] backdrop-blur-xl sm:p-7">
      <h2 className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[var(--qc-text-faint)]">
        {title}
      </h2>
      <p className="mt-3 text-[1rem] leading-relaxed text-[var(--qc-text-soft)]">{summary}</p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-2 text-[0.96rem] text-[var(--qc-text-muted)]">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span aria-hidden="true" className="mt-[0.42rem] h-1.5 w-1.5 rounded-full bg-[var(--qc-accent)]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
