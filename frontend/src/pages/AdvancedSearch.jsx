import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StaggerList, StaggerItem } from '../components/StaggerList';
import { X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

const SENTIMENTS = ['Positive', 'Negative', 'Neutral'];
const SORT_OPTIONS = [
  { value: 'date', label: 'Latest First' },
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'sentiment', label: 'Confidence' },
];

const SkeletonCard = () => (
  <div className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-5 animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-3/4 mb-3" />
    <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-full mb-2" />
    <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-2/3" />
  </div>
);

const AdvancedSearch = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
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
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

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
    const updated = [search, ...savedSearches.slice(0, 9)];
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
  };

  const sentimentColor = (s) => {
    if (s === 'Positive') return 'text-green-600 bg-transparent border-green-300 dark:border-green-500/30';
    if (s === 'Negative') return 'text-red-600 bg-transparent border-red-300 dark:border-red-500/30';
    return 'text-gray-600 bg-transparent border-gray-300 dark:border-white/10';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          Advanced Search
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Search articles with powerful filters and facets</p>
      </motion.div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles by title, content, or keywords..."
            className="w-full pl-11 pr-4 py-3.5 rounded-sm bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="flex gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-sm border text-sm font-medium transition-all ${
            showFilters
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-white dark:bg-[#1a1a1a] border-[#eee] dark:border-[#2a2a2a] text-gray-600 dark:text-gray-400'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
        </button>
        <button
          onClick={saveSearch}
          className="px-4 py-3 rounded-sm bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-accent transition-colors"
          title="Save search"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
          </svg>
        </button>
        </div>
      </div>


      {/* Active Filters Display */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-[#1a1a1a] border-2 border-gray-200 dark:border-[#2a2a2a] p-3"
        >
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Filters:</span>
          {filters.sentiment.map(s => (
            <button
              key={s}
              onClick={() => toggleSentiment(s)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:border-red-500 transition-colors"
            >
              {s}
              <X size={12} />
            </button>
          ))}
          {filters.dateFrom && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, dateFrom: '' }))}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:border-red-500 transition-colors"
            >
              From: {filters.dateFrom}
              <X size={12} />
            </button>
          )}
          {filters.dateTo && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, dateTo: '' }))}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:border-red-500 transition-colors"
            >
              To: {filters.dateTo}
              <X size={12} />
            </button>
          )}
          <button
            onClick={clearAllFilters}
            className="ml-auto px-3 py-1 text-xs font-bold bg-red-600 text-white border-2 border-red-700 hover:bg-red-700 transition-colors uppercase tracking-wide"
          >
            Clear All
          </button>
        </motion.div>
      )}

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
              <div className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sentiment</h3>
                <div className="space-y-2">
                  {SENTIMENTS.map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.sentiment.includes(s)}
                        onChange={() => toggleSentiment(s)}
                        className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{s}</span>
                      {facets?.sentimentCounts?.[s] !== undefined && (
                        <span className="ml-auto text-xs text-gray-400">({facets.sentimentCounts[s]})</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Date Range</h3>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-[#eee] dark:border-[#2a2a2a] text-xs text-gray-700 dark:text-gray-300"
                  />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-[#eee] dark:border-[#2a2a2a] text-xs text-gray-700 dark:text-gray-300"
                  />
                </div>
              </div>

              {/* Language */}
              <div className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Language</h3>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-[#eee] dark:border-[#2a2a2a] text-xs text-gray-700 dark:text-gray-300"
                >
                  <option value="">All Languages</option>
                  <option value="en">English</option>
                  <option value="ms">Bahasa Malaysia</option>
                </select>
                {facets?.languageCounts && (
                  <div className="flex gap-2 mt-2 text-xs text-gray-400">
                    {Object.entries(facets.languageCounts).map(([lang, count]) => (
                      <span key={lang}>{lang}: {count}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Confidence */}
              <div className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
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
              <div className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sort By</h3>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-[#eee] dark:border-[#2a2a2a] text-xs text-gray-700 dark:text-gray-300"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Saved Searches */}
              {savedSearches.length > 0 && (
                <div className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Saved Searches</h3>
                  <div className="space-y-1.5">
                    {savedSearches.slice(0, 5).map((s, i) => (
                      <button
                        key={i}
                        onClick={() => loadSearch(s)}
                        className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors truncate border-b border-gray-100 dark:border-[#2a2a2a] last:border-0"
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {results.total} results found
                {query && <span> for "<strong className="text-gray-700 dark:text-gray-200">{query}</strong>"</span>}
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
                    className="block bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-5 hover:border-accent/30 transition-all no-underline"
                  >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1.5">
                        {article.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                        {article.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{article.source}</span>
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
                    <span className={`flex-shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${sentimentColor(article.sentiment)}`}>
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
              className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] p-12 text-center"
            >
              <div className="max-w-[60px] mx-auto mb-5 flex flex-col items-center gap-0.5">
                <div className="w-full h-[2px] bg-gray-200 dark:bg-gray-700" />
                <div className="w-full h-px bg-gray-100 dark:bg-gray-800" />
              </div>
              <h3 className="font-['Playfair_Display'] text-xl font-bold text-gray-900 dark:text-white mb-3">No Stories Found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic font-serif max-w-sm mx-auto mb-5">
                "The news you seek has not yet been written."
              </p>
              <div className="max-w-[40px] mx-auto mb-5 h-px bg-gray-200 dark:bg-gray-700" />
              <button
                onClick={clearAllFilters}
                className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-accent transition-colors"
              >
                Clear Filters
              </button>
            </motion.div>
          )}

          {/* Initial state */}
          {!loading && !results && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] p-12 text-center"
            >
              <div className="max-w-[60px] mx-auto mb-5 flex flex-col items-center gap-0.5">
                <div className="w-full h-[2px] bg-gray-200 dark:bg-gray-700" />
                <div className="w-full h-px bg-gray-100 dark:bg-gray-800" />
              </div>
              <svg className="w-10 h-10 mx-auto mb-4 text-gray-200 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <h3 className="font-['Playfair_Display'] text-xl font-bold text-gray-900 dark:text-white mb-3">Begin Your Search</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic font-serif max-w-sm mx-auto">
                "Enter a keyword or apply filters to discover Malaysian news sentiment."
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
                className="px-3 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] disabled:opacity-30 hover:border-accent/30 transition-colors"
              >
                ← Prev
              </motion.button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {results.page} of {results.totalPages}
              </span>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => performSearch(page + 1)}
                disabled={page >= results.totalPages}
                className="px-3 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] disabled:opacity-30 hover:border-accent/30 transition-colors"
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
