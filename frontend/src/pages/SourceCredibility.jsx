import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const biasColors = {
  left: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  center: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400',
  right: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
  unknown: 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400',
};

const getScoreColor = (score) => {
  if (score >= 75) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

const getBarColor = (score) => {
  if (score >= 75) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
};

const SourceCredibility = () => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('credibilityScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [biasFilter, setBiasFilter] = useState('all');
  const [selectedSource, setSelectedSource] = useState(null);
  const detailRef = useRef(null);

  useEffect(() => {
    fetchSources();
  }, [sortBy, sortOrder, biasFilter]);

  // Auto-scroll to detail panel when source selected
  useEffect(() => {
    if (selectedSource && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedSource]);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/credibility', {
        params: { sort: sortBy, order: sortOrder, bias: biasFilter },
      });
      setSources(data.sources || []);
    } catch (err) {
      toast.error('Failed to load sources');
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(o => o === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-ink dark:border-paper border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-ink dark:text-paper tracking-tight font-display">Source Credibility</h1>
        <div className="editorial-rule mt-2" />
        <p className="text-sm text-ink-muted mt-2">Credibility scores and bias ratings for Malaysian news sources</p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Filter:</span>
        {['all', 'left', 'center', 'right', 'unknown'].map(b => (
          <motion.button
            key={b}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setBiasFilter(b)}
            className={`px-3 py-1.5 text-xs font-medium transition-all border ${
              biasFilter === b
                ? 'bg-ink dark:bg-paper text-paper dark:text-ink border-ink dark:border-paper'
                : 'bg-paper-card dark:bg-[#1a1a1a] border-paper-line dark:border-paper-dark-line text-ink-muted hover:bg-paper-subtle dark:hover:bg-paper-dark-subtle'
            }`}
          >
            {b === 'all' ? 'All' : b.charAt(0).toUpperCase() + b.slice(1)}
          </motion.button>
        ))}
      </motion.div>

      {/* Sources Grid */}
      {sources.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-[#1a1a1a] p-12 text-center"
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-paper-line dark:border-paper-dark-line"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </motion.div>
          <h3 className="text-lg font-semibold font-display text-ink dark:text-paper mb-2">No sources found</h3>
          <p className="text-sm text-ink-muted">Source credibility data will appear here once seeded</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {/* Editorial Table */}
          <div className="border border-paper-line dark:border-paper-dark-line overflow-hidden">
            <table className="w-full">
              <thead className="bg-paper-subtle dark:bg-paper-dark-subtle">
                <tr className="text-xs font-medium text-ink-muted uppercase tracking-wider">
                  <th className="text-left px-5 py-3 cursor-pointer hover:text-ink dark:hover:text-paper" onClick={() => toggleSort('name')}>
                    Source {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center px-3 py-3 cursor-pointer hover:text-ink dark:hover:text-paper" onClick={() => toggleSort('credibilityScore')}>
                    Credibility {sortBy === 'credibilityScore' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center px-3 py-3">Bias</th>
                  <th className="text-center px-3 py-3 cursor-pointer hover:text-ink dark:hover:text-paper" onClick={() => toggleSort('factCheckScore')}>
                    Fact Check {sortBy === 'factCheckScore' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center px-3 py-3 cursor-pointer hover:text-ink dark:hover:text-paper" onClick={() => toggleSort('transparencyScore')}>
                    Transparency {sortBy === 'transparencyScore' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="w-10 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line dark:divide-paper-dark-line">
                <AnimatePresence>
                  {sources.map((source, i) => {
                    const isExpanded = selectedSource?._id === source._id;
                    return (
                    <React.Fragment key={source._id || source.name}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className={`cursor-pointer hover:bg-paper-subtle/50 dark:hover:bg-paper-dark-subtle/30 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-paper-subtle/50 dark:bg-paper-dark-subtle/30'
                      }`}
                      onClick={() => setSelectedSource(isExpanded ? null : source)}
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-ink dark:text-paper text-sm">{source.name}</p>
                        {source.url && (
                          <p className="text-xs text-ink-muted truncate mt-0.5">{source.url}</p>
                        )}
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className={`text-lg font-bold ${getScoreColor(source.credibilityScore)}`}>
                          {source.credibilityScore}
                        </span>
                        <div className="w-full h-1.5 bg-paper-subtle dark:bg-paper-dark-subtle mt-1.5 overflow-hidden border border-paper-line dark:border-paper-dark-line">
                          <div
                            className={`h-full ${getBarColor(source.credibilityScore)} transition-all`}
                            style={{ width: `${source.credibilityScore}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium border border-paper-line dark:border-paper-dark-line ${biasColors[source.bias] || biasColors.unknown}`}>
                          {source.bias}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className={`text-sm font-semibold ${getScoreColor(source.factCheckScore)}`}>
                          {source.factCheckScore}/100
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className={`text-sm font-semibold ${getScoreColor(source.transparencyScore)}`}>
                          {source.transparencyScore}/100
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-ink-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </td>
                    </motion.tr>
                    {isExpanded && (
                      <motion.tr
                        ref={detailRef}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={6} className="p-0">
                          <div className="border-t border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-[#1a1a1a] p-5">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center p-3 bg-paper-subtle dark:bg-paper-dark-subtle border border-paper-line dark:border-paper-dark-line">
                                <p className="text-xs text-ink-muted mb-1">Credibility</p>
                                <p className={`text-xl font-bold ${getScoreColor(source.credibilityScore)}`}>{source.credibilityScore}</p>
                              </div>
                              <div className="text-center p-3 bg-paper-subtle dark:bg-paper-dark-subtle border border-paper-line dark:border-paper-dark-line">
                                <p className="text-xs text-ink-muted mb-1">Fact Check</p>
                                <p className={`text-xl font-bold ${getScoreColor(source.factCheckScore)}`}>{source.factCheckScore}</p>
                              </div>
                              <div className="text-center p-3 bg-paper-subtle dark:bg-paper-dark-subtle border border-paper-line dark:border-paper-dark-line">
                                <p className="text-xs text-ink-muted mb-1">Transparency</p>
                                <p className={`text-xl font-bold ${getScoreColor(source.transparencyScore)}`}>{source.transparencyScore}</p>
                              </div>
                              <div className="text-center p-3 bg-paper-subtle dark:bg-paper-dark-subtle border border-paper-line dark:border-paper-dark-line">
                                <p className="text-xs text-ink-muted mb-1">Total Articles</p>
                                <p className="text-xl font-bold text-ink dark:text-paper">{source.totalArticles}</p>
                              </div>
                            </div>
                            {source.url && (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 mt-3 text-xs text-accent hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Visit website →
                              </a>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )}
                    </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
      )}
    </motion.div>
  );
};

export default SourceCredibility;
