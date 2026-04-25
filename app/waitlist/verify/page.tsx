import { redirect } from "next/navigation";
import { resolveWaitlistVerification } from "@/lib/waitlistVerify";

export const runtime = "nodejs";

type VerifyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toQueryString(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0) {
      query.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      query.set(key, value[0]);
    }
  }

  return query.toString();
}

export default async function WaitlistVerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const query = toQueryString(params);
  const requestUrl = `https://qcapp.co/waitlist/verify${query ? `?${query}` : ""}`;

  const result = await resolveWaitlistVerification(requestUrl);

  if (!result.ok) {
    redirect(`/?verify=${result.state}`);
  }

  redirect(`/waitlist/verified?signup=${result.signupId}`);
}
