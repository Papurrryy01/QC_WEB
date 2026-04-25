"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import InfoPageShell, { InfoSectionCard } from "@/app/components/legal/InfoPageShell";

type ReportCategory = "delivery" | "account" | "app";

type IssueType =
  | "Delivery bug"
  | "Account bug"
  | "Scheduling bug"
  | "Playback or reveal bug"
  | "UI or app behavior"
  | "Other";

const CATEGORY_CARDS: Array<{
  id: ReportCategory;
  title: string;
  body: string;
  issueType: IssueType;
}> = [
  {
    id: "delivery",
    title: "Delivery bug",
    body: "A moment opened incorrectly, delivered at the wrong time, or failed during the recipient flow.",
    issueType: "Delivery bug",
  },
  {
    id: "account",
    title: "Account bug",
    body: "Authentication, verification, settings, or account-specific behavior is failing unexpectedly.",
    issueType: "Account bug",
  },
  {
    id: "app",
    title: "App behavior",
    body: "The interface, creation flow, playback, or another product surface is behaving incorrectly.",
    issueType: "UI or app behavior",
  },
];

const RESPONSE_TARGETS = [
  { level: "Delivery-impacting bug", target: "Same-day triage" },
  { level: "Account-blocking bug", target: "Within 24 hours" },
  { level: "General product bug", target: "Within 24–48 hours" },
] as const;

const ISSUE_TYPE_OPTIONS: IssueType[] = [
  "Delivery bug",
  "Account bug",
  "Scheduling bug",
  "Playback or reveal bug",
  "UI or app behavior",
  "Other",
];

const DELIVERY_OUTCOMES = [
  "Did not deliver",
  "Delivered early",
  "Delivered late",
  "Incorrect reveal behavior",
] as const;

const ACCOUNT_OUTCOMES = [
  "Unable to sign in",
  "Verification problem",
  "Settings not saving",
  "Account mismatch",
  "Permission issue",
] as const;

