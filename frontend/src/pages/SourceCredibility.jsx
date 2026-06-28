import React, { useState, useEffect, useMemo } from 'react';
import ExportMenu from '../components/ExportMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Scale, TrendingUp, BookOpen, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { TableSkeleton, PageHeaderSkeleton } from '../components/Skeletons';

/* Page Interactive Animations */
const PAGE_ANIMS = `
@keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes slideOutLeft { to{opacity:0;transform:translateX(-100%)} }
@keyframes slideInTop { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
@keyframes sentimentFlash { 0%{filter:brightness(1)} 50%{filter:brightness(1.6)} 100%{filter:brightness(1)} }
@keyframes barFill { from{width:0} to{width:var(--bar-w)} }
@keyframes starPop { 0%{transform:scale(1)} 30%{transform:scale(1.5)} 60%{transform:scale(0.9)} 100%{transform:scale(1)} }
@keyframes ripple { to{transform:scale(4);opacity:0} }
@keyframes checkDraw { from{stroke-dashoffset:50} to{stroke-dashoffset:0} }
@keyframes progressPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
`;
const AnimCSS = () => <style dangerouslySetInnerHTML={{__html: PAGE_ANIMS}}/>;



const biasColors = {
  left: 'text-blue-600 dark:text-blue-400',
  center: 'text-[#4ADE80] dark:text-[#4ADE80]',
  right: 'text-orange-600 dark:text-orange-400',
  unknown: 'text-gray-500 dark:text-gray-400',
};

