import { NextRequest, NextResponse } from "next/server";
import { isMissingColumnError } from "@/lib/supabaseColumnErrors";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { randomPublicId } from "@/lib/momentDelivery";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function getMomentIdFromUrl(url: string) {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  const momentsIndex = parts.indexOf("moments");
  if (momentsIndex === -1) return null;
  const id = parts[momentsIndex + 1];
  const publish = parts[momentsIndex + 2];
  if (!id || publish !== "publish") return null;
  return id;
}

type PublishRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: PublishRouteContext) {
  const params = await context.params;
  const momentId = params?.id ?? getMomentIdFromUrl(req.url);

  if (!momentId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing moment id in route params",
        params: params ?? null,
        url: req.url,
      },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let existingResult: any = await supabase
    .from("moments")
    .select(
      "id, status, public_id, recipient_email, recipient_phone, message_body, scheduled_for_utc, delivery_timezone"
    )
    .eq("id", momentId)
    .eq("sender_id", user.id)
    .single();

  if (isMissingColumnError(existingResult.error, "delivery_timezone")) {
    existingResult = await supabase
      .from("moments")
      .select(
        "id, status, public_id, recipient_email, recipient_phone, message_body, scheduled_for_utc"
      )
      .eq("id", momentId)
      .eq("sender_id", user.id)
      .single();
  }

  if (existingResult.error || !existingResult.data) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const existing = {
    ...existingResult.data,
    delivery_timezone: existingResult.data.delivery_timezone ?? null,
  };

  if (existing.status === "published" || existing.status === "sent") {
    return NextResponse.json({
      ok: true,
      moment: {
        id: existing.id,
        public_id: existing.public_id,
        status: existing.status,
      },
      alreadyScheduled: true,
    });
  }

  if (existing.status !== "draft") {
    return NextResponse.json({ ok: false, error: "Unsupported moment status." }, { status: 400 });
  }

  if (!existing.message_body?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Message is required before scheduling." },
      { status: 400 }
    );
  }

  const recipientEmail =
    existing.recipient_email?.trim().toLowerCase() ??
    existing.recipient_phone?.trim().toLowerCase() ??
    "";

  if (!recipientEmail) {
    return NextResponse.json(
      { ok: false, error: "Recipient email is required before scheduling." },
      { status: 400 }
    );
  }

  if (!EMAIL_REGEX.test(recipientEmail)) {
    return NextResponse.json(
      { ok: false, error: "Recipient email is invalid." },
      { status: 400 }
    );
  }

  if (!existing.scheduled_for_utc) {
    return NextResponse.json(
      { ok: false, error: "Schedule date, time, and timezone are required before scheduling." },
      { status: 400 }
    );
  }

  const public_id = existing.public_id ?? randomPublicId(6);

  let updateResult: any = await supabase
    .from("moments")
    .update({
      public_id,
      status: "published",
    })
    .eq("id", momentId)
    .eq("sender_id", user.id)
    .select("id, public_id, status, scheduled_for_utc, delivery_timezone")
    .single();

  if (isMissingColumnError(updateResult.error, "delivery_timezone")) {
    updateResult = await supabase
      .from("moments")
      .update({
        public_id,
        status: "published",
      })
      .eq("id", momentId)
      .eq("sender_id", user.id)
      .select("id, public_id, status, scheduled_for_utc")
      .single();
  }

  if (updateResult.error) {
    return NextResponse.json({ ok: false, error: updateResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    moment: {
      ...updateResult.data,
      delivery_timezone: updateResult.data.delivery_timezone ?? null,
    },
  });
}
