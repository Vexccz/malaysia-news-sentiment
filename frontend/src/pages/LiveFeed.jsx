import React, { useState, useEffect, useRef, useCallback } from 'react';
import ExportMenu from '../components/ExportMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

/* Page Interactive Animations */
const PAGE_ANIMS = `
@keyframes slideInTop { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
@keyframes sentimentFlash { 0%{filter:brightness(1)} 50%{filter:brightness(1.6)} 100%{filter:brightness(1)} }
`;
const AnimCSS = () => <style dangerouslySetInnerHTML={{__html: PAGE_ANIMS}}/>;



const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api/v1';

/* ── Constants ──────────────────────────────────────────────── */
const SOURCE_CHIPS = [
  'Bernama', 'The Star', 'Malaysiakini', 'NST', 'Astro Awani', 'FMT',
];

/* ── Helpers ─────────────────────────────────────────────────── */
const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const sentimentColor = (s) =>
  s === 'Positive' ? 'text-green-700 dark:text-green-400'
  : s === 'Negative' ? 'text-red-700 dark:text-red-400'
  : 'text-gray-500 dark:text-gray-400';

const sentimentDot = (s) =>
  s === 'Positive' ? 'bg-green-500' : s === 'Negative' ? 'bg-red-500' : 'bg-gray-400';

/* ── Sentiment glow classes for new-article pulse ───────────── */
const sentimentGlow = (s) =>
  s === 'Positive' ? 'shadow-[0_0_6px_2px_rgba(34,197,94,0.6)] dark:shadow-[0_0_8px_3px_rgba(34,197,94,0.5)]'
  : s === 'Negative' ? 'shadow-[0_0_6px_2px_rgba(239,68,68,0.6)] dark:shadow-[0_0_8px_3px_rgba(239,68,68,0.5)]'
  : 'shadow-[0_0_6px_2px_rgba(156,163,175,0.5)] dark:shadow-[0_0_8px_3px_rgba(156,163,175,0.4)]';

/* ── Breaking threshold ─────────────────────────────────────── */
const isBreakingArticle = (a) =>
  a.isAlert || (typeof a.sentimentScore === 'number' && a.sentimentScore < -0.5);

