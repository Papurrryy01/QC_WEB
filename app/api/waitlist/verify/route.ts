import { NextResponse } from "next/server";
import { resolveWaitlistVerification } from "@/lib/waitlistVerify";

export const runtime = "nodejs";

function getSiteBaseUrl(req: Request) {
  const configured =
    process.env.WAITLIST_VERIFY_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  return new URL(configured ?? new URL(req.url).origin);
}

function redirectToLanding(req: Request, state: string) {
  const url = new URL("/", getSiteBaseUrl(req));
  url.searchParams.set("verify", state);
  return NextResponse.redirect(url);
}

function redirectToQuestionnaire(req: Request, signupId: string) {
  const url = new URL("/waitlist/verified", getSiteBaseUrl(req));
  url.searchParams.set("signup", signupId);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const result = await resolveWaitlistVerification(req.url);

  if (!result.ok) {
    return redirectToLanding(req, result.state);
  }

  return redirectToQuestionnaire(req, result.signupId);
}
