'use client';

import React, { useState } from 'react';
import { useToast } from '../../components';

export type NotificationItem = {
  id: string;
  type: 'donation' | 'milestone' | 'message' | 'system';
  title: string;
  desc: string;
  dateIso: string;
  read: boolean;
};

function getIcon(type: string) {
  switch (type) {
    case 'donation': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>;
    case 'milestone': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>;
    case 'message': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/></svg>;
    case 'system': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
    default: return null;
  }
}

function getIconBg(type: string) {
  switch (type) {
    case 'donation': return 'rgba(29,158,117,0.15)';
    case 'milestone': return 'rgba(239,159,39,0.15)';
    case 'message': return 'rgba(55,138,221,0.15)';
    case 'system': return 'rgba(245,250,247,0.08)';
    default: return 'rgba(245,250,247,0.08)';
  }
}

function getIconColor(type: string) {
  switch (type) {
    case 'donation': return 'var(--teal-200)';
    case 'milestone': return 'var(--amber)';
    case 'message': return '#85B7EB';
    case 'system': return 'var(--w50)';
    default: return 'var(--w50)';
  }
}

function formatRelative(dateIso: string) {
  const diff = Date.now() - new Date(dateIso).getTime();
  const minutes = Math.max(Math.floor(diff / 60000), 0);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(dateIso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationsClient({ initialNotifications }: { initialNotifications: NotificationItem[] }) {
  const { showToast } = useToast();
  const [notifs, setNotifs] = useState(initialNotifications);
  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    showToast('All notifications marked as read.', 'success');
  };

  const markRead = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <div className="page-sub">You have {unread} unread notification{unread !== 1 ? 's' : ''}.</div>
        </div>
        {unread > 0 && (
          <div className="header-actions">
            <button className="btn-secondary" onClick={markAllRead}>Mark all as read</button>
          </div>
        )}
      </div>

      <div className="content-card" style={{ padding: 0 }}>
        <div className="notif-list">
          {notifs.map(n => (
            <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`} onClick={() => markRead(n.id)}>
              <div className="notif-icon" style={{ background: getIconBg(n.type), color: getIconColor(n.type) }}>
                {getIcon(n.type)}
              </div>
              <div className="notif-info">
                <div className="notif-title">{n.title}</div>
                <div className="notif-desc">{n.desc}</div>
              </div>
              <div className="notif-meta">
                <div className="notif-time">{formatRelative(n.dateIso)}</div>
                {!n.read && <span className="nl-dot" style={{ width: 8, height: 8 }}></span>}
              </div>
            </div>
          ))}
          {notifs.length === 0 && (
            <div style={{ padding: 40, color: 'var(--w40)', textAlign: 'center' }}>
              No notifications yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
