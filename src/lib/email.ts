import { Resend } from 'resend';

const DEFAULT_DEV_FROM = 'OneRaise <onboarding@resend.dev>';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() || '';
  const from = process.env.EMAIL_FROM?.trim() || '';

  if (!apiKey) return null;
  if (!from && process.env.NODE_ENV === 'production') {
    throw new Error('Email service is not configured correctly.');
  }

  return {
    apiKey,
    from: from || DEFAULT_DEV_FROM,
  };
}

export async function sendEmailVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/api/email-verify/confirm?token=${token}&email=${encodeURIComponent(email)}`;
  const config = getResendConfig();

  if (!config) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email service is not configured correctly.');
    }
    console.log(`[DEV] Email verification link for ${email}:\n${url}`);
    return;
  }

  const text = [
    'Verify your email',
    '',
    'Click the link below to verify your OneRaise email address. This link expires in 24 hours.',
    url,
    '',
    "If you didn't request this, ignore this email.",
  ].join('\n');

  const resend = new Resend(config.apiKey);
  const { error } = await resend.emails.send({
    from: config.from,
    to: [email],
    subject: 'Verify your email - OneRaise',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="margin-bottom:8px;">Verify your email</h2>
        <p style="color:#555;margin-bottom:24px;">Click the button below to verify your email address. Link expires in 24 hours.</p>
        <a href="${url}" style="display:inline-block;background:#1d9e75;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Verify Email</a>
        <p style="color:#999;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
    text,
  });

  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }
}
