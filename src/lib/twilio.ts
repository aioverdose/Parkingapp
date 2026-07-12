import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  if (!client) client = twilio(accountSid, authToken);
  return client;
}

export function isTwilioConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const twilioClient = getTwilioClient();
  if (!twilioClient) return false;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) return false;
  try {
    await twilioClient.messages.create({ to, from, body });
    return true;
  } catch {
    return false;
  }
}
