import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { settingsTranslations } from '../services/settingsTranslations';
import api from '../services/api';

const Section = ({ title, children }) => (
  <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] mb-6">
    <div className="px-5 py-3 border-b border-[#e5e5e5] dark:border-[#222]">
      <h2 className="text-xs font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">{title}</h2>
    </div>
    <div className="divide-y divide-[#e5e5e5] dark:divide-[#222]">{children}</div>
  </div>
);

const SettingRow = ({ label, desc, children }) => (
  <div className="flex items-center justify-between px-5 py-3">
    <div className="flex-1 min-w-0 mr-4">
      <span className="text-sm font-medium text-ink dark:text-paper font-sans">{label}</span>
      {desc && <p className="text-[11px] text-ink-faint mt-0.5 font-sans">{desc}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Toggle = ({ checked, onChange, id }) => (
  <label className="relative inline-flex items-center cursor-pointer" htmlFor={id}>
    <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
    <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-checked:bg-ink dark:peer-checked:bg-paper rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white dark:after:bg-ink after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4" />
  </label>
);

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ms', label: 'Bahasa Malaysia' },
];

const PAGE_OPTIONS = [5, 10, 20, 50];

const loadGuestProfile = () => {
  try { return JSON.parse(localStorage.getItem('guest_profile')) || {}; }
  catch { return {}; }
};

const loadGuestDashboardPrefs = () => {
  try { return JSON.parse(localStorage.getItem('guest_dashboard_prefs')) || {}; }
  catch { return {}; }
};

const loadGuestNotificationPrefs = () => {
  try { return JSON.parse(localStorage.getItem('guest_notification_prefs')) || {}; }
  catch { return {}; }
};

const generateMockSecret = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 16; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
};

const formatSecret = (secret) =>
  secret.match(/.{1,4}/g)?.join(' ') || secret;

