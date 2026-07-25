import dns from 'node:dns';
import nextEnv from '@next/env';
import { Resend } from 'resend';

try { dns.setDefaultResultOrder('ipv4first'); } catch {}

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

async function sendWithResendAttempt() {
  if (!resendApiKey) throw new Error('Set RESEND_API_KEY in .env before sending a Resend test email.');

  const https = await import('node:https');

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ from, to, subject, html });
    const req = https.request('https://api.resend.com/emails', {
      method: 'POST',
      family: 4,
      servername: 'api.resend.com',
      headers: {
        'Host': 'api.resend.com',
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Connection': 'close',
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Sent Resend test email to ${to}. Response: ${body}`);
          resolve();
        } else {
          reject(new Error(`Resend test email failed (HTTP ${res.statusCode}): ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sendWithResend() {
  try {
    await sendWithResendAttempt();
  } catch (err) {
    if (err.message.includes('socket hang up') || err.message.includes('ECONNRESET')) {
      await new Promise(r => setTimeout(r, 500));
      await sendWithResendAttempt();
      return;
    }
    throw err;
  }
}

if (provider === 'brevo' || (!provider && brevoApiKey)) {
  await sendWithBrevo();
} else {
  await sendWithResend();
}
