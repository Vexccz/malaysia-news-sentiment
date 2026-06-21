import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAdminStats } from '../services/api';
import toast from 'react-hot-toast';
import ScrollToTop from '../components/ScrollToTop';
import { useSocket } from '../context/SocketContext';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
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

  const filteredUsers = useMemo(() => {
    if (!stats?.recentUsers) return [];
    let filtered = stats.recentUsers;
    if (userRoleFilter !== 'all') filtered = filtered.filter(u => u.role === userRoleFilter);
    if (userSearchQuery.trim()) {
      const query = userSearchQuery.toLowerCase();
      filtered = filtered.filter(u => u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query));
    }
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[userSortField];
      let bVal = b[userSortField];
      if (userSortField === 'analysisCount') { aVal = a.analysisCount || 0; bVal = b.analysisCount || 0; }
      else if (userSortField === 'createdAt') { aVal = new Date(a.createdAt).getTime(); bVal = new Date(b.createdAt).getTime(); }
      else if (userSortField === 'name' || userSortField === 'email') { aVal = (aVal || '').toLowerCase(); bVal = (bVal || '').toLowerCase(); }
      if (aVal < bVal) return userSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return userSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [stats?.recentUsers, userSearchQuery, userSortField, userSortOrder, userRoleFilter]);

  const handleSort = (field) => {
    if (userSortField === field) setUserSortOrder(userSortOrder === 'asc' ? 'desc' : 'asc');
    else { setUserSortField(field); setUserSortOrder('asc'); }
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
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-xs text-ink-faint font-sans uppercase tracking-wider">Loading</p>
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

  const TABS = ['overview', 'users', 'content', 'api', 'insights'];

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-baseline gap-3 mb-1">
            <h1 className="text-3xl font-bold text-ink dark:text-paper tracking-tight font-display">
              Admin Dashboard
            </h1>
          </div>
          <div className="editorial-rule mb-2" />
          <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">System overview and analytics management</p>
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
              onClick={() => { setActiveTab(tab); if (tab === 'insights' && !insights) loadInsights(); if (tab === 'api') loadMetrics(); }}
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
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-paper-line dark:divide-paper-dark-line border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card mb-6">
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
              <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
                <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
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
              <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card border-l-0 md:border-l-0">
                <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
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
              <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
                <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
                  <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">Popular Topics</h3>
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
              <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card border-l-0 md:border-l-0">
                <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
                  <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">Recent Articles</h3>
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
                <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card mb-6">
                  <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
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
            <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
              <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">User Management</h3>
                  <span className="text-[10px] font-bold text-ink-faint font-sans">{stats.overview.totalUsers} Total · {filteredUsers.length} Shown</span>
                </div>
              </div>

              {/* Filters */}
              <div className="px-5 py-3 border-b border-paper-line dark:border-paper-dark-line flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors font-sans"
                  />
                </div>
                <div className="flex gap-0">
                  {['all', 'admin', 'user'].map((role, i) => (
                    <React.Fragment key={role}>
                      {i > 0 && <span className="text-ink-faint mx-1.5">|</span>}
                      <button
                        onClick={() => setUserRoleFilter(role)}
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
                  <button onClick={() => { setUserSearchQuery(''); setUserRoleFilter('all'); }} className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider font-sans">
                    Clear
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-paper-line dark:border-paper-dark-line">
                      {['User', 'Email', 'Role', 'Analyses', 'Joined'].map(field => (
                        <th key={field} onClick={() => handleSort(field.toLowerCase())} className="text-left py-3 px-5 text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-wider cursor-pointer hover:text-ink dark:hover:text-paper transition-colors font-sans">
                          <div className="flex items-center gap-1.5">{field} <SortIcon field={field.toLowerCase()} /></div>
                        </th>
                      ))}
                      <th className="text-right py-3 px-5 text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-wider font-sans">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-line dark:divide-paper-dark-line">
                    {filteredUsers.length > 0 ? filteredUsers.map((u, i) => (
                      <tr key={i} className="hover:bg-paper/50 dark:hover:bg-paper-dark/50 transition-colors">
                        <td className="py-3 px-5">
                          <span className="text-xs font-semibold text-ink dark:text-paper font-sans">{u.name}</span>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-[11px] text-ink-muted dark:text-ink-faint font-sans">{u.email}</span>
                        </td>
                        <td className="py-3 px-5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider font-sans ${u.role === 'admin' ? 'text-red-700 dark:text-red-400' : 'text-ink-muted dark:text-ink-faint'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-xs font-bold text-ink dark:text-paper font-sans">{u.analysisCount || 0}</span>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-[11px] text-ink-muted dark:text-ink-faint font-sans">
                            {new Date(u.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <button onClick={() => toast.error('User management coming soon')} className="text-[10px] font-bold text-ink-faint hover:text-ink dark:hover:text-paper uppercase tracking-wider font-sans">
                            Edit
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="py-12 text-center">
                          <p className="text-xs text-ink-faint font-sans">No users found matching your filters</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length > 0 && (
                <div className="px-5 py-3 border-t border-paper-line dark:border-paper-dark-line flex items-center justify-between">
                  <span className="text-[10px] text-ink-faint font-sans">Showing {filteredUsers.length} of {stats.overview.totalUsers}</span>
                  <span className="text-[10px] text-ink-faint font-sans">Sorted by {userSortField} ({userSortOrder})</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'content' && (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="grid md:grid-cols-2 gap-0">
              <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
                <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
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

              <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card border-l-0 md:border-l-0">
                <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
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
              <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card py-10 text-center">
                <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-ink-faint font-sans uppercase tracking-wider">Loading metrics</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-paper-line dark:divide-paper-dark-line border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card mb-6">
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
                  <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
                    <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
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

                  <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card border-l-0 md:border-l-0">
                    <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
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
            <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
              <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
                <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">AI Strategic Insights</h3>
              </div>
              {insightsLoading ? (
                <div className="py-10 text-center">
                  <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-ink-faint font-sans uppercase tracking-wider">Generating insights</p>
                </div>
              ) : insights ? (
                <div className="divide-y divide-paper-line dark:divide-paper-dark-line">
                  <div className="px-5 py-4 border-l-3 border-red-600">
                    <div className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-widest mb-1.5 font-sans">Risk Assessment</div>
                    <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">{insights.risk}</p>
                  </div>
                  <div className="px-5 py-4 border-l-3 border-green-600">
                    <div className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-widest mb-1.5 font-sans">Opportunity</div>
                    <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">{insights.opportunity}</p>
                  </div>
                  <div className="px-5 py-3">
                    <button onClick={loadInsights} className="text-xs font-medium uppercase tracking-wider text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-colors font-sans">
                      Regenerate Insights
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs text-ink-faint mb-3 font-sans">Generate AI-powered strategic insights from recent news data</p>
                  <button onClick={loadInsights} className="px-5 py-2.5 bg-ink text-paper text-xs font-semibold uppercase tracking-wider hover:bg-accent transition-colors font-sans">
                    Generate Insights
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollToTop />
    </div>
  );
};

export default AdminDashboard;
