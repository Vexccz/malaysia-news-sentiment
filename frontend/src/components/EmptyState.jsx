import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const EmptyState = () => {
  const { t } = useLanguage();

  const handleClick = () => {
    const searchInput = document.getElementById('news-search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card text-center py-16 px-6">
      <div className="mb-4">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-ink-faint">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans mb-2">
        {t('emptyTitle')}
      </h3>
      <p className="text-xs text-ink-muted dark:text-ink-faint font-sans max-w-xs mx-auto mb-6">
        {t('emptySubtitle')}
      </p>
      <button
        onClick={handleClick}
        className="px-5 py-2 bg-ink dark:bg-paper text-paper dark:text-ink text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity font-sans"
      >
        {t('analyzeBtn')}
      </button>
    </div>
  );
};

export default EmptyState;
