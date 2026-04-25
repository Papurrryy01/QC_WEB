import { NextResponse } from "next/server";
import { isMissingColumnError } from "@/lib/supabaseColumnErrors";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        recipient_email?: string | null;
        recipient_phone?: string | null;
        message_body?: string | null;
        scheduled_for_utc?: string | null;
        delivery_timezone?: string | null;
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsedSchedule =
    body.scheduled_for_utc && body.scheduled_for_utc.trim().length > 0
      ? new Date(body.scheduled_for_utc)
      : null;
  const scheduledForIso =
    parsedSchedule && !Number.isNaN(parsedSchedule.getTime())
      ? parsedSchedule.toISOString()
      : null;

  const normalizedRecipientEmail =
    body.recipient_email?.trim().toLowerCase() ||
    body.recipient_phone?.trim().toLowerCase() ||
    null;

  const insertWithTimezone = {
    sender_id: user.id,
    // Keep both fields in sync while legacy UI still reads recipient_phone.
    recipient_email: normalizedRecipientEmail,
    recipient_phone: normalizedRecipientEmail,
    message_body: body.message_body?.trim() || null,
    scheduled_for_utc: scheduledForIso,
    delivery_timezone: body.delivery_timezone?.trim() || null,
    status: "draft",
  };

  const insertWithoutTimezone = {
    sender_id: user.id,
    recipient_email: normalizedRecipientEmail,
    recipient_phone: normalizedRecipientEmail,
    message_body: body.message_body?.trim() || null,
    scheduled_for_utc: scheduledForIso,
    status: "draft",
  };

  let insertResult: any = await supabase
    .from("moments")
    .insert(insertWithTimezone)
    .select()
    .single();

  if (isMissingColumnError(insertResult.error, "delivery_timezone")) {
    insertResult = await supabase
      .from("moments")
      .insert(insertWithoutTimezone)
      .select()
      .single();
  }

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    moment: {
      ...insertResult.data,
      delivery_timezone: insertResult.data.delivery_timezone ?? null,
    },
  });
}
