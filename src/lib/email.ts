import nodemailer from 'nodemailer';

const FROM = process.env.EMAIL_FROM || `OneRaise <${process.env.GMAIL_USER}>`;
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

let transporter: nodemailer.Transporter | null | undefined;

function getTransporter() {
  if (transporter !== undefined) return transporter;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

export async function sendEmailVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/api/email-verify/confirm?token=${token}&email=${encodeURIComponent(email)}`;

  const client = getTransporter();
  if (!client) {
    console.log(`[DEV] Email verification link for ${email}:\n${url}`);
    return;
  }

  await client.sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your email — OneRaise',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="margin-bottom:8px;">Verify your email</h2>
        <p style="color:#555;margin-bottom:24px;">Click the button below to verify your email address. Link expires in 24 hours.</p>
        <a href="${url}" style="display:inline-block;background:#1d9e75;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Verify Email</a>
        <p style="color:#999;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
