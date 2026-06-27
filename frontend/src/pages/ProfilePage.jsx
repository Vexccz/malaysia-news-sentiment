import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import {
  User, Mail, Calendar, Shield, Edit3, ExternalLink, Bookmark, MessageSquare,
  Share2, TrendingUp, Clock, Settings, Globe, Bell, Eye, BarChart3, FileText,
  Search, MapPin, Award, Activity, ChevronRight, Sparkles, Target, Zap,
  X, Save, Loader2, Camera, Phone
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || '/api/v1';

/* ── Animated Counter ── */
const AnimatedCounter = ({ value, duration = 1200 }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const numValue = typeof value === 'number' ? value : parseInt(value) || 0;

  useEffect(() => {
    if (numValue === 0) { setDisplay(0); return; }
    let start = 0;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(Math.floor(eased * numValue));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [numValue, duration]);

  return <span>{display.toLocaleString()}</span>;
};

/* ── Progress Ring (SVG) ── */
const ProgressRing = ({ percent, size = 48, stroke = 3 }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-[#e5e5e5] dark:text-[#222]"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="butt"
        className="text-accent transition-all duration-1000 ease-out"
      />
    </svg>
  );
};

/* ── Stat Pill ── */
const StatPill = ({ icon, label, value, color }) => (
  <div className="flex flex-col items-center gap-1.5 px-4 py-3 min-w-[100px]">
    <span className={color}>{icon}</span>
    <span className="text-xl font-bold font-display text-ink dark:text-paper leading-none">
      <AnimatedCounter value={value} />
    </span>
    <span className="text-[9px] text-ink-muted dark:text-ink-faint uppercase tracking-[0.15em] font-sans text-center leading-tight">
      {label}
    </span>
  </div>
);

/* ── Timeline Item ── */
const TimelineItem = ({ icon, text, time, color, isLast }) => (
  <div className="flex gap-3 relative">
    {/* Timeline line */}
    <div className="flex flex-col items-center">
      <div className={`w-2.5 h-2.5 rounded-full border-2 border-accent bg-paper dark:bg-[#111] z-10 shrink-0 mt-1.5`} />
      {!isLast && <div className="w-px flex-1 bg-[#e5e5e5] dark:bg-[#222] absolute top-4 left-[5px]" />}
    </div>
    {/* Content */}
    <div className="pb-4 flex-1 min-w-0">
      <p className="text-sm text-ink dark:text-paper font-sans leading-snug">{text}</p>
      <p className="text-[10px] text-ink-faint mt-0.5 font-sans">{time}</p>
    </div>
  </div>
);

/* ── Badge Card (for carousel) ── */
const BadgeCard = ({ badge, isSelected, isEarned, onSelect, saving }) => {
  const progress = badge.progress || 0;
  const target = badge.target || 1;
  const pct = Math.min(Math.round((progress / target) * 100), 100);

  return (
    <button
      onClick={() => isEarned && onSelect(badge.id)}
      disabled={!isEarned || saving || (!isSelected && false)}
      className={`
        flex-shrink-0 w-[140px] p-3 border transition-all text-left font-sans
        ${isEarned
          ? isSelected
            ? 'border-accent bg-accent/5'
            : 'border-[#e5e5e5] dark:border-[#222] hover:border-accent/50 cursor-pointer'
          : 'border-[#e5e5e5] dark:border-[#222] opacity-50 cursor-default'
        }
      `}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-lg ${isEarned ? '' : 'grayscale'}`}>{badge.icon}</span>
        {isSelected && <span className="text-accent text-[9px]">✓</span>}
        {!isEarned && <span className="text-[9px]">🔒</span>}
      </div>
      <p className={`text-[11px] font-semibold truncate ${isEarned ? 'text-ink dark:text-paper' : 'text-ink-muted'}`}>
        {badge.name}
      </p>
      <p className="text-[9px] text-ink-faint mt-0.5 truncate">{badge.description}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-[#e5e5e5] dark:bg-[#222] overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${isEarned ? 'bg-emerald-500' : 'bg-ink-faint'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-[9px] font-mono ${isEarned ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-faint'}`}>
          {progress}/{target}
        </span>
      </div>
    </button>
  );
};

/* ── Quick Action Card ── */
const QuickAction = ({ icon, label, path }) => (
  <Link
    to={path}
    className="flex items-center gap-3 px-4 py-3 border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] no-underline hover:border-accent/50 transition-colors group"
  >
    <span className="text-ink-muted dark:text-ink-faint group-hover:text-accent transition-colors">{icon}</span>
    <span className="text-sm font-sans text-ink dark:text-paper flex-1">{label}</span>
    <ChevronRight size={14} className="text-ink-faint group-hover:text-accent transition-colors" />
  </Link>
);

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [stats, setStats] = useState({ articlesViewed: 0, bookmarks: 0, shared: 0, comments: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState([]);
  const [selectedBadges, setSelectedBadges] = useState([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [savingBadges, setSavingBadges] = useState(false);
  const badgeScrollRef = useRef(null);

  // Inline profile editor state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '', phone: '', avatar: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const avatarFileRef = useRef(null);

  const openEditor = () => {
    setEditForm({
      name: user?.name || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
      avatar: user?.avatar || '',
    });
    setEditError(null);
    setEditOpen(true);
  };

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setEditError('Image too large (max 2 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setEditForm(f => ({ ...f, avatar: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setEditSaving(true);
    setEditError(null);
    try {
      const data = await updateProfile({
        name: editForm.name.trim(),
        bio: editForm.bio.trim(),
        phone: editForm.phone.trim(),
        avatar: editForm.avatar,
      });
      setEditOpen(false);
      return data;
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Failed to save profile.');
    } finally {
      setEditSaving(false);
    }
  };

  const initials = (user?.name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

  const roleLabel = user?.role === 'admin' ? 'Administrator' : 'Member';
  const preferredLang = user?.preferences?.language === 'ms' ? 'Bahasa Malaysia' : 'English';

  // Profile completion
  const completionItems = [
    { done: !!user?.name, label: 'Name' },
    { done: !!user?.email, label: 'Email' },
    { done: !!user?.avatar, label: 'Avatar' },
    { done: user?.preferences?.language !== undefined, label: 'Language' },
    { done: user?.twoFactorEnabled, label: '2FA' },
    { done: (user?.bookmarks?.length || 0) > 0, label: 'Bookmarks' },
  ];
  const completionPercent = Math.round((completionItems.filter(c => c.done).length / completionItems.length) * 100);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [historyRes, bookmarksRes, sharedRes, commentsRes] = await Promise.allSettled([
          api.get('/history?limit=50'),
          api.get('/bookmarks'),
          api.get('/collab/shared'),
          api.get('/collab/discussions'),
        ]);

        const historyData = historyRes.status === 'fulfilled' ? historyRes.value.data : {};
        const historyArr = Array.isArray(historyData) ? historyData : historyData.history || historyData.articles || [];
        const bookmarksArr = bookmarksRes.status === 'fulfilled' ? (Array.isArray(bookmarksRes.value.data) ? bookmarksRes.value.data : bookmarksRes.value.data.bookmarks || []) : [];
        const sharedArr = sharedRes.status === 'fulfilled' ? (Array.isArray(sharedRes.value.data) ? sharedRes.value.data : sharedRes.value.data.articles || []) : [];
        const discussionsArr = commentsRes.status === 'fulfilled' ? (Array.isArray(commentsRes.value.data) ? commentsRes.value.data : commentsRes.value.data.discussions || []) : [];

        setStats({
          articlesViewed: user?.analysisCount || historyArr.length || 0,
          bookmarks: bookmarksArr.length,
          shared: sharedArr.length,
          comments: discussionsArr.length,
        });

        // Build activity timeline
        const activities = [];
        historyArr.slice(0, 3).forEach((item, i) => {
          const sentiment = item.article?.sentiment || item.sentiment || 'neutral';
          const sentimentColors = { positive: 'text-emerald-600', negative: 'text-red-600', neutral: 'text-amber-600' };
          activities.push({
            id: `h-${i}`,
            icon: <Eye size={12} />,
            text: `Viewed "${(item.article?.title || item.title || 'an article').slice(0, 60)}${(item.article?.title || item.title || '').length > 60 ? '...' : ''}" (${sentiment})`,
            time: formatTimeAgo(item.viewedAt || item.createdAt),
            color: sentimentColors[sentiment] || 'text-ink-muted',
          });
        });
        if (sharedArr.length > 0) {
          activities.push({
            id: 'sh',
            icon: <Share2 size={12} />,
            text: `Shared "${(sharedArr[0].title || sharedArr[0].articleTitle || 'an article').slice(0, 50)}..."`,
            time: formatTimeAgo(sharedArr[0].createdAt || sharedArr[0].sharedAt),
            color: 'text-emerald-600',
          });
        }
        if (discussionsArr.length > 0) {
          activities.push({
            id: 'cmt',
            icon: <MessageSquare size={12} />,
            text: `Commented on "${(discussionsArr[0].title || discussionsArr[0].articleTitle || 'a discussion').slice(0, 50)}..."`,
            time: formatTimeAgo(discussionsArr[0].lastCommentAt || discussionsArr[0].createdAt),
            color: 'text-blue-600',
          });
        }
        setRecentActivity(activities.slice(0, 5));
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
      if (!user?.id) return;
      setBadgesLoading(true);
      try {
        const res = await api.get(`/collab/badges/${user.id}`);
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
      if (selectedBadges.length >= 3) return;
      newSelected = [...selectedBadges, badgeId];
    }
    setSelectedBadges(newSelected);
    setSavingBadges(true);
    try {
      await api.put('/auth/badges', { badgeIds: newSelected });
    } catch (err) {
      console.error('Failed to save badges:', err);
      setSelectedBadges(selectedBadges);
    } finally {
      setSavingBadges(false);
    }
  };

  const earnedBadges = badges.filter(b => b.earned);

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8"
      >
        {/* Banner background */}
        <div className="h-32 lg:h-40 bg-gradient-to-br from-ink via-ink/90 to-accent/20 dark:from-[#0a0a0a] dark:via-[#111] dark:to-accent/10 relative overflow-hidden">
          {/* Decorative grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            color: 'white',
          }} />
          {/* Accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
        </div>

        {/* Avatar + Info overlay */}
        <div className="px-5 lg:px-8 -mt-10 relative z-10 flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {/* Avatar */}
          <div className="relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-24 h-24 object-cover border-4 border-paper dark:border-[#111] shadow-lg"
                loading="lazy"
              />
            ) : (
              <div className="w-24 h-24 bg-accent/10 text-accent flex items-center justify-center text-3xl font-bold font-display border-4 border-paper dark:border-[#111] shadow-lg">
                {initials}
              </div>
            )}
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-paper dark:border-[#111] rounded-full" />
          </div>

          {/* Name + Role */}
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-ink dark:text-paper leading-tight">
                {user?.name || 'User'}
              </h1>
              {user?.role === 'admin' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-red-700 text-white font-sans">
                  <Shield size={10} /> Admin
                </span>
              )}
            </div>
            <p className="text-sm text-ink-muted dark:text-ink-faint font-sans mt-0.5">{user?.email || ''}</p>
            {/* Selected badges */}
            {selectedBadges.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {selectedBadges.map(id => {
                  const badge = badges.find(b => b.id === id);
                  if (!badge) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-sans bg-accent/10 text-accent border border-accent/20"
                    >
                      {badge.icon} {badge.name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Profile completion ring + Edit button */}
          <div className="flex items-center gap-4 pb-1">
            <div className="flex items-center gap-2" title={`${completionPercent}% complete`}>
              <div className="relative">
                <ProgressRing percent={completionPercent} size={44} stroke={3} />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold font-sans text-ink dark:text-paper">
                  {completionPercent}%
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-[9px] text-ink-faint uppercase tracking-wider font-sans">Profile</p>
                <p className="text-[9px] text-ink-faint font-sans">Complete</p>
              </div>
            </div>
            <button
              onClick={openEditor}
              className="flex items-center gap-2 px-4 py-2 border border-[#e5e5e5] dark:border-[#222] text-sm font-sans text-ink dark:text-paper hover:border-accent hover:text-accent transition-colors"
            >
              <Edit3 size={14} />
              <span className="hidden sm:inline">{t('editProfile', 'Edit')}</span>
            </button>
          </div>
        </div>

        {/* Info pills row */}
        <div className="px-5 lg:px-8 mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-ink-muted dark:text-ink-faint font-sans">
          <span className="flex items-center gap-1"><Mail size={11} /> {user?.email || 'N/A'}</span>
          <span className="flex items-center gap-1"><Shield size={11} /> {roleLabel}</span>
          <span className="flex items-center gap-1"><Calendar size={11} /> {t('memberSince', 'Member since')} {memberSince}</span>
          <span className="flex items-center gap-1"><Globe size={11} /> {preferredLang}</span>
        </div>
      </motion.div>

      {/* ── Stats Horizontal Strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] mb-6 overflow-x-auto"
      >
        <div className="flex divide-x divide-[#e5e5e5] dark:divide-[#222] min-w-max">
          <StatPill icon={<Eye size={16} />} label={t('articlesViewed', 'Articles')} value={loading ? 0 : stats.articlesViewed} color="text-ink-muted" />
          <StatPill icon={<Bookmark size={16} />} label={t('bookmarks', 'Bookmarks')} value={loading ? 0 : stats.bookmarks} color="text-accent" />
          <StatPill icon={<Share2 size={16} />} label={t('shared', 'Shared')} value={loading ? 0 : stats.shared} color="text-emerald-600" />
          <StatPill icon={<MessageSquare size={16} />} label={t('comments', 'Comments')} value={loading ? 0 : stats.comments} color="text-blue-600" />
          <StatPill icon={<Award size={16} />} label={t('badges', 'Badges')} value={earnedBadges.length} color="text-amber-600" />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 space-y-4"
        >
          {/* Quick Actions */}
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
            <div className="px-4 py-2.5 border-b border-[#e5e5e5] dark:border-[#222] flex items-center gap-2">
              <Zap size={12} className="text-ink-muted" />
              <h2 className="text-[10px] font-semibold text-ink dark:text-paper uppercase tracking-[0.2em] font-sans">
                {t('quickLinks', 'Quick Actions')}
              </h2>
            </div>
            <div className="p-2 space-y-1">
              <QuickAction icon={<Settings size={14} />} label={t('settings', 'Settings')} path="/settings" />
              <QuickAction icon={<Bookmark size={14} />} label={t('bookmarks', 'Bookmarks')} path="/bookmarks" />
              <QuickAction icon={<Clock size={14} />} label={t('history', 'History')} path="/history" />
              <QuickAction icon={<FileText size={14} />} label={t('reports', 'Reports')} path="/reports" />
              <QuickAction icon={<Search size={14} />} label={t('search', 'Search')} path="/search" />
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
            <div className="px-4 py-2.5 border-b border-[#e5e5e5] dark:border-[#222] flex items-center gap-2">
              <Activity size={12} className="text-ink-muted" />
              <h2 className="text-[10px] font-semibold text-ink dark:text-paper uppercase tracking-[0.2em] font-sans">
                {t('recentActivity', 'Activity')}
              </h2>
            </div>
            <div className="p-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((item, i) => (
                  <TimelineItem
                    key={item.id}
                    icon={item.icon}
                    text={item.text}
                    time={item.time}
                    color={item.color}
                    isLast={i === recentActivity.length - 1}
                  />
                ))
              ) : (
                <div className="text-center py-6">
                  <Activity size={20} className="mx-auto text-ink-faint mb-2" />
                  <p className="text-xs text-ink-muted font-sans">
                    {t('noActivity', 'No recent activity')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT COLUMN (span 2) ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Badges Carousel */}
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
            <div className="px-4 py-2.5 border-b border-[#e5e5e5] dark:border-[#222] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={12} className="text-ink-muted" />
                <h2 className="text-[10px] font-semibold text-ink dark:text-paper uppercase tracking-[0.2em] font-sans">
                  {t('myBadges', 'My Badges')}
                </h2>
                <span className="text-[9px] text-ink-faint font-sans">
                  ({earnedBadges.length}/{badges.length})
                </span>
              </div>
              {selectedBadges.length > 0 && (
                <span className="text-[9px] text-accent font-sans">
                  {selectedBadges.length}/3 {t('selected', 'selected')}
                </span>
              )}
            </div>
            <div className="p-4">
              {badgesLoading ? (
                <p className="text-xs text-ink-muted font-sans">{t('loading', 'Loading...')}</p>
              ) : badges.length === 0 ? (
                <p className="text-xs text-ink-muted font-sans text-center py-4">
                  {t('noBadges', 'No badges yet. Start commenting!')}
                </p>
              ) : (
                <div
                  ref={badgeScrollRef}
                  className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#e5e5e5] dark:scrollbar-thumb-[#333]"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {badges.map(badge => (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      isSelected={selectedBadges.includes(badge.id)}
                      isEarned={badge.earned}
                      onSelect={handleBadgeToggle}
                      saving={savingBadges}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Community Activity Section */}
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
            <div className="px-4 py-2.5 border-b border-[#e5e5e5] dark:border-[#222] flex items-center gap-2">
              <Sparkles size={12} className="text-ink-muted" />
              <h2 className="text-[10px] font-semibold text-ink dark:text-paper uppercase tracking-[0.2em] font-sans">
                {t('community', 'Community')}
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/community"
                  className="flex items-center gap-3 p-3 border border-[#e5e5e5] dark:border-[#222] no-underline hover:border-accent/50 transition-colors group"
                >
                  <MessageSquare size={18} className="text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-ink dark:text-paper font-sans">{t('discussions', 'Discussions')}</p>
                    <p className="text-[10px] text-ink-faint font-sans">{stats.comments} {t('comments', 'comments')}</p>
                  </div>
                </Link>
                <Link
                  to="/bookmarks"
                  className="flex items-center gap-3 p-3 border border-[#e5e5e5] dark:border-[#222] no-underline hover:border-accent/50 transition-colors group"
                >
                  <Bookmark size={18} className="text-accent" />
                  <div>
                    <p className="text-sm font-semibold text-ink dark:text-paper font-sans">{t('bookmarks', 'Bookmarks')}</p>
                    <p className="text-[10px] text-ink-faint font-sans">{stats.bookmarks} {t('saved', 'saved')}</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {editOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => !editSaving && setEditOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-white dark:bg-[#0f0f0f] border border-[#e5e5e5] dark:border-[#222] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-ink-faint font-sans">Profile</p>
                  <h2 className="text-xl font-display text-ink dark:text-paper">Edit profile</h2>
                </div>
                <button
                  aria-label="Close profile editor"
                  onClick={() => !editSaving && setEditOpen(false)}
                  className="p-2 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-0">
                <div className="p-5 border-b lg:border-b-0 lg:border-r border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#0a0a0a]">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-ink-faint font-sans mb-3">Avatar</p>
                  <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#111] dark:border-[#f5f3ee] bg-[#f3f0ea] dark:bg-[#151515] mx-auto">
                    {editForm.avatar ? (
                      <img src={editForm.avatar} alt="Profile avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-display text-ink dark:text-paper">{initials}</div>
                    )}
                  </div>
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarPick}
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 border border-[#e5e5e5] dark:border-[#222] text-sm text-ink dark:text-paper hover:border-accent hover:text-accent transition-colors"
                  >
                    <Camera size={14} />
                    Change image
                  </button>
                  <p className="mt-2 text-[11px] text-ink-faint font-sans text-center">PNG/JPG, max 2 MB</p>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.22em] text-ink-faint font-sans mb-2">Display name</label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.22em] text-ink-faint font-sans mb-2">Phone</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                      <input
                        value={editForm.phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2.5 border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors"
                        placeholder="Optional phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.22em] text-ink-faint font-sans mb-2">Bio</label>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value.slice(0, 280) }))}
                      rows={5}
                      className="w-full px-3 py-2.5 border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors resize-none"
                      placeholder="Short intro about you"
                    />
                    <div className="mt-1 text-right text-[11px] text-ink-faint font-sans">{editForm.bio.length}/280</div>
                  </div>

                  {editError && (
                    <div className="px-3 py-2 border border-red-200 bg-red-50 text-red-700 text-sm font-sans dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                      {editError}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#0a0a0a]">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={editSaving}
                  className="px-4 py-2 text-sm border border-[#e5e5e5] dark:border-[#222] text-ink dark:text-paper hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={editSaving}
                  className="px-4 py-2 text-sm bg-[#111] text-white dark:bg-[#f5f3ee] dark:text-[#111] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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

export default ProfilePage;
