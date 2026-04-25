import Image from "next/image";
import Link from "next/link";
import {
  PUBLIC_FOOTER_BOTTOM_LINKS,
  PUBLIC_FOOTER_COLUMNS,
  type FooterColumnData,
  type FooterLinkItem,
} from "./footerLinks";

function FooterNavLink({ link }: { link: FooterLinkItem }) {
  const className =
    "inline-flex items-center text-[1.03rem] text-zinc-700 transition-all duration-200 hover:translate-x-[1px] hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100";

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer" className={className}>
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

function FooterNavSection({ section }: { section: FooterColumnData }) {
  return (
    <section aria-label={section.title}>
      <h3 className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-300/90">
        {section.title}
      </h3>
      <ul className="mt-4.5 space-y-3.5">
        {section.links.map((link) => (
          <li key={`${section.title}-${link.href}`}>
            <FooterNavLink link={link} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-8 overflow-hidden border-t border-zinc-300/80 bg-[color:color-mix(in_srgb,var(--qc-surface)_78%,var(--qc-bg)_22%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.48)] dark:border-white/10 dark:bg-[color:color-mix(in_srgb,var(--qc-surface)_86%,var(--qc-bg)_14%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-10 pt-12 sm:px-8 sm:pb-11 sm:pt-14 lg:px-12">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.16fr)_minmax(0,1.84fr)]">
          <div className="space-y-9 lg:pr-2">
            <div className="relative h-[78px] w-[78px] overflow-hidden rounded-2xl border border-[var(--qc-border)] bg-[var(--qc-surface-strong)]">
              <Image src="/qc-footer-logo.png" alt="QC logo" fill sizes="64px" className="object-cover" />
            </div>

            <div className="space-y-4.5">
              <h2 className="max-w-[20ch] text-[1.72rem] font-semibold leading-[1.16] tracking-[-0.02em] text-zinc-800 dark:text-zinc-200">
                Meaningful moments, delivered with intention.
              </h2>
              <p className="max-w-[40ch] text-[1.06rem] leading-relaxed text-zinc-600 dark:text-zinc-400">
                Quiet, private delivery for what matters most. Plan the exact moment and let QC handle the reveal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/experience/feature-overview"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--qc-border)] bg-transparent px-5 text-[0.97rem] font-medium text-zinc-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--qc-border-strong)] hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-100"
              >
                How it works
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--qc-border)] bg-transparent px-5 text-[0.97rem] font-medium text-zinc-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--qc-border-strong)] hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-100"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
            {PUBLIC_FOOTER_COLUMNS.map((section) => (
              <FooterNavSection key={section.title} section={section} />
            ))}
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-[var(--qc-border)] pt-4 text-[0.89rem] text-zinc-500 dark:text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p>© {year} QC. All rights reserved.</p>
            <span className="hidden text-zinc-400 sm:inline dark:text-zinc-600">•</span>
            <p className="text-zinc-500 dark:text-zinc-500">Timed delivery, calm by design.</p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Footer quick links">
            {PUBLIC_FOOTER_BOTTOM_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-all duration-200 hover:translate-x-[1px] hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
