import Link from "next/link";
import { notFound } from "next/navigation";

type TopicCopy = {
  kicker: string;
  title: string;
  intro: string;
  bullets: string[];
};

const TOPIC_COPY: Record<string, TopicCopy> = {
  "what-is-qc": {
    kicker: "What is QC",
    title: "Scheduled emotional delivery",
    intro:
      "QC lets you prepare meaningful messages now and release them exactly when they should be felt.",
    bullets: [
      "Create a moment with text, media, or both.",
      "Set the exact date and hour for delivery.",
      "QC handles release timing precisely so the moment lands right.",
    ],
  },
  "timing-impact": {
    kicker: "Why it matters",
    title: "Timing changes impact",
    intro:
      "The same message can feel routine or unforgettable depending on when it arrives. QC is built around that difference.",
    bullets: [
      "Birthdays and anniversaries hit harder when timed perfectly.",
      "Check-ins arrive when they are needed, not when remembered later.",
      "You keep intention high while removing timing stress.",
    ],
  },
  "pre-launch-access": {
    kicker: "What is next",
    title: "Pre-launch access",
    intro:
      "Early members shape the product while QC is still being built, and they are first in when launch opens.",
    bullets: [
      "Priority onboarding once access starts rolling out.",
      "Early updates on core features and release timing.",
      "Direct influence on what ships first.",
    ],
  },
};

export default async function AboutTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const copy = TOPIC_COPY[topic];

  if (!copy) {
    notFound();
  }

  return (
    <main className="qc-shell">
      <header className="qc-nav">
        <div className="qc-nav-inner qc-nav-inner--landing">
          <Link href="/" className="qc-logo qc-logo--landing">
            QC
          </Link>
          <nav className="qc-nav-links qc-nav-links--landing">
            <Link href="/company/about" className="qc-nav-link">
              About
            </Link>
          </nav>
        </div>
      </header>

      <section className="qc-container qc-section" style={{ maxWidth: "860px" }}>
        <p className="qc-kicker">{copy.kicker}</p>
        <h1 className="qc-title">{copy.title}</h1>
        <p className="qc-subtitle">{copy.intro}</p>
      </section>

      <section className="qc-container qc-section qc-section--tight" style={{ maxWidth: "860px" }}>
        <article className="qc-card qc-card--hero">
          <ul className="qc-feature-list">
            {copy.bullets.map((item) => (
              <li key={item} className="qc-feature-item">
                <p className="qc-feature-name">{item}</p>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2" style={{ marginTop: "1rem" }}>
            <Link href="/company/about" className="qc-button qc-button--primary">
              Back to about
            </Link>
            <Link href="/#explore" className="qc-button qc-button--secondary">
              Explore QC
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
