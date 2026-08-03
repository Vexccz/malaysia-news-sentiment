import { Link } from 'react-router-dom';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { ExternalLink, Bookmark, BookmarkCheck, Share2, Copy, X } from 'lucide-react';
import { PushButton } from './kinetics';
import SentimentBadge from './SentimentBadge';
import { useArticleAnalysis } from '../context/ArticleAnalysisContext';

// ─── Custom long-press hook ──────────────────────────────────────────────────
function useLongPress(callback, { delay = 500 } = {}) {
  const timeoutRef = useRef(null);
  const isLongPress = useRef(false);
  const targetRef = useRef(null);

  const start = useCallback(
    (e) => {
      // Ignore right-clicks
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
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed bottom-0 left-0 right-0 z-[1000] bg-white dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-[#2a2a2a]"
            style={{ borderRadius: '12px 12px 0 0' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-[#444]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-[#2a2a2a]">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Quick Actions
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#252525] text-slate-400 dark:text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
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

            {/* Cancel */}
            <div className="px-3 pb-4 pt-1">
              <button
                onClick={onClose}
                className="w-full py-3 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-[#252525] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#303030] transition-colors active:scale-[0.98]"
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
    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors active:scale-[0.98] ${
      accent
        ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#252525]'
    }`}
  >
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

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
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              isBookmark
                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {isBookmark ? <Bookmark className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
            <span className="text-xs font-bold uppercase tracking-wide">
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

  // Track mobile state
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Motion values for swipe (mobile only)
  const x = useMotionValue(0);
  const swipeThreshold = 80;

  // Track swipe direction for hints (mobile only)
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
      // User cancelled or API not available — silently fallback
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

  // Long press
  const longPress = useLongPress(() => setActionSheetOpen(true), { delay: 500 });

  const handleCardClick = () => {
    if (longPress.isLongPress.current) return;
    if (onClick) onClick(article); else openArticlePanel(article);
  };

  // Swipe complete handlers
  const handleSwipeEnd = (_, info) => {
    const { offset, velocity } = info;
    if (offset.x < -swipeThreshold || velocity.x < -300) {
      handleBookmark();
    } else if (offset.x > swipeThreshold || velocity.x > 300) {
      handleOpenExternal();
    }
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
    <>
      <div
        className="relative group"
      >
        {/* Swipe background layers - mobile only */}
        {isMobile && (
          <motion.div
            className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
            style={{
              background: useTransform(
                x,
                [-120, -40, 0, 40, 120],
                [
                  'rgba(245,158,11,0.15)',
                  'rgba(245,158,11,0.06)',
                  'transparent',
                  'rgba(16,185,129,0.06)',
                  'rgba(16,185,129,0.15)',
                ]
              ),
            }}
          >
            <SwipeHint direction="left" visible={swipeHintDir === 'left'} />
            <SwipeHint direction="right" visible={swipeHintDir === 'right'} />
          </motion.div>
        )}

        {/* Swipeable card */}
        <motion.div
          x={isMobile ? x : undefined}
          drag={isMobile ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={isMobile ? handleSwipeEnd : undefined}
          onClick={handleCardClick}
          {...(isMobile ? longPress : {})}
          style={isMobile ? { x, touchAction: 'pan-y' } : {}}
          className="relative z-20 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl p-4 hover:shadow-lg hover:border-slate-300 dark:hover:border-[#3a3a3a] transition-[border-color,box-shadow] cursor-pointer select-none"
          whileTap={isMobile ? { scale: 0.995 } : {}}
        >
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-slate-100 dark:bg-[#252525]">
              {article.urlToImage && !imageError ? (
                <img
                  src={article.urlToImage}
                  alt={article.title}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                  draggable={false}
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
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  {article.url && !faviconError ? (
                    <img
                      src={getFavicon(article.url)}
                      alt=""
                      className="w-4 h-4 flex-shrink-0"
                      loading="lazy"
                      onError={() => setFaviconError(true)}
                    />
                  ) : (
                    <span className="w-4 h-4 flex-shrink-0 bg-slate-200 dark:bg-[#333] flex items-center justify-center text-[8px] font-bold text-slate-500 dark:text-slate-300">
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
                <div className="text-xs text-slate-500 dark:text-slate-300">
                  {article.confidence && (
                    <span className="font-medium">
                      {Math.round(article.confidence * 100)}% confidence
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Bookmark */}
                  <PushButton
                    depth={3}
                    onClick={handleBookmark}
                    className={`!p-2 !rounded-lg transition-colors ${
                      isBookmarked
                        ? '!bg-amber-100 !text-amber-600 dark:!bg-amber-900/30 dark:!text-amber-400'
                        : '!bg-transparent hover:!bg-slate-100 dark:hover:!bg-[#252525] !text-slate-600 dark:!text-slate-300'
                    }`}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </PushButton>

                  {/* View Details */}
                  <PushButton
                    depth={3}
                    onClick={(e) => { e.stopPropagation(); }}
                    className="!p-2 !rounded-lg !bg-transparent hover:!bg-slate-100 dark:hover:!bg-[#252525] !text-slate-600 dark:!text-slate-300"
                    title="View full analysis"
                  >
                    <Link
                      to={'/articles/' + (article._id || article.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                    </Link>
                  </PushButton>

                  {/* Open External */}
                  <PushButton
                    depth={3}
                    onClick={handleOpenExternal}
                    className="!p-2 !rounded-lg !bg-transparent hover:!bg-slate-100 dark:hover:!bg-[#252525] !text-slate-600 dark:!text-slate-300"
                    title="Open article"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </PushButton>
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
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1001] px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold shadow-lg"
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
