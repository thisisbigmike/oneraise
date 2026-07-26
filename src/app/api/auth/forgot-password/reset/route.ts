import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { checkRateLimit, createRateLimitResponse, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`reset-pw:${clientIp}`, 5, 15 * 60 * 1000);
  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit);
  }

  try {
    const { email, code, newPassword } = await req.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanCode = typeof code === 'string' ? code.trim() : '';

    if (!normalizedEmail || !cleanCode || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const identifier = `reset:${normalizedEmail}`;
    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { token: cleanCode },
    });

    if (!tokenRecord || tokenRecord.identifier !== identifier || tokenRecord.expires < new Date()) {
      return NextResponse.json({ error: 'Reset session expired or invalid. Please start over.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: normalizedEmail },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset completion error:', error);
    return NextResponse.json({ error: 'Could not reset password. Please try again.' }, { status: 500 });
  }
}