/* ── Connection Badge ────────────────────────────────────────── */
const ConnectionBadge = ({ status }) => {
  const configs = {
    connected: { label: 'LIVE', dot: 'bg-green-600', text: 'text-green-700 dark:text-green-400' },
    connecting: { label: 'CONNECTING', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
    disconnected: { label: 'OFFLINE', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
  };
  const c = configs[status] || configs.disconnected;
  return (
    <div className={`flex items-center gap-1.5 ${c.text}`}>
      <span className="relative flex h-2 w-2">
        {status === 'connected' && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${c.dot} opacity-60`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${c.dot}`} />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-sans">{c.label}</span>
    </div>
  );
};

/* ── Live Ticker ─────────────────────────────────────────────── */
const LiveTicker = ({ articles }) => {
  if (!articles.length) return null;
  const doubled = [...articles, ...articles];
  return (
    <div className="w-full overflow-hidden border-y-2 border-ink dark:border-paper bg-ink dark:bg-paper">
      <div className="flex items-center">
      <motion.div
        className="flex gap-0 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: articles.length * 6, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((a, i) => (
          <a
            key={`${a._id || i}-${i}`}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-5 py-2 no-underline border-r border-white/20 dark:border-black/20"
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sentimentDot(a.sentiment)}`} />
            <span className="text-[10px] font-bold text-white dark:text-black font-sans tracking-wide line-clamp-1 max-w-xs uppercase">
              {a.title}
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/50 dark:text-black/50 font-sans flex-shrink-0">
              {a.source}
            </span>
          </a>
        ))}
      </motion.div>
      </div>
    </div>
  );
};

/* ── Stat Card ───────────────────────────────────────────────── */
const StatCard = ({ label, value, sub }) => (
  <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card p-4">
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans block mb-1.5">{label}</span>
    <div className="text-2xl font-black text-ink dark:text-paper font-display tracking-tight">{value}</div>
    {sub && <div className="text-[10px] text-ink-faint font-sans mt-0.5">{sub}</div>}
  </div>
);

/* ── Sentiment Bar ───────────────────────────────────────────── */
const SentimentBar = ({ dist, t }) => {
  const total = (dist.Positive || 0) + (dist.Negative || 0) + (dist.Neutral || 0) || 1;
  const pcts = {
    pos: ((dist.Positive || 0) / total) * 100,
    neg: ((dist.Negative || 0) / total) * 100,
    neu: ((dist.Neutral || 0) / total) * 100,
  };
  return (
    <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card p-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans block mb-3">{t('sentimentDist24h')}</span>
      <div className="flex h-5 w-full overflow-hidden mb-2.5">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pcts.pos}%` }} transition={{ duration: 0.8 }} className="bg-green-500" />
        <motion.div initial={{ width: 0 }} animate={{ width: `${pcts.neu}%` }} transition={{ duration: 0.8, delay: 0.1 }} className="bg-gray-400" />
        <motion.div initial={{ width: 0 }} animate={{ width: `${pcts.neg}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="bg-red-500" />
      </div>
      <div className="flex justify-between text-[10px] font-sans">
        <span className="text-green-700 dark:text-green-400 font-semibold">{dist.Positive || 0} {t('positive')} ({pcts.pos.toFixed(1)}%)</span>
        <span className="text-gray-500 dark:text-gray-400 font-semibold">{dist.Neutral || 0} {t('neutral')} ({pcts.neu.toFixed(1)}%)</span>
        <span className="text-red-700 dark:text-red-400 font-semibold">{dist.Negative || 0} {t('negative')} ({pcts.neg.toFixed(1)}%)</span>
      </div>
    </div>
  );
};

/* ── Hourly Chart ────────────────────────────────────────────── */
const HourlyChart = ({ breakdown, t }) => {
  if (!breakdown?.length) return null;
  const maxCount = Math.max(...breakdown.map(h => h.count), 1);
  return (
    <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card p-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans block mb-3">{t('hourlyActivity24h')}</span>
      <div className="flex items-end gap-px h-16">
        {Array.from({ length: 24 }, (_, i) => {
          const bucket = breakdown.find(h => h.hour === i);
          const count = bucket?.count || 0;
          const height = (count / maxCount) * 100;
          return (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(height, 3)}%` }}
              transition={{ duration: 0.5, delay: i * 0.02 }}
              className="flex-1 bg-ink/70 dark:bg-paper/70 relative group cursor-default"
              title={`${i}:00 — ${count} ${t('articles')}`}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-sans text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {count}
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[8px] text-ink-faint font-sans">00:00</span>
        <span className="text-[8px] text-ink-faint font-sans">12:00</span>
        <span className="text-[8px] text-ink-faint font-sans">23:00</span>
      </div>
    </div>
  );
};

/* ── Article Card ────────────────────────────────────────────── */
const ArticleCard = ({ article, isNew, t }) => {
  const breaking = isBreakingArticle(article);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block no-underline border-b border-paper-line dark:border-paper-dark-line last:border-b-0 px-5 py-3.5 transition-colors hover:bg-paper/50 dark:hover:bg-paper-dark/50
        ${isNew ? 'bg-accent/5 dark:bg-accent/10' : ''}
        ${breaking ? 'border-l-[3px] border-l-red-600 dark:border-l-red-500 bg-red-50/40 dark:bg-red-950/20' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          <span className={`w-2 h-2 rounded-full inline-block ${sentimentDot(article.sentiment)} ${isNew ? 'animate-pulse' : ''}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {breaking && (
              <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-[0.15em] text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 font-sans animate-pulse">
                {t('breaking')}
              </span>
            )}
            <h3 className="text-[13px] font-semibold text-ink dark:text-paper leading-snug line-clamp-2 font-sans">
              {article.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-muted dark:text-ink-faint font-sans">
              {article.source}
            </span>
            <span className="text-ink-faint">·</span>
            <span className="text-[10px] text-ink-faint font-sans">{timeAgo(article.publishedAt)}</span>
            {article.sentiment && (
              <>
                <span className="text-ink-faint">·</span>
                <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-[0.15em] font-sans px-1.5 py-0.5 transition-shadow duration-700
                  ${sentimentColor(article.sentiment)}
                  ${isNew ? sentimentGlow(article.sentiment) : ''}
                `}>
                  {article.sentiment}
                </span>
              </>
            )}
            {article.language && (
              <>
                <span className="text-ink-faint">·</span>
                <span className="text-[9px] font-medium text-ink-faint uppercase font-sans">
                  {article.language === 'ms' ? 'BM' : 'EN'}
                </span>
              </>
            )}
          </div>
        </div>
        {isNew && (
          <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-[0.2em] text-accent bg-accent/10 px-2 py-0.5 font-sans">NEW</span>
        )}
      </div>
    </a>
  );
};

