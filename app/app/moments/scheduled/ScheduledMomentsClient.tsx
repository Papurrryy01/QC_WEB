"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatAbsoluteInTimezone, formatRelativeUntil } from "@/lib/momentScheduling";

export type ScheduledMoment = {
  id: string;
  message_body: string | null;
  scheduled_for_utc: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  delivery_timezone?: string | null;
  status: string;
  created_at: string;
};

function maskRecipient(email: string | null, phone: string | null) {
  const value = email?.trim() || phone?.trim() || "";
  if (!value) return "No recipient yet";

  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    if (!domain) return value;
    const visible =
      name.length <= 2 ? name : `${name.slice(0, 2)}${"•".repeat(Math.min(6, Math.max(name.length - 2, 1)))}`;
    return `${visible}@${domain}`;
  }

  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length < 4) return value;
  return `${"•".repeat(Math.min(8, digitsOnly.length - 4))}${digitsOnly.slice(-4)}`;
}

function formatDateTime(value: string | null, timezone: string | null | undefined) {
  return formatAbsoluteInTimezone(value, timezone);
}

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

  return {
    months,
    days,
    hours,
    minutes,
    seconds: remainingSeconds,
    isComplete: diffMs <= 0,
  };
}

export default function ScheduledMomentsClient({
  moments,
}: {
  moments: ScheduledMoment[];
}) {
  const orderedMoments = useMemo(() => {
    return moments
      .map((moment) => {
        if (!moment.scheduled_for_utc) return null;
        const targetMs = Date.parse(moment.scheduled_for_utc);
        if (Number.isNaN(targetMs)) return null;
        return { ...moment, targetMs };
      })
      .filter((moment): moment is ScheduledMoment & { targetMs: number } => !!moment)
      .sort((a, b) => a.targetMs - b.targetMs);
  }, [moments]);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (orderedMoments.length === 0) return;
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [orderedMoments.length]);

  if (orderedMoments.length === 0) {
    return (
      <section className="qc-card">
        <p className="qc-copy">No upcoming scheduled moments yet.</p>
        <div style={{ marginTop: "0.8rem" }}>
          <Link href="/app/create" className="qc-button qc-button--primary">
            Create a moment
          </Link>
        </div>
      </section>
    );
  }

  return (
    <ul className="qc-grid">
      {orderedMoments.map((moment, index) => {
        const countdown = getCountdownParts(moment.targetMs, nowMs);
        const preview = moment.message_body?.trim() || "No message preview available yet.";

        return (
          <li key={moment.id} className="qc-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="qc-kicker">#{index + 1} in timeline</p>
                <h2 className="qc-heading-sm" style={{ marginTop: "0.35rem" }}>
                  {preview}
                </h2>
              </div>
              <Link href={`/app/moments/${moment.id}`} className="qc-button qc-button--secondary">
                Open moment
              </Link>
            </div>

            <div className="qc-grid qc-grid--3" style={{ marginTop: "0.9rem" }}>
              <p className="qc-copy">
                Recipient: {maskRecipient(moment.recipient_email, moment.recipient_phone)}
              </p>
              <p className="qc-copy">
                Delivery: {formatDateTime(moment.scheduled_for_utc, moment.delivery_timezone)}
              </p>
              <p className="qc-copy">Status: {moment.status}</p>
            </div>

            <div style={{ marginTop: "0.95rem" }}>
              <p className="qc-kicker">Countdown</p>
              {countdown.isComplete ? (
                <p className="qc-status qc-status--success" style={{ marginTop: "0.45rem" }}>
                  Delivery time reached.
                </p>
              ) : (
                <div className="qc-grid qc-grid--4" style={{ marginTop: "0.5rem" }}>
                  {[
                    { label: "Months", value: countdown.months },
                    { label: "Days", value: countdown.days },
                    { label: "Hours", value: countdown.hours },
                    { label: "Minutes", value: countdown.minutes },
                    { label: "Seconds", value: countdown.seconds },
                  ].map((unit) => (
                    <article key={unit.label} className="qc-card qc-card--inset" style={{ textAlign: "center" }}>
                      <p className="qc-metric" style={{ fontSize: "1.4rem" }}>{unit.value}</p>
                      <p className="qc-kicker">{unit.label}</p>
                    </article>
                  ))}
                </div>
              )}
              <p className="qc-copy" style={{ marginTop: "0.75rem" }}>
                Delivers in {formatRelativeUntil(moment.scheduled_for_utc, nowMs)}
              </p>
            </div>

            <p className="qc-copy" style={{ marginTop: "0.9rem" }}>
              Created {new Date(moment.created_at).toLocaleString()}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
