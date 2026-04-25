import { processDueMomentsWithClient, type ProcessDueMomentsResult } from "./deliveryWorkerCore";
import { createSupabaseAdminClient } from "./supabaseAdmin";

type ProcessDueMomentsOptions = {
  siteBaseUrl: string;
  limit?: number;
};

export async function processDueMoments({
  siteBaseUrl,
  limit = 50,
}: ProcessDueMomentsOptions): Promise<ProcessDueMomentsResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.MOMENT_EMAIL_FROM ?? process.env.WAITLIST_EMAIL_FROM;

  if (!resendApiKey || !fromEmail) {
    throw new Error("Missing RESEND_API_KEY or MOMENT_EMAIL_FROM");
  }

  return processDueMomentsWithClient({
    supabase: createSupabaseAdminClient(),
    siteBaseUrl,
    resendApiKey,
    fromEmail,
    limit,
  });
}

export type { ProcessDueMomentsResult } from "./deliveryWorkerCore";