const TwoFactorAuthRow = () => {
  const [twoFAState, setTwoFAState] = useState('idle'); // idle | setup | enabled
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');

  const handleStartSetup = () => {
    const newSecret = generateMockSecret();
    setSecret(newSecret);
    setTwoFAState('setup');
    setVerificationCode('');
    setError('');
  };

  const handleVerify = () => {
    const trimmed = verificationCode.trim();
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    setError('');
    setTwoFAState('enabled');
  };

  const handleDisable = () => {
    setTwoFAState('idle');
    setSecret('');
    setVerificationCode('');
    setError('');
  };

  if (twoFAState === 'enabled') {
    return (
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink dark:text-paper font-sans">Two-Factor Auth</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 font-sans">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Enabled
            </span>
          </div>
          <button
            onClick={handleDisable}
            className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-sans"
          >
            Disable 2FA
          </button>
        </div>
        <p className="text-[11px] text-ink-faint font-sans">
          Two-factor authentication is active. Your account requires a verification code on each sign-in.
        </p>
      </div>
    );
  }

  if (twoFAState === 'setup') {
    return (
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-ink dark:text-paper font-sans">Setup Two-Factor Auth</span>
          <button
            onClick={() => { setTwoFAState('idle'); setVerificationCode(''); setError(''); }}
            className="text-[10px] text-ink-faint hover:text-ink-muted uppercase tracking-wider font-sans"
          >
            Cancel
          </button>
        </div>

        {/* Step 1: Secret Key */}
        <div className="mb-4">
          <label className="block text-[10px] font-semibold text-ink-muted dark:text-ink-faint uppercase tracking-[0.15em] mb-2 font-sans">
            Step 1 — Add to Authenticator App
          </label>
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-paper dark:bg-paper-dark p-4">
            <p className="text-[10px] text-ink-faint uppercase tracking-wider mb-2 font-sans">Manual Entry Key</p>
            <div className="font-mono text-sm tracking-[0.3em] text-ink dark:text-paper select-all break-all">
              {formatSecret(secret)}
            </div>
            <p className="text-[10px] text-ink-faint mt-3 font-sans">
              Enter this key in your authenticator app (Google Authenticator, Authy, etc.) or scan the code below.
            </p>
          </div>
          {/* QR Code placeholder */}
          <div className="mt-3 border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] p-4 flex flex-col items-center">
            <div className="w-32 h-32 border-2 border-ink dark:border-paper flex items-center justify-center">
              <div className="grid grid-cols-8 grid-rows-8 w-24 h-24 gap-px">
                {Array.from({ length: 64 }).map((_, i) => {
                  const isFilled = ((i % 3) + Math.floor(i / 8)) % 2 === 0 ||
                    (i < 8 || i >= 56 || i % 8 === 0 || i % 8 === 7) ||
                    (i >= 27 && i <= 29) || (i >= 35 && i <= 37) ||
                    (i >= 18 && i <= 20) || (i >= 44 && i <= 46);
                  return (
                    <div
                      key={i}
                      className={`${isFilled ? 'bg-ink dark:bg-paper' : 'bg-white dark:bg-[#0a0a0a]'}`}
                    />
                  );
                })}
              </div>
            </div>
            <p className="text-[9px] text-ink-faint mt-2 uppercase tracking-wider font-sans">Demo QR Code</p>
          </div>
        </div>

        {/* Step 2: Verification */}
        <div className="mb-2">
          <label className="block text-[10px] font-semibold text-ink-muted dark:text-ink-faint uppercase tracking-[0.15em] mb-2 font-sans">
            Step 2 — Verify Code
          </label>
          <p className="text-[11px] text-ink-faint mb-2 font-sans">
            Enter the 6-digit code from your authenticator app to confirm setup.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={6}
              inputMode="numeric"
              className="w-32 px-3 py-1.5 text-sm tracking-[0.2em] text-center border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors font-mono"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setVerificationCode(val);
                setError('');
              }}
            />
            <button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6}
              className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider bg-ink text-paper hover:bg-accent transition-colors font-sans disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Verify & Enable
            </button>
          </div>
          {error && (
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-2 font-sans">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // idle state
  return (
    <SettingRow label="Two-Factor Auth" desc="Add an extra layer of security">
      <button
        onClick={handleStartSetup}
        className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-ink dark:text-paper border border-paper-line dark:border-paper-dark-line hover:bg-paper dark:hover:bg-paper-dark transition-colors font-sans"
      >
        Setup 2FA
      </button>
    </SettingRow>
  );
};

const SettingsPage = () => {
  const { user, updatePreferences, updateProfile, logout } = useAuth();
  const { lang, setLang } = useLanguage();
  const ts = (key) => settingsTranslations[lang]?.[key] || settingsTranslations.en[key] || key;
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const isGuest = !user || user.role === 'guest' || !localStorage.getItem('token');
  const safeUser = user || { name: 'Guest', email: 'guest@statusmy.app', role: 'viewer', plan: 'free' };

  const [guestDashPrefs, setGuestDashPrefs] = useState(loadGuestDashboardPrefs);
  const [guestNotifPrefs, setGuestNotifPrefs] = useState(loadGuestNotificationPrefs);
  const [guestProfile, setGuestProfile] = useState(loadGuestProfile);

  const prefs = isGuest
    ? { ...guestDashPrefs, ...guestNotifPrefs }
    : (user?.preferences || {});

  const [name, setName] = useState(
    isGuest ? (guestProfile.name || 'Guest') : (user?.name || '')
  );
  const [, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Billing state
  const [showBillingComparison, setShowBillingComparison] = useState(false);
  const [billingToast, setBillingToast] = useState(false);

  // Avatar state
  const avatarInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarError, setAvatarError] = useState(null);
  const [avatarSaving, setAvatarSaving] = useState(false);

  useEffect(() => {
    if (!isGuest && user?.avatar) {
      setAvatarPreview(user.avatar);
    }
  }, [isGuest, user?.avatar]);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    if (!isGuest && user?.name) setName(user.name);
  }, [isGuest, user?.name]);

  const savePreference = async (key, value) => {
    setSaving(key);
    try {
      if (isGuest) {
        const updated = { ...guestDashPrefs, [key]: value };
        localStorage.setItem('guest_dashboard_prefs', JSON.stringify(updated));
        setGuestDashPrefs(updated);
      } else {
        await updatePreferences({ [key]: value });
      }
      if (key === 'language') setLang(value);
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      console.error('Failed to save preference:', err);
    } finally {
      setSaving(null);
    }
  };

  const saveNotificationPref = (key, value) => {
    if (isGuest) {
      const updated = { ...guestNotifPrefs, [key]: value };
      localStorage.setItem('guest_notification_prefs', JSON.stringify(updated));
      setGuestNotifPrefs(updated);
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } else {
      savePreference(key, value);
    }
  };

  const handleThemeChange = (val) => {
    setTheme(val);
    if (!isGuest) savePreference('theme', val);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      if (isGuest) {
        const profile = { name, email: guestProfile.email || 'guest@statusmy.app' };
        localStorage.setItem('guest_profile', JSON.stringify(profile));
        setGuestProfile(profile);
      } else {
        await updateProfile({ name });
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      setShowPasswordForm(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAvatarClick = () => {
    if (isGuest) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('File too large. Maximum size is 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setAvatarPreview(base64);
      setAvatarSaving(true);
      try {
        if (!isGuest) {
          await updateProfile({ avatar: base64 });
        }
      } catch (err) {
        console.error('Failed to upload avatar:', err);
        setAvatarError('Upload failed. Please try again.');
      } finally {
        setAvatarSaving(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = async () => {
    setAvatarPreview(null);
    setAvatarError(null);
    if (!isGuest) {
      try {
        await updateProfile({ avatar: null });
      } catch (err) {
        console.error('Failed to remove avatar:', err);
      }
    }
  };

  const handleSubscribePro = () => {
    setBillingToast(true);
    setTimeout(() => setBillingToast(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-['Playfair_Display'] text-2xl font-black text-ink dark:text-paper tracking-tight uppercase">Settings</h1>
        <p className="text-[10px] text-ink-muted dark:text-ink-faint mt-1 uppercase tracking-[0.2em]">
          Manage your preferences and account settings
        </p>
        <div className="border-b border-[#e5e5e5] dark:border-[#222] mt-2 mb-3" />
      </div>

      {/* Appearance */}
      <Section title="Appearance">
        <SettingRow label="Theme" desc="Choose your preferred colour scheme">
          <div className="flex items-center gap-0">
            {THEME_OPTIONS.map((t, i) => (
              <React.Fragment key={t.value}>
                {i > 0 && <span className="text-ink-faint mx-1.5">|</span>}
                <button
                  className={`text-xs font-medium uppercase tracking-wider transition-colors font-sans px-1 ${
                    theme === t.value ? 'text-ink dark:text-paper font-bold' : 'text-ink-faint hover:text-ink-muted'
                  }`}
                  onClick={() => handleThemeChange(t.value)}
                >
                  {t.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </SettingRow>
      </Section>

      {/* Dashboard Preferences */}
      <Section title="Dashboard Preferences">
        <SettingRow label="Default Topic" desc="Pre-filled search query when opening the dashboard">
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="px-3 py-1.5 text-sm border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors font-sans w-40"
              defaultValue={prefs.defaultTopic || 'Malaysia'}
              onBlur={e => savePreference('defaultTopic', e.target.value)}
              placeholder="e.g. Malaysia"
            />
            {saved === 'defaultTopic' && <span className="text-[10px] font-medium text-green-700 dark:text-green-400 font-sans">Saved</span>}
          </div>
        </SettingRow>

        <SettingRow label="Articles Per Page" desc="How many articles to fetch per search">
          <div className="flex items-center gap-2">
            <select
              className="px-3 py-1.5 text-sm border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors font-sans"
              value={prefs.articlesPerPage || 10}
              onChange={e => savePreference('articlesPerPage', Number(e.target.value))}
            >
              {PAGE_OPTIONS.map(n => <option key={n} value={n}>{n} articles</option>)}
            </select>
            {saved === 'articlesPerPage' && <span className="text-[10px] font-medium text-green-700 dark:text-green-400 font-sans">Saved</span>}
          </div>
        </SettingRow>

        <SettingRow label="Auto Refresh" desc="Automatically refresh articles every 5 minutes">
          <Toggle id="auto-refresh" checked={!!prefs.autoRefresh} onChange={v => savePreference('autoRefresh', v)} />
        </SettingRow>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        {isGuest && (
          <p className="px-5 py-2 text-[11px] text-ink-faint italic font-sans">Preferences saved locally on this device.</p>
        )}
        <SettingRow label="Email Notifications" desc="Receive email summaries of sentiment analysis">
          <Toggle
            id="email-notif"
            checked={isGuest ? (guestNotifPrefs.emailNotifications !== false) : (prefs.emailNotifications !== false)}
            onChange={v => saveNotificationPref('emailNotifications', v)}
          />
        </SettingRow>
        <SettingRow label="Crisis Alerts" desc="Get notified when articles with crisis keywords are detected">
          <Toggle
            id="alert-notif"
            checked={isGuest ? (guestNotifPrefs.alertNotifications !== false) : (prefs.alertNotifications !== false)}
            onChange={v => saveNotificationPref('alertNotifications', v)}
          />
        </SettingRow>
      </Section>

      {/* Language */}
      <Section title="Language and Region">
        <SettingRow label="Interface Language" desc="Display language for the dashboard">
          <div className="flex items-center gap-2">
            <select
              className="px-3 py-1.5 text-sm border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors font-sans"
              value={lang}
              onChange={e => savePreference('language', e.target.value)}
            >
              {LANG_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            {saved === 'language' && <span className="text-[10px] font-medium text-green-700 dark:text-green-400 font-sans">Saved</span>}
          </div>
        </SettingRow>
      </Section>

      {/* Security */}
      <Section title="Security">
        {isGuest ? (
          <div className="px-5 py-4">
            <p className="text-xs text-ink-faint font-sans">Sign in to manage security settings.</p>
          </div>
        ) : (
          <>
            <SettingRow label="Password" desc="Change your account password">
              <button
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink dark:text-paper border border-paper-line dark:border-paper-dark-line hover:bg-paper dark:hover:bg-paper-dark transition-colors font-sans"
                onClick={() => { setShowPasswordForm(!showPasswordForm); setPwError(''); }}
              >
                {showPasswordForm ? 'Cancel' : 'Change Password'}
              </button>
            </SettingRow>
            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="px-5 py-4 border-t border-[#e5e5e5] dark:border-[#222]">
                <div className="flex flex-col gap-3 max-w-xs">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider font-sans">Current Password</span>
                    <input
                      type="password"
                      className="px-3 py-1.5 text-sm border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors font-sans"
                      value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider font-sans">New Password</span>
                    <input
                      type="password"
                      className="px-3 py-1.5 text-sm border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors font-sans"
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider font-sans">Confirm Password</span>
                    <input
                      type="password"
                      className="px-3 py-1.5 text-sm border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors font-sans"
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      required
                    />
                  </label>
                  {pwError && <p className="text-[11px] text-red-600 dark:text-red-400 font-sans">{pwError}</p>}
                  {pwSuccess && <p className="text-[11px] text-green-700 dark:text-green-400 font-sans">Password changed successfully.</p>}
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="self-start px-4 py-1.5 text-xs font-semibold uppercase tracking-wider bg-ink text-paper hover:bg-accent transition-colors font-sans disabled:opacity-40"
                  >
                    {pwLoading ? 'Saving…' : 'Save Password'}
                  </button>
                </div>
              </form>
            )}
            <TwoFactorAuthRow />
          </>
        )}
      </Section>

      {/* Billing */}
      <Section title="Billing">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-medium text-ink dark:text-paper font-sans">Current Plan</span>
              <p className="text-[11px] text-ink-faint mt-0.5 font-sans">
                {isGuest ? "Sign in to manage billing" : "Manage your subscription"}
              </p>
            </div>
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider border border-ink dark:border-paper text-ink dark:text-paper font-sans">
              {(!isGuest && safeUser.plan === 'pro') ? 'Pro Plan' : 'Free Plan'}
            </span>
          </div>
          {!isGuest && safeUser.plan !== 'pro' && (
            <button
              onClick={() => setShowBillingComparison(!showBillingComparison)}
              className="w-full mt-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-ink text-paper hover:bg-accent dark:bg-paper dark:text-ink dark:hover:bg-paper-line transition-colors font-sans"
            >
              {showBillingComparison ? 'Hide Plans' : 'Upgrade to Pro'}
            </button>
          )}
        </div>

        {showBillingComparison && (
          <div className="px-5 py-4 border-t border-[#e5e5e5] dark:border-[#222]">
            <div className="grid grid-cols-2 gap-0 border border-[#e5e5e5] dark:border-[#222]">
              {/* Free Plan Card */}
              <div className="p-4 border-r border-[#e5e5e5] dark:border-[#222]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-faint font-sans mb-1">Free</h3>
                <p className="text-lg font-black text-ink dark:text-paper font-sans mb-3">RM 0</p>
                <ul className="space-y-1.5">
                  {['50 articles/day', 'Basic sentiment analysis', 'No export', 'No API access'].map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px] text-ink-faint font-sans">
                      <span className="mt-0.5 text-[10px]">—</span>{f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-ink-faint border border-[#e5e5e5] dark:border-[#222] font-sans">
                  Current Plan
                </div>
              </div>

              {/* Pro Plan Card */}
              <div className="p-4 bg-paper dark:bg-paper-dark">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-paper font-sans mb-1">Pro</h3>
                <p className="text-lg font-black text-ink dark:text-paper font-sans mb-1">RM 29<span className="text-[11px] font-medium text-ink-faint">/month</span></p>
                <ul className="space-y-1.5">
                  {['Unlimited articles', 'Advanced analytics', 'PDF & CSV export', 'API access', 'Priority support'].map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px] text-ink dark:text-paper font-sans">
                      <span className="mt-0.5 text-[10px]">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleSubscribePro}
                  className="mt-4 w-full px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider bg-ink text-paper hover:bg-accent dark:bg-paper dark:text-ink dark:hover:bg-paper-line transition-colors font-sans"
                >
                  Subscribe to Pro
                </button>
              </div>
            </div>

            {billingToast && (
              <div className="mt-3 px-4 py-2 text-[11px] font-medium text-ink dark:text-paper bg-paper dark:bg-paper-dark border border-[#e5e5e5] dark:border-[#222] font-sans">
                Coming soon — payment integration pending
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Account Profile */}
      <Section title="Account Profile">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex-1 min-w-0 mr-4">
            <span className="text-sm font-medium text-ink dark:text-paper font-sans">Display Photo</span>
            <p className="text-[11px] text-ink-faint mt-0.5 font-sans">
              {isGuest ? 'Sign in to set a profile photo' : 'Click to change (JPG, PNG, WebP, max 2MB)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              onClick={handleAvatarClick}
              disabled={isGuest || avatarSaving}
              className="relative w-10 h-10 rounded-full border-2 border-paper-line dark:border-paper-dark-line overflow-hidden flex items-center justify-center group disabled:cursor-not-allowed"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-sm font-bold text-ink dark:text-paper font-display bg-[#fafafa] dark:bg-[#111]">
                  {(name || safeUser.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
              {!isGuest && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[8px] font-bold text-white uppercase tracking-wider">Edit</span>
                </div>
              )}
              {avatarSaving && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white animate-pulse">...</span>
                </div>
              )}
            </button>
            {avatarPreview && !isGuest && (
              <button
                onClick={handleRemoveAvatar}
                className="text-[10px] font-medium text-red-600 dark:text-red-400 hover:underline font-sans"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        {avatarError && (
          <div className="px-5 pb-2 -mt-1">
            <span className="text-[11px] text-red-600 dark:text-red-400 font-sans">{avatarError}</span>
          </div>
        )}

        <SettingRow label="Display Name" desc="Your name shown in the dashboard">
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="px-3 py-1.5 text-sm border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors font-sans w-36"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <button
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink dark:text-paper border border-paper-line dark:border-paper-dark-line hover:bg-paper dark:hover:bg-paper-dark transition-colors font-sans disabled:opacity-40"
              onClick={handleSaveProfile}
              disabled={profileSaving}
            >
              {profileSaving ? 'Saving' : profileSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </SettingRow>

        <SettingRow label="Email and Auth" desc="Account identity details">
          <div className="text-right">
            <p className="text-xs text-ink dark:text-paper font-sans">{safeUser.email || 'No email registered'}</p>
            <span className="inline-block mt-1 text-[10px] font-semibold text-ink-faint uppercase tracking-wider font-sans">
              {isGuest ? 'Guest Mode' : safeUser.provider === 'google' ? 'Verified via Google' : 'Standard Account'}
            </span>
          </div>
        </SettingRow>
      </Section>

      {/* About */}
      <Section title="About">
        <SettingRow label="Application" desc="MY News Sentiment Dashboard">
          <span className="text-xs text-ink-faint font-mono">v1.0.0</span>
        </SettingRow>
        <SettingRow label="Data Source">
          <span className="text-xs text-ink-faint font-sans">NewsAPI · AI Processing · MongoDB</span>
        </SettingRow>
      </Section>

      {/* Session */}
      <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] mb-6">
        <div className="px-5 py-4">
          {isGuest ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-ink dark:text-paper font-sans">Sign In</span>
                <p className="text-[11px] text-ink-faint mt-0.5 font-sans">Create an account for full features</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-ink text-paper hover:bg-accent transition-colors font-sans"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-ink dark:text-paper font-sans">Sign Out</span>
                <p className="text-[11px] text-ink-faint mt-0.5 font-sans">Log out of your account on this device</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-sans"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
