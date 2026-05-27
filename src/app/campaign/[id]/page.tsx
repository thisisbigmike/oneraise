'use client';

import { useEffect, useState, use, type FormEvent } from 'react';
import Link from 'next/link';
import { getCampaignPct } from '@/lib/campaign-seeds';
import { decryptPayload, verifyBackerStatus, isUmbraProtected } from '@/lib/umbra';
import CampaignAssistant from '@/components/CampaignAssistant';
import './campaign.css';

type CampaignDonor = {
  id: string;
  name: string;
  amount: number;
  time: string;
  initial: string;
};

type CampaignMilestone = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  proofUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type CampaignView = {
  id: number;
  slug: string;
  title: string;
  image?: string | null;
  creator: string;
  creatorInitials: string;
  creatorImage?: string | null;
  raised: number;
  goal: number;
  category: string;
  desc: string;
  backers: number;
  daysLeft: number;
  endDate?: string;
  isEnded?: boolean;
  goalMet?: boolean;
  outcomeLabel?: string;
  verified: boolean;
  status: 'active' | 'completed' | 'draft';
  type: 'standard' | 'protected_crowdfunding' | 'emergency_aid' | 'grant_distribution';
  protectStatus: string;
  milestones?: CampaignMilestone[];
  recentDonors?: CampaignDonor[];
};

const TYPE_LABELS: Record<string, string> = {
  protected_crowdfunding: 'Protected crowdfunding',
  emergency_aid: 'Emergency aid escrow',
  grant_distribution: 'Grant distribution',
};

const PROTECT_STATUS_LABELS: Record<string, string> = {
  funding: 'Funding',
  locked: 'Funds locked',
  pending_verification: 'Pending verification',
  unlocked: 'Funds released',
  refunded: 'Refunded',
};

const MILESTONE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending proof',
  submitted: 'Proof submitted',
  approved: 'Approved',
  rejected: 'Needs revision',
};

function isProtectedType(type?: string) {
  return type === 'protected_crowdfunding' || type === 'emergency_aid' || type === 'grant_distribution';
}

