import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const SENTIMENT_META = {
  Positive: { icon: '↑', en: 'Positive', ms: 'Positif' },
  Negative: { icon: '↓', en: 'Negative', ms: 'Negatif' },
  Neutral:  { icon: '→', en: 'Neutral',  ms: 'Neutral' },
};

const SentimentBadge = ({ sentiment }) => {
  const { lang } = useLanguage();
  const meta = SENTIMENT_META[sentiment] || SENTIMENT_META.Neutral;
  const label = meta[lang] || meta.en;
  return (
    <span className={`s-badge s-badge--${sentiment}`}>
      <span style={{ fontSize: '13px', lineHeight: 1 }}>{meta.icon}</span>
      {label}
    </span>
  );
};

export default React.memo(SentimentBadge);
