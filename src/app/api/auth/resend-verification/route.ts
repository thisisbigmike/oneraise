import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { sendEmailVerificationEmail } from '@/lib/email';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getResendErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';

  if (message.includes("Can't reach database server") || message.includes('P1001')) {
    return 'The database is currently unavailable. Please wait a few seconds and try again.';
  }

  if (message.includes('only send testing emails') || message.includes('resend.com/domains')) {
    return 'Resend is in testing mode (using onboarding@resend.dev). Verification emails can only be sent to your Resend account email (egbo2255@gmail.com) until you add your domain in Resend.';
  }

  if (/Brevo email failed|Resend email failed|Email service is not configured|EAUTH|Invalid login|authentication|Username and Password not accepted|Missing credentials/i.test(message)) {
    return 'Email service is not configured correctly. Check the email API key and sender address.';
  }

  return 'Could not send verification email. Please try again.';
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!EMAIL_PATTERN.test(normalizedEmail) || typeof password !== 'string' || !password) {
      return NextResponse.json({ success: true });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        password: true,
        emailVerified: true,
      },
    });

    if (!user?.password || user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: !!user?.emailVerified });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ success: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.$transaction([
      prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } }),
      prisma.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token,
          expires,
        },
      }),
    ]);

    await sendEmailVerificationEmail(normalizedEmail, token);

    const devVerificationUrl = process.env.NODE_ENV !== 'production'
      ? `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/email-verify/confirm?token=${token}&email=${encodeURIComponent(normalizedEmail)}`
      : undefined;

    return NextResponse.json({ success: true, sent: true, devVerificationUrl });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: getResendErrorMessage(error) }, { status: 500 });
  }
}
