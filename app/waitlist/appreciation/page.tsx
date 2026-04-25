import Link from "next/link";

export default function WaitlistAppreciationPage() {
  return (
    <main className="landing-shell feedback-page min-h-screen text-[var(--text-main)]">
      <div className="landing-grain" aria-hidden="true" />

      <header className="top-nav">
        <div className="nav-inner">
          <Link href="/" className="logo">
            QC
          </Link>
          <span className="nav-mini-link nav-mini-current">Appreciation</span>
        </div>
      </header>

      <section className="landing-container feedback-hero">
        <p className="landing-kicker">Feedback received</p>
        <h1 className="about-title">Thank you for helping shape QC.</h1>
        <p className="about-lead">
          We saved your answers. Your input directly guides what we build first.
        </p>
      </section>

      <section className="landing-container feedback-card-wrap">
        <div className="feedback-invalid">
          <p className="section-subtitle">
            We appreciate the time you took to share your perspective.
          </p>
          <Link href="/" className="primary-cta">
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
