import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';

const SharedArticle = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get('embed') === 'true';
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await api.get(`/share/${id}`);
        setArticle(res.data);
      } catch (err) {
        setError('Article not found or unavailable');
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  // Feature 16 — inject OG meta tags so social previews use the generated image
  useEffect(() => {
    if (!article) return;
    const apiBase = (import.meta.env.VITE_API_BASE || '/api/v1').replace(/\/$/, '');
    const ogImageUrl = `${apiBase}/share/${id}/og`;
    const pageUrl = window.location.href;
    const description = `${article.sentiment || 'Neutral'} sentiment · ${article.source || 'Source'} · MY News Sentiment`;

    const setMeta = (selector, attr, value) => {
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        const [, key] = selector.match(/\[(.+?)=/) || [];
        if (key) el.setAttribute(key, attr);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    document.title = `${article.title} · MY News Sentiment`;
    setMeta('meta[property="og:title"]', 'og:title', article.title);
    setMeta('meta[property="og:description"]', 'og:description', description);
    setMeta('meta[property="og:image"]', 'og:image', ogImageUrl);
    setMeta('meta[property="og:url"]', 'og:url', pageUrl);
    setMeta('meta[property="og:type"]', 'og:type', 'article');
    setMeta('meta[name="twitter:card"]', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'twitter:title', article.title);
    setMeta('meta[name="twitter:description"]', 'twitter:description', description);
    setMeta('meta[name="twitter:image"]', 'twitter:image', ogImageUrl);
  }, [article, id]);

  const sentimentColor = article?.sentiment === 'Positive' ? '#22c55e' : article?.sentiment === 'Negative' ? '#ef4444' : '#f59e0b';
  const sentimentBg = article?.sentiment === 'Positive' ? 'bg-green-50 dark:bg-green-500/10' : article?.sentiment === 'Negative' ? 'bg-red-50 dark:bg-red-500/10' : 'bg-amber-50 dark:bg-amber-500/10';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#0f0f0f]">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#0f0f0f]">
        <div className="text-center">
          <div className="text-4xl mb-4">📰</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Article Not Found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Embed mode - minimal card
  if (isEmbed) {
    return (
      <div className="p-4 bg-white dark:bg-[#1a1a1a] min-h-screen flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-white"
              style={{ background: sentimentColor }}
            >
              {article.sentiment}
            </span>
            <span className="text-[11px] text-gray-500">{article.source}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-2">{article.title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400">
              Confidence: {Math.round((article.confidence || 0) * 100)}%
            </span>
            <span className="text-[10px] text-accent font-medium">MYNewsSentiment</span>
          </div>
        </div>
      </div>
    );
  }

  // Full shared page
  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0f0f0f] py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
            </svg>
            MYNewsSentiment
          </div>
        </div>

        {/* Article Card */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm overflow-hidden shadow-sm">
          {article.urlToImage && (
            <img
              src={article.urlToImage}
              alt={article.title}
              className="w-full h-48 object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          
          <div className="p-6">
            {/* Sentiment Badge */}
            <div className="flex items-center gap-3 mb-4">
              <span
                className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                style={{ background: sentimentColor }}
              >
                {article.sentiment}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{article.source}</span>
              {article.topic && (
                <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-[11px] text-gray-600 dark:text-gray-400">
                  {article.topic}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
              {article.title}
            </h1>

            {/* Sentiment Visualization */}
            <div className={`${sentimentBg} rounded-xl p-4 mb-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Sentiment Analysis</span>
                <span className="text-xs text-gray-500">Confidence: {Math.round((article.confidence || 0) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(article.confidence || 0) * 100}%`,
                    background: sentimentColor,
                  }}
                />
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</span>
              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Read Original →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Analyzed by MYNewsSentiment — Malaysia News Sentiment Analysis Platform
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SharedArticle;
