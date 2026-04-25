import { NextResponse } from "next/server";
import { getSupabaseAuthServer } from "@/lib/authServer";

export async function GET() {
  const supabase = await getSupabaseAuthServer();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      createdAt: data.user.created_at,
      lastSignInAt: data.user.last_sign_in_at,
      emailConfirmedAt: data.user.email_confirmed_at,
      providers:
        Array.isArray(data.user.app_metadata?.providers) &&
        data.user.app_metadata.providers.every((item) => typeof item === "string")
          ? (data.user.app_metadata.providers as string[])
          : [],
    },
  });
}
