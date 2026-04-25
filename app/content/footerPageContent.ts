import type { StructuredInfoPageProps } from "@/app/components/info/StructuredInfoPage";

type PageContent = Omit<StructuredInfoPageProps, "children">;

export const ABOUT_QC_CONTENT: PageContent = {
  eyebrow: "About QC",
  title: "QC exists for moments that should not be rushed.",
  intro:
    "Most messaging tools optimize speed. QC optimizes intention so emotional communication lands with clarity and care.",
  sections: [
    {
      title: "Mission",
      explanation:
        "Help people deliver meaningful messages at the exact moment they matter most.",
      practicalMeaning:
        "Timing becomes part of emotional quality, not just logistics.",
      example: "A gratitude note arrives before someone starts a difficult day.",
    },
    {
      title: "Why QC exists",
      explanation:
        "Important messages are often delayed, rushed, or sent at the wrong time.",
      practicalMeaning:
        "QC gives people a calm system to express care with precision.",
      example: "Prepare an apology thoughtfully, then schedule it for the right moment.",
    },
    {
      title: "Long-term vision",
      explanation:
        "Build the most trusted emotional scheduling layer for personal communication.",
      practicalMeaning:
        "QC becomes a lasting place for moments people want to remember.",
      example: "Milestones, check-ins, and support moments managed in one timeline.",
    },
  ],
  uiSuggestions: {
    layout: "Editorial narrative layout with statement headers and supporting cards.",
    interactions: [
      "Slow fade-in transitions for each narrative section.",
      "Minimal motion to keep focus on message clarity.",
      "Anchor links for quick navigation through mission pillars.",
    ],
  },
  bottomCta: {
    label: "Read our security approach",
    href: "/company/security",
  },
};

export const SECURITY_CONTENT: PageContent = {
  eyebrow: "Security",
  title: "Private by design, clear by default.",
  intro:
    "QC protects personal moments through secure delivery paths, careful access controls, and a minimal-data philosophy.",
  sections: [
    {
      title: "Privacy-first system",
      explanation:
        "QC is designed so private emotional content is not exposed to public discovery surfaces.",
      practicalMeaning:
        "Your moments stay intentionally scoped.",
      example: "Sensitive support messages remain visible only in authorized contexts.",
    },
    {
      title: "Secure delivery links",
      explanation:
        "Delivery access is handled through controlled links and validation checks.",
      practicalMeaning:
        "It reduces accidental sharing and unintended access.",
      example: "A recipient opens through the expected flow, not a random public route.",
    },
    {
      title: "Data protection philosophy",
      explanation:
        "QC stores only what is needed to operate scheduling, delivery, and account safety.",
      practicalMeaning:
        "Lower data exposure surface and clearer retention boundaries.",
      example: "Delivery metadata retained for reliability, not profile monetization.",
    },
  ],
  uiSuggestions: {
    layout: "Trust overview cards followed by plain-language explainers.",
    interactions: [
      "Expandable technical detail rows for advanced users.",
      "Soft status badges for key safeguards.",
      "Cross-link to system status and legal pages for transparency.",
    ],
  },
  bottomCta: {
    label: "Check live system status",
    href: "/company/system-status",
  },
};

