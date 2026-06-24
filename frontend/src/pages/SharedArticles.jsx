import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import ArticleCardCompact from '../components/ArticleCardCompact';

const PLATFORM_FILTERS = [
  { id: 'all', label: 'All Platforms', icon: '🌐' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'twitter', label: 'Twitter / X', icon: '🐦' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'copy_link', label: 'Link', icon: '🔗' },
];

const PLATFORM_BADGES = {
  whatsapp: { label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  twitter: { label: 'Twitter', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  linkedin: { label: 'LinkedIn', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  email: { label: 'Email', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  copy_link: { label: 'Link', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const SharedArticles = () => {
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  const fetchShared = useCallback(async (p = 1, plat = platform) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (plat !== 'all') params.platform = plat;

      const res = await api.get('/collab/shared', { params });
      const data = res.data;

      if (p === 1) {
        setShared(data.shared || []);
      } else {
        setShared(prev => [...prev, ...(data.shared || [])]);
      }
      setPage(p);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch shared articles:', err);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    fetchShared(1, platform);
  }, [platform]);

  const handlePlatformChange = (plat) => {
    setPlatform(plat);
    setShared([]);
  };

  const handleBookmark = async (id) => {
    try {
      await api.post(`/news/${id}/bookmark`);
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } catch {}
  };

  return (
    <div className="bg-paper min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6 lg:px-0">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            Shared Articles
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Articles shared by the community · {total} shares
          </p>
        </div>

        {/* Platform Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {PLATFORM_FILTERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePlatformChange(p.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                platform === p.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                  : 'bg-slate-100 dark:bg-[#222] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#333]'
              }`}
            >
              <span>{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>

        {/* Articles */}
        {loading && shared.length === 0 ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-slate-200 dark:border-[#2a2a2a]">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-lg bg-slate-200 dark:bg-[#333]" />
                  <div className="flex-1 space-y-3">
                    <div className="h-3 w-24 bg-slate-200 dark:bg-[#333] rounded" />
                    <div className="h-4 w-full bg-slate-100 dark:bg-[#252525] rounded" />
                    <div className="h-3 w-2/3 bg-slate-100 dark:bg-[#252525] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : shared.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-200 dark:text-[#333]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">No shared articles yet</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Be the first to share an article with the community.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {shared.map((item, index) => {
              const article = {
                ...item.article,
                _shareInfo: {
                  lastSharedAt: item.lastSharedAt,
                  shareCount: item.shareCount,
                  platforms: item.platforms,
                },
              };

              return (
                <motion.div
                  key={item.article._id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <ArticleCardCompact
                    article={article}
                    isBookmarked={bookmarkedIds.has(article._id)}
                    onBookmark={handleBookmark}
                  />
                  {/* Share metadata bar */}
                  <div className="flex items-center gap-2 px-4 -mt-2 pb-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Shared {timeAgo(item.lastSharedAt)}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {item.shareCount} {item.shareCount === 1 ? 'share' : 'shares'}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <div className="flex gap-1">
                      {(item.platforms || []).map((p) => {
                        const badge = PLATFORM_BADGES[p];
                        return badge ? (
                          <span key={p} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {page < totalPages && (
              <button
                onClick={() => fetchShared(page + 1)}
                className="w-full py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-[#333] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1e1e1e] transition-colors"
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedArticles;
