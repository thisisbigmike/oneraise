/**
 * Multi-channel notifications: SMS + WhatsApp.
 *
 * Mirrors the provider-abstraction style of `email.ts`. Africa-first: WhatsApp
 * and SMS reach this market where email does not.
 *
 * Design rules:
 * - Best-effort. A failed notification must NEVER throw into a payment/payout
 *   flow. Senders return a result object and log on failure instead of throwing.
 * - Provider chosen from env, like the email module. No new npm deps — raw fetch.
 *
 * Providers:
 *   SMS:      termii (Nigeria-optimized) | twilio
 *   WhatsApp: meta (WhatsApp Cloud API) | twilio
 */

type Channel = "sms" | "whatsapp";

export type NotifyResult = {
  channel: Channel;
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

const TERMII_SMS_URL = "https://api.ng.termii.com/api/sms/send";
const META_GRAPH_VERSION = "v21.0";

/** Normalize a phone number to E.164-ish (digits with leading +). Best-effort. */
export function normalizePhone(raw: string, defaultCountryCode = "234"): string | null {
  if (!raw) return null;
  const s = raw.replace(/[^\d+]/g, "");
  if (!s) return null;

  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return `+${s.slice(2)}`;
  // Local Nigerian format e.g. 080... -> +23480...
  if (s.startsWith("0")) return `+${defaultCountryCode}${s.slice(1)}`;
  if (s.startsWith(defaultCountryCode)) return `+${s}`;
  return `+${s}`;
}

// ---------------------------------------------------------------------------
// SMS
// ---------------------------------------------------------------------------

type SmsProvider = "termii" | "twilio";

function getSmsProvider(): SmsProvider | null {
  const explicit = process.env.SMS_PROVIDER?.trim().toLowerCase();
  if (explicit === "termii" && process.env.TERMII_API_KEY) return "termii";
  if (explicit === "twilio" && process.env.TWILIO_ACCOUNT_SID) return "twilio";
  if (process.env.TERMII_API_KEY) return "termii";
  if (process.env.TWILIO_ACCOUNT_SID) return "twilio";
  return null;
}

async function sendSmsTermii(to: string, text: string): Promise<void> {
  const res = await fetch(TERMII_SMS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      from: process.env.TERMII_SENDER_ID || "OneRaise",
      sms: text,
      type: "plain",
      channel: process.env.TERMII_CHANNEL || "generic",
      api_key: process.env.TERMII_API_KEY,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Termii SMS failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
}

async function sendSmsTwilio(to: string, text: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  const from = process.env.TWILIO_SMS_FROM || "";
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: from, Body: text });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twilio SMS failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
}

