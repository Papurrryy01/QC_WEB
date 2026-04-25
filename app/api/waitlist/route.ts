import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type WaitlistRequestBody = {
  email?: unknown;
  source?: unknown;
  locale?: unknown;
  website?: unknown;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const VERIFY_TOKEN_BYTES = 32;
const VERIFY_TOKEN_TTL_HOURS = 48;

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function createVerificationToken() {
  const raw = randomBytes(VERIFY_TOKEN_BYTES).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function tokenExpiryDate() {
  return new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

function getSiteBaseUrl(req: Request) {
  const configured =
    process.env.WAITLIST_VERIFY_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  return new URL(configured ?? new URL(req.url).origin);
}

function buildVerificationUrl(req: Request, token: string, signupId?: string) {
  const url = new URL("/waitlist/verified", getSiteBaseUrl(req));
  url.searchParams.set("token", token);
  if (signupId) {
    url.searchParams.set("signup", signupId);
  }
  return url.toString();
}

async function sendVerificationEmail({
  to,
  verificationUrl,
}: {
  to: string;
  verificationUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      ok: false,
      reason: "Missing RESEND_API_KEY or WAITLIST_EMAIL_FROM",
    } as const;
  }

  const subject = "You’re on the list.";
  const feedbackUrl = verificationUrl;
  const siteBaseUrl = getSiteBaseUrl(new Request(verificationUrl));
  const logoUrl = new URL("/email-logo.png", siteBaseUrl).toString();
  const privacyUrl = new URL("/privacy", siteBaseUrl).toString();
  const termsUrl = new URL("/terms", siteBaseUrl).toString();
  const contactUrl = new URL("/company/contact", siteBaseUrl).toString();
  const text = [
    "QC",
    "",
    "You’re on the list.",
    "",
    "QC is still private.",
    "But you’re now part of the pre-launch circle.",
    "",
    "We’re building in public silence.",
    "In private detail.",
    "",
    "If you want to shape what QC becomes, join the feedback circle:",
    feedbackUrl,
    "",
    "If this wasn’t you, ignore this message.",
    "",
    `Privacy: ${privacyUrl}`,
    `Terms: ${termsUrl}`,
    `Contact: ${contactUrl}`,
  ].join("\n");

  const html = `
    <!doctype html>
    <html lang="en" class="notranslate" translate="no">
      <head>
        <meta charset="utf-8" />
        <base target="_self" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
        <meta name="google" content="notranslate" />
        <meta name="color-scheme" content="dark light" />
        <meta name="supported-color-schemes" content="dark light" />
        <title>QC</title>
      </head>
      <body style="margin:0; padding:0; background:#0B1220 !important;">
        <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
          You’re early. You’re now part of QC’s private pre-launch circle.
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0B1220" style="background:#0B1220 !important; margin:0; padding:0;">
          <tr>
            <td align="center" class="notranslate" translate="no" bgcolor="#0B1220" style="background:#0B1220 !important; padding:48px 16px 56px;">
              <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" bgcolor="#0B1220" style="background:#0B1220 !important; width:560px; max-width:560px;">
                <tr>
                  <td align="center" style="padding:16px 0 18px;">
                    <img
                      src="${logoUrl}"
                      alt="QC logo"
                      width="96"
                      height="96"
                      style="display:block; width:96px; height:96px; border:0; outline:none; text-decoration:none;"
                    />
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 0 24px;">
                    <div style="height:1px; background-color:#2A3446; width:100%;"></div>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:0 24px 0;">
                    <div style="font-family:Georgia,'Times New Roman',Times,serif; font-size:40px; line-height:46px; color:#E7EBF2; font-weight:400;">
                      You’re on the list.
                    </div>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:22px 28px 0;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif; font-size:16px; line-height:26px; color:#B6BFCC; letter-spacing:0.2px;">
                      <span class="notranslate" translate="no">QC</span> is still private.<br />
                      But you’re now part of the pre-launch circle.<br /><br />
                      We’re building in public silence.<br />
                      In private detail.<br /><br />
                      If you want to shape what <span class="notranslate" translate="no">QC</span> becomes,<br />
                      we’ll invite you into the inner loop.
                    </div>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:28px 0 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="border:1px solid #7F8A9A; border-radius:999px;">
                          <a href="${feedbackUrl}" target="_self" style="display:inline-block; padding:14px 22px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif; font-size:14px; line-height:14px; color:#E7EBF2; text-decoration:none; letter-spacing:0.6px;">
                            Join the feedback circle
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:18px 28px 0;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif; font-size:13px; line-height:20px; color:#8F9AAC;">
                      If this wasn’t you, ignore this message.
                    </div>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:26px 28px 0;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif; font-size:12px; line-height:18px; color:#6F7B8E;">
                      You’ll only hear from us when it matters.
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:34px 0 0;">
                    <div style="height:1px; background-color:#2A3446; width:100%;"></div>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:16px 24px 0;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif; font-size:12px; line-height:18px; color:#7D899B;">
                      <a href="${privacyUrl}" target="_self" style="color:#8F9AAC; text-decoration:none;">Privacy</a>
                      <span style="color:#5C6678; padding:0 8px;">|</span>
                      <a href="${termsUrl}" target="_self" style="color:#8F9AAC; text-decoration:none;">Terms</a>
                      <span style="color:#5C6678; padding:0 8px;">|</span>
                      <a href="${contactUrl}" target="_self" style="color:#8F9AAC; text-decoration:none;">Contact</a>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:10px 24px 0;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif; font-size:11px; line-height:17px; color:#6F7B8E;">
                      If your browser blocks the button, copy and paste this URL:<br />
                      <span style="word-break:break-all; color:#8F9AAC;">${feedbackUrl}</span>
                    </div>
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
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.text().catch(() => "")).slice(0, 800);
    return {
      ok: false,
      reason: `Resend request failed (${response.status})`,
      details: errorBody || undefined,
    } as const;
  }

  return { ok: true } as const;
}

function serverError(
  message: string,
  status = 500,
  details?: Record<string, unknown>
) {
  const payload: Record<string, unknown> = { ok: false, error: message };

  if (process.env.NODE_ENV !== "production" && details) {
    payload.debug = details;
  }

  return NextResponse.json(payload, { status });
}

export async function POST(req: Request) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return serverError("Server misconfigured", 500, {
      hasUrl: Boolean(supabaseUrl),
      hasServiceKey: Boolean(serviceRoleKey),
    });
  }

  if (
    typeof serviceRoleKey === "string" &&
    !serviceRoleKey.startsWith("sb_secret_") &&
    serviceRoleKey.split(".").length !== 3
  ) {
    return serverError("Server misconfigured", 500, {
      reason: "Invalid SUPABASE service key format",
    });
  }

  if (typeof supabaseUrl === "string" && !supabaseUrl.startsWith("https://")) {
    return serverError("Server misconfigured", 500, {
      reason: "NEXT_PUBLIC_SUPABASE_URL must start with https://",
    });
  }

  let body: WaitlistRequestBody;
  try {
    body = (await req.json()) as WaitlistRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid email" },
      { status: 400 }
    );
  }

  const website = normalizeString(body.website, 512);
  if (website) {
    return NextResponse.json({ ok: true, status: "created" }, { status: 201 });
  }

  const normalizedEmail = normalizeString(body.email, 320)?.toLowerCase() ?? "";

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return NextResponse.json(
      { ok: false, error: "Invalid email" },
      { status: 400 }
    );
  }

  const source = normalizeString(body.source, 120) ?? "landing";
  const locale = normalizeString(body.locale, 24);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const token = createVerificationToken();
  const tokenExpiry = tokenExpiryDate().toISOString();
  const sentAt = new Date().toISOString();

  let signupId: string | null = null;
  let status: "created" | "already_exists" = "created";
  let sendVerification = false;

  try {
    const { data, error } = await supabase
      .from("waitlist_signups")
      .insert({
        email: normalizedEmail,
        source,
        locale,
        verify_token_hash: token.hash,
        verify_token_expires_at: tokenExpiry,
        last_verification_sent_at: sentAt,
      })
      .select("id")
      .single();

    if (!error) {
      signupId = data?.id ?? null;
      sendVerification = true;
    } else if (error.code === "23505") {
      status = "already_exists";

      const existingResult = await supabase
        .from("waitlist_signups")
        .select("id,verified_at")
        .eq("email", normalizedEmail)
        .limit(1)
        .maybeSingle();

      if (existingResult.error || !existingResult.data) {
        return serverError("Failed to save signup", 500, {
          code: existingResult.error?.code ?? error.code,
          message:
            existingResult.error?.message ??
            "Duplicate signup found but existing row could not be loaded",
        });
      }

      signupId = existingResult.data.id;

      if (!existingResult.data.verified_at) {
        const refreshResult = await supabase
          .from("waitlist_signups")
          .update({
            source,
            locale,
            verify_token_hash: token.hash,
            verify_token_expires_at: tokenExpiry,
            last_verification_sent_at: sentAt,
          })
          .eq("id", existingResult.data.id)
          .select("id")
          .single();

        if (refreshResult.error) {
          return serverError("Failed to save signup", 500, {
            code: refreshResult.error.code,
            message: refreshResult.error.message,
          });
        }

        sendVerification = true;
      } else {
        // Allow verified users to receive the feedback-circle email again.
        sendVerification = true;
      }
    } else {
      return serverError("Failed to save signup", 500, {
        code: error.code,
        message: error.message,
      });
    }
  } catch (error) {
    return serverError("Failed to save signup", 500, {
      reason: "Supabase request failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  if (sendVerification) {
    const verificationUrl = buildVerificationUrl(req, token.raw, signupId ?? undefined);
    const emailResult = await sendVerificationEmail({
      to: normalizedEmail,
      verificationUrl,
    });

    if (!emailResult.ok) {
      const payload: Record<string, unknown> = {
        ok: true,
        status,
        id: signupId,
        emailDelivery: "failed",
        warning:
          "Signup saved, but verification email could not be sent right now.",
      };

      if (process.env.NODE_ENV !== "production") {
        payload.debug = {
          reason: emailResult.reason,
          details: "details" in emailResult ? emailResult.details : undefined,
        };
      }

      return NextResponse.json(payload, {
        status: status === "created" ? 201 : 200,
      });
    }
  }

  return NextResponse.json(
    { ok: true, status, id: signupId, emailDelivery: "sent" },
    { status: status === "created" ? 201 : 200 }
  );
}
