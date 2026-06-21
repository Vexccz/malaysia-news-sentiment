import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../services/api';

const RANGE_OPTIONS = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="p-3 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] shadow-lg text-xs">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
      <div className="space-y-0.5">
        <p className="text-gray-600 dark:text-gray-300">Score: <span className="font-mono font-medium">{data?.avgSentiment?.toFixed(3)}</span></p>
        <p className="text-green-600">Positive: {data?.positiveCount}</p>
        <p className="text-red-500">Negative: {data?.negativeCount}</p>
        <p className="text-gray-500">Neutral: {data?.neutralCount}</p>
        <p className="font-medium text-gray-700 dark:text-gray-200">Total: {data?.totalArticles}</p>
      </div>
    </div>
  );
};

const SentimentTimeline = () => {
  const [topic, setTopic] = useState('');
  const [days, setDays] = useState(30);
  const [timeline, setTimeline] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      setSearched(true);
      const { data } = await api.get('/news/sentiment-timeline', {
        params: { topic: topic.trim() || undefined, days },
      });
      setTimeline(data.timeline || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
      setTimeline([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [topic, days]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchTimeline();
  };

  const spikes = timeline.filter((d) => {
    if (timeline.length < 3) return false;
    const avg = timeline.reduce((s, x) => s + x.avgSentiment, 0) / timeline.length;
    return Math.abs(d.avgSentiment - avg) > 0.4;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="border-b-2 border-gray-900 dark:border-white pb-3">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
          Timeline
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 tracking-wide">
          Sentiment trends over time
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic (e.g. economy, Anwar, flood)..."
          className="flex-1 min-w-[200px] px-4 py-2.5 border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111] text-sm text-gray-900 dark:text-white rounded-lg placeholder-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500"
        />
        <div className="flex items-center gap-1 border border-gray-200 dark:border-[#333] rounded-lg p-0.5">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                days === opt.value
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 transition-all"
        >
          {loading ? 'Loading...' : 'Analyze'}
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center">
          <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white rounded-full animate-spin mx-auto" />
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && timeline.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400">No data found for this topic and time range</p>
        </div>
      )}

      {/* Results */}
      {!loading && timeline.length > 0 && (
        <div className="space-y-6">
          {/* Summary stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Articles</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white font-mono">{summary.totalArticles}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Avg Sentiment</p>
                <p className={`text-xl font-bold font-mono ${
                  summary.avgSentiment > 0.1 ? 'text-green-600 dark:text-green-400' :
                  summary.avgSentiment < -0.1 ? 'text-red-600 dark:text-red-400' :
                  'text-gray-900 dark:text-white'
                }`}>
                  {summary.avgSentiment > 0 ? '+' : ''}{summary.avgSentiment}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Trend</p>
                <p className={`text-xl font-bold ${
                  summary.trend === 'improving' ? 'text-green-600 dark:text-green-400' :
                  summary.trend === 'declining' ? 'text-red-600 dark:text-red-400' :
                  'text-gray-900 dark:text-white'
                }`}>
                  {summary.trend === 'improving' ? '↑' : summary.trend === 'declining' ? '↓' : '→'} {summary.trend}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Peak</p>
                <p className="text-sm font-mono text-gray-900 dark:text-white">
                  {summary.peakPositiveDate || 'N/A'}
                </p>
                {summary.peakNegativeDate && (
                  <p className="text-xs font-mono text-red-500 mt-0.5">
                    Low: {summary.peakNegativeDate}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sentiment line chart */}
          <div className="border-t border-gray-200 dark:border-[#2a2a2a] pt-5">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
              Sentiment Score
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timeline} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #eee)" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#999' }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis
                  domain={[-1, 1]}
                  tick={{ fontSize: 10, fill: '#999' }}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#ccc" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="avgSentiment"
                  stroke="#111"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#111', stroke: '#111' }}
                  activeDot={{ r: 4, fill: '#111', stroke: '#fff', strokeWidth: 2 }}
                  className="dark:[&>path]:!stroke-white dark:[&>circle]:!fill-white"
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Volume area chart */}
          <div className="border-t border-gray-200 dark:border-[#2a2a2a] pt-5">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
              Volume
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timeline} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #eee)" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#999' }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: '#999' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="positiveCount" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                <Area type="monotone" dataKey="neutralCount" stackId="1" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.15} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                <Area type="monotone" dataKey="negativeCount" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400 uppercase tracking-wider">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-sm" /> Positive</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-400 rounded-sm" /> Neutral</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-sm" /> Negative</span>
            </div>
          </div>

          {/* Significant events */}
          {spikes.length > 0 && (
            <div className="border-t border-gray-200 dark:border-[#2a2a2a] pt-5">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
                Notable Shifts
              </h3>
              <div className="space-y-1.5">
                {spikes.map((spike) => (
                  <div key={spike.date} className="flex items-center gap-3 text-xs">
                    <span className="font-mono text-gray-500 dark:text-gray-400 w-20">{spike.date}</span>
                    <span className={`font-mono font-medium ${
                      spike.avgSentiment > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {spike.avgSentiment > 0 ? '+' : ''}{spike.avgSentiment.toFixed(2)}
                    </span>
                    <span className="text-gray-400">{spike.totalArticles} articles</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default SentimentTimeline;
