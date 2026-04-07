'use client';

import React, { useState } from 'react';
import { useToast } from '../../components';

const NOTIFICATIONS_DATA = [
  { id: 1, type: 'donation', title: 'New donation received', desc: 'Amara Kone backed SolarPack Mini with $50 USDT.', time: '10 min ago', read: false },
  { id: 2, type: 'milestone', title: 'Milestone reached! 🎉', desc: 'SolarPack Mini has reached 50% of its funding goal.', time: '3 hours ago', read: false },
  { id: 3, type: 'donation', title: 'New donation received', desc: 'Jana Dvořák backed SolarPack Mini with $120 USDT.', time: '5 hours ago', read: false },
  { id: 4, type: 'message', title: 'New message from Sarah O.', desc: '"Is there a way to increase my donation?"', time: '1 day ago', read: true },
  { id: 5, type: 'system', title: 'Payout processed', desc: 'Your withdrawal of $5,000 has been sent to your bank account.', time: '2 days ago', read: true },
  { id: 6, type: 'donation', title: 'New donation received', desc: 'Anonymous backed SolarPack Mini with $500 USDT.', time: '2 days ago', read: true },
  { id: 7, type: 'system', title: 'Campaign approved', desc: 'Clean Water for Kano has been reviewed and approved.', time: '4 days ago', read: true },
  { id: 8, type: 'milestone', title: 'Milestone reached! 🎉', desc: 'SolarPack Mini has reached 25% of its funding goal.', time: '1 week ago', read: true },
];

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

export default function NotificationsPage() {
  const { showToast } = useToast();
  const [notifs, setNotifs] = useState(NOTIFICATIONS_DATA);
  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    showToast('All notifications marked as read.', 'success');
  };

  const markRead = (id: number) => {
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
                <div className="notif-time">{n.time}</div>
                {!n.read && <span className="nl-dot" style={{ width: 8, height: 8 }}></span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
