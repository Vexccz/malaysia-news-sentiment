import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, Brush } from 'recharts';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { Download, Layers, ZoomIn, Play, Pause, RotateCcw } from 'lucide-react';

const RANGE_OPTIONS = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
];

// Malaysian political events for annotations
const MALAYSIA_EVENTS = [
  { date: '2022-11-19', label: 'GE15', type: 'election' },
  { date: '2023-08-12', label: 'State Elections', type: 'election' },
  { date: '2024-01-01', label: 'New Year', type: 'event' },
  { date: '2024-04-10', label: 'Hari Raya', type: 'event' },
  { date: '2024-08-31', label: 'Merdeka Day', type: 'event' },
  { date: '2024-09-16', label: 'Malaysia Day', type: 'event' },
  { date: '2025-01-01', label: 'New Year', type: 'event' },
  { date: '2025-03-30', label: 'Hari Raya', type: 'event' },
  { date: '2025-08-31', label: 'Merdeka Day', type: 'event' },
  { date: '2025-09-16', label: 'Malaysia Day', type: 'event' },
];

const CustomTooltip = ({ active, payload, label, t }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="p-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-xs">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
      <div className="space-y-0.5">
        <p className="text-gray-600 dark:text-gray-300">{t('score')}: <span className="font-mono font-medium">{data?.avgSentiment?.toFixed(3)}</span></p>
        <p className="text-green-600">{t('positive')}: {data?.positiveCount}</p>
        <p className="text-red-500">{t('negative')}: {data?.negativeCount}</p>
        <p className="text-gray-500">{t('neutral')}: {data?.neutralCount}</p>
        <p className="font-medium text-gray-700 dark:text-gray-200">{t('total')}: {data?.totalArticles}</p>
      </div>
      {data?.event && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-[#333]">
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{data.event}</p>
        </div>
      )}
    </div>
  );
};

