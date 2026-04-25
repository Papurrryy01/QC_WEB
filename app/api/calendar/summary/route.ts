import { NextResponse } from "next/server";
import { isMissingColumnError } from "@/lib/supabaseColumnErrors";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type CalendarMomentRow = {
  id: string;
  message_body: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  scheduled_for_utc: string | null;
  status: string | null;
  delivery_timezone: string | null;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let momentsResult: any = await supabase
    .from("moments")
    .select("id,message_body,recipient_phone,recipient_email,scheduled_for_utc,status,delivery_timezone")
    .eq("sender_id", user.id)
    .not("scheduled_for_utc", "is", null)
    .neq("status", "draft")
    .order("scheduled_for_utc", { ascending: true })
    .limit(1500);

  if (isMissingColumnError(momentsResult.error, "delivery_timezone")) {
    momentsResult = await supabase
      .from("moments")
      .select("id,message_body,recipient_phone,recipient_email,scheduled_for_utc,status")
      .eq("sender_id", user.id)
      .not("scheduled_for_utc", "is", null)
      .neq("status", "draft")
      .order("scheduled_for_utc", { ascending: true })
      .limit(1500);
  }

  if (momentsResult.error) {
    return NextResponse.json({ error: momentsResult.error.message }, { status: 500 });
  }

  const moments = ((momentsResult.data ?? []) as CalendarMomentRow[])
    .map((moment) => ({ ...moment, delivery_timezone: moment.delivery_timezone ?? null }))
    .filter(
      (moment) => moment.scheduled_for_utc && !Number.isNaN(Date.parse(moment.scheduled_for_utc))
    );

  return NextResponse.json({ moments });
}
