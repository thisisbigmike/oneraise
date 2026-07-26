import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRateLimit, createRateLimitResponse, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`verify-otp:${clientIp}`, 10, 15 * 60 * 1000);
  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit);
  }

  try {
    const { email, code } = await req.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanCode = typeof code === 'string' ? code.trim() : '';

    if (!normalizedEmail || !cleanCode || cleanCode.length !== 6) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit code.' }, { status: 400 });
    }

    const identifier = `reset:${normalizedEmail}`;
    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { token: cleanCode },
    });

    if (!tokenRecord || tokenRecord.identifier !== identifier) {
      return NextResponse.json({ error: 'Invalid reset code. Please check your email and try again.' }, { status: 400 });
    }

    if (tokenRecord.expires < new Date()) {
      return NextResponse.json({ error: 'Reset code has expired. Please request a new code.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, verified: true });
  } catch (error) {
    console.error('Password reset code verification error:', error);
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
