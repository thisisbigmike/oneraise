'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useToast, Modal } from '../../components';
import CustomSelect from '@/components/ui/CustomSelect';

type SettingsClientProps = {
  initialName: string;
  initialEmail: string;
  initialImage?: string | null;
  role: string;
  initialVerificationStatus?: string;
  initialEmailVerified?: boolean;
  initialEmailNotif?: boolean;
  initialPushNotif?: boolean;
  initialCampaignNotif?: boolean;
  initialMarketingNotif?: boolean;
};

const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024;
const INVITE_ROLE_OPTIONS = [
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

function readProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Please upload an image file.'));
  }

  if (file.size > MAX_PROFILE_PHOTO_SIZE) {
    return Promise.reject(new Error('Please upload an image under 2MB.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 128;
        const width = img.width;
        const height = img.height;

        // Force square 1:1 aspect ratio for profile photos
        const size = Math.min(width, height);
        const startX = (width - size) / 2;
        const startY = (height - size) / 2;

        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, startX, startY, size, size, 0, 0, MAX_SIZE, MAX_SIZE);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Unable to read the selected photo.'));
    reader.readAsDataURL(file);
  });
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'account_proof', label: 'Account proof' },
  { value: 'organization_document', label: 'Organization document' },
  { value: 'campaign_document', label: 'Campaign document' },
  { value: 'other', label: 'Other document' },
];

