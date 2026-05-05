import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { createTransferCheckedInstruction } from "@solana/spl-token";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { CAMPAIGN_SEEDS } from "@/lib/campaign-seeds";
import { convertToUsd, getDonationCreditUsd } from "@/lib/currency";
import {
  JUPITER_SWAP_INSTRUCTIONS_URL,
  JUPITER_USDC,
  buildDirectUsdcQuote,
  buildLiveJupiterDonationQuote,
  fetchLiveJupiterQuote,
  getJupiterApiKey,
} from "@/lib/jupiter";
import {
  createTreasuryUsdcAtaInstruction,
  deserializeJupiterInstruction,
  getAddressLookupTableAccounts,
  getSolanaConnection,
  getUsdcAta,
  getUsdcMintPublicKey,
  resolveOneRaiseTreasury,
  type JupiterSwapInstructions,
} from "@/lib/solana-payments";

const DEFAULT_SLIPPAGE_BPS = 50;

const CAMPAIGN_FALLBACKS: Record<
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
  const existing = await prisma.campaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  const seed = CAMPAIGN_SEEDS[campaignSlug] || CAMPAIGN_FALLBACKS[campaignSlug] || {
    title: `Campaign ${campaignSlug}`,
    category: "Community",
    goal: 50000,
    description: "Creator campaign created from donation checkout.",
  };
  const seedDescription = seed as { desc?: string; description?: string };
  const description = seedDescription.desc || seedDescription.description;

  return prisma.campaign.upsert({
    where: { slug: campaignSlug },
    update: {},
    create: {
      slug: campaignSlug,
      title: seed.title,
      category: seed.category,
      goal: seed.goal,
      description,
      status: "active",
    },
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: Request) {
  let donationId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as { id?: string }).id as string | undefined) : null;
    const body = await req.json();
    const amount = Number(body.amount);
    const currency = String(body.currency || "USD").toUpperCase();
    const inputMint = String(body.inputMint || "").trim();
    const userPublicKey = new PublicKey(String(body.userPublicKey || "").trim());
    const campaignSlug = String(body.campaignId || "");
    const slippageBps = Number(body.slippageBps || DEFAULT_SLIPPAGE_BPS);
    const donorEmail = String(body.donorEmail || "").trim();
    const donorName = body.isAnonymous ? null : String(body.donorName || "").trim() || null;
    const donorMessage = String(body.donorMessage || "").trim() || null;
    const isAnonymous = body.isAnonymous === true;

    if (!campaignSlug) {
      return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
    }

    if (!inputMint) {
      return NextResponse.json({ error: "inputMint is required." }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "A positive donation amount is required." }, { status: 400 });
    }

    if (!donorEmail || !donorEmail.includes("@")) {
      return NextResponse.json({ error: "A valid donor email is required." }, { status: 400 });
    }

    const apiKey = getJupiterApiKey();
    if (!apiKey && inputMint !== JUPITER_USDC.mint) {
      return NextResponse.json(
        { error: "JUPITER_API_KEY is required for live Jupiter swaps." },
        { status: 500 },
      );
    }

    const outputAmountUsd = convertToUsd(amount, currency);
    if (!Number.isFinite(outputAmountUsd) || outputAmountUsd <= 0) {
      return NextResponse.json({ error: "Unable to convert donation amount to USDC." }, { status: 400 });
    }

    const campaign = await ensureCampaign(campaignSlug);
    const treasury = resolveOneRaiseTreasury();
    const connection = getSolanaConnection();

    const quotePayload =
      inputMint === JUPITER_USDC.mint
        ? null
        : await fetchLiveJupiterQuote({
            inputMint,
            outputAmountUsd,
            slippageBps,
          });
    const quote =
      quotePayload === null
        ? buildDirectUsdcQuote(outputAmountUsd, slippageBps)
        : buildLiveJupiterDonationQuote({
            inputMint,
            payload: quotePayload,
            slippageBps,
          });
    const expectedOutputRaw = quote.outputRawAmount;
    const credit = {
      amount,
      currency,
      amountUsd: getDonationCreditUsd({
        amount,
        currency,
        provider: "solana_jupiter",
      }),
    };

    const donation = await prisma.donation.create({
      data: {
        amount: outputAmountUsd,
        currency: "USDC",
        status: "pending",
        provider: "solana_jupiter",
        providerStatus: "transaction_built",
        donorName,
        donorEmail,
        donorMessage,
        isAnonymous,
        coverFee: false,
        asset: quote.inputSymbol,
        network: "SOLANA",
        instructionsJson: JSON.stringify({
          type: "solana_jupiter",
          wallet: userPublicKey.toString(),
          treasuryOwner: treasury.owner.toString(),
          treasuryUsdcTokenAccount: treasury.usdcTokenAccount.toString(),
          expectedOutputRaw,
          expectedOutputAmount: quote.outputAmount,
        }),
        providerDataJson: JSON.stringify({
          credit,
          quote,
          quoteResponse: quotePayload,
          wallet: userPublicKey.toString(),
          treasury: {
            owner: treasury.owner.toString(),
            usdcTokenAccount: treasury.usdcTokenAccount.toString(),
            source: treasury.source,
          },
          expectedOutputRaw,
        }),
        campaignId: campaign.id,
        ...(userId ? { userId } : {}),
      },
    });
    donationId = donation.id;

    const createTreasuryAtaIx = createTreasuryUsdcAtaInstruction({
      payer: userPublicKey,
      treasuryOwner: treasury.owner,
      treasuryUsdcTokenAccount: treasury.usdcTokenAccount,
    });

    let instructions = [createTreasuryAtaIx];
    let addressLookupTableAddresses: string[] = [];

    if (inputMint === JUPITER_USDC.mint) {
      const userUsdcAta = getUsdcAta(userPublicKey);
      instructions.push(
        createTransferCheckedInstruction(
          userUsdcAta,
          getUsdcMintPublicKey(),
          treasury.usdcTokenAccount,
          userPublicKey,
          BigInt(expectedOutputRaw),
          JUPITER_USDC.decimals,
        ),
      );
    } else {
      const response = await fetch(JUPITER_SWAP_INSTRUCTIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          quoteResponse: quotePayload,
          userPublicKey: userPublicKey.toString(),
          destinationTokenAccount: treasury.usdcTokenAccount.toString(),
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
              priorityLevel: "high",
              maxLamports: 1_000_000,
            },
          },
        }),
      });
      const payload = (await response.json()) as JupiterSwapInstructions;

      if (!response.ok || payload.error || !payload.swapInstruction) {
        throw new Error(payload.error || "Unable to build Jupiter swap instructions.");
      }

      instructions = [
        ...(payload.computeBudgetInstructions || []).map(deserializeJupiterInstruction),
        ...(payload.otherInstructions || []).map(deserializeJupiterInstruction),
        createTreasuryAtaIx,
        ...(payload.setupInstructions || []).map(deserializeJupiterInstruction),
        ...(payload.tokenLedgerInstruction
          ? [deserializeJupiterInstruction(payload.tokenLedgerInstruction)]
          : []),
        deserializeJupiterInstruction(payload.swapInstruction),
        ...(payload.cleanupInstruction ? [deserializeJupiterInstruction(payload.cleanupInstruction)] : []),
      ];
      addressLookupTableAddresses = payload.addressLookupTableAddresses || [];
    }

    const [latestBlockhash, addressLookupTableAccounts] = await Promise.all([
      connection.getLatestBlockhash("confirmed"),
      getAddressLookupTableAccounts(connection, addressLookupTableAddresses),
    ]);

    const message = new TransactionMessage({
      payerKey: userPublicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message(addressLookupTableAccounts);
    const transaction = new VersionedTransaction(message);

    return NextResponse.json({
      success: true,
      donationId: donation.id,
      transaction: Buffer.from(transaction.serialize()).toString("base64"),
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      quote,
      treasury: {
        owner: treasury.owner.toString(),
        usdcTokenAccount: treasury.usdcTokenAccount.toString(),
        source: treasury.source,
      },
    });
  } catch (error: unknown) {
    if (donationId) {
      try {
        await prisma.donation.update({
          where: { id: donationId },
          data: {
            status: "failed",
            providerStatus: "build_failed",
            providerDataJson: JSON.stringify({
              error: getErrorMessage(error, "Unable to build Jupiter donation transaction."),
            }),
          },
        });
      } catch {
        // Ignore secondary update failure.
      }
    }

    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to build Jupiter donation transaction.") },
      { status: 500 },
    );
  }
}