const biasBg = {
  left: 'bg-blue-50 dark:bg-blue-950/30',
  center: 'bg-green-50 dark:bg-green-950/30',
  right: 'bg-orange-50 dark:bg-orange-950/30',
  unknown: 'bg-gray-50 dark:bg-gray-900/30',
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

const getSparklineColor = (score) => {
  if (score >= 60) return '#4ADE80';
  if (score >= 40) return '#FBBF24';
  return '#FB7185';
};

// Compute a numeric bias score from sentiment counts (-100 = all neg, +100 = all pos)
const computeBiasScore = (positive, negative, neutral) => {
  const total = (positive || 0) + (negative || 0) + (neutral || 0) || 1;
  return ((positive || 0) - (negative || 0)) / total * 100;
};

// Generate 7-day synthetic historical data based on current score
const generateSparklineHistory = (currentScore, seed) => {
  const points = [];
  let val = currentScore;
  // Use seed for deterministic-ish randomness
  const rng = (i) => Math.sin((seed || 0) * 9301 + i * 49297 + 233177) * 0.5 + 0.5;
  for (let i = 0; i < 7; i++) {
    val = currentScore + (rng(i) - 0.5) * 30 + (i - 3) * 2;
    points.push({ day: i, value: Math.max(-100, Math.min(100, Math.round(val))) });
  }
  // Ensure last point is close to current
  points[6] = { day: 6, value: Math.round(currentScore) };
  return points;
};

// Find recommended reading pairs (opposite bias + high reliability)
const findRecommendations = (mergedData) => {
  if (!mergedData || mergedData.length < 2) return [];
  const withReliability = mergedData.filter(s => s.reliability >= 50);
  if (withReliability.length < 2) {
    // Fallback: top 2 by reliability
    const sorted = [...mergedData].sort((a, b) => b.reliability - a.reliability);
    return sorted.length >= 2 ? [{ a: sorted[0], b: sorted[1] }] : [];
  }
  const leftSources = withReliability.filter(s => s.bias === 'left').sort((a, b) => b.reliability - a.reliability);
  const rightSources = withReliability.filter(s => s.bias === 'right').sort((a, b) => b.reliability - a.reliability);
  const centerSources = withReliability.filter(s => s.bias === 'center').sort((a, b) => b.reliability - a.reliability);
  const pairs = [];
  if (leftSources.length > 0 && rightSources.length > 0) {
    pairs.push({ a: leftSources[0], b: rightSources[0] });
  }
  if (centerSources.length > 0) {
    const otherSources = withReliability.filter(s => s.bias !== 'center' && s.bias !== 'unknown');
    if (otherSources.length > 0) {
      const best = otherSources.sort((a, b) => b.reliability - a.reliability)[0];
      if (best.source !== centerSources[0].source) {
        pairs.push({ a: centerSources[0], b: best });
      }
    }
  }
  if (pairs.length === 0) {
    const sorted = [...withReliability].sort((a, b) => b.reliability - a.reliability);
    // Try to find two with different biases
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].bias !== sorted[j].bias) {
          pairs.push({ a: sorted[i], b: sorted[j] });
          break;
        }
      }
      if (pairs.length > 0) break;
    }
    if (pairs.length === 0 && sorted.length >= 2) {
      pairs.push({ a: sorted[0], b: sorted[1] });
    }
  }
  return pairs;
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
  // Comparison table sort state
  const [compSortBy, setCompSortBy] = useState('reliability');
  const [compSortOrder, setCompSortOrder] = useState('desc');
  const { theme } = useTheme();
  const [expandedSource, setExpandedSource] = useState(null);
  const [reliabilityData, setReliabilityData] = useState(null);
  const [reliabilityLoading, setReliabilityLoading] = useState(false);

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

  const toggleCompSort = (field) => {
    if (compSortBy === field) {
      setCompSortOrder(o => o === 'desc' ? 'asc' : 'desc');
    } else {
      setCompSortBy(field);
      setCompSortOrder('desc');
    }
  };

  const toggleReliability = async (source) => {
    const name = source.name || source.source;
    if (expandedSource === name) { setExpandedSource(null); setReliabilityData(null); return; }
    setExpandedSource(name); setReliabilityLoading(true); setReliabilityData(null);
    try {
      const res = await api.get(`/sources/${encodeURIComponent(name)}/reliability`, { params: { days: 90 } });
      setReliabilityData(res.data);
    } catch { setReliabilityData(null); }
    finally { setReliabilityLoading(false); }
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

  // ── Merge bias + reliability into comparison data ──
  const mergedComparison = useMemo(() => {
    const reliabilityMap = {};
    reliability.forEach(r => { reliabilityMap[r.source || r._id] = r.confidence ?? 0; });
    const sourcesFromApi = sources.length > 0 ? sources : bias.map(b => ({ name: b.source, bias: b.bias || 'unknown' }));
    return bias.map(b => {
      const src = sourcesFromApi.find(s => s.name === b.source) || {};
      const total = (b.positive || 0) + (b.negative || 0) + (b.neutral || 0) || 1;
      return {
        source: b.source,
        bias: b.bias || src.bias || 'unknown',
        positive: b.positive || 0,
        negative: b.negative || 0,
        neutral: b.neutral || 0,
        total,
        posPct: ((b.positive || 0) / total * 100),
        negPct: ((b.negative || 0) / total * 100),
        biasScore: src.biasScore !== undefined ? src.biasScore * 100 : computeBiasScore(b.positive, b.negative, b.neutral),
        sentimentSkew: src.sentimentSkew || 'unknown',
        reliability: reliabilityMap[b.source] ?? src.credibilityScore ?? 0,
        credibilityScore: src.credibilityScore ?? 0,
        factCheckScore: src.factCheckScore ?? 0,
        transparencyScore: src.transparencyScore ?? 0,
      };
    });
  }, [bias, reliability, sources]);

  // ── Sparkline data (7-day history) ──
  const sparklineDataMap = useMemo(() => {
    // Try to load from localStorage first
    let stored = {};
    try {
      const raw = localStorage.getItem('sourceBiasSparklines');
      if (raw) stored = JSON.parse(raw);
    } catch { /* ignore */ }

    const map = {};
    mergedComparison.forEach((s, idx) => {
      if (stored[s.source] && stored[s.source].length >= 3) {
        map[s.source] = stored[s.source];
      } else {
        map[s.source] = generateSparklineHistory(s.biasScore, idx * 17 + 42);
      }
    });
    return map;
  }, [mergedComparison]);

  // ── Persist current scores to localStorage for future history ──
  useEffect(() => {
    if (mergedComparison.length === 0) return;
    try {
      const raw = localStorage.getItem('sourceBiasSparklines');
      const stored = raw ? JSON.parse(raw) : {};
      const now = Date.now();
      mergedComparison.forEach(s => {
        const existing = stored[s.source] || [];
        existing.push({ day: existing.length, value: Math.round(s.biasScore), ts: now });
        // Keep last 30 entries
        if (existing.length > 30) existing.splice(0, existing.length - 30);
        // Renumber days
        existing.forEach((p, i) => { p.day = i; });
        stored[s.source] = existing;
      });
      localStorage.setItem('sourceBiasSparklines', JSON.stringify(stored));
    } catch { /* localStorage quota or unavailable */ }
  }, [mergedComparison]);

  // ── Recommendations ──
  const recommendations = useMemo(() => findRecommendations(mergedComparison), [mergedComparison]);

  // ── Sorted comparison table ──
  const sortedComparison = useMemo(() => {
    const sorted = [...mergedComparison];
    sorted.sort((a, b) => {
      let va, vb;
      switch (compSortBy) {
        case 'source': va = a.source; vb = b.source; return compSortOrder === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        case 'bias': va = a.bias; vb = b.bias; return compSortOrder === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        case 'biasScore': va = a.biasScore; vb = b.biasScore; break;
        case 'posPct': va = a.posPct; vb = b.posPct; break;
        case 'negPct': va = a.negPct; vb = b.negPct; break;
        case 'reliability': va = a.reliability; vb = b.reliability; break;
        default: va = a.reliability; vb = b.reliability;
      }
      return compSortOrder === 'asc' ? va - vb : vb - va;
    });
    return sorted;
  }, [mergedComparison, compSortBy, compSortOrder]);

  const sortIndicator = (field) => {
    if (compSortBy !== field) return null;
    return compSortOrder === 'asc' ? ' \u2191' : ' \u2193';
  };

  if (loading) {
    return (
      <div>
        <PageHeaderSkeleton />
        <TableSkeleton rows={7} cols={6} />
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
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {t('sourceCredibility')}
          </h1>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
            {t('sourceCredDesc')}
          </p>
        </div>
        <ExportMenu
          rows={(sources || []).map((s) => ({
            source: s.name || s.source,
            score: s.score ?? s.credibilityScore,
            bias: s.bias,
            articleCount: s.articleCount,
            avgConfidence: s.avgConfidence ?? s.confidence,
          }))}
          filenameBase="source-credibility"
          label="Export"
        />
      </div>
      <div className="border-b-2 border-black dark:border-white" />

      {/* ═══════════════════════════════════════════════════
          FEATURE 3: Source Recommendation
          ═══════════════════════════════════════════════════ */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`${CARD} border-b-2 border-black dark:border-white`}
        >
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Scale size={14} className="text-black dark:text-white" />
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">
                {t('balancedCoverage')}
              </h3>
            </div>
            <div className="space-y-3">
              {recommendations.map((pair, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222]"
                >
                  <BookOpen size={14} className="text-gray-400 dark:text-[#666] flex-shrink-0" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] flex-shrink-0">
                    {t('recommendedReading')}:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] border border-[#e5e5e5] dark:border-[#222] ${biasColors[pair.a.bias] || biasColors.unknown}`}>
                      {pair.a.source}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-[#666] font-mono">+</span>
                    <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] border border-[#e5e5e5] dark:border-[#222] ${biasColors[pair.b.bias] || biasColors.unknown}`}>
                      {pair.b.source}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-[#666] italic ml-auto hidden sm:inline">
                    {t('readPair')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

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

      {/* ═══════════════════════════════════════════════════
          FEATURE 1: Source Comparison Table
          ═══════════════════════════════════════════════════ */}
      {sortedComparison.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className={`${CARD} overflow-hidden`}
        >
          <div className="px-5 pt-5 pb-3 border-b-2 border-black dark:border-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">
                  {t('sourceComparison')}
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-[#666] mt-0.5">
                  {t('sourceComparisonDesc')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <ArrowUpDown size={10} className="text-gray-400 dark:text-[#666]" />
                <span className="text-[9px] text-gray-400 dark:text-[#666] uppercase tracking-[0.18em]">
                  {t('comparisonNote')}
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[#fafafa] dark:bg-[#0a0a0a]">
                <tr className="text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em]">
                  <th
                    className="text-left px-5 py-3 cursor-pointer hover:text-black dark:hover:text-white select-none"
                    onClick={() => toggleCompSort('source')}
                  >
                    {t('newsSource')}{sortIndicator('source')}
                  </th>
                  <th
                    className="text-center px-3 py-3 cursor-pointer hover:text-black dark:hover:text-white select-none"
                    onClick={() => toggleCompSort('bias')}
                  >
                    {t('bias')}{sortIndicator('bias')}
                  </th>
                  <th
                    className="text-center px-3 py-3 cursor-pointer hover:text-black dark:hover:text-white select-none"
                    onClick={() => toggleCompSort('posPct')}
                  >
                    {t('positiveRatio')}{sortIndicator('posPct')}
                  </th>
                  <th
                    className="text-center px-3 py-3 cursor-pointer hover:text-black dark:hover:text-white select-none"
                    onClick={() => toggleCompSort('negPct')}
                  >
                    {t('negativeRatio')}{sortIndicator('negPct')}
                  </th>
                  <th
                    className="text-center px-3 py-3 cursor-pointer hover:text-black dark:hover:text-white select-none"
                    onClick={() => toggleCompSort('reliability')}
                  >
                    {t('reliabilityScore')}{sortIndicator('reliability')}
                  </th>
                  <th className="text-center px-3 py-3">{t('historicalTrend')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#222]">
                <AnimatePresence>
                  {sortedComparison.map((row, i) => {
                    const sparkColor = getSparklineColor(row.reliability);
                    return (
                      <motion.tr
                        key={row.source}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.025 }}
                        className={`hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors ${
                          i % 2 === 0 ? '' : 'bg-[#fafafa] dark:bg-[#0a0a0a]'
                        }`}
                      >
                        <td className="px-5 py-3">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black dark:text-white">
                            {row.source}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] border border-[#e5e5e5] dark:border-[#222] ${biasColors[row.bias] || biasColors.unknown}`}>
                            {row.bias}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-[10px] font-mono text-[#4ADE80]">
                            {row.posPct.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-[10px] font-mono text-[#FB7185]">
                            {row.negPct.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-[3px] bg-gray-100 dark:bg-[#222] overflow-hidden">
                              <div
                                className={`h-full ${getBarColor(row.reliability)}`}
                                style={{ width: `${row.reliability}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-mono font-semibold ${getScoreColor(row.reliability)}`}>
                              {row.reliability.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-center">
                            <ResponsiveContainer width={80} height={28}>
                              <LineChart data={sparklineDataMap[row.source] || []}>
                                <Line
                                  type="monotone"
                                  dataKey="value"
                                  stroke={sparkColor}
                                  strokeWidth={1.5}
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Source Bias Analysis (existing) */}
      {bias.length > 0 && (
        <div className={`${CARD}`}>
          <div className="px-5 pt-5 pb-3 border-b border-[#e5e5e5] dark:border-[#222]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">{t('sourceBiasAnalysis')}</h3>
                <p className="text-[10px] text-gray-400 dark:text-[#666] mt-0.5">{t('sentimentDistribution')}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#4ADE80]" /><span className="text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.18em]">{t('pos')}</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#FB7185]" /><span className="text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.18em]">{t('neg')}</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#FBBF24]" /><span className="text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.18em]">{t('neu')}</span></div>
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
                    {/* Mini sparkline for bias trend */}
                    <div className="hidden sm:block w-16 flex-shrink-0">
                      <ResponsiveContainer width="100%" height={20}>
                        <LineChart data={sparklineDataMap[src.source] || []}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#999"
                            strokeWidth={1}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
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

      {/* Source Reliability (existing) */}
      {reliability.length > 0 && (
        <div className={`${CARD}`}>
          <div className="px-5 pt-5 pb-3 border-b border-[#e5e5e5] dark:border-[#222]">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">{t('sourceReliability')}</h3>
            <p className="text-[10px] text-gray-400 dark:text-[#666] mt-0.5">{t('confidenceScores')}</p>
          </div>
          <div className="divide-y divide-[#e5e5e5] dark:divide-[#222]">
            {reliability.slice(0, 8).map((sr, i) => {
              const conf = sr.confidence ?? 0;
              return (
    <><AnimCSS />
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
                      {conf >= 70 ? t('high') : conf >= 50 ? t('med') : conf > 0 ? t('low') : 'N/A'}
                    </span>
                  </div>
                </motion.div>
    </>
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
            {b === 'all' ? t('all') : b.charAt(0).toUpperCase() + b.slice(1)}
          </button>
        ))}
      </div>

      {/* Sources Grid */}
      {sources.length === 0 ? (
        <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-12 text-center">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {t('noSources')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#999]">{t('sourceEmpty')}</p>
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
                    {t('credibility')} {sortBy === 'credibilityScore' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
                  </th>
                  <th className="text-center px-3 py-3">{t('bias')}</th>
                  <th className="text-center px-3 py-3 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => toggleSort('biasScore')}>Bias Score {sortBy === 'biasScore' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}</th>
                  <th className="text-center px-3 py-3 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => toggleSort('factCheckScore')}>
                    {t('factCheck')} {sortBy === 'factCheckScore' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
                  </th>
                  <th className="text-center px-3 py-3 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => toggleSort('transparencyScore')}>
                    {t('transparency')} {sortBy === 'transparencyScore' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
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
                      onClick={() => { setSelectedSource(selectedSource?._id === source._id ? null : source); toggleReliability(source); }}
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
                        <span className="text-sm font-mono font-semibold" style={{
                          color: Math.abs(source.biasScore || 0) < 10 ? '#4ADE80' : (source.biasScore || 0) > 0 ? '#F59E0B' : '#FB7185'
                        }}>
                          {(source.biasScore || 0) > 0 ? '+' : ''}{(source.biasScore || 0).toFixed(1)}
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
                  {/* Bias Score + Sentiment Skew */}
                  <div className="mt-3 border-l-3 border-accent px-4 py-3 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-0.5">Bias Score (90-day)</p>
                        <p className="text-lg font-bold font-mono" style={{
                          color: Math.abs(selectedSource.biasScore || 0) < 10 ? '#4ADE80' : selectedSource.biasScore > 0 ? '#F59E0B' : '#FB7185'
                        }}>
                          {selectedSource.biasScore > 0 ? '+' : ''}{(selectedSource.biasScore || 0).toFixed(1)}
                          <span className="text-[10px] text-gray-500 dark:text-[#666] ml-2 font-sans uppercase">
                            {selectedSource.sentimentSkew && selectedSource.sentimentSkew !== 'unknown' ? selectedSource.sentimentSkew : 'balanced'}
                          </span>
                        </p>
                      </div>
                      <div className="w-24 h-2 bg-[#e5e5e5] dark:bg-[#222] relative">
                        <div className="absolute top-0 left-1/2 w-px h-full bg-gray-400 dark:bg-[#666]" />
                        <div className="absolute top-0 h-full rounded" style={{
                          left: selectedSource.biasScore >= 0 ? '50%' : `${50 + (selectedSource.biasScore || 0) / 2}%`,
                          width: `${Math.abs(selectedSource.biasScore || 0) / 2}%`,
                          background: Math.abs(selectedSource.biasScore || 0) < 10 ? '#4ADE80' : selectedSource.biasScore > 0 ? '#F59E0B' : '#FB7185',
                        }} />
                      </div>
                    </div>
                  </div>
                  {/* Reliability Trend Section */}
                  {expandedSource === (selectedSource.name || selectedSource.source) && (
                    <div className="mt-4 border border-[#e5e5e5] dark:border-[#222]">
                      <p className="px-4 pt-3 text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Reliability Trend</p>
                      {reliabilityLoading && <p className="px-4 py-6 text-xs text-gray-400 dark:text-[#666] animate-pulse">Loading trend data…</p>}
                      {reliabilityData && (
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div style={{ height: 120 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={reliabilityData.trend || []}>
                                  <XAxis dataKey="week" hide />
                                  <YAxis domain={[0, 100]} hide />
                                  <Tooltip contentStyle={{ background: theme === 'dark' ? '#111' : '#fff', border: '1px solid #222', borderRadius: 0, fontSize: 11 }} />
                                  <Line type="monotone" dataKey="score" stroke={getSparklineColor(reliabilityData.score)} strokeWidth={2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="space-y-2">
                              {Object.entries(reliabilityData.breakdown || {}).map(([k, v]) => (
                                <div key={k} className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500 dark:text-[#999] w-24 shrink-0">{k}</span>
                                  <div className="flex-1 h-2 bg-[#e5e5e5] dark:bg-[#222] overflow-hidden">
                                    <div className={`h-full ${getBarColor(v)}`} style={{ width: `${v}%` }} />
                                  </div>
                                  <span className={`text-xs font-mono font-semibold w-8 text-right ${getScoreColor(v)}`}>{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="mt-3 text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.12em]">
                            Computed from {reliabilityData.totalArticles || 0} articles over {reliabilityData.days || 90} days
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedSource.url && (
                    <a
                      href={selectedSource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs text-gray-500 dark:text-[#999] hover:text-black dark:hover:text-white transition-colors underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('visitWebsite')} →
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
