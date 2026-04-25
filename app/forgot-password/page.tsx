"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    setError(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`
        : process.env.NEXT_PUBLIC_APP_URL;

    const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo }
    );

    setBusy(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  return (
    <main className="auth-page">
      <header className="qc-nav">
        <div className="qc-nav-inner qc-nav-inner--landing">
          <Link href="/" className="qc-logo qc-logo--landing">
            QC
          </Link>
          <nav className="qc-nav-links qc-nav-links--landing" aria-label="Auth navigation">
            <Link href="/login" className="qc-nav-link">
              Back to sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="auth-shell">
        <article className="auth-card">
          <div className="auth-header">
            <div className="auth-eyebrow">Password reset</div>
            <h1 className="auth-title">Recover access.</h1>
            <p className="auth-subtitle">
              Enter your account email and we&apos;ll send a secure reset link.
            </p>
          </div>

          <div className="auth-panel">
            {sent ? (
              <div>
                <p className="auth-status auth-status--success" style={{ marginBottom: 12 }}>
                  Email sent. Check your inbox for the reset link.
                </p>
                <Link
                  href="/login"
                  className="auth-submit"
                  style={{ display: "inline-grid", placeItems: "center" }}
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="forgot-email" className="auth-label">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="auth-input"
                    required
                  />
                </div>

                {error && <p className="auth-status auth-status--danger">{error}</p>}

                <button type="submit" disabled={busy} className="auth-submit">
                  {busy ? "Sending..." : "Send reset link"}
                </button>
              </form>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
