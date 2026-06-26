import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const SearchDeskIllustration = () => (
  <svg
    width="84"
    height="84"
    viewBox="0 0 84 84"
    fill="none"
    className="mx-auto text-ink/30 dark:text-paper/25"
    aria-hidden="true"
  >
    <rect x="10" y="16" width="44" height="34" stroke="currentColor" strokeWidth="1.5" />
    <line x1="16" y1="24" x2="48" y2="24" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" />
    <line x1="16" y1="30" x2="42" y2="30" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
    <line x1="16" y1="37" x2="48" y2="37" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
    <line x1="16" y1="43" x2="34" y2="43" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
    <circle cx="47" cy="47" r="12" stroke="#c00000" strokeWidth="3" />
    <line x1="55.5" y1="55.5" x2="66" y2="66" stroke="#c00000" strokeWidth="4" strokeLinecap="square" />
    <rect x="21" y="56" width="42" height="2" fill="currentColor" fillOpacity="0.16" />
    <rect x="28" y="62" width="28" height="2" fill="currentColor" fillOpacity="0.1" />
  </svg>
);

const EmptyState = ({ title, subtitle, actionLabel, onAction, icon, hints, eyebrow }) => {
  const { t } = useLanguage();

  const defaultHints = hints || [
    'Try broader keyword or shorter phrase',
    'Switch time range to fetch older coverage',
    'Return to dashboard and analyze fresh topic',
  ];

  const handleClick = () => {
    if (onAction) {
      onAction();
      return;
    }

    const searchInput = document.getElementById('news-search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="border border-paper-line bg-paper-card px-6 py-16 text-center dark:border-paper-dark-line dark:bg-paper-dark-card sm:px-10">
      <div className="mx-auto mb-6 flex max-w-[110px] flex-col items-center gap-0.5">
        <div className="h-[2px] w-full bg-ink/20 dark:bg-paper/20" />
        <div className="h-px w-full bg-ink/10 dark:bg-paper/10" />
      </div>

      <p className="mb-4 text-[10px] uppercase tracking-[0.24em] text-ink-muted dark:text-ink-faint">
        {eyebrow || 'Editorial Search Desk'}
      </p>

      <div className="mb-5">
        {icon || <SearchDeskIllustration />}
      </div>

      <h3 className="mb-3 font-['Playfair_Display'] text-2xl font-bold text-ink dark:text-paper">
        {title || t('emptyTitle')}
      </h3>

      <p className="mx-auto mb-6 max-w-md font-serif text-sm italic leading-relaxed text-ink-muted dark:text-ink-faint">
        {subtitle || t('emptySubtitle')}
      </p>

      <div className="mx-auto mb-6 h-px max-w-[64px] bg-ink/10 dark:bg-paper/10" />

      <div className="mx-auto mb-7 grid max-w-2xl gap-2 text-left sm:grid-cols-3">
        {defaultHints.map((hint, index) => (
          <div
            key={hint}
            className="border border-ink/10 bg-paper dark:border-paper/10 dark:bg-[#161513] px-3 py-3"
          >
            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-accent">0{index + 1}</p>
            <p className="text-xs leading-relaxed text-ink/75 dark:text-paper/75">{hint}</p>
          </div>
        ))}
      </div>

      <button
        onClick={handleClick}
        className="bg-ink px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-paper transition-colors hover:bg-accent dark:bg-paper dark:text-ink dark:hover:bg-accent dark:hover:text-paper"
      >
        {actionLabel || t('analyzeBtn')}
      </button>
    </div>
  );
};

export default EmptyState;
