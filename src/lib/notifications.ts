/**
 * In-app notification feed + best-effort phone push.
 *
 * Two layers:
 *  1. Durable `Notification` rows (shown in the dashboard/backer feed).
 *  2. Optional WhatsApp/SMS push via lib/notify.ts.
 *
 * Design rule (mirrors payment-records / notify): best-effort. A failed
 * notification must NEVER throw into a payment/milestone/refund flow. Callers
 * should `void` these or rely on the internal try/catch.
 */

import prisma from "@/lib/prisma";
import { notifyRecipient } from "@/lib/notify";

export type NotificationType =
  | "donation"
  | "milestone"
  | "release"
  | "refund"
  | "badge"
  | "system";

type CreateArgs = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  campaignId?: string | null;
  /** Also attempt a WhatsApp/SMS push to the user's phone. Default false. */
  push?: boolean;
};

/**
 * Create one notification row for a known user. If `push` is set, also fire a
 * best-effort phone notification respecting the user's channel preferences.
 */
export async function createNotification(args: CreateArgs): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: args.userId,
        type: args.type,
        title: args.title,
        body: args.body,
        campaignId: args.campaignId ?? null,
      },
    });

    if (args.push) {
      const user = await prisma.user.findUnique({
        where: { id: args.userId },
        select: {
          phone: true,
          whatsappNotifications: true,
          smsNotifications: true,
        },
      });
      if (user?.phone) {
        await notifyRecipient(
          {
            phone: user.phone,
            whatsappNotifications: user.whatsappNotifications,
            smsNotifications: user.smsNotifications,
          },
          `${args.title} — ${args.body}`,
        );
      }
    }
  } catch (err) {
    console.error(
      `[notifications] create failed for ${args.userId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

/**
 * Notify every registered backer of a campaign (distinct users with a completed
 * donation). Used for milestone-verified, funds-released, and refund events —
 * the core "your money did something" retention loop.
 */
export async function notifyCampaignBackers(
  campaignId: string,
  args: { type: NotificationType; title: string; body: string; push?: boolean },
): Promise<void> {
  try {
    const donations = await prisma.donation.findMany({
      where: {
        campaignId,
        status: "completed",
        userId: { not: null },
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    const userIds = donations
      .map((d) => d.userId)
      .filter((id): id is string => Boolean(id));

    if (userIds.length === 0) return;

    // Bulk-insert the durable rows in one query.
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: args.type,
        title: args.title,
        body: args.body,
        campaignId,
      })),
    });

    if (args.push) {
      const recipients = await prisma.user.findMany({
        where: { id: { in: userIds }, phone: { not: null } },
        select: {
          phone: true,
          whatsappNotifications: true,
          smsNotifications: true,
        },
      });
      await Promise.all(
        recipients.map((user) =>
          notifyRecipient(
            {
              phone: user.phone,
              whatsappNotifications: user.whatsappNotifications,
              smsNotifications: user.smsNotifications,
            },
            `${args.title} — ${args.body}`,
          ),
        ),
      );
    }
  } catch (err) {
    console.error(
      `[notifications] backer broadcast failed for campaign ${campaignId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
