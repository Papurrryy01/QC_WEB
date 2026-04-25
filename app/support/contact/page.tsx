"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";

type SupportCategory = "delivery" | "account" | "general";

type IssueType =
  | "Delivery issue"
  | "Account access"
  | "Scheduling issue"
  | "App behavior"
  | "Other";

const CATEGORY_CARDS: Array<{
  id: SupportCategory;
  title: string;
  body: string;
  issueType: IssueType;
}> = [
  {
    id: "delivery",
    title: "Delivery issue",
    body: "A moment did not arrive, arrived incorrectly, or timing felt off.",
    issueType: "Delivery issue",
  },
  {
    id: "account",
    title: "Account access",
    body: "Trouble signing in, verifying access, or using account-related features.",
    issueType: "Account access",
  },
  {
    id: "general",
    title: "General support",
    body: "Questions, guidance, or help with how QC works.",
    issueType: "Other",
  },
];

const RESPONSE_TARGETS = [
  { level: "Critical delivery issue", target: "Same-day triage" },
  { level: "Account access issue", target: "Within 24 hours" },
  { level: "General support", target: "Within 24–48 hours" },
] as const;

const ISSUE_TYPE_OPTIONS: IssueType[] = [
  "Delivery issue",
  "Account access",
  "Scheduling issue",
  "App behavior",
  "Other",
];

const DELIVERY_OUTCOMES = [
  "Arrived late",
  "Arrived early",
  "Did not arrive",
  "Incorrect content or behavior",
] as const;

const ACCESS_ISSUES = [
  "Unable to sign in",
  "Verification issue",
  "Account mismatch",
  "Permission or access problem",
] as const;

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function SupportCategoryCard({
  title,
  body,
  selected,
  onClick,
}: {
  title: string;
  body: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group rounded-[22px] border px-5 py-5 text-left transition duration-200 ease-out",
        "hover:-translate-y-[1px] hover:border-[color:color-mix(in_srgb,var(--qc-accent)_24%,var(--qc-border))] hover:shadow-[0_12px_28px_rgba(17,24,39,0.06)]",
        selected
          ? "border-[color:color-mix(in_srgb,var(--qc-accent)_28%,var(--qc-border))] bg-[color:color-mix(in_srgb,var(--qc-surface)_78%,var(--qc-accent-soft)_22%)] shadow-[0_14px_32px_rgba(17,24,39,0.06)]"
          : "border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_82%,transparent)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-[var(--qc-text-strong)]">
            {title}
          </h3>
          <p className="mt-2 max-w-[28rem] text-[0.97rem] leading-6 text-[var(--qc-text-soft)]">
            {body}
          </p>
        </div>
        <span
          className={cn(
            "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[0.82rem] transition",
            selected
              ? "border-[color:color-mix(in_srgb,var(--qc-accent)_30%,transparent)] bg-[var(--qc-accent-soft)] text-[var(--qc-accent)]"
              : "border-[var(--qc-border)] text-[var(--qc-text-faint)]"
          )}
        >
          {selected ? "✓" : ""}
        </span>
      </div>
    </button>
  );
}

function SupportSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_84%,transparent)] px-5 py-5 shadow-[0_18px_38px_rgba(17,24,39,0.05)] sm:px-6">
      <div className="max-w-[48rem]">
        <h3 className="text-[1.08rem] font-semibold tracking-[-0.025em] text-[var(--qc-text-strong)]">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-[0.97rem] leading-6 text-[var(--qc-text-soft)]">{description}</p>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SupportField({
  label,
  hint,
  children,
  fullWidth = false,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <label className={cn("space-y-2.5", fullWidth && "sm:col-span-2")}>
      <span className="block text-[0.76rem] font-medium uppercase tracking-[0.18em] text-[var(--qc-text-faint)]">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[0.9rem] leading-5 text-[var(--qc-text-soft)]">{hint}</span> : null}
    </label>
  );
}

