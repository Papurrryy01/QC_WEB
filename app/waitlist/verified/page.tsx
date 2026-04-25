import VerifiedClient from "./VerifiedClient";
import { resolveWaitlistVerification } from "@/lib/waitlistVerify";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type WaitlistVerifiedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParamValue(value: string | string[] | undefined) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && value[0]) return value[0].trim();
  return "";
}

function buildRequestUrl(token: string, signupId: string) {
  const query = new URLSearchParams();
  if (token) query.set("token", token);
  if (signupId) query.set("signup", signupId);
  return `https://qcapp.co/waitlist/verified?${query.toString()}`;
}

export default async function WaitlistVerifiedPage({
  searchParams,
}: WaitlistVerifiedPageProps) {
  const params = await searchParams;
  const token = firstParamValue(params.token);
  const signupCandidate = firstParamValue(params.signup);
  const signupFromQuery = UUID_REGEX.test(signupCandidate) ? signupCandidate : "";

  // New flow: email link points directly here with token + signup.
  if (token) {
    const verification = await resolveWaitlistVerification(
      buildRequestUrl(token, signupFromQuery)
    );

    if (!verification.ok) {
      return <VerifiedClient signupId="" invalidReason={verification.state} />;
    }

    return <VerifiedClient signupId={verification.signupId} />;
  }

  // Backward-compatible: verified redirect may include only signup.
  if (signupFromQuery) {
    return <VerifiedClient signupId={signupFromQuery} />;
  }

  return <VerifiedClient signupId="" invalidReason="missing" />;
}
