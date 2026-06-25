import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const biasColors = {
  left: 'text-blue-600 dark:text-blue-400',
  center: 'text-[#4ADE80] dark:text-[#4ADE80]',
  right: 'text-orange-600 dark:text-orange-400',
  unknown: 'text-gray-500 dark:text-gray-400',
};

const CARD = 'bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222]';

const getScoreColor = (score) => {
  if (score >= 75) return 'text-[#4ADE80]';
  if (score >= 60) return 'text-[#FBBF24]';
  if (score >= 40) return 'text-orange-500';
  return 'text-[#FB7185]';
};

const getBarColor = (score) => {
  if (score >= 75) return 'bg-[#4ADE80]';
  if (score >= 60) return 'bg-[#FBBF24]';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-[#FB7185]';
};

const SourceCredibility = () => {
  const [sources, setSources] = useState([]);
  const { t, lang } = useLanguage();
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

  const MALAYSIA_SOURCES = new Set([
    'FMT', 'Astro Awani', 'Malaysiakini', 'The Star', 'The Star Online',
    'NST', 'New Straits Times', 'Bernama', 'Harian Metro', 'Utusan',
    'Malay Mail', 'The Edge', 'Sinar Harian', 'Berita Harian', 'my',
    'Unknown', 'CNA',
  ]);
  const rawBias = analytics?.sourceBias || [];
  const bias = rawBias.filter(s => MALAYSIA_SOURCES.has(s.source));
  const rawReliability = analytics?.sourceReliability || [];
  const reliability = rawReliability.filter(s => MALAYSIA_SOURCES.has(s.source));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-black dark:border-white border-t-transparent" />
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
      <div>
        <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {t('sourceCredibility')}
        </h1>
        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
          Credibility scores, bias ratings, and sentiment analysis for news sources
        </p>
        <div className="mt-3 border-b border-[#e5e5e5] dark:border-[#222]" />
      </div>

      {/* Sentiment Overview */}
      {bias.length > 0 && (() => {
        const overview = bias.reduce((acc, src) => {
          acc.Positive = (acc.Positive || 0) + (src.positive || 0);
          acc.Negative = (acc.Negative || 0) + (src.negative || 0);
          acc.Neutral = (acc.Neutral || 0) + (src.neutral || 0);
          return acc;
        }, {});
        return (
          <div className="grid grid-cols-3 gap-0 border border-[#e5e5e5] dark:border-[#222] divide-x divide-[#e5e5e5] dark:divide-[#222]">
            {[
              { label: 'Positive', count: overview.Positive || 0, color: 'text-[#4ADE80]' },
              { label: 'Negative', count: overview.Negative || 0, color: 'text-[#FB7185]' },
              { label: 'Neutral',  count: overview.Neutral || 0,  color: 'text-[#FBBF24]' },
            ].map(item => (
              <div key={item.label} className="bg-white dark:bg-[#111] p-4 text-center">
                <div className={`text-2xl font-bold ${item.color}`} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {item.count}
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1 font-semibold">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Source Bias Analysis */}
      {bias.length > 0 && (
        <div className={`${CARD}`}>
          <div className="px-5 pt-5 pb-3 border-b border-[#e5e5e5] dark:border-[#222]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">{t('sourceBiasAnalysis')}</h3>
                <p className="text-[10px] text-gray-400 dark:text-[#666] mt-0.5">Sentiment distribution across news publishers</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#4ADE80]" /><span className="text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.18em]">Pos</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#FB7185]" /><span className="text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.18em]">Neg</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#FBBF24]" /><span className="text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.18em]">Neu</span></div>
              </div>
            </div>
          </div>
          <div className="divide-y divide-[#e5e5e5] dark:divide-[#222]">
            {bias.slice(0, 10).map((src, i) => {
              const srcTotal = (src.positive || 0) + (src.negative || 0) + (src.neutral || 0) || 1;
              const posPct = (src.positive || 0) / srcTotal * 100;
              const negPct = (src.negative || 0) / srcTotal * 100;
              const neuPct = 100 - posPct - negPct;
              return (
                <motion.div
                  key={src.source}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-gray-400 dark:text-[#666] w-4 text-right">{i + 1}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black dark:text-white w-28 truncate">{src.source}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-[4px] bg-gray-100 dark:bg-[#222] overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: posPct + '%' }} transition={{ duration: 0.6, delay: i * 0.03 }} className="bg-[#4ADE80] h-full" />
                        <motion.div initial={{ width: 0 }} animate={{ width: negPct + '%' }} transition={{ duration: 0.6, delay: i * 0.03 + 0.1 }} className="bg-[#FB7185] h-full" />
                        <motion.div initial={{ width: 0 }} animate={{ width: neuPct + '%' }} transition={{ duration: 0.6, delay: i * 0.03 + 0.2 }} className="bg-[#FBBF24] h-full" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-24 justify-end">
                      <span className="text-[10px] font-mono text-[#4ADE80] w-8 text-right">{posPct.toFixed(0)}%</span>
                      <span className="text-[10px] font-mono text-[#FB7185] w-8 text-right">{negPct.toFixed(0)}%</span>
                      <span className="text-[10px] font-mono text-gray-400 dark:text-[#666] w-8 text-right">{srcTotal}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Source Reliability */}
      {reliability.length > 0 && (
        <div className={`${CARD}`}>
          <div className="px-5 pt-5 pb-3 border-b border-[#e5e5e5] dark:border-[#222]">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">{t('sourceReliability')}</h3>
            <p className="text-[10px] text-gray-400 dark:text-[#666] mt-0.5">Confidence scores by publisher</p>
          </div>
          <div className="divide-y divide-[#e5e5e5] dark:divide-[#222]">
            {reliability.slice(0, 8).map((sr, i) => {
              const conf = sr.confidence ?? 0;
              return (
                <motion.div
                  key={sr.source || sr._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-gray-400 dark:text-[#666] w-4 text-right">{i + 1}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black dark:text-white w-28 truncate">{sr.source || sr._id}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-[4px] bg-gray-100 dark:bg-[#222] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: conf + '%' }}
                          transition={{ duration: 0.8, delay: i * 0.04 }}
                          className={'h-full ' + (conf >= 70 ? 'bg-[#4ADE80]' : conf >= 50 ? 'bg-[#FBBF24]' : conf > 0 ? 'bg-[#FB7185]' : 'bg-gray-300 dark:bg-[#333]')}
                        />
                      </div>
                    </div>
                    <span className={'text-[10px] font-mono font-semibold w-10 text-right ' + (conf >= 70 ? 'text-[#4ADE80]' : conf >= 50 ? 'text-[#FBBF24]' : conf > 0 ? 'text-[#FB7185]' : 'text-gray-400 dark:text-[#666]')}>
                      {conf.toFixed(0)}%
                    </span>
                    <span className={'text-[9px] font-medium px-1.5 py-0.5 uppercase tracking-[0.18em] ' + (conf >= 70 ? 'text-[#4ADE80]' : conf >= 50 ? 'text-[#FBBF24]' : conf > 0 ? 'text-[#FB7185]' : 'text-gray-400 dark:text-[#666]')}>
                      {conf >= 70 ? 'HIGH' : conf >= 50 ? 'MED' : conf > 0 ? 'LOW' : 'N/A'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em]">{t('filterLabel')}</span>
        {['all', 'left', 'center', 'right', 'unknown'].map(b => (
          <button
            key={b}
            onClick={() => setBiasFilter(b)}
            className={`px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] border transition-colors ${
              biasFilter === b
                ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                : 'bg-white dark:bg-[#111] border-[#e5e5e5] dark:border-[#222] text-gray-500 dark:text-[#999] hover:border-black dark:hover:border-white'
            }`}
          >
            {b === 'all' ? 'All' : b.charAt(0).toUpperCase() + b.slice(1)}
          </button>
        ))}
      </div>

      {/* Sources Grid */}
      {sources.length === 0 ? (
        <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-12 text-center">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {t('noSources')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#999]">Source credibility data will appear here once seeded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Editorial Table */}
          <div className="border border-[#e5e5e5] dark:border-[#222] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#fafafa] dark:bg-[#0a0a0a]">
                <tr className="text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em]">
                  <th className="text-left px-5 py-3 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => toggleSort('name')}>
                    Source {sortBy === 'name' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
                  </th>
                  <th className="text-center px-3 py-3 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => toggleSort('credibilityScore')}>
                    Credibility {sortBy === 'credibilityScore' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
                  </th>
                  <th className="text-center px-3 py-3">{t('bias')}</th>
                  <th className="text-center px-3 py-3 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => toggleSort('factCheckScore')}>
                    Fact Check {sortBy === 'factCheckScore' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
                  </th>
                  <th className="text-center px-3 py-3 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => toggleSort('transparencyScore')}>
                    Transparency {sortBy === 'transparencyScore' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
                  </th>
                  <th className="w-10 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#222]">
                <AnimatePresence>
                  {sources.map((source, i) => (
                    <motion.tr
                      key={source._id || source.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors ${
                        i % 2 === 0 ? '' : 'bg-[#fafafa] dark:bg-[#0a0a0a]'
                      }`}
                      onClick={() => setSelectedSource(selectedSource?._id === source._id ? null : source)}
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-black dark:text-white text-sm">{source.name}</p>
                        {source.url && (
                          <p className="text-xs text-gray-400 dark:text-[#666] truncate mt-0.5">{source.url}</p>
                        )}
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className={`text-lg font-bold ${getScoreColor(source.credibilityScore)}`}>
                          {source.credibilityScore}
                        </span>
                        <div className="w-full h-1 bg-gray-100 dark:bg-[#222] mt-1.5 overflow-hidden">
                          <div
                            className={`h-full ${getBarColor(source.credibilityScore)}`}
                            style={{ width: `${source.credibilityScore}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] border border-[#e5e5e5] dark:border-[#222] ${biasColors[source.bias] || biasColors.unknown}`}>
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 dark:text-[#666] transition-transform ${selectedSource?._id === source._id ? 'rotate-180' : ''}`}>
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
                <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-[#e5e5e5] dark:divide-[#222] border border-[#e5e5e5] dark:border-[#222]">
                    <div className="text-center p-3 bg-[#fafafa] dark:bg-[#0a0a0a]">
                      <p className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1">{t('credibility')}</p>
                      <p className={`text-xl font-bold ${getScoreColor(selectedSource.credibilityScore)}`} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{selectedSource.credibilityScore}</p>
                    </div>
                    <div className="text-center p-3 bg-[#fafafa] dark:bg-[#0a0a0a]">
                      <p className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1">{t('factCheck')}</p>
                      <p className={`text-xl font-bold ${getScoreColor(selectedSource.factCheckScore)}`} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{selectedSource.factCheckScore}</p>
                    </div>
                    <div className="text-center p-3 bg-[#fafafa] dark:bg-[#0a0a0a]">
                      <p className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1">{t('transparency')}</p>
                      <p className={`text-xl font-bold ${getScoreColor(selectedSource.transparencyScore)}`} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{selectedSource.transparencyScore}</p>
                    </div>
                    <div className="text-center p-3 bg-[#fafafa] dark:bg-[#0a0a0a]">
                      <p className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1">Total Articles</p>
                      <p className="text-xl font-bold text-black dark:text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{selectedSource.totalArticles}</p>
                    </div>
                  </div>
                  {selectedSource.url && (
                    <a
                      href={selectedSource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs text-gray-500 dark:text-[#999] hover:text-black dark:hover:text-white transition-colors underline"
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
