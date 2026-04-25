import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { toFriendlyTimezoneLabel } from "./timezone";

export const DEFAULT_TIMEZONE = "UTC";

export function detectCurrentTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function normalizeTimezone(timezone: string | null | undefined) {
  const value = timezone?.trim();
  return value || DEFAULT_TIMEZONE;
}

export function toUtcIsoFromLocalParts(input: {
  date: string;
  time: string;
  timezone: string | null | undefined;
}) {
  const { date, time } = input;
  const timezone = normalizeTimezone(input.timezone);
  if (!date || !time) return null;

  try {
    const normalizedTime = time.length === 5 ? `${time}:00` : time;
    const utcDate = fromZonedTime(`${date}T${normalizedTime}`, timezone);
    if (Number.isNaN(utcDate.getTime())) return null;
    return utcDate.toISOString();
  } catch {
    return null;
  }
}

export function getLocalPartsFromUtc(
  utcIso: string | null | undefined,
  timezone: string | null | undefined
) {
  if (!utcIso) return { date: "", time: "" };

  try {
    const normalizedTimezone = normalizeTimezone(timezone);
    return {
      date: formatInTimeZone(utcIso, normalizedTimezone, "yyyy-MM-dd"),
      time: formatInTimeZone(utcIso, normalizedTimezone, "HH:mm"),
    };
  } catch {
    return { date: "", time: "" };
  }
}

type AbsoluteFormatOptions = {
  includeWeekday?: boolean;
  includeYear?: boolean;
  includeTimezone?: boolean;
};

export function formatAbsoluteInTimezone(
  utcIso: string | null | undefined,
  timezone: string | null | undefined,
  options: AbsoluteFormatOptions = {}
) {
  if (!utcIso) return "Not scheduled";

  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return "Not scheduled";

  const normalizedTimezone = normalizeTimezone(timezone);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizedTimezone,
    ...(options.includeWeekday ? { weekday: "long" as const } : {}),
    month: "short",
    day: "numeric",
    ...(options.includeYear === false ? {} : { year: "numeric" as const }),
    hour: "numeric",
    minute: "2-digit",
  });

  const formatted = formatter.format(date);
  if (options.includeTimezone === false) return formatted;
  return `${formatted} ${toFriendlyTimezoneLabel(normalizedTimezone)}`;
}

export function formatArrivalLine(
  utcIso: string | null | undefined,
  timezone: string | null | undefined
) {
  if (!utcIso) return "Arrives when you choose a delivery time";

  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return "Arrives when you choose a delivery time";

  const normalizedTimezone = normalizeTimezone(timezone);
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizedTimezone,
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return `Arrives ${label} ${toFriendlyTimezoneLabel(normalizedTimezone)}`;
}

export function formatRelativeUntil(utcIso: string | null | undefined, nowMs = Date.now()) {
  if (!utcIso) return "Not scheduled";

  const targetMs = Date.parse(utcIso);
  if (Number.isNaN(targetMs)) return "Not scheduled";

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return "releasing";

  const totalMinutes = Math.max(1, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours.toString().padStart(2, "0")}h`;
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  return `${minutes}m`;
}

export function formatTimingPill(
  utcIso: string | null | undefined,
  timezone: string | null | undefined,
  nowMs = Date.now()
) {
  if (!utcIso) return "Choose delivery time";

  const targetMs = Date.parse(utcIso);
  if (Number.isNaN(targetMs)) return "Choose delivery time";

  const diffMs = targetMs - nowMs;
  if (diffMs > 0) {
    return `Delivers in ${formatRelativeUntil(utcIso, nowMs)}`;
  }

  const normalizedTimezone = normalizeTimezone(timezone);
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizedTimezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(utcIso));

  return `Opens at ${label} ${toFriendlyTimezoneLabel(normalizedTimezone)}`;
}