const SentimentTimeline = () => {
  const [topic, setTopic] = useState('');
  const { t, lang } = useLanguage();
  const [days, setDays] = useState(30);
  const [timeline, setTimeline] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const chartRef = useRef(null);

  // Feature 14: Animated playback through time
  const [playbackIdx, setPlaybackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5x, 1x, 2x, 4x

  // Reset playback when timeline data changes
  useEffect(() => {
    setPlaybackIdx(0);
    setIsPlaying(false);
  }, [timeline]);

  // Auto-advance playback
  useEffect(() => {
    if (!isPlaying || timeline.length === 0) return;
    const interval = setInterval(() => {
      setPlaybackIdx((prev) => {
        const next = prev + 1;
        if (next >= timeline.length) {
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, 600 / playbackSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, timeline.length, playbackSpeed]);

  const playbackPoint = useMemo(() => {
    if (!timeline.length || playbackIdx >= timeline.length) return null;
    return timeline[playbackIdx];
  }, [timeline, playbackIdx]);

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      setSearched(true);
      const { data } = await api.get('/news/sentiment-timeline', {
        params: { topic: topic.trim() || undefined, days },
      });
      // Add event annotations to timeline data
      const annotated = (data.timeline || []).map(d => {
        const event = MALAYSIA_EVENTS.find(e => e.date === d.date);
        return event ? { ...d, event: event.label, eventType: event.type } : d;
      });
      setTimeline(annotated);
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

  // Export timeline as PNG
  const handleExport = () => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = svg.clientWidth * 2;
    canvas.height = svg.clientHeight * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `timeline-${topic || 'all'}-${days}d.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Find events in timeline range
  const eventsInRange = timeline.filter(d => d.event);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-black text-ink dark:text-paper tracking-tight uppercase">
              {t('timeline')}
            </h1>
            <p className="text-[10px] text-ink-muted dark:text-ink-faint mt-1 uppercase tracking-[0.2em]">
              {t('timelineDesc')}
            </p>
          </div>
          {timeline.length > 0 && (
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider border border-paper-line dark:border-paper-dark-line text-ink-muted hover:text-ink dark:hover:text-paper transition-colors font-sans">
              <Download size={12} /> Export PNG
            </button>
          )}
        </div>
        <div className="border-b border-[#e5e5e5] dark:border-[#222] mt-2 mb-3" />
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t('topicPlaceholder')}
          className="flex-1 min-w-[200px] px-4 py-2.5 border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] text-sm text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-ink dark:focus:border-paper font-sans"
        />
        <div className="flex items-center gap-0 border border-[#e5e5e5] dark:border-[#222] p-0.5">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                days === opt.value
                  ? 'bg-ink dark:bg-paper text-paper dark:text-ink'
                  : 'text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-semibold uppercase tracking-wider bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-80 disabled:opacity-40 transition-all font-sans"
        >
          {loading ? `${t('loading')}...` : t('analyzeBtn')}
        </button>
      </form>

      {/* Toggle controls */}
      {timeline.length > 0 && (
        <div className="flex items-center gap-4">
          <button onClick={() => setShowAnnotations(!showAnnotations)}
            className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-sans px-2.5 py-1 border transition-colors ${
              showAnnotations ? 'border-ink dark:border-paper text-ink dark:text-paper' : 'border-paper-line dark:border-paper-dark-line text-ink-faint'
            }`}>
            <ZoomIn size={11} /> Events
          </button>
          <button onClick={() => setShowOverlay(!showOverlay)}
            className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-sans px-2.5 py-1 border transition-colors ${
              showOverlay ? 'border-ink dark:border-paper text-ink dark:text-paper' : 'border-paper-line dark:border-paper-dark-line text-ink-faint'
            }`}>
            <Layers size={11} /> Overlay Volume
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center">
          <div className="w-5 h-5 border-2 border-[#e5e5e5] dark:border-[#222] border-t-ink dark:border-t-paper rounded-full animate-spin mx-auto" />
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && timeline.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400">{t('noDataForTopic')}</p>
        </div>
      )}

      {/* Results */}
      {!loading && timeline.length > 0 && (
        <div className="space-y-6">
          {/* Summary stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#e5e5e5] dark:divide-[#222] border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-1 font-sans">{t('articles')}</p>
                <p className="text-xl font-bold text-ink dark:text-paper font-display">{summary.totalArticles}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-1 font-sans">{t('avgSentiment')}</p>
                <p className={`text-xl font-bold font-mono ${
                  summary.avgSentiment > 0.1 ? 'text-green-600 dark:text-green-400' :
                  summary.avgSentiment < -0.1 ? 'text-red-600 dark:text-red-400' :
                  'text-gray-900 dark:text-white'
                }`}>
                  {summary.avgSentiment > 0 ? '+' : ''}{summary.avgSentiment}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-1 font-sans">{t('trend')}</p>
                <p className={`text-xl font-bold font-display ${
                  summary.trend === 'improving' ? 'text-green-600 dark:text-green-400' :
                  summary.trend === 'declining' ? 'text-red-600 dark:text-red-400' :
                  'text-gray-900 dark:text-white'
                }`}>
                  {summary.trend === 'improving' ? '↑' : summary.trend === 'declining' ? '↓' : '→'} {summary.trend}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-1 font-sans">{t('peak')}</p>
                <p className="text-sm font-display text-ink dark:text-paper">
                  {summary.peakPositiveDate || 'N/A'}
                </p>
                {summary.peakNegativeDate && (
                  <p className="text-xs font-mono text-red-500 mt-0.5">
                    {t('low')}: {summary.peakNegativeDate}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Events in range */}
          {showAnnotations && eventsInRange.length > 0 && (
            <div className="border border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1.5 font-sans">
                Events in this period
              </p>
              <div className="flex flex-wrap gap-2">
                {eventsInRange.map(ev => (
                  <span key={ev.date} className="text-[10px] px-2 py-0.5 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-sans">
                    {ev.date} — {ev.event}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sentiment line chart with brush zoom */}
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
            <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-ink dark:text-paper uppercase tracking-wider font-sans">
                    {t('sentimentScore')}
                  </h3>
                  <p className="text-[10px] text-ink-faint mt-0.5 font-sans">
                    Drag below chart to zoom into a time range
                  </p>
                </div>

                {/* Feature 14 playback controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setPlaybackIdx(0)}
                    disabled={!timeline.length}
                    className="px-2.5 py-1.5 border border-[#e5e5e5] dark:border-[#333] text-[10px] uppercase tracking-[0.18em] text-ink-muted dark:text-ink-faint hover:text-black dark:hover:text-white disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Reset
                  </button>
                  <button
                    onClick={() => setIsPlaying((p) => !p)}
                    disabled={!timeline.length}
                    className="px-2.5 py-1.5 border border-[#e5e5e5] dark:border-[#333] text-[10px] uppercase tracking-[0.18em] text-ink-muted dark:text-ink-faint hover:text-black dark:hover:text-white disabled:opacity-40"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 inline mr-1" /> : <Play className="w-3.5 h-3.5 inline mr-1" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="px-2 py-1.5 border border-[#e5e5e5] dark:border-[#333] bg-white dark:bg-[#111] text-[10px] uppercase tracking-[0.18em] text-ink-muted dark:text-ink-faint"
                  >
                    {[0.5, 1, 2, 4].map((speed) => (
                      <option key={speed} value={speed}>{speed}x</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4" ref={chartRef}>
              {/* Feature 14 — Playback summary strip */}
              {playbackPoint && (
                <div className="mb-3 border border-[#c00000]/30 bg-[#c00000]/5 dark:bg-[#c00000]/10 px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1">
                  <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-[#c00000]">Now Playing</span>
                  <span className="font-['Playfair_Display'] text-base font-bold text-ink dark:text-paper">{playbackPoint.date}</span>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted dark:text-ink-faint">
                    Score: <span className="font-mono font-bold text-ink dark:text-paper">
                      {(playbackPoint.avgSentiment || 0).toFixed(3)}
                    </span>
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted dark:text-ink-faint">
                    Articles: <span className="font-bold text-ink dark:text-paper">{playbackPoint.totalArticles}</span>
                  </span>
                  {playbackPoint.event && (
                    <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-amber-600 dark:text-amber-400">
                      📌 {playbackPoint.event}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-ink-faint">
                    {playbackIdx + 1} / {timeline.length}
                  </span>
                </div>
              )}
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
                  <Tooltip content={<CustomTooltip t={t} />} />
                  <ReferenceLine y={0} stroke="#ccc" strokeDasharray="3 3" />
                  {/* Feature 14 — Playback scrubber line */}
                  {playbackPoint && (
                    <>
                      <ReferenceLine
                        x={playbackPoint.date}
                        stroke="#c00000"
                        strokeWidth={2}
                        ifOverflow="visible"
                        label={{
                          value: `▶ ${playbackPoint.date}`,
                          position: 'top',
                          fontSize: 10,
                          fontWeight: 700,
                          fill: '#c00000',
                        }}
                      />
                      <ReferenceDot
                        x={playbackPoint.date}
                        y={playbackPoint.avgSentiment}
                        r={6}
                        fill="#c00000"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    </>
                  )}
                  {/* Event reference lines */}
                  {showAnnotations && eventsInRange.map(ev => (
                    <ReferenceLine key={ev.date} x={ev.date} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1}
                      label={{ value: ev.event, position: 'top', fontSize: 9, fill: '#F59E0B' }} />
                  ))}
                  {showOverlay && (
                    <Area type="monotone" dataKey="totalArticles" stroke="none" fill="#6366F1" fillOpacity={0.08} yAxisId={0} />
                  )}
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
                  <Brush dataKey="date" height={26} stroke="#999" fill="#fafafa" travellerWidth={8}
                    tickFormatter={(d) => d.slice(5)} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Volume area chart */}
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
            <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#222]">
              <h3 className="text-xs font-bold text-ink dark:text-paper uppercase tracking-wider font-sans">
                {t('volume')}
              </h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={timeline} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #eee)" opacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#999' }}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#999' }} />
                  <Tooltip content={<CustomTooltip t={t} />} />
                  <Area type="monotone" dataKey="positiveCount" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} isAnimationActive animationDuration={1500} />
                  <Area type="monotone" dataKey="neutralCount" stackId="1" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.15} isAnimationActive animationDuration={1500} />
                  <Area type="monotone" dataKey="negativeCount" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} isAnimationActive animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 px-4 pb-4 text-[10px] text-ink-muted uppercase tracking-wider font-sans">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-sm" /> {t('positive')}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-400 rounded-sm" /> {t('neutral')}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-sm" /> {t('negative')}</span>
            </div>
          </div>

          {/* Significant events */}
          {spikes.length > 0 && (
            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-5">
              <h3 className="text-xs font-bold text-ink dark:text-paper uppercase tracking-wider mb-3 font-sans">
                {t('notableShifts')}
              </h3>
              <div className="space-y-1.5">
                {spikes.map((spike) => (
                  <div key={spike.date} className="flex items-center gap-3 text-xs">
                    <span className="font-sans text-ink-muted dark:text-ink-faint w-20">{spike.date}</span>
                    <span className={`font-sans font-medium ${
                      spike.avgSentiment > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {spike.avgSentiment > 0 ? '+' : ''}{spike.avgSentiment.toFixed(2)}
                    </span>
                    <span className="text-ink-faint">{spike.totalArticles} {t('articles')}</span>
                    {spike.event && (
                      <span className="text-[9px] px-1.5 py-0.5 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        {spike.event}
                      </span>
                    )}
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
