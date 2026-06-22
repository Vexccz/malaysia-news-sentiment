import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const ForecastCard = ({ forecast, loading, topic }) => {
  const { lang, t } = useLanguage();

  if (loading) {
    return (
      <div className="border border-ink/10 dark:border-paper/10 p-5 animate-pulse">
        <div className="h-3 w-32 bg-ink/5 dark:bg-paper/5 mb-4" />
        <div className="h-4 w-full bg-ink/5 dark:bg-paper/5 mb-2" />
        <div className="h-4 w-3/4 bg-ink/5 dark:bg-paper/5" />
      </div>
    );
  }

  if (!forecast) return null;

  const { projectionScore } = forecast;
  const langData = forecast[lang] || forecast['en'] || {};
  const { outlook, risks } = langData;

  if (!outlook) return null;

  const getScoreColor = (score) => {
    if (score >= 70) return '#059669';
    if (score >= 40) return '#d97706';
    return '#dc2626';
  };

  return (
    <div className="border border-ink/10 dark:border-paper/10">
      {/* Header */}
      <div className="border-b border-ink/10 dark:border-paper/10 px-5 py-3 flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/40 dark:text-paper/40">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
        </svg>
        <span className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">
          {t('forecastTitle') || 'AI Sentiment Forecast'}
        </span>
      </div>

      <div className="p-5">
        {/* Topic */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] uppercase tracking-[0.15em] text-ink/40 dark:text-paper/40 font-sans">{t('topic')}:</span>
          <span className="text-xs font-semibold text-ink dark:text-paper font-sans">{topic || t('generalOutlook')}</span>
        </div>

        <div className="flex gap-6">
          {/* Score */}
          <div className="flex-shrink-0 text-center">
            <div className="font-['Playfair_Display'] text-4xl font-bold" style={{ color: getScoreColor(projectionScore) }}>
              {projectionScore}
            </div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-ink/40 dark:text-paper/40 font-sans mt-1">
              /100
            </div>
            <div className="text-[9px] uppercase tracking-[0.15em] text-ink/30 dark:text-paper/30 font-sans mt-1">
              {t('projectedSentiment') || 'Projected'}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              {Array.isArray(outlook) ? (
                outlook.map((para, idx) => (
                  <p key={idx} className="text-sm text-ink/70 dark:text-paper/70 leading-relaxed mb-2 font-sans">
                    {String(para).replace(/\*/g, '')}
                  </p>
                ))
              ) : (
                <p className="text-sm text-ink/70 dark:text-paper/70 leading-relaxed font-sans">
                  {String(outlook).replace(/\*/g, '')}
                </p>
              )}
            </div>

            {risks && risks.length > 0 && (
              <div>
                <h4 className="text-[10px] uppercase tracking-[0.15em] text-ink/40 dark:text-paper/40 font-sans mb-2">
                  {t('risksTrends') || 'Rising Trends / Risks'}
                </h4>
                <ul className="space-y-1">
                  {risks.map((risk, idx) => (
                    <li key={idx} className="text-xs text-ink/60 dark:text-paper/60 font-sans flex items-start gap-2">
                      <span className="text-ink/30 dark:text-paper/30 mt-0.5">—</span>
                      <span>{String(risk).replace(/\*/g, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-ink/10 dark:border-paper/10 px-5 py-2">
        <span className="text-[9px] uppercase tracking-[0.15em] text-ink/30 dark:text-paper/30 font-sans">
          {t('forecastDisclaimer') || 'AI-generated forecast based on latest news sentiment patterns.'}
        </span>
      </div>
    </div>
  );
};

export default ForecastCard;
