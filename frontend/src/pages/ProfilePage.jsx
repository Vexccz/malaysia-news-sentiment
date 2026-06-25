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

/* ── Info Row ── */
const InfoRow = ({ icon, label, value, onClick }) => (
  <div
    className={`flex items-center gap-3 px-5 py-2.5 text-sm ${onClick ? 'cursor-pointer hover:bg-paper dark:hover:bg-white/5 transition-colors' : ''}`}
    onClick={onClick}
  >
    <span className="text-ink-muted dark:text-ink-faint w-4 flex justify-center">{icon}</span>
    <span className="text-ink-faint dark:text-ink-faint font-sans text-xs uppercase tracking-wider w-28 shrink-0">{label}</span>
    <span className="text-ink dark:text-paper font-sans text-sm flex-1 truncate">{value}</span>
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
      <p className="text-sm text-ink dark:text-paper font-sans leading-snug">{text}</p>
      <p className="text-[11px] text-ink-faint mt-0.5 font-sans">{time}</p>
    </div>
  </div>
);

/* ── Badge ── */
const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'border-[#e5e5e5] dark:border-[#222] text-ink-muted dark:text-ink-faint',
    accent: 'border-accent text-accent',
    success: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
    admin: 'border-red-500 text-red-600 dark:text-red-400',
    warning: 'border-amber-500 text-amber-600 dark:text-amber-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border font-sans ${variants[variant]}`}>
      {children}
    </span>
  );
};

