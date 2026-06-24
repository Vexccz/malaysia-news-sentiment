import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/news/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Categories fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryArticles = async (name) => {
    setArticlesLoading(true);
    try {
      const res = await api.get(`/news/category/${encodeURIComponent(name)}`);
      setArticles(res.data.articles || []);
    } catch (err) {
      console.error('Category articles error:', err);
      setArticles([]);
    } finally {
      setArticlesLoading(false);
    }
  };

  const handleCategoryClick = (name) => {
    if (selectedCategory === name) {
      setSelectedCategory(null);
      setArticles([]);
    } else {
      setSelectedCategory(name);
      fetchCategoryArticles(name);
    }
  };

  const totalArticles = categories.reduce((sum, c) => sum + c.articleCount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="border-b-2 border-gray-900 dark:border-white pb-3">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
              Categories
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 tracking-wide">
              {totalArticles} articles across {categories.length} topics
            </p>
          </div>
        </div>
      </div>

      {/* Category Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-[#1a1a1a] rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-gray-100 dark:divide-[#2a2a2a]">
          {categories.map((cat, i) => {
            const isSelected = selectedCategory === cat.name;
            const pct = totalArticles > 0 ? (cat.articleCount / totalArticles * 100).toFixed(0) : 0;

            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleCategoryClick(cat.name)}
                className={`flex items-center gap-4 py-3 px-2 cursor-pointer transition-colors rounded ${
                  isSelected
                    ? 'bg-gray-50 dark:bg-white/5'
                    : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                }`}
              >
                {/* Rank */}
                <span className="text-xs text-gray-400 w-5 text-right font-mono">
                  {i + 1}
                </span>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {cat.name}
                    </span>
                    <span className="text-xs text-gray-400">{pct}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1 bg-gray-100 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 dark:bg-white rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Article count */}
                <span className="text-sm font-mono text-gray-600 dark:text-gray-300 w-16 text-right">
                  {cat.articleCount}
                </span>

                {/* Sentiment */}
                <span className={`text-xs font-mono w-12 text-right ${
                  cat.avgSentiment > 0.1 ? 'text-green-600 dark:text-green-400' :
                  cat.avgSentiment < -0.1 ? 'text-red-600 dark:text-red-400' :
                  'text-gray-500 dark:text-gray-400'
                }`}>
                  {cat.avgSentiment > 0 ? '+' : ''}{cat.avgSentiment.toFixed(2)}
                </span>

                {/* Arrow */}
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-gray-300 dark:text-gray-600 transition-transform ${isSelected ? 'rotate-90' : ''}`}
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Column labels */}
      {!loading && categories.length > 0 && (
        <div className="flex items-center gap-4 px-2 text-[10px] text-gray-400 uppercase tracking-wider">
          <span className="w-5" />
          <span className="flex-1">Category</span>
          <span className="w-16 text-right">Articles</span>
          <span className="w-12 text-right">Sentiment</span>
          <span className="w-3" />
        </div>
      )}

      {/* Selected category articles */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="border-t border-gray-200 dark:border-[#2a2a2a] pt-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                {selectedCategory}
              </h2>
              <button
                onClick={() => { setSelectedCategory(null); setArticles([]); }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Close
              </button>
            </div>

            {articlesLoading ? (
              <div className="py-8 text-center">
                <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white rounded-full animate-spin mx-auto" />
              </div>
            ) : articles.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No articles in this category</p>
            ) : (
              <div className="space-y-0 divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                {articles.map((article, i) => (
                  <motion.div
                    key={article._id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-start gap-3 py-2.5 group"
                  >
                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      article.sentiment === 'Positive' ? 'bg-green-500' :
                      article.sentiment === 'Negative' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors line-clamp-1"
                      >
                        {article.title}
                      </a>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400 font-medium">{article.source}</span>
                        <span className="text-[11px] text-gray-300 dark:text-gray-600">
                          {new Date(article.publishedAt).toLocaleDateString('en-MY')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Categories;
