'use client';

import React, { useEffect, useState } from 'react';
import { useToast, Modal } from '../../components';

type CampaignStatus = 'active' | 'completed' | 'draft';

type CampaignManagerItem = {
  id: number;
  slug?: string;
  title: string;
  status: CampaignStatus;
  raised: number;
  goal: number;
  pct?: number;
  backers: number;
  daysLeft: number;
  category: string;
};

const INITIAL_CAMPAIGNS: CampaignManagerItem[] = [];

function normalizeStatus(status?: string): CampaignStatus {
  if (status === 'completed' || status === 'draft') return status;
  return 'active';
}

function getCampaignPct(raised: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(Math.round((raised / goal) * 100), 100);
}

function mapCampaignManagerItems(campaigns: CampaignManagerItem[]) {
  return campaigns.map((campaign) => ({
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    status: normalizeStatus(campaign.status),
    raised: campaign.raised,
    goal: campaign.goal,
    pct: campaign.pct ?? getCampaignPct(campaign.raised, campaign.goal),
    backers: campaign.backers,
    daysLeft: campaign.daysLeft,
    category: campaign.category,
  }));
}

function ImageUploadArea({ file, setFile }: { file: File | null, setFile: (f: File | null) => void }) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreview(null);
    }
  }, [file]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className="s-upload-area"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      style={{
        borderColor: dragActive ? 'var(--teal-400)' : '',
        backgroundColor: dragActive ? 'rgba(29,158,117,0.05)' : '',
      }}
    >
      {preview ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <img src={preview} alt="Preview" style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
          <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', zIndex: 10, position: 'relative' }} onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setFile(null);
          }}>Remove Image</button>
        </div>
      ) : (
        <>
          <div className="s-upload-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <p className="s-upload-title">Click to upload or drag and drop</p>
          <p className="s-upload-sub">SVG, PNG, JPG or GIF (max. 5MB)</p>
          <input className="s-upload-input" type="file" accept="image/*" onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              setFile(e.target.files[0]);
              e.target.value = '';
            }
          }} />
        </>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState('all');
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTitle, setShareTitle] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newCoverImage, setNewCoverImage] = useState<File | null>(null);
  const [newRewardTiers, setNewRewardTiers] = useState([{ title: '', amount: '' }]);
  const [newSlug, setNewSlug] = useState('');
  const [newVisibility, setNewVisibility] = useState('public');
  const [confirmPublish, setConfirmPublish] = useState<number | null>(null);
  const [manageId, setManageId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editCoverImage, setEditCoverImage] = useState<File | null>(null);
  const [editRewardTiers, setEditRewardTiers] = useState([{ title: '', amount: '' }]);
  const [editSlug, setEditSlug] = useState('');
  const [editVisibility, setEditVisibility] = useState('public');

  const refreshCampaigns = async () => {
    const res = await fetch('/api/campaigns?mine=true', { cache: 'no-store' });
    const data = await res.json();

    if (!res.ok || !Array.isArray(data.campaigns)) {
      throw new Error(data.error || 'Unable to load campaigns.');
    }

    setCampaigns(mapCampaignManagerItems(data.campaigns));
  };

  useEffect(() => {
    let ignore = false;

    const loadCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns?mine=true', { cache: 'no-store' });
        const data = await res.json();

        if (!ignore && res.ok && Array.isArray(data.campaigns)) {
          setCampaigns(mapCampaignManagerItems(data.campaigns));
        }
      } catch {
        // Keep the seeded campaign rows if live data is temporarily unavailable.
      }
    };

    loadCampaigns();

    return () => {
      ignore = true;
    };
  }, []);

  const formatAmount = (val: string) => {
    if (!val) return '';
    const parts = val.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const handleGoalChange = (val: string, setter: (val: string) => void) => {
    const cleanVal = val.replace(/[^0-9.]/g, '');
    const parts = cleanVal.split('.');
    const finalizedVal = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleanVal;
    setter(finalizedVal);
  };

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter);

  const handleShare = (title: string) => {
    setShareTitle(title);
    setShareOpen(true);
  };

  const handleCopyLink = () => {
    const slug = shareTitle.toLowerCase().replace(/\s+/g, '-');
    navigator.clipboard.writeText(`https://oneraise.com/campaign/${slug}`);
    showToast('Campaign link copied!', 'success');
    setShareOpen(false);
  };

  const handlePublish = async (id: number) => {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign?.slug) {
      showToast('Campaign could not be published because it is missing a share link.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(campaign.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to publish campaign.');

      await refreshCampaigns();
      showToast('Campaign published! It\'s now live for backers.', 'success');
      setConfirmPublish(null);
    } catch (error: any) {
      showToast(error?.message || 'Could not publish campaign.', 'error');
    }
  };

  const handleNewCampaign = async () => {
    if (!newTitle.trim() || !newGoal.trim()) { showToast('Please fill in all fields.', 'warning'); return; }

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          goal: parseInt(newGoal),
          category: newCategory || 'General',
          status: 'draft',
          description: newDescription,
          endDate: newEndDate,
          slug: newSlug,
          visibility: newVisibility,
          rewardTiers: newRewardTiers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to create campaign.');

      await refreshCampaigns();
      showToast(`"${newTitle}" created as a draft campaign.`, 'success');
      setNewTitle(''); setNewGoal(''); setNewCategory('');
      setNewDescription(''); setNewEndDate(''); setNewCoverImage(null);
      setNewRewardTiers([{ title: '', amount: '' }]);
      setNewSlug(''); setNewVisibility('public');
      setNewOpen(false);
    } catch (error: any) {
      showToast(error?.message || 'Could not create campaign.', 'error');
    }
  };

  const openManage = (id: number) => {
    const c = campaigns.find(cm => cm.id === id);
    if (c) { 
      setManageId(id); 
      setEditTitle(c.title); 
      setEditGoal(String(c.goal)); 
      setEditCategory(c.category || '');
      setEditSlug(c.slug || '');
      setEditDescription('');
      setEditEndDate('');
      setEditCoverImage(null);
      setEditRewardTiers([{ title: '', amount: '' }]);
      setEditVisibility('public');
    }
  };
  const handleSaveManage = async () => {
    if (!editTitle.trim()) { showToast('Campaign title cannot be empty.', 'warning'); return; }
    const campaign = campaigns.find(c => c.id === manageId);
    if (!campaign?.slug) {
      showToast('Campaign could not be updated because it is missing a share link.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(campaign.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: editTitle, 
          goal: parseInt(editGoal) || campaign.goal,
          category: editCategory,
          slug: editSlug,
          description: editDescription,
          endDate: editEndDate,
          visibility: editVisibility,
          rewardTiers: editRewardTiers
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to update campaign.');

      await refreshCampaigns();
      showToast('Campaign updated!', 'success');
      setManageId(null);
    } catch (error: any) {
      showToast(error?.message || 'Could not update campaign.', 'error');
    }
  };
  const handleDeleteCampaign = async (idToDel?: number) => {
    const targetId = idToDel ?? manageId;
    const campaign = campaigns.find(c => c.id === targetId);
    if (!campaign?.slug) {
      showToast('Campaign could not be deleted because it is missing a share link.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(campaign.slug)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to delete campaign.');

      await refreshCampaigns();
      showToast('Campaign deleted.', 'info');
      if (!idToDel) setManageId(null);
    } catch (error: any) {
      showToast(error?.message || 'Could not delete campaign.', 'error');
    }
  };

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <div className="page-sub">Manage your active, draft, and completed campaigns.</div>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setNewOpen(true)}>+ New Campaign</button>
        </div>
      </div>

      <div className="settings-tabs" style={{ marginBottom: 28 }}>
        {['all', 'active', 'draft', 'completed'].map(f => (
          <button key={f} className={`stab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? campaigns.length : campaigns.filter(c => c.status === f).length})
          </button>
        ))}
      </div>

      <div className="campaign-grid">
        {filtered.map(c => {
          const pct = c.pct ?? getCampaignPct(c.raised, c.goal);
          const endDate = new Date(Date.now() + c.daysLeft * 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          return (
          <div key={c.id} className="campaign-card">
            {/* Image Hero */}
            <div className="cmp-image">
              <div className="cmp-image-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>
              {/* Overlay Badges */}
              <div className="cmp-badges">
                <div className="cmp-badge-status">
                  <span className={`cmp-badge-dot ${c.status === 'active' ? 'live' : c.status}`}></span>
                  {c.status === 'active' ? 'LIVE' : c.status === 'draft' ? 'DRAFT' : 'COMPLETED'}
                </div>
                <div className="cmp-badge-category">{c.category}</div>
              </div>
            </div>

            {/* Card Content */}
            <div className="cmp-content">
              <div>
                <h3 className="cmp-title">{c.title}</h3>
                <p className="cmp-description">Goal: ${c.goal.toLocaleString()} {c.daysLeft > 0 ? `• Ends ${endDate}` : ''}</p>
              </div>

              {c.status !== 'draft' && (
                <>
                  {/* Progress */}
                  <div className="cmp-progress-section">
                    <div className="cmp-progress-header">
                      <span className="cmp-progress-pct">{pct}% Complete</span>
                      <span className="cmp-progress-target">Target: ${c.goal.toLocaleString()}</span>
                    </div>
                    <div className="cmp-progress-track">
                      <div className="cmp-progress-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="cmp-stats-grid">
                    <div className="cmp-stat-item">
                      <span className="cmp-stat-label">Raised</span>
                      <span className="cmp-stat-value">${c.raised.toLocaleString()}</span>
                    </div>
                    <div className="cmp-stat-item">
                      <span className="cmp-stat-label">Backers</span>
                      <span className="cmp-stat-value">{c.backers}</span>
                    </div>
                    <div className="cmp-stat-item">
                      <span className="cmp-stat-label">Days Left</span>
                      <span className="cmp-stat-value">{c.daysLeft}</span>
                    </div>
                  </div>
                </>
              )}

              {c.status === 'draft' && (
                <div className="cmp-draft-msg">This campaign hasn&apos;t been published yet. Complete setup and go live.</div>
              )}

              {/* Actions */}
              <div className="cmp-actions">
                <button className="cmp-btn cmp-btn-outline" onClick={() => openManage(c.id)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                {c.status === 'active' && (
                  <>
                    <a href={`/campaign/${c.slug}`} target="_blank" rel="noreferrer" className="cmp-btn cmp-btn-outline">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      View
                    </a>
                    <button className="cmp-btn cmp-btn-primary" onClick={() => handleShare(c.title)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
                      Share
                    </button>
                  </>
                )}
                {c.status === 'draft' && (
                  <>
                    <button className="cmp-btn cmp-btn-danger" onClick={() => handleDeleteCampaign(c.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      Delete
                    </button>
                    <button className="cmp-btn cmp-btn-primary" onClick={() => setConfirmPublish(c.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                      Publish
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          );
        })}

        <div className="campaign-card cmp-new" onClick={() => setNewOpen(true)}>
          <div className="cmp-new-inner">
            <div className="cmp-new-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div className="cmp-new-text">Create new campaign</div>
            <div className="s-hint">Start raising funds for your next big idea.</div>
          </div>
        </div>
      </div>

      {/* SHARE MODAL */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title={`Share ${shareTitle}`}>
        <p style={{ color: 'var(--w50)', fontSize: 14, marginBottom: 16 }}>Share this campaign to reach more backers.</p>
        <div className="share-link-row">
          <input className="share-link-input" readOnly value={`https://oneraise.com/campaign/${shareTitle.toLowerCase().replace(/\s+/g, '-')}`} />
          <button className="btn-primary" style={{ flexShrink: 0 }} onClick={handleCopyLink}>Copy</button>
        </div>
      </Modal>

      {/* NEW CAMPAIGN MODAL */}
      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Create New Campaign"
        className="modal-wide"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setNewOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleNewCampaign}>
              Create as Draft
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </>
        }
      >
        <div className="form-sections">
          {/* Basic Details */}
          <section className="form-section">
            <h3 className="form-section-title">Basic Details</h3>
            <div className="form-grid">
              <div className="s-field form-grid-full">
                <label className="s-label">Campaign Title</label>
                <input className="s-input" placeholder="e.g. Build a School in Ibadan" value={newTitle} onChange={e => {
                  setNewTitle(e.target.value);
                  if (!newSlug) setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                }} />
              </div>
              <div className="s-field">
                <label className="s-label">URL Slug</label>
                <div className="s-slug-wrap">
                  <span className="s-slug-prefix">oneraise.com/</span>
                  <input className="s-slug-input" placeholder="build-a-school" value={newSlug} onChange={e => setNewSlug(e.target.value)} />
                </div>
              </div>
              <div className="s-field">
                <label className="s-label">Visibility</label>
                <div className="s-select-wrap">
                  <select className="s-select" value={newVisibility} onChange={e => setNewVisibility(e.target.value)}>
                    <option value="public">Public</option>
                    <option value="private">Private (Invite Only)</option>
                    <option value="unlisted">Unlisted</option>
                  </select>
                  <span className="s-select-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </span>
                </div>
              </div>
              <div className="s-field form-grid-full">
                <label className="s-label">Category</label>
                <div className="s-select-wrap">
                  <select className="s-select" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                    <option value="">Select a category</option>
                    <option value="Technology">Technology</option>
                    <option value="Social Impact">Social Impact</option>
                    <option value="Arts & Culture">Arts & Culture</option>
                    <option value="Education">Education</option>
                    <option value="Health">Health</option>
                  </select>
                  <span className="s-select-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Campaign Story */}
          <section className="form-section">
            <h3 className="form-section-title">Campaign Story</h3>
            <div className="s-field">
              <label className="s-label">Description</label>
              <textarea className="s-textarea" rows={5} placeholder="Tell the story of why you are raising funds. Be compelling and transparent..." value={newDescription} onChange={e => setNewDescription(e.target.value)} />
            </div>
            <div className="s-field">
              <label className="s-label">Cover Image</label>
              <ImageUploadArea file={newCoverImage} setFile={setNewCoverImage} />
            </div>
          </section>

          {/* Funding Goals */}
          <section className="form-section">
            <h3 className="form-section-title">Funding Goals</h3>
            <div className="form-grid">
              <div className="s-field">
                <label className="s-label">Goal Amount ($)</label>
                <input className="s-input" type="text" inputMode="decimal" placeholder="50,000" value={formatAmount(newGoal)} onChange={e => handleGoalChange(e.target.value, setNewGoal)} />
              </div>
              <div className="s-field">
                <label className="s-label">End Date</label>
                <input className="s-input" type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
              </div>
            </div>
          </section>

          {/* Reward Tiers */}
          <section className="form-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(245,250,247,0.05)' }}>
              <h3 className="form-section-title" style={{ border: 'none', padding: 0 }}>Reward Tiers</h3>
              <button className="s-add-tier-btn" onClick={() => setNewRewardTiers([...newRewardTiers, { title: '', amount: '' }])}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                Add Tier
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {newRewardTiers.map((tier, index) => (
                <div key={index} className="s-tier-card">
                  {newRewardTiers.length > 1 && (
                    <button className="s-tier-remove" onClick={() => {
                      const tiers = [...newRewardTiers];
                      tiers.splice(index, 1);
                      setNewRewardTiers(tiers);
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                  <div className="s-tier-grid">
                    <div>
                      <div className="s-tier-field-label">Tier Title</div>
                      <input className="s-tier-input" placeholder="e.g. Supporter Badge" value={tier.title} onChange={e => {
                        const tiers = [...newRewardTiers];
                        tiers[index].title = e.target.value;
                        setNewRewardTiers(tiers);
                      }} />
                    </div>
                    <div>
                      <div className="s-tier-field-label">Amount ($)</div>
                      <input className="s-tier-input" type="number" placeholder="0.00" value={tier.amount} onChange={e => {
                        const tiers = [...newRewardTiers];
                        tiers[index].amount = e.target.value;
                        setNewRewardTiers(tiers);
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Modal>

      {/* CONFIRM PUBLISH MODAL */}
      <Modal open={confirmPublish !== null} onClose={() => setConfirmPublish(null)} title="Publish Campaign?">
        <p style={{ color: 'var(--w50)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Once published, your campaign will be visible to all users and open for donations. You can still edit details after publishing.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => confirmPublish && handlePublish(confirmPublish)}>Go Live</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmPublish(null)}>Cancel</button>
        </div>
      </Modal>

      {/* MANAGE CAMPAIGN MODAL */}
      <Modal open={manageId !== null} onClose={() => setManageId(null)} title={`Manage: ${campaigns.find(c => c.id === manageId)?.title || ''}`}>
        <div className="s-fields" style={{ gap: 16 }}>
          <div className="s-field s-field-full">
            <label className="s-label">Campaign Title</label>
            <input className="s-input" value={editTitle} onChange={e => {
              setEditTitle(e.target.value);
              if (!editSlug) setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
            }} />
          </div>
          <div className="s-field">
            <label className="s-label">Campaign URL Slug</label>
            <input className="s-input" value={editSlug} onChange={e => setEditSlug(e.target.value)} />
          </div>
          <div className="s-field">
            <label className="s-label">Visibility</label>
            <select className="s-input" value={editVisibility} onChange={e => setEditVisibility(e.target.value)}>
              <option value="public">Public (Visible to everyone)</option>
              <option value="private">Private (Only with link)</option>
            </select>
          </div>
          <div className="s-field s-field-full">
            <label className="s-label">Campaign Story / Description</label>
            <textarea className="s-textarea" rows={4} value={editDescription} onChange={e => setEditDescription(e.target.value)} />
          </div>
          <div className="s-field">
            <label className="s-label">Goal Amount ($)</label>
            <input className="s-input" type="text" inputMode="decimal" value={formatAmount(editGoal)} onChange={e => handleGoalChange(e.target.value, setEditGoal)} />
          </div>
          <div className="s-field">
            <label className="s-label">End Date</label>
            <input className="s-input" type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
          </div>
          <div className="s-field">
            <label className="s-label">Category</label>
            <select className="s-input" value={editCategory} onChange={e => setEditCategory(e.target.value)}>
              <option value="">Select category</option>
              <option value="Technology">Technology</option>
              <option value="Social Impact">Social Impact</option>
              <option value="Arts & Culture">Arts & Culture</option>
              <option value="Education">Education</option>
              <option value="Health">Health</option>
            </select>
          </div>
          <div className="s-field s-field-full">
            <label className="s-label">Cover Image</label>
            <ImageUploadArea file={editCoverImage} setFile={setEditCoverImage} />
          </div>

          <div className="s-field s-field-full">
            <label className="s-label">Reward Tiers Setup</label>
            {editRewardTiers.map((tier, index) => (
              <div key={index} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input className="s-input" placeholder="Tier Title" value={tier.title} onChange={e => {
                  const tiers = [...editRewardTiers];
                  tiers[index].title = e.target.value;
                  setEditRewardTiers(tiers);
                }} style={{ flex: 1 }} />
                <input className="s-input" type="number" placeholder="Amount ($)" value={tier.amount} onChange={e => {
                  const tiers = [...editRewardTiers];
                  tiers[index].amount = e.target.value;
                  setEditRewardTiers(tiers);
                }} style={{ width: 120 }} />
                {index === editRewardTiers.length - 1 && (
                  <button className="btn-secondary" onClick={() => setEditRewardTiers([...editRewardTiers, { title: '', amount: '' }])}>+</button>
                )}
                {editRewardTiers.length > 1 && (
                  <button className="btn-secondary" onClick={() => {
                    const tiers = [...editRewardTiers];
                    tiers.splice(index, 1);
                    setEditRewardTiers(tiers);
                  }}>×</button>
                )}
              </div>
            ))}
          </div>

          {campaigns.find(c => c.id === manageId)?.status === 'active' && (
            <div className="s-field s-field-full">
              <label className="s-label">Campaign Status</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => showToast('Campaign paused. Backers cannot donate until resumed.', 'info')}>Pause Campaign</button>
                <button className="btn-secondary" style={{ flex: 1, color: '#F09595', borderColor: 'rgba(240,149,149,0.2)' }} onClick={() => showToast('Campaign stopped early.', 'info')}>Stop Campaign</button>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleSaveManage}>Save Changes</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setManageId(null)}>Cancel</button>
        </div>
        <div style={{ borderTop: '1px solid rgba(245,250,247,0.06)', marginTop: 20, paddingTop: 16 }}>
          <button className="btn-danger" style={{ width: '100%' }} onClick={() => handleDeleteCampaign()}>Delete this campaign</button>
        </div>
      </Modal>
    </div>
  );
}
