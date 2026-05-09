'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useToast, Modal } from '../../components';
import { encryptPayload } from '@/lib/umbra';

type CampaignStatus = 'active' | 'completed' | 'draft';
type CampaignType = 'standard' | 'protected_crowdfunding' | 'emergency_aid' | 'grant_distribution';

type CampaignMilestone = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  proofUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type CampaignManagerItem = {
  id: number;
  slug?: string;
  title: string;
  image?: string | null;
  status: CampaignStatus;
  raised: number;
  goal: number;
  pct?: number;
  backers: number;
  daysLeft: number;
  category: string;
  type: CampaignType;
  protectStatus: string;
  milestones?: CampaignMilestone[];
};

const INITIAL_CAMPAIGNS: CampaignManagerItem[] = [];
const MAX_COVER_IMAGE_SIZE = 5 * 1024 * 1024;

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
    image: campaign.image,
    status: normalizeStatus(campaign.status),
    raised: campaign.raised,
    goal: campaign.goal,
    pct: campaign.pct ?? getCampaignPct(campaign.raised, campaign.goal),
    backers: campaign.backers,
    daysLeft: campaign.daysLeft,
    category: campaign.category,
    type: campaign.type || 'standard',
    protectStatus: campaign.protectStatus || 'funding',
    milestones: campaign.milestones || [],
  }));
}

const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  standard: 'Standard crowdfunding',
  protected_crowdfunding: 'Protected crowdfunding',
  emergency_aid: 'Emergency aid escrow',
  grant_distribution: 'Grant distribution',
};

const PROTECT_STATUS_LABELS: Record<string, string> = {
  funding: 'Funding',
  locked: 'Locked',
  pending_verification: 'Pending verification',
  unlocked: 'Released',
  refunded: 'Refunded',
};

const MILESTONE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
};

function isProtectedType(type?: string) {
  return type === 'protected_crowdfunding' || type === 'emergency_aid' || type === 'grant_distribution';
}

function getProtectTone(status?: string) {
  if (status === 'unlocked') return '#5DCAA5';
  if (status === 'pending_verification') return '#EF9F27';
  if (status === 'refunded') return '#85B7EB';
  return '#1D9E75';
}

