'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '../../components';

type ProtectMilestone = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  proofUrl: string | null;
  updatedAt: string;
};

type ProtectCampaign = {
  id: string;
  title: string;
  slug: string;
  type: string;
  protectStatus: string;
  goal: number;
  raised: number;
  category: string;
  creatorName: string;
  milestones: ProtectMilestone[];
};

const TYPE_LABELS: Record<string, string> = {
  protected_crowdfunding: 'Protected crowdfunding',
  emergency_aid: 'Emergency aid escrow',
  grant_distribution: 'Grant distribution',
};

const STATUS_LABELS: Record<string, string> = {
  funding: 'Funding',
  locked: 'Locked',
  pending_verification: 'Pending verification',
  unlocked: 'Released',
  refunded: 'Refunded',
  pending: 'Pending',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
};

function getStatusColor(status: string) {
  if (status === 'approved' || status === 'unlocked') return 'var(--teal-200)';
  if (status === 'submitted' || status === 'pending_verification') return 'var(--amber)';
  if (status === 'refunded') return '#85B7EB';
  if (status === 'rejected') return '#F09595';
  return 'var(--w50)';
}

export default function AdminProtectPage() {
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<ProtectCampaign[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busyAction, setBusyAction] = useState('');

  const loadQueue = async () => {
    const response = await fetch('/api/admin/protect', { cache: 'no-store' });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || 'Unable to load Protect queue.');
    }

    setCampaigns(result.campaigns || []);
    setPendingCount(result.pendingCount || 0);
    setStatus('ready');
  };

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        await loadQueue();
      } catch {
        if (!ignore) setStatus('error');
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  const runAction = async (payload: Record<string, string>, successMessage: string) => {
    const actionKey = `${payload.action}:${payload.milestoneId || payload.campaignSlug}`;
    setBusyAction(actionKey);

    try {
      const response = await fetch('/api/admin/protect', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result?.error || 'Unable to update Protect queue.');

      await loadQueue();
      showToast(successMessage, 'success');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Unable to update Protect queue.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Protect Queue</h1>
          <div className="page-sub">Review milestone proof, release protected funds, or keep campaigns refundable.</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div className="sc-label">Protected Campaigns</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8 }}>{campaigns.length}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Proof Submissions</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--amber)' }}>
            {status === 'loading' ? '...' : pendingCount}
          </div>
        </div>
      </div>

      {status === 'loading' && <div className="content-card" style={{ color: 'var(--w50)' }}>Loading Protect queue...</div>}
      {status === 'error' && <div className="content-card" style={{ color: 'var(--amber)' }}>Unable to load Protect queue.</div>}

      {status === 'ready' && campaigns.length === 0 && (
        <div className="content-card" style={{ color: 'var(--w50)' }}>No protected campaigns yet.</div>
      )}

      {campaigns.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="content-card">
              <div className="cc-header" style={{ alignItems: 'flex-start', gap: 16 }}>
                <div>
                  <div className="cc-title">{campaign.title}</div>
                  <div style={{ color: 'var(--w50)', fontSize: 13, marginTop: 6 }}>
                    {TYPE_LABELS[campaign.type] || campaign.type} · {campaign.category} · {campaign.creatorName}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: `${getStatusColor(campaign.protectStatus)}20`,
                    color: getStatusColor(campaign.protectStatus),
                    fontWeight: 700,
                  }}>
                    {STATUS_LABELS[campaign.protectStatus] || campaign.protectStatus}
                  </span>
                  <Link href={`/campaign/${campaign.slug}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                    View campaign
                  </Link>
                </div>
              </div>

              <div className="txn-table-wrap">
                <table className="txn-table">
                  <thead>
                    <tr>
                      <th>Milestone</th>
                      <th>Status</th>
                      <th>Proof</th>
                      <th>Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.milestones.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ color: 'var(--w50)' }}>No milestones configured.</td>
                      </tr>
                    )}
                    {campaign.milestones.map((milestone) => {
                      const approveKey = `approve-milestone:${milestone.id}`;
                      const rejectKey = `reject-milestone:${milestone.id}`;
                      return (
                        <tr key={milestone.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{milestone.title}</div>
                            {milestone.description && <div style={{ color: 'var(--w50)', fontSize: 12, marginTop: 4 }}>{milestone.description}</div>}
                          </td>
                          <td>
                            <span style={{ color: getStatusColor(milestone.status), fontWeight: 700 }}>
                              {STATUS_LABELS[milestone.status] || milestone.status}
                            </span>
                          </td>
                          <td style={{ maxWidth: 260, color: 'var(--w50)' }}>
                            {milestone.proofUrl ? (
                              milestone.proofUrl.startsWith('http') ? (
                                <a href={milestone.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--teal-200)' }}>Open proof</a>
                              ) : (
                                milestone.proofUrl
                              )
                            ) : '-'}
                          </td>
                          <td style={{ color: 'var(--w50)' }}>{new Date(milestone.updatedAt).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                className="btn-primary"
                                style={{ padding: '6px 10px', fontSize: 12 }}
                                disabled={milestone.status !== 'submitted' || busyAction === approveKey}
                                onClick={() => runAction({ action: 'approve-milestone', campaignSlug: campaign.slug, milestoneId: milestone.id }, 'Milestone approved and release status updated.')}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ padding: '6px 10px', fontSize: 12, color: '#F09595' }}
                                disabled={milestone.status !== 'submitted' || busyAction === rejectKey}
                                onClick={() => runAction({ action: 'reject-milestone', campaignSlug: campaign.slug, milestoneId: milestone.id }, 'Milestone rejected.')}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                <button
                  className="btn-secondary"
                  onClick={() => runAction({ action: 'lock-campaign', campaignSlug: campaign.slug }, 'Campaign funds marked as locked.')}
                >
                  Lock escrow
                </button>
                <button
                  className="btn-primary"
                  onClick={() => runAction({ action: 'release-campaign', campaignSlug: campaign.slug }, 'Campaign funds marked as released.')}
                >
                  Release campaign
                </button>
                <button
                  className="btn-secondary"
                  style={{ color: '#85B7EB' }}
                  onClick={() => runAction({ action: 'refund-campaign', campaignSlug: campaign.slug }, 'Campaign marked refundable/refunded.')}
                >
                  Mark refunded
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
