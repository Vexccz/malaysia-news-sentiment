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
      <div>
        <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {t('categories')}
        </h1>
        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
          {totalArticles} articles across {categories.length} topics
        </p>
        <div className="mt-3 border-b border-[#e5e5e5] dark:border-[#222]" />
      </div>

      {/* Category Table */}
      {loading ? (
        <div className="space-y-0 border border-[#e5e5e5] dark:border-[#222]">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-[#fafafa] dark:bg-[#111] animate-pulse border-b border-[#e5e5e5] dark:border-[#222] last:border-b-0" />
          ))}
        </div>
      ) : (
        <>
          {/* Column labels */}
          <div className="flex items-center gap-4 px-2 text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.18em]">
            <span className="w-5" />
            <span className="flex-1">Category</span>
            <span className="w-16 text-right">Articles</span>
            <span className="w-12 text-right">Sentiment</span>
            <span className="w-3" />
          </div>

          <div className="border border-[#e5e5e5] dark:border-[#222] divide-y divide-[#e5e5e5] dark:divide-[#222]">
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
                  className={`flex items-center gap-4 py-3 px-5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#fafafa] dark:bg-[#0a0a0a]'
                      : 'hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a]'
                  }`}
                >
                  {/* Rank */}
                  <span className="text-[10px] text-gray-400 dark:text-[#666] w-5 text-right font-mono">
                    {i + 1}
                  </span>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-black dark:text-white">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.18em]">{pct}%</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1.5 h-[3px] bg-gray-100 dark:bg-[#222] overflow-hidden">
                      <div
                        className="h-full bg-black dark:bg-white"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Article count */}
                  <span className="text-sm font-mono text-gray-600 dark:text-[#999] w-16 text-right">
                    {cat.articleCount}
                  </span>

                  {/* Sentiment */}
                  <span className={`text-[10px] font-mono w-12 text-right uppercase tracking-[0.18em] ${
                    cat.avgSentiment > 0.1 ? 'text-[#4ADE80]' :
                    cat.avgSentiment < -0.1 ? 'text-[#FB7185]' :
                    'text-[#FBBF24]'
                  }`}>
                    {cat.avgSentiment > 0 ? '+' : ''}{cat.avgSentiment.toFixed(2)}
                  </span>

                  {/* Arrow */}
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`text-gray-300 dark:text-[#333] transition-transform ${isSelected ? 'rotate-90' : ''}`}
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Selected category articles */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="pt-5"
          >
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#e5e5e5] dark:border-[#222]">
              <h2 className="text-sm font-bold text-black dark:text-white uppercase tracking-[0.18em]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {selectedCategory}
              </h2>
              <button
                onClick={() => { setSelectedCategory(null); setArticles([]); }}
                className="text-[10px] text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white transition-colors uppercase tracking-[0.18em]"
              >
                Close
              </button>
            </div>

            {articlesLoading ? (
              <div className="py-8 text-center">
                <div className="w-4 h-4 border-2 border-black dark:border-white border-t-transparent animate-spin mx-auto" />
              </div>
            ) : articles.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-[#666] text-center py-6">No articles in this category</p>
            ) : (
              <div className="border border-[#e5e5e5] dark:border-[#222] divide-y divide-[#e5e5e5] dark:divide-[#222]">
                {articles.map((article, i) => (
                  <motion.div
                    key={article._id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-start gap-3 py-3 px-5 group hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors"
                  >
                    <span className={`mt-1 w-2 h-2 flex-shrink-0 ${
                      article.sentiment === 'Positive' ? 'bg-[#4ADE80]' :
                      article.sentiment === 'Negative' ? 'bg-[#FB7185]' : 'bg-[#FBBF24]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-black dark:text-white group-hover:underline transition-colors line-clamp-1"
                      >
                        {article.title}
                      </a>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500 dark:text-[#999] font-medium uppercase tracking-[0.18em]">{article.source}</span>
                        <span className="text-[10px] text-gray-300 dark:text-[#666]">
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
