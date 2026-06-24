import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const SENTIMENT_STYLES = {
  Positive: {
    bg: 'bg-[#4ADE80]/15 dark:bg-[#4ADE80]/10',
    text: 'text-emerald-700 dark:text-[#4ADE80]',
    en: 'Positive',
    ms: 'Positif',
  },
  Negative: {
    bg: 'bg-[#FB7185]/15 dark:bg-[#FB7185]/10',
    text: 'text-rose-700 dark:text-[#FB7185]',
    en: 'Negative',
    ms: 'Negatif',
  },
  Neutral: {
    bg: 'bg-[#FBBF24]/15 dark:bg-[#FBBF24]/10',
    text: 'text-amber-700 dark:text-[#FBBF24]',
    en: 'Neutral',
    ms: 'Neutral',
  },
};

const SentimentBadge = ({ sentiment }) => {
  const { lang } = useLanguage();
  const style = SENTIMENT_STYLES[sentiment] || SENTIMENT_STYLES.Neutral;
  const label = style[lang] || style.en;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] ${style.bg} ${style.text}`}>
      {label}
    </span>
  );
};

export default React.memo(SentimentBadge);
