import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password, firstName, lastName, role } = await req.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const requestedRole = role === 'creator' || role === 'backer' ? role : null;

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name,
        role: requestedRole
      }
    });

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error', stack: error?.stack }, { status: 500 });
  }
}
