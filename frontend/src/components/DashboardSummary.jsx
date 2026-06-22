import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const DashboardSummary = ({ distribution, keywords, articles }) => {
  const { t } = useLanguage();
  const total = (distribution?.Positive || 0) + (distribution?.Negative || 0) + (distribution?.Neutral || 0);
  if (!total || !articles?.length) return null;

  const positivePercent = Math.round((distribution.Positive / total) * 100);
  const negativePercent = Math.round((distribution.Negative / total) * 100);
  const neutralPercent = 100 - positivePercent - negativePercent;
  
  let dominantText = '';
  if (positivePercent >= 50) dominantText = `${positivePercent}% ${t('positive').toLowerCase()}`;
  else if (negativePercent >= 50) dominantText = `${negativePercent}% ${t('negative').toLowerCase()}`;
  else dominantText = `${neutralPercent}% ${t('neutral').toLowerCase()}`;

  const topKeywords = (keywords || [])
    .slice(0, 3)
    .map(k => typeof k === 'string' ? k : k.text || k.word || k.keyword)
    .filter(Boolean);

  const topics = topKeywords.length > 0 
    ? topKeywords 
    : [...new Set(articles.map(a => a.topic).filter(Boolean))].slice(0, 3);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card mb-6 overflow-x-auto scrollbar-hide">
      <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest font-sans shrink-0">
        {dominantText}
      </span>
      {topics.length > 0 && (
        <>
          <span className="text-ink-faint shrink-0">&middot;</span>
          <span className="text-[10px] text-ink-muted dark:text-ink-faint font-sans whitespace-nowrap">
            {t('trendingKeywords')}: <span className="font-semibold text-ink dark:text-paper">{topics.join(', ')}</span>
          </span>
        </>
      )}
      <span className="text-ink-faint shrink-0">&middot;</span>
      <span className="text-[10px] text-ink-muted dark:text-ink-faint font-sans shrink-0">{total} {t('articles')} {t('analyzeBtn').toLowerCase()}</span>
    </div>
  );
};

export default DashboardSummary;
