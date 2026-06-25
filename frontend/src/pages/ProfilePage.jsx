import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import {
  User, Mail, Calendar, Shield, Edit3, ExternalLink, Bookmark, MessageSquare,
  Share2, TrendingUp, Clock, Settings, Globe, Bell, Eye, BarChart3, FileText,
  Search, MapPin, Award, Activity
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || '/api/v1';

/* ── Editorial Section Wrapper ── */
const Section = ({ title, icon, children, className = '' }) => (
  <div className={`border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] ${className}`}>
    <div className="px-5 py-3 border-b border-[#e5e5e5] dark:border-[#222] flex items-center gap-2">
      {icon && <span className="text-ink-muted dark:text-ink-faint">{icon}</span>}
      <h2 className="text-xs font-semibold text-ink dark:text-paper uppercase tracking-[0.2em] font-sans">{title}</h2>
    </div>
    <div>{children}</div>
  </div>
);

/* ── Info Row (like Fiverr's From/Member since) ── */
const InfoRow = ({ icon, label, value, onClick }) => (
  <div
    className={`flex items-center gap-3 px-5 py-2.5 text-sm ${onClick ? 'cursor-pointer hover:bg-paper dark:hover:bg-white/5 transition-colors' : ''}`}
    onClick={onClick}
  >
    <span className="text-ink-muted dark:text-ink-faint w-4 flex justify-center">{icon}</span>
    <span className="text-ink-faint dark:text-ink-faint font-sans text-xs uppercase tracking-wider w-24">{label}</span>
    <span className="text-ink dark:text-paper font-sans text-sm flex-1">{value}</span>
  </div>
);

/* ── Stat Card ── */
const StatCard = ({ icon, label, value, color = 'text-ink dark:text-paper' }) => (
  <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-4 flex items-center gap-3">
    <div className="w-9 h-9 flex items-center justify-center border border-[#e5e5e5] dark:border-[#222] bg-paper dark:bg-paper-dark">
      <span className={color}>{icon}</span>
    </div>
    <div>
      <p className="text-lg font-bold font-display text-ink dark:text-paper leading-none">{value}</p>
      <p className="text-[10px] text-ink-muted dark:text-ink-faint uppercase tracking-wider font-sans mt-0.5">{label}</p>
    </div>
  </div>
);

/* ── Activity Item ── */
const ActivityItem = ({ icon, text, time, color = 'text-ink-muted dark:text-ink-faint' }) => (
  <div className="flex items-start gap-3 px-5 py-3 border-b border-[#e5e5e5] dark:border-[#222] last:border-b-0">
    <span className={`mt-0.5 ${color}`}>{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-ink dark:text-paper font-sans">{text}</p>
      <p className="text-[11px] text-ink-faint mt-0.5 font-sans">{time}</p>
    </div>
  </div>
);

/* ── Badge Component ── */
const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'border-[#e5e5e5] dark:border-[#222] text-ink-muted dark:text-ink-faint',
    accent: 'border-accent text-accent',
    success: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
    admin: 'border-red-500 text-red-600 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border font-sans ${variants[variant]}`}>
      {children}
    </span>
  );
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [stats, setStats] = useState({ articles: 0, bookmarks: 0, comments: 0, shared: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const initials = (user?.name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'N/A';

  const roleLabel = user?.role === 'admin' ? 'Administrator' : 'Member';
  const roleVariant = user?.role === 'admin' ? 'admin' : 'default';

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [historyRes, bookmarksRes, sharedRes] = await Promise.allSettled([
          api.get('/history'),
          api.get('/bookmarks'),
          api.get('/collab/shared'),
        ]);

        const history = historyRes.status === 'fulfilled' ? (historyRes.value.data || []) : [];
        const bookmarks = bookmarksRes.status === 'fulfilled' ? (bookmarksRes.value.data?.bookmarks || bookmarksRes.value.data || []) : [];
        const shared = sharedRes.status === 'fulfilled' ? (sharedRes.value.data?.articles || sharedRes.value.data || []) : [];

        setStats({
          articles: history.length,
          bookmarks: Array.isArray(bookmarks) ? bookmarks.length : 0,
          comments: 0,
          shared: Array.isArray(shared) ? shared.length : 0,
        });

        // Build recent activity from history
        const activities = history.slice(0, 5).map((item, i) => ({
          id: i,
          icon: <Eye size={14} />,
          text: `Viewed "${item.title || item.articleTitle || 'an article'}"`,
          time: item.viewedAt ? new Date(item.viewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
          color: 'text-ink-muted dark:text-ink-faint',
        }));

        if (bookmarks.length > 0) {
          activities.push({
            id: 'bm',
            icon: <Bookmark size={14} />,
            text: `Saved ${bookmarks.length} article${bookmarks.length > 1 ? 's' : ''} to bookmarks`,
            time: '',
            color: 'text-accent',
          });
        }

        setRecentActivity(activities);
      } catch (err) {
        console.error('Failed to fetch profile stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Masthead ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="editorial-kicker">{t('profile') || 'Profile'}</p>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-ink dark:text-paper leading-tight">
          {t('yourProfile') || 'Your Profile'}
        </h1>
        <div className="w-16 h-0.5 bg-accent mt-2" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN: Profile Card (Fiverr-style) ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 space-y-4"
        >
          {/* Profile Card */}
          <Section title={t('profile') || 'Profile'}>
            <div className="p-5 flex flex-col items-center text-center border-b border-[#e5e5e5] dark:border-[#222]">
              {/* Avatar */}
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#e5e5e5] dark:border-[#222]"
                  loading="lazy"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-accent/10 text-accent flex items-center justify-center text-2xl font-bold font-display border-2 border-accent/20">
                  {initials}
                </div>
              )}

              {/* Name + Role */}
              <h2 className="font-display text-xl font-bold text-ink dark:text-paper mt-3">{user?.name || 'User'}</h2>
              <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">{user?.email || ''}</p>

              {/* Badges */}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={roleVariant}>{roleLabel}</Badge>
                <Badge variant="success">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                  Online
                </Badge>
              </div>

              {/* Edit Profile Button */}
              <button
                onClick={() => navigate('/settings')}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#e5e5e5] dark:border-[#222] text-sm font-sans text-ink dark:text-paper hover:bg-paper dark:hover:bg-white/5 transition-colors"
              >
                <Edit3 size={14} />
                {t('editProfile') || 'Edit Profile'}
              </button>
            </div>

            {/* Info Rows */}
            <div className="divide-y divide-[#e5e5e5] dark:divide-[#222]">
              <InfoRow
                icon={<Mail size={14} />}
                label={t('email') || 'Email'}
                value={user?.email || 'N/A'}
              />
              <InfoRow
                icon={<Shield size={14} />}
                label={t('role') || 'Role'}
                value={roleLabel}
              />
              <InfoRow
                icon={<Calendar size={14} />}
                label={t('memberSince') || 'Member since'}
                value={memberSince}
              />
              <InfoRow
                icon={<Globe size={14} />}
                label={t('language') || 'Language'}
                value={user?.preferredLanguage === 'ms' ? 'Bahasa Malaysia' : 'English'}
              />
            </div>
          </Section>

          {/* Quick Links */}
          <Section title={t('quickLinks') || 'Quick Links'} icon={<Activity size={14} />}>
            <div className="divide-y divide-[#e5e5e5] dark:divide-[#222]">
              {[
                { icon: <Settings size={14} />, label: t('settings') || 'Settings', path: '/settings' },
                { icon: <Bookmark size={14} />, label: t('bookmarks') || 'Bookmarks', path: '/bookmarks' },
                { icon: <Clock size={14} />, label: t('history') || 'History', path: '/history' },
                { icon: <FileText size={14} />, label: t('reports') || 'Reports', path: '/reports' },
              ].map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm text-ink dark:text-paper no-underline hover:bg-paper dark:hover:bg-white/5 transition-colors font-sans"
                >
                  <span className="text-ink-muted dark:text-ink-faint">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  <ExternalLink size={12} className="text-ink-faint" />
                </Link>
              ))}
            </div>
          </Section>
        </motion.div>

        {/* ── RIGHT COLUMN: Stats + Activity ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Eye size={18} />}
              label={t('articlesViewed') || 'Articles Viewed'}
              value={loading ? '—' : stats.articles}
            />
            <StatCard
              icon={<Bookmark size={18} />}
              label={t('bookmarks') || 'Bookmarks'}
              value={loading ? '—' : stats.bookmarks}
              color="text-accent"
            />
            <StatCard
              icon={<Share2 size={18} />}
              label={t('shared') || 'Shared'}
              value={loading ? '—' : stats.shared}
              color="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={<MessageSquare size={18} />}
              label={t('comments') || 'Comments'}
              value={loading ? '—' : stats.comments}
              color="text-blue-600 dark:text-blue-400"
            />
          </div>

          {/* Recent Activity */}
          <Section title={t('recentActivity') || 'Recent Activity'} icon={<Activity size={14} />}>
            {recentActivity.length > 0 ? (
              recentActivity.map(item => (
                <ActivityItem
                  key={item.id}
                  icon={item.icon}
                  text={item.text}
                  time={item.time}
                  color={item.color}
                />
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <Activity size={24} className="mx-auto text-ink-faint mb-2" />
                <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">
                  {t('noActivity') || 'No recent activity yet'}
                </p>
                <p className="text-xs text-ink-faint mt-1 font-sans">
                  {t('startExploring') || 'Start exploring articles to see your activity here'}
                </p>
              </div>
            )}
          </Section>

          {/* Account Overview */}
          <Section title={t('accountOverview') || 'Account Overview'} icon={<BarChart3 size={14} />}>
            <div className="divide-y divide-[#e5e5e5] dark:divide-[#222]">
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Bell size={14} className="text-ink-muted dark:text-ink-faint" />
                  <span className="text-sm font-sans text-ink dark:text-paper">{t('notifications') || 'Notifications'}</span>
                </div>
                <Badge variant={user?.notificationsEnabled !== false ? 'success' : 'default'}>
                  {user?.notificationsEnabled !== false ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Shield size={14} className="text-ink-muted dark:text-ink-faint" />
                  <span className="text-sm font-sans text-ink dark:text-paper">{t('twoFactor') || 'Two-Factor Auth'}</span>
                </div>
                <Badge>Not configured</Badge>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Globe size={14} className="text-ink-muted dark:text-ink-faint" />
                  <span className="text-sm font-sans text-ink dark:text-paper">{t('preferredLanguage') || 'Preferred Language'}</span>
                </div>
                <span className="text-sm font-sans text-ink-muted dark:text-ink-faint">
                  {user?.preferredLanguage === 'ms' ? 'Bahasa Malaysia' : 'English'}
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Eye size={14} className="text-ink-muted dark:text-ink-faint" />
                  <span className="text-sm font-sans text-ink dark:text-paper">{t('theme') || 'Theme'}</span>
                </div>
                <span className="text-sm font-sans text-ink-muted dark:text-ink-faint capitalize">{theme}</span>
              </div>
            </div>

            {/* Go to Settings */}
            <div className="px-5 py-3 border-t border-[#e5e5e5] dark:border-[#222]">
              <button
                onClick={() => navigate('/settings')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ink dark:bg-paper text-paper dark:text-ink text-sm font-semibold font-sans hover:opacity-90 transition-opacity"
              >
                <Settings size={14} />
                {t('goToSettings') || 'Go to Settings'}
              </button>
            </div>
          </Section>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
