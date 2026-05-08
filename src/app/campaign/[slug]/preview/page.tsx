import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';

export default async function CampaignPreviewPage({ params }: { params: { slug: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    include: {
      user: true,
      donations: true,
    }
  });

  if (!campaign) {
    notFound();
  }

  const raised = campaign.raised || 0;
  const goal = campaign.goal || 1;
  const pct = Math.min(100, Math.round((raised / goal) * 100));
  
  const daysLeftRaw = Math.ceil((new Date(campaign.createdAt).getTime() + 30 * 86400000 - Date.now()) / 86400000);
  const daysLeft = daysLeftRaw > 0 ? daysLeftRaw : 0;
  
  const donorsCount = campaign.donations.length || 0;
  const authorName = campaign.user?.name || 'Campaign Organizer';
  const authorImage = campaign.user?.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2QhO8fXpH1jcfJW4rjHA953Ol8v4pQz_MXH3kCha-4c0y1MiY3NBnbJTjjcMlO26YEt91KeSXnDvCNlGG-PyKZibDBwjbHR86MxGevEvaDbSToJDZe_h6u7-7gPwZyggsT02_vskEpbHSbIoXDmqwqtahzg7sDR71SxbpFWsyk4CNhF4Y2ebDM747_0W5zhzhuF9MdvPtdWQJPVRQfK9UWudQNlsrTJNBP72322APsYT0o7-oFrLoUcIXvoNklFaANhbPEo8ywb6r';

  const defaultHeroImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuDXmszubu9v1-qIXOPRJR0dR-JOJ1uRchsddTZN_e_Sqevrlpmx5F6FTtnZAlFo7ou5b82tsjnyMidll0kIZbTOt6PJhr20kyQ4P03WmP1f7AMsXMwhILDVgHeFqnjEJgT5ujOFWFh5magy9adqmjxXvyKxl3CHS5LtnIRog0X_qS-eXxOOyueARHtTQ86yv2HiQ-3lhVhC7CanEoheTGBCVb1J7Dqr_j8kgHSk-ugVIopcmYDgcqNr-b3ctlBjnqwEF6zQqmY3-Y1I";
  const heroImage = campaign.image || defaultHeroImage;

  return (
    <div className="preview-body">
      {/* Top App Bar (Mobile Context) */}
      <header className="preview-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/dashboard/campaigns" className="preview-icon-btn">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <span className="preview-topbar-title">Donation Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="preview-icon-btn">
            <span className="material-symbols-outlined">share</span>
          </button>
        </div>
      </header>

      <main className="preview-main">
        {/* Hero Image Section */}
        <section className="preview-hero">
          <img alt="Campaign Hero" src={heroImage} />
          <div className="preview-hero-gradient"></div>
        </section>

        <div className="preview-grid">
          {/* Main Content Area */}
          <div className="preview-content">
            {/* Header Info */}
            <div style={{ marginBottom: '48px' }}>
              <div className="preview-category-row">
                <span className="preview-badge">{campaign.category}</span>
                <span className="preview-location">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>
                  Global
                </span>
              </div>
              <h1 className="preview-title">{campaign.title}</h1>
              <div className="preview-author-row">
                <div className="preview-author-avatar">
                  <img alt="Organizer" src={authorImage} />
                </div>
                <div>
                  <p className="preview-author-name">{authorName}</p>
                  <p className="preview-author-sub">Verified Campaigner</p>
                </div>
              </div>
            </div>

            {/* Story Content */}
            <article className="preview-story">
              <p style={{ fontSize: '20px', fontWeight: 400, color: 'var(--m3-on-surface)', marginBottom: '32px' }}>
                {campaign.description || "No description provided for this campaign yet."}
              </p>
              
              {/* Optional: Add more structured story content here if the campaign description is rich text */}
            </article>
          </div>

          {/* Sticky Donation Card (Desktop Sidebar) */}
          <aside className="preview-sidebar">
            <div className="preview-widget">
              <div style={{ marginBottom: '16px' }}>
                <div className="preview-stats-row">
                  <span className="preview-raised">${raised.toLocaleString()}</span>
                  <span className="preview-goal">raised of ${goal.toLocaleString()}</span>
                </div>
                <div className="preview-progress-track">
                  <div className="preview-progress-fill" style={{ width: `${pct}%` }}></div>
                </div>
              </div>

              <div className="preview-stats-details">
                <div className="preview-stats-col">
                  <span className="preview-stats-val">{donorsCount}</span>
                  <span>Donors</span>
                </div>
                <div className="preview-stats-divider"></div>
                <div className="preview-stats-col">
                  <span className="preview-stats-val">{daysLeft}</span>
                  <span>Days left</span>
                </div>
              </div>

              <h3 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '14px', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '12px' }}>
                Select Amount
              </h3>
              
              <div className="preview-tiers">
                <button className="preview-tier-btn">$25</button>
                <button className="preview-tier-btn selected">$50</button>
                <button className="preview-tier-btn">$100</button>
              </div>

              <div className="preview-custom-amount">
                <span className="preview-custom-prefix">$</span>
                <input className="preview-custom-input" type="number" placeholder="Custom amount" />
              </div>

              <button className="preview-donate-btn">
                Donate Now
              </button>

              <p className="preview-secure-text">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock</span>
                Secure donation (Preview Mode)
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="preview-mobile-bar">
        <div className="preview-mb-stats">
          <div className="preview-mb-row">
            <span className="preview-mb-raised">
              ${raised.toLocaleString()} <span className="preview-mb-goal">raised of ${(goal/1000).toFixed(0)}k</span>
            </span>
            <span className="preview-mb-donors">{donorsCount} Donors</span>
          </div>
          <div className="preview-mb-track">
            <div className="preview-progress-fill" style={{ width: `${pct}%` }}></div>
          </div>
        </div>
        <div className="preview-mb-actions">
          <button className="preview-mb-btn">$25</button>
          <button className="preview-mb-btn selected">$50</button>
          <button className="preview-mb-donate">
            Donate
          </button>
        </div>
      </div>
    </div>
  );
}
