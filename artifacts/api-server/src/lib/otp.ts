import twilio from "twilio";

const OTP_PROVIDER = process.env["OTP_PROVIDER"] || "twilio";
const TWILIO_ACCOUNT_SID = process.env["TWILIO_ACCOUNT_SID"];
const TWILIO_AUTH_TOKEN = process.env["TWILIO_AUTH_TOKEN"];
const TWILIO_VERIFY_SERVICE_SID = process.env["TWILIO_VERIFY_SERVICE_SID"];

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    throw {
      status: 503,
      message:
        "Phone authentication provider is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID environment variables.",
      code: "OTP_PROVIDER_NOT_CONFIGURED",
    };
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export async function sendOTP(phoneNumber: string): Promise<void> {
  if (OTP_PROVIDER !== "twilio") {
    throw {
      status: 503,
      message: `OTP provider '${OTP_PROVIDER}' is not supported. Set OTP_PROVIDER=twilio and configure Twilio credentials.`,
      code: "OTP_PROVIDER_NOT_SUPPORTED",
    };
  }
  const client = getTwilioClient();
  await client.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID!)
    .verifications.create({ to: phoneNumber, channel: "sms" });
}

export async function verifyOTP(
  phoneNumber: string,
  code: string
): Promise<boolean> {
  if (OTP_PROVIDER !== "twilio") {
    throw {
      status: 503,
      message: `OTP provider '${OTP_PROVIDER}' is not supported.`,
      code: "OTP_PROVIDER_NOT_SUPPORTED",
    };
  }
  const client = getTwilioClient();
  const result = await client.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID!)
    .verificationChecks.create({ to: phoneNumber, code });
  return result.status === "approved";
}
