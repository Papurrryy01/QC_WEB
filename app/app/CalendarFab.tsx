"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatAbsoluteInTimezone, getLocalPartsFromUtc } from "@/lib/momentScheduling";
import {
  IconArrowDownUp,
  IconArrowLeftRight,
  IconCalendarDays,
  IconChevronLeft,
  IconCircleHelp,
} from "@/app/components/icons/CoolIcons";

type DayDensity = "light" | "busy" | "packed";

type CalendarMoment = {
  id: string;
  message_body: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  scheduled_for_utc: string | null;
  status: string | null;
  delivery_timezone: string | null;
};

type CalendarSummaryResponse = {
  moments?: CalendarMoment[];
  error?: string;
};

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function shiftMonth(value: Date, delta: number) {
  return new Date(value.getFullYear(), value.getMonth() + delta, 1);
}

function toDayKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseIsoDate(iso: string | null) {
  if (!iso) return null;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return null;
  return value;
}

function getDensity(count: number): DayDensity | null {
  if (count <= 0) return null;
  if (count <= 2) return "light";
  if (count <= 5) return "busy";
  return "packed";
}

function formatMonthLabel(value: Date) {
  return value.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatRailDate(dayKey: string) {
  const value = new Date(`${dayKey}T12:00:00`);
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFullDate(dayKey: string) {
  const value = new Date(`${dayKey}T12:00:00`);
  return value.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMomentTime(iso: string | null, timezone: string | null) {
  return formatAbsoluteInTimezone(iso, timezone, {
    includeWeekday: false,
    includeYear: false,
    includeTimezone: true,
  });
}

function previewMessage(message: string | null) {
  const trimmed = message?.trim();
  if (!trimmed) return "Untitled moment";
  return trimmed;
}

function maskRecipient(email: string | null, phone: string | null) {
  const value = email?.trim() || phone?.trim() || "";
  if (!value) return "Unknown recipient";

  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    if (!domain) return value;
    const visible =
      name.length <= 2 ? name : `${name.slice(0, 2)}${"•".repeat(Math.min(6, Math.max(name.length - 2, 1)))}`;
    return `${visible}@${domain}`;
  }

  const digits = value.replace(/\D+/g, "");
  if (digits.length < 4) return value;
  return `Recipient ••••${digits.slice(-4)}`;
}

function buildMonthCalendar(
  monthValue: Date,
  groupedByDay: Map<string, CalendarMoment[]>
) {
  const monthStart = startOfMonth(monthValue);
  const monthPrefix = toMonthKey(monthValue);
  const startOffset = monthStart.getDay();
  const dayCount = new Date(monthValue.getFullYear(), monthValue.getMonth() + 1, 0).getDate();
  const cells: Array<{
    kind: "blank" | "day";
    key: string;
    day?: number;
    dayKey?: string;
    count?: number;
    density?: DayDensity | null;
  }> = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ kind: "blank", key: `${monthPrefix}-blank-${i}` });
  }
  for (let day = 1; day <= dayCount; day += 1) {
    const dayKey = `${monthPrefix}-${String(day).padStart(2, "0")}`;
    const count = groupedByDay.get(dayKey)?.length ?? 0;
    cells.push({
      kind: "day",
      key: dayKey,
      day,
      dayKey,
      count,
      density: getDensity(count),
    });
  }
  return cells;
}

