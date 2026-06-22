import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const SentimentMark = ({ sentiment }) => {
  const map = {
    Positive: { symbol: '+', color: 'text-green-700 dark:text-green-400' },
    Negative: { symbol: '−', color: 'text-red-700 dark:text-red-400' },
    Neutral:  { symbol: '~', color: 'text-gray-500 dark:text-gray-400' },
  };
  const m = map[sentiment] || map.Neutral;
  return (
    <span className={`inline-block text-xs font-bold ${m.color} mr-1`}>
      {m.symbol}
    </span>
  );
};

const ArticleCard = ({ article, isNew }) => (
  <a
    href={article.url}
    target="_blank"
    rel="noopener noreferrer"
    className={`block no-underline border-b border-paper-line dark:border-paper-dark-line last:border-b-0 px-5 py-4 transition-colors hover:bg-paper/50 dark:hover:bg-paper-dark/50
      ${isNew ? 'bg-accent/5 dark:bg-accent/10' : ''}
    `}
  >
    <div className="flex items-start gap-3">
      {/* Sentiment marker */}
      <div className="flex-shrink-0 pt-0.5">
        <SentimentMark sentiment={article.sentiment} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-ink dark:text-paper leading-snug line-clamp-2 mb-1 font-sans">
          {article.title}
        </h3>
        {article.description && (
          <p className="text-xs text-ink-muted dark:text-ink-faint line-clamp-2 mb-2 leading-relaxed font-sans">
            {article.description}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source — editorial byline style */}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-faint font-sans">
            {article.source}
          </span>
          <span className="text-ink-faint">·</span>
          {/* Time */}
          <span className="text-[10px] text-ink-faint font-sans">
            {timeAgo(article.publishedAt)}
          </span>
          {/* Language */}
          {article.language && (
            <>
              <span className="text-ink-faint">·</span>
              <span className="text-[10px] font-medium text-ink-faint uppercase font-sans">
                {article.language === 'ms' ? 'BM' : 'EN'}
              </span>
            </>
          )}
          {/* Alert */}
          {article.isAlert && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 font-sans ml-auto">
              Alert
            </span>
          )}
        </div>
      </div>
    </div>
  </a>
);

const LiveFeed = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [langFilter, setLangFilter] = useState('all');
  const [newCount, setNewCount] = useState(0);
  const [newArticleIds, setNewArticleIds] = useState(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const containerRef = useRef(null);
  const eventSourceRef = useRef(null);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'all') params.sentiment = filter;
      if (langFilter !== 'all') params.language = langFilter;
      const { data } = await api.get('/feed/live', { params });
      setArticles(data.articles || []);
      setNewCount(0);
      setNewArticleIds(new Set());
    } catch (err) {
      console.error('Failed to fetch feed:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, langFilter]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const autoScrollRef = useRef(autoScroll);
  useEffect(() => { autoScrollRef.current = autoScroll; }, [autoScroll]);

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api/v1';
    const url = `${API_BASE}/feed/stream`;
    let reconnectTimer = null;
    let cancelled = false;
    
    const connect = () => {
      if (cancelled) return;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => setSseConnected(true);
      
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_articles' && data.articles?.length > 0) {
            setArticles(prev => {
              const existingUrls = new Set(prev.map(a => a.url));
              const genuinelyNew = data.articles.filter(a => !existingUrls.has(a.url));
              if (genuinelyNew.length === 0) return prev;
              
              const newIds = new Set(genuinelyNew.map(a => a._id || a.url));
              setNewArticleIds(prev => new Set([...prev, ...newIds]));
              
              if (!autoScrollRef.current) {
                setNewCount(prev => prev + genuinelyNew.length);
              }
              
              return [...genuinelyNew, ...prev].slice(0, 100);
            });
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        setSseConnected(false);
        es.close();
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (newArticleIds.size === 0) return;
    const timer = setTimeout(() => setNewArticleIds(new Set()), 5000);
    return () => clearTimeout(timer);
  }, [newArticleIds]);

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
    return true;
  });

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'Positive', label: 'Positive' },
    { key: 'Negative', label: 'Negative' },
    { key: 'Neutral', label: 'Neutral' },
  ];

  const langOptions = [
    { key: 'all', label: 'All' },
    { key: 'en', label: 'EN' },
    { key: 'ms', label: 'BM' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header — newspaper section style */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-1">
          <h1 className="text-3xl font-bold text-ink dark:text-paper tracking-tight font-display">
            Live Feed
          </h1>
          <span className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest font-sans ${
            sseConnected ? 'text-green-700 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
          }`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-green-600' : 'bg-yellow-500'}`} />
            {sseConnected ? 'Live' : 'Reconnecting'}
          </span>
        </div>
        <div className="editorial-rule mb-3" />
        <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed max-w-xl font-sans">
          Real-time sentiment analysis of breaking news across Malaysian media sources.
        </p>
      </div>

      {/* Filters — editorial tab style */}
      <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card mb-6">
        <div className="flex items-center justify-between px-4 py-2.5 gap-4 flex-wrap">
          {/* Sentiment filters */}
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

          {/* Language filters */}
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

      {/* New articles banner */}
      <AnimatePresence>
        {newCount > 0 && (
          <motion.button
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onClick={showNewArticles}
            className="w-full py-2.5 border-l-3 border-accent bg-accent/5 dark:bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider hover:bg-accent/10 transition-colors font-sans mb-4"
          >
            {newCount} new article{newCount > 1 ? 's' : ''} — tap to view
          </motion.button>
        )}
      </AnimatePresence>

      {/* Articles list — editorial column */}
      <div ref={containerRef} className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
        {loading ? (
          <div className="divide-y divide-paper-line dark:divide-paper-dark-line">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse">
                <div className="h-3.5 bg-gray-200 dark:bg-gray-700 w-3/4 mb-2.5" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 w-full mb-2" />
                <div className="flex gap-2">
                  <div className="h-2.5 w-12 bg-gray-200 dark:bg-gray-700" />
                  <div className="h-2.5 w-8 bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-ink-faint font-sans">No articles found</p>
            <p className="text-xs text-ink-faint mt-1 font-sans">Try adjusting your filters</p>
          </div>
        ) : (
          filteredArticles.map((article, i) => (
            <ArticleCard
              key={article._id || article.url}
              article={article}
              isNew={newArticleIds.has(article._id || article.url)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default LiveFeed;
