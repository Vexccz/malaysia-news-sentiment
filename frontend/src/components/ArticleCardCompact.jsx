import { Link } from 'react-router-dom';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { ExternalLink, Bookmark, BookmarkCheck, Share2, Copy, X } from 'lucide-react';
import SentimentBadge from './SentimentBadge';
import { useArticleAnalysis } from '../context/ArticleAnalysisContext';

// ─── Sentiment border color map ─────────────────────────────────────────────
const SENTIMENT_BORDER = {
  Positive: 'border-l-[#4ADE80]',
  Negative: 'border-l-[#FB7185]',
  Neutral:  'border-l-[#FBBF24]',
};

const SENTIMENT_BG = {
  Positive: 'bg-[#4ADE80]',
  Negative: 'bg-[#FB7185]',
  Neutral:  'bg-[#FBBF24]',
};

const SOURCE_COLORS = [
  'bg-[#1a1a1a] dark:bg-[#e5e5e5]',
  'bg-[#374151] dark:bg-[#d1d5db]',
  'bg-[#4b5563] dark:bg-[#9ca3af]',
  'bg-[#6b7280] dark:bg-[#6b7280]',
  'bg-[#334155] dark:bg-[#cbd5e1]',
];

// ─── Custom long-press hook ──────────────────────────────────────────────────
function useLongPress(callback, { delay = 500 } = {}) {
  const timeoutRef = useRef(null);
  const isLongPress = useRef(false);
  const targetRef = useRef(null);

  const start = useCallback(
    (e) => {
      if (e.button && e.button !== 0) return;
      isLongPress.current = false;
      targetRef.current = e.currentTarget;
      timeoutRef.current = setTimeout(() => {
        isLongPress.current = true;
        callback(e);
      }, delay);
    },
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    isLongPress,
  };
}

