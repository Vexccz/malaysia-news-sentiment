import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const PLATFORMS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    color: 'bg-emerald-500',
    hoverColor: 'hover:bg-emerald-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    color: 'bg-sky-500',
    hoverColor: 'hover:bg-sky-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: 'bg-blue-700',
    hoverColor: 'hover:bg-blue-800',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: 'email',
    name: 'Email',
    color: 'bg-slate-600',
    hoverColor: 'hover:bg-slate-700',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 7 12 13 2 7"/>
      </svg>
    ),
  },
];

const ShareModal = ({ isOpen, onClose, article }) => {
  const [copying, setCopying] = useState(false);

  if (!article) return null;

  const articleUrl = article.url || `${window.location.origin}/articles/${article._id || article.id}`;
  const shareTitle = article.title || 'Check out this article';
  const shareText = article.description || shareTitle;

  const trackShareAction = async (platform) => {
    try {
      await api.post('/collab/share', {
        articleId: article._id || article.id,
        platform,
      });
    } catch {
      // silently fail - don't block sharing
    }
  };

  const handleShare = async (platform) => {
    let url = '';

    switch (platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(`${shareTitle}\n${articleUrl}`)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(articleUrl)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareText}\n\n${articleUrl}`)}`;
        break;
      default:
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    await trackShareAction(platform);
    onClose();
  };

  const handleCopyLink = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(articleUrl);
      await trackShareAction('copy_link');
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    } finally {
      setCopying(false);
      onClose();
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: articleUrl });
        await trackShareAction('copy_link');
      } catch {
        // User cancelled
      }
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-[2px]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[1101] bg-white dark:bg-[#1a1a1a] border-t sm:border border-slate-200 dark:border-[#2a2a2a] sm:rounded-xl max-w-md w-full"
            style={{ borderRadius: window.innerWidth <= 640 ? '12px 12px 0 0' : undefined }}
          >
            {/* Handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-[#444]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-[#2a2a2a]">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Share Article
              </span>
              <button
                aria-label="Close share dialog"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#252525] text-slate-400 dark:text-slate-500 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Article Preview */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-[#2a2a2a]">
              <p className="text-sm font-semibold text-slate-800 dark:text-white line-clamp-2 leading-snug">
                {shareTitle}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                {articleUrl}
              </p>
            </div>

            {/* Platform Buttons */}
            <div className="px-5 py-4 grid grid-cols-4 gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleShare(p.id)}
                  className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#222] transition-colors"
                >
                  <div className={`w-12 h-12 rounded-full ${p.color} ${p.hoverColor} text-white flex items-center justify-center transition-colors`}>
                    {p.icon}
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{p.name}</span>
                </button>
              ))}
            </div>

            {/* Copy Link */}
            <div className="px-5 pb-5">
              <button
                onClick={handleCopyLink}
                disabled={copying}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 dark:border-[#333] text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                {copying ? 'Copying...' : 'Copy Link'}
              </button>
            </div>

            {/* Native Share (if available) */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <div className="px-5 pb-5 sm:hidden">
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
                >
                  More sharing options...
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ShareModal;
