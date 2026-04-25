import Link from "next/link";
import type { FooterColumnData } from "./footerLinks";

type FooterColumnProps = {
  column: FooterColumnData;
};

export default function FooterColumn({ column }: FooterColumnProps) {
  return (
    <section aria-label={column.title}>
      <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[var(--qc-text-faint)]">
        {column.title}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {column.links.map((link) => (
          <li key={`${column.title}-${link.href}`}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-[0.95rem] text-[var(--qc-text-muted)] transition-colors duration-200 hover:text-[var(--qc-text)]"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-[0.95rem] text-[var(--qc-text-muted)] transition-colors duration-200 hover:text-[var(--qc-text)]"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
