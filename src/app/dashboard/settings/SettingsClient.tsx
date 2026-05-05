'use client';

import React, { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useToast, Modal } from '../../components';

type SettingsClientProps = {
  initialName: string;
  initialEmail: string;
  initialImage?: string | null;
  role: string;
};

const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024;

function readProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Please upload an image file.'));
  }

  if (file.size > MAX_PROFILE_PHOTO_SIZE) {
    return Promise.reject(new Error('Please upload an image under 2MB.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read the selected photo.'));
    reader.readAsDataURL(file);
  });
}

export default function SettingsClient({ initialName, initialEmail, initialImage, role }: SettingsClientProps) {
  const { showToast } = useToast();
  const { update: updateSession } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [fullName, setFullName] = useState(initialName || '');
  const [email, setEmail] = useState(initialEmail || '');
  const [profileImage, setProfileImage] = useState(initialImage || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [twoFA, setTwoFA] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [donationNotif, setDonationNotif] = useState(true);
  const [milestoneNotif, setMilestoneNotif] = useState(true);
  const [marketingNotif, setMarketingNotif] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [sessions, setSessions] = useState([
    { id: 1, device: 'Chrome on Mac', location: 'Current session', current: true },
  ]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [team, setTeam] = useState([
    { id: 1, initials: (initialName || 'You').substring(0, 2).toUpperCase(), name: initialName || 'You', email: initialEmail, role: 'owner', bg: 'var(--teal-600)', color: 'var(--white)' },
  ]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleSave = async () => {
    setSavingProfile(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email,
          image: profileImage || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Unable to update profile.');

      await updateSession({
        name: data.user.name,
        email: data.user.email,
      });
      showToast('Profile settings saved successfully!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save profile settings.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadPhoto = () => {
    fileRef.current?.click();
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (file) {
      try {
        const image = await readProfilePhoto(file);
        setProfileImage(image);
        showToast(`Photo "${file.name}" ready. Save changes to keep it.`, 'success');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Could not upload photo.', 'error');
      }
    }
  };

  const handleUpdatePassword = () => {
    if (!currentPw) { showToast('Please enter your current password.', 'warning'); return; }
    if (!newPw || newPw.length < 8) { showToast('New password must be at least 8 characters.', 'warning'); return; }
    if (newPw !== confirmPw) { showToast('Passwords do not match.', 'error'); return; }
    showToast('Password updated successfully!', 'success');
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
  };

  const handleToggle2FA = () => {
    setTwoFA(!twoFA);
    showToast(twoFA ? 'Two-factor authentication disabled.' : 'Two-factor authentication enabled!', twoFA ? 'info' : 'success');
  };

  const handleRevoke = (id: number) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    showToast('Session revoked. Device has been signed out.', 'success');
  };

  const handleSavePrefs = () => {
    showToast('Notification preferences saved!', 'success');
  };

  const handleInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) { showToast('Enter a valid email address.', 'warning'); return; }
    const initials = inviteEmail.substring(0, 2).toUpperCase();
    setTeam(prev => [...prev, { id: Date.now(), initials, name: inviteEmail.split('@')[0], email: inviteEmail, role: inviteRole, bg: 'rgba(55,138,221,0.2)', color: '#85B7EB' }]);
    showToast(`Invitation sent to ${inviteEmail}!`, 'success');
    setInviteEmail(''); setInviteOpen(false);
  };

  const handleRemoveMember = (id: number) => {
    const member = team.find(t => t.id === id);
    setTeam(prev => prev.filter(t => t.id !== id));
    showToast(`${member?.name} removed from team.`, 'info');
  };

  const handleDeleteAccount = () => {
    if (deleteConfirm !== 'DELETE') { showToast('Type DELETE to confirm.', 'warning'); return; }
    showToast('Account deletion request submitted.', 'error');
    setDeleteOpen(false); setDeleteConfirm('');
  };

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'notifications', label: 'Notifications' },
  ];
  if (role === 'creator') {
    tabs.push({ id: 'team', label: 'Team Members' });
  }

  const userInitials = (fullName || 'U').substring(0, 2).toUpperCase();

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">Manage your account preferences{role === 'creator' ? ', branding, and team members' : ''}.</div>
        </div>
      </div>

      <div className="settings-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`stab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="settings-panel">
          <div className="content-card">
            <div className="cc-title" style={{ marginBottom: 24 }}>Personal Information</div>
            <div className="s-avatar-row">
              <div className="s-avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {profileImage ? <img src={profileImage} alt={`${fullName || 'User'} profile`} /> : userInitials}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
                <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={handleUploadPhoto}>Upload photo</button>
                <div className="s-hint">JPG, PNG or SVG. Max 2MB.</div>
              </div>
            </div>
            <div className="s-fields">
              <div className="s-field"><label className="s-label">Full Name</label><input className="s-input" value={fullName} onChange={e => setFullName(e.target.value)} /></div>
              <div className="s-field"><label className="s-label">Email Address</label><input className="s-input" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="s-field"><label className="s-label">Phone Number</label><input className="s-input" value={phone} onChange={e => setPhone(e.target.value)} /></div>
              {role === 'creator' && (
                <>
                  <div className="s-field s-field-full"><label className="s-label">Bio</label><textarea className="s-textarea" value={bio} onChange={e => setBio(e.target.value)} rows={3} /></div>
                  <div className="s-field"><label className="s-label">Website</label><input className="s-input" value={website} onChange={e => setWebsite(e.target.value)} /></div>
                </>
              )}
            </div>
          </div>
          {role === 'creator' && (
            <div className="content-card" style={{ marginTop: 24 }}>
              <div className="cc-title" style={{ marginBottom: 24 }}>Verification Status</div>
              <div className="s-verify-row">
                <div className="s-verify-badge verified"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>Verified Creator</div>
                <span style={{ fontSize: 13, color: 'var(--w50)' }}>Your identity has been verified. You can receive payouts.</span>
              </div>
            </div>
          )}
          <div className="s-action-bar">
            <button className="btn-primary" onClick={handleSave} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {/* SECURITY TAB */}
      {activeTab === 'security' && (
        <div className="settings-panel">
          <div className="content-card">
            <div className="cc-title" style={{ marginBottom: 24 }}>Password</div>
            <div className="s-fields">
              <div className="s-field"><label className="s-label">Current Password</label><input className="s-input" type="password" placeholder="Enter current password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} /></div>
              <div className="s-field"><label className="s-label">New Password</label><input className="s-input" type="password" placeholder="Enter new password" value={newPw} onChange={e => setNewPw(e.target.value)} /></div>
              <div className="s-field"><label className="s-label">Confirm New Password</label><input className="s-input" type="password" placeholder="Confirm new password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} /></div>
            </div>
            <button className="btn-primary" style={{ marginTop: 20 }} onClick={handleUpdatePassword}>Update password</button>
          </div>

          <div className="content-card" style={{ marginTop: 24 }}>
            <div className="cc-title" style={{ marginBottom: 8 }}>Two-Factor Authentication</div>
            <div className="s-hint" style={{ marginBottom: 20 }}>Add an extra layer of security to your account.</div>
            <div className="s-toggle-row">
              <div><div style={{ fontWeight: 600, marginBottom: 4 }}>Authenticator App</div><div className="s-hint">Use Google Authenticator or Authy to generate codes.</div></div>
              <button className={`s-toggle ${twoFA ? 'on' : ''}`} onClick={handleToggle2FA}><span className="s-toggle-dot" /></button>
            </div>
          </div>

          <div className="content-card" style={{ marginTop: 24 }}>
            <div className="cc-title" style={{ marginBottom: 8 }}>Active Sessions</div>
            <div className="s-hint" style={{ marginBottom: 20 }}>Devices where you&apos;re currently signed in.</div>
            {sessions.map(s => (
              <div key={s.id} className="s-session">
                <div className="s-session-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{s.current ? <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></> : <><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></>}</svg>
                </div>
                <div className="s-session-info">
                  <div style={{ fontWeight: 600 }}>{s.device}</div>
                  <div className="s-hint">{s.location}</div>
                </div>
                {s.current ? <span className="s-current-badge">Active</span> : <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => handleRevoke(s.id)}>Revoke</button>}
              </div>
            ))}
          </div>
          
          <div className="content-card" style={{ marginTop: 24, border: '1px solid rgba(240,149,149,0.2)' }}>
            <div className="cc-title" style={{ marginBottom: 8, color: '#F09595' }}>Danger Zone</div>
            <div className="s-hint" style={{ marginBottom: 20 }}>Irreversible and destructive actions.</div>
            <div className="s-danger-row">
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#F09595' }}>Delete Account</div>
                <div className="s-hint">Permanently delete your OneRaise account and all data.</div>
              </div>
              <button className="btn-danger" onClick={() => setDeleteOpen(true)}>Delete account</button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <div className="settings-panel">
          <div className="content-card">
            <div className="cc-title" style={{ marginBottom: 8 }}>Notification Channels</div>
            <div className="s-hint" style={{ marginBottom: 24 }}>Choose how you want to be notified.</div>
            <div className="s-toggle-row">
              <div><div style={{ fontWeight: 600, marginBottom: 4 }}>Email Notifications</div><div className="s-hint">Receive updates via email.</div></div>
              <button className={`s-toggle ${emailNotif ? 'on' : ''}`} onClick={() => { setEmailNotif(!emailNotif); showToast(emailNotif ? 'Email notifications disabled.' : 'Email notifications enabled.', 'info'); }}><span className="s-toggle-dot" /></button>
            </div>
            <div className="s-toggle-row">
              <div><div style={{ fontWeight: 600, marginBottom: 4 }}>Push Notifications</div><div className="s-hint">Browser push notifications.</div></div>
              <button className={`s-toggle ${pushNotif ? 'on' : ''}`} onClick={() => { setPushNotif(!pushNotif); showToast(pushNotif ? 'Push notifications disabled.' : 'Push notifications enabled.', 'info'); }}><span className="s-toggle-dot" /></button>
            </div>
          </div>

          <div className="content-card" style={{ marginTop: 24 }}>
            <div className="cc-title" style={{ marginBottom: 8 }}>Notification Types</div>
            <div className="s-hint" style={{ marginBottom: 24 }}>Control what triggers notifications.</div>
            {role === 'creator' ? (
              <>
                <div className="s-toggle-row">
                  <div><div style={{ fontWeight: 600, marginBottom: 4 }}>New Donations</div><div className="s-hint">Get notified when someone backs your campaign.</div></div>
                  <button className={`s-toggle ${donationNotif ? 'on' : ''}`} onClick={() => setDonationNotif(!donationNotif)}><span className="s-toggle-dot" /></button>
                </div>
                <div className="s-toggle-row">
                  <div><div style={{ fontWeight: 600, marginBottom: 4 }}>Milestone Reached</div><div className="s-hint">Get notified when you hit 25%, 50%, 75%, 100% of your goal.</div></div>
                  <button className={`s-toggle ${milestoneNotif ? 'on' : ''}`} onClick={() => setMilestoneNotif(!milestoneNotif)}><span className="s-toggle-dot" /></button>
                </div>
              </>
            ) : (
              <>
                <div className="s-toggle-row">
                  <div><div style={{ fontWeight: 600, marginBottom: 4 }}>Campaign Updates</div><div className="s-hint">Updates from campaigns you&apos;ve backed.</div></div>
                  <button className={`s-toggle ${donationNotif ? 'on' : ''}`} onClick={() => setDonationNotif(!donationNotif)}><span className="s-toggle-dot" /></button>
                </div>
              </>
            )}
            <div className="s-toggle-row">
              <div><div style={{ fontWeight: 600, marginBottom: 4 }}>Marketing & Tips</div><div className="s-hint">Helpful tips and OneRaise platform updates.</div></div>
              <button className={`s-toggle ${marketingNotif ? 'on' : ''}`} onClick={() => setMarketingNotif(!marketingNotif)}><span className="s-toggle-dot" /></button>
            </div>
          </div>
          <div className="s-action-bar"><button className="btn-primary" onClick={handleSavePrefs}>Save preferences</button></div>
        </div>
      )}

      {/* TEAM TAB */}
      {role === 'creator' && activeTab === 'team' && (
        <div className="settings-panel">
          <div className="content-card">
            <div className="cc-header">
              <div className="cc-title">Team Members</div>
              <button className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => setInviteOpen(true)}>+ Invite member</button>
            </div>
            <div className="s-team-list">
              {team.map(m => (
                <div key={m.id} className="s-team-item">
                  <div className="d-avatar" style={{ background: m.bg, color: m.color }}>{m.initials}</div>
                  <div className="s-team-info">
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div className="s-hint">{m.email}</div>
                  </div>
                  <span className={`s-role-badge ${m.role}`}>{m.role.charAt(0).toUpperCase() + m.role.slice(1)}</span>
                  {m.role !== 'owner' && <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px', marginLeft: 8 }} onClick={() => handleRemoveMember(m.id)}>Remove</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Team Member">
        <div className="s-fields" style={{ gap: 16 }}>
          <div className="s-field s-field-full">
            <label className="s-label">Email Address</label>
            <input className="s-input" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          </div>
          <div className="s-field s-field-full">
            <label className="s-label">Role</label>
            <select className="s-input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleInvite}>Send Invitation</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setInviteOpen(false)}>Cancel</button>
        </div>
      </Modal>

      {/* DELETE ACCOUNT MODAL */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Account">
        <p style={{ color: '#F09595', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
          This action is permanent and cannot be undone. All your data will be permanently deleted.
        </p>
        <div className="s-field" style={{ marginBottom: 16 }}>
          <label className="s-label">Type DELETE to confirm</label>
          <input className="s-input" placeholder="DELETE" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} style={{ borderColor: 'rgba(240,149,149,0.3)' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-danger" style={{ flex: 1 }} onClick={handleDeleteAccount}>Permanently Delete</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setDeleteOpen(false); setDeleteConfirm(''); }}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
