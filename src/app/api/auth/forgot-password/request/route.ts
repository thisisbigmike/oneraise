import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, createRateLimitResponse, getClientIp } from '@/lib/rate-limit';

const RESET_TTL_MS = 10 * 60 * 1000; // 10 minutes
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getResetErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';

  if (message.includes("Can't reach database server") || message.includes('P1001')) {
    return 'The database is currently unavailable. Please wait a few seconds and try again.';
  }

  if (message.includes('only send testing emails') || message.includes('resend.com/domains')) {
    return 'Resend is in testing mode (using onboarding@resend.dev). Password reset emails can only be sent to your Resend account email (egbo2255@gmail.com) until your domain is verified.';
  }

  if (/Brevo email failed|Resend email failed|Email service is not configured|EAUTH|Invalid login|authentication/i.test(message)) {
    return 'Could not send reset code. Email service error.';
  }

  return 'Could not process request. Please try again.';
}

export async function POST(req: Request) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`forgot-pw:${clientIp}`, 5, 15 * 60 * 1000);
  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit);
  }

  try {
    const { email } = await req.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, password: true },
    });

    // Generate 6-digit numeric OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + RESET_TTL_MS);
    const identifier = `reset:${normalizedEmail}`;

    if (user && user.password) {
      await prisma.$transaction([
        prisma.verificationToken.deleteMany({ where: { identifier } }),
        prisma.verificationToken.create({
          data: {
            identifier,
            token: code,
            expires,
          },
        }),
      ]);

      await sendPasswordResetEmail(normalizedEmail, code);
    }

    const devCode = process.env.NODE_ENV !== 'production' ? code : undefined;

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email address, a password reset code has been sent.',
      devCode,
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: getResetErrorMessage(error) }, { status: 500 });
  }
}
