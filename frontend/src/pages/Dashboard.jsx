import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import SearchBarClean from '../components/SearchBarClean';
import ArticleCardCompact from '../components/ArticleCardCompact';
import SentimentDonutChart from '../components/SentimentDonutChart';
import SentimentHorizontalBar from '../components/SentimentHorizontalBar';
import SentimentAreaChart from '../components/SentimentAreaChart';
import SentimentHeatmap from '../components/SentimentHeatmap';
import TopSourcesHorizontal from '../components/TopSourcesHorizontal';
import AiDigestCard from '../components/AiDigestCard';
import WordCloud from '../components/WordCloud';
import ForecastCard from '../components/ForecastCard';
import ScrollToTop from '../components/ScrollToTop';
import AnalyzingOverlay from '../components/AnalyzingOverlay';
import usePullToRefresh from '../hooks/usePullToRefresh';
import useSwipeTabs from '../hooks/useSwipeTabs';
import { hapticImpact } from '../utils/haptics';
import { Search, Clock, ArrowLeft, Sparkles, FileDown, Printer, ChevronLeft, ChevronRight, BarChart3, TrendingUp, Brain, Download, Settings2, Globe } from 'lucide-react';
import DashboardCustomizer from '../components/DashboardCustomizer';
import EmptyState from '../components/EmptyState';
import DashboardSummary from '../components/DashboardSummary';

// Lazy load chart components
const SentimentBarChart = lazy(() => import('../components/SentimentBarChart'));
const TrendLineChart = lazy(() => import('../components/TrendLineChart'));
const TopSourcesChart = lazy(() => import('../components/TopSourcesChart'));
const SentimentMap = lazy(() => import('../components/SentimentMap'));

const ChartFallback = () => (
  <div className="h-48 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-[#eee] dark:border-[#2a2a2a] p-5 space-y-3">
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
    </div>
    <div className="flex items-end gap-3 h-28 pt-4">
      <div className="flex-1 h-[60%] rounded-t-lg bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ animationDelay: '0ms' }} />
      <div className="flex-1 h-[80%] rounded-t-lg bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ animationDelay: '150ms' }} />
      <div className="flex-1 h-[45%] rounded-t-lg bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ animationDelay: '300ms' }} />
      <div className="flex-1 h-[70%] rounded-t-lg bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ animationDelay: '450ms' }} />
      <div className="flex-1 h-[55%] rounded-t-lg bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ animationDelay: '600ms' }} />
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    {/* Header skeleton */}
    <div className="space-y-2">
      <div className="h-7 w-48 rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
    {/* Search bar skeleton */}
    <div className="h-12 rounded-2xl bg-gray-200 dark:bg-gray-700" />
    {/* KPI row skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-2xl p-5 space-y-2">
          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-12 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
    {/* Charts skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {[1,2].map(i => (
        <div key={i} className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
    {/* Article cards skeleton */}
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-2xl p-4 flex gap-4">
          <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

import SourceCredibility from '../components/SourceCredibility';
import { List as VirtualList } from 'react-window';
import ExportPPT from '../components/ExportPPT';
import { InlineErrorBoundary } from '../components/ErrorBoundary';
import { Skeleton } from 'boneyard-js/react';
import { 
  fetchAndAnalyzeNews, getDashboardInit, getTopSources,
  generateDigest, generateForecast, getRegionalData, getHistory
} from '../services/api';
import { exportToCSV } from '../services/exportUtils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const FILTER_OPTIONS = [
  { key: 'All',      label: 'All' },
  { key: 'Positive', label: 'Positive' },
  { key: 'Negative', label: 'Negative' },
  { key: 'Neutral',  label: 'Neutral' },
  { key: 'Alerts',   label: '🔴 Alerts', isAlert: true },
];

const calcDistribution = (arts) => ({
  Positive: arts.filter(a => (a.sentiment || 'Neutral') === 'Positive').length,
  Negative: arts.filter(a => (a.sentiment || 'Neutral') === 'Negative').length,
  Neutral:  arts.filter(a => (a.sentiment || 'Neutral') === 'Neutral').length,
});

const TIME_OPTIONS = [
  { key: '',    label: 'All Time' },
  { key: '24h', label: 'Last 24H' },
  { key: '7d',  label: 'Last 7D' },
  { key: '30d', label: 'Last 30D' },
];

// Consistent card style
const CARD = 'border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card';

