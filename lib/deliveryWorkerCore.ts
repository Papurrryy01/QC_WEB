type SupabaseLikeClient = {
  from: (table: string) => any;
};

type DueMomentRow = {
  id: string;
  public_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  message_body: string | null;
  scheduled_for_utc: string | null;
  delivery_timezone?: string | null;
  status: string | null;
};

type DeliveryWorkerConfig = {
  supabase: SupabaseLikeClient;
  siteBaseUrl: string;
  resendApiKey: string;
  fromEmail: string;
  limit?: number;
  nowIso?: string;
  logger?: Pick<Console, "info" | "warn" | "error">;
};

type ProcessResultItem = {
  id: string;
  status: "sent" | "failed" | "skipped";
  error?: string;
};

export type ProcessDueMomentsResult = {
  ok: true;
  checked: number;
  sent: number;
  failed: number;
  skipped: number;
  results: ProcessResultItem[];
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

function isMissingColumnError(error: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null | undefined, columnName: string) {
  const text = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes(columnName.toLowerCase()) &&
    (text.includes("does not exist") ||
      text.includes("schema cache") ||
      text.includes("column"))
  );
}

function normalizeTimezone(timezone: string | null | undefined) {
  const value = timezone?.trim();
  return value || "UTC";
}

function toFriendlyTimezoneLabel(timezone: string | null | undefined) {
  const normalized = normalizeTimezone(timezone);

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: normalized,
      timeZoneName: "longGeneric",
    }).formatToParts(new Date());
    const label = parts.find((part) => part.type === "timeZoneName")?.value?.trim();
    return label || normalized;
  } catch {
    return normalized;
  }
}