export default function CalendarFab() {
  const panelRef = useRef<HTMLElement | null>(null);
  const helpModalRef = useRef<HTMLElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const monthScrollRef = useRef<HTMLDivElement | null>(null);
  const monthSectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const monthScrollRafRef = useRef(0);
  const didAutoAlignRef = useRef(false);
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [moments, setMoments] = useState<CalendarMoment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const loadCalendarData = useCallback(async (force = false) => {
    if (loadingRef.current && !force) return;
    if (loadedRef.current && !force) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/calendar/summary", { method: "GET", cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as CalendarSummaryResponse | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not load calendar moments.");
      }

      const nextMoments = (payload?.moments ?? []).filter(
        (moment): moment is CalendarMoment =>
          Boolean(moment.id) && Boolean(parseIsoDate(moment.scheduled_for_utc))
      );
      setMoments(nextMoments);
      loadedRef.current = true;
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Could not load calendar moments."
      );
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void loadCalendarData();
  }, [isOpen, loadCalendarData]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const node = event.target as Node | null;
      if (!node) return;
      const insidePanel = panelRef.current?.contains(node) ?? false;
      const insideHelp = helpModalRef.current?.contains(node) ?? false;
      const insideFab = fabRef.current?.contains(node) ?? false;
      if (!insidePanel && !insideHelp && !insideFab) {
        setIsHelpOpen(false);
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isHelpOpen) {
        setIsHelpOpen(false);
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, isHelpOpen]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, CalendarMoment[]>();
    moments.forEach((moment) => {
      const dayKey = getLocalPartsFromUtc(moment.scheduled_for_utc, moment.delivery_timezone).date;
      if (!dayKey) return;
      const existing = map.get(dayKey);
      if (existing) {
        existing.push(moment);
      } else {
        map.set(dayKey, [moment]);
      }
    });
    map.forEach((items) =>
      items.sort((a, b) => Date.parse(a.scheduled_for_utc ?? "") - Date.parse(b.scheduled_for_utc ?? ""))
    );
    return map;
  }, [moments]);

  const monthPrefix = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`;
  const sortedDayKeys = useMemo(() => Array.from(groupedByDay.keys()).sort(), [groupedByDay]);
  const railDayKeys = useMemo(
    () => sortedDayKeys.filter((dayKey) => dayKey.startsWith(monthPrefix)).slice(0, 8),
    [monthPrefix, sortedDayKeys]
  );

  const monthSeries = useMemo(() => {
    const anchor = startOfMonth(new Date());
    const months: Date[] = [];
    for (let offset = -18; offset <= 42; offset += 1) {
      months.push(shiftMonth(anchor, offset));
    }
    return months;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedDayKey) return;
    const todayKey = toDayKey(new Date());
    if (todayKey.startsWith(monthPrefix)) {
      setSelectedDayKey(todayKey);
      return;
    }
    setSelectedDayKey(railDayKeys[0] ?? `${monthPrefix}-01`);
  }, [isOpen, monthPrefix, railDayKeys, selectedDayKey]);

  const selectedDayMoments = useMemo(() => {
    if (!selectedDayKey) return [];
    return groupedByDay.get(selectedDayKey) ?? [];
  }, [groupedByDay, selectedDayKey]);

  const scrollToMonth = useCallback((targetMonth: Date, behavior: ScrollBehavior = "smooth") => {
    const container = monthScrollRef.current;
    if (!container) return;
    const monthKey = toMonthKey(targetMonth);
    const target = monthSectionRefs.current.get(monthKey);
    if (!target) return;
    container.scrollTo({ top: target.offsetTop, behavior });
  }, []);

  const syncVisibleMonthFromScroll = useCallback(() => {
    const container = monthScrollRef.current;
    if (!container) return;
    const top = container.scrollTop;
    const sections = monthSeries
      .map((monthValue) => {
        const section = monthSectionRefs.current.get(toMonthKey(monthValue));
        if (!section) return null;
        return { monthValue, top: section.offsetTop };
      })
      .filter((entry): entry is { monthValue: Date; top: number } => Boolean(entry));

    if (!sections.length) return;

    // Use a probe point slightly below the top edge so the header follows
    // the month users actually see as the leading section.
    const probeTop = top + Math.max(56, Math.min(160, container.clientHeight * 0.22));
    let nextMonth = sections[0].monthValue;
    for (let i = 0; i < sections.length; i += 1) {
      if (sections[i].top <= probeTop) {
        nextMonth = sections[i].monthValue;
      } else {
        break;
      }
    }

    if (toMonthKey(nextMonth) !== toMonthKey(visibleMonth)) {
      setVisibleMonth(startOfMonth(nextMonth));
    }
  }, [monthSeries, visibleMonth]);

  const handleMonthScroll = useCallback(() => {
    if (monthScrollRafRef.current) window.cancelAnimationFrame(monthScrollRafRef.current);
    monthScrollRafRef.current = window.requestAnimationFrame(() => {
      monthScrollRafRef.current = 0;
      syncVisibleMonthFromScroll();
    });
  }, [syncVisibleMonthFromScroll]);

  useEffect(() => {
    return () => {
      if (monthScrollRafRef.current) window.cancelAnimationFrame(monthScrollRafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      didAutoAlignRef.current = false;
      return;
    }
    if (didAutoAlignRef.current) return;
    didAutoAlignRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      scrollToMonth(visibleMonth, "auto");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, scrollToMonth, visibleMonth]);

  const hasScheduledData = moments.length > 0;

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onClick={() => {
          setIsOpen((open) => !open);
          if (isHelpOpen) setIsHelpOpen(false);
        }}
        className={`qc-calendar-fab ${isOpen ? "is-open" : ""}`}
        aria-label={isOpen ? "Close calendar" : "Open calendar"}
        aria-expanded={isOpen}
        aria-controls="qc-calendar-panel"
      >
        <IconCalendarDays />
      </button>

      {isOpen && (
        <section
          id="qc-calendar-panel"
          ref={panelRef}
          className={`qc-calendar-panel ${isOpen ? "is-open" : ""}`}
          role="dialog"
          aria-label="Calendar"
        >
          <header className="qc-calendar-panel-head">
            <div>
              <p className="qc-calendar-kicker">Calendar</p>
              <h2 className="qc-calendar-title">Your scheduled moments, beautifully organized.</h2>
            </div>
            <button
              type="button"
              className={`qc-calendar-help-button ${isHelpOpen ? "is-active" : ""}`}
              onClick={() => setIsHelpOpen((open) => !open)}
              aria-label="Open calendar help"
              aria-expanded={isHelpOpen}
              aria-controls="qc-calendar-help-modal"
            >
              <IconCircleHelp />
            </button>
          </header>

          {error ? (
            <div className="qc-calendar-empty-state">
              <p className="qc-status qc-status--danger">{error}</p>
              <button type="button" className="qc-button qc-button--secondary" onClick={() => loadCalendarData(true)}>
                Retry
              </button>
            </div>
          ) : loading && !hasScheduledData ? (
            <div className="qc-calendar-empty-state">
              <p className="qc-copy">Loading calendar...</p>
            </div>
          ) : (
            <>
              {railDayKeys.length > 0 && (
                <div className="qc-calendar-rail" role="list" aria-label="Upcoming active dates">
                  {railDayKeys.map((dayKey) => {
                    const count = groupedByDay.get(dayKey)?.length ?? 0;
                    const density = getDensity(count);
                    if (!density || count <= 0) return null;
                    return (
                      <button
                        key={dayKey}
                        type="button"
                        className="qc-calendar-rail-card"
                        onClick={() => {
                          const targetMonth = startOfMonth(new Date(`${dayKey}T12:00:00`));
                          setVisibleMonth(targetMonth);
                          scrollToMonth(targetMonth, "smooth");
                          setSelectedDayKey(dayKey);
                        }}
                        role="listitem"
                      >
                        <div>
                          <p className="qc-calendar-rail-date">{formatRailDate(dayKey)}</p>
                          <p className="qc-calendar-rail-meta">
                            {count} moment{count === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span
                          className={`qc-calendar-density-pill qc-calendar-density-pill--${density}`}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              <article className="qc-calendar-month-card">
                <div className="qc-calendar-weekdays">
                  {WEEK_DAYS.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div
                  ref={monthScrollRef}
                  className="qc-calendar-month-scroll"
                  onScroll={handleMonthScroll}
                  aria-label="Calendar months. Scroll vertically to change months."
                >
                  {monthSeries.map((monthValue) => {
                    const monthKey = toMonthKey(monthValue);
                    const monthCells = buildMonthCalendar(monthValue, groupedByDay);
                    return (
                      <section
                        key={monthKey}
                        className="qc-calendar-month-section"
                        ref={(node) => {
                          if (node) {
                            monthSectionRefs.current.set(monthKey, node);
                          } else {
                            monthSectionRefs.current.delete(monthKey);
                          }
                        }}
                      >
                        <h4 className="qc-calendar-month-section-title">{formatMonthLabel(monthValue)}</h4>
                        <div className="qc-calendar-grid">
                          {monthCells.map((cell) => {
                            if (cell.kind === "blank") {
                              return <span key={cell.key} className="qc-calendar-cell qc-calendar-cell--blank" />;
                            }
                            const selected = cell.dayKey === selectedDayKey;
                            return (
                              <button
                                key={cell.key}
                                type="button"
                                className={`qc-calendar-cell ${selected ? "is-selected" : ""}`}
                                onClick={() => setSelectedDayKey(cell.dayKey ?? null)}
                                aria-label={`Open ${formatMonthLabel(monthValue)} ${cell.day}`}
                              >
                                <span className="qc-calendar-day-number">{cell.day}</span>
                                {cell.density ? (
                                  <span
                                    className={`qc-calendar-dot qc-calendar-dot--${cell.density}`}
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <span className="qc-calendar-dot qc-calendar-dot--empty" aria-hidden="true" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </article>

              <article className="qc-calendar-day-detail-card">
                <div className="qc-calendar-day-detail-head">
                        <p>{selectedDayKey ? formatFullDate(selectedDayKey) : "Select a day"}</p>
                        <span className="qc-calendar-day-count">
                          {selectedDayMoments.length} moment{selectedDayMoments.length === 1 ? "" : "s"}
                  </span>
                </div>

                {selectedDayMoments.length > 0 ? (
                  <ul className="qc-calendar-day-detail-list">
                    {selectedDayMoments.slice(0, 5).map((moment) => (
                      <li key={moment.id} className="qc-calendar-day-detail-item">
                        <p>{previewMessage(moment.message_body)}</p>
                        <span>
                          {formatMomentTime(moment.scheduled_for_utc, moment.delivery_timezone)} •{" "}
                          {maskRecipient(moment.recipient_email, moment.recipient_phone)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="qc-calendar-empty-day">No scheduled moments for this date.</p>
                )}
              </article>
            </>
          )}
        </section>
      )}

      {isOpen && isHelpOpen && (
        <aside
          id="qc-calendar-help-modal"
          ref={helpModalRef}
          className="qc-calendar-help-modal"
          role="dialog"
          aria-label="Calendar help"
        >
          <section className="qc-calendar-help-card">
            <div className="qc-calendar-help-head">
              <button
                type="button"
                className="qc-calendar-help-back"
                onClick={() => setIsHelpOpen(false)}
                aria-label="Back to calendar"
              >
                <IconChevronLeft />
              </button>
              <h4 className="qc-calendar-help-heading">Calendar Help</h4>
              <span className="qc-calendar-help-head-spacer" aria-hidden="true" />
            </div>
            <p>
              This calendar helps you view scheduled moments by day, check how busy specific dates are,
              and open each day to inspect planned deliveries in detail.
            </p>
          </section>

          <section className="qc-calendar-help-card">
            <h4>Color meaning</h4>
            <ul className="qc-calendar-help-color-list">
              <li>
                <span className="qc-calendar-dot qc-calendar-dot--light" aria-hidden="true" /> Light day: 1-2
                moments
              </li>
              <li>
                <span className="qc-calendar-dot qc-calendar-dot--busy" aria-hidden="true" /> Busy day: 3-5
                moments
              </li>
              <li>
                <span className="qc-calendar-dot qc-calendar-dot--packed" aria-hidden="true" /> Packed day: 6+
                moments
              </li>
            </ul>
          </section>

          <section className="qc-calendar-help-card">
            <h4>Dots and indicators</h4>
            <p>A small indicator under each date appears only when that date has scheduled moments.</p>
          </section>

          <section className="qc-calendar-help-card">
            <h4>How to use it</h4>
            <div className="qc-calendar-help-list">
              <article className="qc-calendar-help-row">
                <span className="qc-calendar-help-icon" aria-hidden="true">
                  <IconCircleHelp />
                </span>
                <div>
                  <p className="qc-calendar-help-row-title">Tap a date</p>
                  <p className="qc-calendar-help-row-copy">
                    Open that day and view all scheduled moments.
                  </p>
                </div>
              </article>
              <article className="qc-calendar-help-row">
                <span className="qc-calendar-help-icon" aria-hidden="true">
                  <IconArrowLeftRight />
                </span>
                <div>
                  <p className="qc-calendar-help-row-title">Swipe the top rail</p>
                  <p className="qc-calendar-help-row-copy">
                    Jump faster between upcoming active dates.
                  </p>
                </div>
              </article>
              <article className="qc-calendar-help-row">
                <span className="qc-calendar-help-icon" aria-hidden="true">
                  <IconArrowDownUp />
                </span>
                <div>
                  <p className="qc-calendar-help-row-title">Scroll through months</p>
                  <p className="qc-calendar-help-row-copy">
                    Move vertically to explore past and future dates.
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section className="qc-calendar-help-card">
            <h4>Upcoming dates rail</h4>
            {railDayKeys.length > 0 ? (
              <div className="qc-calendar-help-rail-preview" role="list" aria-label="Upcoming dates preview">
                {railDayKeys.slice(0, 3).map((dayKey) => {
                  const count = groupedByDay.get(dayKey)?.length ?? 0;
                  const density = getDensity(count);
                  if (!density || count <= 0) return null;
                  return (
                    <div key={`help-${dayKey}`} className="qc-calendar-help-rail-card" role="listitem">
                      <div>
                        <p className="qc-calendar-rail-date">{formatRailDate(dayKey)}</p>
                        <p className="qc-calendar-rail-meta">
                          {count} moment{count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span
                        className={`qc-calendar-density-pill qc-calendar-density-pill--${density}`}
                        aria-hidden="true"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="qc-calendar-help-row-copy">
                No active dates yet. When you schedule moments, this rail appears automatically.
              </p>
            )}
            <p>
              Top cards highlight dates that already have scheduled moments in the selected month. If no
              dates are scheduled, the rail stays hidden.
            </p>
          </section>

          <section className="qc-calendar-help-card">
            <h4>Day details</h4>
            <div className="qc-calendar-help-list">
              <article className="qc-calendar-help-row">
                <span className="qc-calendar-help-icon" aria-hidden="true">
                  <IconCalendarDays />
                </span>
                <div>
                  <p className="qc-calendar-help-row-title">Open a day</p>
                  <p className="qc-calendar-help-row-copy">
                    Tap any date to reveal its moment list.
                  </p>
                </div>
              </article>
              <article className="qc-calendar-help-row">
                <span className="qc-calendar-help-icon" aria-hidden="true">
                  <span className="qc-calendar-help-dot-fill" />
                </span>
                <div>
                  <p className="qc-calendar-help-row-title">Consistent color</p>
                  <p className="qc-calendar-help-row-copy">
                    Moment cards follow the same day density color for easier reading.
                  </p>
                </div>
              </article>
            </div>
          </section>
        </aside>
      )}
    </>
  );
}