export async function sendSms(toRaw: string, text: string): Promise<NotifyResult> {
  const to = normalizePhone(toRaw);
  if (!to) return { channel: "sms", ok: false, skipped: true, error: "no phone" };

  const provider = getSmsProvider();
  if (!provider) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] SMS to ${to}:\n${text}`);
      return { channel: "sms", ok: true, skipped: true };
    }
    return { channel: "sms", ok: false, skipped: true, error: "no SMS provider configured" };
  }

  try {
    if (provider === "termii") await sendSmsTermii(to, text);
    else await sendSmsTwilio(to, text);
    return { channel: "sms", ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[notify] SMS error: ${message}`);
    return { channel: "sms", ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------

type WhatsappProvider = "meta" | "twilio";

function getWhatsappProvider(): WhatsappProvider | null {
  const explicit = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase();
  if (explicit === "meta" && process.env.WHATSAPP_PHONE_NUMBER_ID) return "meta";
  if (explicit === "twilio" && process.env.TWILIO_ACCOUNT_SID) return "twilio";
  if (process.env.WHATSAPP_PHONE_NUMBER_ID) return "meta";
  if (process.env.TWILIO_WHATSAPP_FROM && process.env.TWILIO_ACCOUNT_SID) return "twilio";
  return null;
}

/**
 * Meta WhatsApp Cloud API.
 * Note: outside the 24h customer-service window, WhatsApp only allows pre-approved
 * message templates. Pass `templateName` (+ optional body params) for those; plain
 * `text` works only inside an active session window.
 */
async function sendWhatsappMeta(
  to: string,
  text: string,
  templateName?: string,
  templateParams?: string[],
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`;

  // Meta expects the number without a leading '+'.
  const toDigits = to.replace(/^\+/, "");

  const body = templateName
    ? {
        messaging_product: "whatsapp",
        to: toDigits,
        type: "template",
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
          components: templateParams?.length
            ? [
                {
                  type: "body",
                  parameters: templateParams.map((t) => ({ type: "text", text: t })),
                },
              ]
            : undefined,
        },
      }
    : {
        messaging_product: "whatsapp",
        to: toDigits,
        type: "text",
        text: { body: text },
      };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.text();
    throw new Error(`Meta WhatsApp failed: HTTP ${res.status} ${payload.slice(0, 200)}`);
  }
}

async function sendWhatsappTwilio(to: string, text: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  const from = process.env.TWILIO_WHATSAPP_FROM || "";
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    Body: text,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twilio WhatsApp failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
}

export async function sendWhatsapp(
  toRaw: string,
  text: string,
  opts?: { templateName?: string; templateParams?: string[] },
): Promise<NotifyResult> {
  const to = normalizePhone(toRaw);
  if (!to) return { channel: "whatsapp", ok: false, skipped: true, error: "no phone" };

  const provider = getWhatsappProvider();
  if (!provider) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] WhatsApp to ${to}:\n${text}`);
      return { channel: "whatsapp", ok: true, skipped: true };
    }
    return { channel: "whatsapp", ok: false, skipped: true, error: "no WhatsApp provider configured" };
  }

  try {
    if (provider === "meta") {
      await sendWhatsappMeta(to, text, opts?.templateName, opts?.templateParams);
    } else {
      await sendWhatsappTwilio(to, text);
    }
    return { channel: "whatsapp", ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[notify] WhatsApp error: ${message}`);
    return { channel: "whatsapp", ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// High-level recipient dispatch
// ---------------------------------------------------------------------------

export type NotifyRecipient = {
  phone?: string | null;
  /** User notification preferences. Defaults to enabled when undefined. */
  whatsappNotifications?: boolean | null;
  smsNotifications?: boolean | null;
};

/**
 * Send a short text to a recipient across their enabled phone channels.
 * Tries WhatsApp first (richer, cheaper, preferred in market), falls back to SMS
 * only if WhatsApp is disabled or unavailable. Best-effort; never throws.
 */
export async function notifyRecipient(
  recipient: NotifyRecipient,
  text: string,
  opts?: { whatsappTemplate?: string; whatsappParams?: string[]; forceBothChannels?: boolean },
): Promise<NotifyResult[]> {
  const results: NotifyResult[] = [];
  if (!recipient.phone) return results;

  const wantsWhatsapp = recipient.whatsappNotifications !== false;
  const wantsSms = recipient.smsNotifications !== false;

  let whatsappOk = false;
  if (wantsWhatsapp) {
    const r = await sendWhatsapp(recipient.phone, text, {
      templateName: opts?.whatsappTemplate,
      templateParams: opts?.whatsappParams,
    });
    results.push(r);
    whatsappOk = r.ok && !r.skipped;
  }

  // Fall back to SMS if WhatsApp didn't actually deliver (or caller forces both).
  if (wantsSms && (opts?.forceBothChannels || !whatsappOk)) {
    results.push(await sendSms(recipient.phone, text));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Event helpers — short, WhatsApp/SMS-friendly copy
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export function donationReceiptText(amount: string, campaignTitle: string): string {
  return `OneRaise: thank you! Your donation of ${amount} to "${campaignTitle}" is confirmed. Track impact: ${APP_URL}`;
}

export function milestoneReleasedText(campaignTitle: string, milestone: string): string {
  return `OneRaise: a milestone was verified and funds released for "${campaignTitle}" — ${milestone}. See proof: ${APP_URL}`;
}

export function payoutStatusText(status: string, amount: string): string {
  return `OneRaise: your payout of ${amount} is now "${status}". Details: ${APP_URL}/dashboard/payouts`;
}
