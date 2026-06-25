import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { settingsTranslations } from '../services/settingsTranslations';
import api from '../services/api';
import {
  Download, Clock, Key, Copy, Trash2, Eye, EyeOff, Plus, Shield, X,
} from 'lucide-react';

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

const formatSecret = (secret) =>
  secret.match(/.{1,4}/g)?.join(' ') || secret;

const TwoFactorAuthRow = () => {
  const [twoFAState, setTwoFAState] = useState('idle'); // idle | setup | enabled
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setSecret(data.secret);
      setQrCode(data.qr);
      setTwoFAState('setup');
      setVerificationCode('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start 2FA setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const trimmed = verificationCode.trim();
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/2fa/verify', { code: trimmed });
      setTwoFAState('enabled');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/2fa/disable');
      setTwoFAState('idle');
      setSecret('');
      setQrCode('');
      setVerificationCode('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to disable 2FA.');
    } finally {
      setLoading(false);
    }
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
          {/* QR Code — real from backend */}
          <div className="mt-3 border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] p-4 flex flex-col items-center">
            {qrCode ? (
              <img src={qrCode} alt="Scan this QR code with your authenticator app" className="w-40 h-40" />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-[10px] text-ink-faint">Loading QR...</div>
            )}
            <p className="text-[9px] text-ink-faint mt-2 uppercase tracking-wider font-sans">Scan with Google Authenticator</p>
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

  // ── Data Export state ──
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  // ── Theme Scheduler state ──
  const [scheduleEnabled, setScheduleEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('theme_scheduler'))?.enabled || false; } catch { return false; }
  });
  const [darkStart, setDarkStart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('theme_scheduler'))?.darkStart || '19:00'; } catch { return '19:00'; }
  });
  const [darkEnd, setDarkEnd] = useState(() => {
    try { return JSON.parse(localStorage.getItem('theme_scheduler'))?.darkEnd || '06:00'; } catch { return '06:00'; }
  });

  // ── API Key Management state ──
  const [apiKeys, setApiKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem('api_keys')) || []; } catch { return []; }
  });
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('30');
  const [newKeyPermissions, setNewKeyPermissions] = useState('read');
  const [visibleKeys, setVisibleKeys] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [justGenerated, setJustGenerated] = useState(null);

  useEffect(() => {
    if (!isGuest && user?.name) setName(user.name);
  }, [isGuest, user?.name]);

  // ── Theme Scheduler: persist + apply on mount ──
  useEffect(() => {
    localStorage.setItem('theme_scheduler', JSON.stringify({
      enabled: scheduleEnabled, darkStart, darkEnd,
    }));
  }, [scheduleEnabled, darkStart, darkEnd]);

  const applyScheduledTheme = useCallback(() => {
    if (!scheduleEnabled) return;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isDark = darkStart > darkEnd
      ? (hhmm >= darkStart || hhmm < darkEnd)
      : (hhmm >= darkStart && hhmm < darkEnd);
    setTheme(isDark ? 'dark' : 'light');
  }, [scheduleEnabled, darkStart, darkEnd, setTheme]);

  useEffect(() => {
    applyScheduledTheme();
    if (!scheduleEnabled) return;
    const id = setInterval(applyScheduledTheme, 60 * 1000);
    return () => clearInterval(id);
  }, [scheduleEnabled, applyScheduledTheme]);

  // ── Data Export handler ──
  const handleExportAllData = async () => {
    setExporting(true);
    setExportDone(false);
    try {
      // Gather all localStorage keys
      const lsData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        try { lsData[k] = JSON.parse(localStorage.getItem(k)); }
        catch { lsData[k] = localStorage.getItem(k); }
      }

      // Try to fetch server-side data (bookmarks, alert rules, saved searches)
      let serverData = {};
      try {
        const [bookmarksRes, alertsRes, searchesRes] = await Promise.allSettled([
          api.get('/bookmarks'),
          api.get('/alert-rules'),
          api.get('/saved-searches'),
        ]);
        serverData = {
          bookmarks: bookmarksRes.status === 'fulfilled' ? bookmarksRes.value.data : [],
          alertRules: alertsRes.status === 'fulfilled' ? alertsRes.value.data : [],
          savedSearches: searchesRes.status === 'fulfilled' ? searchesRes.value.data : [],
        };
      } catch { /* guest or API unavailable */ }

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        localStorage: lsData,
        serverData,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statusmy-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } finally {
      setExporting(false);
    }
  };

  // ── API Key Management helpers ──
  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const segments = [4, 4, 4, 4, 4].map(len =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    );
    return `snm_${segments.join('_')}`;
  };

  const handleGenerateApiKey = () => {
    if (!newKeyName.trim()) return;
    const expiryDays = parseInt(newKeyExpiry, 10);
    const now = new Date();
    const expires = new Date(now.getTime() + expiryDays * 86400000);
    const newKey = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: newKeyName.trim(),
      key: generateRandomKey(),
      permissions: newKeyPermissions,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    const updated = [...apiKeys, newKey];
    setApiKeys(updated);
    localStorage.setItem('api_keys', JSON.stringify(updated));
    setJustGenerated(newKey.id);
    setShowGenerateForm(false);
    setNewKeyName('');
    setNewKeyExpiry('30');
    setNewKeyPermissions('read');
  };

  const handleRevokeApiKey = (id) => {
    const updated = apiKeys.filter(k => k.id !== id);
    setApiKeys(updated);
    localStorage.setItem('api_keys', JSON.stringify(updated));
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

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

      {/* ─── Data Export ─── */}
      <Section title={ts('dataExport')}>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0 mr-4">
              <span className="text-sm font-medium text-ink dark:text-paper font-sans">{ts('exportAllData')}</span>
              <p className="text-[11px] text-ink-faint mt-0.5 font-sans">{ts('exportAllDataDesc')}</p>
            </div>
            <button
              onClick={handleExportAllData}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-paper-line dark:border-paper-dark-line text-ink dark:text-paper hover:bg-paper dark:hover:bg-paper-dark transition-colors font-sans disabled:opacity-50"
            >
              <Download size={14} strokeWidth={2.5} />
              {exporting ? ts('exporting') : exportDone ? ts('exportSuccess') : ts('exportAllData')}
            </button>
          </div>
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-paper dark:bg-paper-dark px-4 py-3">
            <p className="text-[10px] text-ink-faint uppercase tracking-wider font-sans mb-1">Included in export</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {['Bookmarks', 'History', 'Preferences', 'Alert Rules', 'Saved Searches'].map(item => (
                <span key={item} className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted dark:text-ink-faint border border-[#e5e5e5] dark:border-[#222] font-sans">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Theme Scheduler ─── */}
      <Section title={ts('themeScheduler')}>
        <SettingRow label={ts('themeSchedulerEnabled')} desc={ts('themeSchedulerDesc')}>
          <Toggle
            id="theme-scheduler"
            checked={scheduleEnabled}
            onChange={setScheduleEnabled}
          />
        </SettingRow>
        {scheduleEnabled && (
          <>
            <SettingRow label={ts('darkModeStart')} desc="Switch to dark mode at this time">
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-ink-faint" strokeWidth={2} />
                <input
                  type="time"
                  value={darkStart}
                  onChange={e => setDarkStart(e.target.value)}
                  className="px-2 py-1 text-sm border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors font-mono"
                />
              </div>
            </SettingRow>
            <SettingRow label={ts('darkModeEnd')} desc="Switch back to light mode at this time">
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-ink-faint" strokeWidth={2} />
                <input
                  type="time"
                  value={darkEnd}
                  onChange={e => setDarkEnd(e.target.value)}
                  className="px-2 py-1 text-sm border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors font-mono"
                />
              </div>
            </SettingRow>
          </>
        )}
      </Section>

      {/* ─── API Key Management ─── */}
      <Section title={ts('apiKeyManagement')}>
        {/* Existing keys list */}
        {apiKeys.length === 0 && !showGenerateForm && (
          <div className="px-5 py-6 flex flex-col items-center">
            <Key size={20} className="text-ink-faint mb-2" strokeWidth={1.5} />
            <p className="text-xs text-ink-faint font-sans">{ts('noApiKeys')}</p>
          </div>
        )}
        {apiKeys.map(k => (
          <div key={k.id} className="px-5 py-3 border-b border-[#e5e5e5] dark:border-[#222] last:border-b-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <Shield size={13} className="text-ink-faint shrink-0" strokeWidth={2} />
                <span className="text-sm font-medium text-ink dark:text-paper font-sans truncate">{k.name}</span>
                {k.id === justGenerated && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 font-sans">
                    NEW
                  </span>
                )}
                <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-faint border border-[#e5e5e5] dark:border-[#222] font-sans">
                  {k.permissions === 'read' ? ts('apiKeyPermRead') : k.permissions === 'readwrite' ? ts('apiKeyPermReadWrite') : ts('apiKeyPermFull')}
                </span>
              </div>
              <button
                onClick={() => handleRevokeApiKey(k.id)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-sans"
              >
                <Trash2 size={11} strokeWidth={2} />
                {ts('revokeKey')}
              </button>
            </div>
            {/* Key display */}
            <div className="flex items-center gap-2 mb-1.5">
              <code className="flex-1 px-2 py-1 text-[11px] font-mono tracking-wider text-ink dark:text-paper bg-paper dark:bg-paper-dark border border-[#e5e5e5] dark:border-[#222] overflow-hidden text-ellipsis whitespace-nowrap">
                {visibleKeys[k.id] ? k.key : k.key.slice(0, 10) + '••••••••••••••••'}
              </code>
              <button
                onClick={() => setVisibleKeys(prev => ({ ...prev, [k.id]: !prev[k.id] }))}
                className="p-1 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors"
                title={visibleKeys[k.id] ? 'Hide' : 'Reveal'}
              >
                {visibleKeys[k.id] ? <EyeOff size={13} strokeWidth={2} /> : <Eye size={13} strokeWidth={2} />}
              </button>
              <button
                onClick={() => handleCopyKey(k.key)}
                className="p-1 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors"
                title={ts('copyKey')}
              >
                {copiedKey === k.key ? (
                  <span className="text-[10px] font-medium text-green-600 dark:text-green-400 font-sans">{ts('copied')}</span>
                ) : (
                  <Copy size={13} strokeWidth={2} />
                )}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-ink-faint font-sans">
                {ts('generatedOn')} {new Date(k.createdAt).toLocaleDateString()}
              </span>
              <span className="text-[10px] text-ink-faint font-sans">
                {ts('expiresOn')} {new Date(k.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}

        {/* Generate form */}
        {showGenerateForm && (
          <div className="px-5 py-4 border-t border-[#e5e5e5] dark:border-[#222]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink dark:text-paper font-sans">{ts('generateApiKey')}</span>
              <button onClick={() => { setShowGenerateForm(false); setNewKeyName(''); }} className="text-ink-faint hover:text-ink dark:hover:text-paper transition-colors">
                <X size={14} strokeWidth={2} />
              </button>
            </div>
            <div className="flex flex-col gap-3 max-w-sm">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider font-sans">{ts('apiKeyName')}</span>
                <input
                  type="text"
                  className="px-3 py-1.5 text-sm border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors font-sans"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder={ts('apiKeyNamePlaceholder')}
                />
              </label>
              <div className="flex gap-3">
                <label className="flex flex-col gap-1 flex-1">
                  <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider font-sans">{ts('apiKeyExpiry')}</span>
                  <select
                    className="px-3 py-1.5 text-sm border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors font-sans"
                    value={newKeyExpiry}
                    onChange={e => setNewKeyExpiry(e.target.value)}
                  >
                    <option value="30">{ts('apiKeyDays30')}</option>
                    <option value="90">{ts('apiKeyDays90')}</option>
                    <option value="365">{ts('apiKeyDays365')}</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 flex-1">
                  <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider font-sans">{ts('apiKeyPermissions')}</span>
                  <select
                    className="px-3 py-1.5 text-sm border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors font-sans"
                    value={newKeyPermissions}
                    onChange={e => setNewKeyPermissions(e.target.value)}
                  >
                    <option value="read">{ts('apiKeyPermRead')}</option>
                    <option value="readwrite">{ts('apiKeyPermReadWrite')}</option>
                    <option value="full">{ts('apiKeyPermFull')}</option>
                  </select>
                </label>
              </div>
              <button
                onClick={handleGenerateApiKey}
                disabled={!newKeyName.trim()}
                className="self-start flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider bg-ink text-paper hover:bg-accent transition-colors font-sans disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={13} strokeWidth={2.5} />
                {ts('generateApiKey')}
              </button>
            </div>
          </div>
        )}

        {/* Generate button (when form is hidden) */}
        {!showGenerateForm && (
          <div className="px-5 py-3 border-t border-[#e5e5e5] dark:border-[#222]">
            <button
              onClick={() => setShowGenerateForm(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-ink dark:text-paper border border-paper-line dark:border-paper-dark-line hover:bg-paper dark:hover:bg-paper-dark transition-colors font-sans"
            >
              <Plus size={13} strokeWidth={2.5} />
              {ts('generateApiKey')}
            </button>
          </div>
        )}
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
