'use client';

import React, { useEffect, useState } from 'react';
import { useToast, Modal } from '../../components';
import { CAMPAIGN_SEED_LIST, getCampaignPct } from '@/lib/campaign-seeds';

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

const INITIAL_CAMPAIGNS: CampaignManagerItem[] = [
  ...CAMPAIGN_SEED_LIST.slice(0, 2).map((campaign) => ({
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    status: campaign.status,
    raised: campaign.raised,
    goal: campaign.goal,
    pct: getCampaignPct(campaign.raised, campaign.goal),
    backers: campaign.backers,
    daysLeft: campaign.daysLeft,
    category: campaign.category,
  })),
  { id: 3, title: 'Lagos Art Festival 2026', status: 'draft', raised: 0, goal: 25000, pct: 0, backers: 0, daysLeft: 0, category: 'Arts & Culture' },
];

function normalizeStatus(status?: string): CampaignStatus {
  if (status === 'completed' || status === 'draft') return status;
  return 'active';
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
  const [confirmPublish, setConfirmPublish] = useState<number | null>(null);
  const [manageId, setManageId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editGoal, setEditGoal] = useState('');

  const refreshCampaigns = async () => {
    const res = await fetch('/api/campaigns', { cache: 'no-store' });
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
        const res = await fetch('/api/campaigns', { cache: 'no-store' });
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to create campaign.');

      await refreshCampaigns();
      showToast(`"${newTitle}" created as a draft campaign.`, 'success');
      setNewTitle(''); setNewGoal(''); setNewCategory('');
      setNewOpen(false);
    } catch (error: any) {
      showToast(error?.message || 'Could not create campaign.', 'error');
    }
  };

  const openManage = (id: number) => {
    const c = campaigns.find(cm => cm.id === id);
    if (c) { setManageId(id); setEditTitle(c.title); setEditGoal(String(c.goal)); }
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
        body: JSON.stringify({ title: editTitle, goal: parseInt(editGoal) || campaign.goal }),
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
  const handleDeleteCampaign = async () => {
    const campaign = campaigns.find(c => c.id === manageId);
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
      setManageId(null);
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
        {filtered.map(c => (
          <div key={c.id} className="campaign-card">
            <div className="cmp-header">
              <span className="cmp-category">{c.category}</span>
              <span className={`cmp-status ${c.status}`}>{c.status === 'active' ? '● Live' : c.status === 'draft' ? 'Draft' : 'Completed'}</span>
            </div>
            <h3 className="cmp-title">{c.title}</h3>

            {c.status !== 'draft' && (
              <>
                <div className="cmp-progress-wrap">
                  <div className="sc-progress-bar"><div className="sc-progress-fill" style={{ width: `${c.pct ?? getCampaignPct(c.raised, c.goal)}%` }}></div></div>
                  <div className="cmp-progress-nums">
                    <span>${c.raised.toLocaleString()} raised</span>
                    <span>{c.pct ?? getCampaignPct(c.raised, c.goal)}%</span>
                  </div>
                </div>
                <div className="cmp-stats">
                  <div className="cmp-stat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    {c.backers} backers
                  </div>
                  <div className="cmp-stat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {c.daysLeft} days left
                  </div>
                </div>
              </>
            )}
            {c.status === 'draft' && (
              <div className="cmp-draft-msg">This campaign hasn't been published yet. Complete setup and go live.</div>
            )}

            <div className="cmp-actions">
              <button className="btn-secondary" style={{ flex: 1, textAlign: 'center', fontSize: 13, padding: '9px 14px' }} onClick={() => openManage(c.id)}>
                {c.status === 'draft' ? 'Edit draft' : 'Manage'}
              </button>
              {c.status === 'active' && (
                <button className="btn-primary" style={{ flex: 1, fontSize: 13, padding: '9px 14px' }} onClick={() => handleShare(c.title)}>Share</button>
              )}
              {c.status === 'draft' && (
                <button className="btn-primary" style={{ flex: 1, fontSize: 13, padding: '9px 14px' }} onClick={() => setConfirmPublish(c.id)}>Publish</button>
              )}
            </div>
          </div>
        ))}

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
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Create New Campaign">
        <div className="s-fields" style={{ gap: 16 }}>
          <div className="s-field s-field-full">
            <label className="s-label">Campaign Title</label>
            <input className="s-input" placeholder="e.g. Build a School in Ibadan" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          </div>
          <div className="s-field">
            <label className="s-label">Goal Amount ($)</label>
            <input className="s-input" type="text" inputMode="decimal" placeholder="50,000" value={formatAmount(newGoal)} onChange={e => handleGoalChange(e.target.value, setNewGoal)} />
          </div>
          <div className="s-field">
            <label className="s-label">Category</label>
            <select className="s-input" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
              <option value="">Select category</option>
              <option value="Technology">Technology</option>
              <option value="Social Impact">Social Impact</option>
              <option value="Arts & Culture">Arts & Culture</option>
              <option value="Education">Education</option>
              <option value="Health">Health</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleNewCampaign}>Create as Draft</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setNewOpen(false)}>Cancel</button>
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
            <input className="s-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          </div>
          <div className="s-field s-field-full">
            <label className="s-label">Goal Amount ($)</label>
            <input className="s-input" type="text" inputMode="decimal" value={formatAmount(editGoal)} onChange={e => handleGoalChange(e.target.value, setEditGoal)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleSaveManage}>Save Changes</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setManageId(null)}>Cancel</button>
        </div>
        <div style={{ borderTop: '1px solid rgba(245,250,247,0.06)', marginTop: 20, paddingTop: 16 }}>
          <button className="btn-danger" style={{ width: '100%' }} onClick={handleDeleteCampaign}>Delete this campaign</button>
        </div>
      </Modal>
    </div>
  );
}