/* ── Source Filter Chips ─────────────────────────────────────── */
const SourceChips = ({ sources, activeSource, onSelect, t }) => (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mr-1">
      {t('filterSources')}:
    </span>
    <button
      onClick={() => onSelect('all')}
      className={`text-[10px] font-bold uppercase tracking-[0.12em] font-sans px-3 py-1 border transition-colors cursor-pointer
        ${activeSource === 'all'
          ? 'border-ink dark:border-paper bg-ink dark:bg-paper text-paper dark:text-ink'
          : 'border-paper-line dark:border-paper-dark-line text-ink-muted dark:text-ink-faint hover:border-ink-muted dark:hover:border-ink-faint'
        }`}
    >
      {t('allSources')}
    </button>
    {sources.map((src) => (
      <button
        key={src}
        onClick={() => onSelect(src)}
        className={`text-[10px] font-bold uppercase tracking-[0.12em] font-sans px-3 py-1 border transition-colors cursor-pointer
          ${activeSource === src
            ? 'border-ink dark:border-paper bg-ink dark:bg-paper text-paper dark:text-ink'
            : 'border-paper-line dark:border-paper-dark-line text-ink-muted dark:text-ink-faint hover:border-ink-muted dark:hover:border-ink-faint'
          }`}
      >
        {src}
      </button>
    ))}
  </div>
);

