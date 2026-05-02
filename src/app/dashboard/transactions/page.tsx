import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getStoredDonationCreditUsd } from "@/lib/currency";
import TransactionsClient, { TransactionRow, TransactionStats } from "./TransactionsClient";

type SessionUser = {
  id?: string;
  role?: string | null;
};

const statusFor = (status: string): TransactionRow["status"] => {
  if (status === "completed") return "confirmed";
  if (status === "failed") return "failed";
  return "pending";
};

const providerLabel = (provider?: string | null) => {
  switch (provider) {
    case "moonpay":
      return "Card via MoonPay";
    case "busha_crypto":
      return "Crypto via Busha";
    case "busha_ng":
      return "Nigeria bank transfer";
    case "busha_ke":
      return "Kenya M-Pesa";
    case "busha":
      return "Busha payout";
    default:
      return provider || "OneRaise";
  }
};

const compactId = (prefix: string, id: string) => `${prefix}-${id.slice(-6).toUpperCase()}`;

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as SessionUser | undefined;

  if (!sessionUser?.id) {
    redirect("/auth?mode=signin");
  }

  const role = sessionUser.role || "creator";
  const isCreator = role === "creator";

  const donations = await prisma.donation.findMany({
    where: isCreator
      ? { campaign: { userId: sessionUser.id } }
      : { userId: sessionUser.id },
    include: {
      campaign: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const payouts = isCreator
    ? await prisma.payout.findMany({
        where: { userId: sessionUser.id },
        include: {
          campaign: {
            select: {
              title: true,
              slug: true,
            },
          },
          payoutMethod: {
            select: {
              label: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const donationRows: TransactionRow[] = donations.map((donation) => {
    const donor = donation.isAnonymous ? "Anonymous" : donation.donorName || "Anonymous";
    const email = donation.isAnonymous ? "Hidden" : donation.donorEmail || "No email provided";

    return {
      id: donation.id,
      displayId: compactId("DON", donation.id),
      type: "donation",
      actor: isCreator ? donor : providerLabel(donation.provider),
      actorDetail: isCreator ? email : donation.campaign.title,
      campaign: donation.campaign.title,
      amount: donation.amount,
      amountUsd: getStoredDonationCreditUsd(donation),
      currency: donation.currency,
      status: statusFor(donation.status),
      provider: providerLabel(donation.provider),
      dateIso: donation.createdAt.toISOString(),
    };
  });

  const payoutRows: TransactionRow[] = payouts.map((payout) => ({
    id: payout.id,
    displayId: compactId("PAY", payout.id),
    type: "payout",
    actor: payout.payoutMethod?.label || providerLabel(payout.provider),
    actorDetail: payout.campaign?.title || "Account payout",
    campaign: payout.campaign?.title || "Multiple campaigns",
    amount: payout.amount,
    amountUsd: payout.amount,
    currency: payout.sourceCurrency,
    status: statusFor(payout.status),
    provider: providerLabel(payout.provider),
    dateIso: payout.createdAt.toISOString(),
  }));

  const rows = [...donationRows, ...payoutRows].sort(
    (a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime(),
  );

  const stats: TransactionStats = rows.reduce(
    (acc, row) => {
      const amount = row.amountUsd;
      acc.total += amount;
      if (row.status === "confirmed") acc.confirmed += amount;
      if (row.status === "pending") acc.pending += amount;
      if (row.status === "failed") acc.failed += amount;
      return acc;
    },
    { total: 0, confirmed: 0, pending: 0, failed: 0 },
  );

  return <TransactionsClient rows={rows} stats={stats} />;
}
