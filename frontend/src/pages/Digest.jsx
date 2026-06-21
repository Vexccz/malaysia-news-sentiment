import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const Digest = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [topicData, setTopicData] = useState(null);
  const [topicInput, setTopicInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [topicLoading, setTopicLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeTab === 'daily' && !dailyData) fetchDaily();
    if (activeTab === 'weekly' && !weeklyData) fetchWeekly();
  }, [activeTab]);

  const fetchDaily = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/digest/daily');
      setDailyData(data);
    } catch (err) {
      console.error('Failed to fetch daily digest:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeekly = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/digest/weekly');
      setWeeklyData(data);
    } catch (err) {
      console.error('Failed to fetch weekly digest:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopicDigest = async (e) => {
    e.preventDefault();
    if (!topicInput.trim()) return;
    setTopicLoading(true);
    try {
      const { data } = await api.get(`/digest/topic/${encodeURIComponent(topicInput.trim())}`);
      setTopicData(data);
    } catch (err) {
      console.error('Failed to fetch topic digest:', err);
    } finally {
      setTopicLoading(false);
    }
  };

  const handleShare = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDigestText = (digest) => {
    if (!digest) return '';
    if (typeof digest === 'string') return digest;
    return digest.en || digest.ms || JSON.stringify(digest);
  };

  const currentData = activeTab === 'daily' ? dailyData : activeTab === 'weekly' ? weeklyData : null;

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header - editorial style */}
      <div className="hidden sm:block editorial-rule mb-2" />
      <div className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-ink dark:text-paper tracking-tight font-display">
              News Digest
            </h1>
            <p className="text-xs text-ink-muted dark:text-ink-faint mt-1 tracking-wide uppercase">
              {formatDate()}
            </p>
          </div>
          {currentData && (
            <div className="flex items-center gap-4 text-xs text-ink-muted">
              <span>{currentData.articleCount} articles</span>
              {currentData.sentimentBreakdown && (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {currentData.sentimentBreakdown.Positive || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    {currentData.sentimentBreakdown.Neutral || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {currentData.sentimentBreakdown.Negative || 0}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Tabs - editorial style */}
      <div className="flex gap-6 border-b border-paper-line">
        {['daily', 'weekly', 'topic'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-widest transition-colors ${
              activeTab === tab
                ? 'text-ink dark:text-paper border-b-2 border-ink dark:border-paper'
                : 'text-ink-muted hover:text-ink dark:hover:text-paper'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Daily/Weekly Content */}
      {(activeTab === 'daily' || activeTab === 'weekly') && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {loading ? (
              <div className="py-12 text-center">
                <div className="w-5 h-5 border-2 border-paper-line border-t-ink dark:border-t-paper rounded-full animate-spin mx-auto" />
                <p className="text-xs text-ink-muted mt-3">Loading digest...</p>
              </div>
            ) : currentData ? (
              <>
                {/* Sentiment mood - subtle */}
                {currentData.sentimentMood && (
                  <div className="flex items-center gap-2 text-sm text-ink-muted">
                    <span className="font-medium text-ink dark:text-paper">
                      Overall mood:
                    </span>
                    <span>{currentData.sentimentMood.text}</span>
                  </div>
                )}

                {/* Main Digest - editorial card */}
                <div className="bg-paper-card border border-paper-line rounded-md p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-ink dark:text-paper uppercase tracking-wide">
                      {activeTab === 'daily' ? 'Today\'s Summary' : 'Weekly Roundup'}
                    </h2>
                    <button
                      onClick={() => handleShare(getDigestText(currentData.digest))}
                      className="text-xs text-ink-muted hover:text-ink dark:hover:text-paper transition-colors"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
                    {getDigestText(currentData.digest)}
                  </div>
                </div>

                {/* Highlights - editorial card */}
                {currentData.highlights && currentData.highlights.length > 0 && (
                  <div className="bg-paper-card border border-paper-line rounded-md p-6">
                    <h3 className="text-sm font-bold text-ink dark:text-paper uppercase tracking-wide mb-3">
                      Key Stories
                    </h3>
                    <div className="space-y-0 divide-y divide-paper-line">
                      {currentData.highlights.map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-start gap-3 py-2.5 group"
                        >
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                            h.sentiment === 'Positive' ? 'bg-green-500' :
                            h.sentiment === 'Negative' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`} />
                          <span className="text-sm text-ink-muted group-hover:text-ink dark:group-hover:text-paper transition-colors flex-1">
                            {h.title}
                          </span>
                          <span className="text-[11px] text-ink-muted flex-shrink-0 font-medium">
                            {h.source}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Sources (weekly) - editorial card */}
                {currentData.topSources && (
                  <div className="bg-paper-card border border-paper-line rounded-md p-6">
                    <h3 className="text-sm font-bold text-ink dark:text-paper uppercase tracking-wide mb-3">
                      Sources
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {currentData.topSources.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 text-xs text-ink-muted border border-paper-line rounded">
                          {s.name} <span className="text-ink-muted opacity-60">({s.count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-ink-muted">No digest available for this period.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Topic Search */}
      {activeTab === 'topic' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <form onSubmit={fetchTopicDigest} className="flex gap-2">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="Enter a topic..."
              className="flex-1 px-4 py-2.5 text-sm bg-paper-card border border-paper-line rounded-md text-ink dark:text-paper placeholder-ink-muted focus:outline-none focus:border-ink dark:focus:border-paper"
            />
            <button
              type="submit"
              disabled={topicLoading || !topicInput.trim()}
              className="px-5 py-2.5 text-xs font-medium uppercase tracking-widest bg-ink dark:bg-paper text-paper dark:text-ink rounded-md hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {topicLoading ? (
                <div className="w-4 h-4 border-2 border-paper dark:border-ink border-t-transparent rounded-full animate-spin" />
              ) : 'Search'}
            </button>
          </form>

          {topicData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Topic result header - editorial card */}
              <div className="bg-paper-card border border-paper-line rounded-md p-6">
                <div className="flex items-end justify-between border-b border-paper-line pb-3 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-ink dark:text-paper font-display">
                      {topicData.topic}
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {topicData.articleCount} articles found
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {topicData.sentimentBreakdown && (
                      <div className="flex items-center gap-2 text-xs text-ink-muted">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {topicData.sentimentBreakdown.Positive || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          {topicData.sentimentBreakdown.Neutral || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          {topicData.sentimentBreakdown.Negative || 0}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => handleShare(getDigestText(topicData.digest))}
                      className="text-xs text-ink-muted hover:text-ink dark:hover:text-paper transition-colors"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
                  {getDigestText(topicData.digest)}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Digest;
