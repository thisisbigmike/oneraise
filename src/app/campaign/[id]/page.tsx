'use client';

import { useState, use, type FormEvent } from 'react';
import Link from 'next/link';
import { CAMPAIGN_SEEDS, getCampaignPct } from '@/lib/campaign-seeds';
import './campaign.css';

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const campaign = CAMPAIGN_SEEDS[resolvedParams.id];
  const [activeTab, setActiveTab] = useState<'story' | 'updates' | 'donors'>('story');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('fake');
  const [reportDetails, setReportDetails] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [reportError, setReportError] = useState('');

  if (!campaign) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#fff' }}>
        <h2>Campaign Not Found</h2>
        <Link href="/explore" style={{ color: '#1D9E75' }}>Return to Explore</Link>
      </div>
    );
  }

  const pct = getCampaignPct(campaign.raised, campaign.goal);
  const reportReasons = [
    { value: 'fake', label: 'Fake campaign' },
    { value: 'misleading', label: 'Misleading information' },
    { value: 'prohibited', label: 'Prohibited content' },
    { value: 'suspicious-payment', label: 'Suspicious payment activity' },
    { value: 'other', label: 'Other' },
  ];

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportStatus('submitting');
    setReportError('');

    try {
      const response = await fetch(`/api/campaigns/${campaign.slug}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails,
          campaignTitle: campaign.title,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Unable to report this campaign.');
      }

      setReportStatus('success');
      setReportDetails('');
    } catch (error: unknown) {
      setReportStatus('error');
      setReportError(error instanceof Error ? error.message : 'Unable to report this campaign.');
    }
  }

  // Mock data for updates
  const updates = [
    { id: 1, date: '2 days ago', title: 'We reached 50%!', content: 'Thank you all so much for the support! We are halfway to our goal.' },
    { id: 2, date: '1 week ago', title: 'Campaign Launched', content: 'We are live! Please share with your friends and family.' }
  ];

  // Mock data for donors
  const donors = [
    { id: 1, name: 'Anonymous', amount: 500, time: '2 hours ago', initial: 'A' },
    { id: 2, name: 'Sarah J.', amount: 100, time: '5 hours ago', initial: 'S' },
    { id: 3, name: 'Michael T.', amount: 250, time: '1 day ago', initial: 'M' },
    { id: 4, name: 'Elena R.', amount: 50, time: '2 days ago', initial: 'E' },
  ];

  return (
    <div className="campaign-detail-page">
      <nav id="main-nav" style={{ position: 'sticky', top: 0, background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 100 }}>
        <Link href="/" className="nav-logo">One<span>Raise</span></Link>
        <ul className="nav-links">
          <li><Link href="/explore">Explore</Link></li>
          <li><Link href="/about">How it works</Link></li>
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/#community">Community</Link></li>
        </ul>
        <div className="nav-actions">
          <Link href="/auth?mode=signin" className="btn-ghost-nav">Sign in</Link>
          <Link href="/join" className="btn-primary-nav">Start a campaign</Link>
        </div>
      </nav>

      <main className="campaign-container">
        {/* Header Section */}
        <div className="campaign-hero">
          <div className="campaign-hero-left">
            <div className="campaign-badge">{campaign.category}</div>
            <h1 className="campaign-title">{campaign.title}</h1>
            <p className="campaign-subtitle">{campaign.desc}</p>
            <div className="campaign-creator">
              <div className="creator-avatar">{campaign.creatorInitials}</div>
              <div>
                <div className="creator-name">By {campaign.creator}</div>
                <div className="creator-verified">
                  {campaign.verified && <span style={{ color: '#1D9E75' }}>✓ Verified Creator</span>}
                </div>
              </div>
            </div>
            
            <div className="campaign-image-placeholder">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
          </div>

          <div className="campaign-hero-right">
            <div className="funding-card">
              <div className="funding-raised">
                ${campaign.raised.toLocaleString()}
                <span className="funding-goal"> raised of ${campaign.goal.toLocaleString()} goal</span>
              </div>
              
              <div className="c-progress-track" style={{ margin: '20px 0' }}>
                <div className="c-progress-fill" style={{ width: `${pct}%` }}></div>
              </div>

              <div className="funding-stats">
                <div className="stat-box">
                  <div className="stat-val">{pct}%</div>
                  <div className="stat-lbl">funded</div>
                </div>
                <div className="stat-box">
                  <div className="stat-val">{campaign.backers}</div>
                  <div className="stat-lbl">backers</div>
                </div>
                <div className="stat-box">
                  <div className="stat-val">{campaign.daysLeft}</div>
                  <div className="stat-lbl">days left</div>
                </div>
              </div>

              <button className="btn-primary-nav btn-donate">
                Back this project
              </button>

              <p className="trust-note">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <rect x="2" y="4" width="10" height="8" rx="2" stroke="#1D9E75" strokeWidth="1.2"/>
                  <path d="M5 4V3a2 2 0 014 0v1" stroke="#1D9E75" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Secure payments by Stripe & Moonpay
              </p>

              <button
                type="button"
                className="report-campaign-btn"
                onClick={() => {
                  setIsReportOpen(true);
                  setReportStatus('idle');
                  setReportError('');
                }}
              >
                Report this campaign
              </button>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="campaign-tabs-wrapper">
          <div className="campaign-tabs">
            <button className={`tab-btn ${activeTab === 'story' ? 'active' : ''}`} onClick={() => setActiveTab('story')}>Story</button>
            <button className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`} onClick={() => setActiveTab('updates')}>Updates <span className="tab-badge">{updates.length}</span></button>
            <button className={`tab-btn ${activeTab === 'donors' ? 'active' : ''}`} onClick={() => setActiveTab('donors')}>Donors <span className="tab-badge">{donors.length}</span></button>
          </div>
        </div>

        <div className="campaign-content">
          {activeTab === 'story' && (
            <div className="content-section story-section">
              <h2>About this campaign</h2>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <h3>Why we need your help</h3>
              <p>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </p>
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="content-section updates-section">
              <h2>Campaign Updates</h2>
              {updates.map((update) => (
                <div key={update.id} className="update-card">
                  <div className="update-meta">{update.date}</div>
                  <h3 className="update-title">{update.title}</h3>
                  <p className="update-content">{update.content}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'donors' && (
            <div className="content-section donors-section">
              <h2>Recent Donors</h2>
              <div className="donors-list">
                {donors.map((donor) => (
                  <div key={donor.id} className="donor-card">
                    <div className="donor-avatar">{donor.initial}</div>
                    <div className="donor-info">
                      <div className="donor-name">{donor.name}</div>
                      <div className="donor-amount">
                        ${donor.amount} <span className="donor-time">• {donor.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {isReportOpen && (
        <div className="report-modal-backdrop" role="presentation">
          <div className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-campaign-title">
            <div className="report-modal-header">
              <div>
                <h2 id="report-campaign-title">Report this campaign</h2>
                <p>Tell us what looks wrong. Your report will be sent to the admin dashboard.</p>
              </div>
              <button
                type="button"
                className="report-modal-close"
                aria-label="Close report dialog"
                onClick={() => setIsReportOpen(false)}
              >
                ×
              </button>
            </div>

            {reportStatus === 'success' ? (
              <div className="report-success">
                <div className="report-success-icon">✓</div>
                <h3>Report submitted</h3>
                <p>Thanks. The admin team can now review this campaign flag.</p>
                <button type="button" className="btn-primary-nav report-submit-btn" onClick={() => setIsReportOpen(false)}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitReport} className="report-form">
                <fieldset className="report-reason-group">
                  <legend>Why are you reporting it?</legend>
                  {reportReasons.map((reason) => (
                    <label key={reason.value} className="report-reason-option">
                      <input
                        type="radio"
                        name="report-reason"
                        value={reason.value}
                        checked={reportReason === reason.value}
                        onChange={(event) => setReportReason(event.target.value)}
                      />
                      <span>{reason.label}</span>
                    </label>
                  ))}
                </fieldset>

                <label className="report-details-label" htmlFor="report-details">
                  Details
                </label>
                <textarea
                  id="report-details"
                  className="report-details-input"
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                  rows={4}
                  maxLength={800}
                  placeholder="Add context for the admin team"
                />

                {reportError && <div className="report-error">{reportError}</div>}

                <div className="report-modal-actions">
                  <button type="button" className="report-cancel-btn" onClick={() => setIsReportOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary-nav report-submit-btn" disabled={reportStatus === 'submitting'}>
                    {reportStatus === 'submitting' ? 'Submitting...' : 'Submit report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