function getProtectTone(status?: string) {
  if (status === 'unlocked' || status === 'approved') return '#5DCAA5';
  if (status === 'pending_verification' || status === 'submitted') return '#EF9F27';
  if (status === 'refunded') return '#85B7EB';
  if (status === 'rejected') return '#F09595';
  return '#1D9E75';
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'recently';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [campaign, setCampaign] = useState<CampaignView | undefined>(undefined);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(true);
  const [activeTab, setActiveTab] = useState<'story' | 'protect' | 'updates' | 'donors'>('story');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('fake');
  const [reportDetails, setReportDetails] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [reportError, setReportError] = useState('');

  // Umbra Decryption State
  const [umbraDecrypted, setUmbraDecrypted] = useState<Record<string, string>>({});
  const [isDecrypting, setIsDecrypting] = useState<Record<string, boolean>>({});

  const handleUmbraDecrypt = async (milestoneId: string, ciphertext: string) => {
    setIsDecrypting(current => ({ ...current, [milestoneId]: true }));
    try {
      const isVerified = await verifyBackerStatus(campaign?.id.toString() || '');
      if (isVerified) {
        const decrypted = await decryptPayload(ciphertext);
        setUmbraDecrypted(current => ({ ...current, [milestoneId]: decrypted }));
      } else {
        alert("Verification failed: You must be a verified backer of this campaign to decrypt expense reports.");
      }
    } catch (error) {
      alert("Decryption failed. You do not have the required access rights.");
    } finally {
      setIsDecrypting(current => ({ ...current, [milestoneId]: false }));
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadCampaign() {
      setIsLoadingCampaign(true);
      try {
        const response = await fetch(`/api/campaigns/${resolvedParams.id}`, { cache: 'no-store' });
        const result = await response.json();

        if (!ignore && response.ok && result.campaign) {
          setCampaign(result.campaign);
        } else if (!ignore && response.status === 404) {
          setCampaign(undefined);
        }
      } catch {
        // Keep the seed fallback if live data is unavailable.
      } finally {
        if (!ignore) setIsLoadingCampaign(false);
      }
    }

    loadCampaign();

    return () => {
      ignore = true;
    };
  }, [resolvedParams.id]);

  if (!campaign && isLoadingCampaign) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#fff' }}>
        <h2>Loading campaign...</h2>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#fff' }}>
        <h2>Campaign Not Found</h2>
        <Link href="/explore" style={{ color: '#1D9E75' }}>Return to Explore</Link>
      </div>
    );
  }

  const pct = getCampaignPct(campaign.raised, campaign.goal);
  const isProtectedCampaign = isProtectedType(campaign.type);
  const isCampaignEnded = campaign.isEnded || campaign.status === 'completed';
  const milestones = campaign.milestones || [];
  const reportReasons = [
    { value: 'fake', label: 'Fake campaign' },
    { value: 'misleading', label: 'Misleading information' },
    { value: 'prohibited', label: 'Prohibited content' },
    { value: 'suspicious-payment', label: 'Suspicious payment activity' },
    { value: 'other', label: 'Other' },
  ];

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!campaign) return;
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

  const updates: { id: number; date: string; title: string; content: string }[] = [];
  const fallbackDonors = [
    { id: 1, name: 'Anonymous', amount: 500, time: '2 hours ago', initial: 'A' },
    { id: 2, name: 'Sarah J.', amount: 100, time: '5 hours ago', initial: 'S' },
    { id: 3, name: 'Michael T.', amount: 250, time: '1 day ago', initial: 'M' },
    { id: 4, name: 'Elena R.', amount: 50, time: '2 days ago', initial: 'E' },
  ];
  const donors = campaign.recentDonors?.length
    ? campaign.recentDonors.map((donor) => ({
        ...donor,
        time: formatRelativeTime(donor.time),
      }))
    : fallbackDonors;

  return (
    <div className="campaign-detail-page">
      <nav id="main-nav" style={{ position: 'sticky', top: 0, background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 100 }}>
        <Link href="/" className="nav-logo">One<span>Raise</span></Link>
        <ul className="nav-links">
          <li><Link href="/explore">Explore</Link></li>
          <li><Link href="/protect">Protect</Link></li>
          <li><Link href="/how-it-works">How it works</Link></li>
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
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              <div className="campaign-badge" style={{ marginBottom: 0 }}>{campaign.category}</div>
              {isProtectedCampaign && (
                <div className="campaign-badge protect-campaign-badge">
                  <span className="protect-badge-dot" />
                  OneRaise Protect
                </div>
              )}
            </div>
            <h1 className="campaign-title">{campaign.title}</h1>
            <p className="campaign-subtitle">{campaign.desc}</p>
            <div className="campaign-creator">
              {campaign.creatorImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={campaign.creatorImage} alt={campaign.creator} className="creator-avatar creator-avatar-img" />
              ) : (
                <div className="creator-avatar">{campaign.creatorInitials}</div>
              )}
              <div>
                <div className="creator-name">By {campaign.creator}</div>
                <div className="creator-verified">
                  {campaign.verified && <span style={{ color: '#1D9E75' }}>✓ Verified Creator</span>}
                </div>
              </div>
            </div>
            
            <div className="campaign-image-placeholder">
              {campaign.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={campaign.image} alt={`${campaign.title} cover`} />
              ) : (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              )}
            </div>
          </div>

          <div className="campaign-hero-right">
            <div className="funding-card">
              {isProtectedCampaign && (
                <div className="protect-summary-card">
                  <div className="protect-summary-top">
                    <span>{TYPE_LABELS[campaign.type] || 'Protected campaign'}</span>
                    <strong style={{ color: getProtectTone(campaign.protectStatus) }}>
                      {PROTECT_STATUS_LABELS[campaign.protectStatus] || campaign.protectStatus}
                    </strong>
                  </div>
                  <p>Funds are tied to milestone proof before release.</p>
                </div>
              )}
              {isCampaignEnded && (
                <div className="campaign-ended-banner">
                  <strong>Campaign ended</strong>
                  <span>{campaign.outcomeLabel || 'The funding window has closed. New donations are no longer accepted.'}</span>
                </div>
              )}
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
                  <div className="stat-val">{isCampaignEnded ? 'Ended' : campaign.daysLeft}</div>
                  <div className="stat-lbl">{isCampaignEnded ? 'status' : 'days left'}</div>
                </div>
              </div>

              {isCampaignEnded ? (
                <div className="btn-primary-nav btn-donate btn-donate-disabled" aria-disabled="true">
                  Campaign ended
                </div>
              ) : (
                <Link href={`/backer/donate/${campaign.slug}`} className="btn-primary-nav btn-donate">
                  Back this project
                </Link>
              )}

              {isCampaignEnded && (
                <div className="campaign-final-results">
                  <div>
                    <span>Total raised</span>
                    <strong>${campaign.raised.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Final progress</span>
                    <strong>{pct}%</strong>
                  </div>
                  <div>
                    <span>Backers</span>
                    <strong>{campaign.backers.toLocaleString()}</strong>
                  </div>
                </div>
              )}

              <p className="trust-note">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <rect x="2" y="4" width="10" height="8" rx="2" stroke="#1D9E75" strokeWidth="1.2"/>
                  <path d="M5 4V3a2 2 0 014 0v1" stroke="#1D9E75" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {isProtectedCampaign ? 'Protected by escrow, verification, and milestone release' : 'Secure payments by Stripe & Moonpay'}
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
            {isProtectedCampaign && (
              <button className={`tab-btn ${activeTab === 'protect' ? 'active' : ''}`} onClick={() => setActiveTab('protect')}>
                Protect <span className="tab-badge">{milestones.length}</span>
              </button>
            )}
            <button className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`} onClick={() => setActiveTab('updates')}>Updates <span className="tab-badge">{updates.length}</span></button>
            <button className={`tab-btn ${activeTab === 'donors' ? 'active' : ''}`} onClick={() => setActiveTab('donors')}>Donors <span className="tab-badge">{donors.length}</span></button>
          </div>
        </div>

        <div className="campaign-content">
          {activeTab === 'story' && (
            <div className="content-section story-section">
              <h2>About this campaign</h2>
              <p>{campaign.desc || 'This creator has not added a detailed campaign story yet.'}</p>
              <h3>Why we need your help</h3>
              <p>
                Every contribution moves this campaign closer to its goal. Your donation is tracked securely and reflected in the campaign progress once payment is confirmed.
              </p>
            </div>
          )}

          {activeTab === 'protect' && isProtectedCampaign && (
            <div className="content-section protect-section">
              <h2>OneRaise Protect timeline</h2>
              <p>
                This campaign uses OneRaise Protect. Funds can be held against milestone rules and released when progress is proven.
              </p>

              <div className="protect-status-strip">
                {['funding', 'locked', 'pending_verification', 'unlocked'].map((status) => (
                  <div
                    key={status}
                    className={`protect-status-step ${campaign.protectStatus === status ? 'active' : ''}`}
                    style={{
                      borderColor: campaign.protectStatus === status ? getProtectTone(status) : undefined,
                    }}
                  >
                    <span>{PROTECT_STATUS_LABELS[status]}</span>
                  </div>
                ))}
              </div>

              <div className="protect-milestone-list">
                {milestones.length === 0 && (
                  <div className="protect-empty-note">Milestones have not been published yet.</div>
                )}
                {milestones.map((milestone, index) => (
                  <div key={milestone.id} className="protect-timeline-item">
                    <div className="protect-timeline-index" style={{ background: getProtectTone(milestone.status) }}>
                      {index + 1}
                    </div>
                    <div className="protect-timeline-body">
                      <div className="protect-timeline-head">
                        <h3>{milestone.title}</h3>
                        <span style={{ color: getProtectTone(milestone.status), background: `${getProtectTone(milestone.status)}18` }}>
                          {MILESTONE_STATUS_LABELS[milestone.status] || milestone.status}
                        </span>
                      </div>
                      {milestone.description && <p>{milestone.description}</p>}
                      {milestone.proofUrl && (
                        <div className="protect-proof-note">
                          Proof submitted: {milestone.proofUrl.startsWith('http') ? (
                            <a href={milestone.proofUrl} target="_blank" rel="noreferrer">open proof</a>
                          ) : (
                            milestone.proofUrl
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="content-section updates-section">
              <h2>Milestones & Reports</h2>
              {campaign?.milestones && campaign.milestones.length > 0 ? (
                campaign.milestones.map((milestone) => (
                  <div key={milestone.id} className="update-card">
                    <div className="update-meta">{formatRelativeTime(milestone.createdAt)} • {MILESTONE_STATUS_LABELS[milestone.status] || milestone.status}</div>
                    <h3 className="update-title">{milestone.title}</h3>
                    {milestone.description && <p className="update-content" style={{ marginBottom: 12 }}>{milestone.description}</p>}
                    
                    {milestone.proofUrl && (
                      <div style={{ marginTop: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Expense Report / Receipt</div>
                        
                        {isUmbraProtected(milestone.proofUrl) && !umbraDecrypted[milestone.id] ? (
                          <div style={{ background: 'rgba(147, 51, 234, 0.05)', border: '1px dashed rgba(147, 51, 234, 0.4)', borderRadius: 6, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ background: '#9333ea', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                              </div>
                              <div>
                                <div style={{ color: '#d8b4fe', fontWeight: 600, fontSize: 13 }}>Encrypted via Umbra Privacy</div>
                                <div style={{ color: 'var(--w50)', fontSize: 12 }}>Only verified backers can audit this document</div>
                              </div>
                            </div>
                            <button 
                              className="btn-primary" 
                              style={{ background: '#9333ea', borderColor: '#9333ea', fontSize: 13, padding: '6px 12px' }}
                              onClick={() => handleUmbraDecrypt(milestone.id, milestone.proofUrl!)}
                              disabled={isDecrypting[milestone.id]}
                            >
                              {isDecrypting[milestone.id] ? 'Verifying...' : 'Authenticate to Decrypt'}
                            </button>
                          </div>
                        ) : (
                          <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 6, fontFamily: 'monospace', fontSize: 13, color: 'var(--teal-200)', wordBreak: 'break-all' }}>
                            {umbraDecrypted[milestone.id] || milestone.proofUrl}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="empty-content-note">No milestones or reports have been posted for this campaign yet.</p>
              )}
              
              <h2 style={{ marginTop: 40 }}>Campaign Updates</h2>
              {updates.length > 0 ? updates.map((update) => (
                <div key={update.id} className="update-card">
                  <div className="update-meta">{update.date}</div>
                  <h3 className="update-title">{update.title}</h3>
                  <p className="update-content">{update.content}</p>
                </div>
              )) : (
                <p className="empty-content-note">No general updates have been posted for this campaign yet.</p>
              )}
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

      <CampaignAssistant />
    </div>
  );
}
