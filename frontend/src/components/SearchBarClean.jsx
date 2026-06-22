import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';

const QUICK_TOPICS = [
  'Malaysia economy',
  'Malaysia politics', 
  'Malaysia crime',
  'Malaysia education',
  'Ringgit',
  'Budget Malaysia',
];

const ALL_TOPICS = [
  'Malaysia economy',
  'Malaysia politics',
  'Malaysia education',
  'Ringgit',
  'Budget Malaysia',
  'Malaysia crime',
  'Malaysia technology',
  'Malaysia flood',
  'Malaysia health',
  'Malaysia sports',
];

const RECENT_SEARCHES_KEY = 'recent-searches';

function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query) {
  try {
    const recent = getRecentSearches().filter(s => s.toLowerCase() !== query.toLowerCase());
    recent.unshift(query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, 10)));
  } catch { /* ignore */ }
}

/**
 * Simple fuzzy similarity: checks lowercase contains, startsWith, or
 * Levenshtein distance ratio. Returns a score 0-1 (1 = perfect match).
 */
function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  // Check word-level startsWith overlap
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  let overlap = 0;
  for (const wa of wordsA) {
    for (const wb of wordsB) {
      if (wa.startsWith(wb) || wb.startsWith(wa)) { overlap++; break; }
    }
  }
  if (overlap > 0) return 0.4 + 0.3 * (overlap / Math.max(wordsA.length, wordsB.length));
  // Levenshtein distance
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  const ratio = 1 - dist / maxLen;
  return ratio > 0.35 ? ratio : 0;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function getSuggestions(query) {
  if (!query || query.trim().length < 2) return [];

  const recent = getRecentSearches();
  // Combine recent + predefined, deduplicated (recent first)
  const pool = [];
  const seen = new Set();
  for (const s of recent) {
    const key = s.toLowerCase();
    if (!seen.has(key)) { pool.push({ text: s, source: 'recent' }); seen.add(key); }
  }
  for (const t of ALL_TOPICS) {
    const key = t.toLowerCase();
    if (!seen.has(key)) { pool.push({ text: t, source: 'topic' }); seen.add(key); }
  }

  // Score each candidate against the query
  const scored = pool
    .map(item => ({ ...item, score: similarity(query, item.text) }))
    .filter(item => item.score > 0.35 && item.text.toLowerCase() !== query.toLowerCase())
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return scored;
}

const SearchBarClean = ({ onSearch, loading = false, noResultsQuery = null }) => {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const { t } = useLanguage();

  const suggestions = useMemo(() => {
    if (!noResultsQuery) return [];
    return getSuggestions(noResultsQuery);
  }, [noResultsQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      addRecentSearch(query.trim());
      onSearch(query.trim(), limit, false);
    }
  };

  const handleQuickSearch = (topic) => {
    setQuery(topic);
    addRecentSearch(topic);
    onSearch(topic, limit, false);
  };

  const handleLatestNews = () => {
    onSearch('', limit, true);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    addRecentSearch(suggestion);
    onSearch(suggestion, limit, false);
  };

  return (
    <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card mb-6">
      <div className="border-l-3 border-accent px-5 py-5">
        <form onSubmit={handleSubmit}>
          {/* Search Input Row */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchNews')}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper placeholder:text-ink-faint text-sm font-sans focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
              />
            </div>

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={loading}
              className="px-3 py-2.5 border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper text-xs font-sans focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
            >
              <option value={5}>5 {t('articles')}</option>
              <option value={10}>10 {t('articles')}</option>
              <option value={20}>20 {t('articles')}</option>
              <option value={30}>30 {t('articles')}</option>
              <option value={50}>50 {t('articles')}</option>
            </select>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-2.5 bg-ink dark:bg-paper text-paper dark:text-ink text-xs font-semibold uppercase tracking-wider hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-sans"
            >
              {loading ? t('analyzing') : t('analyzeBtn')}
            </button>
          </div>

          {/* Did You Mean Suggestions */}
          {noResultsQuery && suggestions.length > 0 && (
            <div className="mb-4 flex items-center flex-wrap gap-2">
              <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest font-sans">
                DID YOU MEAN
              </span>
              {suggestions.map((s, i) => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => handleSuggestionClick(s.text)}
                  className="px-3 py-1.5 border border-paper-line dark:border-paper-dark-line text-xs text-ink-muted dark:text-ink-faint hover:border-accent hover:text-accent transition-colors font-serif"
                >
                  {s.text}
                  {s.source === 'recent' && (
                    <span className="ml-1.5 text-[9px] text-ink-faint uppercase tracking-wider font-sans">recent</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions Row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest font-sans">
                {t('quickKeywords')}
              </span>
              {QUICK_TOPICS.map((topic, i) => (
                <React.Fragment key={topic}>
                  {i > 0 && <span className="text-ink-faint text-[10px]">&middot;</span>}
                  <button
                    type="button"
                    onClick={() => handleQuickSearch(topic)}
                    className="text-xs text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-colors font-sans"
                  >
                    {topic}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <button
              type="button"
              onClick={handleLatestNews}
              disabled={loading}
              className="text-[10px] font-semibold text-accent uppercase tracking-widest hover:opacity-80 transition-opacity font-sans"
            >
              {t('latestNews')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SearchBarClean;
