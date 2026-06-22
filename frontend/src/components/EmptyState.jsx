import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const EmptyState = ({ title, subtitle, actionLabel, onAction, icon }) => {
  const { t } = useLanguage();

  const handleClick = () => {
    if (onAction) {
      onAction();
    } else {
      const searchInput = document.getElementById('news-search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card text-center py-16 px-6">
      {/* Editorial top rule */}
      <div className="max-w-[80px] mx-auto mb-6 flex flex-col items-center gap-0.5">
        <div className="w-full h-[2px] bg-ink/20 dark:bg-paper/20" />
        <div className="w-full h-px bg-ink/10 dark:bg-paper/10" />
      </div>

      {/* Icon */}
      <div className="mb-5">
        {icon || (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-ink/20 dark:text-paper/20">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        )}
      </div>

      {/* Title - Playfair Display */}
      <h3 className="font-['Playfair_Display'] text-xl font-bold text-ink dark:text-paper mb-3">
        {title || t('emptyTitle')}
      </h3>

      {/* Subtitle - Italic serif */}
      <p className="text-sm text-ink-muted dark:text-ink-faint italic font-serif max-w-sm mx-auto mb-6 leading-relaxed">
        {subtitle || t('emptySubtitle')}
      </p>

      {/* Editorial divider */}
      <div className="max-w-[60px] mx-auto mb-6 h-px bg-ink/10 dark:bg-paper/10" />

      {/* Action button */}
      <button
        onClick={handleClick}
        className="px-5 py-2.5 bg-ink dark:bg-paper text-paper dark:text-ink text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-accent dark:hover:bg-accent dark:hover:text-paper transition-colors font-sans"
      >
        {actionLabel || t('analyzeBtn')}
      </button>
    </div>
  );
};

export default EmptyState;
