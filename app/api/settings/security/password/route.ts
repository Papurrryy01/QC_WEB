import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_REGEX = /[^A-Za-z0-9]/;

type PasswordPayload = {
  password?: unknown;
  confirmPassword?: unknown;
};

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: PasswordPayload;
  try {
    body = (await req.json()) as PasswordPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const password = normalizeString(body.password, 256);
  const confirmPassword = normalizeString(body.confirmPassword, 256);

  if (!password || !confirmPassword) {
    return NextResponse.json(
      { error: "New password and confirmation are required." },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Password confirmation does not match." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  if (!UPPERCASE_REGEX.test(password)) {
    return NextResponse.json(
      { error: "Password must include at least one uppercase letter." },
      { status: 400 }
    );
  }

  if (!NUMBER_REGEX.test(password)) {
    return NextResponse.json(
      { error: "Password must include at least one number." },
      { status: 400 }
    );
  }

  if (!SPECIAL_REGEX.test(password)) {
    return NextResponse.json(
      { error: "Password must include at least one special character." },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
