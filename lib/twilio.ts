import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromNumber = process.env.TWILIO_FROM_NUMBER!;

if (!accountSid || !authToken || !fromNumber) {
  throw new Error("Missing Twilio environment variables");
}

export const twilioClient = Twilio(accountSid, authToken);

export async function sendSMS({
  to,
  body,
}: {
  to: string;
  body: string;
}) {
  return twilioClient.messages.create({
    from: fromNumber,
    to,
    body,
  });
}