function formatAbsoluteInTimezone(
  utcIso: string,
  timezone: string | null | undefined,
  options: { includeWeekday?: boolean; includeYear?: boolean; includeTimezone?: boolean } = {}
) {
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  const normalizedTimezone = normalizeTimezone(timezone);
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizedTimezone,
    ...(options.includeWeekday ? { weekday: "long" as const } : {}),
    month: "short",
    day: "numeric",
    ...(options.includeYear === false ? {} : { year: "numeric" as const }),
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (options.includeTimezone === false) return formatted;
  return `${formatted} ${toFriendlyTimezoneLabel(normalizedTimezone)}`;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytesLength: number) {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function randomPublicId(len = 6) {
  return randomHex(12).slice(0, len);
}

export function randomAccessToken() {
  return randomHex(32);
}

export async function sha256(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return bytesToHex(new Uint8Array(digest));
}

export function buildRevealUrl({
  siteBaseUrl,
  publicId,
  token,
}: {
  siteBaseUrl: string;
  publicId: string;
  token: string;
}) {
  return `${siteBaseUrl.replace(/\/$/, "")}/m/${publicId}?t=${token}`;
}

function buildMomentEmail(args: {
  siteBaseUrl: string;
  publicId: string;
  token: string;
  scheduledForUtc: string;
  deliveryTimezone: string | null | undefined;
}) {
  const revealUrl = buildRevealUrl(args);
  const scheduledLabel = formatAbsoluteInTimezone(args.scheduledForUtc, args.deliveryTimezone, {
    includeWeekday: true,
    includeYear: true,
    includeTimezone: true,
  });

  const text = [
    "You received a private QC moment.",
    "",
    "A meaningful message has been created for you.",
    `Scheduled for: ${scheduledLabel}`,
    "",
    "This message stays hidden until you open it.",
    "",
    `Open your moment: ${revealUrl}`,
  ].join("\n");

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
      </head>
      <body style="margin:0;padding:0;background:#f5f7fb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(180deg,#f7f9fd 0%,#f3f6fb 100%);">
          <tr>
            <td align="center" style="padding:40px 16px;">
              <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:560px;max-width:560px;background:rgba(255,255,255,0.94);border:1px solid #e6ebf3;border-radius:24px;overflow:hidden;box-shadow:0 18px 54px rgba(112,135,183,0.14);">
                <tr>
                  <td style="padding:30px 30px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#0f1623;">
                    <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8a97ad;">QC moment</p>
                    <h1 style="margin:0 0 10px;font-size:28px;line-height:1.18;font-weight:650;letter-spacing:-0.03em;">You received a private moment</h1>
                    <p style="margin:0;color:#617089;font-size:15px;line-height:1.7;">
                      A meaningful message has been created for you.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 30px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#33425a;">
                    <p style="margin:0 0 16px;font-size:13px;color:#8090a6;">Scheduled for ${scheduledLabel}</p>
                    <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#98a4b7;">Hidden until opened</p>
                    <div style="margin:0 0 22px;padding:18px 18px 20px;border-radius:18px;border:1px solid #e8edf6;background:linear-gradient(180deg,rgba(250,252,255,0.96) 0%,rgba(242,246,252,0.9) 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.72),0 10px 28px rgba(168,184,213,0.12);">
                      <div style="height:12px;width:168px;max-width:62%;border-radius:999px;background:linear-gradient(90deg,rgba(221,228,240,0.96) 0%,rgba(241,245,251,0.92) 100%);margin-bottom:12px;"></div>
                      <div style="height:10px;width:100%;border-radius:999px;background:linear-gradient(90deg,rgba(229,235,245,0.94) 0%,rgba(245,248,252,0.88) 100%);margin-bottom:10px;"></div>
                      <div style="height:10px;width:78%;border-radius:999px;background:linear-gradient(90deg,rgba(225,232,243,0.92) 0%,rgba(244,247,252,0.88) 100%);margin-bottom:10px;"></div>
                      <div style="height:10px;width:92%;border-radius:999px;background:linear-gradient(90deg,rgba(228,234,244,0.9) 0%,rgba(244,247,252,0.86) 100%);margin-bottom:10px;"></div>
                      <div style="height:10px;width:64%;border-radius:999px;background:linear-gradient(90deg,rgba(223,230,242,0.9) 0%,rgba(244,247,252,0.84) 100%);"></div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:2px 30px 30px;">
                    <a href="${revealUrl}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#2f68f3;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;font-size:14px;font-weight:600;box-shadow:0 12px 28px rgba(47,104,243,0.22);">
                      Open moment
                    </a>
                    <p style="margin:14px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;font-size:12px;line-height:1.5;color:#8a95a8;word-break:break-all;">
                      ${revealUrl}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();

  return { revealUrl, text, html };
}

async function sendMomentEmail(args: {
  resendApiKey: string;
  fromEmail: string;
  recipientEmail: string;
  siteBaseUrl: string;
  publicId: string;
  token: string;
  scheduledForUtc: string;
  deliveryTimezone: string | null | undefined;
}) {
  const { html, text } = buildMomentEmail(args);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.fromEmail,
      to: args.recipientEmail,
      subject: "You received a QC moment",
      html,
      text,
    }),
  });

  if (!response.ok) {
    const raw = (await response.text().catch(() => "")).slice(0, 800);
    throw new Error(`Resend failed (${response.status})${raw ? `: ${raw}` : ""}`);
  }

  const payload = (await response.json().catch(() => null)) as ResendResponse | null;
  if (!payload?.id) {
    throw new Error("Resend did not return a message id.");
  }

  return payload.id;
}

async function loadDueMoments(supabase: SupabaseLikeClient, nowIso: string, limit: number) {
  let result: any = await supabase
    .from("moments")
    .select(
      "id, public_id, recipient_email, recipient_phone, message_body, scheduled_for_utc, delivery_timezone, status"
    )
    .eq("status", "published")
    .not("scheduled_for_utc", "is", null)
    .lte("scheduled_for_utc", nowIso)
    .order("scheduled_for_utc", { ascending: true })
    .limit(limit);

  if (isMissingColumnError(result.error, "delivery_timezone")) {
    result = await supabase
      .from("moments")
      .select("id, public_id, recipient_email, recipient_phone, message_body, scheduled_for_utc, status")
      .eq("status", "published")
      .not("scheduled_for_utc", "is", null)
      .lte("scheduled_for_utc", nowIso)
      .order("scheduled_for_utc", { ascending: true })
      .limit(limit);
  }

  if (result.error) {
    throw new Error(result.error.message || "Could not load due moments.");
  }

  return ((result.data ?? []) as DueMomentRow[]).map((moment) => ({
    ...moment,
    delivery_timezone: moment.delivery_timezone ?? null,
  }));
}

