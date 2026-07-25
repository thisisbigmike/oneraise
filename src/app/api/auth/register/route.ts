import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendEmailVerificationEmail } from '@/lib/email';

import { checkRateLimit, createRateLimitResponse, getClientIp } from '@/lib/rate-limit';
import { verifyTurnstileToken } from '@/lib/turnstile';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRegistrationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';

  if (message.includes("Can't reach database server") || message.includes('P1001')) {
    return 'The database is currently unavailable. Please wait a few seconds and try again.';
  }

  if (/Brevo email failed|Resend email failed|Email service is not configured|EAUTH|Invalid login|authentication|Username and Password not accepted|Missing credentials/i.test(message)) {
    return 'Account could not be created because email verification is not configured correctly.';
  }

  return 'Internal server error';
}

export async function POST(req: Request) {
  // Rate limit: 5 registration attempts per 15 minutes per IP address
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`signup:${clientIp}`, 5, 15 * 60 * 1000);
  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit);
  }

  let createdUserId: string | null = null;
  let createdEmail = '';

  try {
    const { email, password, firstName, lastName, role, turnstileToken } = await req.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const requestedRole = role === 'creator' || role === 'backer' ? role : null;

    // Verify Cloudflare Turnstile CAPTCHA token
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: turnstileResult.error || 'Security check failed. Please complete the captcha.' },
        { status: 400 }
      );
    }

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!requestedRole) {
      return NextResponse.json({ error: 'Please choose whether you are signing up as a creator or donor first.' }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (exists) {
      const accountType = exists.role === 'creator' ? 'creator' : 'donor';
      return NextResponse.json(
        { error: `An account already exists for this email as a ${accountType}. Please sign in instead.` },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const name = [firstName, lastName].filter(Boolean).join(' ') || undefined;
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + TOKEN_TTL_MS);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          emailVerified: null,
          password: hashedPassword,
          name,
          role: requestedRole,
        },
      });

      await tx.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
      await tx.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token,
          expires,
        },
      });

      return createdUser;
    });

    createdUserId = user.id;
    createdEmail = normalizedEmail;

    await sendEmailVerificationEmail(normalizedEmail, token);

    return NextResponse.json({
      success: true,
      verificationEmailSent: true,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);

    if (createdUserId && createdEmail) {
      try {
        await prisma.$transaction([
          prisma.verificationToken.deleteMany({ where: { identifier: createdEmail } }),
          prisma.user.delete({ where: { id: createdUserId } }),
        ]);
      } catch (cleanupError) {
        console.error('Registration cleanup error:', cleanupError);
      }
    }

    return NextResponse.json({ error: getRegistrationErrorMessage(error) }, { status: 500 });
  }
}