/* ── Main Component ──────────────────────────────────────────── */
const LiveFeed = () => {
  const socket = useSocket();
  const [stats, setStats] = useState(null);
  const { t, lang } = useLanguage();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [langFilter, setLangFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [newCount, setNewCount] = useState(0);
  const [newIds, setNewIds] = useState(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const sseRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const autoScrollRef = useRef(autoScroll);
  const isHoveringRef = useRef(false);
  const autoScrollTimerRef = useRef(null);

  useEffect(() => { autoScrollRef.current = autoScroll; }, [autoScroll]);

  /* ── Auto-scroll effect ─────────────────────────────────────── */
  useEffect(() => {
    if (!autoScroll || !listRef.current) return;

    const el = listRef.current;
    const tick = () => {
      if (isHoveringRef.current) return;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      if (atBottom) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ top: 1, behavior: 'auto' });
      }
    };

    autoScrollTimerRef.current = setInterval(tick, 80);
    return () => clearInterval(autoScrollTimerRef.current);
  }, [autoScroll]);

  // Fetch stats from monitor endpoint
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/monitor/stats`, { headers });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        if (data.stats.latestArticles?.length) {
          setArticles(prev => {
            const existingIds = new Set(prev.map(a => a._id || a.url));
            const fresh = data.stats.latestArticles.filter(a => !existingIds.has(a._id || a.url));
            return [...fresh, ...prev].slice(0, 100);
          });
        }
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('[LiveFeed] fetchStats error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // SSE connection from monitor stream
  const connectSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    const token = localStorage.getItem('token');
    const url = token
      ? `${API_BASE}/monitor/stream?token=${token}`
      : `${API_BASE}/monitor/stream`;
    const es = new EventSource(url);
    sseRef.current = es;

    es.onopen = () => setConnectionStatus('connected');
    es.onerror = () => {
      setConnectionStatus('disconnected');
      setTimeout(() => {
        if (sseRef.current === es) connectSSE();
      }, 5000);
    };

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'connected') {
          setConnectionStatus('connected');
        } else if (msg.type === 'new_articles' && msg.articles?.length) {
          const incomingIds = new Set();
          setArticles(prev => {
            const existingIds = new Set(prev.map(a => a._id || a.url));
            const fresh = msg.articles.filter(a => {
              const id = a._id || a.url;
              if (!existingIds.has(id)) {
                incomingIds.add(id);
                return true;
              }
              return false;
            });
            return [...fresh, ...prev].slice(0, 100);
          });
          if (incomingIds.size > 0) {
            setNewIds(prev => new Set([...prev, ...incomingIds]));
            if (!autoScrollRef.current) {
              setNewCount(prev => prev + incomingIds.size);
            }
            setTimeout(() => {
              setNewIds(prev => {
                const next = new Set(prev);
                incomingIds.forEach(id => next.delete(id));
                return next;
              });
            }, 10000);
          }
          setLastUpdate(new Date());
        }
      } catch { /* ignore */ }
    };
  }, []);

  // Socket.IO listener
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.articles?.length) {
        const incomingIds = new Set();
        setArticles(prev => {
          const existingIds = new Set(prev.map(a => a._id || a.url));
          const fresh = data.articles.filter(a => {
            const id = a._id || a.url;
            if (!existingIds.has(id)) {
              incomingIds.add(id);
              return true;
            }
            return false;
          });
          return [...fresh, ...prev].slice(0, 100);
        });
        if (incomingIds.size > 0) {
          setNewIds(prev => new Set([...prev, ...incomingIds]));
          setTimeout(() => {
            setNewIds(prev => {
              const next = new Set(prev);
              incomingIds.forEach(id => next.delete(id));
              return next;
            });
          }, 10000);
        }
        setLastUpdate(new Date());
      }
    };
    socket.on('monitor:new_articles', handler);
    return () => socket.off('monitor:new_articles', handler);
  }, [socket]);

  // Init
  useEffect(() => {
    fetchStats();
    connectSSE();
    refreshTimerRef.current = setInterval(fetchStats, 60000);
    return () => {
      if (sseRef.current) sseRef.current.close();
      clearInterval(refreshTimerRef.current);
    };
  }, [fetchStats, connectSSE]);

  const showNewArticles = () => {
    setNewCount(0);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filteredArticles = articles.filter(a => {
    if (filter !== 'all' && a.sentiment !== filter) return false;
    if (langFilter !== 'all') {
      const artLang = a.language === 'ms' ? 'ms' : 'en';
      if (artLang !== langFilter) return false;
    }
    if (sourceFilter !== 'all') {
      const src = (a.source || '').toLowerCase();
      if (!src.includes(sourceFilter.toLowerCase())) return false;
    }
    return true;
  });

  const tickerArticles = articles.slice(0, 15);

  const filterOptions = [
    { key: 'all', label: t('all') },
    { key: 'Positive', label: t('positive') },
    { key: 'Negative', label: t('negative') },
    { key: 'Neutral', label: t('neutral') },
  ];
  const langOptions = [
    { key: 'all', label: t('all') },
    { key: 'en', label: 'EN' },
    { key: 'ms', label: 'BM' },
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800" />)}
        </div>
        <div className="h-12 bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-200 dark:bg-gray-800" />)}
        </div>
      </div>
    );
  }

  return (
    <><AnimCSS />
    <div className="max-w-4xl mx-auto">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold text-ink dark:text-paper tracking-tight font-display">
              {t('liveFeed')}
            </h1>
            <ConnectionBadge status={connectionStatus} />
          </div>
          <div className="flex items-center gap-3">
            <ExportMenu articles={articles} filenameBase="live-feed" label="Export" />
            <span className="text-[10px] text-ink-faint font-sans">
              {lastUpdate ? `${t('updatedAgo')} ${timeAgo(lastUpdate)}` : `${t('connecting')}`} · {t('autoRefresh60s')}
            </span>
          </div>
        </div>
        <div className="editorial-rule mb-3" />
        <p className="text-[10px] text-ink-muted dark:text-ink-faint uppercase tracking-[0.25em] max-w-xl font-sans">
          {t('liveFeedDesc')}
        </p>
      </div>

      {/* ── Live Ticker ──────────────────────────────────── */}
      {tickerArticles.length > 0 && <LiveTicker articles={tickerArticles} />}

      {/* ── Stats Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <StatCard label={t('articlesPerHour')} value={stats?.articlesPerHour ?? '—'} sub={t('last60Minutes')} />
        <StatCard label={t('today')} value={stats?.totalToday ?? '—'} sub={t('articlesCollected')} />
        <StatCard label={t('activeSources')} value={stats?.activeSources ?? '—'} sub={t('uniquePublishers24h')} />
        <StatCard label={t('alerts')} value={articles.filter(a => isBreakingArticle(a)).length} sub={t('activeAlerts')} />
      </div>

      {/* ── Sentiment Distribution + Hourly ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {stats?.sentimentDistribution && <SentimentBar dist={stats.sentimentDistribution} t={t} />}
        {stats?.hourlyBreakdown?.length > 0 && <HourlyChart breakdown={stats.hourlyBreakdown} t={t} />}
      </div>

      {/* ── Source Filter Chips ───────────────────────────── */}
      <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card mt-5 px-4 py-3">
        <SourceChips
          sources={SOURCE_CHIPS}
          activeSource={sourceFilter}
          onSelect={setSourceFilter}
          t={t}
        />
      </div>

      {/* ── Sentiment / Language Filters ──────────────────── */}
      <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card mt-0 mb-4">
        <div className="flex items-center justify-between px-4 py-2.5 gap-4 flex-wrap">
          <div className="flex items-center">
            {filterOptions.map((s, i) => (
              <React.Fragment key={s.key}>
                {i > 0 && <span className="text-ink-faint mx-1.5">|</span>}
                <button
                  onClick={() => setFilter(s.key)}
                  className={`text-xs font-medium uppercase tracking-wider transition-colors font-sans px-1 ${
                    filter === s.key
                      ? 'text-ink dark:text-paper font-bold'
                      : 'text-ink-faint hover:text-ink-muted dark:hover:text-ink-faint'
                  }`}
                >
                  {s.label}
                </button>
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center">
            {langOptions.map((l, i) => (
              <React.Fragment key={l.key}>
                {i > 0 && <span className="text-ink-faint mx-1.5">|</span>}
                <button
                  onClick={() => setLangFilter(l.key)}
                  className={`text-[11px] font-medium uppercase tracking-wider transition-colors font-sans px-1 ${
                    langFilter === l.key
                      ? 'text-ink dark:text-paper font-bold'
                      : 'text-ink-faint hover:text-ink-muted dark:hover:text-ink-faint'
                  }`}
                >
                  {l.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── New articles banner ──────────────────────────── */}
      <AnimatePresence>
        {newCount > 0 && (
          <motion.button
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onClick={showNewArticles}
            className="w-full py-2.5 border-l-3 border-accent bg-accent/5 dark:bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider hover:bg-accent/10 transition-colors font-sans mb-4"
          >
            {newCount} {t('newArticlesTap')}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Articles list ────────────────────────────────── */}
      <div ref={containerRef} className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
        <div className="px-5 py-2.5 border-b border-paper-line dark:border-paper-dark-line flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">{t('incomingArticles')}</span>
          <span className="text-[10px] text-ink-faint font-sans">{filteredArticles.length} {t('articles')}</span>
        </div>
        <div
          ref={listRef}
          className="max-h-[600px] overflow-y-auto"
          onMouseEnter={() => { isHoveringRef.current = true; }}
          onMouseLeave={() => { isHoveringRef.current = false; }}
        >
          <AnimatePresence initial={false}>
            {filteredArticles.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-sm text-ink-faint font-sans">{t('noArticlesYet')}</p>
                <p className="text-xs text-ink-faint mt-1 font-sans">{t('tryAdjustFilters')}</p>
              </div>
            ) : (
              filteredArticles.map((article) => (
                <motion.div
                  key={article._id || article.url}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <ArticleCard
                    article={article}
                    isNew={newIds.has(article._id || article.url)}
                    t={t}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
    </>
  );
};

export default LiveFeed;
