import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  createBushaPayout,
  getDefaultSettlementAsset,
} from "@/lib/payments";
import { getCreatorPayoutSummary } from "@/lib/payment-records";

function formatPayout(payout: any) {
  return {
    id: payout.id,
    amount: payout.amount,
    sourceCurrency: payout.sourceCurrency,
    targetCurrency: payout.targetCurrency,
    status: payout.status,
    createdAt: payout.createdAt,
    completedAt: payout.completedAt,
    payoutMethod: payout.payoutMethod
      ? {
          id: payout.payoutMethod.id,
          type: payout.payoutMethod.type,
          label: payout.payoutMethod.label,
          currency: payout.payoutMethod.currency,
        }
      : null,
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

  const summary = await getCreatorPayoutSummary(user.id);

  return NextResponse.json({
    success: true,
    summary: {
      availableBalance: summary.availableBalance,
      pendingBalance: summary.pendingBalance,
      totalWithdrawn: summary.totalWithdrawn,
    },
    payouts: summary.payouts.map(formatPayout),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const payoutMethodId = String(body.payoutMethodId || "");
    const amount = Number(body.amount || 0);

    if (!payoutMethodId || amount <= 0) {
      return NextResponse.json({ error: "payoutMethodId and a valid amount are required." }, { status: 400 });
    }

    const method = await prisma.payoutMethod.findFirst({
      where: {
        id: payoutMethodId,
        userId: user.id,
      },
    });

    if (!method) {
      return NextResponse.json({ error: "Payout method not found." }, { status: 404 });
    }

    const summary = await getCreatorPayoutSummary(user.id);
    if (amount > summary.availableBalance) {
      return NextResponse.json({ error: "Withdrawal exceeds available balance." }, { status: 400 });
    }

    const sourceCurrency = getDefaultSettlementAsset();
    const targetCurrency = method.currency;
    const payoutResult = await createBushaPayout({
      amount,
      sourceCurrency,
      targetCurrency,
      recipientId: method.type === "bank" ? method.bushaRecipientId : null,
      walletAddress: method.type === "crypto" ? method.walletAddress : null,
      network: method.type === "crypto" ? method.network : null,
      bushaProfileId: user.bushaProfileId,
    });

    const payout = await prisma.payout.create({
      data: {
        userId: user.id,
        payoutMethodId: method.id,
        amount,
        sourceCurrency,
        targetCurrency,
        status: "pending",
        paymentId: String(payoutResult.transfer.id),
        quoteId: String(payoutResult.quote.id),
        providerDataJson: JSON.stringify(payoutResult),
      },
      include: {
        payoutMethod: true,
      },
    });

    return NextResponse.json({
      success: true,
      payout: formatPayout(payout),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unable to initiate payout." },
      { status: 500 },
    );
  }
}
