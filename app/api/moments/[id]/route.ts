import { NextResponse } from "next/server";
import { isMissingColumnError } from "@/lib/supabaseColumnErrors";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = {
  action?: unknown;
  is_featured?: unknown;
  scheduled_for_utc?: unknown;
  delivery_timezone?: unknown;
};

function parseIso(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  return null;
}

async function getOwnedMoment(id: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: existing, error: existingError } = await supabase
    .from("moments")
    .select("*")
    .eq("id", id)
    .eq("sender_id", user.id)
    .maybeSingle();

  if (existingError || !existing) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { supabase, user, existing };
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const owner = await getOwnedMoment(id);
  if ("error" in owner) return owner.error;

  const { supabase, user, existing } = owner;
  if (existing.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft moments can be edited." },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | {
        message_body?: string | null;
        scheduled_for_utc?: string | null;
        delivery_timezone?: string | null;
        recipient_email?: string | null;
        recipient_phone?: string | null;
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const scheduledIso =
    body.scheduled_for_utc === null ? null : parseIso(body.scheduled_for_utc);

  if (body.scheduled_for_utc && !scheduledIso) {
    return NextResponse.json(
      { error: "Invalid schedule value." },
      { status: 400 }
    );
  }

  const normalizedRecipientEmail =
    body.recipient_email?.trim().toLowerCase() ||
    body.recipient_phone?.trim().toLowerCase() ||
    null;

  const updateWithTimezone = {
    message_body: body.message_body?.trim() || null,
    scheduled_for_utc: scheduledIso,
    delivery_timezone: body.delivery_timezone?.trim() || null,
    recipient_email: normalizedRecipientEmail,
    // Keep both fields in sync while legacy UI still reads recipient_phone.
    recipient_phone: normalizedRecipientEmail,
  };

  const updateWithoutTimezone = {
    message_body: body.message_body?.trim() || null,
    scheduled_for_utc: scheduledIso,
    recipient_email: normalizedRecipientEmail,
    recipient_phone: normalizedRecipientEmail,
  };

  let updateResult: any = await supabase
    .from("moments")
    .update(updateWithTimezone)
    .eq("id", id)
    .eq("sender_id", user.id)
    .select("*")
    .single();

  if (isMissingColumnError(updateResult.error, "delivery_timezone")) {
    updateResult = await supabase
      .from("moments")
      .update(updateWithoutTimezone)
      .eq("id", id)
      .eq("sender_id", user.id)
      .select("*")
      .single();
  }

  if (updateResult.error) {
    return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    moment: {
      ...updateResult.data,
      delivery_timezone: updateResult.data.delivery_timezone ?? null,
    },
  });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const owner = await getOwnedMoment(id);
  if ("error" in owner) return owner.error;

  const { supabase, user, existing } = owner;
  const body = (await req.json().catch(() => null)) as PatchBody | null;

  if (!body || typeof body.action !== "string") {
    return NextResponse.json(
      { error: "Missing action in request." },
      { status: 400 }
    );
  }

  if (body.action === "set_featured") {
    const featureValue = normalizeBoolean(body.is_featured);
    if (featureValue === null) {
      return NextResponse.json(
        { error: "is_featured must be true or false." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("moments")
      .update({ is_featured: featureValue })
      .eq("id", id)
      .eq("sender_id", user.id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ moment: data });
  }

  if (body.action === "duplicate") {
    const duplicateWithTimezone = {
      sender_id: user.id,
      recipient_email: existing.recipient_email,
      recipient_phone: existing.recipient_phone,
      message_body: existing.message_body,
      scheduled_for_utc: existing.scheduled_for_utc,
      delivery_timezone: existing.delivery_timezone ?? null,
      media_url: existing.media_url ?? null,
      status: "draft",
    };

    const duplicateWithoutTimezone = {
      sender_id: user.id,
      recipient_email: existing.recipient_email,
      recipient_phone: existing.recipient_phone,
      message_body: existing.message_body,
      scheduled_for_utc: existing.scheduled_for_utc,
      media_url: existing.media_url ?? null,
      status: "draft",
    };

    let duplicateResult: any = await supabase
      .from("moments")
      .insert(duplicateWithTimezone)
      .select("id, status")
      .single();

    if (isMissingColumnError(duplicateResult.error, "delivery_timezone")) {
      duplicateResult = await supabase
        .from("moments")
        .insert(duplicateWithoutTimezone)
        .select("id, status")
        .single();
    }

    if (duplicateResult.error) {
      return NextResponse.json({ error: duplicateResult.error.message }, { status: 500 });
    }
    return NextResponse.json({ moment: duplicateResult.data });
  }

  if (body.action === "reschedule") {
    const scheduledIso = parseIso(body.scheduled_for_utc);
    if (!scheduledIso) {
      return NextResponse.json(
        { error: "A valid date and time is required." },
        { status: 400 }
      );
    }

    const nextTimezone =
      typeof body.delivery_timezone === "string" && body.delivery_timezone.trim()
        ? body.delivery_timezone.trim()
        : existing.delivery_timezone ?? null;

    let rescheduleResult: any = await supabase
      .from("moments")
      .update({
        scheduled_for_utc: scheduledIso,
        delivery_timezone: nextTimezone,
      })
      .eq("id", id)
      .eq("sender_id", user.id)
      .select("*")
      .single();

    if (isMissingColumnError(rescheduleResult.error, "delivery_timezone")) {
      rescheduleResult = await supabase
        .from("moments")
        .update({ scheduled_for_utc: scheduledIso })
        .eq("id", id)
        .eq("sender_id", user.id)
        .select("*")
        .single();
    }

    if (rescheduleResult.error) {
      return NextResponse.json({ error: rescheduleResult.error.message }, { status: 500 });
    }
    return NextResponse.json({
      moment: {
        ...rescheduleResult.data,
        delivery_timezone: rescheduleResult.data.delivery_timezone ?? null,
      },
    });
  }

  if (body.action === "cancel_schedule") {
    const { data, error } = await supabase
      .from("moments")
      .update({
        status: "draft",
        public_id: null,
        access_token_hash: null,
        token_expires_at: null,
        revealed_at: null,
      })
      .eq("id", id)
      .eq("sender_id", user.id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ moment: data });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const owner = await getOwnedMoment(id);
  if ("error" in owner) return owner.error;

  const { supabase, user } = owner;
  const { error } = await supabase
    .from("moments")
    .delete()
    .eq("id", id)
    .eq("sender_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
