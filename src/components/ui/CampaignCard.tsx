import React from 'react';

export type CampaignCardProps = {
  title: string;
  goal: number;
  raised: number;
  backers: number;
  daysLeft: number;
  status: 'active' | 'draft' | 'completed' | string;
  category: string;
  endDate?: string;
  image?: string | null;
  pct?: number;
  actions?: React.ReactNode;
  creator?: string;
  creatorInitials?: string;
  creatorImage?: string | null;

  // Optional protect type fields if we want to show PROTECT badges
  isProtected?: boolean;
  protectStatus?: string;
  protectTypeLabel?: string;
};

export default function CampaignCard({
  title,
  goal,
  raised,
  backers,
  daysLeft,
  status,
  category,
  endDate,
  image,
  pct,
  actions,
  creator,
  creatorInitials,
  creatorImage,
  isProtected,
  protectStatus,
  protectTypeLabel
}: CampaignCardProps) {
  const calculatedPct = pct !== undefined ? pct : Math.min(Math.round((raised / goal) * 100), 100);
  const isDraft = status === 'draft';
  const isCompleted = status === 'completed';
  const timelineLabel = endDate
    ? `${isCompleted ? 'Ended' : 'Ends'} ${endDate}`
    : isCompleted
      ? 'Ended'
      : daysLeft > 0
        ? `Ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
        : '';

  return (
    <div className="uni-camp-card">
      <div className="ucc-image-wrap">
        {image ? (
          <img src={image} alt={`${title} cover`} className="ucc-img" />
        ) : (
          <div className="ucc-img-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
        )}
        <div className="ucc-badges">
          <div className={`ucc-badge-status ${status}`}>
            <span className="ucc-dot"></span>
            {status === 'active' ? 'LIVE' : status.toUpperCase()}
          </div>
          {isProtected && (
            <div className="ucc-badge-cat" style={{ background: '#1D9E75' }}>
              PROTECT
            </div>
          )}
          <div className="ucc-badge-cat">{category.toUpperCase()}</div>
        </div>
      </div>
      
      <div className="ucc-body">
        <h3 className="ucc-title">{title}</h3>
        {creator && (
          <div className="ucc-creator">
            {creatorImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creatorImage} alt={creator} className="ucc-creator-avatar ucc-creator-img" />
            ) : (
              <div className="ucc-creator-avatar">{creatorInitials || creator.slice(0, 2).toUpperCase()}</div>
            )}
            <span className="ucc-creator-name">by {creator}</span>
          </div>
        )}
        <div className="ucc-subtitle">
          Goal: ${goal.toLocaleString()} {!isDraft && timelineLabel ? `• ${timelineLabel}` : ''}
        </div>
        {isProtected && protectTypeLabel && (
           <div className="ucc-protect-sub">
             {protectTypeLabel} · {protectStatus || 'Funding'}
           </div>
        )}

        {!isDraft && (
          <>
            <div className="ucc-progress-area">
              <div className="ucc-progress-labels">
                <span className="ucc-pct">{calculatedPct}% Complete</span>
                <span className="ucc-target">TARGET: ${goal.toLocaleString()}</span>
              </div>
              <div className="ucc-progress-track">
                <div className="ucc-progress-fill" style={{ width: `${calculatedPct}%` }}></div>
              </div>
            </div>

            <div className="ucc-stats">
              <div className="ucc-stat">
                <div className="ucc-stat-lbl">RAISED</div>
                <div className="ucc-stat-val">${raised.toLocaleString()}</div>
              </div>
              <div className="ucc-stat">
                <div className="ucc-stat-lbl">BACKERS</div>
                <div className="ucc-stat-val">{backers}</div>
              </div>
              <div className="ucc-stat">
                <div className="ucc-stat-lbl">{isCompleted ? 'STATUS' : 'DAYS LEFT'}</div>
                <div className="ucc-stat-val">{isCompleted ? 'Ended' : daysLeft}</div>
              </div>
            </div>
          </>
        )}

        {isDraft && (
          <div className="ucc-draft-msg">
            This campaign hasn&apos;t been published yet. Complete setup and go live.
          </div>
        )}

        {actions && (
          <div className="ucc-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
