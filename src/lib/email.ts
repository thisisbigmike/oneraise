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

import fs from 'node:fs';
import path from 'node:path';

function getEnvValue(key: string): string {
  const val = process.env[key]?.trim();
  if (val) return val;
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(new RegExp(`^${key}=["']?(.*?)["']?$`, 'm'));
      if (match && match[1].trim()) return match[1].trim();
    }
  } catch {}
  return '';
}

function getEmailConfig(): EmailConfig | null {
  const configuredProvider = getEnvValue('EMAIL_PROVIDER').toLowerCase() || 'resend';
  const resendApiKey = getEnvValue('RESEND_API_KEY');
  const brevoApiKey = getEnvValue('BREVO_API_KEY');
  const from = getEnvValue('EMAIL_FROM');

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

import dns from 'node:dns';
import https from 'node:https';

try { dns.setDefaultResultOrder('ipv4first'); } catch {}

async function sendWithResendAttempt(config: EmailConfig, email: string, subject: string, html: string, text: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const postData = JSON.stringify({
      from: config.from,
      to: [email],
      subject,
      html,
      text,
    });

    const req = https.request('https://api.resend.com/emails', {
      method: 'POST',
      family: 4,
      servername: 'api.resend.com',
      headers: {
        'Host': 'api.resend.com',
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Connection': 'close',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          try {
            const parsed = JSON.parse(data);
            const msg = parsed.message || parsed.name || data;
            reject(new Error(`Resend email failed: ${msg}`));
          } catch {
            reject(new Error(`Resend email failed: HTTP ${res.statusCode} - ${data}`));
          }
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Resend connection failed: ${err.message}`));
    });

    req.write(postData);
    req.end();
  });
}

async function sendWithResend(config: EmailConfig, email: string, subject: string, html: string, text: string) {
  try {
    await sendWithResendAttempt(config, email, subject, html, text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('connection failed') || msg.includes('socket hang up') || msg.includes('ECONNRESET')) {
      await new Promise(r => setTimeout(r, 500));
      await sendWithResendAttempt(config, email, subject, html, text);
      return;
    }
    throw err;
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

  try {
    requireProductionSender(config);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Sender check bypassed. Verification link for ${email}:\n${url}`);
      return;
    }
    throw err;
  }

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

  try {
    if (config.provider === 'brevo') {
      await sendWithBrevo(config, email, subject, html, text);
      return;
    }

    await sendWithResend(config, email, subject, html, text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTestingLimit = msg.includes('only send testing emails') || msg.includes('resend.com/domains');

    if (process.env.NODE_ENV !== 'production' || isTestingLimit) {
      console.warn(`[EMAIL WARNING] Email delivery skipped/failed (${msg}).\n[DEV VERIFICATION LINK] for ${email}:\n${url}`);
      if (process.env.NODE_ENV !== 'production' || isTestingLimit) {
        return;
      }
    }
    throw err;
  }
}

export async function sendPasswordResetEmail(email: string, code: string) {
  const config = getEmailConfig();

  if (!config) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email service is not configured correctly.');
    }
    console.log(`[DEV] Password reset code for ${email}: ${code}`);
    return;
  }

  try {
    requireProductionSender(config);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Password reset code for ${email}: ${code}`);
      return;
    }
    throw err;
  }

  const subject = `Your OneRaise Password Reset Code: ${code}`;
  const text = [
    'Reset your password',
    '',
    `Your 6-digit password reset code is: ${code}`,
    '',
    'This code expires in 10 minutes.',
    "If you didn't request a password reset, you can safely ignore this email.",
  ].join('\n');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1b14;color:#ffffff;border-radius:12px;">
      <div style="font-size:20px;font-weight:800;color:#ffffff;margin-bottom:24px;">One<span style="color:#1d9e75;">Raise</span></div>
      <h2 style="margin:0 0 12px 0;font-size:22px;color:#ffffff;">Password Reset Request</h2>
      <p style="color:#a8b5ae;font-size:14px;line-height:1.6;margin-bottom:24px;">Enter the 6-digit code below to reset your OneRaise password. Code expires in 10 minutes.</p>
      <div style="background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.3);border-radius:8px;padding:16px;text-align:center;margin-bottom:24px;">
        <span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#5dcaa5;font-family:monospace;">${code}</span>
      </div>
      <p style="color:#6b7c73;font-size:12px;margin:0;">If you didn't request this code, your account is safe and you can ignore this email.</p>
    </div>
  `;

  try {
    if (config.provider === 'brevo') {
      await sendWithBrevo(config, email, subject, html, text);
      return;
    }

    await sendWithResend(config, email, subject, html, text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTestingLimit = msg.includes('only send testing emails') || msg.includes('resend.com/domains');

    if (process.env.NODE_ENV !== 'production' || isTestingLimit) {
      console.warn(`[EMAIL WARNING] Email delivery skipped/failed (${msg}).\n[DEV RESET CODE] for ${email}: ${code}`);
      if (process.env.NODE_ENV !== 'production' || isTestingLimit) {
        return;
      }
    }
    throw err;
  }
}
