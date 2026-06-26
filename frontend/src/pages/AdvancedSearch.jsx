import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StaggerList, StaggerItem } from '../components/StaggerList';
import { X, Bookmark, BookmarkCheck, Clock, TrendingUp, ChevronDown, Trash2, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const SENTIMENTS = ['Positive', 'Negative', 'Neutral'];
const SORT_OPTIONS = [
  { value: 'date', label: 'Latest First' },
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'sentiment', label: 'Confidence' },
];

const SENTIMENT_COLORS = {
  Positive: '#059669',
  Negative: '#dc2626',
  Neutral: '#d97706',
};

const SkeletonCard = () => (
  <div className="bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line p-5 animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-white/10 w-3/4 mb-3" />
    <div className="h-3 bg-gray-200 dark:bg-white/10 w-full mb-2" />
    <div className="h-3 bg-gray-200 dark:bg-white/10 w-2/3" />
  </div>
);

const AdvancedSearch = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const { t, lang } = useLanguage();
  const { theme } = useTheme();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    sentiment: [],
    source: [],
    dateFrom: '',
    dateTo: '',
    language: '',
    minConfidence: 0,
    sortBy: 'date',
  });
  const [facets, setFacets] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [savedSearches, setSavedSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedSearches') || '[]'); } catch { return []; }
  });
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recentSearches') || '[]'); } catch { return []; }
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const savedDropdownRef = useRef(null);

  // Compute analytics from results
  const computeAnalytics = useCallback((articles) => {
    if (!articles || articles.length === 0) return null;

    const sentimentCounts = { Positive: 0, Negative: 0, Neutral: 0 };
    const sourceCounts = {};

    articles.forEach(a => {
      const s = a.sentiment || 'Neutral';
      sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
      const src = a.source || 'Unknown';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    const sentimentData = Object.entries(sentimentCounts)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: SENTIMENT_COLORS[name] }));

    const sourceData = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    return { sentimentData, sourceData, total: articles.length };
  }, []);

  const performSearch = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = {
        q: query,
        page: pageNum,
        limit: 20,
        sortBy: filters.sortBy,
      };
      if (filters.sentiment.length) params.sentiment = filters.sentiment.join(',');
      if (filters.source.length) params.source = filters.source.join(',');
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.language) params.language = filters.language;
      if (filters.minConfidence > 0) params.minConfidence = filters.minConfidence;

      const { data } = await api.get('/news/advanced-search', { params });
      setResults(data);
      setFacets(data.facets);
      setPage(pageNum);

      // Compute analytics from results
      if (data.articles) {
        const analytics = computeAnalytics(data.articles);
        setAnalyticsData(analytics);
      }

      // Track recent search
      if (query.trim()) {
        setRecentSearches(prev => {
          const updated = [query.trim(), ...prev.filter(s => s !== query.trim())].slice(0, 10);
          localStorage.setItem('recentSearches', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [query, filters, computeAnalytics]);

  // Read state param from heatmap navigation
  useEffect(() => {
    const stateParam = searchParams.get('state');
    if (stateParam) {
      setQuery(stateParam);
    }
  }, [searchParams]);

  // Debounced search on query/filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2 || filters.sentiment.length || filters.source.length) {
        performSearch(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query, filters.sentiment, filters.source, filters.dateFrom, filters.dateTo, filters.language, filters.minConfidence, filters.sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build suggestions from recent searches + entity names from facets/results
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const q = query.toLowerCase();
    const matches = [];

    // Recent searches matching query
    recentSearches
      .filter(s => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      .slice(0, 3)
      .forEach(s => matches.push({ type: 'recent', value: s }));

    // Entity names from facets
    if (facets?.topEntities) {
      facets.topEntities
        .filter(e => e.name?.toLowerCase().includes(q))
        .slice(0, 5)
        .forEach(e => matches.push({ type: 'entity', value: e.name, count: e.count }));
    }

    // Source names from facets
    if (facets?.sourceCounts) {
      Object.keys(facets.sourceCounts)
        .filter(s => s.toLowerCase().includes(q) && !matches.find(m => m.value === s))
        .slice(0, 3)
        .forEach(s => matches.push({ type: 'source', value: s, count: facets.sourceCounts[s] }));
    }

    // Article titles from results
    if (results?.articles) {
      results.articles
        .filter(a => a.title?.toLowerCase().includes(q))
        .slice(0, 3)
        .forEach(a => {
          if (!matches.find(m => m.value === a.title)) {
            matches.push({ type: 'article', value: a.title });
          }
        });
    }

    setSuggestions(matches.slice(0, 8));
  }, [query, recentSearches, facets, results]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (savedDropdownRef.current && !savedDropdownRef.current.contains(e.target)) {
        setShowSavedDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSentiment = (s) => {
    setFilters(prev => ({
      ...prev,
      sentiment: prev.sentiment.includes(s)
        ? prev.sentiment.filter(x => x !== s)
        : [...prev.sentiment, s],
    }));
  };

  const saveSearch = () => {
    const search = { query, filters, savedAt: new Date().toISOString() };
    const updated = [search, ...savedSearches.filter(s => s.query !== query).slice(0, 9)];
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
  };

  const deleteSavedSearch = (index) => {
    const updated = savedSearches.filter((_, i) => i !== index);
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
  };

  const clearAllFilters = () => {
    setFilters({
      sentiment: [],
      source: [],
      dateFrom: '',
      dateTo: '',
      language: '',
      minConfidence: 0,
      sortBy: 'date',
    });
  };

  const hasActiveFilters = filters.sentiment.length > 0 || filters.source.length > 0 ||
    filters.dateFrom || filters.dateTo || filters.language || filters.minConfidence > 0;

  const loadSearch = (search) => {
    setQuery(search.query);
    setFilters(search.filters);
    setShowSavedDropdown(false);
    setShowSuggestions(false);
  };

  const sentimentColor = (s) => {
    if (s === 'Positive') return 'border-l-2 border-l-green-500';
    if (s === 'Negative') return 'border-l-2 border-l-red-500';
    return 'border-l-2 border-l-gray-400';
  };

  const sentimentLabelColor = (s) => {
    if (s === 'Positive') return 'text-green-700 dark:text-green-400 bg-transparent border-green-300 dark:border-green-500/30';
    if (s === 'Negative') return 'text-red-700 dark:text-red-400 bg-transparent border-red-300 dark:border-red-500/30';
    return 'text-gray-600 dark:text-gray-400 bg-transparent border-gray-300 dark:border-white/10';
  };

  const isSaved = savedSearches.some(s => s.query === query);

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.value);
    setShowSuggestions(false);
  };

  const handleSearchKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && suggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[suggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const suggestionTypeLabel = (type) => {
    const labels = {
      recent: lang === 'ms' ? 'Carian Terakhir' : 'Recent',
      entity: lang === 'ms' ? 'Entiti' : 'Entity',
      source: lang === 'ms' ? 'Sumber' : 'Source',
      article: lang === 'ms' ? 'Artikel' : 'Article',
    };
    return labels[type] || type;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const total = analyticsData?.total || 1;
      const percent = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-1 font-sans" style={{ color: item.payload.color }}>
            {item.name}
          </p>
          <p className="text-xs text-[#666] dark:text-[#999] font-sans">
            {item.value} {lang === 'ms' ? 'artikel' : 'articles'} ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-1 font-sans text-ink dark:text-paper">
            {payload[0].payload.name}
          </p>
          <p className="text-xs text-[#666] dark:text-[#999] font-sans">
            {payload[0].value} {lang === 'ms' ? 'artikel' : 'articles'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-ink dark:text-paper tracking-tight font-display flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          {lang === 'ms' ? 'Carian Lanjutan' : 'Advanced Search'}
        </h1>
        <div className="editorial-rule my-2" />
        <p className="text-[10px] text-ink-muted dark:text-ink-faint uppercase tracking-[0.25em] font-sans">{t('advancedSearchDesc', 'Search articles with powerful filters and facets')}</p>
      </div>

      {/* Search Bar with Suggestions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative" ref={searchInputRef}>
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              setSuggestionIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('searchArticlesPlaceholder')}
            className="w-full pl-11 pr-4 py-3.5 bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line text-sm text-ink dark:text-paper placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-ink/20 dark:focus:ring-paper/20 font-sans"
          />

          {/* Search Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                ref={suggestionsRef}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-[#0a0a0a] border border-paper-line dark:border-[#222] border-t-0 max-h-64 overflow-y-auto"
              >
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.type}-${s.value}-${i}`}
                    onClick={() => handleSuggestionClick(s)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors font-sans border-b border-paper-line/50 dark:border-[#1a1a1a] last:border-0 ${
                      i === suggestionIndex
                        ? 'bg-ink/5 dark:bg-paper/10'
                        : 'hover:bg-ink/5 dark:hover:bg-paper/5'
                    }`}
                  >
                    {s.type === 'recent' && <Clock size={14} className="text-ink-faint flex-shrink-0" />}
                    {s.type === 'entity' && <TrendingUp size={14} className="text-ink-faint flex-shrink-0" />}
                    {s.type === 'source' && <BarChart3 size={14} className="text-ink-faint flex-shrink-0" />}
                    {s.type === 'article' && <svg className="w-3.5 h-3.5 flex-shrink-0 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink dark:text-paper truncate">{s.value}</p>
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.15em] text-ink-faint font-bold flex-shrink-0">
                      {suggestionTypeLabel(s.type)}
                    </span>
                    {s.count && (
                      <span className="text-[9px] text-ink-faint flex-shrink-0">{s.count}</span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 border text-sm font-medium transition-all ${
              showFilters
                ? 'bg-ink/5 dark:bg-paper/10 border-ink dark:border-paper text-ink dark:text-paper'
                : 'bg-paper-card dark:bg-paper-dark-card border-paper-line dark:border-paper-dark-line text-ink-muted dark:text-ink-faint'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>

          {/* Save/Bookmark button */}
          <button
            onClick={saveSearch}
            className={`px-4 py-3 border text-sm font-medium transition-colors ${
              isSaved
                ? 'bg-ink/5 dark:bg-paper/10 border-ink dark:border-paper text-ink dark:text-paper'
                : 'bg-paper-card dark:bg-paper-dark-card border-paper-line dark:border-paper-dark-line text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper'
            }`}
            title={isSaved ? (lang === 'ms' ? 'Carian Disimpan' : 'Search Saved') : (lang === 'ms' ? 'Simpan Carian' : 'Save Search')}
          >
            {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>

          {/* Saved Searches Dropdown */}
          <div className="relative" ref={savedDropdownRef}>
            <button
              onClick={() => setShowSavedDropdown(!showSavedDropdown)}
              className={`px-4 py-3 border text-sm font-medium transition-colors flex items-center gap-1 ${
                showSavedDropdown
                  ? 'bg-ink/5 dark:bg-paper/10 border-ink dark:border-paper text-ink dark:text-paper'
                  : 'bg-paper-card dark:bg-paper-dark-card border-paper-line dark:border-paper-dark-line text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper'
              }`}
              title={lang === 'ms' ? 'Carian Tersimpan' : 'Saved Searches'}
            >
              <Clock size={16} />
              <ChevronDown size={14} />
            </button>

            <AnimatePresence>
              {showSavedDropdown && savedSearches.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 z-50 w-72 bg-white dark:bg-[#0a0a0a] border border-paper-line dark:border-[#222] border-t-0 max-h-80 overflow-y-auto"
                >
                  <div className="px-3 py-2 border-b-2 border-paper-line dark:border-[#222]">
                    <span className="text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em] font-sans">
                      {lang === 'ms' ? 'Carian Tersimpan' : 'Saved Searches'}
                    </span>
                  </div>
                  {savedSearches.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center border-b border-paper-line/50 dark:border-[#1a1a1a] last:border-0"
                    >
                      <button
                        onClick={() => loadSearch(s)}
                        className="flex-1 text-left px-3 py-2.5 text-xs text-ink dark:text-paper hover:bg-ink/5 dark:hover:bg-paper/5 transition-colors font-sans"
                      >
                        <p className="font-medium truncate">{s.query || (lang === 'ms' ? 'Semua artikel' : 'All articles')}</p>
                        <p className="text-[10px] text-ink-faint mt-0.5">
                          {s.filters?.sentiment?.length > 0 && s.filters.sentiment.join(', ')}
                          {s.filters?.dateFrom && ` • ${s.filters.dateFrom}`}
                        </p>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSavedSearch(i); }}
                        className="p-2 text-ink-faint hover:text-red-500 transition-colors flex-shrink-0"
                        title={lang === 'ms' ? 'Padam' : 'Delete'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Analytics Toggle */}
          {analyticsData && (
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`px-4 py-3 border text-sm font-medium transition-colors ${
                showAnalytics
                  ? 'bg-ink/5 dark:bg-paper/10 border-ink dark:border-paper text-ink dark:text-paper'
                  : 'bg-paper-card dark:bg-paper-dark-card border-paper-line dark:border-paper-dark-line text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper'
              }`}
              title={lang === 'ms' ? 'Analitik Carian' : 'Search Analytics'}
            >
              <BarChart3 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2 bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line p-3"
        >
          <span className="text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em] font-sans">{t('filters')}:</span>
          {filters.sentiment.map(s => (
            <button
              key={s}
              onClick={() => toggleSentiment(s)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-paper dark:bg-[#0a0a0a] border border-paper-line dark:border-[#222] text-ink dark:text-paper hover:border-ink dark:hover:border-paper transition-colors font-sans"
            >
              {s}
              <X size={12} />
            </button>
          ))}
          {filters.dateFrom && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, dateFrom: '' }))}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-paper dark:bg-[#0a0a0a] border border-paper-line dark:border-[#222] text-ink dark:text-paper hover:border-ink dark:hover:border-paper transition-colors font-sans"
            >
              From: {filters.dateFrom}
              <X size={12} />
            </button>
          )}
          {filters.dateTo && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, dateTo: '' }))}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-paper dark:bg-[#0a0a0a] border border-paper-line dark:border-[#222] text-ink dark:text-paper hover:border-ink dark:hover:border-paper transition-colors font-sans"
            >
              To: {filters.dateTo}
              <X size={12} />
            </button>
          )}
          <button
            onClick={clearAllFilters}
            className="ml-auto px-3 py-1 text-[10px] font-bold bg-ink dark:bg-paper text-paper dark:text-ink border border-ink dark:border-paper hover:bg-ink/80 dark:hover:bg-paper/80 transition-colors uppercase tracking-[0.15em] font-sans"
          >
            Clear All
          </button>
        </motion.div>
      )}

      {/* Search Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && analyticsData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-ink-muted dark:text-ink-faint" />
                <h2 className="text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em] font-sans">
                  {lang === 'ms' ? 'Analitik Carian' : 'Search Analytics'}
                </h2>
                <span className="text-[10px] text-ink-faint font-sans">
                  — {analyticsData.total} {lang === 'ms' ? 'hasil' : 'results'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sentiment Breakdown Pie Chart */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <PieChartIcon size={14} className="text-ink-faint" />
                    <h3 className="text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-[0.15em] font-sans">
                      {lang === 'ms' ? 'Pecahan Sentimen' : 'Sentiment Breakdown'}
                    </h3>
                  </div>
                  <div className="border border-paper-line/50 dark:border-[#1a1a1a] p-3">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={analyticsData.sentimentData}
                          cx="50%"
                          cy="50%"
                          innerRadius="50%"
                          outerRadius="75%"
                          paddingAngle={2}
                          dataKey="value"
                          strokeWidth={1}
                          stroke={theme === 'dark' ? '#0a0a0a' : '#ffffff'}
                        >
                          {analyticsData.sentimentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2 pt-2 border-t border-paper-line/50 dark:border-[#1a1a1a]">
                      {analyticsData.sentimentData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-1.5">
                          <span className="w-2 h-2 inline-block" style={{ backgroundColor: entry.color }} />
                          <span className="text-[9px] uppercase tracking-[0.12em] text-ink-faint font-sans font-bold">
                            {entry.name}
                          </span>
                          <span className="text-[9px] text-ink-faint font-sans">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Source Breakdown Bar Chart */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={14} className="text-ink-faint" />
                    <h3 className="text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-[0.15em] font-sans">
                      {lang === 'ms' ? 'Pecahan Sumber' : 'Source Breakdown'}
                    </h3>
                  </div>
                  <div className="border border-paper-line/50 dark:border-[#1a1a1a] p-3">
                    {analyticsData.sourceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={analyticsData.sourceData} layout="vertical" margin={{ left: 10, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#222' : '#e5e5e5'} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: theme === 'dark' ? '#666' : '#999' }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 10, fill: theme === 'dark' ? '#999' : '#666' }}
                            width={90}
                          />
                          <Tooltip content={<CustomBarTooltip />} />
                          <Bar
                            dataKey="value"
                            fill={theme === 'dark' ? '#d4d4d4' : '#333'}
                            radius={0}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-xs text-ink-faint font-sans">
                        {lang === 'ms' ? 'Tiada data sumber' : 'No source data'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 space-y-5 overflow-hidden md:w-[260px]"
            >
              {/* Sentiment */}
              <div className="bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line p-4">
                <h3 className="text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em] mb-3 font-sans">{t('sentiment')}</h3>
                <div className="space-y-2">
                  {SENTIMENTS.map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.sentiment.includes(s)}
                        onChange={() => toggleSentiment(s)}
                        className="w-4 h-4 border border-paper-line dark:border-paper-dark-line text-ink dark:text-paper focus:ring-ink/20 dark:focus:ring-paper/20"
                      />
                      <span className="text-sm text-ink dark:text-paper font-sans">{s}</span>
                      {facets?.sentimentCounts?.[s] !== undefined && (
                        <span className="ml-auto text-xs text-ink-faint font-sans">({facets.sentimentCounts[s]})</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line p-4">
                <h3 className="text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em] mb-3 font-sans">{t('dateRange')}</h3>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full px-3 py-2 bg-paper dark:bg-white/5 border border-paper-line dark:border-paper-dark-line text-xs text-ink dark:text-paper font-sans"
                  />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full px-3 py-2 bg-paper dark:bg-white/5 border border-paper-line dark:border-paper-dark-line text-xs text-ink dark:text-paper font-sans"
                  />
                </div>
              </div>

              {/* Language */}
              <div className="bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line p-4">
                <h3 className="text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em] mb-3 font-sans">Language</h3>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 bg-paper dark:bg-white/5 border border-paper-line dark:border-paper-dark-line text-xs text-ink dark:text-paper font-sans"
                >
                  <option value="">All Languages</option>
                  <option value="en">English</option>
                  <option value="ms">Bahasa Malaysia</option>
                </select>
                {facets?.languageCounts && (
                  <div className="flex gap-2 mt-2 text-xs text-ink-faint font-sans">
                    {Object.entries(facets.languageCounts).map(([lang, count]) => (
                      <span key={lang}>{lang}: {count}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Confidence */}
              <div className="bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line p-4">
                <h3 className="text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em] mb-3 font-sans">
                  Min Confidence: {Math.round(filters.minConfidence * 100)}%
                </h3>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={filters.minConfidence}
                  onChange={(e) => setFilters(prev => ({ ...prev, minConfidence: parseFloat(e.target.value) }))}
                  className="w-full accent-accent"
                />
              </div>

              {/* Sort */}
              <div className="bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line p-4">
                <h3 className="text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em] mb-3 font-sans">{t('sortBy')}</h3>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full px-3 py-2 bg-paper dark:bg-white/5 border border-paper-line dark:border-paper-dark-line text-xs text-ink dark:text-paper font-sans"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Saved Searches Sidebar (compact) */}
              {savedSearches.length > 0 && (
                <div className="bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line p-4">
                  <h3 className="text-[10px] font-bold text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em] mb-3 font-sans">
                    {lang === 'ms' ? 'Carian Tersimpan' : 'Saved Searches'}
                  </h3>
                  <div className="space-y-1.5">
                    {savedSearches.slice(0, 5).map((s, i) => (
                      <button
                        key={i}
                        onClick={() => loadSearch(s)}
                        className="w-full text-left px-3 py-2 text-xs text-ink dark:text-paper hover:bg-paper dark:hover:bg-white/5 transition-colors truncate border-b border-paper-line dark:border-paper-dark-line last:border-0 font-sans"
                      >
                        {s.query || 'All articles'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Results */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Results count */}
          {results && (
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-ink-muted dark:text-ink-faint uppercase tracking-[0.15em] font-sans">
                {results.total} {lang === 'ms' ? 'hasil ditemui' : 'results found'}
                {query && <span> for &ldquo;<strong className="text-ink dark:text-paper">{query}</strong>&rdquo;</span>}
              </p>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="grid gap-4">
              {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Results grid */}
          {!loading && results?.articles?.length > 0 && (
            <StaggerList className="grid gap-3">
              {results.articles.map((article, i) => (
                <StaggerItem key={article._id || i}>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line p-5 hover:border-ink/30 dark:hover:border-paper/30 transition-all no-underline ${sentimentColor(article.sentiment)}`}
                  >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-semibold text-ink dark:text-paper line-clamp-2 mb-1.5 font-sans">
                        {article.title}
                      </h3>
                      <p className="text-xs text-ink-muted dark:text-ink-faint line-clamp-2 mb-2 font-sans">
                        {article.description}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-ink-faint font-sans">
                        <span className="uppercase tracking-[0.15em] font-bold">{article.source}</span>
                        <span>•</span>
                        <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                        {article.confidence > 0 && (
                          <>
                            <span>•</span>
                            <span>{Math.round(article.confidence * 100)}% conf</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`flex-shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border font-sans ${sentimentLabelColor(article.sentiment)}`}>
                      {article.sentiment}
                    </span>
                  </div>
                  </a>
                </StaggerItem>
              ))}
            </StaggerList>
          )}

          {/* Empty state */}
          {!loading && results && results.articles?.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line p-12 text-center"
            >
              <div className="max-w-[60px] mx-auto mb-5 flex flex-col items-center gap-0.5">
                <div className="w-full h-[2px] bg-ink/20 dark:bg-paper/20" />
                <div className="w-full h-px bg-ink/10 dark:bg-paper/10" />
              </div>
              <h3 className="font-display text-xl font-bold text-ink dark:text-paper mb-3">{t('noArticlesFound')}</h3>
              <p className="text-sm text-ink-muted dark:text-ink-faint italic font-serif max-w-sm mx-auto mb-5">
                {lang === 'ms'
                  ? '"Berita yang anda cari belum ditulis lagi."'
                  : '"The news you seek has not yet been written."'}
              </p>
              <div className="max-w-[40px] mx-auto mb-5 h-px bg-ink/20 dark:bg-paper/20" />
              <button
                onClick={clearAllFilters}
                className="px-5 py-2.5 bg-ink dark:bg-paper text-paper dark:text-ink text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-ink/80 dark:hover:bg-paper/80 transition-colors font-sans"
              >
                {lang === 'ms' ? 'Padam Penapis' : 'Clear Filters'}
              </button>
            </motion.div>
          )}

          {/* Initial state */}
          {!loading && !results && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line p-12 text-center"
            >
              <div className="max-w-[60px] mx-auto mb-5 flex flex-col items-center gap-0.5">
                <div className="w-full h-[2px] bg-ink/20 dark:bg-paper/20" />
                <div className="w-full h-px bg-ink/10 dark:bg-paper/10" />
              </div>
              <svg className="w-10 h-10 mx-auto mb-4 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <h3 className="font-display text-xl font-bold text-ink dark:text-paper mb-3">
                {lang === 'ms' ? 'Mulakan Carian Anda' : 'Begin Your Search'}
              </h3>
              <p className="text-sm text-ink-muted dark:text-ink-faint italic font-serif max-w-sm mx-auto">
                {lang === 'ms'
                  ? '"Masukkan kata kunci atau gunakan penapis untuk meneroka sentimen berita Malaysia."'
                  : '"Enter a keyword or apply filters to discover Malaysian news sentiment."'}
              </p>
            </motion.div>
          )}

          {/* Pagination */}
          {results && results.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => performSearch(page - 1)}
                disabled={page <= 1}
                className="px-3 py-2 text-sm bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line disabled:opacity-30 hover:border-ink/30 dark:hover:border-paper/30 transition-colors font-sans"
              >
                ← Prev
              </motion.button>
              <span className="text-sm text-ink-muted dark:text-ink-faint font-sans">
                Page {results.page} of {results.totalPages}
              </span>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => performSearch(page + 1)}
                disabled={page >= results.totalPages}
                className="px-3 py-2 text-sm bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line disabled:opacity-30 hover:border-ink/30 dark:hover:border-paper/30 transition-colors font-sans"
              >
                Next →
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdvancedSearch;
