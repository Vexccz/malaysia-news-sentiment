import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api, { getAdminStats, getAdminUsers, updateUserRole, deleteUser, updateUserStatus } from '../services/api';
import toast from 'react-hot-toast';
import ScrollToTop from '../components/ScrollToTop';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { StatStripSkeleton, PageHeaderSkeleton, CardSkeleton } from '../components/Skeletons';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const socket = useSocket();

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSortField, setUserSortField] = useState('createdAt');
  const [userSortOrder, setUserSortOrder] = useState('desc');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersPage, setAdminUsersPage] = useState(1);
  const [adminUsersTotal, setAdminUsersTotal] = useState(0);
  const [adminUsersTotalPages, setAdminUsersTotalPages] = useState(0);
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  // Admin search tab
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [processingUserId, setProcessingUserId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const statsData = await getAdminStats();
      setStats(statsData);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadAdminUsers = useCallback(async () => {
    setAdminUsersLoading(true);
    try {
      const params = {
        page: adminUsersPage,
        limit: 10,
        sortBy: userSortField,
        sortOrder: userSortOrder,
      };
      if (userSearchQuery.trim()) params.search = userSearchQuery.trim();
      if (userRoleFilter !== 'all') params.role = userRoleFilter;
      const data = await getAdminUsers(params);
      setAdminUsers(data.users || []);
      setAdminUsersTotal(data.total || 0);
      setAdminUsersTotalPages(data.totalPages || 0);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setAdminUsersLoading(false);
    }
  }, [adminUsersPage, userSortField, userSortOrder, userSearchQuery, userRoleFilter]);

  useEffect(() => {
    if (activeTab === 'users') loadAdminUsers();
  }, [activeTab, loadAdminUsers]);

  const handleSort = (field) => {
    if (userSortField === field) setUserSortOrder(userSortOrder === 'asc' ? 'desc' : 'asc');
    else { setUserSortField(field); setUserSortOrder('asc'); }
    setAdminUsersPage(1);
  };

  const handleRoleChange = async (userId, newRole) => {
    setProcessingUserId(userId);
    try {
      await updateUserRole(userId, newRole);
      toast.success(`Role updated to ${newRole}`);
      loadAdminUsers();
    } catch {
      toast.error('Failed to update role');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleToggleStatus = async (userId, currentActive) => {
    setProcessingUserId(userId);
    try {
      await updateUserStatus(userId, !currentActive);
      toast.success(`User ${currentActive ? 'disabled' : 'enabled'}`);
      loadAdminUsers();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    setProcessingUserId(userId);
    try {
      await deleteUser(userId);
      toast.success('User deleted');
      setDeleteConfirmUserId(null);
      loadAdminUsers();
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setProcessingUserId(null);
    }
  };

  const SortIcon = ({ field }) => {
    if (userSortField !== field) return <span className="text-[10px] opacity-30">↕</span>;
    return <span className="text-[10px]">{userSortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api/v1';
      const res = await fetch(`${API}/admin/metrics`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMetrics(await res.json());
      else setMetrics({ totalCalls: 0, methods: {}, statusCodes: {}, avgResponseTime: 0, topEndpoints: [], errors: 0, errorRate: '0', uptime: '0h 0m', startedAt: new Date().toISOString(), requestsPerMinute: '0', hourlyDistribution: {} });
    } catch { setMetrics({ totalCalls: 0, methods: {}, statusCodes: {}, avgResponseTime: 0, topEndpoints: [], errors: 0, errorRate: '0', uptime: '0h 0m', startedAt: new Date().toISOString(), requestsPerMinute: '0', hourlyDistribution: {} }); }
    finally { setMetricsLoading(false); }
  };

  const loadInsights = async () => {
    setInsightsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api/v1';
      const res = await fetch(`${API}/news/admin/insights`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setInsights(await res.json());
      else setInsights({ risk: 'Could not load insights', opportunity: 'Try again later' });
    } catch { setInsights({ risk: 'Connection error', opportunity: 'Check if backend is running' }); }
    finally { setInsightsLoading(false); }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api.get('/analytics/advanced');
      setAnalytics(res.data?.data || res.data);
    } catch (err) {
      console.error('Analytics fetch failed:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await api.get('/admin/health');
      setHealth(res.data);
    } catch (err) {
      console.error('Health fetch failed:', err);
    } finally {
      setHealthLoading(false);
    }
  };

  const performAdminSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults({ users: [], articles: [], comments: [], q });
      return;
    }
    setSearchLoading(true);
    try {
      const res = await api.get('/admin/search', { params: { q } });
      setSearchResults(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Search failed');
      setSearchResults({ users: [], articles: [], comments: [], q });
    } finally {
      setSearchLoading(false);
    }
  };

  const triggerImpactRecompute = async () => {
    const t = toast.loading('Recomputing impact scores...');
    try {
      const res = await api.post('/admin/recompute-impact');
      toast.success(
        `Impact recompute done. ${res.data?.updated || 0} articles in ${res.data?.durationMs || 0}ms.`,
        { id: t }
      );
      loadHealth();
    } catch (err) {
      toast.error('Recompute failed: ' + err.message, { id: t });
    }
  };

  const CARD = 'bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222]';


  useEffect(() => {
    if (!socket) return;
    socket.on('user_activity', (data) => {
      setStats(prev => {
        if (!prev) return prev;
        const updatedUsers = prev.recentUsers.map(u => u._id === data.userId ? { ...u, analysisCount: data.analysisCount } : u);
        return { ...prev, recentUsers: updatedUsers };
      });
    });
    socket.on('system_stats_updated', (data) => {
      setStats(prev => prev ? { ...prev, overview: { ...prev.overview, totalArticles: prev.overview.totalArticles + (data.count || 0), totalUnique: prev.overview.totalUnique + (data.count || 0) } } : prev);
    });
  return () => { socket.off('user_activity'); socket.off('system_stats_updated'); };
  }, [socket]);

  if (loading) {
    return (
      <div>
        <PageHeaderSkeleton />
        <div className="mb-6">
          <StatStripSkeleton count={5} />
        </div>
        <CardSkeleton count={6} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-base font-semibold text-ink dark:text-paper font-display">Dashboard Unavailable</h2>
        <button onClick={() => window.location.reload()} className="mt-4 px-5 py-2.5 bg-ink text-paper text-xs font-semibold uppercase tracking-wider hover:bg-accent transition-colors font-sans">
          Retry
        </button>
      </div>
    );
  }

  const totalUnique = stats.overview?.totalUnique || 1;
  const sentimentData = stats.sentiment || { Positive: 0, Negative: 0, Neutral: 0 };
  const totalSentiment = sentimentData.Positive + sentimentData.Negative + sentimentData.Neutral || 1;

  const TABS = ['overview', 'users', 'content', 'search', 'api', 'insights', 'analytics', 'health'];

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-['Playfair_Display'] text-2xl font-black text-ink dark:text-paper tracking-tight uppercase">
            Admin Dashboard
          </h1>
          <p className="text-[10px] text-ink-muted dark:text-ink-faint mt-1 uppercase tracking-[0.2em]">
            System overview and analytics management
          </p>
          <div className="border-b border-[#e5e5e5] dark:border-[#222] mt-2 mb-3" />
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-green-700 dark:text-green-400 font-sans">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-600" />
            All Systems Online
          </span>
          <button onClick={loadData} className="text-xs font-medium uppercase tracking-wider text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-colors font-sans">
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs — editorial style */}
      <div className="flex items-center gap-0 mb-6 flex-wrap">
        {TABS.map((tab, i) => (
          <React.Fragment key={tab}>
            {i > 0 && <span className="text-ink-faint mx-1.5">|</span>}
            <button
              className={`text-xs font-medium uppercase tracking-wider transition-colors font-sans px-1 capitalize ${
                activeTab === tab ? 'text-ink dark:text-paper font-bold' : 'text-ink-faint hover:text-ink-muted'
              }`}
              onClick={() => { setActiveTab(tab); if (tab === 'insights' && !insights) loadInsights(); if (tab === 'api') loadMetrics(); if (tab === 'analytics' && !analytics) loadAnalytics(); if (tab === 'health') loadHealth(); }}
            >
              {tab === 'api' ? 'API Metrics' : tab}
            </button>
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {/* Stats — newspaper stat bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-[#e5e5e5] dark:divide-[#222] border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] mb-6">
              {[
                { label: 'Total Articles', value: stats.overview.totalUnique.toLocaleString(), sub: 'In database' },
                { label: 'Analyses Run', value: stats.overview.totalArticles.toLocaleString(), sub: 'Total processed' },
                { label: 'Registered Users', value: stats.overview.totalUsers, sub: 'Active accounts' },
                { label: 'Total Views', value: (stats.overview.totalViews || 0).toLocaleString(), sub: 'Article views' },
              ].map(card => (
                <div key={card.label} className="px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-1 font-sans">{card.label}</div>
                  <div className="text-xl font-bold text-ink dark:text-paper font-display">{card.value}</div>
                  <div className="text-[10px] text-ink-faint font-sans mt-0.5">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Sentiment + Sources */}
            <div className="grid md:grid-cols-2 gap-0 mb-6">
              {/* Sentiment */}
              <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
                <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
                  <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">Sentiment Distribution</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {[
                    { label: 'Positive', color: '#16a34a', count: sentimentData.Positive },
                    { label: 'Neutral', color: '#ca8a04', count: sentimentData.Neutral },
                    { label: 'Negative', color: '#dc2626', count: sentimentData.Negative },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="text-[11px] text-ink-muted dark:text-ink-faint w-16 font-medium font-sans">{s.label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full transition-all duration-700" style={{ width: `${(s.count / totalSentiment * 100)}%`, background: s.color }} />
                      </div>
                      <span className="text-[11px] font-bold text-ink dark:text-paper w-8 text-right font-sans">{Math.round(s.count / totalSentiment * 100)}%</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-paper-line dark:divide-paper-dark-line border-t border-paper-line dark:border-paper-dark-line">
                  {[
                    { label: 'Positive', count: sentimentData.Positive },
                    { label: 'Neutral', count: sentimentData.Neutral },
                    { label: 'Negative', count: sentimentData.Negative },
                  ].map(s => (
                    <div key={s.label} className="text-center px-3 py-3">
                      <div className="text-lg font-bold text-ink dark:text-paper font-display">{s.count}</div>
                      <div className="text-[9px] font-semibold text-ink-faint uppercase tracking-wider font-sans">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Sources */}
              <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] border-l-0 md:border-l-0">
                <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
                  <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">Top Sources</h3>
                </div>
                <div className="divide-y divide-paper-line dark:divide-paper-dark-line">
                  {stats.topSources?.length > 0 ? stats.topSources.map((s, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-bold text-ink-faint w-5 font-sans">#{i + 1}</span>
                        <span className="text-xs font-semibold text-ink dark:text-paper font-sans">{s.source || 'Unknown'}</span>
                      </div>
                      <span className="text-[11px] font-bold text-ink-muted dark:text-ink-faint font-sans">{s.count}</span>
                    </div>
                  )) : <p className="px-5 py-4 text-xs text-ink-faint font-sans">No source data available</p>}
                </div>
              </div>
            </div>

            {/* Topics + Recent Articles */}
            <div className="grid md:grid-cols-2 gap-0 mb-6">
              {/* Topics */}
              <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
                <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
                  <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">{t('popularTopics')}</h3>
                </div>
                <div className="px-5 py-4">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {stats.popularTopics?.length > 0 ? stats.popularTopics.map((t, i) => (
                      <span key={i} className="text-xs text-ink-muted dark:text-ink-faint font-sans">
                        {t.topic || 'General'} <span className="font-bold text-ink dark:text-paper">{t.count}</span>
                        {i < stats.popularTopics.length - 1 && <span className="text-ink-faint ml-3">·</span>}
                      </span>
                    )) : <p className="text-xs text-ink-faint font-sans">No topic data</p>}
                  </div>
                </div>
              </div>

              {/* Recent Articles */}
              <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] border-l-0 md:border-l-0">
                <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
                  <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">{t('recentArticles')}</h3>
                </div>
                <div className="divide-y divide-paper-line dark:divide-paper-dark-line">
                  {stats.recentArticles?.slice(0, 5).map((a, i) => (
                    <div key={i} className="px-5 py-3">
                      <div className="text-xs font-medium text-ink dark:text-paper leading-snug line-clamp-2 font-sans">
                        {a.title?.slice(0, 70)}{a.title?.length > 70 ? '...' : ''}
                      </div>
                      <div className="flex gap-2 mt-1 text-[10px] font-sans">
                        <span className="font-bold" style={{ color: a.sentiment === 'Positive' ? '#16a34a' : a.sentiment === 'Negative' ? '#dc2626' : '#ca8a04' }}>{a.sentiment}</span>
                        <span className="text-ink-faint">{a.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            {stats.activityTimeline?.length > 0 && (() => {
              const chartData = Array.from({ length: 24 }, (_, h) => {
                const entry = stats.activityTimeline.find(a => a._id === h);
                return {
                  hour: `${String(h).padStart(2, '0')}:00`,
                  activities: entry?.count || 0,
                };
              });
              return (
                <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] mb-6">
                  <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
                    <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">Activity by Hour</h3>
                    <p className="text-[11px] text-ink-faint mt-0.5 font-sans">Article analyses and user interactions over 24 hours</p>
                  </div>
                  <div className="px-4 py-4">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="2 4" stroke="#E8E4DB" opacity={0.5} vertical={false} />
                          <XAxis
                            dataKey="hour"
                            tick={{ fontSize: 9, fill: '#A8A59E', fontFamily: 'Inter' }}
                            tickFormatter={(val) => val.replace(':00', '')}
                            axisLine={{ stroke: '#E8E4DB' }}
                            tickLine={false}
                            interval={2}
                          />
                          <YAxis
                            tick={{ fontSize: 9, fill: '#A8A59E', fontFamily: 'Inter' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: '#FFFFFF',
                              border: '1px solid #E8E4DB',
                              borderRadius: '0',
                              fontSize: '11px',
                              fontFamily: 'Inter',
                              boxShadow: 'none',
                            }}
                            formatter={(value) => [`${value} activities`, 'Count']}
                            labelFormatter={(val) => val}
                          />
                          <Bar
                            dataKey="activities"
                            fill="#1A1A1A"
                            opacity={0.5}
                            radius={[1, 1, 0, 0]}
                            isAnimationActive={true}
                            animationDuration={1500}
                            animationEasing="ease-out"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
              <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">{t('userManagement')}</h3>
                  <span className="text-[10px] font-bold text-ink-faint font-sans">{adminUsersTotal} Total · Page {adminUsersPage} of {adminUsersTotalPages || 1}</span>
                </div>
              </div>

              {/* Filters */}
              <div className="px-5 py-3 border-b border-[#e5e5e5] dark:border-[#222] flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => { setUserSearchQuery(e.target.value); setAdminUsersPage(1); }}
                    className="w-full px-3 py-2 text-xs border-2 border-ink dark:border-paper bg-paper dark:bg-paper-dark text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors font-sans"
                  />
                </div>
                <div className="flex gap-0">
                  {['all', 'admin', 'user'].map((role, i) => (
                    <React.Fragment key={role}>
                      {i > 0 && <span className="text-ink-faint mx-1.5">|</span>}
                      <button
                        onClick={() => { setUserRoleFilter(role); setAdminUsersPage(1); }}
                        className={`text-[11px] font-medium uppercase tracking-wider transition-colors font-sans px-1 ${
                          userRoleFilter === role ? 'text-ink dark:text-paper font-bold' : 'text-ink-faint hover:text-ink-muted'
                        }`}
                      >
                        {role === 'all' ? 'All Roles' : role}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                {(userSearchQuery || userRoleFilter !== 'all') && (
                  <button onClick={() => { setUserSearchQuery(''); setUserRoleFilter('all'); setAdminUsersPage(1); }} className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider font-sans">
                    Clear
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e5e5e5] dark:border-[#222]">
                      {[
                        { label: 'User', field: 'name' },
                        { label: 'Email', field: 'email' },
                        { label: 'Role', field: 'role' },
                        { label: 'Analyses', field: 'analysisCount' },
                        { label: 'Status', field: 'isActive' },
                        { label: 'Joined', field: 'createdAt' },
                      ].map(col => (
                        <th key={col.field} onClick={() => handleSort(col.field)} className="text-left py-3 px-5 text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-wider cursor-pointer hover:text-ink dark:hover:text-paper transition-colors font-sans">
                          <div className="flex items-center gap-1.5">{col.label} <SortIcon field={col.field} /></div>
                        </th>
                      ))}
                      <th className="text-right py-3 px-5 text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-wider font-sans">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-line dark:divide-paper-dark-line">
                    {adminUsersLoading ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center">
                          <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-xs text-ink-faint font-sans uppercase tracking-wider">Loading users</p>
                        </td>
                      </tr>
                    ) : adminUsers.length > 0 ? adminUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-paper/50 dark:hover:bg-paper-dark/50 transition-colors">
                        <td className="py-3 px-5">
                          <span className="text-xs font-semibold text-ink dark:text-paper font-sans">{u.name}</span>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-[11px] text-ink-muted dark:text-ink-faint font-sans">{u.email}</span>
                        </td>
                        <td className="py-3 px-5">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            disabled={processingUserId === u._id}
                            className={`text-[10px] font-bold uppercase tracking-wider font-sans bg-transparent border border-ink/10 dark:border-paper/10 px-2 py-1 cursor-pointer focus:outline-none ${
                              u.role === 'admin' ? 'text-red-700 dark:text-red-400' : 'text-ink-muted dark:text-ink-faint'
                            }`}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-xs font-bold text-ink dark:text-paper font-sans">{u.analysisCount || 0}</span>
                        </td>
                        <td className="py-3 px-5">
                          <button
                            onClick={() => handleToggleStatus(u._id, u.isActive !== false)}
                            disabled={processingUserId === u._id}
                            className={`text-[10px] font-bold uppercase tracking-wider font-sans border border-ink dark:border-paper px-2 py-0.5 transition-colors ${
                              u.isActive !== false
                                ? 'text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                                : 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                          >
                            {u.isActive !== false ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-[11px] text-ink-muted dark:text-ink-faint font-sans">
                            {new Date(u.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          {deleteConfirmUserId === u._id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDeleteUser(u._id)}
                                disabled={processingUserId === u._id}
                                className="text-[10px] font-bold text-paper bg-red-700 dark:bg-red-600 px-2 py-1 uppercase tracking-wider font-sans hover:bg-red-800 dark:hover:bg-red-700 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmUserId(null)}
                                className="text-[10px] font-bold text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper uppercase tracking-wider font-sans"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmUserId(u._id)}
                              disabled={processingUserId === u._id}
                              className="text-[10px] font-bold text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 uppercase tracking-wider font-sans transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" className="py-12 text-center">
                          <p className="text-xs text-ink-faint font-sans">No users found matching your filters</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {adminUsersTotal > 0 && (
                <div className="px-5 py-3 border-t border-paper-line dark:border-paper-dark-line flex items-center justify-between">
                  <span className="text-[10px] text-ink-faint font-sans">
                    Showing {((adminUsersPage - 1) * 10) + 1}–{Math.min(adminUsersPage * 10, adminUsersTotal)} of {adminUsersTotal}
                  </span>
                  <div className="flex items-center gap-0">
                    <button
                      onClick={() => setAdminUsersPage(p => Math.max(1, p - 1))}
                      disabled={adminUsersPage <= 1 || adminUsersLoading}
                      className={`text-[10px] font-bold uppercase tracking-wider font-sans px-3 py-1.5 border border-ink dark:border-paper transition-colors ${
                        adminUsersPage <= 1 ? 'text-ink-faint opacity-40 cursor-not-allowed' : 'text-ink dark:text-paper hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink'
                      }`}
                    >
                      Prev
                    </button>
                    <span className="text-[10px] text-ink-muted dark:text-ink-faint font-sans px-3">
                      {adminUsersPage} / {adminUsersTotalPages || 1}
                    </span>
                    <button
                      onClick={() => setAdminUsersPage(p => Math.min(adminUsersTotalPages, p + 1))}
                      disabled={adminUsersPage >= adminUsersTotalPages || adminUsersLoading}
                      className={`text-[10px] font-bold uppercase tracking-wider font-sans px-3 py-1.5 border border-ink dark:border-paper transition-colors ${
                        adminUsersPage >= adminUsersTotalPages ? 'text-ink-faint opacity-40 cursor-not-allowed' : 'text-ink dark:text-paper hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'content' && (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="grid md:grid-cols-2 gap-0">
              <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
                <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
                  <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">High Impact Articles</h3>
                </div>
                <div className="divide-y divide-paper-line dark:divide-paper-dark-line">
                  {stats.topImpactArticles?.length > 0 ? stats.topImpactArticles.map((a, i) => (
                    <div key={i} className="px-5 py-3">
                      <div className="text-xs font-medium text-ink dark:text-paper leading-snug line-clamp-2 font-sans">
                        {a.title?.slice(0, 80)}{a.title?.length > 80 ? '...' : ''}
                      </div>
                      <div className="flex gap-2 mt-1 text-[10px] font-sans">
                        <span className="font-bold" style={{ color: a.sentiment === 'Positive' ? '#16a34a' : a.sentiment === 'Negative' ? '#dc2626' : '#ca8a04' }}>{a.sentiment}</span>
                        <span className="text-ink-faint">{a.source}</span>
                        {a.impactScore && <span className="font-bold text-ink-muted">Impact: {a.impactScore}</span>}
                      </div>
                    </div>
                  )) : <p className="px-5 py-4 text-xs text-ink-faint font-sans">No impact data available</p>}
                </div>
              </div>

              <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] border-l-0 md:border-l-0">
                <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
                  <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">Source Distribution</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {stats.topSources?.map((s, i) => {
                    const maxSource = stats.topSources[0]?.count || 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-[11px] text-ink-muted dark:text-ink-faint w-24 font-medium truncate font-sans">{s.source || 'Unknown'}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          <div className="h-full bg-ink dark:bg-paper opacity-40" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-ink dark:text-paper w-8 text-right font-sans">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'api' && (
          <motion.div key="api" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {metricsLoading || !metrics ? (
              <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] py-10 text-center">
                <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-ink-faint font-sans uppercase tracking-wider">Loading metrics</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-[#e5e5e5] dark:divide-[#222] border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] mb-6">
                  {[
                    { label: 'Total API Calls', value: metrics.totalCalls.toLocaleString(), sub: `${metrics.requestsPerMinute} req/min` },
                    { label: 'Avg Response', value: `${metrics.avgResponseTime}ms`, sub: 'Server latency' },
                    { label: 'Error Rate', value: `${metrics.errorRate}%`, sub: `${metrics.errors} total errors` },
                    { label: 'Uptime', value: metrics.uptime, sub: `Since ${new Date(metrics.startedAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}` },
                  ].map(card => (
                    <div key={card.label} className="px-4 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-1 font-sans">{card.label}</div>
                      <div className="text-xl font-bold text-ink dark:text-paper font-display">{card.value}</div>
                      <div className="text-[10px] text-ink-faint font-sans mt-0.5">{card.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-0">
                  <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
                    <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
                      <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">HTTP Methods</h3>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      {Object.entries(metrics.methods).filter(([_, v]) => v > 0).map(([method, count]) => {
                        const maxMethod = Math.max(...Object.values(metrics.methods));
                        return (
                          <div key={method} className="flex items-center gap-3">
                            <span className="text-[11px] font-mono font-bold w-12 text-ink dark:text-paper">{method}</span>
                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                              <div className="h-full bg-ink dark:bg-paper opacity-40" style={{ width: `${(count / maxMethod) * 100}%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-ink dark:text-paper w-8 text-right font-sans">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-5 py-4 border-t border-paper-line dark:border-paper-dark-line">
                      <h3 className="text-[10px] font-semibold text-ink-muted dark:text-ink-faint uppercase tracking-wider mb-2 font-sans">Status Codes</h3>
                      <div className="divide-y divide-paper-line dark:divide-paper-dark-line">
                        {Object.entries(metrics.statusCodes).sort((a, b) => b[1] - a[1]).map(([code, count]) => (
                          <div key={code} className="flex justify-between items-center py-1.5">
                            <span className="text-xs font-mono font-bold text-ink dark:text-paper">{code}</span>
                            <span className="text-[11px] text-ink-muted dark:text-ink-faint font-sans">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] border-l-0 md:border-l-0">
                    <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
                      <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">Top Endpoints</h3>
                    </div>
                    <div className="divide-y divide-paper-line dark:divide-paper-dark-line">
                      {metrics.topEndpoints.map((ep, i) => (
                        <div key={i} className="flex justify-between items-center px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-ink-faint w-5 font-sans">#{i + 1}</span>
                            <code className="text-[11px] text-ink dark:text-paper font-sans">{ep.endpoint}</code>
                          </div>
                          <span className="text-[11px] font-bold text-ink-muted dark:text-ink-faint font-sans">{ep.count}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right mt-4">
                  <button onClick={loadMetrics} className="text-xs font-medium uppercase tracking-wider text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-colors font-sans">
                    Refresh Metrics
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'insights' && (
          <motion.div key="insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
              <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
                <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">{t('strategicInsights')}</h3>
              </div>
              {insightsLoading ? (
                <div className="py-10 text-center">
                  <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-ink-faint font-sans uppercase tracking-wider">Generating insights</p>
                </div>
              ) : insights ? (
                <div className="divide-y divide-paper-line dark:divide-paper-dark-line">
                  <div className="px-5 py-4 border-l-3 border-red-600">
                    <div className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-widest mb-1.5 font-sans">{t('riskAssessment')}</div>
                    <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">{insights.risk}</p>
                  </div>
                  <div className="px-5 py-4 border-l-3 border-green-600">
                    <div className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-widest mb-1.5 font-sans">{t('opportunity')}</div>
                    <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">{insights.opportunity}</p>
                  </div>
                  {insights.trend && (
                    <div className="px-5 py-3 flex items-center gap-3">
                      <span className={`text-[10px] font-bold uppercase tracking-widest font-sans ${
                        insights.trend === 'Improving' ? 'text-green-600' :
                        insights.trend === 'Declining' ? 'text-red-600' :
                        insights.trend === 'Slightly Declining' ? 'text-amber-600' :
                        'text-ink-muted'
                      }`}>Trend: {insights.trend}</span>
                    </div>
                  )}
                  <div className="px-5 py-3">
                    <button onClick={loadInsights} className="text-xs font-medium uppercase tracking-wider text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-colors font-sans">
                      Regenerate Insights
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs text-ink-faint mb-3 font-sans">Data-driven insights from article sentiment analysis</p>
                  <button onClick={loadInsights} className="px-5 py-2.5 bg-ink text-paper text-xs font-semibold uppercase tracking-wider hover:bg-accent transition-colors font-sans">
                    Generate Insights
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {analyticsLoading ? (
              <div className="py-10 text-center">
                <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-ink-faint font-sans uppercase tracking-wider">Loading analytics</p>
              </div>
            ) : analytics ? (
              <div className="space-y-5">
                {/* Sentiment Overview */}
                {(() => {
                  const bias = analytics.sourceBias || [];
                  const overview = bias.reduce((acc, src) => {
                    acc.Positive = (acc.Positive || 0) + (src.positive || 0);
                    acc.Negative = (acc.Negative || 0) + (src.negative || 0);
                    acc.Neutral = (acc.Neutral || 0) + (src.neutral || 0);
                    return acc;
                  }, {});
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Positive', count: overview.Positive || 0, color: 'text-green-700 dark:text-green-400' },
                        { label: 'Negative', count: overview.Negative || 0, color: 'text-red-700 dark:text-red-400' },
                        { label: 'Neutral',  count: overview.Neutral || 0,  color: 'text-gray-600 dark:text-gray-400' },
                      ].map(item => (
                        <div key={item.label} className={`${CARD} p-4 text-center`}>
                          <div className={`text-2xl font-bold font-display ${item.color}`}>{item.count}</div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-muted mt-1 font-semibold">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Top Keywords */}
                {(() => {
                  const keywords = analytics.wordTrends?.words || [];
                  const timeData = analytics.wordTrends?.data || [];
                  const wordFreqs = keywords.map(w => ({
                    word: w,
                    total: timeData.reduce((sum, d) => sum + (d[w] || 0), 0)
                  })).filter(w => w.total > 0).sort((a, b) => b.total - a.total).slice(0, 12);
                  const maxFreq = wordFreqs[0]?.total || 1;
                  if (wordFreqs.length === 0) return null;
                  return (
                    <div className={`${CARD} overflow-hidden`}>
                      <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{t('topKeywords')}</h3>
                      </div>
                      <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                        {wordFreqs.map((kw, i) => (
                          <div key={kw.word} className="px-5 py-2.5 flex items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                            <span className="text-[10px] font-mono text-ink-faint w-4 text-right tabular-nums">{i + 1}</span>
                            <span className="text-[11px] font-medium text-ink dark:text-paper w-24 truncate">{kw.word}</span>
                            <div className="flex-1 h-[6px] bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: (kw.total / maxFreq * 100) + '%' }}
                                transition={{ duration: 0.6, delay: i * 0.03 }}
                                className="h-full bg-ink/60 dark:bg-paper/50 rounded-full"
                              />
                            </div>
                            <span className="text-[10px] font-mono text-ink-muted tabular-nums w-8 text-right">{kw.total}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Topic Clusters */}
                {analytics.topicClusters?.length > 0 && (
                  <div className={`${CARD} overflow-hidden`}>
                    <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{t('topicClusters')}</h3>
                      <p className="text-[10px] text-ink-faint mt-0.5">Grouped themes across analyzed articles</p>
                    </div>
                    <div className="px-5 py-4 flex flex-wrap gap-2">
                      {analytics.topicClusters.slice(0, 20).map((tc, i) => {
                        const size = Math.min(28, Math.max(11, 11 + (tc.count || tc.size || 1) * 0.8));
                        return (
                          <motion.span
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className="inline-flex items-center px-2.5 py-1 border border-gray-200 dark:border-gray-700 text-ink dark:text-paper font-medium rounded-sm"
                            style={{ fontSize: `${size * 0.38}px` }}
                          >
                            {tc.label || tc.topic || tc.name}
                            {(tc.count || tc.size) && (
                              <span className="ml-1.5 text-[9px] text-ink-faint font-mono">{tc.count || tc.size}</span>
                            )}
                          </motion.span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-xs text-ink-faint mb-3 font-sans">Advanced analytics from article sentiment analysis</p>
                <button onClick={loadAnalytics} className="px-5 py-2.5 bg-ink text-paper text-xs font-semibold uppercase tracking-wider hover:bg-accent transition-colors font-sans">
                  Load Analytics
                </button>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'search' && (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className={`${CARD} p-5 mb-5`}>
              <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink-muted dark:text-ink-faint mb-2 font-sans">Admin Search</p>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') performAdminSearch(); }}
                    placeholder="Search user, email, article title, topic, source, comment, or ObjectId"
                    className="w-full px-3 py-2.5 bg-paper dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-sm text-ink dark:text-paper font-sans focus:outline-none focus:border-accent"
                  />
                </div>
                <button
                  onClick={performAdminSearch}
                  disabled={searchLoading}
                  className="px-4 py-2.5 bg-ink text-paper dark:bg-paper dark:text-ink text-[11px] uppercase tracking-[0.18em] font-semibold hover:bg-accent transition-colors disabled:opacity-50 font-sans"
                >
                  {searchLoading ? 'Searching…' : 'Search'}
                </button>
              </div>
            </div>

            {searchResults && (
              <div className="space-y-5">
                <div className={`${CARD} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-lg font-bold text-ink dark:text-paper">Users</h3>
                    <span className="text-[10px] uppercase tracking-wider text-ink-faint font-sans">{searchResults.users?.length || 0} found</span>
                  </div>
                  {searchResults.users?.length ? (
                    <div className="space-y-2">
                      {searchResults.users.map((u) => (
                        <div key={u._id} className="border border-[#e5e5e5] dark:border-[#222] p-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-ink dark:text-paper font-sans">{u.name || 'Unnamed user'}</p>
                            <p className="text-xs text-ink-faint font-sans">{u.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-ink-faint font-sans">{u.role}</p>
                            <p className="text-xs text-ink-muted font-sans">{u.analysisCount || 0} analyses</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-ink-faint font-sans">No users found.</p>}
                </div>

                <div className={`${CARD} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-lg font-bold text-ink dark:text-paper">Articles</h3>
                    <span className="text-[10px] uppercase tracking-wider text-ink-faint font-sans">{searchResults.articles?.length || 0} found</span>
                  </div>
                  {searchResults.articles?.length ? (
                    <div className="space-y-2">
                      {searchResults.articles.map((a) => (
                        <div key={a._id} className="border border-[#e5e5e5] dark:border-[#222] p-3">
                          <p className="font-medium text-ink dark:text-paper font-sans mb-1">{a.title}</p>
                          <div className="flex flex-wrap gap-3 text-[11px] text-ink-faint font-sans uppercase tracking-wider">
                            <span>{a.source}</span>
                            <span>{a.sentiment}</span>
                            <span>{a.topic}</span>
                            {a.isAlert && <span className="text-red-700 dark:text-red-400">ALERT</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-ink-faint font-sans">No articles found.</p>}
                </div>

                <div className={`${CARD} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-lg font-bold text-ink dark:text-paper">Comments</h3>
                    <span className="text-[10px] uppercase tracking-wider text-ink-faint font-sans">{searchResults.comments?.length || 0} found</span>
                  </div>
                  {searchResults.comments?.length ? (
                    <div className="space-y-2">
                      {searchResults.comments.map((c) => (
                        <div key={c._id} className="border border-[#e5e5e5] dark:border-[#222] p-3">
                          <p className="text-sm text-ink dark:text-paper font-sans line-clamp-2">{c.content}</p>
                          <p className="mt-1 text-[11px] text-ink-faint font-sans">Article ID: {String(c.articleId || '').slice(0, 24)}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-ink-faint font-sans">No comments found.</p>}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'health' && (
          <motion.div key="health" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {healthLoading ? (
              <div className="py-10 text-center">
                <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-ink-faint font-sans uppercase tracking-wider">Loading backend health</p>
              </div>
            ) : health ? (
              <div className="space-y-5">
                <div className="grid md:grid-cols-3 gap-3">
                  <div className={`${CARD} p-4`}>
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2">Server Uptime</div>
                    <div className="font-display text-3xl text-ink dark:text-paper">{health.server?.uptimeHuman || '—'}</div>
                    <div className="text-xs text-ink-faint mt-1">Node {health.server?.nodeVersion || '—'}</div>
                  </div>
                  <div className={`${CARD} p-4`}>
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2">Database</div>
                    <div className="font-display text-3xl text-ink dark:text-paper capitalize">{health.database?.state || 'unknown'}</div>
                    <div className="text-xs text-ink-faint mt-1">{health.database?.name || '—'} @ {health.database?.host || '—'}</div>
                  </div>
                  <div className={`${CARD} p-4`}>
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2">Memory</div>
                    <div className="font-display text-3xl text-ink dark:text-paper">{health.server?.memoryMb?.heapUsed || 0}MB</div>
                    <div className="text-xs text-ink-faint mt-1">RSS {health.server?.memoryMb?.rss || 0}MB</div>
                  </div>
                </div>

                <div className={`${CARD} p-5`}>
                  <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                    <div>
                      <h3 className="font-display text-xl text-ink dark:text-paper">Scheduled Jobs</h3>
                      <p className="text-[11px] uppercase tracking-wider text-ink-faint mt-1">Cron health and last execution metadata</p>
                    </div>
                    <button onClick={triggerImpactRecompute} className="px-3 py-2 border border-ink dark:border-paper text-[10px] uppercase tracking-wider font-semibold hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink transition-colors">
                      Recompute Impact
                    </button>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(health.jobs || {}).map(([name, job]) => (
                      <div key={name} className="border border-[#e5e5e5] dark:border-[#222] p-3 grid md:grid-cols-4 gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-faint">Job</div>
                          <div className="font-semibold text-ink dark:text-paper">{name}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-faint">Status</div>
                          <div className={`font-semibold capitalize ${job?.lastStatus === 'success' ? 'text-green-700 dark:text-green-400' : job?.lastStatus === 'error' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>{job?.lastStatus || 'pending'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-faint">Last Run</div>
                          <div className="text-sm text-ink dark:text-paper">{job?.lastRun ? new Date(job.lastRun).toLocaleString() : '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-faint">Duration</div>
                          <div className="text-sm text-ink dark:text-paper">{job?.lastDurationMs ? `${job.lastDurationMs}ms` : '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-5">
                  <div className={`${CARD} p-5`}>
                    <h3 className="font-display text-xl text-ink dark:text-paper mb-4">RSS Sources</h3>
                    <div className="space-y-3">
                      {Object.keys(health.rssSources || {}).length === 0 ? (
                        <p className="text-sm text-ink-faint">No RSS fetch recorded since last deploy.</p>
                      ) : Object.entries(health.rssSources || {}).map(([name, src]) => (
                        <div key={name} className="border border-[#e5e5e5] dark:border-[#222] p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-ink dark:text-paper capitalize">{name}</span>
                            <span className={`text-[10px] uppercase tracking-wider ${src?.lastStatus === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{src?.lastStatus || 'unknown'}</span>
                          </div>
                          <div className="text-sm text-ink-faint">Articles fetched: {src?.articlesFetched ?? 0}</div>
                          <div className="text-sm text-ink-faint">Last fetch: {src?.lastFetch ? new Date(src.lastFetch).toLocaleString() : '—'}</div>
                          {src?.error && <div className="text-sm text-red-700 dark:text-red-400 mt-1">{src.error}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`${CARD} p-5`}>
                    <h3 className="font-display text-xl text-ink dark:text-paper mb-4">Recent Errors</h3>
                    <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                      {(health.recentErrors || []).length === 0 ? (
                        <p className="text-sm text-ink-faint">No recent backend errors recorded.</p>
                      ) : (health.recentErrors || []).map((err, idx) => (
                        <div key={`${err.timestamp}-${idx}`} className="border border-[#e5e5e5] dark:border-[#222] p-3">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span className="font-semibold text-ink dark:text-paper">{err.source}</span>
                            <span className="text-[10px] uppercase tracking-wider text-ink-faint">{new Date(err.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-sm text-red-700 dark:text-red-400 break-words">{err.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`${CARD} p-6 text-center`}>
                <p className="font-display text-2xl text-ink dark:text-paper mb-2">Backend health not loaded</p>
                <p className="text-[11px] uppercase tracking-wider text-ink-faint mb-5">Fetch live diagnostics from Render backend</p>
                <button onClick={loadHealth} className="px-5 py-2.5 bg-ink text-paper text-xs font-semibold uppercase tracking-wider hover:bg-accent transition-colors font-sans">
                  Load Health
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollToTop />
    </div>
  );
};

export default AdminDashboard;
