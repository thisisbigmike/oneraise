import { Resend } from 'resend';

const BREVO_EMAILS_URL = 'https://api.brevo.com/v3/smtp/email';
const DEFAULT_DEV_FROM = 'OneRaise <onboarding@resend.dev>';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

type EmailProvider = 'brevo' | 'resend';

type EmailConfig = {
  apiKey: string;
  from: string;
  provider: EmailProvider;
};

type BrevoErrorResponse = {
  code?: string;
  message?: string;
};

function getEmailConfig(): EmailConfig | null {
  const configuredProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase() || 'resend';
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || '';
  const brevoApiKey = process.env.BREVO_API_KEY?.trim() || '';
  const from = process.env.EMAIL_FROM?.trim() || '';

  if ((configuredProvider === 'resend' || !configuredProvider) && resendApiKey) {
    return {
      apiKey: resendApiKey,
      from: from || DEFAULT_DEV_FROM,
      provider: 'resend',
    };
  }

  if (brevoApiKey) {
    return {
      apiKey: brevoApiKey,
      from: from || DEFAULT_DEV_FROM,
      provider: 'brevo',
    };
  }

  if (resendApiKey) {
    return {
      apiKey: resendApiKey,
      from: from || DEFAULT_DEV_FROM,
      provider: 'resend',
    };
  }

  return null;
}

function requireProductionSender(config: EmailConfig) {
  if (process.env.NODE_ENV === 'production' && (!config.from || config.from === DEFAULT_DEV_FROM)) {
    throw new Error('Email service is not configured correctly.');
  }
}

function parseSender(from: string) {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (!match) return { email: from.trim(), name: undefined };

  const name = match[1].trim().replace(/^"|"$/g, '');
  return {
    email: match[2].trim(),
    name: name || undefined,
  };
}

async function readJsonBody<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function sendWithBrevo(config: EmailConfig, email: string, subject: string, html: string, text: string) {
  const sender = parseSender(config.from);
  const res = await fetch(BREVO_EMAILS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify({
      sender,
      to: [{ email }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const payload = await readJsonBody<BrevoErrorResponse>(res);
    throw new Error(`Brevo email failed: ${payload?.message || payload?.code || `HTTP ${res.status}`}`);
  }
}

async function sendWithResend(config: EmailConfig, email: string, subject: string, html: string, text: string) {
  const resend = new Resend(config.apiKey);
  const { error } = await resend.emails.send({
    from: config.from,
    to: [email],
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }
}

export async function sendEmailVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/api/email-verify/confirm?token=${token}&email=${encodeURIComponent(email)}`;
  const config = getEmailConfig();

  if (!config) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email service is not configured correctly.');
    }
    console.log(`[DEV] Email verification link for ${email}:\n${url}`);
    return;
  }
  requireProductionSender(config);

  const subject = 'Verify your email - OneRaise';
  const text = [
    'Verify your email',
    '',
    'Click the link below to verify your OneRaise email address. This link expires in 24 hours.',
    url,
    '',
    "If you didn't request this, ignore this email.",
  ].join('\n');

  const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="margin-bottom:8px;">Verify your email</h2>
        <p style="color:#555;margin-bottom:24px;">Click the button below to verify your email address. Link expires in 24 hours.</p>
        <a href="${url}" style="display:inline-block;background:#1d9e75;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Verify Email</a>
        <p style="color:#999;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email.</p>
      </div>
    `;

  if (config.provider === 'brevo') {
    await sendWithBrevo(config, email, subject, html, text);
    return;
  }

  await sendWithResend(config, email, subject, html, text);
}
