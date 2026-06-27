import { Link } from 'react-router-dom';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SentimentBadge from './SentimentBadge';
import SentimentSparkline from './SentimentSparkline';
import AlertBadge from './AlertBadge';
import ShareButton from './ShareButton';
import { useArticleAnalysis } from '../context/ArticleAnalysisContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { formatRelativeTime, formatAbsoluteDate } from '../utils/dateFormat';
import { translateArticle } from '../services/translateService';
import { hapticImpact } from '../utils/haptics';
import { proxyImage } from '../utils/imageProxy';
import toast from 'react-hot-toast';

const getFaviconUrl = (url) => {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return null;
  }
};

const deriveSourceLabel = (source, url, lang, t) => {
  if (source && source !== 'Unknown' && source !== 'Source' && source !== 'Media Source') {
    return source;
  }

  if (!url) return t('newsSource', 'News Source');

  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const label = host.split('.')[0] || host;
    return label
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return t('newsSource', 'News Source');
  }
};

const ArticleCard = ({ article, onPreview, onDelete, onBookmark, isBookmarked }) => {
  const { openArticlePanel } = useArticleAnalysis();
  const socket = useSocket();
  const { lang, t } = useLanguage();
  const [localViewCount, setLocalViewCount] = useState(article.viewCount || article.views || 0);
  const [localBookmarkCount, setLocalBookmarkCount] = useState(article.bookmarksCount || 0);

  // Translation state
  const [translated, setTranslated] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const articleId = article._id || article.id;
    
    const handleViewUpdate = (data) => {
      if (data.articleId === articleId) {
        setLocalViewCount(data.viewCount);
      }
    };

    const handleBookmarkUpdate = (data) => {
      if (data.articleId === articleId) {
        setLocalBookmarkCount(data.bookmarksCount);
      }
    };

    socket.on('view_updated', handleViewUpdate);
    socket.on('bookmark_updated', handleBookmarkUpdate);

    return () => {
      socket.off('view_updated', handleViewUpdate);
      socket.off('bookmark_updated', handleBookmarkUpdate);
    };
  }, [socket, article._id, article.id]);

  const { 
    id, _id, title, description, source, url, urlToImage, 
    publishedAt, topic, sentiment, reason, confidence, isAlert
  } = article;

  const articleId = _id || id;
  const sourceLabel = deriveSourceLabel(source, url, lang, t);

  const handlePreview = (e) => {
    if (e.target.closest('.art-external-link')) return;
    if (e.target.closest('.art-delete-btn')) return;
    if (e.target.closest('.art-bookmark-btn')) return;
    if (e.target.closest('.art-translate-btn')) return;
    
    e.preventDefault();
    if (onPreview) {
      onPreview(article);
    } else {
      openArticlePanel(article);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete && articleId) onDelete(articleId);
  };

  const handleBookmark = (e) => {
    e.stopPropagation();
    hapticImpact('Light');
    if (onBookmark && articleId) onBookmark(articleId);
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const shareData = { title: title, text: description?.slice(0, 100) || title, url: url };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t('linkCopied', 'Link copied!'));
      } catch {}
    }
  };

  // Translate button handler
  const handleTranslate = useCallback(async (e) => {
    e.stopPropagation();

    // If already translated, toggle back to original
    if (translated) {
      setTranslated(null);
      return;
    }

    setIsTranslating(true);
    try {
      const targetLang = lang === 'ms' ? 'en' : 'ms'; // Translate to the OTHER language
      const result = await translateArticle(article, targetLang);
      setTranslated({ ...result, lang: targetLang });
    } catch {
      toast.error(t('translateError', 'Translation failed'));
    } finally {
      setIsTranslating(false);
    }
  }, [translated, lang, article, t]);

  // Clear translation when language changes
  useEffect(() => {
    setTranslated(null);
  }, [lang]);

  const faviconUrl = useMemo(() => getFaviconUrl(url), [url]);
  const relativeTime = useMemo(() => formatRelativeTime(publishedAt, lang, true), [publishedAt, lang]);

  // Use translated content if available
  const displayTitle = translated?.title || title;
  const displayDescription = translated?.description || description;

  return (
    <div
      onClick={handlePreview}
      className={`article-card ${isAlert ? 'article-card--alert' : 'article-card--interactive'}`}
      data-sentiment={sentiment}
      aria-label={`${title} — ${sentiment} sentiment${isAlert ? ' — Alert' : ''}`}
      style={{ cursor: 'pointer' }}
      data-sentiment-border={sentiment}
    >
      {/* Thumbnail */}
      <div className="art-thumb-container">
        {urlToImage ? (
          <img 
            src={proxyImage(urlToImage)} 
            alt={title} 
            className="art-thumb" 
            loading="lazy"
            decoding="async"
            style={{ background: 'var(--brand-bg)' }}
            onError={(e) => { 
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
            }} 
          />
        ) : null}
        
        <div className="art-thumb-ph" style={{ display: urlToImage ? 'none' : 'flex' }}>
          <div className="art-ph-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
              <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
            </svg>
          </div>
          <div className="art-ph-bg" />
        </div>
      </div>

      {/* Body */}
      <div className="art-body">
        <div className="art-meta">
          {faviconUrl && (
            <img src={faviconUrl} alt="" width="14" height="14" style={{ borderRadius: 2, marginRight: 2 }} loading="lazy" />
          )}
          <span className="art-source">{sourceLabel}</span>
          <span className="art-sep">·</span>
          <span className="art-date" title={formatAbsoluteDate(publishedAt, lang)}>{relativeTime}</span>
          {topic && <span className="art-topic">#{topic}</span>}
          {isAlert && <AlertBadge />}
          {translated && (
            <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('translated', 'Translated')}
            </span>
          )}
        </div>

        <h3 className="art-title">{displayTitle}</h3>
        {displayDescription && <p className="art-desc">{displayDescription.slice(0, 160)}{displayDescription.length > 160 ? '...' : ''}</p>}

        <div className="art-footer">
          <div className="art-footer-left">
            <SentimentBadge sentiment={sentiment} />
            {sentiment && (
              <SentimentSparkline sentiment={sentiment} score={confidence} />
            )}
            {confidence !== undefined && confidence > 0 && (
              <div className="art-confidence-container">
                <div className="art-confidence-track">
                  <div 
                    className="art-confidence-fill" 
                    style={{ width: `${Math.round(confidence * 100)}%`, background: `var(--${sentiment.toLowerCase()})` }}
                  />
                </div>
                <span className="art-conf-text">{Math.round(confidence * 100)}% {t('confidence', 'confidence')}</span>
              </div>
            )}
          </div>
          
          <div className="art-footer-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
             <div className="art-view-pill" style={{ 
               display: 'flex', alignItems: 'center', gap: 5, 
               fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
               padding: '2px 8px', borderRadius: 6
             }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                {localViewCount}
             </div>

             <div className="art-bookmark-pill" style={{ 
               display: 'flex', alignItems: 'center', gap: 5, 
               fontSize: 11, fontWeight: 600, color: localBookmarkCount > 0 ? '#f59e0b' : 'var(--text-muted)',
               padding: '2px 8px', borderRadius: 6,
               opacity: localBookmarkCount > 0 ? 1 : 0.6
             }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill={localBookmarkCount > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                </svg>
                {localBookmarkCount}
             </div>

             <span onClick={(e) => e.stopPropagation()}>
               <ShareButton articleId={articleId} title={title} sentiment={sentiment} />
             </span>

             {/* Translate button */}
             <button
               className="art-translate-btn"
               onClick={handleTranslate}
               disabled={isTranslating}
               title={translated ? (t('showOriginal', 'Show Original')) : (t('translate', 'Translate'))}
               style={{
                 background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                 color: translated ? 'var(--accent)' : 'var(--text-400)',
                 transition: 'all 0.2s ease',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 opacity: isTranslating ? 0.5 : 1,
               }}
             >
               {isTranslating ? (
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                   <path d="M21 12a9 9 0 11-6.219-8.56"/>
                 </svg>
               ) : (
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
                   <path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>
                 </svg>
               )}
             </button>

             {onBookmark && (
               <button
                                aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                                className={`art-bookmark-btn ${isBookmarked ? 'active' : ''}`}
                                onClick={handleBookmark}
                title={isBookmarked ? t('removeBookmark') : t('addToBookmarks')}
                style={{
                  background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                  color: isBookmarked ? '#f59e0b' : 'var(--text-400)',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
               >
                 <svg width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                 </svg>
               </button>
             )}

             {onDelete && (
               <button
                                 aria-label="Delete article"
                                 className="art-delete-btn"
                                 onClick={handleDelete}
                 title={t('deletePermanently')}
               >
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                 </svg>
               </button>
             )}

              <Link
              to={'/articles/' + articleId}
              className="art-external-link"
              title={t('viewFullAnalysis')}
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none', padding: '2px 6px' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              {t('details', 'Details')}
            </Link>

            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="art-external-link"
              title={t('openOriginalSource')}
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        </div>
        
        {reason && <p className="art-reason-short">"{reason}"</p>}
      </div>
    </div>
  );
};

export default React.memo(ArticleCard);
