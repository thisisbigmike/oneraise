import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { finalizeEndedCampaigns } from "@/lib/campaign-lifecycle";
import prisma from "@/lib/prisma";
import NotificationsClient, { NotificationItem } from "./NotificationsClient";

type SessionUser = {
  id?: string;
  role?: string | null;
};

const money = (amount: number, currency = "USD") =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} ${currency}`;

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as SessionUser | undefined;

  if (!sessionUser?.id) {
    redirect("/auth?mode=signin");
  }

  const role = sessionUser.role || "creator";
  const isCreator = role === "creator";

  await finalizeEndedCampaigns();

  const donations = await prisma.donation.findMany({
    where: isCreator
      ? { campaign: { userId: sessionUser.id } }
      : { userId: sessionUser.id },
    include: {
      campaign: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const payouts = isCreator
    ? await prisma.payout.findMany({
        where: { userId: sessionUser.id },
        include: {
          campaign: {
            select: {
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      })
    : [];

  const endedCampaigns = isCreator
    ? await prisma.campaign.findMany({
        where: {
          userId: sessionUser.id,
          status: "completed",
        },
        select: {
          id: true,
          title: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      })
    : [];

  const donationItems: NotificationItem[] = donations.map((donation) => {
    const donor = donation.isAnonymous ? "Anonymous" : donation.donorName || "A backer";
    const statusText = donation.status === "completed" ? "confirmed" : donation.status;

    return {
      id: `donation-${donation.id}`,
      type: donation.status === "completed" ? "donation" : "system",
      title: isCreator ? "Donation update" : "Your donation update",
      desc: isCreator
        ? `${donor} backed ${donation.campaign.title} with ${money(donation.amount, donation.currency)}. Status: ${statusText}.`
        : `${donation.campaign.title} donation is ${statusText}. Amount: ${money(donation.amount, donation.currency)}.`,
      dateIso: donation.createdAt.toISOString(),
      read: donation.status === "completed",
    };
  });

  const payoutItems: NotificationItem[] = payouts.map((payout) => ({
    id: `payout-${payout.id}`,
    type: "system",
    title: "Payout update",
    desc: `${money(payout.amount, payout.targetCurrency)} payout for ${payout.campaign?.title || "your account"} is ${payout.status}.`,
    dateIso: payout.createdAt.toISOString(),
    read: payout.status === "completed",
  }));

  const endedCampaignItems: NotificationItem[] = endedCampaigns.map((campaign) => ({
    id: `campaign-ended-${campaign.id}`,
    type: "system",
    title: "Campaign window closed",
    desc: `${campaign.title} has ended. Review final results and continue with payout or Protect verification.`,
    dateIso: campaign.updatedAt.toISOString(),
    read: false,
  }));

  const notifications = [...endedCampaignItems, ...donationItems, ...payoutItems].sort(
    (a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime(),
  );

  return <NotificationsClient initialNotifications={notifications} />;
}
