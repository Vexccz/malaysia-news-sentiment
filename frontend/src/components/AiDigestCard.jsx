import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const AiDigestCard = ({ digest, loading, topic }) => {
  const { lang, t } = useLanguage();

  if (loading) {
    return (
      <div className="digest-panel is-loading">
        <div className="digest-avatar">🤖</div>
        <div className="digest-body">
          <div className="digest-header">
            <span className="digest-tag">AI Digest</span>
            <span className="digest-topic">{t('loading')}...</span>
          </div>
          <div className="digest-skeleton">
            <div className="skeleton" style={{ height: 13, width: '90%', borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 13, width: '75%', borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 13, width: '55%', borderRadius: 6 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!digest) return null;

  const currentDigest = typeof digest === 'object' ? (digest[lang] || digest['en'] || '') : digest;

  return (
    <div className="forecast-panel premium-forecast digest-variant">
      {/* Cinematic Header Bar */}
      <div className="forecast-title-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {t('aiDigestTitle', 'AI INTELLIGENCE DIGEST')}
      </div>

      <div className="forecast-meta-row">
        <span className="forecast-topic-label">{t('topic', 'Analysis Topic:')}</span>
        <span className="forecast-topic-value">{topic || t('generalNews')}</span>
      </div>

      <div className="forecast-split-layout">
        {/* Left column: Avatar Box */}
        <div className="forecast-score-box digest-avatar-box">
          <div className="digest-bot-icon">🤖</div>
          <div className="score-desc">{t('aiAgentActive', 'AI AGENT ACTIVE')}</div>
        </div>
        
        {/* Right column: The Digest Text */}
        <div className="forecast-details">
          <div className="digest-text">
            {String(currentDigest).replace(/\*/g, '').replace(/^- /gm, '')}
          </div>
        </div>
      </div>

      <div className="forecast-disclaimer-bar">
        {t('digestDisclaimer', 'Summarized by AI Agent based on top trending Malaysia media narratives.')}
      </div>
    </div>
  );
};

export default AiDigestCard;