/* ── Time formatting ── */
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [stats, setStats] = useState({
    articlesViewed: 0,
    bookmarks: 0,
    shared: 0,
    comments: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState([]);
  const [selectedBadges, setSelectedBadges] = useState([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [savingBadges, setSavingBadges] = useState(false);

  const initials = (user?.name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

  const roleLabel = user?.role === 'admin' ? 'Administrator' : 'Member';
  const roleVariant = user?.role === 'admin' ? 'admin' : 'default';

  // Real preferences from user data
  const emailNotifs = user?.preferences?.emailNotifications !== false;
  const alertNotifs = user?.preferences?.alertNotifications !== false;
  const twoFactor = user?.twoFactorEnabled || false;
  const preferredLang = user?.preferences?.language === 'ms' ? 'Bahasa Malaysia' : 'English';
  const preferredTheme = user?.preferences?.theme || theme || 'light';

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch history, bookmarks, shared, comments in parallel
        const [historyRes, bookmarksRes, sharedRes, commentsRes] = await Promise.allSettled([
          api.get('/history?limit=50'),
          api.get('/bookmarks'),
          api.get('/collab/shared'),
          api.get('/collab/discussions'),
        ]);

        // History — articles viewed
        const historyData = historyRes.status === 'fulfilled' ? historyRes.value.data : {};
        const history = historyData.articles || historyData.data || historyData || [];
        const historyArr = Array.isArray(history) ? history : [];
        const totalArticles = historyData.total || historyArr.length;

        // Bookmarks
        const bookmarksData = bookmarksRes.status === 'fulfilled' ? bookmarksRes.value.data : {};
        const bookmarks = bookmarksData.bookmarks || bookmarksData || [];
        const bookmarksArr = Array.isArray(bookmarks) ? bookmarks : [];

        // Shared articles
        const sharedData = sharedRes.status === 'fulfilled' ? sharedRes.value.data : {};
        const shared = sharedData.articles || sharedData || [];
        const sharedArr = Array.isArray(shared) ? shared : [];

        // Comments/discussions
        const commentsData = commentsRes.status === 'fulfilled' ? commentsRes.value.data : {};
        const discussions = commentsData.discussions || commentsData || [];
        const discussionsArr = Array.isArray(discussions) ? discussions : [];
        const totalComments = discussionsArr.reduce((sum, d) => sum + (d.commentCount || d.comments?.length || 0), 0);

        // Also use user.analysisCount and user.bookmarksCount from /auth/me
        const articlesViewed = user?.analysisCount || totalArticles || 0;
        const bookmarkCount = user?.bookmarksCount || bookmarksArr.length || 0;

        setStats({
          articlesViewed,
          bookmarks: bookmarkCount,
          shared: sharedArr.length,
          comments: totalComments,
        });

        // Build recent activity from history (most recent 5)
        const activities = [];
        historyArr.slice(0, 5).forEach((item) => {
          const title = item.title || item.articleTitle || 'an article';
          const sentiment = item.sentiment ? ` (${item.sentiment})` : '';
          activities.push({
            id: `h-${item._id || Math.random()}`,
            icon: <Eye size={14} />,
            text: `Viewed "${title}"${sentiment}`,
            time: formatTimeAgo(item.viewedAt || item.createdAt || item.publishedAt),
            color: 'text-ink-muted dark:text-ink-faint',
          });
        });

        // Add bookmark activity
        if (bookmarksArr.length > 0) {
          const latestBm = bookmarksArr[0];
          activities.push({
            id: 'bm-latest',
            icon: <Bookmark size={14} />,
            text: `Saved "${latestBm.title || 'an article'}" to bookmarks`,
            time: formatTimeAgo(latestBm.createdAt || latestBm.savedAt),
            color: 'text-accent',
          });
        }

        // Add shared activity
        if (sharedArr.length > 0) {
          const latestShared = sharedArr[0];
          activities.push({
            id: 'sh-latest',
            icon: <Share2 size={14} />,
            text: `Shared "${latestShared.title || latestShared.articleTitle || 'an article'}" with community`,
            time: formatTimeAgo(latestShared.createdAt || latestShared.sharedAt),
            color: 'text-emerald-600 dark:text-emerald-400',
          });
        }

        // Add comment activity
        if (discussionsArr.length > 0) {
          const latestDisc = discussionsArr[0];
          activities.push({
            id: 'cmt-latest',
            icon: <MessageSquare size={14} />,
            text: `Commented on "${latestDisc.title || latestDisc.articleTitle || 'a discussion'}"`,
            time: formatTimeAgo(latestDisc.lastCommentAt || latestDisc.createdAt),
            color: 'text-blue-600 dark:text-blue-400',
          });
        }

        // Sort by time (most recent first) and take 6
        setRecentActivity(activities.slice(0, 6));
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  // Fetch badges
  useEffect(() => {
    const fetchBadges = async () => {
      setBadgesLoading(true);
      try {
        const res = await api.get('/auth/badges');
        setBadges(res.data.badges || []);
        setSelectedBadges(res.data.selectedBadges || []);
      } catch (err) {
        console.error('Failed to fetch badges:', err);
      } finally {
        setBadgesLoading(false);
      }
    };
    fetchBadges();
  }, [user]);

  const handleBadgeToggle = async (badgeId) => {
    const isSelected = selectedBadges.includes(badgeId);
    let newSelected;
    if (isSelected) {
      newSelected = selectedBadges.filter(id => id !== badgeId);
    } else {
      if (selectedBadges.length >= 3) return; // max 3
      newSelected = [...selectedBadges, badgeId];
    }
    setSelectedBadges(newSelected);
    setSavingBadges(true);
    try {
      await api.put('/auth/badges', { badgeIds: newSelected });
    } catch (err) {
      console.error('Failed to save badges:', err);
      // Revert on error
      setSelectedBadges(selectedBadges);
    } finally {
      setSavingBadges(false);
    }
  };

  const earnedBadges = badges.filter(b => b.earned);
  const lockedBadges = badges.filter(b => !b.earned);

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
        {/* ── LEFT COLUMN ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 space-y-4"
        >
          {/* Profile Card */}
          <Section title={t('profile') || 'Profile'}>
            <div className="p-5 flex flex-col items-center text-center border-b border-[#e5e5e5] dark:border-[#222]">
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

              <h2 className="font-display text-xl font-bold text-ink dark:text-paper mt-3">{user?.name || 'User'}</h2>
              <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">{user?.email || ''}</p>

              <div className="flex items-center gap-2 mt-2">
                <Badge variant={roleVariant}>{roleLabel}</Badge>
                <Badge variant="success">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                  Online
                </Badge>
              </div>

              {/* Selected badges under role */}
              {selectedBadges.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
                  {selectedBadges.map(id => {
                    const badge = badges.find(b => b.id === id);
                    if (!badge) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-sans bg-accent/10 text-accent border border-accent/20"
                        title={badge.description}
                      >
                        {badge.icon} {badge.name}
                      </span>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => navigate('/settings')}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#e5e5e5] dark:border-[#222] text-sm font-sans text-ink dark:text-paper hover:bg-paper dark:hover:bg-white/5 transition-colors"
              >
                <Edit3 size={14} />
                {t('editProfile') || 'Edit Profile'}
              </button>
            </div>

            <div className="divide-y divide-[#e5e5e5] dark:divide-[#222]">
              <InfoRow icon={<Mail size={14} />} label={t('email') || 'Email'} value={user?.email || 'N/A'} />
              <InfoRow icon={<Shield size={14} />} label={t('role') || 'Role'} value={roleLabel} />
              <InfoRow icon={<Calendar size={14} />} label={t('memberSince') || 'Member since'} value={memberSince} />
              <InfoRow icon={<Globe size={14} />} label={t('language') || 'Language'} value={preferredLang} />
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

        {/* ── RIGHT COLUMN ── */}
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
              value={loading ? '—' : stats.articlesViewed.toLocaleString()}
            />
            <StatCard
              icon={<Bookmark size={18} />}
              label={t('bookmarks') || 'Bookmarks'}
              value={loading ? '—' : stats.bookmarks.toLocaleString()}
              color="text-accent"
            />
            <StatCard
              icon={<Share2 size={18} />}
              label={t('shared') || 'Shared'}
              value={loading ? '—' : stats.shared.toLocaleString()}
              color="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={<MessageSquare size={18} />}
              label={t('comments') || 'Comments'}
              value={loading ? '—' : stats.comments.toLocaleString()}
              color="text-blue-600 dark:text-blue-400"
            />
          </div>

          {/* ── Badge Selection ── */}
          <Section title={t('myBadges') || 'My Badges'} icon={<Award size={14} />}>
            <div className="p-5">
              {badgesLoading ? (
                <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">{t('loading') || 'Loading...'}</p>
              ) : (
                <>
                  {/* Selected badges display */}
                  {selectedBadges.length > 0 && (
                    <div className="mb-4 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-ink-faint dark:text-ink-faint uppercase tracking-wider font-sans">
                        {t('displaying') || 'Displaying'}:
                      </span>
                      {selectedBadges.map(id => {
                        const badge = badges.find(b => b.id === id);
                        if (!badge) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-sans bg-accent/10 text-accent border border-accent/30"
                          >
                            {badge.icon} {badge.name}
                          </span>
                        );
                      })}
                      {savingBadges && (
                        <span className="text-[10px] text-ink-faint font-sans italic">
                          {t('saving') || 'Saving...'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Earned badges (selectable) */}
                  {earnedBadges.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] text-ink-faint dark:text-ink-faint uppercase tracking-wider font-sans mb-2">
                        {t('earnedBadges') || 'Earned Badges'} ({earnedBadges.length}) — {t('selectUpTo3') || 'Select up to 3'}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {earnedBadges.map(badge => {
                          const isSelected = selectedBadges.includes(badge.id);
                          return (
                            <button
                              key={badge.id}
                              onClick={() => handleBadgeToggle(badge.id)}
                              disabled={savingBadges || (!isSelected && selectedBadges.length >= 3)}
                              className={`
                                flex items-center gap-2 px-3 py-2.5 text-left border transition-all text-sm font-sans
                                ${isSelected
                                  ? 'border-accent bg-accent/5 text-accent'
                                  : 'border-[#e5e5e5] dark:border-[#222] text-ink dark:text-paper hover:border-accent/50'
                                }
                                disabled:opacity-40 disabled:cursor-not-allowed
                              `}
                            >
                              <span className="text-lg">{badge.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-xs truncate">{badge.name}</p>
                                <p className="text-[10px] text-ink-faint truncate">{badge.description}</p>
                              </div>
                              {isSelected && (
                                <span className="text-accent text-xs">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Locked badges (grayed out) */}
                  {lockedBadges.length > 0 && (
                    <div>
                      <p className="text-[10px] text-ink-faint dark:text-ink-faint uppercase tracking-wider font-sans mb-2">
                        {t('lockedBadges') || 'Locked Badges'} ({lockedBadges.length})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {lockedBadges.map(badge => (
                          <div
                            key={badge.id}
                            className="flex items-center gap-2 px-3 py-2.5 border border-[#e5e5e5] dark:border-[#222] opacity-40 text-sm font-sans"
                          >
                            <span className="text-lg grayscale">{badge.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs truncate text-ink-muted">{badge.name}</p>
                              <p className="text-[10px] text-ink-faint truncate">{badge.description}</p>
                            </div>
                            <span className="text-ink-faint text-xs">🔒</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {earnedBadges.length === 0 && lockedBadges.length === 0 && (
                    <p className="text-sm text-ink-muted dark:text-ink-faint font-sans text-center py-4">
                      {t('noBadges') || 'No badges available yet. Start commenting to earn badges!'}
                    </p>
                  )}
                </>
              )}
            </div>
          </Section>

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
                  <Mail size={14} className="text-ink-muted dark:text-ink-faint" />
                  <span className="text-sm font-sans text-ink dark:text-paper">{t('notifications') || 'Email Notifications'}</span>
                </div>
                <Badge variant={emailNotifs ? 'success' : 'default'}>
                  {emailNotifs ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Bell size={14} className="text-ink-muted dark:text-ink-faint" />
                  <span className="text-sm font-sans text-ink dark:text-paper">Alert Notifications</span>
                </div>
                <Badge variant={alertNotifs ? 'success' : 'default'}>
                  {alertNotifs ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Shield size={14} className="text-ink-muted dark:text-ink-faint" />
                  <span className="text-sm font-sans text-ink dark:text-paper">{t('twoFactor') || 'Two-Factor Auth'}</span>
                </div>
                <Badge variant={twoFactor ? 'success' : 'warning'}>
                  {twoFactor ? 'Enabled' : 'Not configured'}
                </Badge>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Globe size={14} className="text-ink-muted dark:text-ink-faint" />
                  <span className="text-sm font-sans text-ink dark:text-paper">{t('preferredLanguage') || 'Preferred Language'}</span>
                </div>
                <span className="text-sm font-sans text-ink-muted dark:text-ink-faint">{preferredLang}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Eye size={14} className="text-ink-muted dark:text-ink-faint" />
                  <span className="text-sm font-sans text-ink dark:text-paper">{t('theme') || 'Theme'}</span>
                </div>
                <span className="text-sm font-sans text-ink-muted dark:text-ink-faint capitalize">{preferredTheme}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <BarChart3 size={14} className="text-ink-muted dark:text-ink-faint" />
                  <span className="text-sm font-sans text-ink dark:text-paper">Total Analyses</span>
                </div>
                <span className="text-sm font-sans text-ink-muted dark:text-ink-faint">{user?.analysisCount?.toLocaleString() || '0'}</span>
              </div>
            </div>

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