// ─── Action Sheet ────────────────────────────────────────────────────────────
const ActionSheet = ({ isOpen, onClose, onBookmark, onOpenExternal, onShare, onCopyLink, isBookmarked }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed bottom-0 left-0 right-0 z-[1000] bg-white dark:bg-[#111] border-t border-[#e5e5e5] dark:border-[#222]"
            style={{ borderRadius: '0' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 dark:bg-[#444]" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#e5e5e5] dark:border-[#222]">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-sans">
                Quick Actions
              </span>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-400 dark:text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-3 py-2 flex flex-col">
              <ActionSheetButton
                icon={isBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                label={isBookmarked ? 'Remove Bookmark' : 'Bookmark Article'}
                onClick={() => { onBookmark(); onClose(); }}
                accent={isBookmarked}
              />
              <ActionSheetButton
                icon={<Share2 className="w-5 h-5" />}
                label="Share Article"
                onClick={() => { onShare(); onClose(); }}
              />
              <ActionSheetButton
                icon={<ExternalLink className="w-5 h-5" />}
                label="Open Original"
                onClick={() => { onOpenExternal(); onClose(); }}
              />
              <ActionSheetButton
                icon={<Copy className="w-5 h-5" />}
                label="Copy Link"
                onClick={() => { onCopyLink(); onClose(); }}
              />
            </div>
            <div className="px-3 pb-4 pt-1">
              <button
                onClick={onClose}
                className="w-full py-3 text-sm font-semibold bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#252525] transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const ActionSheetButton = ({ icon, label, onClick, accent }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${
      accent
        ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
    }`}
  >
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

// ─── Source initial circle ───────────────────────────────────────────────────
const SourceInitial = ({ source }) => {
  const initial = (source || 'U').charAt(0).toUpperCase();
  const colorIndex = (source || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % SOURCE_COLORS.length;
  return (
    <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white dark:text-[#111] ${SOURCE_COLORS[colorIndex]}`}>
      {initial}
    </div>
  );
};

// ─── Swipe hint overlay ──────────────────────────────────────────────────────
const SwipeHint = ({ direction, visible }) => {
  const isBookmark = direction === 'left';
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={`absolute inset-y-0 flex items-center z-10 pointer-events-none ${
            isBookmark ? 'right-0 pr-4' : 'left-0 pl-4'
          }`}
        >
          <div
            className={`flex items-center gap-2 px-3 py-2 border ${
              isBookmark
                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {isBookmark ? <Bookmark className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
              {isBookmark ? 'Bookmark' : 'Open'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const ArticleCardCompact = ({ article, onClick, onBookmark, isBookmarked }) => {
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [swipeHintDir, setSwipeHintDir] = useState(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { openArticlePanel } = useArticleAnalysis();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const x = useMotionValue(0);
  const swipeThreshold = 80;
  const swipeBg = useTransform(
    x,
    [-120, -40, 0, 40, 120],
    [
      'rgba(245,158,11,0.15)',
      'rgba(245,158,11,0.06)',
      'transparent',
      'rgba(16,185,129,0.06)',
      'rgba(16,185,129,0.15)',
    ]
  );

  const unsubscribeX = useRef(null);
  useEffect(() => {
    if (!isMobile) return;
    unsubscribeX.current = x.on('change', (latest) => {
      if (latest < -30) setSwipeHintDir('left');
      else if (latest > 30) setSwipeHintDir('right');
      else setSwipeHintDir(null);
    });
    return () => unsubscribeX.current?.();
  }, [x, isMobile]);

  const getFavicon = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch { return null; }
  };

  const handleBookmark = (e) => {
    e?.stopPropagation?.();
    if (onBookmark) onBookmark(article._id || article.id);
  };

  const handleOpenExternal = (e) => {
    e?.stopPropagation?.();
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async () => {
    const shareData = {
      title: article.title,
      text: article.description || article.title,
      url: article.url || window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(article.url || window.location.href);
        flashCopied();
      }
    } catch {
      try {
        await navigator.clipboard.writeText(article.url || window.location.href);
        flashCopied();
      } catch { /* give up */ }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(article.url || window.location.href);
      flashCopied();
    } catch { /* clipboard unavailable */ }
  };

  const flashCopied = () => {
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 1800);
  };

  const longPress = useLongPress(() => setActionSheetOpen(true), { delay: 500 });

  const handleCardClick = () => {
    if (longPress.isLongPress.current) return;
    if (onClick) onClick(article); else openArticlePanel(article);
  };

  const handleSwipeEnd = (_, info) => {
    const { offset, velocity } = info;
    if (offset.x < -swipeThreshold || velocity.x < -300) {
      handleBookmark();
    } else if (offset.x > swipeThreshold || velocity.x > 300) {
      handleOpenExternal();
    }
  };

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

  const truncateTitle = (text, maxLength = 120) => {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const sentiment = article.sentiment || 'Neutral';
  const borderColor = SENTIMENT_BORDER[sentiment] || SENTIMENT_BORDER.Neutral;

  return (
    <>
      <div className="relative group">
        {/* Swipe background layers - mobile only */}
        {isMobile && (
          <motion.div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ background: swipeBg }}
          >
            <SwipeHint direction="left" visible={swipeHintDir === 'left'} />
            <SwipeHint direction="right" visible={swipeHintDir === 'right'} />
          </motion.div>
        )}

        {/* Swipeable card — editorial style */}
        <motion.div
          x={isMobile ? x : undefined}
          drag={isMobile ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={isMobile ? handleSwipeEnd : undefined}
          onClick={handleCardClick}
          {...(isMobile ? longPress : {})}
          style={isMobile ? { x, touchAction: 'pan-y' } : {}}
          className={`relative z-20 bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] border-l-[3px] ${borderColor} py-4 px-5 hover:bg-[#fafafa] dark:hover:bg-[#161616] transition-[background-color] cursor-pointer select-none`}
          whileTap={isMobile ? { scale: 0.995 } : {}}
        >
          <div className="flex gap-4">
            {/* Thumbnail — left side */}
            {article.urlToImage && !imageError ? (
              <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 overflow-hidden">
                <img
                  src={article.urlToImage}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 pt-0.5">
                {article.url && !faviconError ? (
                  <img
                    src={getFavicon(article.url)}
                    alt=""
                    className="w-7 h-7 flex-shrink-0"
                    loading="lazy"
                    onError={() => setFaviconError(true)}
                  />
                ) : (
                  <SourceInitial source={article.source} />
                )}
              </div>
            )}

            {/* Content — right side */}
            <div className="flex-1 min-w-0">
              {/* Top meta row: Source + Date + Sentiment */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 font-sans">
                    {article.source || 'Unknown'}
                  </span>
                  {article.category && (
                    <>
                      <span className="text-gray-300 dark:text-[#333]">|</span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 font-sans">
                        {article.category}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-sans tracking-wide whitespace-nowrap">
                    {timeAgo(article.publishedAt || article.createdAt)}
                  </span>
                  <SentimentBadge sentiment={sentiment} />
                </div>
              </div>

              {/* Title — serif editorial */}
              <h3 className="font-['Playfair_Display'] text-[17px] sm:text-lg font-bold text-gray-900 dark:text-white mb-1.5 leading-snug line-clamp-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                {truncateTitle(article.title)}
              </h3>

              {/* Summary */}
              {article.summary && (
                <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                  {article.summary}
                </p>
              )}

              {/* Footer: Confidence + Actions */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#eee] dark:border-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  {article.confidence && (
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em]">
                      {Math.round(article.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleBookmark}
                    className={`p-1.5 transition-colors ${
                      isBookmarked
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <Link
                    to={'/articles/' + (article._id || article.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="View full analysis"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  </Link>
                  <button
                    onClick={handleOpenExternal}
                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Open article"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* "Copied!" toast */}
      <AnimatePresence>
        {copiedToast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1001] px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold shadow-lg"
          >
            Link copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Sheet - mobile only */}
      {isMobile && (
        <ActionSheet
          isOpen={actionSheetOpen}
          onClose={() => setActionSheetOpen(false)}
          onBookmark={handleBookmark}
          onOpenExternal={handleOpenExternal}
          onShare={handleShare}
          onCopyLink={handleCopyLink}
          isBookmarked={isBookmarked}
        />
      )}
    </>
  );
};

export default ArticleCardCompact;
