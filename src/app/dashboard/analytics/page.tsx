import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getStoredDonationCreditUsd } from "@/lib/currency";
import AnalyticsClient, { AnalyticsEvent } from "./AnalyticsClient";

type SessionUser = {
  id?: string;
  role?: string | null;
};

const providerLabel = (provider?: string | null) => {
  switch (provider) {
    case "moonpay":
      return "Card";
    case "busha_crypto":
      return "Crypto";
    case "busha_ng":
      return "Nigeria bank";
    case "busha_ke":
      return "M-Pesa";
    default:
      return provider || "Other";
  }
};

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as SessionUser | undefined;

  if (!sessionUser?.id) {
    redirect("/auth?mode=signin");
  }

  const role = sessionUser.role || "creator";
  const isCreator = role === "creator";
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const donations = await prisma.donation.findMany({
    where: {
      createdAt: { gte: since },
      ...(isCreator ? { campaign: { userId: sessionUser.id } } : { userId: sessionUser.id }),
    },
    include: {
      campaign: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const events: AnalyticsEvent[] = donations.map((donation) => ({
    id: donation.id,
    campaign: donation.campaign.title,
    provider: providerLabel(donation.provider),
    amountUsd: getStoredDonationCreditUsd(donation),
    status: donation.status === "completed" ? "completed" : donation.status === "failed" ? "failed" : "pending",
    dateIso: donation.createdAt.toISOString(),
  }));

  return <AnalyticsClient events={events} />;
}
