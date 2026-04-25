"use client";

import { useEffect, useState } from "react";

type WaitlistState = "idle" | "submitting" | "success" | "duplicate" | "error";

type WaitlistResponse = {
  status?: "created" | "already_exists";
  emailDelivery?: "sent" | "failed";
  error?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function AboutWaitlistModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [clientLocale] = useState(
    typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US"
  );
  const [waitlistState, setWaitlistState] = useState<WaitlistState>("idle");
  const [waitlistMessage, setWaitlistMessage] = useState("");

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function closeModal() {
    setIsOpen(false);
    setWaitlistState("idle");
    setWaitlistMessage("");
  }

  async function handleWaitlistSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = waitlistEmail.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setWaitlistState("error");
      setWaitlistMessage("Please enter a valid email.");
      return;
    }

    setWaitlistState("submitting");
    setWaitlistMessage("Saving your spot...");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          source: "about",
          locale: clientLocale,
          website,
        }),
      });

      const payload = (await res.json().catch(() => null)) as WaitlistResponse | null;

      if (!res.ok) {
        setWaitlistState("error");
        setWaitlistMessage(payload?.error ?? "Could not save your signup.");
        return;
      }

      if (payload?.status === "already_exists") {
        setWaitlistState("duplicate");
        setWaitlistMessage("You are already on the list. Check your inbox for confirmation.");
        return;
      }

      setWaitlistState("success");
      setWaitlistMessage("You are in. Check your inbox to confirm.");
      setWaitlistEmail("");
      setWebsite("");
    } catch {
      setWaitlistState("error");
      setWaitlistMessage("Network issue. Please try again.");
    }
  }

  const statusClass =
    waitlistState === "success"
      ? "qc-status qc-status--success"
      : waitlistState === "duplicate"
        ? "qc-status qc-status--warning"
        : waitlistState === "error"
          ? "qc-status qc-status--danger"
          : "qc-status";

  return (
    <>
      <button type="button" className="qc-button qc-button--primary" onClick={() => setIsOpen(true)}>
        Get early access
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center p-4"
          style={{ background: "rgba(7, 10, 16, 0.58)", backdropFilter: "blur(8px)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-early-access-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="qc-card qc-card--hero w-full max-w-xl">
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close early access form"
              className="qc-button qc-button--secondary"
              style={{ float: "right", minHeight: "2.2rem", padding: "0 0.8rem" }}
            >
              Close
            </button>

            <p className="qc-kicker" style={{ marginTop: "0.4rem" }}>
              Early access
            </p>
            <h2 id="about-early-access-title" className="qc-heading-lg">
              Join the private launch list.
            </h2>
            <p className="qc-copy">
              One quiet launch note. No spam.
            </p>

            <form onSubmit={handleWaitlistSubmit} className="qc-form-grid" style={{ marginTop: "1rem" }} noValidate>
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="about-website">Website</label>
                <input
                  id="about-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>

              <label htmlFor="about-waitlist-email" className="sr-only">
                Email for early access
              </label>
              <input
                id="about-waitlist-email"
                name="email"
                type="email"
                value={waitlistEmail}
                onChange={(event) => setWaitlistEmail(event.target.value)}
                placeholder="you@email.com"
                required
                className="qc-input"
              />

              <button type="submit" disabled={waitlistState === "submitting"} className="qc-button qc-button--primary">
                {waitlistState === "submitting" ? "Submitting..." : "Get early access"}
              </button>

              {waitlistState !== "idle" && (
                <p className={statusClass} role="status" aria-live="polite">
                  {waitlistMessage}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
