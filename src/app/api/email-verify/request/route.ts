import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sendEmailVerificationEmail } from "@/lib/email";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRequestErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Can't reach database server") || message.includes("P1001")) {
    return "The database is currently unavailable. Please wait a few seconds and try again.";
  }

  if (/Resend email failed|Email service is not configured|EAUTH|Invalid login|authentication|Username and Password not accepted|Missing credentials/i.test(message)) {
    return "Email service is not configured correctly. Check the Resend API key and sender address.";
  }

  return "Could not send verification email. Please try again.";
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as { id?: string }).id : null;

    if (!userId) {
      return NextResponse.json({ error: "Please sign in to verify your email." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: "We could not find your account. Please sign in again." }, { status: 404 });
    }

    const email = user.email?.trim().toLowerCase() || "";

    if (!email) {
      return NextResponse.json({ error: "Add an email address before requesting verification." }, { status: 400 });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "Save a valid email address before requesting verification." }, { status: 400 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    await sendEmailVerificationEmail(email, token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email verification request error:", error);
    return NextResponse.json({ error: getRequestErrorMessage(error) }, { status: 500 });
  }
}
