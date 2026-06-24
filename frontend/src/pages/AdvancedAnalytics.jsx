import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Cell,
} from 'recharts';

/* ─── Color constants ─────────────────────────────────────────────── */
const COLORS = {
  positive: '#059669',
  negative: '#dc2626',
  neutral:  '#d97706',
  accent:   '#6366f1',
};
const SOURCE_COLORS = [
  '#6366f1','#059669','#dc2626','#d97706','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#3b82f6','#84cc16',
  '#06b6d4','#a855f7',
];

/* ─── Editorial card wrapper ──────────────────────────────────────── */
const Card = ({ title, subtitle, badge, children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className={`bg-paper-card dark:bg-paper-dark-card border border-paper-line dark:border-paper-dark-line ${className}`}
  >
    <div className="px-5 pt-5 pb-3 border-b border-paper-line dark:border-paper-dark-line">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink dark:text-paper font-sans">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] text-ink-muted dark:text-ink-faint mt-0.5">{subtitle}</p>
          )}
        </div>
        {badge && (
          <span className="text-[9px] uppercase tracking-[0.15em] border border-ink/15 dark:border-paper/15 px-2 py-0.5 text-ink-muted dark:text-ink-faint font-sans">
            {badge}
          </span>
        )}
      </div>
    </div>
    <div className="p-5">{children}</div>
  </motion.div>
);

/* ─── Custom Tooltip (matching project style) ─────────────────────── */
const EditorialTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-paper dark:bg-ink border border-ink/15 dark:border-paper/15 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-ink dark:text-paper mb-1.5">
        {label}
      </p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2" style={{ backgroundColor: p.color }} />
            <span className="text-[11px] text-ink/60 dark:text-paper/60 font-sans">{p.name}</span>
          </div>
          <span className="text-xs font-semibold" style={{ color: p.color }}>
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   1. SENTIMENT CORRELATION MATRIX (heatmap table)
   ═══════════════════════════════════════════════════════════════════ */
