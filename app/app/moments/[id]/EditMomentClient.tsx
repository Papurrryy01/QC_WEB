"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FeatureToggleButton from "@/app/app/components/FeatureToggleButton";
import {
  detectCurrentTimezone,
  formatAbsoluteInTimezone,
  formatArrivalLine as formatArrivalLineWithTimezone,
  formatTimingPill as formatTimingPillWithTimezone,
  getLocalPartsFromUtc,
  toUtcIsoFromLocalParts,
} from "@/lib/momentScheduling";
import { getTimezoneOptions, toFriendlyTimezoneLabel } from "@/lib/timezone";

type Moment = {
  id: string;
  message_body: string | null;
  scheduled_for_utc: string | null;
  delivery_timezone: string | null;
  status: "draft" | "published" | "sent";
  created_at: string;
  public_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  is_featured: boolean;
  category: string | null;
  media_url: string | null;
};

type ActionState =
  | "save"
  | "send"
  | "delete"
  | "duplicate"
  | "reschedule"
  | "share"
  | "cancel"
  | "copy"
  | null;

function formatDate(value: string | null, timezone: string | null, fallback: string) {
  const safeValue = value ?? fallback;
  return formatAbsoluteInTimezone(safeValue, timezone, {
    includeWeekday: false,
    includeYear: true,
    includeTimezone: true,
  });
}

function statusLabel(status: Moment["status"], scheduledIso: string | null) {
  if (status === "draft") return "Draft";
  if (scheduledIso) {
    const target = Date.parse(scheduledIso);
    if (!Number.isNaN(target) && target > Date.now()) return "Scheduled";
  }
  return "Sent";
}

