import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api/v1';
const SOCKET_BASE = import.meta.env.VITE_API_BASE?.replace(/\/api.*$/, '') || 'http://localhost:5000';

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

const sentimentBg = (s) =>
  s === 'Positive' ? 'bg-green-500/10 dark:bg-green-500/15'
  : s === 'Negative' ? 'bg-red-500/10 dark:bg-red-500/15'
  : 'bg-gray-500/10 dark:bg-gray-500/15';

const sentimentDot = (s) =>
  s === 'Positive' ? 'bg-green-500' : s === 'Negative' ? 'bg-red-500' : 'bg-gray-400';

/* ── Connection Status Indicator ────────────────────────────── */
const ConnectionBadge = ({ status }) => {
  const configs = {
    connected: { label: 'LIVE', dot: 'bg-green-500', ring: 'ring-green-500/30', text: 'text-green-700 dark:text-green-400' },
    connecting: { label: 'CONNECTING', dot: 'bg-amber-500', ring: 'ring-amber-500/30', text: 'text-amber-700 dark:text-amber-400' },
    disconnected: { label: 'OFFLINE', dot: 'bg-red-500', ring: 'ring-red-500/30', text: 'text-red-700 dark:text-red-400' },
  };
  const c = configs[status] || configs.disconnected;
  return (
    <div className={`flex items-center gap-2 ${c.text}`}>
      <span className="relative flex h-2.5 w-2.5">
        {status === 'connected' && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${c.dot} opacity-60`} />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${c.dot} ring-2 ${c.ring}`} />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-sans">{c.label}</span>
    </div>
  );
};

/* ── Live Ticker ────────────────────────────────────────────── */
const LiveTicker = ({ articles }) => {
  if (!articles.length) return null;
  const doubled = [...articles, ...articles]; // seamless loop
  return (
    <div className="w-full overflow-hidden border-b-2 border-black dark:border-white bg-black dark:bg-white">
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
            <span className="text-[11px] font-semibold text-white dark:text-black font-sans tracking-wide line-clamp-1 max-w-xs">
              {a.title}
            </span>
            <span className="text-[9px] uppercase tracking-[0.15em] text-white/50 dark:text-black/50 font-sans flex-shrink-0">
              {a.source}
            </span>
          </a>
        ))}
      </motion.div>
    </div>
  );
};

/* ── Stat Card ──────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-1"
  >
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 font-sans">{label}</span>
    </div>
    <div className="text-3xl font-black text-black dark:text-white font-serif tracking-tight">{value}</div>
    {sub && <div className="text-[11px] text-gray-400 dark:text-gray-500 font-sans">{sub}</div>}
  </motion.div>
);

/* ── Sentiment Bar ──────────────────────────────────────────── */
const SentimentBar = ({ dist }) => {
  const total = (dist.Positive || 0) + (dist.Negative || 0) + (dist.Neutral || 0) || 1;
  const pcts = {
    pos: ((dist.Positive || 0) / total) * 100,
    neg: ((dist.Negative || 0) / total) * 100,
    neu: ((dist.Neutral || 0) / total) * 100,
  };
  return (
    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-5">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 font-sans block mb-4">SENTIMENT DISTRIBUTION — 24H</span>
      <div className="flex h-6 w-full overflow-hidden mb-3">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pcts.pos}%` }} transition={{ duration: 0.8 }} className="bg-green-500" />
        <motion.div initial={{ width: 0 }} animate={{ width: `${pcts.neu}%` }} transition={{ duration: 0.8, delay: 0.1 }} className="bg-gray-400" />
        <motion.div initial={{ width: 0 }} animate={{ width: `${pcts.neg}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="bg-red-500" />
      </div>
      <div className="flex justify-between text-[11px] font-sans">
        <span className="text-green-700 dark:text-green-400 font-semibold">{dist.Positive || 0} Positive ({pcts.pos.toFixed(1)}%)</span>
        <span className="text-gray-500 dark:text-gray-400 font-semibold">{dist.Neutral || 0} Neutral ({pcts.neu.toFixed(1)}%)</span>
        <span className="text-red-700 dark:text-red-400 font-semibold">{dist.Negative || 0} Negative ({pcts.neg.toFixed(1)}%)</span>
      </div>
    </div>
  );
};

/* ── Article Row ────────────────────────────────────────────── */
const ArticleRow = ({ article, isNew }) => (
  <motion.a
    href={article.url}
    target="_blank"
    rel="noopener noreferrer"
    initial={isNew ? { opacity: 0, x: -20, backgroundColor: 'rgba(59,130,246,0.08)' } : { opacity: 1 }}
    animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
    transition={{ duration: 0.5 }}
    className="flex items-start gap-3 px-5 py-3.5 no-underline border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
  >
    <div className="flex-shrink-0 mt-0.5">
      <span className={`w-2 h-2 rounded-full inline-block ${sentimentDot(article.sentiment)}`} />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-[13px] font-semibold text-black dark:text-white leading-snug line-clamp-2 mb-1 font-sans">
        {article.title}
      </h3>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 font-sans">{article.source}</span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-sans">{timeAgo(article.publishedAt)}</span>
        {article.sentiment && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className={`text-[9px] font-bold uppercase tracking-[0.15em] font-sans ${sentimentColor(article.sentiment)}`}>{article.sentiment}</span>
          </>
        )}
        {article.isAlert && (
          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-red-700 dark:text-red-400 font-sans ml-auto">ALERT</span>
        )}
      </div>
    </div>
    {isNew && (
      <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 font-sans">NEW</span>
    )}
  </motion.a>
);