const Dashboard = () => {
  const { user, toggleBookmark } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const queryClient = useQueryClient();
  const socket = useSocket();
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [filter, setFilter]               = useState('All');
  const [page, setPage]                 = useState(1);
  const LIMIT                           = 10;
  const [timeframe, setTimeframe]         = useState('');
  const [isHistoryView, setIsHistoryView] = useState(true);
  const [currentQuery, setCurrentQuery]   = useState('');

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState('overview');
  const [tabSwitching, setTabSwitching] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [dashboardLayout, setDashboardLayout] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showFabTooltip, setShowFabTooltip] = useState(false);

  const handleTabSwitch = useCallback((tab) => {
    if (tab === mobileTab) return;
    setTabSwitching(true);
    setMobileTab(tab);
    setTimeout(() => setTabSwitching(false), 150);
  }, [mobileTab]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pull-to-refresh
  const handlePullRefresh = useCallback(async () => {
    await queryClient.invalidateQueries(['dashboardInit']);
    await queryClient.invalidateQueries(['topSources']);
    await queryClient.invalidateQueries(['regionalData']);
  }, [queryClient]);
  const { pullDistance, isRefreshing, onTouchStart: pullTouchStart, onTouchMove: pullTouchMove, onTouchEnd: pullTouchEnd } = usePullToRefresh(handlePullRefresh);

  // Swipe between tabs
  const MOBILE_TABS = ['overview', 'charts', 'ai'];
  const { onTouchStart: swipeTouchStart, onTouchEnd: swipeTouchEnd } = useSwipeTabs(MOBILE_TABS, mobileTab, setMobileTab);

  // FAB label tooltip on first visit
  useEffect(() => {
    if (!isMobile) return;
    const seen = localStorage.getItem('fab-tooltip-seen');
    if (!seen) {
      setShowFabTooltip(true);
      const timer = setTimeout(() => {
        setShowFabTooltip(false);
        localStorage.setItem('fab-tooltip-seen', '1');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  // Dashboard Init Query (History Mode)
  const { 
    data: dashboardData, 
    isFetching: isDashboardFetching,
    isLoading: isDashboardLoading,
    error: dashboardError 
  } = useQuery({
    queryKey: ['dashboardInit', timeframe, page],
    queryFn: () => getDashboardInit({ limit: LIMIT, page, timeframe }),
    enabled: isHistoryView,
    staleTime: 60000,
  });

  // Top Sources Query
  const { data: sourcesData, isLoading: isSourcesLoading } = useQuery({
    queryKey: ['topSources', isHistoryView ? '' : currentQuery],
    queryFn: () => getTopSources(isHistoryView ? '' : currentQuery),
    staleTime: 60000,
  });

  // Regional Data Query
  const { data: regData, isLoading: isRegLoading } = useQuery({
    queryKey: ['regionalData', isHistoryView ? '' : currentQuery],
    queryFn: () => getRegionalData(isHistoryView ? '' : currentQuery),
    staleTime: 60000,
  });

  // States that still need manual management
  const [searchArticles, setSearchArticles] = useState([]);
  const [searchDistribution, setSearchDistribution] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [digest, setDigest]               = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [forecast, setForecast]           = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [manualError, setManualError]     = useState('');
  const [showExportSheet, setShowExportSheet] = useState(false);

  // Back gesture handling for export sheet
  useEffect(() => {
    if (!showExportSheet) return;
    window.history.pushState(null, '');
    const handlePopState = () => setShowExportSheet(false);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showExportSheet]);

  // Reset page when timeframe changes
  useEffect(() => {
    setPage(1);
  }, [timeframe]);

  // Derived Values
  const articles = isHistoryView ? (dashboardData?.history?.articles || []) : searchArticles;
  const distribution = isHistoryView 
    ? (dashboardData?.stats?.sentiments || { Positive: 0, Negative: 0, Neutral: 0 })
    : (searchDistribution || { Positive: 0, Negative: 0, Neutral: 0 });
  const trends = dashboardData?.trends || [];
  const sources = sourcesData || [];
  const regionalData = regData || [];

  // Transform distribution for new charts (capital -> lowercase)
  const chartDistribution = {
    positive: distribution.Positive || distribution.positive || 0,
    negative: distribution.Negative || distribution.negative || 0,
    neutral: distribution.Neutral || distribution.neutral || 0,
  };
  const keywords = dashboardData?.keywords || [];
  const stats = dashboardData?.stats || { total: 0, sentiments: {}, alerts: 0 };
  const error = manualError || (dashboardError ? (dashboardError.friendlyMessage || 'Could not load analysis history. Please check if the server is running.') : '');
  
  const initLoading = isDashboardLoading && isHistoryView;
  const historyLoading = isDashboardFetching && !isDashboardLoading && isHistoryView;

  const loadForecastAndDigest = useCallback((fetchedArticles, query) => {
    if (!fetchedArticles.length) {
      setDigest(null);
      setForecast(null);
      setDigestLoading(false);
      setForecastLoading(false);
      return;
    }

    setDigestLoading(true);
    setForecastLoading(true);

    generateDigest(fetchedArticles, query)
      .then(res => setDigest(res.digest || null))
      .catch(() => setDigest(null))
      .finally(() => setDigestLoading(false));

    generateForecast(fetchedArticles, query)
      .then(res => setForecast(res))
      .catch(() => setForecast(null))
      .finally(() => setForecastLoading(false));
  }, []);

  // Automatically trigger forecast when history data loads (once per view switch)
  const hasTriedAutoForecast = useRef(false);
  useEffect(() => {
    if (!isHistoryView) hasTriedAutoForecast.current = false;
  }, [isHistoryView]);

  useEffect(() => {
    if (isHistoryView && articles.length > 0 && !digest && !forecast && !digestLoading && !forecastLoading && !hasTriedAutoForecast.current) {
      hasTriedAutoForecast.current = true;
      loadForecastAndDigest(articles, 'Recent History');
    }
  }, [articles, isHistoryView, digest, forecast, digestLoading, forecastLoading, loadForecastAndDigest]);

  const handleManualForecast = () => {
    if (isMobile) setMobileTab('ai');
    loadForecastAndDigest(articles, isHistoryView ? 'History Overview' : currentQuery);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleSearch = async (query, pageSize, latest = false) => {
    setSearchLoading(true);
    setManualError('');
    setIsHistoryView(false);
    setCurrentQuery(latest ? 'Latest Headlines' : query);
    setDigest(null);

    const msg = latest ? 'Fetching Latest Headlines...' : `Searching for "${query}"...`;
    const searchToast = toast.loading(msg);
    setAnalysisProgress({ done: 0, total: 0 });

    const progressHandler = (data) => {
      setAnalysisProgress(data);
      if (data.total > 0) {
        toast.loading(`Analyzing ${data.done}/${data.total} articles...`, { id: searchToast });
      }
      if (data.complete) setAnalysisProgress(null);
    };
    if (socket) socket.on('analysis_progress', progressHandler);

    try {
      const data = await fetchAndAnalyzeNews(query, pageSize, latest);
      const fetched = data.articles || [];
      
      if (fetched.length === 0) {
        toast.error('No articles found.', { id: searchToast });
        setIsHistoryView(true);
        return;
      }

      setSearchArticles(fetched);
      setSearchDistribution(data.sentimentDistribution || calcDistribution(fetched));
      toast.success(`Analyzed ${fetched.length} articles!`, { id: searchToast });

      queryClient.invalidateQueries(['dashboardInit']);
      loadForecastAndDigest(fetched, query);
    } catch (err) {
      const msg = err.friendlyMessage || err.response?.data?.error || err.message || 'Failed to fetch news.';
      setManualError(msg);
      toast.error(msg, { id: searchToast });
    } finally {
      setSearchLoading(false);
      setAnalysisProgress(null);
      if (socket) socket.off('analysis_progress');
    }
  };

  const handleExport = () => {
    const filename = isHistoryView ? 'malaysia-news-history.csv' : `sentiment-analysis-${currentQuery}.csv`;
    exportToCSV(articles, filename);
    toast.success('Successfully exported to CSV');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const pdfToast = toast.loading('Generating PDF report...');
    try {
      const response = await api.post('/reports/generate', {
        topic: currentQuery || 'All Topics',
        dateFrom: '',
        dateTo: '',
      }, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `malaysia-news-sentiment-report-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF report downloaded!', { id: pdfToast });
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF report.', { id: pdfToast });
    }
  };

  // Activity 2.3: Memoize filtering logic to prevent unnecessary recalculations
  // TEMPORARY: Mock data for Module 2 testing
  const mockArticles = articles.length === 0 ? [
    { id: 1, title: 'Malaysia GDP grows 5.2%', sentiment: 'Positive', publishedAt: new Date().toISOString(), url: 'https://example.com/1', urlToImage: null, source: { name: 'Test' } },
    { id: 2, title: 'Traffic congestion worsens', sentiment: 'Negative', publishedAt: new Date().toISOString(), url: 'https://example.com/2', urlToImage: null, source: { name: 'Test' } },
    { id: 3, title: 'New highway project', sentiment: 'Neutral', publishedAt: new Date().toISOString(), url: 'https://example.com/3', urlToImage: null, source: { name: 'Test' } },
    { id: 4, title: 'Education reforms praised', sentiment: 'Positive', publishedAt: new Date().toISOString(), url: 'https://example.com/4', urlToImage: null, source: { name: 'Test' } },
    { id: 5, title: 'Inflation concerns', sentiment: 'Negative', publishedAt: new Date().toISOString(), url: 'https://example.com/5', urlToImage: null, source: { name: 'Test' } },
  ] : articles;

  const filteredArticles = useMemo(() => {
    const data = articles.length === 0 ? mockArticles : articles;
    if (filter === 'All' || filter === 'all') return data;
    return data.filter(a => a.sentiment === filter);
  }, [articles, filter]);



  const counts = {
    total:    stats.total || articles.length,
    positive: stats.sentiments?.Positive || articles.filter(a => a.sentiment === 'Positive').length,
    negative: stats.sentiments?.Negative || articles.filter(a => a.sentiment === 'Negative').length,
    neutral:  stats.sentiments?.Neutral || articles.filter(a => a.sentiment === 'Neutral').length,
    alerts:   stats.alerts || articles.filter(a => a.isAlert).length,
  };

  const KPI = [
    { 
      label: t('totalArticles'), 
      value: counts.total, 
      color: 'text-white', 
      gradient: 'from-blue-500 via-blue-600 to-blue-700',
      sub: 'articles analyzed', 
      hero: true,
      icon: '📊'
    },
    { 
      label: t('positive'), 
      value: counts.positive, 
      color: 'text-white', 
      gradient: 'from-emerald-500 via-emerald-600 to-emerald-700',
      sub: `${counts.total ? Math.round(counts.positive / counts.total * 100) : 0}% of total`,
      icon: '✅'
    },
    { 
      label: t('negative'), 
      value: counts.negative, 
      color: 'text-white', 
      gradient: 'from-red-500 via-red-600 to-red-700',
      sub: `${counts.total ? Math.round(counts.negative / counts.total * 100) : 0}% of total`,
      icon: '⚠️'
    },
    { 
      label: t('neutral'), 
      value: counts.neutral, 
      color: 'text-white', 
      gradient: 'from-amber-500 via-amber-600 to-amber-700',
      sub: `${counts.total ? Math.round(counts.neutral / counts.total * 100) : 0}% of total`,
      icon: '➖'
    },
  ];

  // Track previous tab index for slide direction
  const prevTabIndex = useRef(0);
  const MOBILE_TAB_KEYS = ['overview', 'charts', 'ai'];
  const currentTabIndex = MOBILE_TAB_KEYS.indexOf(mobileTab);
  const slideDirection = currentTabIndex > prevTabIndex.current ? 1 : -1;
  
  useEffect(() => {
    prevTabIndex.current = currentTabIndex;
  }, [currentTabIndex]);

  // Activity 2.4: Responsive slide offset based on screen width
  const slideVariants = {
    enter: (direction) => ({ 
      x: direction > 0 ? (window.innerWidth < 375 ? 60 : 80) : (window.innerWidth < 375 ? -60 : -80), 
      opacity: 0 
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ 
      x: direction > 0 ? (window.innerWidth < 375 ? -60 : -80) : (window.innerWidth < 375 ? 60 : 80), 
      opacity: 0 
    }),
  };

  // Click-to-filter on pie chart (Activity 2.2 - Toggle behaviour)
  const handlePieSegmentClick = (sentimentName) => {
    // Toggle: if already filtered by this sentiment, reset to 'all'
    setFilter(filter === sentimentName ? 'All' : sentimentName);
  };

  // Click-to-filter on KPI cards (Activity 1.1 - Perfective Maintenance)
  const handleKpiClick = (sentimentLabel) => {
    // Map KPI label to sentiment filter value
    const labelToSentiment = {
      'positive': 'Positive',
      'negative': 'Negative', 
      'neutral': 'Neutral'
    };
    
    const sentimentValue = labelToSentiment[sentimentLabel.toLowerCase()];
    if (sentimentValue) {
      // Toggle: if already filtered by this sentiment, reset to 'all'
      setFilter(filter === sentimentValue ? 'All' : sentimentValue);
    }
  };

  const isLoading = initLoading || searchLoading;

  // Animation variants - subtle
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.02 }
    }
  };

  const kpiItemVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: { 
      opacity: 1, y: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const chartVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const articleVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { 
      opacity: 1, y: 0,
      transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
    }
  };

  // Section header component
  const SectionHeader = ({ title, badge, children }) => (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
        {title}
        {badge !== undefined && (
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full normal-case tracking-normal">{badge}</span>
        )}
      </h2>
      {children}
    </div>
  );

  return (
    <div
      className="relative"
      onTouchStart={(e) => { pullTouchStart(e); swipeTouchStart(e); }}
      onTouchMove={pullTouchMove}
      onTouchEnd={(e) => { pullTouchEnd(e); swipeTouchEnd(e); }}
    >
      {/* Pull-to-refresh indicator */}
      {isMobile && (pullDistance > 0 || isRefreshing) && (
        <div className="flex items-center justify-center overflow-hidden transition-all" style={{ height: pullDistance, opacity: Math.min(pullDistance / 80, 1) }}>
          <div className={`text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 3}deg)` }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </div>
        </div>
      )}

      <AnalyzingOverlay progress={analysisProgress} />

      {/* Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-start justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-ink dark:text-paper tracking-tight font-display">
            {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">
            Malaysia News Sentiment Analysis
          </p>
        </div>
        
        {/* Language Toggle */}
        <button
          onClick={() => setLang(lang === 'en' ? 'ms' : 'en')}
          className="text-xs font-medium uppercase tracking-wider text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-colors font-sans"
        >
          <Globe size={14} />
          <span>{lang === 'en' ? 'BM' : 'ENG'}</span>
        </button>
      </motion.div>

      <SearchBarClean onSearch={handleSearch} loading={searchLoading} />

      {/* Dashboard Summary Banner */}
      <DashboardSummary distribution={distribution} keywords={keywords} articles={articles} />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 px-4 py-3 border-l-3 border-red-600 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm font-sans"
          role="alert"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </motion.div>
      )}

      {/* Content */}
      <div className="mt-8 transition-opacity">
        {/* Full-page skeleton for initial load with no cached data */}
        {initLoading && articles.length === 0 && !error && (
          <DashboardSkeleton />
        )}

        {/* Empty State */}
        {!error && !isLoading && articles.length === 0 && !initLoading && (
          <EmptyState />
        )}

        {!error && (articles.length > 0 || (isLoading && !initLoading)) && (
          <>
            {/* View Banner - Compact toolbar */}
            <Skeleton name="dash-banner" loading={isLoading}>
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${CARD} flex flex-wrap items-center gap-3 px-4 py-2.5 mb-8`}
              >
                {isHistoryView ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Clock size={14} className="text-gray-400" />
                    <span>Showing <strong className="text-gray-900 dark:text-white">{articles.length}</strong> analyses</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Search size={14} className="text-gray-400" />
                    <span>Results for <strong className="text-gray-900 dark:text-white">"{currentQuery}"</strong></span>
                    <button 
                      onClick={() => { setIsHistoryView(true); setManualError(''); }}
                      className="ml-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <ArrowLeft size={12} /> Back
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  {isHistoryView && (
                    <div className="flex items-center gap-0">
                      {TIME_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          className={`px-2 text-xs font-medium uppercase tracking-wider transition-colors font-sans ${
                            timeframe === opt.key 
                              ? 'text-ink dark:text-paper font-bold' : 'text-ink-faint hover:text-ink-muted' 
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                          }`}
                          onClick={() => { setTimeframe(opt.key); setPage(1); }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Desktop action buttons - icon-only for cleanliness */}
                  <div className="hidden md:flex items-center gap-1 border-l border-gray-200 dark:border-[#2a2a2a] pl-2 ml-1">
                    <button onClick={() => setShowCustomizer(true)} className="p-1.5 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors" title="Customize">
                      <Settings2 size={14} />
                    </button>
                    <button onClick={handleManualForecast} className="p-1.5 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors" title="AI Forecast">
                      <Sparkles size={14} />
                    </button>
                    <ExportPPT articles={articles} distribution={distribution} sources={sources} query={currentQuery} />
                    <button onClick={handleDownloadPDF} className="p-1.5 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors" title="Download PDF">
                      <FileDown size={14} />
                    </button>
                    <button onClick={handlePrint} className="p-1.5 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors" title="Print Report">
                      <Printer size={14} />
                    </button>
                    <button onClick={handleExport} className="p-1.5 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors" title="Export CSV">
                      <Download size={14} />
                    </button>
                  </div>
                  {/* Mobile: only customize + AI forecast inline, rest in FAB */}
                  <div className="flex md:hidden items-center gap-1">
                    <button onClick={() => setShowCustomizer(true)} className="p-1.5 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors">
                      <Settings2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </Skeleton>

            {/* Mobile Tab Layout */}
            {isMobile ? (
              <>
                <div className={`${CARD} flex gap-1 p-1 mb-5`}>
                  {[
                    { key: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
                    { key: 'charts', label: 'Charts', icon: <TrendingUp size={14} /> },
                    { key: 'ai', label: 'AI Insights', icon: <Brain size={14} /> },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        mobileTab === tab.key
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                      onClick={() => handleTabSwitch(tab.key)}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait" custom={slideDirection}>
                {mobileTab === 'overview' && (
                  <motion.div
                    key="overview"
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  >
                  <div className="space-y-6">
                    {/* KPI Cards - PROPER DESIGN */}
                    <div>
                      <SectionHeader title="Key Metrics" />
                      <Skeleton name="kpi-row" loading={isLoading}>
                        <motion.div 
                          className="space-y-5"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {/* Main Stats Row */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Total Articles */}
                            <motion.div 
                              className="md:col-span-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 relative overflow-hidden"
                              variants={kpiItemVariants}
                              whileHover={{ y: -2 }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Total Articles Analyzed
                                  </div>
                                  <div className="text-5xl font-black text-slate-900 dark:text-white mb-1">
                                    {counts.total.toLocaleString()}
                                  </div>
                                  <div className="text-sm text-slate-600 dark:text-slate-400">
                                    Complete dataset coverage
                                  </div>
                                </div>
                                <div className="hidden md:flex items-center gap-8">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-emerald-600">{counts.positive}</div>
                                    <div className="text-xs text-slate-500">Positive</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">{counts.negative}</div>
                                    <div className="text-xs text-slate-500">Negative</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-amber-600">{counts.neutral}</div>
                                    <div className="text-xs text-slate-500">Neutral</div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>

                          {/* Sentiment Cards Row */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Positive */}
                            <motion.div 
                              className="bg-white dark:bg-slate-800 border-l-4 border-emerald-500 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-shadow"
                              variants={kpiItemVariants}
                              whileHover={{ x: 4 }}
                              onClick={() => handleKpiClick('positive')}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Positive Sentiment
                                  </span>
                                </div>
                                <div className={`text-xs font-semibold px-2 py-1 rounded-md ${
                                  filter === 'Positive' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                }`}>
                                  {counts.total ? Math.round(counts.positive / counts.total * 100) : 0}%
                                </div>
                              </div>
                              <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                                {counts.positive.toLocaleString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                                    style={{ width: `${counts.total ? (counts.positive / counts.total * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            </motion.div>

                            {/* Negative */}
                            <motion.div 
                              className="bg-white dark:bg-slate-800 border-l-4 border-red-500 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-shadow"
                              variants={kpiItemVariants}
                              whileHover={{ x: 4 }}
                              onClick={() => handleKpiClick('negative')}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Negative Sentiment
                                  </span>
                                </div>
                                <div className={`text-xs font-semibold px-2 py-1 rounded-md ${
                                  filter === 'Negative' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                }`}>
                                  {counts.total ? Math.round(counts.negative / counts.total * 100) : 0}%
                                </div>
                              </div>
                              <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                                {counts.negative.toLocaleString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                                    style={{ width: `${counts.total ? (counts.negative / counts.total * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            </motion.div>

                            {/* Neutral */}
                            <motion.div 
                              className="bg-white dark:bg-slate-800 border-l-4 border-amber-500 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-shadow"
                              variants={kpiItemVariants}
                              whileHover={{ x: 4 }}
                              onClick={() => handleKpiClick('neutral')}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Neutral Sentiment
                                  </span>
                                </div>
                                <div className={`text-xs font-semibold px-2 py-1 rounded-md ${
                                  filter === 'Neutral' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                }`}>
                                  {counts.total ? Math.round(counts.neutral / counts.total * 100) : 0}%
                                </div>
                              </div>
                              <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                                {counts.neutral.toLocaleString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                                    style={{ width: `${counts.total ? (counts.neutral / counts.total * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                      </Skeleton>
                    </div>
                    {/* Pie Chart */}
                    <Skeleton name="charts-grid" loading={isLoading}>
                      <motion.div 
                        className={`${CARD} p-4`}
                        variants={chartVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <InlineErrorBoundary name="Pie Chart">
                          <SentimentDonutChart distribution={chartDistribution} onSegmentClick={handlePieSegmentClick} activeFilter={filter} />
                        </InlineErrorBoundary>
                      </motion.div>
                    </Skeleton>

                    {/* Articles */}
                    <div>
                      <SectionHeader title="Recent Articles" badge={filteredArticles.length} />
                      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide -mx-1 px-1">
                        {FILTER_OPTIONS.map(opt => (
                          <button 
                            key={opt.key} 
                            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                              filter === opt.key 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                            }`}
                            onClick={() => setFilter(opt.key)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <motion.div 
                        className="space-y-3"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <Skeleton name="article-card" loading={isLoading || historyLoading} count={3}>
                          {filteredArticles.slice(0, 5).map((article) => (
                            <motion.div
                              key={article._id || article.url}
                              variants={articleVariants}
                            >
                              <ArticleCardCompact 
                                article={article} 
                                onBookmark={toggleBookmark}
                                isBookmarked={user?.bookmarks?.includes(article._id || article.id)}
                              />
                            </motion.div>
                          ))}
                        </Skeleton>
                      </motion.div>

                      {isHistoryView && stats.total > LIMIT && (
                        <div className="flex items-center justify-center gap-4 mt-6">
                          <button 
                            disabled={page === 1 || isLoading} 
                            onClick={() => handlePageChange(page - 1)}
                            className={`${CARD} flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 disabled:opacity-40 transition-colors`}
                          >
                            <ChevronLeft size={14} /> Prev
                          </button>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            <strong className="text-gray-900 dark:text-white">{page}</strong> / {Math.ceil(stats.total / LIMIT)}
                          </span>
                          <button 
                            disabled={page >= Math.ceil(stats.total / LIMIT) || isLoading} 
                            onClick={() => handlePageChange(page + 1)}
                            className={`${CARD} flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 disabled:opacity-40 transition-colors`}
                          >
                            Next <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  </motion.div>
                )}

                {mobileTab === 'charts' && (
                  <motion.div
                    key="charts"
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  >
                  <div className="space-y-5">
                    {articles.length === 0 && !isLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                        <BarChart3 size={48} strokeWidth={1.5} />
                        <p className="mt-3 font-medium">No chart data available</p>
                        <span className="text-xs mt-1">Search or analyze news to see charts</span>
                      </div>
                    ) : (
                      <Skeleton name="charts-grid" loading={isLoading}>
                        <motion.div 
                          className="space-y-4"
                          variants={chartVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <SectionHeader title="Charts" />
                          <div className={`${CARD} p-4`}>
                            <Suspense fallback={<ChartFallback />}>
                              <InlineErrorBoundary name="Bar Chart">
                                <SentimentHorizontalBar distribution={chartDistribution} />
                              </InlineErrorBoundary>
                            </Suspense>
                          </div>
                          <div className={`${CARD} p-4`}>
                            <Suspense fallback={<ChartFallback />}>
                              <InlineErrorBoundary name="Trend Chart">
                                <SentimentAreaChart trendsData={trends} />
                              </InlineErrorBoundary>
                            </Suspense>
                          </div>
                          <div className={`${CARD} p-4`}>
                            <Suspense fallback={<ChartFallback />}>
                              <InlineErrorBoundary name="Sentiment Map">
                                <SentimentHeatmap data={regionalData} loading={isLoading} />
                              </InlineErrorBoundary>
                            </Suspense>
                          </div>
                          <div className={`${CARD} p-4`}>
                            <Suspense fallback={<ChartFallback />}>
                              <InlineErrorBoundary name="Sources Chart">
                                <TopSourcesHorizontal sourcesData={sources} />
                              </InlineErrorBoundary>
                            </Suspense>
                          </div>
                        </motion.div>
                      </Skeleton>
                    )}
                  </div>
                  </motion.div>
                )}

                {mobileTab === 'ai' && (
                  <motion.div
                    key="ai"
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  >
                  <div className="space-y-5">
                    <SectionHeader title="AI Insights" />
                    {(digest || digestLoading) && (
                      <AiDigestCard digest={digest} loading={digestLoading} topic={currentQuery} />
                    )}
                    <InlineErrorBoundary name="AI Forecast">
                      <ForecastCard forecast={forecast} loading={forecastLoading} topic={currentQuery} />
                    </InlineErrorBoundary>
                    <Skeleton name="word-cloud" loading={isLoading}>
                      <div className={`${CARD} p-4`}>
                        <InlineErrorBoundary name="Word Cloud">
                          <WordCloud words={keywords} />
                        </InlineErrorBoundary>
                      </div>
                    </Skeleton>
                    <div className={`${CARD} p-4`}>
                      <InlineErrorBoundary name="Source Credibility">
                        <SourceCredibility />
                      </InlineErrorBoundary>
                    </div>
                  </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </>
            ) : (
              /* Desktop Layout */
              <>
                <div className="grid grid-cols-[1fr_300px] gap-8">
                  <div className="space-y-8">
                    {(digest || digestLoading) && !isHistoryView && (
                      <AiDigestCard digest={digest} loading={digestLoading} topic={currentQuery} />
                    )}
                    
                    {/* KPI Cards - PROPER DESIGN */}
                    <div>
                      <SectionHeader title="Key Metrics" />
                      <Skeleton name="kpi-row" loading={isLoading}>
                        <motion.div 
                          className="space-y-5"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {/* Main Stats Row */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Total Articles */}
                            <motion.div 
                              className="md:col-span-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 relative overflow-hidden"
                              variants={kpiItemVariants}
                              whileHover={{ y: -2 }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Total Articles Analyzed
                                  </div>
                                  <div className="text-5xl font-black text-slate-900 dark:text-white mb-1">
                                    {counts.total.toLocaleString()}
                                  </div>
                                  <div className="text-sm text-slate-600 dark:text-slate-400">
                                    Complete dataset coverage
                                  </div>
                                </div>
                                <div className="hidden md:flex items-center gap-8">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-emerald-600">{counts.positive}</div>
                                    <div className="text-xs text-slate-500">Positive</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">{counts.negative}</div>
                                    <div className="text-xs text-slate-500">Negative</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-amber-600">{counts.neutral}</div>
                                    <div className="text-xs text-slate-500">Neutral</div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>

                          {/* Sentiment Cards Row */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Positive */}
                            <motion.div 
                              className="bg-white dark:bg-slate-800 border-l-4 border-emerald-500 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-shadow"
                              variants={kpiItemVariants}
                              whileHover={{ x: 4 }}
                              onClick={() => handleKpiClick('positive')}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Positive Sentiment
                                  </span>
                                </div>
                                <div className={`text-xs font-semibold px-2 py-1 rounded-md ${
                                  filter === 'Positive' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                }`}>
                                  {counts.total ? Math.round(counts.positive / counts.total * 100) : 0}%
                                </div>
                              </div>
                              <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                                {counts.positive.toLocaleString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                                    style={{ width: `${counts.total ? (counts.positive / counts.total * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            </motion.div>

                            {/* Negative */}
                            <motion.div 
                              className="bg-white dark:bg-slate-800 border-l-4 border-red-500 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-shadow"
                              variants={kpiItemVariants}
                              whileHover={{ x: 4 }}
                              onClick={() => handleKpiClick('negative')}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Negative Sentiment
                                  </span>
                                </div>
                                <div className={`text-xs font-semibold px-2 py-1 rounded-md ${
                                  filter === 'Negative' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                }`}>
                                  {counts.total ? Math.round(counts.negative / counts.total * 100) : 0}%
                                </div>
                              </div>
                              <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                                {counts.negative.toLocaleString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                                    style={{ width: `${counts.total ? (counts.negative / counts.total * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            </motion.div>

                            {/* Neutral */}
                            <motion.div 
                              className="bg-white dark:bg-slate-800 border-l-4 border-amber-500 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-shadow"
                              variants={kpiItemVariants}
                              whileHover={{ x: 4 }}
                              onClick={() => handleKpiClick('neutral')}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Neutral Sentiment
                                  </span>
                                </div>
                                <div className={`text-xs font-semibold px-2 py-1 rounded-md ${
                                  filter === 'Neutral' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                }`}>
                                  {counts.total ? Math.round(counts.neutral / counts.total * 100) : 0}%
                                </div>
                              </div>
                              <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                                {counts.neutral.toLocaleString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                                    style={{ width: `${counts.total ? (counts.neutral / counts.total * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                      </Skeleton>
                    </div>
                    {/* Charts Grid */}
                    <div>
                      <SectionHeader title="Charts" />
                      <Skeleton name="charts-grid" loading={isLoading}>
                        <motion.div 
                          className="grid grid-cols-2 gap-5"
                          variants={chartVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <div className={`${CARD} p-5 min-h-[280px] flex flex-col`}>
                            <InlineErrorBoundary name="Pie Chart">
                              <SentimentDonutChart distribution={chartDistribution} onSegmentClick={handlePieSegmentClick} activeFilter={filter} />
                            </InlineErrorBoundary>
                          </div>
                          <div className={`${CARD} p-5 min-h-[280px] flex flex-col`}>
                            <Suspense fallback={<ChartFallback />}>
                              <InlineErrorBoundary name="Bar Chart">
                                <SentimentHorizontalBar distribution={chartDistribution} />
                              </InlineErrorBoundary>
                            </Suspense>
                          </div>
                          <div className={`${CARD} p-5 min-h-[280px] flex flex-col`}>
                            <Suspense fallback={<ChartFallback />}>
                              <InlineErrorBoundary name="Sentiment Map">
                                <SentimentHeatmap data={regionalData} loading={isLoading} />
                              </InlineErrorBoundary>
                            </Suspense>
                          </div>
                          <div className={`${CARD} p-5 min-h-[280px] flex flex-col`}>
                            <Suspense fallback={<ChartFallback />}>
                              <InlineErrorBoundary name="Trend Chart">
                                <SentimentAreaChart trendsData={trends} />
                              </InlineErrorBoundary>
                            </Suspense>
                          </div>
                          <div className={`col-span-2 ${CARD} p-5`}>
                            <Suspense fallback={<ChartFallback />}>
                              <InlineErrorBoundary name="Sources Chart">
                                <TopSourcesHorizontal sourcesData={sources} />
                              </InlineErrorBoundary>
                            </Suspense>
                          </div>
                        </motion.div>
                      </Skeleton>
                    </div>
                    
                    {/* Forecast */}
                    <InlineErrorBoundary name="AI Forecast">
                      <ForecastCard forecast={forecast} loading={forecastLoading} topic={currentQuery} />
                    </InlineErrorBoundary>
                  </div>
                  
                  {/* Sidebar */}
                  <aside className="space-y-5">
                    <div className="sticky top-6 space-y-5">
                      <Skeleton name="word-cloud" loading={isLoading}>
                        <div className={`${CARD} p-5`}>
                          <InlineErrorBoundary name="Word Cloud">
                            <WordCloud words={keywords} />
                          </InlineErrorBoundary>
                        </div>
                      </Skeleton>
                      <div className={`${CARD} p-5`}>
                        <InlineErrorBoundary name="Source Credibility">
                          <SourceCredibility />
                        </InlineErrorBoundary>
                      </div>
                    </div>
                  </aside>
                </div>

                {/* Articles Section */}
                <div className="mt-10" id="analysis-results">
                  <SectionHeader title="Recent Articles" badge={filteredArticles.length}>
                    <div className="flex gap-1.5">
                      {FILTER_OPTIONS.map(opt => (
                        <button 
                          key={opt.key} 
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            filter === opt.key 
                              ? 'bg-blue-600 text-white shadow-sm' 
                              : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                          }`}
                          onClick={() => setFilter(opt.key)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </SectionHeader>

                  <motion.div 
                    className="space-y-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Skeleton name="article-card" loading={isLoading || historyLoading} count={3}>
                      {filteredArticles.length > 20 ? (
                        <VirtualList
                          height={600}
                          itemCount={filteredArticles.length}
                          itemSize={140}
                          width="100%"
                          style={{ overflow: 'auto' }}
                        >
                          {({ index, style }) => {
                            const article = filteredArticles[index];
                            return (
                              <div style={style} key={article._id || article.url}>
                                <ArticleCardCompact 
                                  article={article} 
                                  onBookmark={toggleBookmark}
                                  isBookmarked={user?.bookmarks?.includes(article._id || article.id)}
                                />
                              </div>
                            );
                          }}
                        </VirtualList>
                      ) : (
                        filteredArticles.map((article) => (
                          <motion.div
                            key={article._id || article.url}
                            variants={articleVariants}
                          >
                            <ArticleCardCompact 
                              article={article} 
                              onBookmark={toggleBookmark}
                              isBookmarked={user?.bookmarks?.includes(article._id || article.id)}
                            />
                          </motion.div>
                        ))
                      )}
                    </Skeleton>
                  </motion.div>

                  {/* Pagination - Centered */}
                  {isHistoryView && stats.total > LIMIT && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                      <button 
                        disabled={page === 1 || isLoading} 
                        onClick={() => handlePageChange(page - 1)}
                        className={`${CARD} flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}
                      >
                        <ChevronLeft size={16} /> Previous
                      </button>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Page <strong className="text-gray-900 dark:text-white">{page}</strong> of {Math.ceil(stats.total / LIMIT)}
                        <span className="text-xs ml-2 text-gray-400">({stats.total} total)</span>
                      </div>
                      <button 
                        disabled={page >= Math.ceil(stats.total / LIMIT) || isLoading} 
                        onClick={() => handlePageChange(page + 1)}
                        className={`${CARD} flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Mobile FABs */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30 md:hidden">
        <AnimatePresence>
          {showFabTooltip && (
            <motion.div
              className="absolute right-14 top-0 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >Export</motion.div>
          )}
        </AnimatePresence>
        <motion.button
          className={`w-11 h-11 rounded-full ${CARD} shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300`}
          onClick={() => { hapticImpact('Light'); setShowExportSheet(true); }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Export options"
        >
          <Download size={18} />
        </motion.button>
        <AnimatePresence>
          {showFabTooltip && (
            <motion.div
              className="absolute right-14 bottom-0 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >AI Forecast</motion.div>
          )}
        </AnimatePresence>

        <motion.button
          className="w-12 h-12 rounded-full bg-blue-600 shadow-lg shadow-blue-600/20 flex items-center justify-center text-white"
          onClick={() => { hapticImpact('Medium'); handleManualForecast(); }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="AI Forecast"
        >
          <Sparkles size={20} />
        </motion.button>
      </div>

      {/* Export Bottom Sheet */}
      <AnimatePresence>
        {showExportSheet && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExportSheet(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] rounded-t-3xl z-50 p-6 pb-8"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) setShowExportSheet(false);
              }}
            >
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Export Options</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left" onClick={() => { document.querySelector('.export-ppt-trigger')?.click(); setShowExportSheet(false); }}>
                  <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <Printer size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Export PPTX</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left" onClick={() => { handlePrint(); setShowExportSheet(false); }}>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Printer size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Print Report</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left" onClick={() => { handleExport(); setShowExportSheet(false); }}>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <FileDown size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Export CSV</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left" onClick={() => { handleDownloadPDF(); setShowExportSheet(false); }}>
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                    <FileDown size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Download PDF Report</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ScrollToTop />

      {/* Dashboard Customizer Modal */}
      <DashboardCustomizer
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        onSave={(layout) => setDashboardLayout(layout)}
      />
    </div>
  );
};

export default Dashboard;
