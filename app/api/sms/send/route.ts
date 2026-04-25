import { NextResponse } from "next/server";
import { sendSMS } from "@/lib/twilio";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const SMS_DELIVERY_ENABLED = process.env.QC_ENABLE_SMS_DELIVERY === "true";

export async function POST(req: Request) {
  try {
    if (!SMS_DELIVERY_ENABLED) {
      return NextResponse.json(
        { error: "SMS delivery is disabled for this environment." },
        { status: 403 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing to or message" },
        { status: 400 }
      );
    }

    await sendSMS({
      to,
      body: message,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("SMS error:", err);
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}
