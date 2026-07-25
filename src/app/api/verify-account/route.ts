import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // 1. Authentication check
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limiting check: 10 requests per minute per user
  const clientIp = getClientIp(req);
  const rateLimitKey = `paystack-resolve:${userId || clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 10, 60 * 1000);

  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit);
  }

  const { searchParams } = new URL(req.url);
  const account_number = searchParams.get("account_number");
  const bank_code = searchParams.get("bank_code");

  if (!account_number || !bank_code) {
    return NextResponse.json(
      { error: "account_number and bank_code are required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!data.status) {
      return NextResponse.json({ error: data.message || "Failed to resolve bank account." }, { status: 400 });
    }

    return NextResponse.json({
      account_name: data.data.account_name,
      account_number: data.data.account_number,
    });
  } catch (error: unknown) {
    console.error("Paystack bank resolve error:", error);
    return NextResponse.json({ error: "Failed to verify account" }, { status: 500 });
  }
}