async function updateMomentWithFallback(
  supabase: SupabaseLikeClient,
  momentId: string,
  expectedStatus: string | null,
  patch: Record<string, unknown>,
  withSelect = false
) {
  let query = supabase.from("moments").update(patch).eq("id", momentId);
  if (expectedStatus) {
    query = query.eq("status", expectedStatus);
  }
  if (withSelect) {
    query = query.select("id").maybeSingle();
  }

  let result: any = await query;

  if (isMissingColumnError(result.error, "last_error") && Object.prototype.hasOwnProperty.call(patch, "last_error")) {
    const { last_error: _lastError, ...withoutLastError } = patch;
    let retryQuery = supabase.from("moments").update(withoutLastError).eq("id", momentId);
    if (expectedStatus) {
      retryQuery = retryQuery.eq("status", expectedStatus);
    }
    if (withSelect) {
      retryQuery = retryQuery.select("id").maybeSingle();
    }
    result = await retryQuery;
  }

  return result;
}

function trimErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return text.slice(0, 1000);
}

export async function processDueMomentsWithClient({
  supabase,
  siteBaseUrl,
  resendApiKey,
  fromEmail,
  limit = 50,
  nowIso = new Date().toISOString(),
  logger = console,
}: DeliveryWorkerConfig): Promise<ProcessDueMomentsResult> {
  const dueMoments = await loadDueMoments(supabase, nowIso, limit);
  const results: ProcessResultItem[] = [];

  for (const moment of dueMoments) {
    const publicId = moment.public_id ?? randomPublicId(6);
    const token = randomAccessToken();
    const tokenHash = await sha256(token);
    const tokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    let emailDelivered = false;

    try {
      if (!moment.recipient_email?.trim()) {
        throw new Error("Recipient email missing.");
      }
      if (!moment.message_body?.trim()) {
        throw new Error("Message missing.");
      }
      if (!moment.scheduled_for_utc) {
        throw new Error("Schedule missing.");
      }

      const claimResult = await updateMomentWithFallback(
        supabase,
        moment.id,
        "published",
        {
          status: "sending",
          public_id: publicId,
          access_token_hash: tokenHash,
          token_expires_at: tokenExpiresAt,
          last_error: null,
        },
        true
      );

      if (claimResult.error) {
        throw new Error(claimResult.error.message || "Could not claim moment.");
      }

      if (!claimResult.data?.id) {
        results.push({ id: moment.id, status: "skipped" });
        continue;
      }

      await sendMomentEmail({
        resendApiKey,
        fromEmail,
        recipientEmail: moment.recipient_email.trim().toLowerCase(),
        siteBaseUrl,
        publicId,
        token,
        scheduledForUtc: moment.scheduled_for_utc,
        deliveryTimezone: moment.delivery_timezone,
      });

      emailDelivered = true;

      const sentResult = await updateMomentWithFallback(supabase, moment.id, "sending", {
        status: "sent",
        sent_at: new Date().toISOString(),
        last_error: null,
      });

      if (sentResult.error) {
        throw new Error(sentResult.error.message || "Email sent but could not finalize delivery state.");
      }

      results.push({ id: moment.id, status: "sent" });
    } catch (error) {
      const errorMessage = trimErrorMessage(error);

      if (!emailDelivered) {
        const failedResult = await updateMomentWithFallback(supabase, moment.id, "sending", {
          status: "failed",
          last_error: errorMessage,
        });

        if (failedResult.error) {
          logger.error?.(`Failed to persist failed state for moment ${moment.id}: ${failedResult.error.message}`);
        }
      } else {
        const stuckResult = await updateMomentWithFallback(supabase, moment.id, "sending", {
          last_error: `Email sent, but QC could not finalize the record: ${errorMessage}`,
        });

        if (stuckResult.error) {
          logger.error?.(`Failed to persist post-send error for moment ${moment.id}: ${stuckResult.error.message}`);
        }
      }

      results.push({
        id: moment.id,
        status: "failed",
        error: errorMessage,
      });
    }
  }

  return {
    ok: true,
    checked: dueMoments.length,
    sent: results.filter((item) => item.status === "sent").length,
    failed: results.filter((item) => item.status === "failed").length,
    skipped: results.filter((item) => item.status === "skipped").length,
    results,
  };
}
