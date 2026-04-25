"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import StartPointSection from "@/app/components/landing/start-point/StartPointSection";
import PublicFooter from "@/app/components/footer/PublicFooter";

type WaitlistState = "idle" | "submitting" | "success" | "duplicate" | "error";

type WaitlistResponse = {
  ok?: boolean;
  status?: "created" | "already_exists";
  emailDelivery?: "sent" | "failed";
  error?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/**
 * Reads one-time waitlist verification feedback from query params.
 */
function readVerifyFeedback(): { state: WaitlistState; message: string } {
  if (typeof window === "undefined") {
    return { state: "idle", message: "" };
  }

  const params = new URLSearchParams(window.location.search);
  const verify = params.get("verify");

  if (verify === "success") {
    return {
      state: "success",
      message: "Email confirmed. You are on the launch list.",
    };
  }

  if (verify === "invalid" || verify === "missing") {
    return {
      state: "error",
      message: "That verification link is invalid or expired.",
    };
  }

  if (verify === "error") {
    return {
      state: "error",
      message: "We could not verify your email right now.",
    };
  }

  return { state: "idle", message: "" };
}

export default function LandingClient() {
  const initialFeedback = useMemo(() => readVerifyFeedback(), []);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [clientLocale] = useState(
    typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US"
  );
  const [waitlistState, setWaitlistState] = useState<WaitlistState>(initialFeedback.state);
  const [waitlistMessage, setWaitlistMessage] = useState(initialFeedback.message);

  /**
   * Maps request state to semantic status styles for the feedback line.
   */
  const statusClassName = useMemo(() => {
    if (waitlistState === "success") return "qc-status qc-status--success";
    if (waitlistState === "duplicate") return "qc-status qc-status--warning";
    if (waitlistState === "error") return "qc-status qc-status--danger";
    return "qc-status";
  }, [waitlistState]);

  /**
   * Removes the `verify` query param after showing its feedback message.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("verify")) return;

    params.delete("verify");
    const query = params.toString();
    const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, "", next);
  }, []);

  /**
   * Submits the waitlist form and reports success/duplicate/error states inline.
   */
  async function handleWaitlistSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = waitlistEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setWaitlistState("error");
      setWaitlistMessage("Please enter a valid email address.");
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
          source: "landing",
          locale: clientLocale,
          website,
        }),
      });

      const payload = (await res.json().catch(() => null)) as WaitlistResponse | null;

      if (!res.ok) {
        setWaitlistState("error");
        setWaitlistMessage(payload?.error ?? "We could not save your signup.");
        return;
      }

      if (payload?.status === "already_exists") {
        setWaitlistState("duplicate");
        setWaitlistMessage("You are already on the list. Check your inbox for confirmation.");
        return;
      }

      setWaitlistState("success");
      setWaitlistMessage("You are in. Check your inbox to confirm your email.");
      setWaitlistEmail("");
      setWebsite("");
    } catch {
      setWaitlistState("error");
      setWaitlistMessage("Network issue. Please try again.");
    }
  }

  return (
    <main className="qc-shell">
      <header className="qc-nav">
        <div className="qc-nav-inner qc-nav-inner--landing">
          <Link href="/" className="qc-logo qc-logo--landing">
            QC
          </Link>
          <nav className="qc-nav-links qc-nav-links--landing" aria-label="Primary">
            <a href="#experience" className="qc-nav-link">
              Experience
            </a>
            <span className="qc-nav-separator" aria-hidden="true">
              |
            </span>
            <a href="#features" className="qc-nav-link">
              Features
            </a>
            <Link href="/login" className="qc-nav-link qc-nav-link--button">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="qc-container qc-hero">
        <p className="qc-kicker">Quiet luxury delivery</p>
        <h1 className="qc-display">Some moments deserve perfect timing.</h1>
        <p className="qc-lede">
          QC lets you compose meaningful moments and schedule them for the exact second they matter
          most.
        </p>
        <div className="qc-action-row qc-action-row--single">
          <a href="#features" className="qc-button qc-button--secondary">
            Explore QC
          </a>
        </div>

        <div className="qc-mockup-stack" aria-label="QC product preview">
          <div className="qc-hero-showcase">
            <Image
              src="/landing-phone-showcase.png"
              alt="QC phone showcase preview"
              width={1500}
              height={844}
              className="qc-hero-showcase-image"
              sizes="(max-width: 1600px) 92vw, 1400px"
              quality={100}
              priority
            />
          </div>
        </div>
      </section>

      <section id="experience" className="relative overflow-hidden py-24 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-zinc-50/80 to-white" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-black/[0.05]" />
        <div className="pointer-events-none absolute left-1/2 top-[14%] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.95),rgba(255,255,255,0.55)_34%,rgba(0,0,0,0.035)_68%,transparent_78%)] blur-2xl" />
        <div className="pointer-events-none absolute left-1/2 top-[34%] h-[540px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.028),transparent_72%)]" />

        <div className="relative z-10 mx-auto max-w-[1280px] px-6">
          <header className="mx-auto max-w-[980px] text-center">
            <p className="text-[0.74rem] font-medium uppercase tracking-[0.42em] text-zinc-500">
              Recipient Experience
            </p>

            <h2 className="mt-5 font-[var(--font-display)] text-[clamp(2.9rem,6vw,5.8rem)] leading-[0.94] tracking-[-0.065em] text-zinc-950">
              A reveal that plays out
              <br className="hidden sm:block" />
              like a guided story.
            </h2>

            <p className="mx-auto mt-7 max-w-[980px] text-[clamp(1.08rem,1.7vw,1.42rem)] leading-[1.58] tracking-[-0.02em] text-zinc-600">
              Every moment moves through three beats: a soft teaser, a focused countdown, and a
              full reveal.
            </p>
          </header>

          <div className="mt-16 grid gap-6 lg:grid-cols-3" aria-label="Three-stage recipient experience">
            <article className="group relative overflow-hidden rounded-[32px] border border-black/[0.06] bg-white/72 p-8 shadow-[0_20px_70px_-34px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1.5 hover:bg-white/82 hover:shadow-[0_28px_90px_-34px_rgba(0,0,0,0.18)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.28))]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" />

              <div className="relative z-10">
                <p className="text-[0.76rem] font-medium uppercase tracking-[0.3em] text-zinc-500">
                  Step 1
                </p>
                <h3 className="mt-7 text-[2.1rem] leading-[1.02] tracking-[-0.05em] text-zinc-950">
                  Teaser arrives
                </h3>
                <p className="mt-5 max-w-[28rem] text-[1.02rem] leading-[1.62] tracking-[-0.01em] text-zinc-600">
                  A private notification hints that something meaningful is coming.
                </p>

                <div className="mt-10 rounded-[24px] border border-black/[0.055] bg-white/70 px-5 py-4 shadow-[0_12px_34px_-24px_rgba(0,0,0,0.12)] backdrop-blur-md">
                  <p className="text-[0.76rem] font-medium uppercase tracking-[0.28em] text-zinc-500">
                    Notification • 6:59 PM
                  </p>
                  <p className="mt-3 text-[1rem] leading-[1.45] tracking-[-0.018em] text-zinc-800">
                    &quot;A moment for Sofia unlocks in 1 minute.&quot;
                  </p>
                </div>
              </div>
            </article>

            <article className="group relative overflow-hidden rounded-[32px] border border-black/[0.06] bg-white/72 p-8 shadow-[0_20px_70px_-34px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1.5 hover:bg-white/82 hover:shadow-[0_28px_90px_-34px_rgba(0,0,0,0.18)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.28))]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" />

              <div className="relative z-10">
                <p className="text-[0.76rem] font-medium uppercase tracking-[0.3em] text-zinc-500">
                  Step 2
                </p>
                <h3 className="mt-7 text-[2.1rem] leading-[1.02] tracking-[-0.05em] text-zinc-950">
                  Countdown holds
                </h3>
                <p className="mt-5 max-w-[28rem] text-[1.02rem] leading-[1.62] tracking-[-0.01em] text-zinc-600">
                  A focused countdown keeps attention on one emotional event.
                </p>

                <div className="mt-10 rounded-[24px] border border-black/[0.055] bg-white/70 px-5 py-4 shadow-[0_12px_34px_-24px_rgba(0,0,0,0.12)] backdrop-blur-md">
                  <p className="text-[0.76rem] font-medium uppercase tracking-[0.28em] text-zinc-500">
                    Live Countdown
                  </p>
                  <p className="mt-3 text-[1rem] leading-[1.45] tracking-[-0.018em] text-zinc-800">
                    00:00:37 until your moment opens.
                  </p>
                </div>
              </div>
            </article>

            <article className="group relative overflow-hidden rounded-[32px] border border-black/[0.06] bg-white/72 p-8 shadow-[0_20px_70px_-34px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1.5 hover:bg-white/82 hover:shadow-[0_28px_90px_-34px_rgba(0,0,0,0.18)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.28))]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" />

              <div className="relative z-10">
                <p className="text-[0.76rem] font-medium uppercase tracking-[0.3em] text-zinc-500">
                  Step 3
                </p>
                <h3 className="mt-7 text-[2.1rem] leading-[1.02] tracking-[-0.05em] text-zinc-950">
                  Message opens
                </h3>
                <p className="mt-5 max-w-[28rem] text-[1.02rem] leading-[1.62] tracking-[-0.01em] text-zinc-600">
                  Text, photos, voice, and music unlock together in one cinematic reveal.
                </p>

                <div className="mt-10 rounded-[24px] border border-black/[0.055] bg-white/70 px-5 py-4 shadow-[0_12px_34px_-24px_rgba(0,0,0,0.12)] backdrop-blur-md">
                  <p className="text-[0.76rem] font-medium uppercase tracking-[0.28em] text-zinc-500">
                    Reveal
                  </p>
                  <p className="mt-3 text-[1rem] leading-[1.45] tracking-[-0.018em] text-zinc-800">
                    &quot;Happy anniversary. Press play when you are ready.&quot;
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="features" className="qc-section">
        <div className="qc-container qc-center-block">
          <p className="qc-kicker">Emotional value</p>
          <h2 className="qc-title qc-impact-title">
            <span className="qc-impact-line qc-impact-line--top">Timing transforms a message,</span>
            <span className="qc-impact-line">into a memory.</span>
          </h2>
        </div>
      </section>

      <StartPointSection />

      <section id="waitlist" className="qc-section">
        <div className="qc-container">
          <div className="qc-card qc-card--hero qc-final-cta">
            <p className="qc-kicker">Early access</p>
            <h2 className="qc-title">Start creating moments that arrive right on time.</h2>
            <p className="qc-subtitle">Join the private launch list.</p>

            <form onSubmit={handleWaitlistSubmit} className="qc-waitlist-row" noValidate>
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <label htmlFor="waitlist-email" className="sr-only">
                Email address
              </label>
              <input
                id="waitlist-email"
                name="email"
                type="email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="qc-input"
              />
              <button
                type="submit"
                disabled={waitlistState === "submitting"}
                className="qc-button qc-button--primary"
              >
                {waitlistState === "submitting" ? "Submitting..." : "Get Early Access"}
              </button>
            </form>

            {waitlistState !== "idle" && (
              <p className={statusClassName} role="status" aria-live="polite">
                {waitlistMessage}
              </p>
            )}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
