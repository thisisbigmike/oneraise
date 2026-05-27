import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDonationBackerKey } from '@/lib/backers';
import { getStoredDonationCreditUsd } from '@/lib/currency';

const AVATAR_CLASSES = ['ta1', 'ta2', 'ta3'];

function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '??';
}

function formatAmount(usd: number) {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`;
  return `$${Math.round(usd)}`;
}

export async function GET() {
  try {
    const [allDonations, creatorCount, completedCampaigns, recentDonations] = await Promise.all([
      prisma.donation.findMany({
        where: { status: 'completed' },
        select: { amount: true, currency: true, coverFee: true, provider: true, providerDataJson: true, userId: true, donorEmail: true },
      }),
      prisma.user.count({ where: { role: 'creator' } }),
      prisma.campaign.findMany({
        where: { status: 'completed' },
        select: { raised: true, goal: true },
      }),
      prisma.donation.findMany({
        where: { status: 'completed', isAnonymous: false },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          donorName: true,
          isAnonymous: true,
          amount: true,
          currency: true,
          coverFee: true,
          provider: true,
          providerDataJson: true,
          campaign: { select: { title: true } },
        },
      }),
    ]);

    const totalRaisedUsd = allDonations.reduce((sum, d) => sum + getStoredDonationCreditUsd(d), 0);
    const uniqueBackers = new Set(allDonations.map(getDonationBackerKey).filter(Boolean)).size;
    const successRate = completedCampaigns.length > 0
      ? Math.round(completedCampaigns.filter(c => c.raised >= c.goal).length / completedCampaigns.length * 100)
      : 0;

    const recentActivity = recentDonations
      .filter(d => !d.isAnonymous && d.donorName)
      .slice(0, 6)
      .map((d, i) => {
        const name = d.donorName || 'Supporter';
        const amountUsd = getStoredDonationCreditUsd(d);
        return {
          init: getInitials(name),
          cls: AVATAR_CLASSES[i % 3],
          name,
          action: `backed ${d.campaign.title}`,
          amount: formatAmount(amountUsd),
        };
      });

    return NextResponse.json({
      totalRaisedUsd,
      creatorCount,
      uniqueBackers,
      successRate,
      recentActivity,
    });
  } catch (error) {
    console.error('platform-stats error', error);
    return NextResponse.json(
      { totalRaisedUsd: 0, creatorCount: 0, uniqueBackers: 0, successRate: 0, recentActivity: [] },
      { status: 200 }
    );
  }
}
