import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PublicKey } from "@solana/web3.js";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { estimateCloakFee, usdcToRaw, rawToUsdc } from "@/lib/cloak";
import { resolveOneRaiseTreasury } from "@/lib/solana-payments";

/**
 * POST /api/cloak/donate
 *
 * Builds a Cloak-shielded USDC donation. Since Cloak transactions
 * require client-side wallet signing (the donor must approve each step),
 * this endpoint prepares the donation record and returns the parameters
 * the frontend needs to execute the shielded flow via @cloak.dev/sdk
 * directly in the browser.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user
      ? ((session.user as { id?: string }).id as string | undefined)
      : null;

    const body = await req.json();
    const amount = Number(body.amount);
    const campaignSlug = String(body.campaignId || "").trim();
    const userPublicKey = String(body.userPublicKey || "").trim();
    const donorEmail = String(body.donorEmail || "").trim();
    const donorName = body.isAnonymous
      ? null
      : String(body.donorName || "").trim() || null;
    const donorMessage = String(body.donorMessage || "").trim() || null;
    const isAnonymous = body.isAnonymous === true;

    /* ── Validation ── */
    if (!campaignSlug) {
      return NextResponse.json(
        { error: "campaignId is required." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "A positive USDC donation amount is required." },
        { status: 400 },
      );
    }
    if (!donorEmail || !donorEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid donor email is required." },
        { status: 400 },
      );
    }
    if (!userPublicKey) {
      return NextResponse.json(
        { error: "Wallet public key is required." },
        { status: 400 },
      );
    }

    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(userPublicKey);
    } catch {
      return NextResponse.json(
        { error: "Invalid Solana wallet address." },
        { status: 400 },
      );
    }

    /* ── Resolve campaign ── */
    const campaign = await prisma.campaign.findUnique({
      where: { slug: campaignSlug },
      select: { id: true, title: true },
    });
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    /* ── Resolve treasury ── */
    const treasury = resolveOneRaiseTreasury();

    /* ── Fee estimate ── */
    const amountRaw = usdcToRaw(amount);
    const fee = estimateCloakFee(amountRaw);

    /* ── Create donation record (pending) ── */
    const donation = await prisma.donation.create({
      data: {
        amount,
        currency: "USDC",
        status: "pending",
        provider: "cloak_shielded",
        providerStatus: "awaiting_client_signing",
        donorName,
        donorEmail,
        donorMessage,
        isAnonymous,
        coverFee: false,
        asset: "USDC",
        network: "SOLANA",
        instructionsJson: JSON.stringify({
          type: "cloak_shielded",
          wallet: walletPubkey.toString(),
          treasuryOwner: treasury.owner.toString(),
          treasuryUsdcTokenAccount: treasury.usdcTokenAccount.toString(),
          amountRaw: amountRaw.toString(),
        }),
        providerDataJson: JSON.stringify({
          cloakFlow: true,
          wallet: walletPubkey.toString(),
          treasury: {
            owner: treasury.owner.toString(),
            usdcTokenAccount: treasury.usdcTokenAccount.toString(),
            source: treasury.source,
          },
          fee: {
            gross: amountRaw.toString(),
            protocolFee: fee.fee.toString(),
            net: fee.net.toString(),
            feePercent: fee.feePercent,
          },
        }),
        campaignId: campaign.id,
        ...(userId ? { userId } : {}),
      },
    });

    /* ── Return parameters for client-side Cloak execution ── */
    return NextResponse.json({
      success: true,
      donationId: donation.id,
      cloak: {
        amountRaw: amountRaw.toString(),
        treasuryOwner: treasury.owner.toString(),
        fee: {
          gross: rawToUsdc(amountRaw),
          protocolFee: rawToUsdc(fee.fee),
          net: rawToUsdc(fee.net),
          feePercent: fee.feePercent,
        },
      },
      treasury: {
        owner: treasury.owner.toString(),
        usdcTokenAccount: treasury.usdcTokenAccount.toString(),
        source: treasury.source,
      },
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error
        ? error.message
        : "Unable to prepare Cloak shielded donation.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
