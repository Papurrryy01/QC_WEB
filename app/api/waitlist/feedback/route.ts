import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type FeedbackRequestBody = {
  signupId?: unknown;
  useCase?: unknown;
  requestedFeatures?: unknown;
  lifeImpact?: unknown;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeFeatureList(value: unknown) {
  if (!Array.isArray(value)) return [];

  const sanitized = value
    .map((item) => (typeof item === "string" ? item.trim().slice(0, 120) : ""))
    .filter(Boolean)
    .slice(0, 10);

  return Array.from(new Set(sanitized));
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

  let body: FeedbackRequestBody;
  try {
    body = (await req.json()) as FeedbackRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const signupId = normalizeString(body.signupId, 64);
  const useCase = normalizeString(body.useCase, 1500);
  const lifeImpact = normalizeString(body.lifeImpact, 1500);
  const requestedFeatures = normalizeFeatureList(body.requestedFeatures);

  if (!signupId || !UUID_REGEX.test(signupId)) {
    return NextResponse.json({ ok: false, error: "Invalid signup id" }, { status: 400 });
  }

  if (!useCase || !lifeImpact) {
    return NextResponse.json(
      { ok: false, error: "Please answer all required questions" },
      { status: 400 }
    );
  }

  if (requestedFeatures.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Select at least one feature" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    const existingSignup = await supabase
      .from("waitlist_signups")
      .select("id,verified_at")
      .eq("id", signupId)
      .limit(1)
      .maybeSingle();

    if (existingSignup.error) {
      return serverError("Failed to save feedback", 500, {
        code: existingSignup.error.code,
        message: existingSignup.error.message,
      });
    }

    if (!existingSignup.data) {
      return NextResponse.json(
        { ok: false, error: "Signup not found" },
        { status: 404 }
      );
    }

    if (!existingSignup.data.verified_at) {
      return NextResponse.json(
        { ok: false, error: "Email must be verified first" },
        { status: 403 }
      );
    }

    const feedbackResult = await supabase.from("waitlist_feedback").upsert(
      {
        signup_id: signupId,
        use_case: useCase,
        requested_features: requestedFeatures,
        life_impact: lifeImpact,
      },
      { onConflict: "signup_id", ignoreDuplicates: false }
    );

    if (feedbackResult.error) {
      return serverError("Failed to save feedback", 500, {
        code: feedbackResult.error.code,
        message: feedbackResult.error.message,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return serverError("Failed to save feedback", 500, {
      reason: "Supabase request failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
