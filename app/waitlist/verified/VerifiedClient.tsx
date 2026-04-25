"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const FEATURE_OPTIONS = [
  "Exact date + hour delivery",
  "Recipient verification",
  "Pre-release reminders",
  "Photo, video, and audio moments",
  "Recurring moments",
];

type SubmitState = "idle" | "submitting" | "success" | "error";

type FeedbackResponse = {
  ok?: boolean;
  error?: string;
};

type VerifiedClientProps = {
  signupId: string;
  invalidReason?: "missing" | "invalid" | "error";
};

export default function VerifiedClient({
  signupId,
  invalidReason,
}: VerifiedClientProps) {
  const router = useRouter();
  const [useCase, setUseCase] = useState("");
  const [requestedFeatures, setRequestedFeatures] = useState<string[]>([]);
  const [lifeImpact, setLifeImpact] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  function toggleFeature(feature: string) {
    setRequestedFeatures((current) =>
      current.includes(feature)
        ? current.filter((item) => item !== feature)
        : [...current, feature]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!signupId) {
      setSubmitState("error");
      setStatusMessage("Invalid verification session. Please verify again.");
      return;
    }

    if (!useCase.trim() || !lifeImpact.trim() || requestedFeatures.length === 0) {
      setSubmitState("error");
      setStatusMessage(
        "Please answer all required questions and select at least one feature."
      );
      return;
    }

    setSubmitState("submitting");
    setStatusMessage("Saving your feedback...");

    try {
      const res = await fetch("/api/waitlist/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signupId,
          useCase,
          requestedFeatures,
          lifeImpact,
        }),
      });

      const payload = (await res.json().catch(() => null)) as FeedbackResponse | null;

      if (!res.ok) {
        setSubmitState("error");
        setStatusMessage(payload?.error ?? "Could not save feedback right now.");
        return;
      }

      setSubmitState("success");
      setStatusMessage("Thank you. Redirecting...");
      router.replace("/waitlist/appreciation");
    } catch {
      setSubmitState("error");
      setStatusMessage("Network issue. Please try again.");
    }
  }

  const statusClass =
    submitState === "success"
      ? "text-[#8cd3a7]"
      : submitState === "error"
        ? "text-[#f8a6a6]"
        : "text-[var(--text-muted)]";

  const invalidMessage =
    invalidReason === "missing"
      ? "This link is missing required verification info."
      : invalidReason === "error"
        ? "We could not verify this link right now. Please try again later."
        : "This verification link is invalid or expired. Please use a fresh email.";

  return (
    <main className="landing-shell feedback-page min-h-screen text-[var(--text-main)]">
      <div className="landing-grain" aria-hidden="true" />

      <header className="top-nav">
        <div className="nav-inner">
          <Link href="/" className="logo">
            QC
          </Link>
          <span className="nav-mini-link nav-mini-current">Verified</span>
        </div>
      </header>

      <section className="landing-container feedback-hero">
        <p className="landing-kicker">Email verified</p>
        <h1 className="about-title">You are in. Help us shape QC.</h1>
        <p className="about-lead">
          This takes under a minute. Your answers guide what we build first.
        </p>
      </section>

      <section className="landing-container feedback-card-wrap">
        {!signupId ? (
          <div className="feedback-invalid">
            <p className="section-subtitle">{invalidMessage}</p>
            <Link href="/" className="primary-cta">
              Back to Home
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-card" noValidate>
            <div className="feedback-block">
              <label htmlFor="use-case" className="feedback-label">
                How would you use QC? <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="use-case"
                name="useCase"
                className="feedback-textarea"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="Example: I would schedule birthday messages and check-ins for family."
                rows={4}
                required
              />
            </div>

            <div className="feedback-block">
              <p className="feedback-label">
                Which features matter most to you? <span aria-hidden="true">*</span>
              </p>
              <div className="feedback-chip-grid">
                {FEATURE_OPTIONS.map((feature) => {
                  const selected = requestedFeatures.includes(feature);
                  return (
                    <button
                      key={feature}
                      type="button"
                      className={`feedback-chip ${selected ? "is-selected" : ""}`}
                      onClick={() => toggleFeature(feature)}
                    >
                      {feature}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="feedback-block">
              <label htmlFor="life-impact" className="feedback-label">
                How would QC make your life easier? <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="life-impact"
                name="lifeImpact"
                className="feedback-textarea"
                value={lifeImpact}
                onChange={(e) => setLifeImpact(e.target.value)}
                placeholder="Tell us what this would solve for you."
                rows={4}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitState === "submitting"}
              className="primary-cta feedback-submit"
            >
              {submitState === "submitting" ? "Saving..." : "Send Feedback"}
            </button>

            {statusMessage && (
              <p className={`feedback-status ${statusClass}`} role="status" aria-live="polite">
                {statusMessage}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
