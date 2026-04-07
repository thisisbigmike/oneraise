import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
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

const CAMPAIGN_SEEDS: Record<
  string,
  { title: string; category: string; goal: number; description: string }
> = {
  "1": {
    title: "SolarPack Mini — Off-grid power for remote communities",
    category: "Technology",
    goal: 100000,
    description:
      "A portable, affordable solar generator for small businesses in West Africa.",
  },
  "2": {
    title: "Clean Water for Kano",
    category: "Social Impact",
    goal: 50000,
    description: "Building 50 solar-powered boreholes to provide clean drinking water.",
  },
  "3": {
    title: "Tech Start: Lagos",
    category: "Education",
    goal: 100000,
    description: "Funding laptops and coding bootcamps for underserved youths.",
  },
  "4": {
    title: "Rural Clinic Solar",
    category: "Health",
    goal: 15000,
    description: "Installing solar panels to keep vaccines refrigerated.",
  },
};

async function ensureCampaign(campaignSlug: string) {
  const seed = CAMPAIGN_SEEDS[campaignSlug] || {
    title: `Campaign ${campaignSlug}`,
    category: "Community",
    goal: 50000,
    description: "Creator campaign created from donation checkout.",
  };

  return prisma.campaign.upsert({
    where: { slug: campaignSlug },
    update: {},
    create: {
      slug: campaignSlug,
      title: seed.title,
      category: seed.category,
      goal: seed.goal,
      description: seed.description,
      status: "active",
    },
  });
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
    } = await req.json();

    const parsedAmount = toNumber(amount);
    const parsedCurrency = String(currency || "USD").toUpperCase();
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
        providerDataJson: JSON.stringify({ quote, transfer: resolvedTransfer }),
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
