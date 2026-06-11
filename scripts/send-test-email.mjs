import { loadEnvConfig } from '@next/env';
import { Resend } from 'resend';

loadEnvConfig(process.cwd());

const apiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.EMAIL_FROM?.trim() || 'onboarding@resend.dev';
const to = process.env.RESEND_TEST_TO?.trim() || 'oneraise2026@gmail.com';

if (!apiKey) {
  throw new Error('Set RESEND_API_KEY in .env.local before sending a test email.');
}

const resend = new Resend(apiKey);

const { data, error } = await resend.emails.send({
  from,
  to,
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
});

if (error) {
  throw new Error(`Resend test email failed: ${error.message}`);
}

console.log(`Sent test email to ${to}. Message id: ${data?.id ?? 'unknown'}`);