const CorrelationMatrix = ({ sources, matrix }) => {
  if (!sources?.length || !matrix?.length) {
    return <p className="text-sm text-ink-muted dark:text-ink-faint text-center py-12">No correlation data</p>;
  }

  const getColor = (val) => {
    if (val >= 0.9) return 'bg-emerald-600 text-white';
    if (val >= 0.7) return 'bg-emerald-400/70 text-ink dark:text-paper';
    if (val >= 0.5) return 'bg-yellow-400/50 text-ink dark:text-paper';
    if (val >= 0.3) return 'bg-orange-400/40 text-ink dark:text-paper';
    return 'bg-red-400/30 text-ink dark:text-paper';
  };

  const truncate = (s, len = 8) => s.length > len ? s.slice(0, len) + '…' : s;

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-[10px]">
        <thead>
          <tr>
            <th className="text-left py-1 px-1 text-ink-muted dark:text-ink-faint uppercase tracking-wider font-sans"></th>
            {sources.map(s => (
              <th key={s} className="text-center py-1 px-1 text-ink-muted dark:text-ink-faint uppercase tracking-wider font-sans whitespace-nowrap" title={s}>
                {truncate(s)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="text-left py-1 px-1 font-medium text-ink dark:text-paper whitespace-nowrap" title={row.source}>
                {truncate(row.source)}
              </td>
              {sources.map((s, j) => (
                <td key={j} className="text-center py-1 px-1">
                  <div
                    className={`w-full py-1.5 font-semibold ${getColor(row[s] || 0)}`}
                    title={`${row.source} ↔ ${s}: ${(row[s] || 0).toFixed(2)}`}
                  >
                    {(row[s] || 0).toFixed(2)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-center gap-3 mt-3">
        <span className="text-[9px] uppercase tracking-wider text-ink-muted dark:text-ink-faint">Low</span>
        <div className="flex gap-0.5">
          {['bg-red-400/30','bg-orange-400/40','bg-yellow-400/50','bg-emerald-400/70','bg-emerald-600'].map((c, i) => (
            <div key={i} className={`w-5 h-2.5 ${c}`} />
          ))}
        </div>
        <span className="text-[9px] uppercase tracking-wider text-ink-muted dark:text-ink-faint">High</span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   2. SOURCE BIAS ANALYSIS (stacked bar chart)
   ═══════════════════════════════════════════════════════════════════ */
const SourceBiasChart = ({ data }) => {
  if (!data?.length) return <p className="text-sm text-ink-muted text-center py-12">No source data</p>;

  const chartData = data.map(d => ({
    source: d.source.length > 12 ? d.source.slice(0, 12) + '…' : d.source,
    Positive: d.positive,
    Negative: d.negative,
    Neutral: d.neutral,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="1 3" stroke="currentColor" opacity={0.08} />
        <XAxis
          dataKey="source" stroke="currentColor" opacity={0.3}
          style={{ fontSize: '10px', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}
          angle={-35} textAnchor="end" tickMargin={8}
          axisLine={{ stroke: 'currentColor', opacity: 0.15 }}
        />
        <YAxis stroke="currentColor" opacity={0.3}
          style={{ fontSize: '10px', fontFamily: "'Inter', sans-serif" }}
          axisLine={{ stroke: 'currentColor', opacity: 0.15 }}
        />
        <Tooltip content={<EditorialTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          iconType="square" iconSize={8}
        />
        <Bar dataKey="Positive" stackId="a" fill={COLORS.positive} opacity={0.85} />
        <Bar dataKey="Negative" stackId="a" fill={COLORS.negative} opacity={0.85} />
        <Bar dataKey="Neutral" stackId="a" fill={COLORS.neutral} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   3. TOPIC CLUSTERING (bubble-style word cloud)
   ═══════════════════════════════════════════════════════════════════ */
const TopicCluster = ({ data }) => {
  if (!data?.length) return <p className="text-sm text-ink-muted text-center py-12">No topic data</p>;

  const max = Math.max(...data.map(d => d.count));
  const min = Math.min(...data.map(d => d.count));

  const getSentimentColor = (sentiment) => {
    if (sentiment === 'Positive') return 'text-emerald-600 dark:text-emerald-400';
    if (sentiment === 'Negative') return 'text-red-600 dark:text-red-400';
    return 'text-amber-600 dark:text-amber-400';
  };

  const getBg = (sentiment) => {
    if (sentiment === 'Positive') return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
    if (sentiment === 'Negative') return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
    return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
  };

  return (
    <div className="flex flex-wrap gap-2">
      {data.map((item, i) => {
        const scale = max === min ? 1 : (item.count - min) / (max - min);
        const fontSize = Math.round(11 + scale * 10);
        const padding = Math.round(4 + scale * 6);
        return (
          <motion.span
            key={item.word}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            className={`inline-flex items-center gap-1.5 border font-sans cursor-default ${getBg(item.sentiment)} ${getSentimentColor(item.sentiment)}`}
            style={{ fontSize: `${fontSize}px`, padding: `${padding}px ${padding + 4}px` }}
            title={`${item.word}: ${item.count} mentions (${item.sentiment})`}
          >
            <span className="font-semibold">{item.word}</span>
            <span className="text-[9px] opacity-50">{item.count}</span>
          </motion.span>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   4. WORD FREQUENCY TRENDS (multi-line chart)
   ═══════════════════════════════════════════════════════════════════ */
const WordFrequencyTrends = ({ words, data }) => {
  if (!words?.length || !data?.length) return <p className="text-sm text-ink-muted text-center py-12">No trend data</p>;

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = data.map(d => ({ ...d, date: formatDate(d.date) }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="1 3" stroke="currentColor" opacity={0.08} />
        <XAxis
          dataKey="date" stroke="currentColor" opacity={0.3}
          style={{ fontSize: '10px', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}
          tickMargin={10}
          axisLine={{ stroke: 'currentColor', opacity: 0.15 }}
        />
        <YAxis stroke="currentColor" opacity={0.3}
          style={{ fontSize: '10px', fontFamily: "'Inter', sans-serif" }}
          axisLine={{ stroke: 'currentColor', opacity: 0.15 }}
        />
        <Tooltip content={<EditorialTooltip />} />
        {words.slice(0, 6).map((word, i) => (
          <Line
            key={word}
            type="monotone"
            dataKey={word}
            stroke={SOURCE_COLORS[i]}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

const WordLegend = ({ words }) => (
  <div className="flex flex-wrap justify-center gap-3 mt-3">
    {words.slice(0, 6).map((word, i) => (
      <div key={word} className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5" style={{ backgroundColor: SOURCE_COLORS[i] }} />
        <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted dark:text-ink-faint font-sans">{word}</span>
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   5. DAY / HOUR HEATMAP (7×24 grid)
   ═══════════════════════════════════════════════════════════════════ */
const DayHourHeatmap = ({ data }) => {
  const [hoveredCell, setHoveredCell] = useState(null);

  if (!data?.length) return <p className="text-sm text-ink-muted text-center py-12">No heatmap data</p>;

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  // Build lookup
  const lookup = {};
  let maxCount = 0;
  data.forEach(d => {
    const key = `${d.day}-${d.hour}`;
    lookup[key] = d;
    if (d.count > maxCount) maxCount = d.count;
  });

  const getColor = (count, sentiment) => {
    if (!count) return 'bg-paper-subtle dark:bg-paper-dark-subtle';
    const intensity = Math.max(0.15, count / maxCount);
    if (sentiment > 0.1) return `bg-emerald-500`;
    if (sentiment < -0.1) return `bg-red-500`;
    return `bg-amber-500`;
  };

  const getOpacity = (count) => {
    if (!count) return 0.08;
    return Math.max(0.15, count / maxCount);
  };

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      {/* Hour labels */}
      <div className="flex gap-0.5 mb-1 ml-10">
        {HOURS.map(h => (
          <div key={h} className="w-6 text-center text-[8px] text-ink-muted dark:text-ink-faint font-sans">
            {h % 3 === 0 ? `${h}h` : ''}
          </div>
        ))}
      </div>

      {/* Grid */}
      {DAYS.map((day, dayIdx) => (
        <div key={day} className="flex items-center gap-0.5 mb-0.5">
          <div className="w-9 text-right pr-1 text-[10px] text-ink-muted dark:text-ink-faint font-sans uppercase tracking-wider">
            {day}
          </div>
          {HOURS.map(hour => {
            const cell = lookup[`${dayIdx}-${hour}`];
            const count = cell?.count || 0;
            const sent = cell?.avgSentiment || 0;
            const isHovered = hoveredCell === `${dayIdx}-${hour}`;
            return (
              <div
                key={hour}
                className={`w-6 h-6 cursor-pointer transition-all ${isHovered ? 'ring-2 ring-ink dark:ring-paper' : ''} ${getColor(count, sent)}`}
                style={{ opacity: getOpacity(count) }}
                onMouseEnter={() => setHoveredCell(`${dayIdx}-${hour}`)}
                onMouseLeave={() => setHoveredCell(null)}
                title={`${day} ${hour}:00 — ${count} articles${sent ? `, sentiment: ${sent.toFixed(2)}` : ''}`}
              />
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        {[
          { color: 'bg-emerald-500', label: 'Positive' },
          { color: 'bg-amber-500', label: 'Neutral' },
          { color: 'bg-red-500', label: 'Negative' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 ${item.color}`} style={{ opacity: 0.7 }} />
            <span className="text-[10px] text-ink-muted dark:text-ink-faint uppercase tracking-wider">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-ink-muted dark:text-ink-faint">Opacity = volume</span>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   6. SOURCE RELIABILITY RADAR
   ═══════════════════════════════════════════════════════════════════ */
const SourceReliabilityRadar = ({ data }) => {
  const [selectedSource, setSelectedSource] = useState(null);

  if (!data?.length) return <p className="text-sm text-ink-muted text-center py-12">No reliability data</p>;

  // Radar dimensions
  const dimensions = [
    { key: 'confidence', label: 'Confidence' },
    { key: 'impact', label: 'Impact' },
    { key: 'consistency', label: 'Consistency' },
    { key: 'volume', label: 'Volume' },
    { key: 'alertRate', label: 'Alert Rate' },
  ];

  const radarData = dimensions.map(dim => {
    const entry = { dimension: dim.label };
    const src = selectedSource
      ? data.find(d => d.source === selectedSource) || data[0]
      : data[0];
    entry.value = Math.min(100, Math.max(0, src[dim.key] || 0));
    return entry;
  });

  return (
    <div>
      {/* Source selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {data.map((d, i) => (
          <button
            key={d.source}
            onClick={() => setSelectedSource(d.source)}
            className={`px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] border transition-colors font-sans ${
              (selectedSource || data[0].source) === d.source
                ? 'bg-ink dark:bg-paper text-paper dark:text-ink border-ink dark:border-paper'
                : 'border-ink/20 dark:border-paper/20 text-ink-muted dark:text-ink-faint hover:border-ink/50'
            }`}
          >
            {d.source}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
          <PolarGrid stroke="currentColor" opacity={0.12} />
          <PolarAngleAxis
            dataKey="dimension"
            style={{ fontSize: '10px', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}
            stroke="currentColor"
            opacity={0.4}
          />
          <PolarRadiusAxis
            angle={90} domain={[0, 100]} tick={false}
            stroke="currentColor" opacity={0.1}
          />
          <Radar
            name={selectedSource || data[0]?.source || 'Source'}
            dataKey="value"
            stroke={COLORS.accent}
            fill={COLORS.accent}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Source stats grid */}
      <div className="grid grid-cols-5 gap-2 mt-3">
        {dimensions.map(dim => {
          const src = selectedSource ? data.find(d => d.source === selectedSource) || data[0] : data[0];
          const val = src[dim.key] || 0;
          return (
            <div key={dim.key} className="text-center p-2 bg-paper-subtle dark:bg-paper-dark-subtle border border-paper-line dark:border-paper-dark-line">
              <p className="text-base font-bold font-display text-ink dark:text-paper">{val}</p>
              <p className="text-[9px] text-ink-muted dark:text-ink-faint uppercase tracking-wider">{dim.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   CSV / PDF EXPORT
   ═══════════════════════════════════════════════════════════════════ */
const exportCSV = (data) => {
  if (!data) return;
  const rows = [];

  // Source Bias
  rows.push(['SOURCE BIAS ANALYSIS']);
  rows.push(['Source', 'Total', 'Positive', 'Negative', 'Neutral']);
  data.sourceBias?.forEach(d => rows.push([d.source, d.total, d.positive, d.negative, d.neutral]));
  rows.push([]);

  // Reliability
  rows.push(['SOURCE RELIABILITY']);
  rows.push(['Source', 'Confidence', 'Impact', 'Consistency', 'Volume', 'Alert Rate']);
  data.sourceReliability?.forEach(d => rows.push([d.source, d.confidence, d.impact, d.consistency, d.volume, d.alertRate]));
  rows.push([]);

  // Word Trends
  if (data.wordTrends?.words?.length) {
    rows.push(['WORD FREQUENCY TRENDS']);
    rows.push(['Date', ...data.wordTrends.words]);
    data.wordTrends.data?.forEach(d => rows.push([d.date, ...data.wordTrends.words.map(w => d[w] || 0)]));
  }

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `advanced-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exported');
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
const AdvancedAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/analytics/advanced');
        setData(res.data?.data || res.data);
      } catch (err) {
        console.error('Advanced analytics fetch error:', err);
        setError(err.response?.data?.error || err.message);
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-72 bg-ink/5 dark:bg-paper/5 animate-pulse" />
          <div className="h-4 w-96 bg-ink/5 dark:bg-paper/5 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-80 bg-ink/5 dark:bg-paper/5 animate-pulse border border-paper-line dark:border-paper-dark-line" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 border border-paper-line dark:border-paper-dark-line flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-muted">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3 className="text-lg font-display font-semibold text-ink dark:text-paper mb-2">Analytics Unavailable</h3>
        <p className="text-sm text-ink-muted mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 text-xs uppercase tracking-wider border border-ink dark:border-paper text-ink dark:text-paper hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const sections = [
    { key: 'all', label: 'All Analytics' },
    { key: 'correlation', label: 'Correlation' },
    { key: 'bias', label: 'Source Bias' },
    { key: 'topics', label: 'Topics' },
    { key: 'trends', label: 'Word Trends' },
    { key: 'heatmap', label: 'Day/Hour' },
    { key: 'reliability', label: 'Reliability' },
  ];

  const showSection = (key) => activeSection === 'all' || activeSection === key;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink dark:text-paper tracking-tight font-display">
            Advanced Analytics
          </h1>
          <div className="editorial-rule mt-2 mb-2" />
          <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">
            Deep-dive sentiment correlation, source bias, topic clustering, and publication patterns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(data)}
            className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] border border-ink/20 dark:border-paper/20 text-ink-muted dark:text-ink-faint hover:border-ink/50 dark:hover:border-paper/50 transition-colors font-sans flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Section filter tabs */}
      <div className="flex flex-wrap items-center gap-1">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] border transition-colors font-sans ${
              activeSection === s.key
                ? 'bg-ink dark:bg-paper text-paper dark:text-ink border-ink dark:border-paper'
                : 'border-ink/20 dark:border-paper/20 text-ink-muted dark:text-ink-faint hover:border-ink/50 dark:hover:border-paper/50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Correlation Matrix */}
        {showSection('correlation') && (
          <Card
            title="Sentiment Correlation Matrix"
            subtitle="Cosine similarity between source sentiment distributions"
            badge="Similarity"
          >
            <CorrelationMatrix
              sources={data?.sentimentCorrelation?.sources}
              matrix={data?.sentimentCorrelation?.matrix}
            />
          </Card>
        )}

        {/* Source Bias Analysis */}
        {showSection('bias') && (
          <Card
            title="Source Bias Analysis"
            subtitle="Sentiment distribution across top news sources"
            badge="Distribution"
          >
            <SourceBiasChart data={data?.sourceBias} />
          </Card>
        )}

        {/* Topic Clustering */}
        {showSection('topics') && (
          <Card
            title="Topic Clustering"
            subtitle="Keyword clusters colored by dominant sentiment"
            badge="Keywords"
            className="lg:col-span-2"
          >
            <TopicCluster data={data?.topicClusters} />
          </Card>
        )}

        {/* Word Frequency Trends */}
        {showSection('trends') && (
          <Card
            title="Word Frequency Trends"
            subtitle="Top trending words over the past 30 days"
            badge="30 Days"
            className="lg:col-span-2"
          >
            <WordFrequencyTrends
              words={data?.wordTrends?.words}
              data={data?.wordTrends?.data}
            />
            <WordLegend words={data?.wordTrends?.words || []} />
          </Card>
        )}

        {/* Day/Hour Heatmap */}
        {showSection('heatmap') && (
          <Card
            title="Publication Heatmap"
            subtitle="When articles are published (day × hour), colored by sentiment"
            badge="7 × 24"
            className="lg:col-span-2"
          >
            <DayHourHeatmap data={data?.dayHourHeatmap} />
          </Card>
        )}

        {/* Source Reliability Radar */}
        {showSection('reliability') && (
          <Card
            title="Source Reliability Score"
            subtitle="Multi-dimensional source comparison"
            badge="Radar"
            className="lg:col-span-2"
          >
            <SourceReliabilityRadar data={data?.sourceReliability} />
          </Card>
        )}
      </div>

      {/* Data freshness notice */}
      {data && (
        <p className="text-[10px] text-ink/30 dark:text-paper/30 text-center uppercase tracking-widest font-sans">
          Data cached for 5 minutes · Refresh for latest
        </p>
      )}
    </motion.div>
  );
};

export default AdvancedAnalytics;
