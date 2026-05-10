import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDonationCreditUsd } from "@/lib/currency";
import {
  buildMoonPayCheckoutUrl,
  createBushaCryptoDeposit,
  extractBushaInstructions,
  fetchBushaTransfer,
  getDefaultSettlementAsset,
  getDefaultSettlementNetwork,
  getMoonPayCurrencyCode,
  toNumber,
} from "@/lib/payments";



async function ensureCampaign(campaignSlug: string) {
  const existing = await prisma.campaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  throw new Error("Campaign not found.");
}

function parseExpiresAt(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: Request) {
  let donationId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id as string) : null;
    const {
      amount,
      currency,
      campaignId,
      donorName,
      donorEmail,
      donorMessage,
      isAnonymous,
      coverFee,
      creditAmount,
      creditCurrency,
    } = await req.json();

    const parsedAmount = toNumber(amount);
    const parsedCurrency = String(currency || "USD").toUpperCase();
    const parsedCreditAmount = toNumber(creditAmount, parsedAmount);
    const parsedCreditCurrency = String(creditCurrency || parsedCurrency).toUpperCase();
    const credit = {
      amount: parsedCreditAmount,
      currency: parsedCreditCurrency,
      amountUsd: getDonationCreditUsd({
        amount: parsedCreditAmount,
        currency: parsedCreditCurrency,
      }),
    };
    const parsedCampaignId = String(campaignId || "");

    if (!parsedCampaignId) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
    }

    if (parsedAmount <= 0) {
      return NextResponse.json({ error: "Donation amount must be greater than 0" }, { status: 400 });
    }

    const campaign = await ensureCampaign(parsedCampaignId);
    const donation = await prisma.donation.create({
      data: {
        amount: parsedAmount,
        currency: parsedCurrency,
        status: "pending",
        provider: "moonpay",
        providerStatus: "initiated",
        donorName: isAnonymous ? null : donorName || null,
        donorEmail: donorEmail || null,
        donorMessage: donorMessage || null,
        isAnonymous: isAnonymous === true,
        coverFee: coverFee === true,
        providerDataJson: JSON.stringify({ credit }),
        campaign: {
          connect: {
            id: campaign.id,
          },
        },
        ...(userId
          ? {
              user: {
                connect: {
                  id: userId,
                },
              },
            }
          : {}),
      },
    });

    donationId = donation.id;

    const settlementAsset = getDefaultSettlementAsset();
    const settlementNetwork = getDefaultSettlementNetwork();
    const { quote, transfer } = await createBushaCryptoDeposit({
      asset: settlementAsset,
      network: settlementNetwork,
      quoteAmount: parsedAmount,
      quoteCurrency: parsedCurrency,
      targetAsset: settlementAsset,
    });

    let resolvedTransfer = transfer;
    let instructions = extractBushaInstructions(transfer, settlementAsset);

    if (!instructions && transfer.id) {
      resolvedTransfer = await fetchBushaTransfer(String(transfer.id));
      instructions = extractBushaInstructions(resolvedTransfer, settlementAsset);
    }

    const walletAddress = instructions?.type === "crypto" ? instructions.address : null;

    if (!walletAddress) {
      throw new Error("Busha did not return a crypto deposit address for the MoonPay checkout.");
    }

    const checkoutUrl = buildMoonPayCheckoutUrl({
      baseCurrencyAmount: parsedAmount,
      baseCurrencyCode: parsedCurrency,
      currencyCode: getMoonPayCurrencyCode(settlementAsset, settlementNetwork),
      walletAddress,
      externalTransactionId: donation.id,
      email: donorEmail || null,
      redirectURL: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/backer/donations`,
    });

    const updated = await prisma.donation.update({
      where: { id: donation.id },
      data: {
        paymentId: String(resolvedTransfer.id),
        quoteId: String(quote.id),
        checkoutUrl,
        asset: settlementAsset,
        network: settlementNetwork,
        providerStatus: String(resolvedTransfer.status || quote.status || "pending"),
        instructionsJson: JSON.stringify(instructions),
        providerDataJson: JSON.stringify({ quote, transfer: resolvedTransfer, credit }),
        expiresAt: parseExpiresAt(instructions?.expiresAt),
      },
    });

    return NextResponse.json({
      success: true,
      transactionId: updated.id,
      url: checkoutUrl,
      donation: {
        id: updated.id,
        status: updated.status,
        provider: updated.provider,
        asset: updated.asset,
        network: updated.network,
      },
    });
  } catch (error: any) {
    if (donationId) {
      try {
        await prisma.donation.update({
          where: { id: donationId },
          data: {
            status: "failed",
            providerStatus: "provider_error",
            providerDataJson: JSON.stringify({
              error: error.message || "MoonPay payment initiation failed.",
            }),
          },
        });
      } catch {
        // Ignore secondary update failure.
      }
    }

    return NextResponse.json(
      { error: error.message || "Unable to initiate MoonPay payment." },
      { status: 500 },
    );
  }
}
