export type FooterLinkItem = {
  label: string;
  href: string;
  external?: boolean;
};

export type FooterColumnData = {
  title: string;
  links: FooterLinkItem[];
};

export const PUBLIC_FOOTER_BRAND_LINE =
  "Meaningful moments, timed with care and delivered with intention.";

export const PUBLIC_FOOTER_COLUMNS: FooterColumnData[] = [
  {
    title: "Experience",
    links: [
      { label: "Recipient experience", href: "/experience/recipient" },
      { label: "Feature overview", href: "/experience/feature-overview" },
      { label: "Calendar flow", href: "/experience/calendar-flow" },
      { label: "Early access", href: "/experience/early-access" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About QC", href: "/company/about" },
      { label: "Security", href: "/company/security" },
      { label: "System status", href: "/company/system-status" },
      { label: "Contact", href: "/company/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help center", href: "/support/help-center" },
      { label: "Support contact", href: "/support/contact" },
      { label: "Report an issue", href: "/support/report-issue" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
];

export const APP_FOOTER_LINKS: FooterLinkItem[] = [
  { label: "Legal & info", href: "/app/settings?panel=legal" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "About", href: "/company/about" },
  { label: "Support", href: "/support/contact" },
];

export const PUBLIC_FOOTER_BOTTOM_LINKS: FooterLinkItem[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Status", href: "/company/system-status" },
];
