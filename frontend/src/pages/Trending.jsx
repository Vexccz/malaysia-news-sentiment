import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getTopViewed } from '../services/api';
import ArticleCard from '../components/ArticleCard';
import ArticlePreviewModal from '../components/ArticlePreviewModal';
import toast from 'react-hot-toast';

const Trending = () => {
  const [articles, setArticles] = useState([]);
  const [timeframe, setTimeframe] = useState('today');
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    const loadTrending = async () => {
      setLoading(true);
      try {
        const data = await getTopViewed({ timeframe });
        setArticles(data);
      } catch {
        toast.error('Failed to load trending news');
      } finally {
        setLoading(false);
      }
    };
    loadTrending();
  }, [timeframe]);

  const handlePreview = (article) => setSelectedArticle(article);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header — newspaper section style */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-baseline gap-3 mb-1">
            <h1 className="text-3xl font-bold text-ink dark:text-paper tracking-tight font-display">
              Trending News
            </h1>
          </div>
          <div className="editorial-rule mb-2" />
          <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">
            Most-read stories across Malaysian media, ranked by reader engagement.
          </p>
        </div>

        {/* Timeframe — editorial tab style */}
        <div className="flex items-center gap-0">
          {[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This Week' },
          ].map((opt, i) => (
            <React.Fragment key={opt.value}>
              {i > 0 && <span className="text-ink-faint mx-1.5">|</span>}
              <button
                onClick={() => setTimeframe(opt.value)}
                className={`text-xs font-medium uppercase tracking-wider transition-colors font-sans px-1 ${
                  timeframe === opt.value
                    ? 'text-ink dark:text-paper font-bold'
                    : 'text-ink-faint hover:text-ink-muted'
                }`}
              >
                {opt.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card divide-y divide-paper-line dark:divide-paper-dark-line">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 bg-gray-200 dark:bg-gray-700 w-3/4 mb-2.5" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 w-full mb-2" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
          <div className="text-4xl mb-4 opacity-15">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-ink-muted">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-ink dark:text-paper mb-1.5 font-display">
            No trending articles yet
          </h3>
          <p className="text-xs text-ink-faint max-w-sm mx-auto font-sans leading-relaxed">
            Trending stories appear once enough readers engage with the news. Check back after some activity.
          </p>
        </div>
      ) : (
        <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card divide-y divide-paper-line dark:divide-paper-dark-line">
          {articles.map((art, idx) => (
            <div key={art._id} className="flex items-start gap-4">
              {/* Rank number — editorial style */}
              <div className="flex-shrink-0 w-10 text-center pt-4">
                <span className={`text-lg font-black font-display ${
                  idx < 3 ? 'text-ink dark:text-paper' : 'text-ink-faint'
                }`}>
                  {idx + 1}
                </span>
              </div>

              {/* Article content */}
              <div className="flex-1 min-w-0">
                <ArticleCard 
                  article={art} 
                  onPreview={handlePreview}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <ArticlePreviewModal 
        key={selectedArticle?._id || 'trending-preview'}
        article={selectedArticle} 
        isOpen={!!selectedArticle} 
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
};

export default Trending;
