import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const QUICK_TOPICS = [
  'Malaysia economy',
  'Malaysia politics', 
  'Malaysia crime',
  'Malaysia education',
  'Ringgit',
  'Budget Malaysia',
];

const SearchBarClean = ({ onSearch, loading = false }) => {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const { t } = useLanguage();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onSearch(query.trim(), limit, false);
    }
  };

  const handleQuickSearch = (topic) => {
    setQuery(topic);
    onSearch(topic, limit, false);
  };

  const handleLatestNews = () => {
    onSearch('', limit, true);
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
