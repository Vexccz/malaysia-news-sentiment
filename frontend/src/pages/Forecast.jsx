import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Legend, ReferenceLine } from 'recharts';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { Download, Sliders, Target, TrendingUp } from 'lucide-react';

const Forecast = () => {
  const [topic, setTopic] = useState('');
  const { t, lang } = useLanguage();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [whatIfShift, setWhatIfShift] = useState(0);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [forecastHistory, setForecastHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('forecast_history') || '[]'); } catch { return []; }
  });

  const fetchForecast = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/forecast/${encodeURIComponent(topic.trim())}?days=${days}`);
      setData(res.data);
      // Save to forecast history for accuracy tracking
      const entry = {
        topic: topic.trim(), days, date: new Date().toISOString(),
        trend: res.data.trend, confidence: res.data.predicted[0]?.confidence,
        predictedValues: res.data.predicted.map(p => p.predictedSentiment)
      };
      setForecastHistory(prev => {
        const next = [entry, ...prev].slice(0, 20);
        localStorage.setItem('forecast_history', JSON.stringify(next));
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  }, [topic, days]);

  const handleSubmit = (e) => { e.preventDefault(); fetchForecast(); };

  // Combine historical + predicted for chart
  const chartData = useMemo(() => {
    if (!data) return [];
    const historical = data.historical.map(h => ({
      date: h.date, sentiment: h.sentiment, type: 'historical',
    }));
    const predicted = data.predicted.map(p => {
      const shifted = whatIfShift !== 0 ? p.predictedSentiment + whatIfShift : p.predictedSentiment;
      return {
        date: p.date, predicted: shifted,
        confidenceUpper: Math.min(1, shifted + (1 - p.confidence) * 0.5),
        confidenceLower: Math.max(-1, shifted - (1 - p.confidence) * 0.5),
        confidence: p.confidence,
        type: 'predicted',
        ...(showWhatIf && { whatIf: shifted }),
      };
    });
    return [...historical, ...predicted];
  }, [data, whatIfShift, showWhatIf]);

  const trendColor = data?.trend === 'Improving' ? '#16a34a' : data?.trend === 'Declining' ? '#dc2626' : '#ca8a04';
  const trendLabel = data?.trend === 'Improving' ? 'Upward' : data?.trend === 'Declining' ? 'Downward' : 'Stable';

  // Average confidence
  const avgConfidence = data?.predicted?.length
    ? Math.round(data.predicted.reduce((s, p) => s + p.confidence, 0) / data.predicted.length * 100)
    : 0;

  // Export forecast as CSV
  const handleExport = () => {
    if (!data) return;
    const rows = [['Date', 'Type', 'Sentiment', 'Confidence Upper', 'Confidence Lower']];
    data.historical.forEach(h => rows.push([h.date, 'historical', h.sentiment, '', '']));
    data.predicted.forEach(p => rows.push([p.date, 'predicted', p.predictedSentiment,
      Math.min(1, p.predictedSentiment + (1 - p.confidence) * 0.5),
      Math.max(-1, p.predictedSentiment - (1 - p.confidence) * 0.5)]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `forecast-${topic}-${days}d.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-black text-ink dark:text-paper tracking-tight uppercase">
              Sentiment Forecast
            </h1>
            <p className="text-[10px] text-ink-muted dark:text-ink-faint mt-1 uppercase tracking-[0.2em]">AI-Powered Predictions</p>
          </div>
          {data && (
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider border border-paper-line dark:border-paper-dark-line text-ink-muted hover:text-ink dark:hover:text-paper transition-colors font-sans">
              <Download size={12} /> Export CSV
            </button>
          )}
        </div>
        <div className="border-b border-[#e5e5e5] dark:border-[#222] mt-2 mb-3" />
        <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed max-w-xl font-sans">
          Predict future sentiment trends from historical news analysis across Malaysian media sources.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
          <div className="border-l-3 border-accent px-5 py-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-faint mb-2 font-sans">Topic</label>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. economy, politics, education"
                  className="w-full px-3 py-2.5 border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper text-sm font-sans focus:outline-none focus:border-accent transition-colors placeholder:text-ink-faint" />
              </div>
              <div className="w-full sm:w-36">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-faint mb-2 font-sans">Forecast Window</label>
                <select value={days} onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-paper-line dark:border-paper-dark-line bg-paper dark:bg-paper-dark text-ink dark:text-paper text-sm font-sans focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer">
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={loading || !topic.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-ink dark:bg-paper text-paper dark:text-ink text-sm font-semibold uppercase tracking-wider hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-sans">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-3.5 h-3.5 border-2 border-paper/30 border-t-paper dark:border-ink/30 dark:border-t-ink rounded-full animate-spin" />
                      Forecasting
                    </span>
                  ) : t('generate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-6 border-l-3 border-red-600 bg-red-50 dark:bg-red-950/30 px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-400 font-sans">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {data && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Summary strip */}
            <div className="grid grid-cols-4 divide-x divide-[#e5e5e5] dark:divide-[#222] border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
              <div className="px-5 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-1 font-sans">Expected Trend</div>
                <div className="text-lg font-bold font-display" style={{ color: trendColor }}>{trendLabel}</div>
                <div className="text-[10px] text-ink-faint font-sans mt-0.5">
                  {data.trend === 'Improving' ? 'Sentiment rising' : data.trend === 'Declining' ? 'Sentiment falling' : 'Holding steady'}
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-1 font-sans">Articles Analyzed</div>
                <div className="text-lg font-bold text-ink dark:text-paper font-display">{data.totalArticles}</div>
                <div className="text-[10px] text-ink-faint font-sans mt-0.5">from past {data.daysAnalyzed} days</div>
              </div>
              <div className="px-5 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-1 font-sans">Confidence</div>
                <div className="text-lg font-bold text-ink dark:text-paper font-display">{avgConfidence}%</div>
                <div className="text-[10px] text-ink-faint font-sans mt-0.5">
                  {avgConfidence >= 70 ? 'High certainty' : avgConfidence >= 40 ? 'Moderate' : 'Low certainty'}
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-1 font-sans">Forecast Range</div>
                <div className="text-lg font-bold text-ink dark:text-paper font-display">{data.predicted.length} days</div>
                <div className="text-[10px] text-ink-faint font-sans mt-0.5">
                  ±{data.predicted.length > 0 ? Math.round((1 - data.predicted[0].confidence) * 50) : 0}% uncertainty
                </div>
              </div>
            </div>

            {/* What-if controls */}
            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-4">
              <div className="flex items-center gap-4 mb-3">
                <button onClick={() => setShowWhatIf(!showWhatIf)}
                  className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-sans px-2.5 py-1 border transition-colors ${
                    showWhatIf ? 'border-ink dark:border-paper text-ink dark:text-paper' : 'border-paper-line dark:border-paper-dark-line text-ink-faint'
                  }`}>
                  <Sliders size={11} /> What-If Scenario
                </button>
                {showWhatIf && (
                  <div className="flex items-center gap-3 flex-1">
                    <label className="text-[10px] uppercase tracking-wider text-ink-muted font-sans">Shift:</label>
                    <input type="range" min={-0.5} max={0.5} step={0.05} value={whatIfShift}
                      onChange={(e) => setWhatIfShift(Number(e.target.value))}
                      className="flex-1 accent-accent" />
                    <span className="text-xs font-mono text-ink dark:text-paper w-12 text-right">
                      {whatIfShift > 0 ? '+' : ''}{whatIfShift.toFixed(2)}
                    </span>
                    <button onClick={() => setWhatIfShift(0)}
                      className="text-[9px] uppercase tracking-wider text-ink-faint hover:text-ink transition-colors font-sans">
                      Reset
                    </button>
                  </div>
                )}
              </div>
              {showWhatIf && (
                <p className="text-[10px] text-ink-faint font-sans">
                  Simulate external events: drag the slider to shift the predicted sentiment by a fixed amount.
                  {whatIfShift > 0.1 && ' Positive shift — e.g. good economic news, policy announcement.'}
                  {whatIfShift < -0.1 && ' Negative shift — e.g. scandal, natural disaster, market crash.'}
                </p>
              )}
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
                <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
                  <h3 className="text-sm font-semibold text-ink dark:text-paper uppercase tracking-wider font-sans">Forecast Projection</h3>
                  <p className="text-xs text-ink-faint mt-0.5 font-sans">
                    Solid line = actual sentiment &nbsp;&middot;&nbsp; Dashed line = AI prediction
                    {showWhatIf && whatIfShift !== 0 && <span className="text-amber-600 dark:text-amber-400"> &nbsp;&middot;&nbsp; Orange = what-if scenario</span>}
                  </p>
                </div>
                <div className="px-4 py-4">
                  <div className="flex items-center justify-center gap-1 mb-3 text-[10px] font-sans text-ink-faint">
                    <span className="inline-block w-3 h-0.5 bg-red-500" /><span>Negative</span>
                    <span className="mx-1.5">|</span>
                    <span className="inline-block w-3 h-0.5 bg-gray-400" /><span>Neutral</span>
                    <span className="mx-1.5">|</span>
                    <span className="inline-block w-3 h-0.5 bg-green-600" /><span>Positive</span>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#E8E4DB" opacity={0.5} />
                        <Area type="monotone" dataKey={() => 1} stroke="none" fill="#16a34a" fillOpacity={0.03} />
                        <Area type="monotone" dataKey={() => -1} stroke="none" fill="#dc2626" fillOpacity={0.03} />
                        <Line type="monotone" dataKey={() => 0} stroke="#E8E4DB" strokeDasharray="4 4" strokeWidth={1} dot={false} name="" legendType="none" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A8A59E', fontFamily: 'Inter' }}
                          tickFormatter={(val) => { const d = new Date(val); return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }); }}
                          axisLine={{ stroke: '#E8E4DB' }} tickLine={false} />
                        <YAxis domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]}
                          tick={{ fontSize: 10, fill: '#A8A59E', fontFamily: 'Inter' }}
                          tickFormatter={(val) => { if (val === 1) return 'Positive'; if (val === 0.5) return '+'; if (val === 0) return 'Neutral'; if (val === -0.5) return '−'; if (val === -1) return 'Negative'; return ''; }}
                          axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E8E4DB', borderRadius: '0', fontSize: '11px', fontFamily: 'Inter', boxShadow: 'none' }}
                          formatter={(value, name) => {
                            const sentimentLabel = (v) => { if (v >= 0.6) return 'Very Positive'; if (v >= 0.2) return 'Positive'; if (v >= -0.2) return 'Neutral'; if (v >= -0.6) return 'Negative'; return 'Very Negative'; };
                            const label = name === 'sentiment' ? 'Actual' : name === 'predicted' ? 'Predicted' : name === 'whatIf' ? 'What-If' : name;
                            return [`${sentimentLabel(value)} (${value?.toFixed(2)})`, label];
                          }}
                          labelFormatter={(val) => { const d = new Date(val); return d.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' }); }} />
                        <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter' }} />
                        <Area type="monotone" dataKey="confidenceUpper" stroke="none" fill="#dc2626" fillOpacity={0.06} name="Confidence Band" isAnimationActive animationDuration={1500} />
                        <Area type="monotone" dataKey="confidenceLower" stroke="none" fill="#ffffff" fillOpacity={1} name=" " legendType="none" isAnimationActive animationDuration={1500} />
                        <Line type="monotone" dataKey="sentiment" stroke="#1A1A1A" strokeWidth={2} dot={{ r: 2, fill: '#1A1A1A' }} name="Actual Sentiment" connectNulls={false} isAnimationActive animationDuration={1500} />
                        <Line type="monotone" dataKey="predicted" stroke="#dc2626" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2.5, fill: '#dc2626' }} name="AI Prediction" connectNulls={false} isAnimationActive animationDuration={1500} />
                        {showWhatIf && whatIfShift !== 0 && (
                          <Line type="monotone" dataKey="whatIf" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2, fill: '#F59E0B' }} name="What-If Scenario" connectNulls={false} isAnimationActive animationDuration={800} />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* AI Insight */}
            {data.aiInsight && (
              <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
                <div className="border-l-3 border-accent px-5 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-2 font-sans">Analysis</div>
                  <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">{data.aiInsight}</p>
                </div>
              </div>
            )}

            {/* Forecast accuracy history */}
            {forecastHistory.length > 1 && (
              <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} className="text-ink-muted" />
                  <h3 className="text-xs font-bold text-ink dark:text-paper uppercase tracking-wider font-sans">Forecast History</h3>
                </div>
                <div className="space-y-1.5">
                  {forecastHistory.slice(0, 5).map((entry, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="text-ink-faint font-mono w-20">{entry.date.split('T')[0]}</span>
                      <span className="text-ink dark:text-paper font-sans font-medium">{entry.topic}</span>
                      <span className="text-ink-faint">{entry.days}d</span>
                      <span className="font-mono" style={{ color: entry.trend === 'Improving' ? '#16a34a' : entry.trend === 'Declining' ? '#dc2626' : '#ca8a04' }}>
                        {entry.trend}
                      </span>
                      <span className="text-ink-faint ml-auto">{Math.round(entry.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="text-center py-20 border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
          <div className="text-4xl mb-4 opacity-20">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-ink-muted dark:text-ink-faint">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-ink dark:text-paper mb-1.5 font-display">No forecast generated</h3>
          <p className="text-xs text-ink-faint max-w-sm mx-auto font-sans leading-relaxed">
            Enter a topic above to analyse historical sentiment and project future trends from Malaysian news sources.
          </p>
        </div>
      )}
    </div>
  );
};

export default Forecast;