export default function SettingsClient(props: SettingsClientProps) {
  const { initialName, initialEmail, initialImage, role } = props;
  const { showToast } = useToast();
  const { update: updateSession } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const documentFileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [fullName, setFullName] = useState(initialName || '');
  const [email, setEmail] = useState(initialEmail || '');
  const [profileImage, setProfileImage] = useState(initialImage || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [twoFA, setTwoFA] = useState(false);
  const [emailNotif, setEmailNotif] = useState(props.initialEmailNotif ?? true);
  const [pushNotif, setPushNotif] = useState(props.initialPushNotif ?? true);
  const [donationNotif, setDonationNotif] = useState(props.initialCampaignNotif ?? true);
  const [milestoneNotif, setMilestoneNotif] = useState(props.initialCampaignNotif ?? true);
  const [marketingNotif, setMarketingNotif] = useState(props.initialMarketingNotif ?? false);
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
  const [verificationStatus, setVerificationStatusState] = useState(props.initialVerificationStatus || 'unverified');
  const [emailVerified, setEmailVerified] = useState(!!props.initialEmailVerified);
  const [verifyFullName, setVerifyFullName] = useState('');
  const [verifyDocumentType, setVerifyDocumentType] = useState('account_proof');
  const [verifyDocumentImage, setVerifyDocumentImage] = useState('');
  const [verifyDocumentFileName, setVerifyDocumentFileName] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [sendingEmailVerification, setSendingEmailVerification] = useState(false);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('emailVerified');
    if (result === 'success') {
      setEmailVerified(true);
      showToast('Email verified. Your badge will show once admin approval is complete.', 'success');
    }
    if (result === 'invalid') {
      showToast('Email verification link is invalid or expired.', 'error');
    }
  }, [showToast]);

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
        image: data.user.image,
      });
      setEmailVerified(!!data.user.emailVerified);
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

  const handleSavePrefs = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailNotifications: emailNotif,
          pushNotifications: pushNotif,
          campaignUpdates: donationNotif,
          marketingEmails: marketingNotif,
        }),
      });
      if (!res.ok) throw new Error('Could not save preferences.');
      showToast('Notification preferences saved!', 'success');
    } catch {
      showToast('Error saving preferences.', 'error');
    } finally {
      setSavingProfile(false);
    }
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

  const handleVerificationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please upload an image file.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Verification document must be under 5MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setVerifyDocumentImage(ev.target?.result as string);
      setVerifyDocumentFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitVerification = async () => {
    if (!verifyFullName.trim()) { showToast('Enter the name you want reviewed.', 'error'); return; }
    if (!verifyDocumentImage) { showToast('Upload a verification document.', 'error'); return; }
    setSubmittingVerification(true);
    try {
      const res = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: verifyFullName, documentType: verifyDocumentType, documentImage: verifyDocumentImage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      setVerificationStatusState('pending');
      showToast('Verification submitted. We\'ll review and update your status shortly.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not submit verification.', 'error');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleRequestEmailVerification = async () => {
    setSendingEmailVerification(true);
    try {
      const res = await fetch('/api/email-verify/request', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send verification email.');
      if (data.alreadyVerified) {
        setEmailVerified(true);
        showToast('Email is already verified.', 'success');
      } else {
        showToast('Verification email sent. Check your inbox.', 'success');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not send verification email.', 'error');
    } finally {
      setSendingEmailVerification(false);
    }
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
          <div className="content-card" style={{ marginTop: 24 }}>
            <div className="cc-title" style={{ marginBottom: 24 }}>Account Verification</div>
            <div className="s-verify-row" style={{ marginBottom: 20 }}>
              <div className={`s-verify-badge ${emailVerified ? 'verified' : 'pending'}`}>
                {emailVerified ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                )}
                {emailVerified ? 'Email Confirmed' : 'Email Unconfirmed'}
              </div>
              {!emailVerified && (
                <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={handleRequestEmailVerification} disabled={sendingEmailVerification}>
                  {sendingEmailVerification ? 'Sending...' : 'Send verification email'}
                </button>
              )}
            </div>
            {verificationStatus === 'verified' && emailVerified && (
              <div className="s-verify-row">
                <div className="s-verify-badge verified">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                  Verified
                </div>
                <span style={{ fontSize: 13, color: 'var(--w50)' }}>Admin approved your upload and your email is confirmed.</span>
              </div>
            )}
            {verificationStatus === 'verified' && !emailVerified && (
              <div className="s-verify-row">
                <div className="s-verify-badge pending">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  Email Required
                </div>
                <span style={{ fontSize: 13, color: 'var(--w50)' }}>Admin approved your upload. Confirm your email to unlock the verified badge.</span>
              </div>
            )}
            {verificationStatus === 'pending' && (
              <div className="s-verify-row">
                <div className="s-verify-badge pending">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  Under Review
                </div>
                <span style={{ fontSize: 13, color: 'var(--w50)' }}>Your upload is being reviewed. This usually takes 1-2 business days.</span>
              </div>
            )}
            {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
              <div className="s-verify-form">
                {verificationStatus === 'rejected' && (
                  <div className="s-verify-row" style={{ marginBottom: 20 }}>
                    <div className="s-verify-badge rejected">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                      Rejected
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--w50)' }}>Your previous submission was rejected. Please resubmit with a clearer document.</span>
                  </div>
                )}
                <div className="s-fields">
                  <div className="s-field">
                    <label className="s-label">Name to Review</label>
                    <input className="s-input" value={verifyFullName} onChange={e => setVerifyFullName(e.target.value)} placeholder="Enter the name tied to this account" />
                  </div>
                  <div className="s-field">
                    <label className="s-label">Document Type</label>
                    <CustomSelect
                      value={verifyDocumentType}
                      onChange={setVerifyDocumentType}
                      options={DOCUMENT_TYPE_OPTIONS}
                    />
                  </div>
                  <div className="s-field s-field-full">
                    <label className="s-label">Verification Document</label>
                    <input ref={documentFileRef} type="file" accept="image/*" hidden onChange={handleVerificationFileChange} />
                    <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => documentFileRef.current?.click()}>
                      {verifyDocumentFileName ? `✓ ${verifyDocumentFileName}` : 'Upload document'}
                    </button>
                    <div className="s-hint">Clear JPG, PNG, or WebP image. Max 5MB.</div>
                  </div>
                </div>
                <button className="btn-primary" style={{ marginTop: 20 }} onClick={handleSubmitVerification} disabled={submittingVerification}>
                  {submittingVerification ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            )}
          </div>
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
            <CustomSelect
              value={inviteRole}
              onChange={setInviteRole}
              options={INVITE_ROLE_OPTIONS}
            />
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
