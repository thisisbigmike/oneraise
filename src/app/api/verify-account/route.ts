import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!data.status) {
      return NextResponse.json({ error: data.message }, { status: 400 });
    }

    return NextResponse.json({
      account_name: data.data.account_name,
      account_number: data.data.account_number,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to verify account" }, { status: 500 });
  }
}
