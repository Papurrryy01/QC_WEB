import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "QV",
    supabaseUrlExists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
