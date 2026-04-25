import crypto from "crypto";
import { formatAbsoluteInTimezone, normalizeTimezone } from "./momentScheduling";

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

export function randomPublicId(len = 6) {
  return crypto.randomBytes(16).toString("base64url").slice(0, len);
}

export function randomAccessToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
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

export async function sendMomentEmail({
  siteBaseUrl,
  recipientEmail,
  publicId,
  token,
  scheduledForUtc,
  deliveryTimezone,
}: {
  siteBaseUrl: string;
  recipientEmail: string;
  publicId: string;
  token: string;
  scheduledForUtc: string;
  deliveryTimezone: string | null | undefined;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MOMENT_EMAIL_FROM ?? process.env.WAITLIST_EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or MOMENT_EMAIL_FROM");
  }

  const revealUrl = buildRevealUrl({ siteBaseUrl, publicId, token });
  const timezone = normalizeTimezone(deliveryTimezone);
  const scheduledLabel = formatAbsoluteInTimezone(scheduledForUtc, timezone, {
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

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipientEmail,
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
