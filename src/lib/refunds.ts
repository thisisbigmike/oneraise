/**
 * Refund-on-fail (F5).
 *
 * Trust lever: when a campaign fails its conditions, backers are made whole, so
 * they give again. This module records refund INTENT and state transitions on
 * each donation; it is admin-triggered only (see api/admin/protect).
 *
 * ⚠️ Money movement is NOT executed here yet. Reversing a donation requires:
 *   - Crypto/Cloak donations: a platform signer with withdraw authority over the
 *     escrow/shielded pool (see lib/cloak.ts fullWithdraw, lib/solana-payments).
 *   - Fiat (Busha/MoonPay): a provider refund API call or manual operator action.
 * Until escrow withdraw authority is confirmed, `executeRefund` only advances
 * state to "processing" and leaves the actual transfer to a follow-up executor.
 * The state machine and idempotency here are designed so that executor can be
 * dropped in without changing callers.
 *
 * States (Donation.refundStatus): none → requested → processing → refunded
 *                                                            └────→ failed
 */

import { PublicKey } from "@solana/web3.js";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import {
  getTreasuryKeypair,
  sendUsdcFromTreasury,
  usdcAmountToRaw,
} from "@/lib/solana-payments";

/** Donor wallet is captured in providerData for Jupiter (solana_jupiter) donations. */
function getDonorWalletFromProviderData(providerDataJson: string | null): string | null {
  if (!providerDataJson) return null;
  try {
    const data = JSON.parse(providerDataJson) as { wallet?: string };
    return typeof data.wallet === "string" && data.wallet ? data.wallet : null;
  } catch {
    return null;
  }
}

/**
 * Flag every completed, not-yet-refunded donation on a campaign as refund
 * `requested`, and notify each registered backer. Idempotent: donations already
 * in a refund state are skipped. Returns the number newly flagged.
 */
export async function requestCampaignRefunds(campaignId: string): Promise<number> {
  const donations = await prisma.donation.findMany({
    where: {
      campaignId,
      status: "completed",
      refundStatus: "none",
    },
    select: { id: true, userId: true, amount: true, currency: true },
  });

  if (donations.length === 0) return 0;

  await prisma.donation.updateMany({
    where: { id: { in: donations.map((d) => d.id) } },
    data: { refundStatus: "requested" },
  });

  // Per-donor in-app + push notice (backer broadcast on the campaign covers the
  // generic message; here we confirm the specific amount).
  await Promise.all(
    donations.map((donation) =>
      donation.userId
        ? createNotification({
            userId: donation.userId,
            type: "refund",
            title: "Refund on the way",
            body: `Your ${donation.currency} ${donation.amount.toLocaleString()} contribution is being refunded.`,
            campaignId,
            push: true,
          })
        : Promise.resolve(),
    ),
  );

  return donations.length;
}

/**
 * Advance a single donation toward refunded. Idempotent and safe to retry.
 * Pass `txSignature` once an on-chain refund has actually settled.
 *
 * NOTE: this records state only. The real transfer (on-chain withdraw or fiat
 * provider refund) must be performed by the caller/executor before marking
 * `refunded`.
 */
export async function markDonationRefunded(
  donationId: string,
  txSignature?: string,
): Promise<void> {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    select: { id: true, refundStatus: true, userId: true },
  });
  if (!donation) return;
  if (donation.refundStatus === "refunded") return; // idempotent

  await prisma.donation.update({
    where: { id: donationId },
    data: {
      refundStatus: "refunded",
      refundedAt: new Date(),
      refundTxSignature: txSignature ?? undefined,
    },
  });
}

/** Mark a donation's refund as failed so an operator can retry. */
export async function markDonationRefundFailed(donationId: string): Promise<void> {
  await prisma.donation.updateMany({
    where: { id: donationId, refundStatus: { in: ["requested", "processing"] } },
    data: { refundStatus: "failed" },
  });
}

