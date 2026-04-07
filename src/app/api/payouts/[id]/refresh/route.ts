import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { fetchBushaTransfer, mapBushaTransferStatus } from "@/lib/payments";
import { markPayoutStatus } from "@/lib/payment-records";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? ((session.user as any).id as string) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const payout = await prisma.payout.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      payoutMethod: true,
    },
  });

  if (!payout) {
    return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  }

  if (!payout.paymentId) {
    return NextResponse.json({
      success: true,
      payout,
    });
  }

  try {
    const transfer = await fetchBushaTransfer(payout.paymentId);
    const status = mapBushaTransferStatus(String(transfer.status || "pending"));
    const updated = await markPayoutStatus({
      payoutId: payout.id,
      status,
      providerData: transfer,
    });

    return NextResponse.json({
      success: true,
      payout: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unable to refresh payout status." },
      { status: 500 },
    );
  }
}
