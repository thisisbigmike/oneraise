import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyMoonPayWebhookSignature } from "@/lib/payments";
import { markDonationStatus } from "@/lib/payment-records";

function getExternalTransactionId(payload: any) {
  return (
    payload?.data?.externalTransactionId ||
    payload?.externalTransactionId ||
    payload?.data?.external_transaction_id ||
    null
  );
}

function getMoonPayStatus(payload: any) {
  return String(
    payload?.type ||
      payload?.status ||
      payload?.data?.status ||
      payload?.data?.state ||
      "pending",
  ).toLowerCase();
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("moonpay-signature-v2") ||
      req.headers.get("moonpay-signature") ||
      req.headers.get("x-moonpay-signature");

    if (!verifyMoonPayWebhookSignature(rawBody, signature)) {
      return new NextResponse("Invalid MoonPay webhook signature", { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const donationId = getExternalTransactionId(event);

    if (!donationId) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const donation = await prisma.donation.findUnique({
      where: { id: String(donationId) },
    });

    if (!donation) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const status = getMoonPayStatus(event);
    const isFailure = status.includes("fail") || status.includes("cancel");
    const nextStatus: "pending" | "completed" | "failed" = isFailure
      ? "failed"
      : donation.status === "completed"
        ? "completed"
        : "pending";

    await markDonationStatus({
      donationId: donation.id,
      status: nextStatus,
      providerStatus: status,
      providerData: event,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return new NextResponse(error.message || "Internal webhook error", { status: 500 });
  }
}
