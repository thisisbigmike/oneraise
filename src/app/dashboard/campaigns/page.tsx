'use client';

import React, { useState } from 'react';
import { useToast, Modal } from '../../components';

const INITIAL_CAMPAIGNS = [
  { id: 1, title: 'SolarPack Mini', status: 'active' as const, raised: 68420, goal: 100000, backers: 412, daysLeft: 18, category: 'Technology' },
  { id: 2, title: 'Clean Water for Kano', status: 'active' as const, raised: 24800, goal: 50000, backers: 189, daysLeft: 32, category: 'Social Impact' },
  { id: 3, title: 'Lagos Art Festival 2026', status: 'draft' as const, raised: 0, goal: 25000, backers: 0, daysLeft: 0, category: 'Arts & Culture' },
];

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

  const handlePublish = (id: number) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'active' as const, daysLeft: 30 } : c));
    showToast('Campaign published! It\'s now live for backers.', 'success');
    setConfirmPublish(null);
  };

  const handleNewCampaign = () => {
    if (!newTitle.trim() || !newGoal.trim()) { showToast('Please fill in all fields.', 'warning'); return; }
    const id = Date.now();
    setCampaigns(prev => [...prev, {
      id, title: newTitle, status: 'draft' as const, raised: 0,
      goal: parseInt(newGoal), backers: 0, daysLeft: 0,
      category: newCategory || 'General'
    }]);
    showToast(`"${newTitle}" created as a draft campaign.`, 'success');
    setNewTitle(''); setNewGoal(''); setNewCategory('');
    setNewOpen(false);
  };

  const openManage = (id: number) => {
    const c = campaigns.find(cm => cm.id === id);
    if (c) { setManageId(id); setEditTitle(c.title); setEditGoal(String(c.goal)); }
  };
  const handleSaveManage = () => {
    if (!editTitle.trim()) { showToast('Campaign title cannot be empty.', 'warning'); return; }
    setCampaigns(prev => prev.map(c => c.id === manageId ? { ...c, title: editTitle, goal: parseInt(editGoal) || c.goal } : c));
    showToast('Campaign updated!', 'success');
    setManageId(null);
  };
  const handleDeleteCampaign = () => {
    setCampaigns(prev => prev.filter(c => c.id !== manageId));
    showToast('Campaign deleted.', 'info');
    setManageId(null);
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
                  <div className="sc-progress-bar"><div className="sc-progress-fill" style={{ width: `${Math.round((c.raised / c.goal) * 100)}%` }}></div></div>
                  <div className="cmp-progress-nums">
                    <span>${c.raised.toLocaleString()} raised</span>
                    <span>{Math.round((c.raised / c.goal) * 100)}%</span>
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
