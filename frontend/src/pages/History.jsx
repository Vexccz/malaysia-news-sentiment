import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ArticlePreviewModal from '../components/ArticlePreviewModal';
import { getHistory, deleteArticle, bulkDeleteArticles, getStats } from '../services/api';
import { exportToCSV } from '../services/exportUtils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trash2, Clock, Eye, TrendingUp, Download, Filter, BarChart3, ChevronLeft, ChevronRight, ExternalLink, ArrowUpRight, Share2 } from 'lucide-react';
import { formatRelativeTime } from '../utils/dateFormat';
import { Link } from 'react-router-dom';

const SENTIMENT_COLORS = { Positive: '#10B981', Negative: '#EF4444', Neutral: '#F59E0B' };
const SENTIMENT_DOT = { Positive: '#4ADE80', Negative: '#FB7185', Neutral: '#FBBF24' };

const History = () => {
  const queryClient = useQueryClient();
  const { t, lang } = useLanguage();
  
  const [params, setParams] = useState({
    search: '', sentiment: '', from: '', to: '', sortBy: 'newest', page: 1, limit: 50
  });
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [visitLog, setVisitLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('history_visits') || '{}'); } catch { return {}; }
  });

  const handleSearchChange = (value) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleParamChange('search', value), 400);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: historyData, isLoading: isHistoryLoading, isFetching: isHistoryFetching, error: historyError } = useQuery({
    queryKey: ['history', params], queryFn: () => getHistory(params), staleTime: 30000,
  });
  const { data: statsData } = useQuery({
    queryKey: ['stats'], queryFn: () => getStats(), staleTime: 60000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteArticle(id),
    onSuccess: () => { toast.success('Article deleted'); queryClient.invalidateQueries(['history']); queryClient.invalidateQueries(['stats']); },
    onError: () => toast.error('Failed to delete article.')
  });
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => bulkDeleteArticles(ids),
    onSuccess: (_, ids) => { toast.success(`${ids.length} article${ids.length > 1 ? 's' : ''} deleted`); setSelectedIds(new Set()); queryClient.invalidateQueries(['history']); queryClient.invalidateQueries(['stats']); },
    onError: () => toast.error('Failed to delete selected articles.')
  });

  const articles = historyData?.articles || [];
  const totalPages = historyData?.pages || 1;
  const totalCount = historyData?.total || 0;
  const stats = statsData || null;
  const loading = isHistoryLoading || isHistoryFetching;
  const error = historyError?.message || '';

  // Analytics: top revisited articles
  const topRevisited = useMemo(() => {
    return Object.entries(visitLog)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, data]) => ({ id, count: data.count, title: data.title?.slice(0, 60) || id }));
  }, [visitLog]);

  // Analytics: sentiment distribution for current results
  const sentimentDist = useMemo(() => {
    const dist = { Positive: 0, Negative: 0, Neutral: 0 };
    articles.forEach(a => { const s = a.sentiment || 'Neutral'; dist[s] = (dist[s] || 0) + 1; });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [articles]);

  // Analytics: articles by day of week
  const byDayOfWeek = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);
    articles.forEach(a => {
      const d = new Date(a.publishedAt || a.createdAt);
      counts[d.getDay()]++;
    });
    return days.map((name, i) => ({ name, count: counts[i] }));
  }, [articles]);

  // Track article visits
  const handlePreview = (article) => {
    setSelectedArticle(article);
    setShowPreview(true);
    const id = article._id || article.id;
    setVisitLog(prev => {
      const next = { ...prev, [id]: { count: (prev[id]?.count || 0) + 1, title: article.title, lastVisit: Date.now() } };
      localStorage.setItem('history_visits', JSON.stringify(next));
      return next;
    });
  };

  const handleParamChange = (name, value) => {
    setParams(prev => ({ ...prev, [name]: value, page: name === 'page' ? value : 1 }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently remove this analysis from history?')) return;
    deleteMutation.mutate(id);
  };

  const handleShare = async (e, article) => {
    e.stopPropagation();
    const shareData = {
      title: article.title,
      text: article.description?.slice(0, 100) || article.title,
      url: article.url || window.location.origin + "/articles/" + (article._id || article.id),
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Link copied!");
      } catch {}
    }
  };

  const handleExport = () => {
    if (articles.length === 0) return toast.error('No articles to export.');
    exportToCSV(articles, `history-export-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Export started');
  };

  const handleClearHistory = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    if (articles.length === 0) return;
    bulkDeleteMutation.mutate(articles.map(a => a._id || a.id));
    setShowClearConfirm(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    setSelectedIds(prev => prev.size === articles.length ? new Set() : new Set(articles.map(a => a._id || a.id)));
  };
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Permanently delete ${selectedIds.size} selected article${selectedIds.size > 1 ? 's' : ''}?`)) return;
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };
  const handleBulkExport = () => {
    if (selectedIds.size === 0) return;
    const selected = articles.filter(a => selectedIds.has(a._id || a.id));
    if (selected.length === 0) return toast.error('No articles to export.');
    exportToCSV(selected, `history-export-selected-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${selected.length} article${selected.length > 1 ? 's' : ''}`);
  };

  const isAllSelected = articles.length > 0 && selectedIds.size === articles.length;
  const isSomeSelected = selectedIds.size > 0;

  const KPI = stats ? [
    { label: 'Total Analyzed', value: stats.total, sub: 'in database', icon: BarChart3 },
    { label: 'Positive', value: stats.sentiments.Positive, sub: `${stats.total ? Math.round(stats.sentiments.Positive/stats.total*100) : 0}%`, icon: TrendingUp },
    { label: 'Negative', value: stats.sentiments.Negative, sub: `${stats.total ? Math.round(stats.sentiments.Negative/stats.total*100) : 0}%`, icon: TrendingUp },
    { label: 'Neutral', value: stats.sentiments.Neutral, sub: `${stats.total ? Math.round(stats.sentiments.Neutral/stats.total*100) : 0}%`, icon: TrendingUp },
  ] : [];

  const getSentimentColor = (s) => SENTIMENT_DOT[s] || '#FBBF24';
  const getSentimentBg = (s) => {
    if (s === 'Positive') return 'bg-emerald-500/10 text-emerald-400';
    if (s === 'Negative') return 'bg-red-500/10 text-red-400';
    return 'bg-amber-500/10 text-amber-400';
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {t('history')}
            </h1>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
              Your past searches and sentiment analyses across Malaysian news sources
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider border transition-colors font-sans ${
                showAnalytics ? 'border-ink dark:border-paper bg-ink dark:bg-paper text-paper dark:text-ink' : 'border-paper-line dark:border-paper-dark-line text-ink-muted hover:text-ink'
              }`}>
              <BarChart size={11} /> Analytics
            </button>
            <button onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider border border-red-300 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors font-sans">
              <Trash2 size={11} /> Clear
            </button>
          </div>
        </div>
        <div className="mt-3 border-b border-[#e5e5e5] dark:border-[#222]" />
      </div>

      {/* Clear confirmation dialog */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="mb-4 border border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 overflow-hidden">
            <p className="text-sm text-red-700 dark:text-red-400 font-sans mb-3">
              Clear all {totalCount} articles from history? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={confirmClear}
                className="px-4 py-1.5 text-xs uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-colors font-sans">
                Confirm Clear
              </button>
              <button onClick={() => setShowClearConfirm(false)}
                className="px-4 py-1.5 text-xs uppercase tracking-wider border border-paper-line dark:border-paper-dark-line text-ink-muted hover:text-ink transition-colors font-sans">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics panel */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sentiment distribution */}
              <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card p-4">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-3 font-sans">
                  Sentiment Distribution
                </h3>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={sentimentDist} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value">
                      {sentimentDist.map((entry) => (
                        <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Activity by day */}
              <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card p-4">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-3 font-sans">
                  Activity by Day
                </h3>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={byDayOfWeek}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#999' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#999' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366F1" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Top revisited */}
              <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card p-4">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-3 font-sans">
                  Most Revisited
                </h3>
                {topRevisited.length === 0 ? (
                  <p className="text-xs text-ink-faint font-sans">No revisit data yet</p>
                ) : (
                  <div className="space-y-2">
                    {topRevisited.map((item, i) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        <span className="text-ink-faint w-4 text-right font-mono">{i + 1}.</span>
                        <span className="flex-1 truncate text-ink dark:text-paper font-sans">{item.title}</span>
                        <span className="flex items-center gap-0.5 text-ink-muted">
                          <Eye size={10} /> {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="border-l-2 border-[#FB7185] bg-white dark:bg-[#111] px-4 py-3 mb-6 border border-[#e5e5e5] dark:border-[#222]">
          <p className="text-sm text-[#FB7185]">{error}</p>
        </div>
      )}

      {/* KPI Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#e5e5e5] dark:divide-[#222] border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] mb-6">
          {KPI.map((c) => (
            <div key={c.label} className="px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mb-1">{c.label}</div>
              <div className="text-xl font-bold text-black dark:text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{c.value}</div>
              <div className="text-[10px] text-gray-400 dark:text-[#666] mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] mb-6">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="relative flex-1 min-w-[180px]">
            <input type="text" placeholder="Search history..." value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#0a0a0a] text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#666] focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
          </div>
          <select value={params.sentiment} onChange={(e) => handleParamChange('sentiment', e.target.value)}
            className="px-3 py-2 text-[11px] font-medium border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#0a0a0a] text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors uppercase tracking-[0.18em]">
            <option value="">All Sentiment</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
            <option value="Neutral">Neutral</option>
          </select>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">From</label>
            <input type="date" value={params.from} onChange={(e) => handleParamChange('from', e.target.value)}
              className="px-2.5 py-2 text-xs border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#0a0a0a] text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors" />
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">To</label>
            <input type="date" value={params.to} onChange={(e) => handleParamChange('to', e.target.value)}
              className="px-2.5 py-2 text-xs border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#0a0a0a] text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors" />
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black dark:text-white border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {isSomeSelected && (
        <div className="border border-black dark:border-white bg-white dark:bg-[#111] px-4 py-3 mb-4 flex items-center gap-4">
          <span className="text-[11px] font-semibold text-black dark:text-white uppercase tracking-[0.18em]">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleteMutation.isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FB7185] border border-[#FB7185] hover:bg-[#FB7185] hover:text-white transition-colors disabled:opacity-50">
            <Trash2 size={13} /> Delete Selected
          </button>
          <button onClick={handleBulkExport}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black dark:text-white border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
            <Download size={13} /> Export Selected
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="text-[10px] font-medium text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white transition-colors uppercase tracking-[0.18em] ml-auto">
            Clear selection
          </button>
        </div>
      )}

      {/* Articles - Clean Editorial List */}
      <div>
        {loading ? (
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] divide-y divide-[#e5e5e5] dark:divide-[#222]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse">
                <div className="h-3.5 bg-gray-200 dark:bg-[#222] w-3/4 mb-2.5" />
                <div className="h-3 bg-gray-100 dark:bg-[#1a1a1a] w-full mb-2" />
                <div className="flex gap-2"><div className="h-2.5 w-16 bg-gray-200 dark:bg-[#222]" /><div className="h-2.5 w-10 bg-gray-200 dark:bg-[#222]" /></div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111]">
            <h3 className="text-xl font-bold text-black dark:text-white mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>No Stories Found</h3>
            <p className="text-sm text-gray-500 dark:text-[#999] italic max-w-sm mx-auto">"Adjust your filters or search for past analyses."</p>
          </div>
        ) : (
          <>
            {/* Select all bar */}
            <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] px-5 py-2.5 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll}
                  className="w-4 h-4 border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] accent-black dark:accent-white cursor-pointer" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">Select All</span>
              </label>
              <span className="text-[10px] text-gray-400 dark:text-[#666] ml-auto">{totalCount} item{totalCount !== 1 ? 's' : ''}</span>
            </div>

            {/* Article list — clean editorial rows */}
            <div className="border border-t-0 border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] divide-y divide-[#e5e5e5] dark:divide-[#222]">
              {articles.map((article, idx) => {
                const articleId = article._id || article.id;
                const isSelected = selectedIds.has(articleId);
                const sentimentColor = getSentimentColor(article.sentiment);
                const revisitCount = visitLog[articleId]?.count || 0;
                const relativeTime = formatRelativeTime(article.publishedAt, lang, true);

                return (
                  <motion.div
                    key={articleId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                    className="group relative"
                    style={{ borderLeft: `3px solid ${sentimentColor}` }}
                  >
                    <div className="flex items-start gap-4 px-5 py-4">
                      {/* Checkbox */}
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => toggleSelect(articleId)}
                        className="w-4 h-4 mt-1 flex-shrink-0 border border-[#e5e5e5] dark:border-[#333] bg-white dark:bg-[#0a0a0a] accent-black dark:accent-white cursor-pointer" 
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Source + Time row */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-[#aaa]">
                            {article.source || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-[#666]">·</span>
                          <span className="text-[10px] text-gray-400 dark:text-[#666] flex items-center gap-1">
                            <Clock size={9} />
                            {relativeTime}
                          </span>
                          {article.topic && (
                            <>
                              <span className="text-[10px] text-gray-400 dark:text-[#666]">·</span>
                              <span className="text-[10px] text-gray-500 dark:text-[#888]">#{article.topic}</span>
                            </>
                          )}
                          {revisitCount > 1 && (
                            <span className="text-[10px] text-gray-400 dark:text-[#666] flex items-center gap-0.5 ml-auto">
                              <Eye size={9} /> {revisitCount} views
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 
                          onClick={() => handlePreview(article)}
                          className="text-[15px] font-semibold text-black dark:text-white leading-snug mb-1.5 cursor-pointer hover:text-gray-700 dark:hover:text-[#ccc] transition-colors line-clamp-2"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          {article.title}
                        </h3>

                        {/* Description */}
                        {article.description && (
                          <p className="text-[13px] text-gray-500 dark:text-[#888] leading-relaxed line-clamp-1 mb-2">
                            {article.description.slice(0, 180)}{article.description.length > 180 ? '...' : ''}
                          </p>
                        )}

                        {/* Bottom row: Sentiment + Confidence + Actions */}
                        <div className="flex items-center gap-3">
                          {/* Sentiment badge */}
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getSentimentBg(article.sentiment)}`}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: sentimentColor }} />
                            {article.sentiment || 'Neutral'}
                          </span>

                          {/* Confidence bar */}
                          {article.confidence !== undefined && article.confidence > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-[#333] overflow-hidden">
                                <div 
                                  className="h-full transition-all duration-500"
                                  style={{ 
                                    width: `${Math.round(article.confidence * 100)}%`, 
                                    background: sentimentColor 
                                  }} 
                                />
                              </div>
                              <span className="text-[10px] text-gray-400 dark:text-[#666] font-mono">
                                {Math.round(article.confidence * 100)}%
                              </span>
                            </div>
                          )}

                          {/* Reason snippet */}
                          {article.reason && (
                            <span className="text-[10px] text-gray-400 dark:text-[#666] italic truncate max-w-[200px]">
                              "{article.reason}"
                            </span>
                          )}

                          {/* Actions — minimal, only visible on hover */}
                          <div className="flex items-center gap-1 ml-auto opacity-60 group-hover:opacity-100 transition-opacity">
                            <Link
                              to={'/articles/' + articleId}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-[#888] hover:text-black dark:hover:text-white border border-transparent hover:border-[#e5e5e5] dark:hover:border-[#333] transition-all"
                              title="View full analysis"
                            >
                              Details <ArrowUpRight size={10} />
                            </Link>
                            <button 
                              onClick={(e) => handleShare(e, article)}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-[#888] hover:text-blue-500 border border-transparent hover:border-blue-200 dark:hover:border-blue-900 transition-all"
                              title="Share article"
                            >
                              <Share2 size={10} /> Share
                            </button>
                            {article.url && (
                              <a 
                                href={article.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-[#888] hover:text-black dark:hover:text-white border border-transparent hover:border-[#e5e5e5] dark:hover:border-[#333] transition-all"
                                title="Open original source"
                              >
                                Source <ExternalLink size={10} />
                              </a>
                            )}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(articleId); }}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-[#666] hover:text-red-500 border border-transparent hover:border-red-200 dark:hover:border-red-900 transition-all"
                              title="Delete from history"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-1">
                <button disabled={params.page === 1} onClick={() => handleParamChange('page', params.page - 1)}
                  className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] hover:text-black dark:hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronLeft size={14} /> Previous
                </button>
                <div className="text-xs text-gray-400 dark:text-[#666]">
                  Page <strong className="text-black dark:text-white">{params.page}</strong> of {totalPages}
                  <span className="ml-2">({totalCount} items)</span>
                </div>
                <button disabled={params.page === totalPages} onClick={() => handleParamChange('page', params.page + 1)}
                  className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] hover:text-black dark:hover:text-white disabled:opacity-30 transition-colors">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ArticlePreviewModal key={selectedArticle?._id || 'history-preview'} article={selectedArticle} isOpen={showPreview} onClose={() => setShowPreview(false)} />
    </div>
  );
};

export default History;
