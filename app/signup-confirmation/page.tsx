"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SignupConfirmationContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim() || "your inbox";

  return (
    <main className="auth-page">
      <header className="qc-nav">
        <div className="qc-nav-inner qc-nav-inner--landing">
          <Link href="/" className="qc-logo qc-logo--landing">
            QC
          </Link>
          <nav className="qc-nav-links qc-nav-links--landing" aria-label="Auth navigation">
            <Link href="/" className="qc-nav-link">
              Back home
            </Link>
          </nav>
        </div>
      </header>

      <section className="auth-shell">
        <article className="auth-card">
          <div className="auth-header">
            <div className="auth-eyebrow">Account created</div>
            <h1 className="auth-title">Check your email.</h1>
            <p className="auth-subtitle">
              We sent a verification link to <strong>{email}</strong>. Confirm your account before
              continuing to QC.
            </p>
          </div>

          <div className="auth-panel">
            <p className="auth-status auth-status--success" style={{ marginBottom: 16 }}>
              Account created successfully.
            </p>
            <Link href="/login" className="auth-submit" style={{ display: "inline-grid", placeItems: "center" }}>
              Go to sign in
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

export default function SignupConfirmationPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f6f7fb]" />}>
      <SignupConfirmationContent />
    </Suspense>
  );
}