function readImageFileAsDataUrl(file: File | null): Promise<string | undefined> {
  if (!file) return Promise.resolve(undefined);
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Please upload an image file.'));
  }
  if (file.size > MAX_COVER_IMAGE_SIZE) {
    return Promise.reject(new Error('Please upload an image under 5MB.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

function ImageUploadArea({
  file,
  setFile,
  existingImage,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  existingImage?: string | null;
}) {
  const [dragActive, setDragActive] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const displayImage = preview || existingImage || null;

  const handleSelectedFile = (selectedFile?: File) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('image/')) {
      return;
    }
    setFile(selectedFile);
  };

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
      handleSelectedFile(e.dataTransfer.files[0]);
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
      {displayImage ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <img src={displayImage} alt="Campaign cover preview" style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
          <div style={{ display: 'flex', gap: 8, zIndex: 10, position: 'relative' }}>
            <label className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
              Choose Image
              <input hidden type="file" accept="image/*" onChange={e => {
                handleSelectedFile(e.target.files?.[0]);
                e.target.value = '';
              }} />
            </label>
            {file && (
              <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setFile(null);
              }}>Remove Image</button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="s-upload-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <p className="s-upload-title">Click to upload or drag and drop</p>
          <p className="s-upload-sub">SVG, PNG, JPG or GIF (max. 5MB)</p>
          <input className="s-upload-input" type="file" accept="image/*" onChange={e => {
            handleSelectedFile(e.target.files?.[0]);
            e.target.value = '';
          }} />
        </>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState('all');
  const [campaigns, setCampaigns] = useState<CampaignManagerItem[]>(INITIAL_CAMPAIGNS);
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
  const [newCampaignType, setNewCampaignType] = useState<CampaignType>('standard');
  const [newMilestones, setNewMilestones] = useState([{ title: '', description: '' }]);
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
  const [editCampaignType, setEditCampaignType] = useState<CampaignType>('standard');
  const [newManageMilestone, setNewManageMilestone] = useState({ title: '', description: '' });
  const [proofInputs, setProofInputs] = useState<Record<string, string>>({});
  const [umbraToggles, setUmbraToggles] = useState<Record<string, boolean>>({});
  const [isEncrypting, setIsEncrypting] = useState<Record<string, boolean>>({});
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
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Could not publish campaign.', 'error');
    }
  };

  const handleNewCampaign = async () => {
    if (!newTitle.trim() || !newGoal.trim()) { showToast('Please fill in all fields.', 'warning'); return; }

    try {
      const image = await readImageFileAsDataUrl(newCoverImage);
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          goal: parseInt(newGoal),
          category: newCategory || 'General',
          status: 'draft',
          description: newDescription,
          image,
          type: newCampaignType,
          milestones: isProtectedType(newCampaignType) ? newMilestones : [],
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
      setNewCampaignType('standard');
      setNewMilestones([{ title: '', description: '' }]);
      setNewSlug(''); setNewVisibility('public');
      setNewOpen(false);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Could not create campaign.', 'error');
    }
  };

  const openManage = (id: number) => {
    const c = campaigns.find(cm => cm.id === id);
    if (c) { 
      setManageId(id); 
      setEditTitle(c.title); 
      setEditGoal(String(c.goal)); 
      setEditCategory(c.category || '');
      setEditCampaignType(c.type || 'standard');
      setNewManageMilestone({ title: '', description: '' });
      setProofInputs({});
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
      const image = await readImageFileAsDataUrl(editCoverImage);
      const res = await fetch(`/api/campaigns/${encodeURIComponent(campaign.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: editTitle, 
          goal: parseInt(editGoal) || campaign.goal,
          category: editCategory,
          type: editCampaignType,
          slug: editSlug,
          description: editDescription,
          image,
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
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Could not update campaign.', 'error');
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
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Could not delete campaign.', 'error');
    }
  };

  const handleAddManageMilestone = async () => {
    const campaign = campaigns.find(c => c.id === manageId);
    if (!campaign?.slug) {
      showToast('Campaign could not be updated because it is missing a share link.', 'error');
      return;
    }

    if (!newManageMilestone.title.trim()) {
      showToast('Milestone title is required.', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(campaign.slug)}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newManageMilestone),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to add milestone.');

      await refreshCampaigns();
      setNewManageMilestone({ title: '', description: '' });
      showToast('Milestone added.', 'success');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Could not add milestone.', 'error');
    }
  };

  const handleSubmitProof = async (milestoneId: string) => {
    const campaign = campaigns.find(c => c.id === manageId);
    if (!campaign?.slug) {
      showToast('Campaign could not be updated because it is missing a share link.', 'error');
      return;
    }

    const proofUrl = proofInputs[milestoneId]?.trim();
    if (!proofUrl) {
      showToast('Add a proof link or note before submitting.', 'warning');
      return;
    }

    const useUmbra = umbraToggles[milestoneId];
    let finalProofUrl = proofUrl;

    if (useUmbra) {
      try {
        setIsEncrypting((current) => ({ ...current, [milestoneId]: true }));
        finalProofUrl = await encryptPayload(proofUrl, campaign.id);
      } catch (err) {
        setIsEncrypting((current) => ({ ...current, [milestoneId]: false }));
        showToast('Umbra encryption failed.', 'error');
        return;
      }
    }

    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(campaign.slug)}/milestones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId, proofUrl: finalProofUrl, action: 'submit-proof' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to submit proof.');

      await refreshCampaigns();
      setProofInputs((current) => ({ ...current, [milestoneId]: '' }));
      setIsEncrypting((current) => ({ ...current, [milestoneId]: false }));
      setUmbraToggles((current) => ({ ...current, [milestoneId]: false }));
      showToast('Proof submitted for admin verification.', 'success');
    } catch (error: unknown) {
      setIsEncrypting((current) => ({ ...current, [milestoneId]: false }));
      showToast(error instanceof Error ? error.message : 'Could not submit proof.', 'error');
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
              {c.image ? (
                <img src={c.image} alt={`${c.title} cover`} />
              ) : (
                <div className="cmp-image-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
              )}
              {/* Overlay Badges */}
              <div className="cmp-badges">
                <div className="cmp-badge-status">
                  <span className={`cmp-badge-dot ${c.status === 'active' ? 'live' : c.status}`}></span>
                  {c.status === 'active' ? 'LIVE' : c.status === 'draft' ? 'DRAFT' : 'COMPLETED'}
                </div>
                {isProtectedType(c.type) && (
                  <div
                    className="cmp-badge-status"
                    style={{
                      borderColor: `${getProtectTone(c.protectStatus)}55`,
                      color: getProtectTone(c.protectStatus),
                      background: `${getProtectTone(c.protectStatus)}18`,
                    }}
                  >
                    <span className="cmp-badge-dot" style={{ background: getProtectTone(c.protectStatus) }}></span>
                    PROTECT
                  </div>
                )}
                <div className="cmp-badge-category">{c.category}</div>
              </div>
            </div>

            {/* Card Content */}
            <div className="cmp-content">
              <div>
                <h3 className="cmp-title">{c.title}</h3>
                <p className="cmp-description">Goal: ${c.goal.toLocaleString()} {c.daysLeft > 0 ? `• Ends ${endDate}` : ''}</p>
                {isProtectedType(c.type) && (
                  <p className="cmp-description" style={{ color: getProtectTone(c.protectStatus), marginTop: 8 }}>
                    {CAMPAIGN_TYPE_LABELS[c.type]} · {PROTECT_STATUS_LABELS[c.protectStatus] || c.protectStatus}
                  </p>
                )}
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
                <a href={`/campaign/${c.slug}/preview`} target="_blank" rel="noreferrer" className="cmp-btn cmp-btn-outline" style={{ textDecoration: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview
                </a>
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
      {/* NEW CAMPAIGN MODAL (M3 Redesign) */}
      {newOpen && (
        <div className="modal-overlay" onClick={() => setNewOpen(false)} style={{ zIndex: 9999 }}>
          <div className="m3-modal-main" onClick={e => e.stopPropagation()} style={{
            position: 'relative', width: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px'
          }}>
            {/* Header */}
            <header className="m3-section-header" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--m3-surface)', margin: '-24px -24px 24px -24px', padding: '16px 24px' }}>
              <button aria-label="Close" onClick={() => setNewOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--m3-on-surface-variant)', display: 'flex' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
              <h1 className="m3-headline-lg" style={{ fontSize: '20px', flex: 1, textAlign: 'center' }}>New Campaign</h1>
              <div style={{ width: '24px' }}></div>
            </header>

            {/* Main Content */}
            <main style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Basic Details Section */}
              <section className="m3-section">
                <div className="m3-section-header">
                  <span className="material-symbols-outlined">info</span>
                  <h2 className="m3-headline-lg">Basic Details</h2>
                </div>
                
                <div className="m3-space-y">
                  <label className="m3-label" htmlFor="campaign-title">Campaign Title</label>
                  <input className="m3-input" id="campaign-title" placeholder="e.g. Save the Forest" value={newTitle} onChange={e => {
                    setNewTitle(e.target.value);
                    if (!newSlug) setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                  }} />
                </div>
                
                <div className="m3-space-y">
                  <label className="m3-label" htmlFor="url-slug">URL Slug</label>
                  <div className="m3-input-group">
                    <span className="m3-input-prefix">impact.org/</span>
                    <input className="m3-input" id="url-slug" placeholder="save-the-forest" value={newSlug} onChange={e => setNewSlug(e.target.value)} />
                  </div>
                </div>
                
                <div className="m3-grid">
                  <div className="m3-space-y">
                    <label className="m3-label" htmlFor="visibility">Visibility</label>
                    <div className="m3-select-wrap">
                      <select className="m3-select" id="visibility" value={newVisibility} onChange={e => setNewVisibility(e.target.value)}>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="unlisted">Unlisted</option>
                      </select>
                      <div className="m3-select-icon">
                        <span className="material-symbols-outlined">expand_more</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="m3-space-y">
                    <label className="m3-label" htmlFor="category">Category</label>
                    <div className="m3-select-wrap">
                      <select className="m3-select" id="category" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                        <option value="">Select a category</option>
                        <option value="Environment">Environment</option>
                        <option value="Education">Education</option>
                        <option value="Health">Health</option>
                        <option value="Community">Community</option>
                        <option value="Technology">Technology</option>
                        <option value="Social Impact">Social Impact</option>
                        <option value="Arts & Culture">Arts & Culture</option>
                      </select>
                      <div className="m3-select-icon">
                        <span className="material-symbols-outlined">expand_more</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Campaign Story Section */}
              <section className="m3-section">
                <div className="m3-section-header">
                  <span className="material-symbols-outlined">edit_document</span>
                  <h2 className="m3-headline-lg">Campaign Story</h2>
                </div>
                <div className="m3-space-y">
                  <label className="m3-label" htmlFor="description">Description</label>
                  <input className="m3-input" id="description" placeholder="Brief summary of your campaign..." value={newDescription} onChange={e => setNewDescription(e.target.value)} />
                </div>
              </section>

              {/* Cover Image Section */}
              <section className="m3-section">
                <div className="m3-section-header">
                  <span className="material-symbols-outlined">image</span>
                  <h2 className="m3-headline-lg">Cover Image</h2>
                </div>
                <ImageUploadArea file={newCoverImage} setFile={setNewCoverImage} />
              </section>

              {/* Funding Goals Section */}
              <section className="m3-section">
                <div className="m3-section-header">
                  <span className="material-symbols-outlined">attach_money</span>
                  <h2 className="m3-headline-lg">Funding Goals</h2>
                </div>
                <div className="m3-grid">
                  <div className="m3-space-y">
                    <label className="m3-label" htmlFor="goal-amount">Goal Amount</label>
                    <div className="m3-input-group">
                      <span className="m3-input-prefix">$</span>
                      <input className="m3-input" id="goal-amount" placeholder="0.00" value={formatAmount(newGoal)} onChange={e => handleGoalChange(e.target.value, setNewGoal)} />
                      <span className="m3-input-prefix" style={{ borderRadius: '0 8px 8px 0', borderLeft: 'none', borderRight: '1px solid var(--m3-outline-variant)' }}>USD</span>
                    </div>
                  </div>
                  <div className="m3-space-y">
                    <label className="m3-label" htmlFor="end-date">End Date</label>
                    <input className="m3-input" id="end-date" type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
                  </div>
                </div>
              </section>

              {/* OneRaise Protect Section */}
              <section className="m3-section m3-protect-card">
                <div className="m3-section-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                  <span className="material-symbols-outlined">shield</span>
                  <h2 className="m3-headline-lg">OneRaise Protect</h2>
                </div>
                <div className="m3-space-y">
                  <label className="m3-label" htmlFor="protection-mode">Campaign Protection Mode</label>
                  <div className="m3-select-wrap">
                    <select className="m3-select" id="protection-mode" value={newCampaignType} onChange={e => setNewCampaignType(e.target.value as CampaignType)}>
                      <option value="standard">Standard Verification</option>
                      <option value="protected_crowdfunding">Protected crowdfunding</option>
                      <option value="emergency_aid">Emergency aid escrow</option>
                      <option value="grant_distribution">Grant distribution</option>
                    </select>
                    <div className="m3-select-icon">
                      <span className="material-symbols-outlined">expand_more</span>
                    </div>
                  </div>
                  <p className="m3-hint">Enhanced transparency adds additional financial tracking and regular reporting requirements to build maximum donor trust.</p>
                </div>
                
                {isProtectedType(newCampaignType) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                    {newMilestones.map((milestone, index) => (
                      <div key={index} className="s-tier-card" style={{ background: 'var(--m3-surface-bright)', borderColor: 'var(--m3-outline-variant)' }}>
                        <div className="s-tier-grid">
                          <div>
                            <div className="m3-label">Milestone Title</div>
                            <input className="m3-input" placeholder="e.g. Vendor deposit paid" value={milestone.title} onChange={e => {
                              const milestones = [...newMilestones];
                              milestones[index].title = e.target.value;
                              setNewMilestones(milestones);
                            }} />
                          </div>
                          <div>
                            <div className="m3-label">Verification Detail</div>
                            <input className="m3-input" placeholder="Receipt, photo, report, or proof required" value={milestone.description} onChange={e => {
                              const milestones = [...newMilestones];
                              milestones[index].description = e.target.value;
                              setNewMilestones(milestones);
                            }} />
                          </div>
                        </div>
                        {newMilestones.length > 1 && (
                          <button className="s-tier-remove" type="button" onClick={() => setNewMilestones(newMilestones.filter((_, i) => i !== index))}>
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        )}
                      </div>
                    ))}
                    <button className="m3-btn-secondary" style={{ width: 'fit-content' }} type="button" onClick={() => setNewMilestones([...newMilestones, { title: '', description: '' }])}>
                      + Add milestone
                    </button>
                  </div>
                )}
              </section>


            </main>

            {/* Bottom Action Bar */}
            <div className="m3-bottom-bar">
              <button className="m3-btn-secondary" type="button" onClick={() => setNewOpen(false)}>
                Cancel
              </button>
              <button className="m3-btn-primary" type="button" onClick={handleNewCampaign}>
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      )}

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
            <label className="s-label">OneRaise Protect Mode</label>
            <select className="s-input" value={editCampaignType} onChange={e => setEditCampaignType(e.target.value as CampaignType)}>
              <option value="standard">Standard crowdfunding</option>
              <option value="protected_crowdfunding">Protected crowdfunding</option>
              <option value="emergency_aid">Emergency aid escrow</option>
              <option value="grant_distribution">Grant distribution</option>
            </select>
            <div className="s-hint" style={{ marginTop: 8 }}>
              Protected modes show a public badge and enable milestone proof submissions.
            </div>
          </div>
          <div className="s-field s-field-full">
            <label className="s-label">Cover Image</label>
            <ImageUploadArea file={editCoverImage} setFile={setEditCoverImage} existingImage={campaigns.find(c => c.id === manageId)?.image} />
          </div>

          {isProtectedType(editCampaignType) && (
            <div className="s-field s-field-full">
              <label className="s-label">Protect Milestones</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(campaigns.find(c => c.id === manageId)?.milestones || []).length === 0 && (
                  <div className="cmp-draft-msg">No milestones yet. Add at least one proof checkpoint before launching a protected campaign.</div>
                )}
                {(campaigns.find(c => c.id === manageId)?.milestones || []).map((milestone) => (
                  <div key={milestone.id} className="s-tier-card" style={{ display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{milestone.title}</div>
                        {milestone.description && <div className="s-hint" style={{ marginTop: 4 }}>{milestone.description}</div>}
                      </div>
                      <span style={{
                        height: 26,
                        padding: '5px 9px',
                        borderRadius: 999,
                        background: `${milestone.status === 'approved' ? '#5DCAA5' : milestone.status === 'submitted' ? '#EF9F27' : milestone.status === 'rejected' ? '#F09595' : '#85B7EB'}22`,
                        color: milestone.status === 'approved' ? '#5DCAA5' : milestone.status === 'submitted' ? '#EF9F27' : milestone.status === 'rejected' ? '#F09595' : '#85B7EB',
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}>
                        {MILESTONE_STATUS_LABELS[milestone.status] || milestone.status}
                      </span>
                    </div>
                    {milestone.proofUrl && <div className="s-hint" style={{ marginBottom: 8 }}>
                      Proof: {milestone.proofUrl.startsWith('umbra://') ? '🔒 Encrypted via Umbra' : milestone.proofUrl}
                    </div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="s-input"
                          placeholder="Paste receipt/report URL or a short proof note"
                          value={proofInputs[milestone.id] ?? ''}
                          onChange={e => setProofInputs(current => ({ ...current, [milestone.id]: e.target.value }))}
                          disabled={isEncrypting[milestone.id]}
                        />
                        <button 
                          className="btn-primary" 
                          type="button" 
                          style={{ flexShrink: 0, background: isEncrypting[milestone.id] ? '#a855f7' : '' }} 
                          onClick={() => handleSubmitProof(milestone.id)}
                          disabled={isEncrypting[milestone.id]}
                        >
                          {isEncrypting[milestone.id] ? 'Encrypting...' : 'Submit proof'}
                        </button>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', width: 'fit-content' }}>
                        <input 
                          type="checkbox" 
                          style={{ accentColor: '#a855f7' }}
                          checked={umbraToggles[milestone.id] || false}
                          onChange={e => setUmbraToggles(current => ({ ...current, [milestone.id]: e.target.checked }))}
                        />
                        <span style={{ color: '#d8b4fe', fontWeight: 600 }}>Encrypt with Umbra Privacy</span>
                      </label>
                    </div>
                  </div>
                ))}

                <div className="s-tier-card" style={{ display: 'block' }}>
                  <div className="s-tier-grid" style={{ marginBottom: 10 }}>
                    <div>
                      <div className="s-tier-field-label">New milestone</div>
                      <input className="s-tier-input" placeholder="e.g. Equipment purchased" value={newManageMilestone.title} onChange={e => setNewManageMilestone(current => ({ ...current, title: e.target.value }))} />
                    </div>
                    <div>
                      <div className="s-tier-field-label">Verification requirement</div>
                      <input className="s-tier-input" placeholder="e.g. Upload vendor receipt" value={newManageMilestone.description} onChange={e => setNewManageMilestone(current => ({ ...current, description: e.target.value }))} />
                    </div>
                  </div>
                  <button className="s-add-tier-btn" type="button" onClick={handleAddManageMilestone}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Add milestone
                  </button>
                </div>
              </div>
            </div>
          )}

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
