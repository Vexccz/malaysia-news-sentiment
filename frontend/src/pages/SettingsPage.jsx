import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { settingsTranslations } from '../services/settingsTranslations';

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

  const handleLogout = () => {
    logout();
    navigate('/login');
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
              <button className="px-3 py-1.5 text-xs font-medium text-ink-faint border border-paper-line dark:border-paper-dark-line cursor-not-allowed font-sans opacity-50">
                Change Password
              </button>
            </SettingRow>
            <SettingRow label="Two-Factor Auth" desc="Add an extra layer of security">
              <button className="px-3 py-1.5 text-xs font-medium text-ink-faint border border-paper-line dark:border-paper-dark-line cursor-not-allowed font-sans opacity-50">
                Setup 2FA
              </button>
            </SettingRow>
          </>
        )}
      </Section>

      {/* Billing */}
      <Section title="Billing">
        <SettingRow label="Current Plan" desc={isGuest ? "You're using the free tier" : "Manage your subscription"}>
          <span className="text-xs font-semibold text-ink dark:text-paper font-sans">
            {(!isGuest && safeUser.plan === 'pro') ? 'Pro Plan' : 'Free Plan'}
          </span>
        </SettingRow>
      </Section>

      {/* Account Profile */}
      <Section title="Account Profile">
        <SettingRow label="Display Photo" desc={isGuest ? "Sign in to set a profile photo" : "From your login source"}>
          <div className="w-9 h-9 border border-paper-line dark:border-paper-dark-line flex items-center justify-center text-sm font-bold text-ink dark:text-paper font-display">
            {(name || safeUser.name || '?').charAt(0).toUpperCase()}
          </div>
        </SettingRow>

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
