"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatAbsoluteInTimezone, formatRelativeUntil } from "@/lib/momentScheduling";

type SpotlightMoment = {
  id: string;
  message_body: string | null;
  scheduled_for_utc: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  delivery_timezone?: string | null;
};

type SpotlightProps = {
  moments: SpotlightMoment[];
  hasMore?: boolean;
  viewAllHref?: string;
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

function formatDateTime(value: string, timezone: string | null | undefined) {
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

function formatCountdown(targetMs: number, nowMs: number) {
  const parts = getCountdownParts(targetMs, nowMs);
  if (parts.isComplete) return "Now releasing";
  return `In ${formatRelativeUntil(new Date(targetMs).toISOString(), nowMs)}`;
}

function cardPaddingForIndex(index: number) {
  if (index === 0) return "p-5 sm:p-6";
  if (index === 1) return "p-4 sm:p-5";
  return "p-3 sm:p-4";
}

export default function NextMomentSpotlight({
  moments,
  hasMore = false,
  viewAllHref = "/app/moments/scheduled",
}: SpotlightProps) {
  const scheduledMoments = useMemo(() => {
    return moments
      .map((moment) => {
        if (!moment.scheduled_for_utc) return null;
        const targetMs = Date.parse(moment.scheduled_for_utc);
        if (Number.isNaN(targetMs)) return null;
        return { ...moment, targetMs };
      })
      .filter((moment): moment is SpotlightMoment & { targetMs: number } => !!moment)
      .sort((a, b) => a.targetMs - b.targetMs);
  }, [moments]);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (scheduledMoments.length === 0) return;
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [scheduledMoments.length]);

  if (scheduledMoments.length === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] p-6 sm:p-7">
        <p className="text-xs uppercase tracking-[0.14em] text-white/50">
          Next Scheduled Moment
        </p>
        <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
          Your next moment is waiting to be scheduled.
        </h3>
        <p className="mt-2 max-w-2xl text-white/60">
          Add a recipient and delivery time to turn intention into a real release.
        </p>
        <div className="mt-5">
          <Link
            href="/app/create"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset] transition hover:from-sky-400 hover:to-cyan-300"
          >
            Schedule now
          </Link>
        </div>
      </section>
    );
  }

  const [nextMoment, ...restMoments] = scheduledMoments;
  const stackedMoments = restMoments.slice(0, 3);
  const nextPreview = nextMoment.message_body?.trim() || "No message preview available yet.";

  return (
    <section className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl border border-sky-300/20 bg-gradient-to-br from-sky-500/12 via-sky-500/6 to-transparent p-6 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-sky-400/20 blur-3xl"
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.14em] text-sky-200/85">Next Scheduled Moment</p>
          {hasMore && (
            <Link
              href={viewAllHref}
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              View All
            </Link>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">Recipient</p>
              <p className="mt-1 text-lg font-medium text-white">
                {maskRecipient(nextMoment.recipient_email, nextMoment.recipient_phone)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">Date</p>
              <p className="mt-1 text-lg font-medium text-white">
                {formatDateTime(nextMoment.scheduled_for_utc!, nextMoment.delivery_timezone)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">Countdown</p>
              <p className="mt-1 text-2xl font-semibold text-sky-100">
                {formatCountdown(nextMoment.targetMs, nowMs)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">Preview</p>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-white/75">
                {nextPreview}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Link
            href={`/app/moments/${nextMoment.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 px-5 py-3 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            Open moment
          </Link>
        </div>
      </div>

      {stackedMoments.map((moment, index) => {
        const preview = moment.message_body?.trim() || "No message preview available yet.";

        return (
          <article
            key={moment.id}
            className={`rounded-2xl border border-white/10 bg-white/[0.03] ${cardPaddingForIndex(index)} transition hover:border-white/20`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                  Coming up #{index + 2}
                </p>
                <p className="line-clamp-1 text-lg font-medium text-white">{preview}</p>
              </div>
              <Link
                href={`/app/moments/${moment.id}`}
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Open
              </Link>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-white/70 sm:grid-cols-3">
              <p>Recipient: {maskRecipient(moment.recipient_email, moment.recipient_phone)}</p>
              <p>Date: {formatDateTime(moment.scheduled_for_utc!, moment.delivery_timezone)}</p>
              <p className="text-sky-100">Countdown: {formatCountdown(moment.targetMs, nowMs)}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
