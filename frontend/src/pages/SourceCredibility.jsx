import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const biasColors = {
  left: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  center: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400',
  right: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
  unknown: 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400',
};

const CARD = 'bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700/50 rounded-sm';

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
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('credibilityScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [biasFilter, setBiasFilter] = useState('all');
  const [selectedSource, setSelectedSource] = useState(null);
  
  useEffect(() => {
    fetchData();
  }, [sortBy, sortOrder, biasFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [credRes, analyticsRes] = await Promise.all([
        api.get('/credibility', {
          params: { sort: sortBy, order: sortOrder, bias: biasFilter },
        }),
        api.get('/analytics/advanced').catch(() => null),
      ]);
      setSources(credRes.data.sources || []);
      if (analyticsRes) {
        setAnalytics(analyticsRes.data?.data || analyticsRes.data);
      }
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

  // Derived analytics data
  const MALAYSIA_SOURCES = new Set([
    'FMT', 'Astro Awani', 'Malaysiakini', 'The Star', 'The Star Online',
    'NST', 'New Straits Times', 'Bernama', 'Harian Metro', 'Utusan',
    'Malay Mail', 'The Edge', 'Sinar Harian', 'Berita Harian', 'my',
    'Unknown',
    'CNA',
  ]);
  const rawBias = analytics?.sourceBias || [];
  const bias = rawBias.filter(s => MALAYSIA_SOURCES.has(s.source));
  const rawReliability = analytics?.sourceReliability || [];
  const reliability = rawReliability.filter(s => MALAYSIA_SOURCES.has(s.source));

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
        <p className="text-sm text-ink-muted mt-2">Credibility scores, bias ratings, and sentiment analysis for news sources</p>
      </motion.div>

      {/* Sentiment Overview */}
      {bias.length > 0 && (() => {
        const overview = bias.reduce((acc, src) => {
          acc.Positive = (acc.Positive || 0) + (src.positive || 0);
          acc.Negative = (acc.Negative || 0) + (src.negative || 0);
          acc.Neutral = (acc.Neutral || 0) + (src.neutral || 0);
          return acc;
        }, {});
        return (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Positive', count: overview.Positive || 0, color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
              { label: 'Negative', count: overview.Negative || 0, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
              { label: 'Neutral',  count: overview.Neutral || 0,  color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-500/10' },
            ].map(item => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${CARD} p-4 text-center`}
              >
                <div className={`text-2xl font-bold font-display ${item.color}`}>{item.count}</div>
                <div className="text-[10px] uppercase tracking-wider text-ink-muted mt-1 font-semibold">{item.label}</div>
              </motion.div>
            ))}
          </div>
        );
      })()}

      {/* Source Bias Analysis */}
      {bias.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CARD} overflow-hidden`}
        >
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Source Bias Analysis</h3>
                <p className="text-[10px] text-ink-faint mt-0.5">Sentiment distribution across news publishers</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[9px] text-ink-faint uppercase tracking-wider">Pos</span></div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /><span className="text-[9px] text-ink-faint uppercase tracking-wider">Neg</span></div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" /><span className="text-[9px] text-ink-faint uppercase tracking-wider">Neu</span></div>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {bias.slice(0, 10).map((src, i) => {
              const srcTotal = (src.positive || 0) + (src.negative || 0) + (src.neutral || 0) || 1;
              const posPct = (src.positive || 0) / srcTotal * 100;
              const negPct = (src.negative || 0) / srcTotal * 100;
              const neuPct = 100 - posPct - negPct;
              return (
                <motion.div
                  key={src.source}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-ink-faint w-4 text-right tabular-nums">{i + 1}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink dark:text-paper w-28 truncate">{src.source}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 flex h-[6px] rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <motion.div initial={{ width: 0 }} animate={{ width: posPct + '%' }} transition={{ duration: 0.6, delay: i * 0.03 }} className="bg-emerald-500 rounded-l-full" />
                        <motion.div initial={{ width: 0 }} animate={{ width: negPct + '%' }} transition={{ duration: 0.6, delay: i * 0.03 + 0.1 }} className="bg-rose-500" />
                        <motion.div initial={{ width: 0 }} animate={{ width: neuPct + '%' }} transition={{ duration: 0.6, delay: i * 0.03 + 0.2 }} className="bg-gray-300 dark:bg-gray-600 rounded-r-full" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-24 justify-end">
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 tabular-nums w-8 text-right">{posPct.toFixed(0)}%</span>
                      <span className="text-[10px] font-mono text-rose-500 dark:text-rose-400 tabular-nums w-8 text-right">{negPct.toFixed(0)}%</span>
                      <span className="text-[10px] font-mono text-ink-faint tabular-nums w-8 text-right">{srcTotal}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Source Reliability */}
      {reliability.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CARD} overflow-hidden`}
        >
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Source Reliability</h3>
            <p className="text-[10px] text-ink-faint mt-0.5">Confidence scores by publisher</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {reliability.slice(0, 8).map((sr, i) => {
              const conf = sr.confidence ?? 0;
              const tier = conf >= 70 ? 'high' : conf >= 50 ? 'mid' : conf > 0 ? 'low' : 'none';
              return (
                <motion.div
                  key={sr.source || sr._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-ink-faint w-4 text-right tabular-nums">{i + 1}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink dark:text-paper w-28 truncate">{sr.source || sr._id}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-[6px] bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: conf + '%' }}
                          transition={{ duration: 0.8, delay: i * 0.04 }}
                          className={('h-full rounded-full ' + (conf >= 70 ? 'bg-emerald-500' : conf >= 50 ? 'bg-amber-500' : conf > 0 ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-600')) }
                        />
                      </div>
                    </div>
                    <span className={'text-[10px] font-mono font-semibold tabular-nums w-10 text-right ' + (conf >= 70 ? 'text-emerald-600 dark:text-emerald-400' : conf >= 50 ? 'text-amber-600 dark:text-amber-400' : conf > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-ink-faint')}>
                      {conf.toFixed(0)}%
                    </span>
                    <span className={'text-[9px] font-medium px-1.5 py-0.5 rounded ' + (conf >= 70 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : conf >= 50 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : conf > 0 ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400' : 'bg-gray-100 dark:bg-gray-800 text-ink-faint')}>
                      {conf >= 70 ? 'HIGH' : conf >= 50 ? 'MED' : conf > 0 ? 'LOW' : 'N/A'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

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
                    Source {sortBy === 'name' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
                  </th>
                  <th className="text-center px-3 py-3 cursor-pointer hover:text-ink dark:hover:text-paper" onClick={() => toggleSort('credibilityScore')}>
                    Credibility {sortBy === 'credibilityScore' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
                  </th>
                  <th className="text-center px-3 py-3">Bias</th>
                  <th className="text-center px-3 py-3 cursor-pointer hover:text-ink dark:hover:text-paper" onClick={() => toggleSort('factCheckScore')}>
                    Fact Check {sortBy === 'factCheckScore' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
                  </th>
                  <th className="text-center px-3 py-3 cursor-pointer hover:text-ink dark:hover:text-paper" onClick={() => toggleSort('transparencyScore')}>
                    Transparency {sortBy === 'transparencyScore' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
                  </th>
                  <th className="w-10 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line dark:divide-paper-dark-line">
                <AnimatePresence>
                  {sources.map((source, i) => (
                    <motion.tr
                      key={source._id || source.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className={`cursor-pointer hover:bg-paper-subtle/50 dark:hover:bg-paper-dark-subtle/30 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-paper-subtle/50 dark:bg-paper-dark-subtle/30'
                      }`}
                      onClick={() => setSelectedSource(selectedSource?._id === source._id ? null : source)}
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-ink-muted transition-transform ${selectedSource?._id === source._id ? 'rotate-180' : ''}`}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Expanded Detail Panels */}
          <AnimatePresence>
            {selectedSource && (
              <motion.div
                key={selectedSource._id}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-[#1a1a1a] p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-paper-subtle dark:bg-paper-dark-subtle border border-paper-line dark:border-paper-dark-line">
                      <p className="text-xs text-ink-muted mb-1">Credibility</p>
                      <p className={`text-xl font-bold ${getScoreColor(selectedSource.credibilityScore)}`}>{selectedSource.credibilityScore}</p>
                    </div>
                    <div className="text-center p-3 bg-paper-subtle dark:bg-paper-dark-subtle border border-paper-line dark:border-paper-dark-line">
                      <p className="text-xs text-ink-muted mb-1">Fact Check</p>
                      <p className={`text-xl font-bold ${getScoreColor(selectedSource.factCheckScore)}`}>{selectedSource.factCheckScore}</p>
                    </div>
                    <div className="text-center p-3 bg-paper-subtle dark:bg-paper-dark-subtle border border-paper-line dark:border-paper-dark-line">
                      <p className="text-xs text-ink-muted mb-1">Transparency</p>
                      <p className={`text-xl font-bold ${getScoreColor(selectedSource.transparencyScore)}`}>{selectedSource.transparencyScore}</p>
                    </div>
                    <div className="text-center p-3 bg-paper-subtle dark:bg-paper-dark-subtle border border-paper-line dark:border-paper-dark-line">
                      <p className="text-xs text-ink-muted mb-1">Total Articles</p>
                      <p className="text-xl font-bold text-ink dark:text-paper">{selectedSource.totalArticles}</p>
                    </div>
                  </div>
                  {selectedSource.url && (
                    <a
                      href={selectedSource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs text-accent hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Visit website →
                    </a>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default SourceCredibility;
