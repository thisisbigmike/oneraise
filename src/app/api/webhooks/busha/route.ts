import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  extractBushaInstructions,
  mapBushaTransferStatus,
  verifyBushaWebhookSignature,
} from "@/lib/payments";
import { markDonationStatus, markPayoutStatus } from "@/lib/payment-records";

function getTransferId(payload: any) {
  return (
    payload?.data?.id ||
    payload?.data?.transfer_id ||
    payload?.transfer_id ||
    payload?.id ||
    null
  );
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-bu-signature") ||
      req.headers.get("x-busha-signature") ||
      req.headers.get("busha-signature");

    if (!verifyBushaWebhookSignature(rawBody, signature)) {
      return new NextResponse("Invalid Busha webhook signature", { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const transferId = getTransferId(event);
    const providerStatus = String(event?.event || event?.type || event?.data?.status || "pending");
    const mappedStatus = mapBushaTransferStatus(providerStatus);

    if (!transferId) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const donation = await prisma.donation.findFirst({
      where: { paymentId: String(transferId) },
    });

    if (donation) {
      await markDonationStatus({
        donationId: donation.id,
        status: mappedStatus,
        providerStatus,
        providerData: event,
        instructions: extractBushaInstructions(event.data || {}, donation.asset),
      });
      return NextResponse.json({ success: true, type: "donation" });
    }

    const payout = await prisma.payout.findFirst({
      where: { paymentId: String(transferId) },
    });

    if (payout) {
      await markPayoutStatus({
        payoutId: payout.id,
        status: mappedStatus,
        providerData: event,
      });
      return NextResponse.json({ success: true, type: "payout" });
    }

    return NextResponse.json({ success: true, ignored: true });
  } catch (error: any) {
    return new NextResponse(error.message || "Internal webhook error", { status: 500 });
  }
}
