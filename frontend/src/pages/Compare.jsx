import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import toast from 'react-hot-toast';
import api from '../services/api';

const COLORS = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

const Compare = () => {
  const [topics, setTopics] = useState(['', '']);
  const [days, setDays] = useState(30);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const addTopic = () => {
    if (topics.length >= 5) return;
    setTopics([...topics, '']);
  };

  const removeTopic = (idx) => {
    if (topics.length <= 2) return;
    setTopics(topics.filter((_, i) => i !== idx));
  };

  const updateTopic = (idx, val) => {
    const updated = [...topics];
    updated[idx] = val;
    setTopics(updated);
  };

  const handleCompare = async () => {
    const validTopics = topics.filter(t => t.trim());
    if (validTopics.length < 2) {
      toast.error('Enter at least 2 topics to compare');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/news/compare', { topics: validTopics, days });
      setResults(data.comparison);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const radarData = results ? [
    { dimension: 'Positive %', ...Object.fromEntries(results.map(r => [r.topic, r.positivePercent])) },
    { dimension: 'Negative %', ...Object.fromEntries(results.map(r => [r.topic, r.negativePercent])) },
    { dimension: 'Neutral %', ...Object.fromEntries(results.map(r => [r.topic, r.neutralPercent])) },
    { dimension: 'Articles', ...Object.fromEntries(results.map(r => [r.topic, Math.min(r.articleCount, 100)])) },
    { dimension: 'Avg Score', ...Object.fromEntries(results.map(r => [r.topic, Math.round(r.avgSentiment * 100)])) },
  ] : [];

  const barData = results ? results.map(r => ({
    topic: r.topic,
    Positive: r.positivePercent,
    Negative: r.negativePercent,
    Neutral: r.neutralPercent,
  })) : [];

  const winner = results ? results.reduce((best, r) => r.positivePercent > best.positivePercent ? r : best, results[0]) : null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink dark:text-paper tracking-tight">
          Comparative Analysis
        </h1>
        <p className="text-sm text-ink-muted dark:text-ink-faint mt-1 font-sans">
          Compare sentiment across multiple topics
        </p>
      </div>

      {/* Input Section */}
      <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card mb-6">
        <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
          <h2 className="text-xs font-semibold text-ink-muted dark:text-ink-faint uppercase tracking-widest font-sans">
            Topics to Compare
          </h2>
        </div>
        <div className="p-5 space-y-3">
          {topics.map((topic, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-2 h-2 shrink-0" style={{ backgroundColor: COLORS[idx] }} />
              <input
                type="text"
                value={topic}
                onChange={(e) => updateTopic(idx, e.target.value)}
                placeholder={`Topic ${idx + 1} (e.g. economy, politics)`}
                className="flex-1 px-3 py-2 border border-paper-line dark:border-paper-dark-line bg-white dark:bg-white/5 text-sm text-ink dark:text-paper placeholder-ink-faint focus:outline-none focus:border-ink dark:focus:border-paper font-sans"
                onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
              />
              {topics.length > 2 && (
                <button
                  onClick={() => removeTopic(idx)}
                  className="p-2 text-ink-faint hover:text-red-600 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-paper-line dark:border-paper-dark-line flex items-center gap-3">
          {topics.length < 5 && (
            <button
              onClick={addTopic}
              className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-ink-muted dark:text-ink-faint border border-paper-line dark:border-paper-dark-line hover:text-ink dark:hover:text-paper transition-colors font-sans"
            >
              + Add Topic
            </button>
          )}
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-1.5 border border-paper-line dark:border-paper-dark-line bg-white dark:bg-white/5 text-xs text-ink dark:text-paper focus:outline-none font-sans"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={handleCompare}
            disabled={loading}
            className="ml-auto px-5 py-2 bg-ink dark:bg-paper text-paper dark:text-ink text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity disabled:opacity-40 font-sans flex items-center gap-2"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-paper dark:border-ink border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="M4 12h16"/>
              </svg>
            )}
            Compare
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Winner Banner */}
          {winner && winner.articleCount > 0 && (
            <div className="border-l-4 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-5 py-4">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-sans mb-1">
                Most Positive Topic
              </p>
              <p className="text-lg font-bold text-emerald-900 dark:text-emerald-200 font-display">
                {winner.topic} &mdash; {winner.positivePercent}% positive
              </p>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
              <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
                <h3 className="text-xs font-semibold text-ink-muted dark:text-ink-faint uppercase tracking-widest font-sans">
                  Multi-Dimension Comparison
                </h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <PolarRadiusAxis tick={{ fontSize: 10 }} />
                    {results.map((r, i) => (
                      <Radar
                        key={r.topic}
                        name={r.topic}
                        dataKey={r.topic}
                        stroke={COLORS[i]}
                        fill={COLORS[i]}
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
              <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
                <h3 className="text-xs font-semibold text-ink-muted dark:text-ink-faint uppercase tracking-widest font-sans">
                  Sentiment Distribution
                </h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="topic" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: 0, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Positive" fill="#10b981" />
                    <Bar dataKey="Neutral" fill="#f59e0b" />
                    <Bar dataKey="Negative" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Stats Table */}
          <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
            <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
              <h3 className="text-xs font-semibold text-ink-muted dark:text-ink-faint uppercase tracking-widest font-sans">
                Detailed Statistics
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-paper-line dark:border-paper-dark-line">
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-ink-muted dark:text-ink-faint uppercase tracking-widest font-sans">Topic</th>
                    <th className="text-center px-3 py-3 text-[10px] font-semibold text-ink-muted dark:text-ink-faint uppercase tracking-widest font-sans">Articles</th>
                    <th className="text-center px-3 py-3 text-[10px] font-semibold text-ink-muted dark:text-ink-faint uppercase tracking-widest font-sans">Avg Score</th>
                    <th className="text-center px-3 py-3 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest font-sans">Positive</th>
                    <th className="text-center px-3 py-3 text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest font-sans">Neutral</th>
                    <th className="text-center px-3 py-3 text-[10px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-widest font-sans">Negative</th>
                    <th className="text-center px-3 py-3 text-[10px] font-semibold text-ink-muted dark:text-ink-faint uppercase tracking-widest font-sans">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.topic} className="border-b border-paper-line dark:border-paper-dark-line last:border-0">
                      <td className="px-5 py-3 font-semibold text-ink dark:text-paper font-sans">
                        <span className="inline-block w-2 h-2 mr-2" style={{ backgroundColor: COLORS[i] }} />
                        {r.topic}
                      </td>
                      <td className="text-center px-3 py-3 text-ink-muted dark:text-ink-faint font-sans">{r.articleCount}</td>
                      <td className="text-center px-3 py-3 text-ink-muted dark:text-ink-faint font-sans">{r.avgSentiment}</td>
                      <td className="text-center px-3 py-3 text-emerald-700 dark:text-emerald-400 font-semibold font-sans">{r.positivePercent}%</td>
                      <td className="text-center px-3 py-3 text-amber-700 dark:text-amber-400 font-semibold font-sans">{r.neutralPercent}%</td>
                      <td className="text-center px-3 py-3 text-red-700 dark:text-red-400 font-semibold font-sans">{r.negativePercent}%</td>
                      <td className="text-center px-3 py-3">
                        <span className={`text-xs font-semibold uppercase tracking-wider font-sans ${
                          r.trend === 'improving' ? 'text-emerald-700 dark:text-emerald-400' :
                          r.trend === 'declining' ? 'text-red-700 dark:text-red-400' :
                          'text-ink-muted dark:text-ink-faint'
                        }`}>
                          {r.trend === 'improving' ? '\u2191' : r.trend === 'declining' ? '\u2193' : '\u2192'} {r.trend}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!results && !loading && (
        <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card text-center py-16">
          <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">
            Enter at least 2 topics above and click Compare to see results.
          </p>
        </div>
      )}
    </div>
  );
};

export default Compare;
