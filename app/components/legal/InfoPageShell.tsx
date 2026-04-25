import Link from "next/link";
import type { ReactNode } from "react";

type InfoPageShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  updatedAt?: string;
  tone?: "informational" | "legal";
};

type InfoSectionCardProps = {
  title: string;
  children: ReactNode;
  id?: string;
};

export function InfoSectionCard({ title, children, id }: InfoSectionCardProps) {
  return (
    <section
      id={id}
      className="rounded-[24px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface-strong)_82%,transparent)] p-6 shadow-[var(--qc-shadow-1)] backdrop-blur-xl sm:p-7"
    >
      <h2 className="text-[1.45rem] leading-tight tracking-[-0.02em] text-[var(--qc-text)]">{title}</h2>
      <div className="mt-3 space-y-3 text-[1rem] leading-relaxed text-[var(--qc-text-muted)]">{children}</div>
    </section>
  );
}

export default function InfoPageShell({
  eyebrow,
  title,
  intro,
  children,
  updatedAt,
  tone = "informational",
}: InfoPageShellProps) {
  const toneText =
    tone === "legal" ? "Reference documentation" : "Product information";

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[var(--qc-bg)] text-[var(--qc-text)]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[var(--qc-background-image)] bg-cover bg-center opacity-55" />
        <div className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--qc-bg)_76%,white)] backdrop-blur-[28px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-bg)_92%,transparent)] backdrop-blur-xl">
        <div className="qc-nav-inner qc-nav-inner--landing mx-auto h-[4.2rem] max-w-[1180px] px-5 sm:px-7">
          <Link href="/" className="qc-logo qc-logo--landing">
            QC
          </Link>
          <nav className="qc-nav-links qc-nav-links--landing" aria-label="Info navigation">
            <Link href="/help" className="qc-nav-link qc-nav-link--prominent">
              Help
            </Link>
            <Link href="/login" className="qc-nav-link qc-nav-link--prominent">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1120px] px-5 pb-16 pt-10 sm:px-7 sm:pb-20 sm:pt-14">
        <div className="rounded-[28px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface-strong)_76%,transparent)] p-7 shadow-[var(--qc-shadow-2)] backdrop-blur-xl sm:p-10">
          <p className="text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-[var(--qc-text-faint)]">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-[clamp(2rem,4.2vw,3.2rem)] leading-[1.04] tracking-[-0.04em] text-[var(--qc-text)]">
            {title}
          </h1>
          <p className="mt-4 max-w-[70ch] text-[1.06rem] leading-relaxed text-[var(--qc-text-soft)]">
            {intro}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.78rem] uppercase tracking-[0.16em] text-[var(--qc-text-faint)]">
            <span>{toneText}</span>
            {updatedAt ? <span>Updated {updatedAt}</span> : null}
          </div>
        </div>

        <div className="mt-6 space-y-5">{children}</div>
      </section>
    </main>
  );
}
