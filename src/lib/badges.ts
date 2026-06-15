/**
 * Donor badges / reputation (F3).
 *
 * Badges are derived from a donor's completed donations and cached in the
 * `Badge` table. `syncBadges` is called after each credited donation; it
 * recomputes the earned set, persists any newly earned badge, and drops a
 * "badge" notification so the donor sees the reward (retention loop).
 *
 * On-chain SBT minting is stubbed (`mintBadgeSbt`) following the same
 * simulation pattern as lib/umbra.ts and lib/cloak.ts — wire to a real
 * soulbound mint later without touching callers.
 */

import prisma from "@/lib/prisma";
import { getStoredDonationCreditUsd } from "@/lib/currency";
import { createNotification } from "@/lib/notifications";

export const BADGE_KINDS = [
  "first_donation",
  "repeat_donor",
  "streak_3mo",
  "category_champion",
  "big_backer",
] as const;

export type BadgeKind = (typeof BADGE_KINDS)[number];

export const BADGE_META: Record<BadgeKind, { label: string; description: string; emoji: string }> = {
  first_donation: { label: "First Gift", description: "Made your first donation", emoji: "🌱" },
  repeat_donor: { label: "Repeat Donor", description: "Backed two or more times", emoji: "🔁" },
  streak_3mo: { label: "On a Streak", description: "Donated 3 months running", emoji: "🔥" },
  category_champion: { label: "Cause Champion", description: "3+ gifts to one cause type", emoji: "🏆" },
  big_backer: { label: "Big Backer", description: "Single gift of $100 or more", emoji: "💎" },
};

const BIG_BACKER_THRESHOLD_USD = 100;

type DonationLike = Parameters<typeof getStoredDonationCreditUsd>[0] & {
  createdAt: Date;
  campaign?: { category?: string | null } | null;
};

/** Pure: which badge kinds a set of completed donations earns. */
export function computeBadges(donations: DonationLike[]): Set<BadgeKind> {
  const earned = new Set<BadgeKind>();
  if (donations.length === 0) return earned;

  earned.add("first_donation");
  if (donations.length >= 2) earned.add("repeat_donor");

  if (donations.some((d) => getStoredDonationCreditUsd(d) >= BIG_BACKER_THRESHOLD_USD)) {
    earned.add("big_backer");
  }

  // Category champion: 3+ donations to a single category.
  const byCategory = new Map<string, number>();
  for (const d of donations) {
    const category = d.campaign?.category || "Community";
    byCategory.set(category, (byCategory.get(category) || 0) + 1);
  }
  if ([...byCategory.values()].some((count) => count >= 3)) {
    earned.add("category_champion");
  }

  // Streak: 3 consecutive calendar months each with >= 1 donation.
  const months = new Set(
    donations.map((d) => `${d.createdAt.getFullYear()}-${d.createdAt.getMonth()}`),
  );
  if (hasConsecutiveMonthRun([...months], 3)) {
    earned.add("streak_3mo");
  }

  return earned;
}

/** Given "YYYY-M" month keys, is there a run of `length` consecutive months? */
function hasConsecutiveMonthRun(monthKeys: string[], length: number): boolean {
  const ordinals = monthKeys
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      return year * 12 + month;
    })
    .sort((a, b) => a - b);

  let run = 1;
  for (let i = 1; i < ordinals.length; i++) {
    if (ordinals[i] === ordinals[i - 1] + 1) {
      run += 1;
      if (run >= length) return true;
    } else if (ordinals[i] !== ordinals[i - 1]) {
      run = 1;
    }
  }
  return length <= 1 && ordinals.length >= 1;
}

/**
 * Recompute badges for a user and persist any newly earned ones. Notifies the
 * donor per new badge. Best-effort; never throws into the donation flow.
 */
export async function syncBadges(userId: string): Promise<void> {
  try {
    const donations = await prisma.donation.findMany({
      where: { userId, status: "completed" },
      select: {
        amount: true,
        currency: true,
        coverFee: true,
        provider: true,
        providerDataJson: true,
        createdAt: true,
        campaign: { select: { category: true } },
      },
    });

    const earned = computeBadges(donations as DonationLike[]);
    if (earned.size === 0) return;

    const existing = await prisma.badge.findMany({
      where: { userId },
      select: { kind: true },
    });
    const have = new Set(existing.map((b) => b.kind));

    const newKinds = [...earned].filter((kind) => !have.has(kind));
    if (newKinds.length === 0) return;

    await prisma.badge.createMany({
      data: newKinds.map((kind) => ({ userId, kind })),
      skipDuplicates: true,
    });

    for (const kind of newKinds) {
      const meta = BADGE_META[kind];
      await createNotification({
        userId,
        type: "badge",
        title: `Badge unlocked: ${meta.emoji} ${meta.label}`,
        body: meta.description,
      });
      void mintBadgeSbt(userId, kind);
    }
  } catch (err) {
    console.error(
      `[badges] sync failed for ${userId}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Stub: mint a soulbound token for an earned badge. No-op simulation today —
 * production would mint a non-transferable SPL token to the donor's wallet.
 */
async function mintBadgeSbt(userId: string, kind: BadgeKind): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[badges] (sim) would mint SBT '${kind}' for user ${userId}`);
  }
}

/** Read a user's earned badges (ordered by earn time). */
export async function getUserBadges(userId: string) {
  const rows = await prisma.badge.findMany({
    where: { userId },
    orderBy: { earnedAt: "asc" },
  });
  return rows
    .filter((row): row is typeof row & { kind: BadgeKind } => row.kind in BADGE_META)
    .map((row) => ({ ...row, ...BADGE_META[row.kind] }));
}