export const PRIVACY_CONTENT: PageContent = {
  eyebrow: "Privacy",
  title: "Privacy, by design.",
  intro:
    "QC is built for private, intentional delivery. Every moment you create is meant for a specific person, at a specific time, and we treat that responsibility with care.",
  tone: "legal",
  sections: [
    {
      title: "Plain-language summary",
      explanation:
        "QC collects only the data needed to run account access, scheduling, and private delivery. We do not sell your personal data or make your moments public.",
      practicalMeaning:
        "You can use QC for emotional communication without feeling exposed.",
      example: "Your message stays in your account context and recipient delivery flow.",
    },
    {
      title: "What we collect",
      explanation:
        "Account details (email, authentication identifiers), moment data (message content, media metadata, delivery timing), recipient contact information (email or phone when provided), and operational logs for security and reliability.",
      practicalMeaning:
        "You can clearly see exactly what enters the system and why.",
      example: "Recipient email is stored only to deliver the intended moment.",
    },
    {
      title: "How we use data",
      explanation:
        "Data is used to authenticate your account, schedule and deliver moments, monitor reliability, and resolve support issues.",
      practicalMeaning:
        "Your information is tied to product operation rather than ad targeting.",
      example: "Operational logs help diagnose delivery failures.",
    },
    {
      title: "How moments are delivered",
      explanation:
        "Moments are delivered through private, time-based access links generated uniquely for each delivery. These links are not publicly indexed or searchable and may be time-limited.",
      practicalMeaning:
        "Delivery stays personal and aligned to the exact scheduled context.",
      example: "A link opens for the intended recipient window and can expire after access.",
    },
    {
      title: "Access and protection",
      explanation:
        "QC uses secure authentication systems and tokenized links to help ensure only intended recipients can access a moment.",
      practicalMeaning:
        "Account and delivery access are guarded against unauthorized use.",
      example: "Session controls and scoped link validation block invalid access attempts.",
    },
    {
      title: "What we do not do",
      explanation:
        "We do not sell personal data. We do not use your messages for advertising. We do not make your moments public or searchable.",
      practicalMeaning:
        "Your emotional content is not converted into marketing inventory.",
      example: "A private apology is never surfaced in public discovery systems.",
    },
    {
      title: "Third-party processors",
      explanation:
        "QC uses infrastructure and communications providers to run service operations.",
      practicalMeaning:
        "Partners process data only to provide required service functions.",
      example: "Email delivery provider handles notification dispatch.",
    },
    {
      title: "Data retention",
      explanation:
        "Moments remain associated with your account unless deleted. Delivery access links may expire after a set period or after being accessed. You can request account and associated data deletion at any time.",
      practicalMeaning:
        "You have a clear lifecycle for stored moments and delivery artifacts.",
      example: "A delivered link can expire while your account keeps retained history until deletion.",
    },
    {
      title: "Your controls",
      explanation:
        "You can manage profile, timezone, and notification preferences in Settings, request export or deletion through support, and revoke device permissions at any time in browser or OS settings.",
      practicalMeaning:
        "Control over account behavior and data remains in your hands.",
      example: "Disable browser permissions immediately without leaving your account.",
    },
    {
      title: "Cookies and usage data",
      explanation:
        "QC uses minimal cookies and related technologies for secure sessions, product performance, and reliable delivery behavior.",
      practicalMeaning:
        "Core functionality works reliably without invasive tracking systems.",
      example: "Session cookies keep your authenticated context stable across pages.",
    },
    {
      title: "Compliance",
      explanation:
        "QC is designed to meet applicable data protection standards. Users outside the United States may have additional rights based on local law.",
      practicalMeaning:
        "Privacy commitments are structured for multi-region responsibility.",
      example: "Regional requests can include additional access or deletion rights.",
    },
    {
      title: "Contact",
      explanation:
        "For privacy requests, legal questions, or data-control support, contact our team directly.",
      practicalMeaning:
        "You have a direct path for sensitive requests without unnecessary routing.",
      example: "Email privacy support at vera@qcapp.co for deletion requests.",
    },
  ],
  uiSuggestions: {
    layout: "Strong opening hero, then anchored legal cards in a clear trust-first sequence.",
    interactions: [
      "Sticky section index for quick jumps on long pages.",
      "Soft fade-in between section cards to maintain reading rhythm.",
      "Optional expandable detail rows for legal depth without clutter.",
    ],
  },
  bottomCta: {
    label: "Read terms of service",
    href: "/legal/terms",
  },
};

export const HELP_CENTER_CONTENT: PageContent = {
  eyebrow: "Help Center",
  title: "Fast answers for creating, scheduling, and delivering moments.",
  intro:
    "Use structured categories and practical guidance to resolve issues quickly without leaving your workflow.",
  sections: [
    {
      title: "Getting started",
      explanation:
        "Core setup guidance for account access and first scheduled moment.",
      practicalMeaning:
        "New users can move from signup to successful delivery quickly.",
      example: "How to schedule your first moment in under five minutes.",
    },
    {
      title: "Creation workflow",
      explanation:
        "Article guides for writing, tone shaping, and reveal setup.",
      practicalMeaning:
        "You avoid guesswork while composing emotional moments.",
      example: "Choosing a calm reveal style for sensitive notes.",
    },
    {
      title: "Calendar and delivery",
      explanation:
        "Guides for schedule management, rescheduling, and delivery checks.",
      practicalMeaning:
        "Reduces timing errors and missed sends.",
      example: "Fixing timezone mismatches before release.",
    },
    {
      title: "Account and security",
      explanation:
        "Help topics for login, verification, and account protection.",
      practicalMeaning:
        "Keeps access issues from interrupting planning.",
      example: "Recovering access after changing devices.",
    },
  ],
  uiSuggestions: {
    layout: "Search-first hub with category cards and article rows.",
    interactions: [
      "Live filtering while typing in search field.",
      "Accordion FAQ entries with smooth open/close animation.",
      "Article usefulness feedback chip at bottom of each entry.",
    ],
  },
  bottomCta: {
    label: "Contact support directly",
    href: "/support/contact",
  },
};
