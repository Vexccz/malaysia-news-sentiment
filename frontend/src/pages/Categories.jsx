import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, TrendingUp, TrendingDown, Minus, GitBranch, Network, List, ChevronDown, BarChart3 } from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

// --- Helper: build a tree from flat category list ---
function buildTree(categories) {
  // Infer hierarchy from category names containing " > " separator or similar patterns
  // Also handle categories that share common prefixes
  const tree = [];
  const nodeMap = {};

  // First pass: create nodes
  categories.forEach(cat => {
    nodeMap[cat.name] = { ...cat, children: [] };
  });

  // Second pass: build parent-child relationships
  const childNames = new Set();
  categories.forEach(cat => {
    const parts = cat.name.split(/\s*[>\/]\s*/);
    if (parts.length > 1) {
      // Has explicit hierarchy
      for (let i = 0; i < parts.length - 1; i++) {
        const parentName = parts.slice(0, i + 1).join(' > ');
        const childName = parts.slice(0, i + 2).join(' > ');
        if (nodeMap[parentName] && nodeMap[childName]) {
          if (!nodeMap[parentName].children.find(c => c.name === childName)) {
            nodeMap[parentName].children.push(nodeMap[childName]);
            childNames.add(childName);
          }
        }
      }
    }
  });

  // If no explicit hierarchy, infer from word overlap
  if (childNames.size === 0) {
    const sorted = [...categories].sort((a, b) => a.name.split(/[\s-]/).length - b.name.split(/[\s-]/).length);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const parentWords = sorted[i].name.toLowerCase().split(/[\s-]+/);
        const childWords = sorted[j].name.toLowerCase().split(/[\s-]+/);
        const overlap = parentWords.filter(w => childWords.includes(w)).length;
        if (overlap >= parentWords.length && parentWords.length < childWords.length) {
          if (nodeMap[sorted[i].name] && nodeMap[sorted[j].name]) {
            nodeMap[sorted[i].name].children.push(nodeMap[sorted[j].name]);
            childNames.add(sorted[j].name);
          }
        }
      }
    }
  }

  categories.forEach(cat => {
    if (!childNames.has(cat.name)) {
      tree.push(nodeMap[cat.name]);
    }
  });

  // If tree is empty (all are children), use flat list
  if (tree.length === 0) {
    categories.forEach(cat => tree.push(nodeMap[cat.name]));
  }

  return tree;
}

// --- Helper: compute trend from article counts ---
function computeTrend(cat) {
  // Derive trend from a combination of recentArticleCount vs avg or use weeklyChange if available
  const recent = cat.recentArticleCount ?? cat.articleCount;
  const avg = cat.avgArticleCount ?? cat.articleCount;
  if (recent > avg * 1.15) return 'rising';
  if (recent < avg * 0.85) return 'falling';
  return 'stable';
}

// --- Helper: compute co-occurrence from article categories ---
function buildCoOccurrence(articles) {
  const pairs = {};
  if (!articles || articles.length === 0) return [];
  articles.forEach(article => {
    const cats = article.categories || [];
    for (let i = 0; i < cats.length; i++) {
      for (let j = i + 1; j < cats.length; j++) {
        const key = [cats[i], cats[j]].sort().join('|||');
        pairs[key] = (pairs[key] || 0) + 1;
      }
    }
  });
  return Object.entries(pairs)
    .map(([key, count]) => {
      const [a, b] = key.split('|||');
      return { catA: a, catB: b, count };
    })
    .sort((a, b) => b.count - a.count);
}

