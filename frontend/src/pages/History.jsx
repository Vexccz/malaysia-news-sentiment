import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StaggerList, StaggerItem } from '../components/StaggerList';
import toast from 'react-hot-toast';
import ArticleCard from '../components/ArticleCard';
import ArticlePreviewModal from '../components/ArticlePreviewModal';
import { getHistory, deleteArticle, bulkDeleteArticles, getStats } from '../services/api';
import { exportToCSV } from '../services/exportUtils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';

const History = () => {
  const queryClient = useQueryClient();
  
  const [params, setParams] = useState({
    search: '',
    sentiment: '',
    from: '',
    to: '',
    sortBy: 'newest',
    page: 1,
    limit: 50
  });
  const { t, lang } = useLanguage();

  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef(null);

  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleSearchChange = (value) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleParamChange('search', value);
    }, 400);
  };

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const { 
    data: historyData, 
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    error: historyError 
  } = useQuery({
    queryKey: ['history', params],
    queryFn: () => getHistory(params),
    staleTime: 30000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: () => getStats(),
    staleTime: 60000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteArticle(id),
    onSuccess: () => {
      toast.success('Article deleted');
      queryClient.invalidateQueries(['history']);
      queryClient.invalidateQueries(['stats']);
    },
    onError: () => {
      toast.error('Failed to delete article.');
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => bulkDeleteArticles(ids),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} article${ids.length > 1 ? 's' : ''} deleted`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries(['history']);
      queryClient.invalidateQueries(['stats']);
    },
    onError: () => {
      toast.error('Failed to delete selected articles.');
    }
  });

  const articles = historyData?.articles || [];
  const totalPages = historyData?.pages || 1;
  const totalCount = historyData?.total || 0;
  const stats = statsData || null;
  const loading = isHistoryLoading || isHistoryFetching;
  const error = historyError?.message || '';

  const handleParamChange = (name, value) => {
    setParams(prev => ({ ...prev, [name]: value, page: name === 'page' ? value : 1 }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently remove this analysis from history?')) return;
    deleteMutation.mutate(id);
  };

  const handlePreview = (article) => {
    setSelectedArticle(article);
    setShowPreview(true);
  };

  const handleExport = () => {
    if (articles.length === 0) return toast.error('No articles to export.');
    exportToCSV(articles, `history-export-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Export started');
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map(a => a._id || a.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Permanently delete ${selectedIds.size} selected article${selectedIds.size > 1 ? 's' : ''}?`)) return;
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkExport = () => {
    if (selectedIds.size === 0) return;
    const selected = articles.filter(a => selectedIds.has(a._id || a.id));
    if (selected.length === 0) return toast.error('No articles to export.');
    exportToCSV(selected, `history-export-selected-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${selected.length} article${selected.length > 1 ? 's' : ''}`);
  };

  const isAllSelected = articles.length > 0 && selectedIds.size === articles.length;
  const isSomeSelected = selectedIds.size > 0;

  const KPI = stats ? [
    { label: 'Total Analyzed', value: stats.total, sub: 'in database' },
    { label: 'Positive', value: stats.sentiments.Positive, sub: `${stats.total ? Math.round(stats.sentiments.Positive/stats.total*100) : 0}%` },
    { label: 'Negative', value: stats.sentiments.Negative, sub: `${stats.total ? Math.round(stats.sentiments.Negative/stats.total*100) : 0}%` },
    { label: 'Neutral', value: stats.sentiments.Neutral, sub: `${stats.total ? Math.round(stats.sentiments.Neutral/stats.total*100) : 0}%` },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {t('history')}
        </h1>
        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
          Your past searches and sentiment analyses across Malaysian news sources
        </p>
        <div className="mt-3 border-b border-[#e5e5e5] dark:border-[#222]" />
      </div>

      {error && (
        <div className="border-l-2 border-[#FB7185] bg-white dark:bg-[#111] px-4 py-3 mb-6 border border-[#e5e5e5] dark:border-[#222]">
          <p className="text-sm text-[#FB7185]">{error}</p>
        </div>
      )}

      {/* KPI Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#e5e5e5] dark:divide-[#222] border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] mb-6">
          {KPI.map((c, i) => (
            <div key={c.label} className="px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mb-1">
                {c.label}
              </div>
              <div className="text-xl font-bold text-black dark:text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {c.value}
              </div>
              <div className="text-[10px] text-gray-400 dark:text-[#666] mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] mb-6">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#0a0a0a] text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#666] focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
          </div>

          {/* Sentiment Filter */}
          <select
            value={params.sentiment}
            onChange={(e) => handleParamChange('sentiment', e.target.value)}
            className="px-3 py-2 text-[11px] font-medium border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#0a0a0a] text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors uppercase tracking-[0.18em]"
          >
            <option value="">All Sentiment</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
            <option value="Neutral">Neutral</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">
              From
            </label>
            <input
              type="date"
              value={params.from}
              onChange={(e) => handleParamChange('from', e.target.value)}
              className="px-2.5 py-2 text-xs border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#0a0a0a] text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              title="From Date"
            />
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">
              To
            </label>
            <input
              type="date"
              value={params.to}
              onChange={(e) => handleParamChange('to', e.target.value)}
              className="px-2.5 py-2 text-xs border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#0a0a0a] text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              title="To Date"
            />
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black dark:text-white border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {isSomeSelected && (
        <div className="border border-black dark:border-white bg-white dark:bg-[#111] px-4 py-3 mb-4 flex items-center gap-4">
          <span className="text-[11px] font-semibold text-black dark:text-white uppercase tracking-[0.18em]">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FB7185] border border-[#FB7185] hover:bg-[#FB7185] hover:text-white transition-colors disabled:opacity-50"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Delete Selected
          </button>
          <button
            onClick={handleBulkExport}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black dark:text-white border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[10px] font-medium text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white transition-colors uppercase tracking-[0.18em] ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Articles */}
      <div>
        {loading ? (
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] divide-y divide-[#e5e5e5] dark:divide-[#222]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse">
                <div className="h-3.5 bg-gray-200 dark:bg-[#222] w-3/4 mb-2.5" />
                <div className="h-3 bg-gray-100 dark:bg-[#1a1a1a] w-full mb-2" />
                <div className="flex gap-2">
                  <div className="h-2.5 w-16 bg-gray-200 dark:bg-[#222]" />
                  <div className="h-2.5 w-10 bg-gray-200 dark:bg-[#222]" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111]">
            <h3 className="text-xl font-bold text-black dark:text-white mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              No Stories Found
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#999] italic max-w-sm mx-auto">
              "Adjust your filters or search for past analyses."
            </p>
          </div>
        ) : (
          <>
            {/* Select All header */}
            <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] px-5 py-2.5 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] accent-black dark:accent-white cursor-pointer"
                />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">
                  Select All
                </span>
              </label>
              <span className="text-[10px] text-gray-400 dark:text-[#666] ml-auto">
                {totalCount} item{totalCount !== 1 ? 's' : ''}
              </span>
            </div>

            <StaggerList className="border border-t-0 border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] divide-y divide-[#e5e5e5] dark:divide-[#222]">
              {articles.map((article, i) => {
                const articleId = article._id || article.id;
                const isSelected = selectedIds.has(articleId);
                const sentimentBorderColor = article.sentiment === 'Positive' ? 'border-l-[#4ADE80]' :
                  article.sentiment === 'Negative' ? 'border-l-[#FB7185]' : 'border-l-[#FBBF24]';
                return (
                  <StaggerItem key={articleId} className={`flex items-start gap-0 border-l-2 ${sentimentBorderColor}`}>
                    {/* Checkbox column */}
                    <div className="flex-shrink-0 flex items-start pt-4 pl-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(articleId)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] accent-black dark:accent-white cursor-pointer mt-1"
                      />
                    </div>
                    {/* Article card wrapper */}
                    <div className="flex-1 min-w-0">
                      <ArticleCard 
                        article={article} 
                        onPreview={handlePreview} 
                        onDelete={handleDelete}
                      />
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerList>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-1">
                <button 
                  disabled={params.page === 1} 
                  onClick={() => handleParamChange('page', params.page - 1)}
                  className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] hover:text-black dark:hover:text-white disabled:opacity-30 transition-colors"
                >
                  ← Previous
                </button>
                <div className="text-xs text-gray-400 dark:text-[#666]">
                  Page <strong className="text-black dark:text-white">{params.page}</strong> of {totalPages}
                  <span className="ml-2">({totalCount} items)</span>
                </div>
                <button 
                  disabled={params.page === totalPages} 
                  onClick={() => handleParamChange('page', params.page + 1)}
                  className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] hover:text-black dark:hover:text-white disabled:opacity-30 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ArticlePreviewModal 
        key={selectedArticle?._id || 'history-preview'}
        article={selectedArticle} 
        isOpen={showPreview} 
        onClose={() => setShowPreview(false)} 
      />
    </div>
  );
};

export default History;