const APP_SURFACES = [
  "Calendar",
  "Create flow",
  "Moment detail",
  "Recipient experience",
  "Notifications",
  "Other",
] as const;

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function TriageCard({
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
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-[24px] border px-5 py-5 text-left transition duration-200 ease-out",
        "hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]",
        selected
          ? "border-[color:color-mix(in_srgb,var(--qc-accent)_22%,var(--qc-border))] bg-[color:color-mix(in_srgb,var(--qc-surface-strong)_78%,var(--qc-accent-soft)_22%)] shadow-[0_18px_36px_rgba(15,23,42,0.07)]"
          : "border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface-strong)_82%,transparent)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-[var(--qc-text)]">
            {title}
          </h3>
          <p className="mt-2 text-[0.95rem] leading-6 text-[var(--qc-text-soft)]">{body}</p>
        </div>
        <span
          className={cn(
            "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[0.78rem] transition",
            selected
              ? "border-[color:color-mix(in_srgb,var(--qc-accent)_28%,transparent)] bg-[var(--qc-accent-soft)] text-[var(--qc-accent)]"
              : "border-[var(--qc-border)] text-[var(--qc-text-faint)]"
          )}
        >
          {selected ? "✓" : ""}
        </span>
      </div>
    </button>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="max-w-[46rem]">
        <h2 className="text-[1.12rem] font-semibold tracking-[-0.025em] text-[var(--qc-text)]">{title}</h2>
        {description ? (
          <p className="mt-2 text-[0.96rem] leading-6 text-[var(--qc-text-soft)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({
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
    <label className={cn("space-y-2.5", fullWidth && "md:col-span-2")}>
      <span className="block text-[0.76rem] font-medium uppercase tracking-[0.18em] text-[var(--qc-text-faint)]">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[0.9rem] leading-5 text-[var(--qc-text-soft)]">{hint}</span> : null}
    </label>
  );
}

function inputClasses(multiline = false) {
  return cn(
    "w-full rounded-[18px] border border-[color:color-mix(in_srgb,var(--qc-border)_86%,white)]",
    "bg-[color:color-mix(in_srgb,white_88%,var(--qc-surface-strong))]",
    "text-[0.98rem] text-[var(--qc-text)] placeholder:text-[color:color-mix(in_srgb,var(--qc-text-soft)_68%,white)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition duration-200",
    "focus:-translate-y-[1px] focus:border-[color:color-mix(in_srgb,var(--qc-accent)_22%,var(--qc-border))] focus:bg-white focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--qc-accent-soft)_62%,transparent)]",
    multiline ? "min-h-[148px] px-4 py-3 leading-6" : "h-12 px-4"
  );
}

export default function ReportIssuePage() {
  const [reportCategory, setReportCategory] = useState<ReportCategory>("delivery");
  const [issueType, setIssueType] = useState<IssueType>("Delivery bug");
  const [deliveryOutcome, setDeliveryOutcome] =
    useState<(typeof DELIVERY_OUTCOMES)[number]>("Did not deliver");
  const [accountOutcome, setAccountOutcome] =
    useState<(typeof ACCOUNT_OUTCOMES)[number]>("Unable to sign in");
  const [appSurface, setAppSurface] = useState<(typeof APP_SURFACES)[number]>("Create flow");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");

  const selectedCard = useMemo(
    () => CATEGORY_CARDS.find((card) => card.id === reportCategory) ?? CATEGORY_CARDS[0],
    [reportCategory]
  );

  const handleCategorySelect = (category: ReportCategory, nextIssueType: IssueType) => {
    setReportCategory(category);
    setIssueType(nextIssueType);
  };

  const handleIssueTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as IssueType;
    setIssueType(next);

    if (next === "Delivery bug" || next === "Scheduling bug" || next === "Playback or reveal bug") {
      setReportCategory("delivery");
    } else if (next === "Account bug") {
      setReportCategory("account");
    } else {
      setReportCategory("app");
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setAttachmentName(file?.name ?? "");
  };

  return (
    <InfoPageShell
      eyebrow="Report an issue"
      title="Issue reports, routed with precision."
      intro="If something behaved incorrectly, capture the context clearly and QC can route it to the right fix path faster."
      updatedAt="April 2026"
    >
      <InfoSectionCard title="What needs attention?">
        <p className="max-w-[50rem] text-[0.98rem] leading-6 text-[var(--qc-text-soft)]">
          Start with the closest issue area. QC uses it to route your report toward delivery, account,
          or product behavior triage before the team reviews the details.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {CATEGORY_CARDS.map((card) => (
            <TriageCard
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
              className="flex flex-col gap-2 rounded-[18px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface-strong)_86%,white)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <span className="text-[0.97rem] font-medium text-[var(--qc-text)]">{row.level}</span>
              <span className="text-[0.78rem] font-medium uppercase tracking-[0.18em] text-[var(--qc-text-faint)]">
                {row.target}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[0.92rem] leading-6 text-[var(--qc-text-soft)]">
          Priority is based on delivery impact, account blocking severity, and whether the issue
          affects core product behavior.
        </p>
      </InfoSectionCard>

      <section className="rounded-[30px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface-strong)_86%,white)] p-6 shadow-[0_22px_44px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:p-8">
        <form className="space-y-8" aria-label="Issue report form">
          <FormSection
            title="Report basics"
            description="Start with the account and issue category involved. QC uses this to send the report into the right triage lane before review begins."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Account email"
                hint="Use the email tied to the QC account involved."
              >
                <input
                  className={inputClasses()}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="vera@qcapp.co"
                  defaultValue="vera@qcapp.co"
                />
              </Field>

              <Field
                label="Issue type"
                hint="Choose the closest match so your report can be routed correctly."
              >
                <select
                  className={inputClasses()}
                  value={issueType}
                  onChange={handleIssueTypeChange}
                  name="issueType"
                >
                  {ISSUE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              {reportCategory === "delivery" ? (
                <Field
                  label="Delivery outcome"
                  hint="Use the closest result so delivery triage starts with the right assumptions."
                  fullWidth
                >
                  <select
                    className={inputClasses()}
                    value={deliveryOutcome}
                    onChange={(event) =>
                      setDeliveryOutcome(event.target.value as (typeof DELIVERY_OUTCOMES)[number])
                    }
                    name="deliveryOutcome"
                  >
                    {DELIVERY_OUTCOMES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {reportCategory === "account" ? (
                <Field
                  label="Access issue"
                  hint="Choose the closest account problem so the right authentication context is checked first."
                  fullWidth
                >
                  <select
                    className={inputClasses()}
                    value={accountOutcome}
                    onChange={(event) =>
                      setAccountOutcome(event.target.value as (typeof ACCOUNT_OUTCOMES)[number])
                    }
                    name="accountOutcome"
                  >
                    {ACCOUNT_OUTCOMES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {reportCategory === "app" ? (
                <Field
                  label="Surface affected"
                  hint="Use the closest product surface so review starts from the right part of QC."
                  fullWidth
                >
                  <select
                    className={inputClasses()}
                    value={appSurface}
                    onChange={(event) => setAppSurface(event.target.value as (typeof APP_SURFACES)[number])}
                    name="appSurface"
                  >
                    {APP_SURFACES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
          </FormSection>

          <div className="border-t border-[color:color-mix(in_srgb,var(--qc-border)_72%,white)]" />

          <FormSection
            title="When and where"
            description="Tie the report to the moment, route, and device context where the issue actually happened."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Time issue occurred"
                hint="Use your local time if exact timestamp data is not available."
              >
                <input
                  className={inputClasses()}
                  type="text"
                  name="occurredAt"
                  placeholder="Apr 16, 9:13 PM"
                  defaultValue="Apr 16, 9:13 PM"
                />
              </Field>

              <Field
                label="Affected moment ID (optional)"
                hint="Include it if the issue is tied to a specific scheduled or delivered moment."
              >
                <input
                  className={inputClasses()}
                  type="text"
                  name="momentId"
                  placeholder="Optional UUID or share reference"
                />
              </Field>

              <Field
                label="Page or route (optional)"
                hint="Useful when the issue only appears in one part of QC."
              >
                <input
                  className={inputClasses()}
                  type="text"
                  name="route"
                  placeholder="/app/create"
                  defaultValue="/app/create"
                />
              </Field>

              <Field
                label="Device and browser"
                hint="For example: iPhone 16 Pro, Safari 18."
              >
                <input
                  className={inputClasses()}
                  type="text"
                  name="device"
                  placeholder="MacBook Pro, Chrome 136"
                  defaultValue="MacBook Pro, Chrome 136"
                />
              </Field>
            </div>
          </FormSection>

          <div className="border-t border-[color:color-mix(in_srgb,var(--qc-border)_72%,white)]" />

          <FormSection
            title="What happened"
            description="Capture the issue clearly. Focus on what happened, what you expected, and what occurred instead."
          >
            <div className="grid gap-5">
              <Field
                label="Issue title"
                hint="A short summary makes triage easier."
              >
                <input
                  className={inputClasses()}
                  type="text"
                  name="title"
                  placeholder="Recipient countdown skipped directly to open"
                  defaultValue="Recipient countdown skipped directly to open"
                />
              </Field>

              <Field
                label="Description"
                hint="The clearer your description, the faster the review can be routed and reproduced."
              >
                <textarea
                  className={inputClasses(true)}
                  name="description"
                  placeholder="Describe what happened, what you expected, and what occurred instead."
                  defaultValue="The recipient countdown flashed briefly, then the moment opened immediately instead of holding until the scheduled reveal."
                />
              </Field>
            </div>
          </FormSection>

          <div className="border-t border-[color:color-mix(in_srgb,var(--qc-border)_72%,white)]" />

          <section className="space-y-4">
            <button
              type="button"
              onClick={() => setAdvancedOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-[22px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_82%,white)] px-5 py-4 text-left transition hover:border-[color:color-mix(in_srgb,var(--qc-accent)_18%,var(--qc-border))] hover:shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
              aria-expanded={advancedOpen}
            >
              <div>
                <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-[var(--qc-text)]">
                  Add technical detail
                </h2>
                <p className="mt-1 text-[0.94rem] leading-6 text-[var(--qc-text-soft)]">
                  Add reproduction detail only if it helps the team validate the issue faster.
                </p>
              </div>
              <span className="ml-4 text-[1.2rem] text-[var(--qc-text-soft)]">
                {advancedOpen ? "−" : "+"}
              </span>
            </button>

            <div
              className={cn(
                "grid overflow-hidden transition-all duration-300 ease-out",
                advancedOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="min-h-0">
                <div className="rounded-[24px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_82%,white)] px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] sm:px-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field
                      label="Steps to reproduce"
                      hint="List the sequence clearly so the team can recreate the behavior."
                    >
                      <textarea
                        className={inputClasses(true)}
                        name="steps"
                        placeholder="1. Open the moment link&#10;2. Wait for countdown&#10;3. Notice the reveal jumps forward immediately"
                        defaultValue={"1. Open the moment link\n2. Wait for countdown\n3. Notice the reveal jumps forward immediately"}
                      />
                    </Field>

                    <Field
                      label="Additional environment detail"
                      hint="Anything extra that may explain why the issue appears in this environment."
                    >
                      <textarea
                        className={inputClasses(true)}
                        name="environment"
                        placeholder="Connection type, browser extensions, device state, or other context."
                      />
                    </Field>

                    <Field
                      label="Expected behavior"
                      hint="What should have happened instead?"
                    >
                      <textarea
                        className={inputClasses(true)}
                        name="expected"
                        placeholder="The countdown should remain visible until the scheduled reveal moment."
                        defaultValue="The countdown should remain visible until the scheduled reveal moment."
                      />
                    </Field>

                    <Field
                      label="Actual behavior"
                      hint="Describe the issue as it actually appeared."
                    >
                      <textarea
                        className={inputClasses(true)}
                        name="actual"
                        placeholder="The countdown flashed briefly, then the final reveal opened immediately."
                        defaultValue="The countdown flashed briefly, then the final reveal opened immediately."
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-[color:color-mix(in_srgb,var(--qc-border)_72%,white)]" />

          <FormSection
            title="Add context"
            description="Optional, but screenshots or recordings often shorten investigation time significantly."
          >
            <div className="rounded-[22px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_82%,white)] p-4 transition hover:border-[color:color-mix(in_srgb,var(--qc-accent)_18%,var(--qc-border))] hover:shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
              <label
                htmlFor="issue-attachment"
                className="flex cursor-pointer flex-col gap-4 rounded-[18px] border border-dashed border-[color:color-mix(in_srgb,var(--qc-border)_80%,white)] bg-[color:color-mix(in_srgb,white_90%,var(--qc-surface))] px-4 py-4 transition hover:border-[color:color-mix(in_srgb,var(--qc-accent)_20%,var(--qc-border))] hover:bg-white sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <span className="block text-[0.96rem] font-medium text-[var(--qc-text)]">
                    {attachmentName || "Choose a screenshot or recording"}
                  </span>
                  <span className="mt-1 block text-[0.9rem] leading-5 text-[var(--qc-text-soft)]">
                    PNG, JPG, MOV, or MP4. Keep files under 20 MB when possible.
                  </span>
                </div>
                <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface-strong)_90%,white)] px-4 text-[0.92rem] font-medium text-[var(--qc-text)]">
                  {attachmentName ? "Replace file" : "Choose file"}
                </span>
              </label>
              <input
                id="issue-attachment"
                type="file"
                accept=".png,.jpg,.jpeg,.mov,.mp4"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>
          </FormSection>

          <div className="border-t border-[color:color-mix(in_srgb,var(--qc-border)_72%,white)]" />

          <FormSection
            title="Submit report"
            description="Clear reports move faster. QC triages by impact, reproducibility, and whether delivery or access is affected."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--qc-accent)] px-6 text-[0.96rem] font-medium text-white shadow-[0_12px_26px_rgba(37,99,235,0.26)] transition hover:-translate-y-[1px] hover:bg-[color:color-mix(in_srgb,var(--qc-accent)_88%,white)]"
              >
                Submit issue
              </button>

              <Link
                href="/company/system-status"
                className="text-[0.94rem] font-medium text-[var(--qc-text-soft)] transition hover:text-[var(--qc-text)]"
              >
                View system status
              </Link>
            </div>
            <p className="text-[0.9rem] leading-6 text-[var(--qc-text-soft)]">
              Reports are reviewed based on severity and product impact.
            </p>
          </FormSection>
        </form>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[24px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_78%,transparent)] p-6 shadow-[0_14px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
          <h2 className="text-[1.18rem] font-semibold tracking-[-0.025em] text-[var(--qc-text)]">
            What issue reporting covers
          </h2>
          <p className="mt-3 text-[0.97rem] leading-7 text-[var(--qc-text-soft)]">
            This page is for reproducible bugs, broken flows, incorrect delivery behavior, visual
            glitches, and product behavior that does not match the intended QC experience.
          </p>
          <p className="mt-3 text-[0.97rem] leading-7 text-[var(--qc-text-soft)]">
            If the issue is urgent and tied to a live delivery problem, use{" "}
            <Link href="/support/contact" className="font-medium text-[var(--qc-text)] underline-offset-4 hover:underline">
              Support Contact
            </Link>{" "}
            so it reaches the right queue immediately.
          </p>
        </section>

        <section className="rounded-[24px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface)_78%,transparent)] p-6 shadow-[0_14px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
          <h2 className="text-[1.18rem] font-semibold tracking-[-0.025em] text-[var(--qc-text)]">
            Prefer direct contact?
          </h2>
          <p className="mt-3 text-[0.97rem] leading-7 text-[var(--qc-text-soft)]">
            If reporting through the form is unavailable, send the issue directly with the same details.
          </p>
          <a
            href="mailto:vera@qcapp.co"
            className="mt-5 inline-flex text-[0.98rem] font-medium text-[var(--qc-text)] underline decoration-[color:color-mix(in_srgb,var(--qc-text)_18%,transparent)] underline-offset-4 transition hover:decoration-[color:color-mix(in_srgb,var(--qc-text)_38%,transparent)]"
          >
            vera@qcapp.co
          </a>
        </section>
      </div>
    </InfoPageShell>
  );
}