function toDisplayName(recipient: string) {
  const trimmed = recipient.trim();
  if (!trimmed) return "your person";
  const local = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  if (/^\d+$/.test(local)) return trimmed;
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "your person";
  return cleaned
    .split(/\s+/)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function toFriendlyError(message: string) {
  if (/required/i.test(message)) {
    return "A few required details are missing. Please review before scheduling.";
  }
  if (/schema cache|column/i.test(message)) {
    return "Moment settings are syncing. Please try again in a few seconds.";
  }
  return message;
}

function buildShareLink(publicId: string, token: string) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${origin}/m/${publicId}?t=${token}`;
}

export default function EditMomentClient({
  moment,
  justSent = false,
}: {
  moment: Moment;
  justSent?: boolean;
}) {
  const router = useRouter();
  const message = moment.message_body ?? "";
  const category = moment.category?.toUpperCase() || "JUST BECAUSE";
  const recipientEmail = (moment.recipient_email ?? moment.recipient_phone ?? "").trim();
  const initialTimezone = moment.delivery_timezone ?? detectCurrentTimezone();
  const initialLocalParts = getLocalPartsFromUtc(moment.scheduled_for_utc, initialTimezone);
  const [date, setDate] = useState(initialLocalParts.date);
  const [time, setTime] = useState(initialLocalParts.time);
  const [deliveryTimezone, setDeliveryTimezone] = useState(initialTimezone);
  const [statusOverride, setStatusOverride] = useState<Moment["status"] | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    justSent ? "Moment scheduled. Delivery will trigger at the selected time." : null
  );
  const [shareLink, setShareLink] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const key = `qc.moment.sharelink.${moment.id}`;
    return sessionStorage.getItem(key);
  });

  const status = statusOverride ?? moment.status;
  const isDraft = status === "draft";
  const isBusy = actionState !== null;
  const scheduledIso = useMemo(
    () => toUtcIsoFromLocalParts({ date, time, timezone: deliveryTimezone }),
    [date, time, deliveryTimezone]
  );
  const normalizedStatus = statusLabel(status, scheduledIso ?? moment.scheduled_for_utc);

  const isSendReady =
    recipientEmail.length > 0 &&
    message.trim().length > 0 &&
    date.length > 0 &&
    time.length > 0;

  useEffect(() => {
    if (!justSent || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("sent")) return;
    url.searchParams.delete("sent");
    const query = url.searchParams.toString();
    const next = `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
    window.history.replaceState({}, "", next);
  }, [justSent]);

  async function saveDraftToServer() {
    const res = await fetch(`/api/moments/${moment.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message_body: message.trim() || null,
        scheduled_for_utc: scheduledIso,
        delivery_timezone: deliveryTimezone,
        recipient_email: recipientEmail || null,
        recipient_phone: recipientEmail || null,
        category,
      }),
    });

    const payload = (await res.json().catch(() => null)) as
      | { error?: string; moment?: { status?: Moment["status"] } }
      | null;

    if (!res.ok) {
      throw new Error(payload?.error ?? "Failed to save draft.");
    }
  }

  async function patchMoment(payload: Record<string, unknown>) {
    const res = await fetch(`/api/moments/${moment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await res.json().catch(() => null)) as
      | { error?: string; moment?: { status?: Moment["status"]; id?: string } }
      | null;

    if (!res.ok) {
      throw new Error(body?.error ?? "Operation failed.");
    }

    if (!body) {
      throw new Error("Unexpected empty response.");
    }

    return body;
  }

  async function handleSaveDraft() {
    if (!isDraft || isBusy) return;
    setActionState("save");
    setError(null);
    setNotice(null);

    try {
      await saveDraftToServer();
      setNotice("Draft saved.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save draft.");
    } finally {
      setActionState(null);
    }
  }

  async function handleSend() {
    if (!isDraft || isBusy) return;
    setActionState("send");
    setError(null);
    setNotice(null);

    try {
      if (!isSendReady) {
        throw new Error("Recipient, message, date, and time are required.");
      }

      await saveDraftToServer();

      const sendRes = await fetch(`/api/moments/${moment.id}/publish`, {
        method: "POST",
      });

      const sendPayload = (await sendRes.json().catch(() => null)) as
        | {
            error?: string;
            token?: string | null;
            moment?: { status?: Moment["status"]; public_id?: string | null };
          }
        | null;

      if (!sendRes.ok) {
        throw new Error(sendPayload?.error ?? "Failed to send moment.");
      }

      setStatusOverride(sendPayload?.moment?.status ?? "published");
      setNotice("Moment scheduled. QC will deliver it at the selected time.");
      router.refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send moment.");
    } finally {
      setActionState(null);
    }
  }

  async function handleDuplicate() {
    if (isBusy) return;
    setActionState("duplicate");
    setError(null);
    setNotice(null);

    try {
      const response = await patchMoment({ action: "duplicate" });
      const duplicateId = response.moment?.id;
      if (!duplicateId) throw new Error("Could not duplicate this moment.");
      router.push(`/app/moments/${duplicateId}`);
      router.refresh();
    } catch (duplicateError) {
      setError(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Could not duplicate this moment."
      );
      setActionState(null);
    }
  }

  async function handleReschedule() {
    if (isBusy) return;
    if (!scheduledIso) {
      setError("Date and time are required to reschedule.");
      return;
    }

    setActionState("reschedule");
    setError(null);
    setNotice(null);

    try {
      const response = await patchMoment({
        action: "reschedule",
        scheduled_for_utc: scheduledIso,
        delivery_timezone: deliveryTimezone,
      });
      setStatusOverride(response.moment?.status ?? status);
      setNotice("Moment rescheduled.");
      router.refresh();
    } catch (rescheduleError) {
      setError(
        rescheduleError instanceof Error
          ? rescheduleError.message
          : "Failed to reschedule this moment."
      );
    } finally {
      setActionState(null);
    }
  }

  async function handleCancelSchedule() {
    if (isBusy) return;

    setActionState("cancel");
    setError(null);
    setNotice(null);

    try {
      const response = await patchMoment({ action: "cancel_schedule" });
      setStatusOverride(response.moment?.status ?? "draft");
      setNotice("Schedule cancelled. Moment moved back to draft.");
      router.refresh();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Failed to cancel schedule."
      );
    } finally {
      setActionState(null);
    }
  }

  async function handleDelete() {
    if (isBusy) return;

    if (!window.confirm("Delete this moment permanently?")) return;

    setActionState("delete");
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/moments/${moment.id}`, {
        method: "DELETE",
      });

      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not delete this moment.");
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`qc.moment.sharelink.${moment.id}`);
      }

      router.push("/app/moments");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Could not delete this moment."
      );
      setActionState(null);
    }
  }

  async function handleCopyLink() {
    if (!shareLink || isBusy) return;

    setActionState("copy");
    setError(null);
    setNotice(null);

    try {
      await navigator.clipboard.writeText(shareLink);
      setNotice("Share link copied.");
    } catch {
      setError("Could not copy link.");
    } finally {
      setActionState(null);
    }
  }

  async function handleShare() {
    if (!shareLink || isBusy) return;

    setActionState("share");
    setError(null);
    setNotice(null);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "QC moment",
          text: "A private QC moment is ready.",
          url: shareLink,
        });
        setNotice("Share sheet opened.");
      } else {
        await navigator.clipboard.writeText(shareLink);
        setNotice("Share link copied.");
      }
    } catch {
      setError("Could not share this moment right now.");
    } finally {
      setActionState(null);
    }
  }

  const scheduleDisplay = formatDate(
    scheduledIso ?? moment.scheduled_for_utc,
    deliveryTimezone,
    moment.created_at
  );
  const arrivalLine = formatArrivalLineWithTimezone(
    scheduledIso ?? moment.scheduled_for_utc,
    deliveryTimezone
  );
  const timingPill = formatTimingPillWithTimezone(
    scheduledIso ?? moment.scheduled_for_utc,
    deliveryTimezone
  );
  const recipientDisplay = recipientEmail;
  const recipientNameDisplay = toDisplayName(recipientDisplay);
  const deliveryTimezoneLabel = toFriendlyTimezoneLabel(deliveryTimezone);
  const heroTitle = isDraft ? "Moment saved in draft" : "Moment scheduled ✨";
  const heroSubtitle = isDraft
    ? "Finish with confidence, then send when it feels right."
    : `${recipientNameDisplay} will receive this on ${scheduleDisplay}`;
  const emotionalReinforcement = isDraft
    ? "This moment is almost ready."
    : "This moment will arrive right on time.";
  const userFacingError = error ? toFriendlyError(error) : null;

  return (
    <div className="qc-app-section qc-moment-receipt-screen">
      <section className="qc-card qc-card--hero qc-moment-receipt-hero">
        <div className="qc-moment-receipt-hero-head">
          <div>
            <p className="qc-kicker">Moment ready</p>
            <h1 className="qc-heading-xl">{heroTitle}</h1>
            <p className="qc-copy">{heroSubtitle}</p>
          </div>
          <span className="qc-pill">{normalizedStatus}</span>
        </div>
      </section>

      <section className="qc-card qc-moment-receipt-preview">
        <header className="qc-moment-receipt-preview-head">
          <p className="qc-kicker">Moment preview</p>
          <div className="qc-moment-receipt-chips">
            <span className="qc-review-chip">Email</span>
            <span className="qc-review-chip">Scheduled</span>
            <span className="qc-review-chip">Private</span>
          </div>
        </header>

        <div className="qc-moment-receipt-stage">
                  <p className="qc-moment-receipt-stage-overline">Your moment is ready</p>
          <p className="qc-moment-receipt-message">
            {message.trim() || "Your message will appear here once you add it."}
          </p>
          <div className="qc-moment-receipt-meta">
            <p>For {recipientNameDisplay}</p>
            <p>{arrivalLine}</p>
          </div>
          <p className="qc-moment-receipt-pill">{timingPill}</p>
          <p className="qc-moment-receipt-support-copy">{emotionalReinforcement}</p>
          <p className="qc-copy">{deliveryTimezoneLabel}</p>
        </div>
      </section>

      <section className="qc-card qc-moment-receipt-actions">
        {(notice || justSent || shareLink) && (
          <div className="qc-moment-receipt-banner" role="status" aria-live="polite">
            <div>
              <p className="qc-moment-receipt-banner-title">✔ Moment scheduled</p>
              <p className="qc-moment-receipt-banner-copy">
                {shareLink ? "Share link is ready." : notice ?? "Your moment is on track."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!shareLink || isBusy}
              className="qc-button qc-button--secondary"
            >
              {actionState === "copy" ? "Copying..." : "Copy link"}
            </button>
          </div>
        )}

        {userFacingError && (
          <div className="qc-review-alert" role="alert" aria-live="polite">
            <p className="qc-review-alert-title">{userFacingError}</p>
            {process.env.NODE_ENV !== "production" && (
              <p className="qc-review-alert-detail">{error}</p>
            )}
          </div>
        )}

        <div className="qc-moment-receipt-primary-actions">
          {isDraft ? (
            <>
              <button
                type="button"
                onClick={handleSend}
                disabled={isBusy || !isSendReady}
                className="qc-button qc-button--primary"
              >
                {actionState === "send" ? "Scheduling..." : "Schedule moment"}
              </button>
              <FeatureToggleButton
                momentId={moment.id}
                initialFeatured={moment.is_featured}
                variant="pill"
              />
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!shareLink || isBusy}
                className="qc-button qc-button--secondary"
              >
                {actionState === "copy" ? "Copying..." : "Copy link"}
              </button>
              <button
                type="button"
                onClick={handleShare}
                disabled={!shareLink || isBusy}
                className="qc-button qc-button--secondary"
              >
                {actionState === "share" ? "Sharing..." : "Share"}
              </button>
              <a
                href={shareLink ?? "#"}
                target="_blank"
                rel="noreferrer"
                className={`qc-button qc-button--secondary${shareLink ? "" : " is-disabled"}`}
                aria-disabled={!shareLink}
                onClick={(event) => {
                  if (!shareLink) event.preventDefault();
                }}
                >
                  View moment
                </a>
                <FeatureToggleButton
                  momentId={moment.id}
                  initialFeatured={moment.is_featured}
                  variant="pill"
                />
            </>
          )}
        </div>

        <details className="qc-moment-receipt-manage">
          <summary>Manage</summary>
          <div className="qc-moment-receipt-manage-body">
            <div className="qc-moment-receipt-reschedule">
              <label htmlFor="detail-date" className="qc-kicker">
                Date
              </label>
              <input
                id="detail-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="qc-input"
                disabled={isBusy}
              />
              <label htmlFor="detail-time" className="qc-kicker">
                Time
              </label>
              <input
                id="detail-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="qc-input"
                disabled={isBusy}
              />
              <label htmlFor="detail-timezone" className="qc-kicker">
                Timezone
              </label>
              <select
                id="detail-timezone"
                value={deliveryTimezone}
                onChange={(event) => setDeliveryTimezone(event.target.value)}
                className="qc-input"
                disabled={isBusy}
              >
                {getTimezoneOptions(deliveryTimezone).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleReschedule}
                disabled={isBusy || !scheduledIso}
                className="qc-button qc-button--secondary"
              >
                {actionState === "reschedule" ? "Rescheduling..." : "Reschedule"}
              </button>
            </div>

            <div className="qc-moment-receipt-manage-actions">
              <button
                type="button"
                onClick={isDraft ? handleSaveDraft : handleCancelSchedule}
                disabled={isBusy}
                className="qc-button qc-button--secondary"
              >
                {isDraft
                  ? actionState === "save"
                    ? "Saving..."
                    : "Save draft"
                  : actionState === "cancel"
                    ? "Moving..."
                    : "Edit (move to draft)"}
              </button>

              <button
                type="button"
                onClick={handleDuplicate}
                disabled={isBusy}
                className="qc-button qc-button--secondary"
              >
                {actionState === "duplicate" ? "Duplicating..." : "Duplicate"}
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isBusy}
                className="qc-button qc-button--secondary"
              >
                {actionState === "delete" ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </details>

        <div className="qc-moment-receipt-footer">
          <Link href="/app/moments" className="qc-button qc-button--secondary">
            Back to moments
          </Link>
        </div>
      </section>
    </div>
  );
}
