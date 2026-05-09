import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getCampaignPct } from '@/lib/campaign-seeds';

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
    const raised = c.donations.reduce((sum, d) => sum + d.amount, 0);
    return {
      ...c,
      raised,
      pct: getCampaignPct(raised, c.goal),
      creator: c.user?.name || 'OneRaise Creator'
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
            <Link key={c.id} href={`/backer/donate/${c.slug}`} className="campaign-card" style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ position: 'relative', height: 200, overflow: 'hidden', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image || '/placeholder-campaign.jpg'} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: 20, fontSize: 12, color: 'white' }}>
                  {c.category}
                </div>
              </div>
              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: 18, marginBottom: 4, fontWeight: 600 }}>{c.title}</h3>
                <div className="s-hint" style={{ marginBottom: 16 }}>by {c.creator}</div>
                
                <div style={{ marginTop: 'auto' }}>
                  <div className="sc-progress-bar" style={{ height: 6 }}><div className="sc-progress-fill" style={{ width: `${c.pct}%` }}></div></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 14 }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--teal-200)' }}>${c.raised.toLocaleString()}</span>
                      <span style={{ color: 'var(--w50)' }}> raised</span>
                    </div>
                    <div style={{ fontWeight: 600 }}>{c.pct}%</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
