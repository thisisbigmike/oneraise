import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getCampaignPct } from '@/lib/campaign-seeds';

import { getStoredDonationCreditUsd } from '@/lib/currency';
import CampaignCard from '@/components/ui/CampaignCard';

export default async function SavedCampaignsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    redirect('/auth?mode=signin');
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    include: {
      campaign: {
        include: {
          user: {
            select: { name: true }
          },
          donations: {
            where: { status: 'completed' }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const savedCampaigns = bookmarks.map(b => {
    const c = b.campaign;
    const raised = c.donations.reduce((sum, d) => sum + getStoredDonationCreditUsd(d as any), 0);
    const uniqueDonors = new Set(c.donations.map(d => (d.donorEmail || d.donorName || d.id).toLowerCase()));
    const daysLeft = c.status === "active" ? Math.max(0, Math.ceil((c.createdAt.getTime() + 30 * 86400000 - Date.now()) / 86400000)) : 0;
    
    return {
      ...c,
      raised,
      pct: getCampaignPct(raised, c.goal),
      creator: c.user?.name || 'OneRaise Creator',
      backers: uniqueDonors.size,
      daysLeft
    };
  });

  return (
    <div className="overview-page" style={{ padding: '32px 40px' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1 className="page-title">Saved Campaigns</h1>
        <div className="page-sub">Quickly access projects you&apos;re interested in.</div>
      </div>

      {savedCampaigns.length === 0 ? (
        <div className="content-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--w30)" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          </div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>No saved campaigns</h3>
          <p style={{ color: 'var(--w50)', marginBottom: 24 }}>You haven&apos;t bookmarked any projects yet.</p>
          <Link href="/backer/discover" className="btn-primary">Discover campaigns</Link>
        </div>
      ) : (
        <div className="campaign-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
          {savedCampaigns.map((c) => (
            <CampaignCard
              key={c.id}
              title={c.title}
              goal={c.goal}
              raised={c.raised}
              backers={c.backers}
              daysLeft={c.daysLeft}
              status={c.status}
              category={c.category}
              image={c.image}
              pct={c.pct}
              actions={
                <Link href={`/backer/donate/${c.slug}`} className="ucc-btn ucc-btn-primary">
                  View Campaign
                </Link>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
