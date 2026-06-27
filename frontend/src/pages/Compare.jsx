import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const COLORS = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

const Compare = () => {
  const [topics, setTopics] = useState(['', '']);
  const { t, lang } = useLanguage();
  const [days, setDays] = useState(30);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // N — Article comparison mode
  const navigate = useNavigate();
  const [mode, setMode] = useState('topics'); // 'topics' | 'articles'
  const [articleIds, setArticleIds] = useState(['', '']);
  const [articleResults, setArticleResults] = useState(null);
  const [articleLoading, setArticleLoading] = useState(false);

  const addArticle = () => {
    if (articleIds.length >= 3) return;
    setArticleIds([...articleIds, '']);
  };

  const removeArticle = (idx) => {
    if (articleIds.length <= 2) return;
    setArticleIds(articleIds.filter((_, i) => i !== idx));
  };

  const updateArticle = (idx, val) => {
    const next = [...articleIds];
    next[idx] = val;
    setArticleIds(next);
  };

  // Extract Mongo ObjectId from full /article/:id URL or plain ID
  const normalizeId = (raw) => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return null;
    const match = trimmed.match(/\/article\/([a-f0-9]{24})/i) || trimmed.match(/([a-f0-9]{24})/i);
    return match ? match[1] : null;
  };

  const handleCompareArticles = async () => {
    const ids = articleIds.map(normalizeId).filter(Boolean);
    if (ids.length < 2) {
      toast.error('Enter at least 2 valid article IDs or URLs');
      return;
    }
    setArticleLoading(true);
    try {
      const results = await Promise.allSettled(
        ids.map(id => api.get(`/history/${id}`))
      );
      const fetched = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value.data?.article || r.value.data)
        .filter(Boolean);
      if (fetched.length < 2) {
        toast.error('Could not fetch at least 2 articles. Check the IDs and try again.');
        setArticleLoading(false);
        return;
      }
      setArticleResults(fetched);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Article comparison failed');
    } finally {
      setArticleLoading(false);
    }
  };

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
        <h1 className="font-['Playfair_Display'] text-2xl font-black text-ink dark:text-paper tracking-tight uppercase">
          Comparative Analysis
        </h1>
        <p className="text-[10px] text-ink-muted dark:text-ink-faint mt-1 uppercase tracking-[0.2em]">
          Compare sentiment across multiple topics or articles
        </p>
        <div className="border-b border-[#e5e5e5] dark:border-[#222] mt-2 mb-3" />
      </div>

      {/* Mode tabs (N) */}
      <div className="flex items-center gap-1 mb-4 border-b border-[#e5e5e5] dark:border-[#222]">
        {[
          { id: 'topics', label: 'By Topic' },
          { id: 'articles', label: 'By Article' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] border-b-2 transition-colors ${
              mode === tab.id
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TOPIC MODE */}
      {mode === 'topics' && (
      <>
      {/* Input Section */}
      <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] mb-6">
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
        <div className="px-5 py-3 border-t border-paper-line dark:border-paper-dark-line flex flex-wrap items-center gap-3">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Radar Chart */}
            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
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
                        isAnimationActive={true}
                        animationDuration={1500}
                        animationEasing="ease-out"
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
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
                    <Bar dataKey="Positive" fill="#10b981" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                    <Bar dataKey="Neutral" fill="#f59e0b" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                    <Bar dataKey="Negative" fill="#ef4444" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Stats Table */}
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
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
        <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] text-center py-16">
          <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">
            Enter at least 2 topics above and click Compare to see results.
          </p>
        </div>
      )}
      </>
      )}

      {/* ARTICLE MODE (N) */}
      {mode === 'articles' && (
        <>
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] mb-6">
            <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
              <h2 className="text-xs font-semibold text-ink-muted dark:text-ink-faint uppercase tracking-widest font-sans">
                Articles to Compare
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {articleIds.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-2 h-2 shrink-0" style={{ backgroundColor: COLORS[idx] }} />
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => updateArticle(idx, e.target.value)}
                    placeholder={`Article ${idx + 1} URL or 24-char ID`}
                    className="flex-1 px-3 py-2 border border-paper-line dark:border-paper-dark-line bg-white dark:bg-white/5 text-sm text-ink dark:text-paper placeholder-ink-faint focus:outline-none focus:border-ink dark:focus:border-paper font-sans"
                    onKeyDown={(e) => e.key === 'Enter' && handleCompareArticles()}
                  />
                  {articleIds.length > 2 && (
                    <button onClick={() => removeArticle(idx)} className="p-2 text-ink-faint hover:text-red-600 transition-colors">×</button>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-paper-line dark:border-paper-dark-line flex flex-wrap items-center gap-3">
              {articleIds.length < 3 && (
                <button
                  onClick={addArticle}
                  className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-ink-muted dark:text-ink-faint border border-paper-line dark:border-paper-dark-line hover:text-ink dark:hover:text-paper transition-colors font-sans"
                >
                  + Add Article
                </button>
              )}
              <button
                onClick={handleCompareArticles}
                disabled={articleLoading}
                className="ml-auto px-5 py-2 bg-ink dark:bg-paper text-paper dark:text-ink text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity disabled:opacity-40 font-sans"
              >
                {articleLoading ? 'Loading...' : 'Compare Articles'}
              </button>
            </div>
          </div>

          {articleResults && articleResults.length >= 2 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {articleResults.map((art, idx) => {
                const confidence = Math.round((art.confidence || 0) * 100);
                const sentimentColor = art.sentiment === 'Positive'
                  ? 'text-emerald-700 dark:text-emerald-400 border-emerald-600'
                  : art.sentiment === 'Negative'
                  ? 'text-red-700 dark:text-red-400 border-red-600'
                  : 'text-amber-700 dark:text-amber-400 border-amber-600';
                return (
                  <div key={art._id || idx} className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
                    <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block w-2 h-2" style={{ backgroundColor: COLORS[idx] }} />
                        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-muted dark:text-ink-faint font-sans">Article {idx + 1}</span>
                      </div>
                      <h3 className="font-display text-lg font-bold text-ink dark:text-paper leading-tight">{art.title}</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
                        <span className={`px-2 py-1 border ${sentimentColor}`}>{art.sentiment || 'Neutral'}</span>
                        <span className="text-ink-muted dark:text-ink-faint">{confidence}% confidence</span>
                        <span className="text-ink-muted dark:text-ink-faint">{typeof art.source === 'string' ? art.source : (art.source?.name || art.source?.source || 'Unknown source')}</span>
                      </div>
                      {art.reason && (
                        <div className="border-l-2 border-[#e5e5e5] dark:border-[#333] pl-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-faint font-sans mb-1">Sentiment reason</p>
                          <p className="text-sm text-ink-muted dark:text-ink-faint font-sans leading-6">{art.reason}</p>
                        </div>
                      )}
                      {art.description && (
                        <p className="text-sm text-ink-muted dark:text-ink-faint font-sans leading-6">{art.description}</p>
                      )}
                      <div className="flex items-center gap-2 pt-2 border-t border-paper-line dark:border-paper-dark-line">
                        <button
                          onClick={() => navigate(`/article/${art._id || art.id}`)}
                          className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider border border-paper-line dark:border-paper-dark-line hover:text-ink dark:hover:text-paper transition-colors font-sans"
                        >
                          Open Article
                        </button>
                        {art.url && (
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider border border-paper-line dark:border-paper-dark-line hover:text-ink dark:hover:text-paper transition-colors font-sans"
                          >
                            Source Link
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !articleLoading && (
            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] text-center py-16">
              <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">
                Paste 2 or 3 article URLs/IDs above and click Compare Articles.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Compare;