// --- TreeNode component ---
const TreeNode = ({ node, depth, expanded, onToggle, selectedCategory, onSelect, t }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded[node.name];
  const isSelected = selectedCategory === node.name;
  const trend = computeTrend(node);

  const TrendIcon = trend === 'rising' ? TrendingUp : trend === 'falling' ? TrendingDown : Minus;
  const trendColor = trend === 'rising' ? 'text-[#4ADE80]' : trend === 'falling' ? 'text-[#FB7185]' : 'text-[#FBBF24]';

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`flex items-center gap-2 py-2.5 px-3 cursor-pointer transition-colors border-b border-[#e5e5e5] dark:border-[#1a1a1a] ${
          isSelected
            ? 'bg-[#fafafa] dark:bg-[#0a0a0a]'
            : 'hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a]'
        }`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={() => onSelect(node.name)}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.name); }}
            className="w-4 h-4 flex items-center justify-center text-gray-400 dark:text-[#555] hover:text-black dark:hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-4 h-4 flex items-center justify-center">
            <span className="w-1.5 h-[2px] bg-gray-300 dark:bg-[#333]" />
          </span>
        )}

        {/* Category name */}
        <span className={`text-sm flex-1 ${isSelected ? 'font-semibold text-black dark:text-white' : 'font-medium text-gray-800 dark:text-[#ccc]'}`}>
          {node.name}
        </span>

        {/* Trend indicator */}
        <TrendIcon size={12} className={`${trendColor} opacity-70`} />

        {/* Article count */}
        <span className="text-[11px] font-mono text-gray-500 dark:text-[#888] w-10 text-right">
          {node.articleCount}
        </span>

        {hasChildren && (
          <span className="text-[9px] text-gray-400 dark:text-[#555] uppercase tracking-[0.12em]">
            {node.children.length}
          </span>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children.map(child => (
              <TreeNode
                key={child.name}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                selectedCategory={selectedCategory}
                onSelect={onSelect}
                t={t}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- TrendBadge ---
const TrendBadge = ({ trend, t }) => {
  const config = {
    rising: { icon: TrendingUp, color: 'text-[#4ADE80]', bg: 'bg-[#4ADE80]/10', label: t('rising') },
    falling: { icon: TrendingDown, color: 'text-[#FB7185]', bg: 'bg-[#FB7185]/10', label: t('falling') },
    stable: { icon: Minus, color: 'text-[#FBBF24]', bg: 'bg-[#FBBF24]/10', label: t('stable') },
  };
  const c = config[trend] || config.stable;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${c.bg} ${c.color} text-[10px] uppercase tracking-[0.14em] font-mono`}>
      <Icon size={10} />
      {c.label}
    </span>
  );
};

// --- Main Component ---
const Categories = () => {
  const [categories, setCategories] = useState([]);
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'list' | 'matrix'
  const [expanded, setExpanded] = useState({});
  const [allArticles, setAllArticles] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/news/categories');
      setCategories(res.data);
      // Fetch recent articles for co-occurrence analysis
      try {
        const articlesRes = await api.get('/news/articles', { params: { limit: 200 } });
        setAllArticles(articlesRes.data.articles || articlesRes.data || []);
      } catch {
        // co-occurrence will use empty data
      }
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

  const toggleExpand = (name) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const expandAll = () => {
    const newExpanded = {};
    categories.forEach(c => { newExpanded[c.name] = true; });
    setExpanded(newExpanded);
  };

  const collapseAll = () => setExpanded({});

  const totalArticles = categories.reduce((sum, c) => sum + c.articleCount, 0);

  // Build tree data
  const treeData = useMemo(() => buildTree(categories), [categories]);

  // Build co-occurrence data
  const coOccurrence = useMemo(() => buildCoOccurrence(allArticles), [allArticles]);

  // Build a matrix from co-occurrence
  const matrixData = useMemo(() => {
    if (coOccurrence.length === 0) return { cats: [], matrix: [] };
    const catSet = new Set();
    coOccurrence.forEach(({ catA, catB }) => { catSet.add(catA); catSet.add(catB); });
    const cats = [...catSet].slice(0, 12); // limit for display
    const matrix = cats.map(a =>
      cats.map(b => {
        if (a === b) return -1;
        const pair = coOccurrence.find(
          p => (p.catA === a && p.catB === b) || (p.catA === b && p.catB === a)
        );
        return pair ? pair.count : 0;
      })
    );
    return { cats, matrix };
  }, [coOccurrence]);

  // View mode tabs
  const viewTabs = [
    { key: 'tree', label: t('treeView'), icon: GitBranch },
    { key: 'list', label: t('listView'), icon: List },
    { key: 'matrix', label: t('matrixView'), icon: Network },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h1
          className="text-3xl font-bold text-black dark:text-white tracking-tight"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t('categories')}
        </h1>
        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
          {totalArticles} {t('categoriesDesc')}
        </p>
        <div className="mt-3 border-b-2 border-black dark:border-white" />
      </div>

      {/* View mode switcher */}
      <div className="flex items-center gap-1 border border-[#e5e5e5] dark:border-[#222] w-fit">
        {viewTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] font-medium transition-colors ${
                viewMode === tab.key
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'text-gray-500 dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#111]'
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-0 border border-[#e5e5e5] dark:border-[#222]">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-[#fafafa] dark:bg-[#111] animate-pulse border-b border-[#e5e5e5] dark:border-[#222] last:border-b-0" />
          ))}
        </div>
      ) : (
        <>
          {/* ===== TREE VIEW ===== */}
          {viewMode === 'tree' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2
                  className="text-xs font-bold text-black dark:text-white uppercase tracking-[0.18em]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <GitBranch size={14} className="inline mr-2 opacity-50" />
                  {t('categoryTree')}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={expandAll}
                    className="text-[10px] text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white uppercase tracking-[0.14em] transition-colors"
                  >
                    {t('expand')}
                  </button>
                  <span className="text-gray-300 dark:text-[#333]">|</span>
                  <button
                    onClick={collapseAll}
                    className="text-[10px] text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white uppercase tracking-[0.14em] transition-colors"
                  >
                    {t('collapse')}
                  </button>
                </div>
              </div>
              <div className="border border-[#e5e5e5] dark:border-[#222]">
                {treeData.map(node => (
                  <TreeNode
                    key={node.name}
                    node={node}
                    depth={0}
                    expanded={expanded}
                    onToggle={toggleExpand}
                    selectedCategory={selectedCategory}
                    onSelect={handleCategoryClick}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ===== LIST VIEW ===== */}
          {viewMode === 'list' && (
            <div>
              {/* Column labels */}
              <div className="flex items-center gap-4 px-2 text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.18em]">
                <span className="w-5" />
                <span className="flex-1">{t('category')}</span>
                <span className="w-20 text-center">{t('trend')}</span>
                <span className="w-16 text-right">{t('articlesCol')}</span>
                <span className="w-12 text-right">Sentiment</span>
                <span className="w-3" />
              </div>

              <div className="border border-[#e5e5e5] dark:border-[#222] divide-y divide-[#e5e5e5] dark:divide-[#222]">
                {categories.map((cat, i) => {
                  const isSelected = selectedCategory === cat.name;
                  const pct = totalArticles > 0 ? (cat.articleCount / totalArticles * 100).toFixed(0) : 0;
                  const trend = computeTrend(cat);

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

                      {/* Trend badge */}
                      <div className="w-20 flex justify-center">
                        <TrendBadge trend={trend} t={t} />
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
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== MATRIX / CROSS-REFERENCE VIEW ===== */}
          {viewMode === 'matrix' && (
            <div className="space-y-6">
              {/* Co-occurrence list */}
              <div>
                <h2
                  className="text-xs font-bold text-black dark:text-white uppercase tracking-[0.18em] mb-2"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <Network size={14} className="inline mr-2 opacity-50" />
                  {t('crossReference')}
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-[#888] uppercase tracking-[0.14em] mb-3">
                  {t('frequentlyPaired')}
                </p>

                {coOccurrence.length === 0 ? (
                  <div className="border border-[#e5e5e5] dark:border-[#222] py-8 text-center">
                    <p className="text-sm text-gray-400 dark:text-[#666]">
                      {lang === 'ms' ? 'Tiada data rujukan silang tersedia' : 'No cross-reference data available'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Top pairs list */}
                    <div className="border border-[#e5e5e5] dark:border-[#222] divide-y divide-[#e5e5e5] dark:divide-[#222] mb-6">
                      {coOccurrence.slice(0, 15).map((pair, i) => {
                        const maxCount = coOccurrence[0]?.count || 1;
                        const pct = (pair.count / maxCount * 100).toFixed(0);
                        return (
                          <motion.div
                            key={`${pair.catA}-${pair.catB}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center gap-3 py-2.5 px-4 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors"
                          >
                            <span className="text-[10px] text-gray-400 dark:text-[#555] font-mono w-5 text-right">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-black dark:text-white">{pair.catA}</span>
                                <span className="text-[10px] text-gray-300 dark:text-[#555]">+</span>
                                <span className="text-sm font-medium text-black dark:text-white">{pair.catB}</span>
                              </div>
                              <div className="mt-1 h-[2px] bg-gray-100 dark:bg-[#1a1a1a] overflow-hidden">
                                <div
                                  className="h-full bg-black dark:bg-white"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-gray-500 dark:text-[#888] w-10 text-right">
                              {pair.count}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Matrix grid */}
                    {matrixData.cats.length > 0 && (
                      <div>
                        <h3
                          className="text-xs font-bold text-black dark:text-white uppercase tracking-[0.18em] mb-3"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          <BarChart3 size={14} className="inline mr-2 opacity-50" />
                          {t('coOccurrence')} {t('matrixView')}
                        </h3>
                        <div className="overflow-x-auto border border-[#e5e5e5] dark:border-[#222]">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr>
                                <th className="p-2 text-left text-gray-400 dark:text-[#666] uppercase tracking-[0.14em] border-b border-r border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] sticky left-0 z-10">
                                  {t('category')}
                                </th>
                                {matrixData.cats.map(cat => (
                                  <th
                                    key={cat}
                                    className="p-2 text-center text-gray-400 dark:text-[#666] uppercase tracking-[0.14em] border-b border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] min-w-[60px] max-w-[80px] truncate"
                                    title={cat}
                                  >
                                    {cat.length > 10 ? cat.slice(0, 8) + '…' : cat}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {matrixData.cats.map((rowCat, ri) => (
                                <tr key={rowCat}>
                                  <td className="p-2 text-left font-medium text-gray-700 dark:text-[#aaa] border-r border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] sticky left-0 z-10 max-w-[120px] truncate" title={rowCat}>
                                    {rowCat}
                                  </td>
                                  {matrixData.matrix[ri].map((val, ci) => {
                                    const maxVal = Math.max(...matrixData.matrix.flat().filter(v => v > 0), 1);
                                    const intensity = val < 0 ? 0 : val / maxVal;
                                    return (
                                      <td
                                        key={ci}
                                        className={`p-2 text-center border-b border-[#e5e5e5] dark:border-[#1a1a1a] font-mono ${
                                          ri === ci
                                            ? 'bg-gray-100 dark:bg-[#111] text-gray-300 dark:text-[#333]'
                                            : val > 0
                                            ? 'text-black dark:text-white'
                                            : 'text-gray-200 dark:text-[#222]'
                                        }`}
                                        style={
                                          ri !== ci && val > 0
                                            ? { backgroundColor: `rgba(128,128,128,${intensity * 0.15})` }
                                            : {}
                                        }
                                      >
                                        {ri === ci ? '—' : val > 0 ? val : ''}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Trend summary */}
              <div>
                <h2
                  className="text-xs font-bold text-black dark:text-white uppercase tracking-[0.18em] mb-3"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <TrendingUp size={14} className="inline mr-2 opacity-50" />
                  {t('categoryTrends')}
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'rising', color: '#4ADE80', bg: 'bg-[#4ADE80]/5 dark:bg-[#4ADE80]/10', border: 'border-[#4ADE80]/30' },
                    { key: 'stable', color: '#FBBF24', bg: 'bg-[#FBBF24]/5 dark:bg-[#FBBF24]/10', border: 'border-[#FBBF24]/30' },
                    { key: 'falling', color: '#FB7185', bg: 'bg-[#FB7185]/5 dark:bg-[#FB7185]/10', border: 'border-[#FB7185]/30' },
                  ].map(({ key, color, bg, border }) => {
                    const items = categories.filter(c => computeTrend(c) === key);
                    const Icon = key === 'rising' ? TrendingUp : key === 'falling' ? TrendingDown : Minus;
                    return (
                      <div key={key} className={`border ${border} ${bg} p-3`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={14} style={{ color }} />
                          <span className="text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color }}>
                            {t(key)}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 dark:text-[#666] ml-auto">
                            {items.length}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {items.slice(0, 5).map(cat => (
                            <div
                              key={cat.name}
                              onClick={() => handleCategoryClick(cat.name)}
                              className="text-[11px] text-gray-700 dark:text-[#bbb] hover:text-black dark:hover:text-white cursor-pointer truncate transition-colors"
                            >
                              {cat.name}
                            </div>
                          ))}
                          {items.length > 5 && (
                            <span className="text-[10px] text-gray-400 dark:text-[#555]">
                              +{items.length - 5} {lang === 'ms' ? 'lagi' : 'more'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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
            <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-black dark:border-white">
              <h2
                className="text-sm font-bold text-black dark:text-white uppercase tracking-[0.18em]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {selectedCategory}
              </h2>
              <button
                onClick={() => { setSelectedCategory(null); setArticles([]); }}
                className="text-[10px] text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white transition-colors uppercase tracking-[0.18em]"
              >
                {t('close')}
              </button>
            </div>

            {articlesLoading ? (
              <div className="py-8 text-center">
                <div className="w-4 h-4 border-2 border-black dark:border-white border-t-transparent animate-spin mx-auto" />
              </div>
            ) : articles.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-[#666] text-center py-6">{t('noArticlesInCategory')}</p>
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
