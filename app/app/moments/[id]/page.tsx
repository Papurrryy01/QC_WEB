import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import EditMomentClient from "./EditMomentClient";

export default async function EditMomentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const { data: moment, error } = await supabase
    .from("moments")
    .select("*")
    .eq("id", id)
    .eq("sender_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="qc-status qc-status--danger">
        Error loading moment: {error.message}
      </div>
    );
  }

  if (!moment) notFound();

  return (
    <EditMomentClient
      moment={{
        id: moment.id,
        message_body: moment.message_body,
        scheduled_for_utc: moment.scheduled_for_utc,
        delivery_timezone: moment.delivery_timezone ?? null,
        status: moment.status,
        created_at: moment.created_at,
        public_id: moment.public_id,
        recipient_email: moment.recipient_email ?? null,
        recipient_phone: moment.recipient_phone,
        is_featured: moment.is_featured ?? false,
        category: moment.category ?? null,
        media_url: moment.media_url ?? null,
      }}
      justSent={query.sent === "1"}
    />
  );
}
