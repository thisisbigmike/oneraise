import nextEnv from '@next/env';
import { Resend } from 'resend';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
const brevoApiKey = process.env.BREVO_API_KEY?.trim();
const resendApiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.EMAIL_FROM?.trim() || 'onboarding@resend.dev';
const to = process.env.RESEND_TEST_TO?.trim() || 'oneraise2026@gmail.com';
const subject = 'Hello World';
const html = '<p>Congrats on sending your <strong>first email</strong>!</p>';

function parseSender(value) {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (!match) return { email: value.trim() };
  const name = match[1].trim().replace(/^"|"$/g, '');
  return { email: match[2].trim(), ...(name ? { name } : {}) };
}

async function sendWithBrevo() {
  if (!brevoApiKey) throw new Error('Set BREVO_API_KEY in .env.local before sending a Brevo test email.');

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': brevoApiKey,
    },
    body: JSON.stringify({
      sender: parseSender(from),
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo test email failed: ${body || `HTTP ${res.status}`}`);
  }

  console.log(`Sent Brevo test email to ${to}.`);
}

async function sendWithResend() {
  if (!resendApiKey) throw new Error('Set RESEND_API_KEY in .env.local before sending a Resend test email.');

  const resend = new Resend(resendApiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend test email failed: ${error.message}`);
  }

  console.log(`Sent Resend test email to ${to}. Message id: ${data?.id ?? 'unknown'}`);
}

if (provider === 'brevo' || (!provider && brevoApiKey)) {
  await sendWithBrevo();
} else {
  await sendWithResend();
}
