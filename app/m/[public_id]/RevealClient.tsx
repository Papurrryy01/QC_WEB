"use client";

import { useEffect, useMemo, useState } from "react";

type RevealMode = "hidden" | "countdown" | "reveal";

function getCountdownParts(targetMs: number, nowMs: number) {
  const diffMs = Math.max(0, targetMs - nowMs);
  let remainingSeconds = Math.floor(diffMs / 1000);

  const monthSeconds = 30 * 24 * 60 * 60;
  const daySeconds = 24 * 60 * 60;
  const hourSeconds = 60 * 60;
  const minuteSeconds = 60;

  const months = Math.floor(remainingSeconds / monthSeconds);
  remainingSeconds -= months * monthSeconds;

  const days = Math.floor(remainingSeconds / daySeconds);
  remainingSeconds -= days * daySeconds;

  const hours = Math.floor(remainingSeconds / hourSeconds);
  remainingSeconds -= hours * hourSeconds;

  const minutes = Math.floor(remainingSeconds / minuteSeconds);
  remainingSeconds -= minutes * minuteSeconds;

  const seconds = remainingSeconds;

  return {
    months,
    days,
    hours,
    minutes,
    seconds,
    isComplete: diffMs <= 0,
  };
}

export default function RevealClient({
  message,
  theme,
  mode,
  releaseAtIso,
}: {
  message: string | null;
  theme: string;
  mode: RevealMode;
  releaseAtIso: string | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const targetMs = useMemo(() => {
    if (!releaseAtIso) return null;
    const parsed = Date.parse(releaseAtIso);
    return Number.isNaN(parsed) ? null : parsed;
  }, [releaseAtIso]);

  useEffect(() => {
    if (mode !== "countdown" || !targetMs) return;

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [mode, targetMs]);

  const countdown = targetMs ? getCountdownParts(targetMs, nowMs) : null;

  const palette =
    theme === "romantic"
      ? {
          bg: "radial-gradient(900px 500px at 50% -20%, rgba(229,179,194,0.34), transparent 72%), #f6eff1",
          text: "#241b20",
          sub: "#5f4a54",
          card: "rgba(255,255,255,0.82)",
          border: "rgba(45,25,35,0.12)",
        }
      : {
          bg: "radial-gradient(900px 500px at 50% -20%, rgba(94,126,186,0.22), transparent 72%), #0d1118",
          text: "#f1f5ff",
          sub: "#a9b3c9",
          card: "rgba(20,25,35,0.78)",
          border: "rgba(235,242,255,0.15)",
        };

  if (mode === "hidden") {
    return (
      <main className="qc-reveal-panel" style={{ background: palette.bg, color: palette.text }}>
        <section className="qc-reveal-core" style={{ background: palette.card, borderColor: palette.border }}>
          <p className="qc-kicker">Scheduled moment</p>
          <h1 className="qc-heading-xl">This moment is not unlockable yet.</h1>
          <p className="qc-copy" style={{ color: palette.sub }}>
            The countdown will appear closer to release time.
          </p>
        </section>
      </main>
    );
  }

  if (mode === "countdown") {
    return (
      <main className="qc-reveal-panel" style={{ background: palette.bg, color: palette.text }}>
        <section className="qc-reveal-core" style={{ background: palette.card, borderColor: palette.border }}>
          <p className="qc-kicker">Scheduled moment</p>
          <h1 className="qc-heading-xl">Unlocking soon</h1>

          {countdown?.isComplete ? (
            <p className="qc-copy" style={{ color: palette.sub }}>
              Refresh now. The moment should be ready.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-5 gap-2">
              {[
                { label: "Months", value: countdown?.months ?? 0 },
                { label: "Days", value: countdown?.days ?? 0 },
                { label: "Hours", value: countdown?.hours ?? 0 },
                { label: "Minutes", value: countdown?.minutes ?? 0 },
                { label: "Seconds", value: countdown?.seconds ?? 0 },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="rounded-[12px] border p-2"
                  style={{ borderColor: palette.border, background: "rgba(255,255,255,0.04)" }}
                >
                  <p className="text-2xl font-semibold">{unit.value}</p>
                  <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: palette.sub }}>
                    {unit.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="qc-reveal-panel" style={{ background: palette.bg, color: palette.text }}>
      {!revealed && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="absolute inset-0 z-10 grid place-items-center text-center"
          style={{ background: "rgba(5,8,14,0.66)", backdropFilter: "blur(10px)" }}
        >
          <div>
            <p className="qc-kicker" style={{ color: "rgba(255,255,255,0.72)" }}>
              A QC moment
            </p>
            <h1 className="qc-heading-xl" style={{ color: "#fff" }}>
              Tap to reveal
            </h1>
          </div>
        </button>
      )}

      <section
        className="qc-reveal-core transition-all duration-700"
        style={{
          background: palette.card,
          borderColor: palette.border,
          transform: revealed ? "scale(1)" : "scale(0.98)",
          opacity: revealed ? 1 : 0,
        }}
      >
        <p className="qc-kicker">Delivered</p>
        <p className="text-[clamp(1.3rem,3.6vw,2rem)] font-medium leading-[1.32] tracking-[-0.02em]">
          {message ?? "No message found."}
        </p>
      </section>
    </main>
  );
}
