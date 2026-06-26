import React, { useState, useEffect, useMemo } from 'react';
import ExportMenu from '../components/ExportMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { getTopViewed, getTrends } from '../services/api';
import ArticleCard from '../components/ArticleCard';
import ArticlePreviewModal from '../components/ArticlePreviewModal';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { TrendingUp, TrendingDown, Minus, ArrowLeft, GitCompare } from 'lucide-react';

const SPARKLINE_COLORS = ['#10B981', '#EF4444', '#F59E0B', '#6366F1', '#06B6D4'];

const Trending = () => {
  const [articles, setArticles] = useState([]);
  const { t, lang } = useLanguage();
  const [timeframe, setTimeframe] = useState('today');
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [trendData, setTrendData] = useState({});
  const [compareMode, setCompareMode] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const [drillTopic, setDrillTopic] = useState(null);
  const [drillArticles, setDrillArticles] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    const loadTrending = async () => {
      setLoading(true);
      try {
        const data = await getTopViewed({ timeframe });
        setArticles(data);
        // Extract topic sparkline data from articles
        const topicMap = {};
        data.forEach(art => {
          const topic = art.topic || art.categories?.[0] || 'General';
          if (!topicMap[topic]) topicMap[topic] = [];
          topicMap[topic].push(art);
        });
        // Generate sparkline data per topic
        const sparks = {};
        Object.entries(topicMap).forEach(([topic, arts]) => {
          const byDay = {};
          arts.forEach(a => {
            const d = new Date(a.publishedAt || a.createdAt).toLocaleDateString('en', { weekday: 'short' });
            if (!byDay[d]) byDay[d] = { positive: 0, negative: 0, neutral: 0 };
            const s = a.sentiment?.label || 'Neutral';
            byDay[d][s.toLowerCase()]++;
          });
          sparks[topic] = Object.entries(byDay).map(([day, counts]) => ({
            day, ...counts, total: counts.positive + counts.negative + counts.neutral
          }));
        });
        setTrendData(sparks);
      } catch {
        toast.error('Failed to load trending news');
      } finally {
        setLoading(false);
      }
    };
    loadTrending();
  }, [timeframe]);

  // Velocity: compare last 2 segments of sparkline
  const getVelocity = (topic) => {
    const data = trendData[topic];
    if (!data || data.length < 2) return { dir: 'stable', pct: 0 };
    const recent = data.slice(-1)[0]?.total || 0;
    const prev = data.slice(-2, -1)[0]?.total || 0;
    if (prev === 0) return { dir: 'stable', pct: 0 };
    const pct = Math.round(((recent - prev) / prev) * 100);
    if (pct > 10) return { dir: 'up', pct };
    if (pct < -10) return { dir: 'down', pct };
    return { dir: 'stable', pct };
  };

  // Unique topics from articles
  const topics = useMemo(() => {
    const map = {};
    articles.forEach(art => {
      const topic = art.topic || art.categories?.[0] || 'General';
      if (!map[topic]) map[topic] = { count: 0, articles: [] };
      map[topic].count++;
      map[topic].articles.push(art);
    });
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
  }, [articles]);

  // Compare selected topics
  useEffect(() => {
    if (selectedTopics.length < 2) { setCompareData(null); return; }
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const merged = days.map(day => {
      const entry = { day };
      selectedTopics.forEach((topic, i) => {
        const d = trendData[topic]?.find(x => x.day === day);
        entry[topic] = d?.total || 0;
      });
      return entry;
    });
    setCompareData(merged);
  }, [selectedTopics, trendData]);

  // Drill-down: fetch articles for a topic
  const handleDrillDown = async (topic) => {
    setDrillTopic(topic);
    setDrillLoading(true);
    try {
      const topicArticles = articles.filter(art => (art.topic || art.categories?.[0] || 'General') === topic);
      setDrillArticles(topicArticles);
    } catch {
      toast.error('Failed to load articles');
    } finally {
      setDrillLoading(false);
    }
  };

  const toggleCompareTopic = (topic) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic)
        : prev.length < 4 ? [...prev, topic] : prev
    );
  };

  const VelocityIcon = ({ dir }) => {
    if (dir === 'up') return <TrendingUp size={12} className="text-emerald-500" />;
    if (dir === 'down') return <TrendingDown size={12} className="text-red-500" />;
    return <Minus size={12} className="text-slate-400" />;
  };

  // Drill-down view
  if (drillTopic) {
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={() => { setDrillTopic(null); setDrillArticles([]); }}
          className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-muted hover:text-ink dark:text-ink-faint dark:hover:text-paper mb-4 font-sans">
          <ArrowLeft size={14} /> {t('back') || 'Back to Trending'}
        </button>
        <h2 className="text-2xl font-bold text-ink dark:text-paper tracking-tight font-display mb-1">{drillTopic}</h2>
        <div className="editorial-rule mb-4" />
        <p className="text-[10px] uppercase tracking-[0.25em] text-ink-muted dark:text-ink-faint mb-4 font-sans">
          {drillArticles.length} {t('articles') || 'articles'} found
        </p>
        {drillLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse bg-gray-100 dark:bg-gray-800 border border-paper-line dark:border-paper-dark-line" />
            ))}
          </div>
        ) : (
          <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card divide-y divide-paper-line dark:divide-paper-dark-line">
            {drillArticles.map(art => (
              <div key={art._id} className="px-4 py-3">
                <ArticleCard article={art} onPreview={setSelectedArticle} />
              </div>
            ))}
          </div>
        )}
        <ArticlePreviewModal article={selectedArticle} isOpen={!!selectedArticle} onClose={() => setSelectedArticle(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-baseline gap-3 mb-1">
            <h1 className="text-3xl font-bold text-ink dark:text-paper tracking-tight font-display">
              {t('trending') || 'Trending News'}
            </h1>
          </div>
          <div className="editorial-rule mb-2" />
          <p className="text-[10px] text-ink-muted dark:text-ink-faint uppercase tracking-[0.25em] font-sans">
            {t('trendingSubtitle') || 'Most-read stories across Malaysian media, ranked by reader engagement.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportMenu articles={articles} filenameBase="trending-news" label="Export" />
          <button
            onClick={() => { setCompareMode(!compareMode); setSelectedTopics([]); }}
            className={`flex items-center gap-1.5 text-xs uppercase tracking-wider font-sans px-3 py-1.5 border transition-colors ${
              compareMode
                ? 'border-ink dark:border-paper bg-ink dark:bg-paper text-paper dark:text-ink'
                : 'border-paper-line dark:border-paper-dark-line text-ink-muted hover:text-ink dark:hover:text-paper'
            }`}
          >
            <GitCompare size={12} /> {t('compare') || 'Compare'}
          </button>
          <div className="flex items-center gap-0">
            {[{ value: 'today', label: t('today') }, { value: 'week', label: t('thisWeek') }].map((opt, i) => (
              <React.Fragment key={opt.value}>
                {i > 0 && <span className="text-ink-faint mx-1.5">|</span>}
                <button
                  onClick={() => setTimeframe(opt.value)}
                  className={`text-xs font-medium uppercase tracking-wider transition-colors font-sans px-1 ${
                    timeframe === opt.value ? 'text-ink dark:text-paper font-bold' : 'text-ink-faint hover:text-ink-muted'
                  }`}
                >{opt.label}</button>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Compare overlay */}
      <AnimatePresence>
        {compareMode && compareData && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="mb-6 border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card p-4 overflow-hidden">
            <h3 className="text-sm font-bold text-ink dark:text-paper font-display mb-3 uppercase tracking-wider">
              {t('trendComparison') || 'Trend Comparison'}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={compareData}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip />
                <Legend />
                {selectedTopics.map((topic, i) => (
                  <Line key={topic} type="monotone" dataKey={topic} stroke={SPARKLINE_COLORS[i % SPARKLINE_COLORS.length]}
                    strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card divide-y divide-paper-line dark:divide-paper-dark-line">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 bg-gray-200 dark:bg-gray-700 w-3/4 mb-2.5" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 w-full mb-2" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
          <div className="text-4xl mb-4 opacity-15">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-ink-muted">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-ink dark:text-paper mb-1.5 font-display">
            {t('noTrending') || 'No trending articles yet'}
          </h3>
          <p className="text-xs text-ink-faint max-w-sm mx-auto font-sans leading-relaxed">
            {t('noTrendingDesc') || 'Trending stories appear once enough readers engage with the news. Check back after some activity.'}
          </p>
        </div>
      ) : (
        <div className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card divide-y divide-paper-line dark:divide-paper-dark-line">
          {articles.map((art, idx) => {
            const topic = art.topic || art.categories?.[0] || 'General';
            const velocity = getVelocity(topic);
            const isSelected = selectedTopics.includes(topic);
            return (
              <div key={art._id} className={`flex items-start gap-4 transition-colors ${
                compareMode && isSelected ? 'bg-ink/[0.03] dark:bg-paper/[0.05]' : ''
              }`}>
                {/* Rank */}
                <div className="flex-shrink-0 w-12 text-center pt-4 border-r border-paper-line dark:border-paper-dark-line">
                  <span className={`text-xl font-black font-display italic ${
                    idx < 3 ? 'text-ink dark:text-paper' : 'text-ink-faint'
                  }`}>#{idx + 1}</span>
                </div>
                {/* Article + sparkline */}
                <div className="flex-1 min-w-0 py-2">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <ArticleCard article={art} onPreview={setSelectedArticle} />
                    </div>
                    {/* Sparkline + velocity */}
                    <div className="flex-shrink-0 w-28 flex flex-col items-end gap-1 pt-2">
                      <div className="flex items-center gap-1">
                        {velocity.dir !== 'stable' && <VelocityIcon dir={velocity.dir} />}
                        <span className={`text-[10px] font-bold ${
                          velocity.dir === 'up' ? 'text-emerald-500' : velocity.dir === 'down' ? 'text-red-500' : 'text-slate-400'
                        }`}>
                          {velocity.dir === 'stable' ? '—' : `${velocity.pct > 0 ? '+' : ''}${velocity.pct}%`}
                        </span>
                      </div>
                      {trendData[topic] && trendData[topic].length > 1 && (
                        <ResponsiveContainer width={96} height={32}>
                          <LineChart data={trendData[topic]}>
                            <Line type="monotone" dataKey="total" stroke={velocity.dir === 'up' ? '#10B981' : velocity.dir === 'down' ? '#EF4444' : '#94a3b8'}
                              strokeWidth={1.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                      {compareMode && (
                        <button onClick={() => toggleCompareTopic(topic)}
                          className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border transition-colors ${
                            isSelected ? 'border-ink dark:border-paper bg-ink dark:bg-paper text-paper dark:text-ink' : 'border-paper-line dark:border-paper-dark-line text-ink-muted'
                          }`}>
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      )}
                      {!compareMode && (
                        <button onClick={() => handleDrillDown(topic)}
                          className="text-[9px] text-ink-muted hover:text-ink dark:hover:text-paper transition-colors font-sans">
                          View All →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ArticlePreviewModal
        key={selectedArticle?._id || 'trending-preview'}
        article={selectedArticle}
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
};

export default Trending;