export type RefundOutcome =
  | { executed: true; signature: string }
  | { executed: false; reason: string };

/**
 * Execute a real on-chain USDC refund for a single donation.
 *
 * Automatable ONLY for `solana_jupiter` donations: those land in a treasury the
 * platform controls and record the donor's destination wallet. Requirements:
 *   - SOLANA_TREASURY_SECRET_KEY configured (treasury signer).
 *   - Donor wallet present in providerData.
 *   - The donated USDC actually sits in the treasury wallet.
 *
 * Cloak (shielded) donations cannot be auto-refunded — the donor address is
 * private by design. Fiat (Busha/MoonPay) refunds are manual by decision. In
 * all non-automatable cases the donation stays `requested` for an operator.
 *
 * Idempotent: already-refunded donations are skipped.
 */
export async function executeRefund(donationId: string): Promise<RefundOutcome> {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    select: {
      id: true,
      provider: true,
      providerDataJson: true,
      amount: true,
      currency: true,
      refundStatus: true,
      campaignId: true,
      userId: true,
    },
  });

  if (!donation) return { executed: false, reason: "donation not found" };
  if (donation.refundStatus === "refunded") {
    return { executed: false, reason: "already refunded" };
  }

  // Only Jupiter donations are auto-refundable on-chain.
  if (donation.provider !== "solana_jupiter") {
    return { executed: false, reason: `manual: provider ${donation.provider} not auto-refundable` };
  }

  const signer = getTreasuryKeypair();
  if (!signer) {
    return { executed: false, reason: "manual: SOLANA_TREASURY_SECRET_KEY not configured" };
  }

  const donorWallet = getDonorWalletFromProviderData(donation.providerDataJson);
  if (!donorWallet) {
    return { executed: false, reason: "manual: donor wallet not recorded" };
  }

  let toOwner: PublicKey;
  try {
    toOwner = new PublicKey(donorWallet);
  } catch {
    return { executed: false, reason: "manual: donor wallet is not a valid address" };
  }

  // Claim the transition so concurrent runs don't double-pay.
  const claimed = await prisma.donation.updateMany({
    where: { id: donation.id, refundStatus: { in: ["requested", "failed"] } },
    data: { refundStatus: "processing" },
  });
  if (claimed.count === 0) {
    return { executed: false, reason: "refund already in progress" };
  }

  try {
    const signature = await sendUsdcFromTreasury({
      signer,
      toOwner,
      amountRaw: usdcAmountToRaw(donation.amount),
    });

    await markDonationRefunded(donation.id, signature);

    if (donation.userId) {
      void createNotification({
        userId: donation.userId,
        type: "refund",
        title: "Refund completed",
        body: `Your ${donation.currency} ${donation.amount.toLocaleString()} refund has been sent on-chain.`,
        campaignId: donation.campaignId,
        push: true,
      });
    }

    return { executed: true, signature };
  } catch (err) {
    await markDonationRefundFailed(donation.id);
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[refunds] execute failed for ${donation.id}: ${reason}`);
    return { executed: false, reason };
  }
}

/**
 * Execute on-chain refunds for every refund-requested donation on a campaign.
 * Runs sequentially (single treasury signer) and returns a summary. Non-
 * automatable donations are left for manual handling.
 */
export async function executeCampaignRefunds(
  campaignId: string,
): Promise<{ refunded: number; skipped: number; failed: number }> {
  const donations = await prisma.donation.findMany({
    where: { campaignId, refundStatus: { in: ["requested", "failed"] } },
    select: { id: true },
  });

  let refunded = 0;
  let skipped = 0;
  let failed = 0;

  for (const { id } of donations) {
    const outcome = await executeRefund(id);
    if (outcome.executed) refunded += 1;
    else if (outcome.reason.startsWith("manual")) skipped += 1;
    else failed += 1;
  }

  return { refunded, skipped, failed };
}
