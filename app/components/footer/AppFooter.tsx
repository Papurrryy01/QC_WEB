import Link from "next/link";
import { APP_FOOTER_LINKS } from "./footerLinks";

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-bg)_92%,transparent)]/95 px-4 py-4 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <p className="text-[0.75rem] text-[var(--qc-text-faint)]">© {year} QC</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[0.78rem] text-[var(--qc-text-muted)]" aria-label="In-app legal links">
          {APP_FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-[var(--qc-text)]">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
