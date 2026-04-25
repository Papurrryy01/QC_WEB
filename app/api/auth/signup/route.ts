import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type SignupBody = {
  email?: unknown;
  password?: unknown;
  acceptedLegal?: unknown;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /\d/;
const SPECIAL_REGEX = /[^A-Za-z0-9]/;

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function getSiteBaseUrl(req: Request) {
  const configured =
    process.env.WAITLIST_VERIFY_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL;
  return new URL(configured ?? new URL(req.url).origin);
}

function buildAuthCallbackUrl(req: Request) {
  const url = new URL("/auth/callback", getSiteBaseUrl(req));
  url.searchParams.set("next", "/dashboard");
  return url.toString();
}

function serverError(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function isExistingAccountError(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  return (
    code.includes("exists") ||
    code.includes("already") ||
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists")
  );
}

function isMissingProfilesTableError(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return error.code === "42P01" || message.includes('relation "profiles" does not exist');
}

async function ensureProfileRecord({
  supabase,
  userId,
  email,
}: {
  supabase: unknown;
  userId: string;
  email: string;
}) {
  const client = supabase as {
    from: (table: string) => {
      insert: (values: {
        id: string;
        display_name: string;
        theme_preference: string;
      }) => Promise<{ error: { code?: string; message?: string } | null }>;
    };
  };
  const defaultDisplayName = (email.split("@")[0] ?? "QC member").slice(0, 80);
  const profilesTable = client.from("profiles") as unknown as {
    insert: (values: {
      id: string;
      display_name: string;
      theme_preference: string;
    }) => Promise<{ error: { code?: string; message?: string } | null }>;
  };
  const insertPromise = profilesTable.insert({
    id: userId,
    display_name: defaultDisplayName,
    theme_preference: "midnight",
  }) as unknown as Promise<{ error: { code?: string; message?: string } | null }>;
  const { error } = await insertPromise;

  if (!error || error.code === "23505" || isMissingProfilesTableError(error)) {
    return;
  }

  throw new Error(error.message || "Could not initialize profile.");
}

function buildSignupEmail({
  verificationUrl,
  siteBaseUrl,
}: {
  verificationUrl: string;
  siteBaseUrl: URL;
}) {
  const logoUrl = new URL("/email-logo.png", siteBaseUrl).toString();
  const privacyUrl = new URL("/privacy", siteBaseUrl).toString();
  const termsUrl = new URL("/terms", siteBaseUrl).toString();
  const contactUrl = new URL("/company/contact", siteBaseUrl).toString();

  const subject = "Welcome to QC. Verify your email.";
  const text = [
    "Welcome to QC.",
    "",
    "Click below to verify your email and continue onboarding.",
    verificationUrl,
    "",
    "If this wasn't you, you can ignore this email.",
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
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
        <meta name="color-scheme" content="dark light" />
        <meta name="supported-color-schemes" content="dark light" />
        <title>QC</title>
      </head>
      <body style="margin:0; padding:0; background:#0B1220 !important;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0B1220" style="background:#0B1220 !important; margin:0; padding:0;">
          <tr>
            <td align="center" bgcolor="#0B1220" style="padding:44px 16px 52px;">
              <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" bgcolor="#0B1220" style="background:#0B1220 !important; width:560px; max-width:560px;">
                <tr>
                  <td align="center" style="padding:12px 0 14px;">
                    <img src="${logoUrl}" alt="QC logo" width="88" height="88" style="display:block; width:88px; height:88px; border:0; outline:none; text-decoration:none;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 22px;">
                    <div style="height:1px; background-color:#2A3446; width:100%;"></div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 24px 0;">
                    <div style="font-family:Georgia,'Times New Roman',Times,serif; font-size:38px; line-height:44px; color:#E7EBF2; font-weight:400;">
                      Welcome to QC.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:20px 28px 0;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif; font-size:16px; line-height:26px; color:#B6BFCC; letter-spacing:0.2px;">
                      Click below to verify your email and continue onboarding.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:28px 0 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="border:1px solid #7F8A9A; border-radius:999px;">
                          <a href="${verificationUrl}" target="_self" style="display:inline-block; padding:14px 22px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif; font-size:14px; line-height:14px; color:#E7EBF2; text-decoration:none; letter-spacing:0.6px;">
                            Verify email
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:18px 28px 0;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif; font-size:13px; line-height:20px; color:#8F9AAC;">
                      If this wasn't you, ignore this message.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px 0 0;">
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
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();

  return { subject, text, html };
}

async function sendVerificationEmail({
  to,
  verificationUrl,
  req,
}: {
  to: string;
  verificationUrl: string;
  req: Request;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_EMAIL_FROM;
  if (!apiKey || !from) {
    return { ok: false, reason: "Missing RESEND_API_KEY or WAITLIST_EMAIL_FROM" } as const;
  }

  const siteBaseUrl = getSiteBaseUrl(req);
  const template = buildSignupEmail({ verificationUrl, siteBaseUrl });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }),
  });

  if (!response.ok) {
    const details = (await response.text().catch(() => "")).slice(0, 800);
    return {
      ok: false,
      reason: `Resend request failed (${response.status})`,
      details,
    } as const;
  }

  return { ok: true } as const;
}

export async function POST(req: Request) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return serverError("Server misconfigured.");
  }

  let body: SignupBody;
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const email = normalizeString(body.email, 320)?.toLowerCase() ?? "";
  const password = normalizeString(body.password, 256) ?? "";
  const acceptedLegal = body.acceptedLegal === true;

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  if (!UPPERCASE_REGEX.test(password)) {
    return NextResponse.json(
      { ok: false, error: "Password must include at least one uppercase letter." },
      { status: 400 }
    );
  }

  if (!NUMBER_REGEX.test(password)) {
    return NextResponse.json(
      { ok: false, error: "Password must include at least one number." },
      { status: 400 }
    );
  }

  if (!SPECIAL_REGEX.test(password)) {
    return NextResponse.json(
      { ok: false, error: "Password must include at least one special character." },
      { status: 400 }
    );
  }

  if (!acceptedLegal) {
    return NextResponse.json(
      { ok: false, error: "You must accept Terms and Privacy before creating an account." },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: buildAuthCallbackUrl(req),
    },
  });

  if (error) {
    if (isExistingAccountError(error)) {
      return NextResponse.json(
        {
          ok: false,
          state: "existing_account",
          error: "Looks like this email is already under an account.",
        },
        { status: 409 }
      );
    }
    return serverError(error.message || "Could not create account.");
  }

  const verificationUrl = data.properties?.action_link ?? null;
  if (!verificationUrl) {
    return serverError("Could not generate email verification link.");
  }

  const newUserId = data.user?.id ?? null;
  if (newUserId) {
    try {
      await ensureProfileRecord({ supabase, userId: newUserId, email });
    } catch (profileError) {
      return serverError(
        profileError instanceof Error
          ? profileError.message
          : "Could not initialize profile."
      );
    }
  }

  const emailResult = await sendVerificationEmail({
    to: email,
    verificationUrl,
    req,
  });

  if (!emailResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Account created, but verification email could not be sent right now. Please try again in a moment.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    state: "verify_email",
    message: "Welcome. Click the email we sent to verify your account.",
  });
}