/* ── Main Component ─────────────────────────────────────────── */
const LiveMonitor = () => {
  const socket = useSocket();
  const [stats, setStats] = useState(null);
  const [articles, setArticles] = useState([]);
  const [newIds, setNewIds] = useState(new Set());
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const sseRef = useRef(null);
  const refreshTimerRef = useRef(null);

  // Fetch initial stats
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/monitor/stats`, { headers });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        if (data.stats.latestArticles?.length) {
          setArticles((prev) => {
            const existingIds = new Set(prev.map((a) => a._id));
            const fresh = data.stats.latestArticles.filter((a) => !existingIds.has(a._id));
            return [...fresh, ...prev].slice(0, 100);
          });
        }
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('[LiveMonitor] fetchStats error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // SSE connection
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
      // Auto-reconnect after 5s
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
          setArticles((prev) => {
            const existingIds = new Set(prev.map((a) => a._id));
            const fresh = msg.articles.filter((a) => {
              if (!existingIds.has(a._id)) {
                incomingIds.add(a._id);
                return true;
              }
              return false;
            });
            return [...fresh, ...prev].slice(0, 100);
          });
          if (incomingIds.size > 0) {
            setNewIds((prev) => new Set([...prev, ...incomingIds]));
            // Clear "new" badge after 10s
            setTimeout(() => {
              setNewIds((prev) => {
                const next = new Set(prev);
                incomingIds.forEach((id) => next.delete(id));
                return next;
              });
            }, 10000);
          }
          setLastUpdate(new Date());
        }
      } catch { /* ignore parse errors */ }
    };
  }, []);

  // Socket.IO listener
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.articles?.length) {
        const incomingIds = new Set();
        setArticles((prev) => {
          const existingIds = new Set(prev.map((a) => a._id));
          const fresh = data.articles.filter((a) => {
            if (!existingIds.has(a._id)) {
              incomingIds.add(a._id);
              return true;
            }
            return false;
          });
          return [...fresh, ...prev].slice(0, 100);
        });
        if (incomingIds.size > 0) {
          setNewIds((prev) => new Set([...prev, ...incomingIds]));
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              incomingIds.forEach((id) => next.delete(id));
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
    // Auto-refresh stats every 60s
    refreshTimerRef.current = setInterval(fetchStats, 60000);
    return () => {
      if (sseRef.current) sseRef.current.close();
      clearInterval(refreshTimerRef.current);
    };
  }, [fetchStats, connectSSE]);

  const tickerArticles = articles.slice(0, 15);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-800 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800" />)}
        </div>
        <div className="h-16 bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ── Header Bar ────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white font-serif">Live Monitor</h1>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-sans mt-0.5">
            {lastUpdate ? `Last updated ${timeAgo(lastUpdate)}` : 'Connecting...'} · Auto-refresh 60s
          </p>
        </div>
        <ConnectionBadge status={connectionStatus} />
      </div>

      {/* ── Live Ticker ──────────────────────────────────── */}
      {tickerArticles.length > 0 && <LiveTicker articles={tickerArticles} />}

      {/* ── Stats Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <StatCard
          label="Articles / Hour"
          value={stats?.articlesPerHour ?? '—'}
          sub="Last 60 minutes"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
        <StatCard
          label="Today"
          value={stats?.totalToday ?? '—'}
          sub="Articles collected"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
            </svg>
          }
        />
        <StatCard
          label="Active Sources"
          value={stats?.activeSources ?? '—'}
          sub="Unique publishers 24h"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
              <circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49" /><path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
            </svg>
          }
        />
        <StatCard
          label="Alerts"
          value={articles.filter(a => a.isAlert).length}
          sub="Active alerts"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
      </div>

      {/* ── Sentiment Distribution ───────────────────────── */}
      {stats?.sentimentDistribution && <SentimentBar dist={stats.sentimentDistribution} />}

      {/* ── Hourly Breakdown ─────────────────────────────── */}
      {stats?.hourlyBreakdown?.length > 0 && (
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-5 mt-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 font-sans block mb-4">HOURLY ACTIVITY — 24H</span>
          <div className="flex items-end gap-1 h-20">
            {Array.from({ length: 24 }, (_, i) => {
              const bucket = stats.hourlyBreakdown.find(h => h.hour === i);
              const count = bucket?.count || 0;
              const maxCount = Math.max(...stats.hourlyBreakdown.map(h => h.count), 1);
              const height = (count / maxCount) * 100;
              return (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 2)}%` }}
                  transition={{ duration: 0.5, delay: i * 0.03 }}
                  className="flex-1 bg-black/80 dark:bg-white/80 relative group cursor-default"
                  title={`${i}:00 — ${count} articles`}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-sans text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {count}
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-gray-400 font-sans">00:00</span>
            <span className="text-[9px] text-gray-400 font-sans">12:00</span>
            <span className="text-[9px] text-gray-400 font-sans">23:00</span>
          </div>
        </div>
      )}

      {/* ── Article Feed ─────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 mt-4">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 font-sans">INCOMING ARTICLES</span>
          <span className="text-[10px] text-gray-400 font-sans">{articles.length} total</span>
        </div>
        <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/40">
          <AnimatePresence initial={false}>
            {articles.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500 font-sans">No articles yet. Waiting for incoming data...</p>
              </div>
            ) : (
              articles.map((article) => (
                <ArticleRow key={article._id} article={article} isNew={newIds.has(article._id)} />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitor;