export default function SupportContactPage() {
  const [supportCategory, setSupportCategory] = useState<SupportCategory>("delivery");
  const [issueType, setIssueType] = useState<IssueType>("Delivery issue");
  const [deliveryOutcome, setDeliveryOutcome] = useState<(typeof DELIVERY_OUTCOMES)[number]>("Did not arrive");
  const [accessIssue, setAccessIssue] = useState<(typeof ACCESS_ISSUES)[number]>("Unable to sign in");
  const [attachmentName, setAttachmentName] = useState("");

  const selectedCard = useMemo(
    () => CATEGORY_CARDS.find((card) => card.id === supportCategory) ?? CATEGORY_CARDS[0],
    [supportCategory]
  );

  const handleCategorySelect = (category: SupportCategory, nextIssueType: IssueType) => {
    setSupportCategory(category);
    setIssueType(nextIssueType);
  };

  const handleIssueTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as IssueType;
    setIssueType(next);

    if (next === "Delivery issue") setSupportCategory("delivery");
    else if (next === "Account access") setSupportCategory("account");
    else setSupportCategory("general");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setAttachmentName(file?.name ?? "");
  };

  return (
    <InfoPageShell
      eyebrow="Support"
      title="Support, handled with clarity."
      intro="If something didn’t go as expected, we’ll help you resolve it quickly and precisely."
      updatedAt="April 2026"
    >
      <InfoSectionCard title="What do you need help with?">
        <p className="max-w-[44rem] text-[0.98rem] leading-6 text-[var(--qc-text-soft)]">
          Start with the closest category. QC uses it to route your request to the right queue before
          anyone reads the details.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {CATEGORY_CARDS.map((card) => (
            <SupportCategoryCard
              key={card.id}
              title={card.title}
              body={card.body}
              selected={selectedCard.id === card.id}
              onClick={() => handleCategorySelect(card.id, card.issueType)}
            />
          ))}
        </div>
      </InfoSectionCard>

      <InfoSectionCard title="Response timing">
        <div className="space-y-2.5">
          {RESPONSE_TARGETS.map((row) => (
            <div
              key={row.level}
              className="flex items-center justify-between gap-4 rounded-[16px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_84%,transparent)] px-4 py-3 sm:px-5"
            >
              <span className="text-[0.96rem] font-medium text-[var(--qc-text-strong)]">{row.level}</span>
              <span className="text-[0.78rem] font-medium uppercase tracking-[0.18em] text-[var(--qc-text-faint)]">
                {row.target}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[0.92rem] leading-6 text-[var(--qc-text-soft)]">
          Priority is based on delivery impact and account access urgency.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Support request">
        <form className="space-y-5" aria-label="Support request form">
          <SupportSection
            title="Your account"
            description="Used to locate your account and associated moments."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SupportField label="Account email" hint="Use the email tied to the QC account involved.">
                <input
                  className="qc-input h-12 w-full transition focus:translate-y-[-1px] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--qc-accent-soft)_58%,transparent)]"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="vera@qcapp.co"
                />
              </SupportField>
            </div>
          </SupportSection>

          <SupportSection
            title="Issue details"
            description="Choose the closest match so your request can be routed correctly."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SupportField label="Issue type">
                <select
                  className="qc-input h-12 w-full transition focus:translate-y-[-1px] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--qc-accent-soft)_58%,transparent)]"
                  value={issueType}
                  onChange={handleIssueTypeChange}
                >
                  {ISSUE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </SupportField>

              {issueType === "Delivery issue" ? (
                <SupportField label="Delivery outcome" hint="Tell us how the delivery differed from what you expected.">
                  <select
                    className="qc-input h-12 w-full transition focus:translate-y-[-1px] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--qc-accent-soft)_58%,transparent)]"
                    value={deliveryOutcome}
                    onChange={(event) =>
                      setDeliveryOutcome(event.target.value as (typeof DELIVERY_OUTCOMES)[number])
                    }
                  >
                    {DELIVERY_OUTCOMES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </SupportField>
              ) : issueType === "Account access" ? (
                <SupportField label="Access issue" hint="Choose the closest account problem.">
                  <select
                    className="qc-input h-12 w-full transition focus:translate-y-[-1px] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--qc-accent-soft)_58%,transparent)]"
                    value={accessIssue}
                    onChange={(event) =>
                      setAccessIssue(event.target.value as (typeof ACCESS_ISSUES)[number])
                    }
                  >
                    {ACCESS_ISSUES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </SupportField>
              ) : (
                <SupportField
                  label="Additional context"
                  hint="Optional, but helpful if the issue spans more than one area."
                >
                  <input
                    className="qc-input h-12 w-full transition focus:translate-y-[-1px] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--qc-accent-soft)_58%,transparent)]"
                    name="secondaryContext"
                    placeholder="Scheduling, app behavior, or anything else relevant"
                  />
                </SupportField>
              )}
            </div>
          </SupportSection>

          <SupportSection
            title="When and where"
            description="Include a moment ID if this issue is tied to a specific scheduled delivery."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SupportField label="Time issue occurred" hint="Use the closest time you noticed the issue.">
                <input
                  className="qc-input h-12 w-full transition focus:translate-y-[-1px] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--qc-accent-soft)_58%,transparent)]"
                  type="text"
                  name="occurredAt"
                  defaultValue="Apr 16, 9:13 PM"
                />
              </SupportField>
              <SupportField label="Affected moment ID" hint="Optional, but speeds up review when available.">
                <input
                  className="qc-input h-12 w-full transition focus:translate-y-[-1px] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--qc-accent-soft)_58%,transparent)]"
                  name="momentId"
                  placeholder="qc_moment_..."
                />
              </SupportField>
            </div>
          </SupportSection>

          <SupportSection
            title="What happened"
            description="The clearer your description, the faster we can review and route your request."
          >
            <SupportField
              label="Description"
              fullWidth
              hint="Describe what happened, what you expected, and what occurred instead."
            >
              <textarea
                className="qc-input min-h-[170px] w-full py-4 transition focus:translate-y-[-1px] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--qc-accent-soft)_58%,transparent)]"
                name="description"
                placeholder="Describe what happened, what you expected, and what occurred instead."
              />
            </SupportField>
          </SupportSection>

          <SupportSection
            title="Add context"
            description="Optional, but screenshots or recordings can help us resolve issues faster."
          >
            <div className="space-y-3">
              <label
                htmlFor="support-attachment"
                className="group flex cursor-pointer items-center justify-between gap-4 rounded-[20px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_84%,transparent)] px-4 py-4 transition duration-200 hover:border-[color:color-mix(in_srgb,var(--qc-accent)_24%,var(--qc-border))] hover:shadow-[0_12px_28px_rgba(17,24,39,0.05)] focus-within:border-[color:color-mix(in_srgb,var(--qc-accent)_24%,var(--qc-border))] focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--qc-accent-soft)_58%,transparent)]"
              >
                <div>
                  <p className="text-[0.96rem] font-medium text-[var(--qc-text-strong)]">
                    {attachmentName || "Attach screenshot or recording"}
                  </p>
                  <p className="mt-1 text-[0.9rem] text-[var(--qc-text-soft)]">
                    PNG, JPG, PDF, or short video capture
                  </p>
                </div>
                <span className="inline-flex min-h-[2.5rem] items-center rounded-full border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_90%,transparent)] px-4 text-[0.92rem] font-medium text-[var(--qc-text-strong)] transition group-hover:border-[color:color-mix(in_srgb,var(--qc-accent)_18%,var(--qc-border))]">
                  Choose file
                </span>
              </label>
              <input
                id="support-attachment"
                type="file"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>
          </SupportSection>

          <SupportSection title="Send request" description="Requests are reviewed based on urgency and delivery impact.">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="submit" className="qc-button qc-button--secondary">
                Send request
              </button>
              <Link
                href="/company/status"
                className="text-[0.93rem] font-medium text-[var(--qc-text-soft)] transition hover:text-[var(--qc-text-strong)]"
              >
                View system status
              </Link>
            </div>
          </SupportSection>
        </form>
      </InfoSectionCard>

      <InfoSectionCard title="What support covers">
        <p>
          Support covers delivery timing concerns, account access issues, scheduling problems, and
          app behavior that blocks normal use.
        </p>
        <p>
          For legal, privacy, or partnership requests, use the appropriate company contact channel.
        </p>
      </InfoSectionCard>

      <InfoSectionCard title="Prefer direct contact?">
        <p>If form submission is unavailable, you can reach us directly.</p>
        <p>
          <a href="mailto:vera@qcapp.co">vera@qcapp.co</a>
        </p>
      </InfoSectionCard>
    </InfoPageShell>
  );
}
