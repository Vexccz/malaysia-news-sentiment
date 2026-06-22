import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import { ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react';
import SentimentBadge from './SentimentBadge';
import { useArticleAnalysis } from '../context/ArticleAnalysisContext';

const ArticleCardCompact = ({ article, onClick, onBookmark, isBookmarked }) => {
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const { openArticlePanel } = useArticleAnalysis();

  const getFavicon = (url) => {
    if (!url) return null;
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch { return null; }
  };

  const handleBookmark = (e) => {
    e.stopPropagation();
    if (onBookmark) onBookmark(article._id || article.id);
  };

  const handleOpenExternal = (e) => {
    e.stopPropagation();
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  const handleCardClick = () => {
    if (onClick) onClick(article); else openArticlePanel(article);
  };

  // Format time ago
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' });
  };

  // Truncate title
  const truncateTitle = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  return (
    <div
      onClick={handleCardClick}
      className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer"
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
          {article.urlToImage && !imageError ? (
            <img
              src={article.urlToImage}
              alt={article.title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Source + Time + Sentiment Badge */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              {article.url && !faviconError ? (
                <img 
                  src={getFavicon(article.url)} 
                  alt="" 
                  className="w-4 h-4 flex-shrink-0"
                  loading="lazy"
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <span className="w-4 h-4 flex-shrink-0 bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[8px] font-bold text-slate-500 dark:text-slate-400">
                  {(article.source || 'U').charAt(0)}
                </span>
              )}
              <span className="font-bold uppercase tracking-wide">
                {article.source || 'Unknown'}
              </span>
              <span className="text-slate-400">•</span>
              <span>{timeAgo(article.publishedAt || article.createdAt)}</span>
              {article.category && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="text-emerald-600 dark:text-emerald-400">#{article.category}</span>
                </>
              )}
            </div>
            
            {/* Sentiment Badge */}
            <SentimentBadge 
              sentiment={article.sentiment} 
              confidence={article.confidence}
            />
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {truncateTitle(article.title)}
          </h3>

          {/* Summary */}
          {article.summary && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
              {article.summary}
            </p>
          )}

          {/* Footer: Confidence + Actions */}
          <div className="flex items-center justify-between">
            {/* Confidence Score */}
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {article.confidence && (
                <span className="font-medium">
                  {Math.round(article.confidence * 100)}% confidence
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Bookmark */}
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-lg transition-colors ${
                  isBookmarked
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>

              {/* View Details */}
              <Link
                to={'/articles/' + (article._id || article.id)}
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                title="View full analysis"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </Link>

              {/* Open External */}
              <button
                onClick={handleOpenExternal}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                title="Open article"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleCardCompact;
