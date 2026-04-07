import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createBushaRecipient } from "@/lib/payments";

function formatMethod(method: any) {
  return {
    id: method.id,
    type: method.type,
    label: method.label,
    accountName: method.accountName,
    accountNumber: method.accountNumber,
    bankName: method.bankName,
    bankCode: method.bankCode,
    walletAddress: method.walletAddress,
    network: method.network,
    currency: method.currency,
    countryCode: method.countryCode,
    isPrimary: method.isPrimary,
    bushaRecipientId: method.bushaRecipientId,
  };
}

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? ((session.user as any).id as string) : null;
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({ where: { id: userId } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const methods = await prisma.payoutMethod.findMany({
    where: { userId: user.id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    success: true,
    methods: methods.map(formatMethod),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const type = String(body.type || "").toLowerCase();
    const currency = String(body.currency || (type === "bank" ? "NGN" : "USDT")).toUpperCase();
    const countryCode = String(body.countryCode || "NG").toUpperCase();
    const makePrimary = body.makePrimary !== false;

    if (type !== "bank" && type !== "crypto") {
      return NextResponse.json({ error: "Unsupported payout method type." }, { status: 400 });
    }

    let bushaRecipientId: string | null = null;
    let providerMeta: Record<string, unknown> | null = null;

    if (type === "bank") {
      if (!body.accountName || !body.accountNumber || !body.bankCode) {
        return NextResponse.json(
          { error: "accountName, accountNumber, and bankCode are required for bank payouts." },
          { status: 400 },
        );
      }

      const recipient = await createBushaRecipient({
        accountName: String(body.accountName),
        accountNumber: String(body.accountNumber),
        bankCode: String(body.bankCode),
        bankName: body.bankName ? String(body.bankName) : null,
        currency,
        countryCode,
        bushaProfileId: user.bushaProfileId,
      });

      bushaRecipientId = String(recipient.id);
      providerMeta = recipient;
    } else if (!body.walletAddress || !body.network) {
      return NextResponse.json(
        { error: "walletAddress and network are required for crypto payouts." },
        { status: 400 },
      );
    }

    if (makePrimary) {
      await prisma.payoutMethod.updateMany({
        where: { userId: user.id },
        data: { isPrimary: false },
      });
    }

    const method = await prisma.payoutMethod.create({
      data: {
        userId: user.id,
        type,
        label:
          type === "bank"
            ? `${body.bankName || "Bank"} ••••${String(body.accountNumber).slice(-4)}`
            : `${currency} Wallet`,
        accountName: body.accountName || null,
        accountNumber: body.accountNumber || null,
        bankName: body.bankName || null,
        bankCode: body.bankCode || null,
        walletAddress: body.walletAddress || null,
        network: body.network || null,
        currency,
        countryCode,
        bushaRecipientId,
        metaJson: providerMeta ? JSON.stringify(providerMeta) : null,
        isPrimary: makePrimary,
      },
    });

    return NextResponse.json({
      success: true,
      method: formatMethod(method),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unable to save payout method." },
      { status: 500 },
    );
  }
}
