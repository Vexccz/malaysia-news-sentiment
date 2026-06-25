import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const Digest = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const { t, lang } = useLanguage();
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [topicData, setTopicData] = useState(null);
  const [topicInput, setTopicInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [topicLoading, setTopicLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ frequency: 'daily', topics: '', delivery: 'email' });

  useEffect(() => {
    if (activeTab === 'daily' && !dailyData) fetchDaily();
    if (activeTab === 'weekly' && !weeklyData) fetchWeekly();
    if (activeTab === 'schedule' && schedules.length === 0) fetchSchedules();
  }, [activeTab]);

  const fetchSchedules = async () => {
    setScheduleLoading(true);
    try {
      const { data } = await api.get('/digests/scheduled');
      setSchedules(data);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    } finally {
      setScheduleLoading(false);
    }
  };

  const createSchedule = async (e) => {
    e.preventDefault();
    try {
      const topics = newSchedule.topics.split(',').map(t => t.trim()).filter(Boolean);
      await api.post('/digests/scheduled', { frequency: newSchedule.frequency, topics, enabled: true });
      setShowScheduleForm(false);
      setNewSchedule({ frequency: 'daily', topics: '', delivery: 'email' });
      fetchSchedules();
    } catch (err) {
      console.error('Failed to create schedule:', err);
    }
  };

  const toggleSchedule = async (id, currentEnabled) => {
    try {
      await api.put(`/digests/scheduled/${id}`, { enabled: !currentEnabled });
      setSchedules(schedules.map(s => s._id === id ? { ...s, enabled: !currentEnabled } : s));
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
    }
  };

  const deleteSchedule = async (id) => {
    try {
      await api.delete(`/digests/scheduled/${id}`);
      setSchedules(schedules.filter(s => s._id !== id));
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
  };

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header — editorial style */}
      <div className="mb-4">
        <h1 className="font-['Playfair_Display'] text-2xl font-black text-ink dark:text-paper tracking-tight uppercase">
          News Digest
        </h1>
        <p className="text-[10px] text-ink-muted dark:text-ink-faint mt-1 uppercase tracking-[0.2em]">
          {formatDate()}
        </p>
        <div className="border-b border-[#e5e5e5] dark:border-[#222] mt-2 mb-3" />
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
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
      <div className="flex gap-6 border-b border-[#e5e5e5] dark:border-[#222]">
        {['daily', 'weekly', 'topic', 'schedule'].map(tab => (
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
                <div className="bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] p-6 space-y-3">
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
                  <div className="bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] p-6">
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
                  <div className="bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] p-6">
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
              className="flex-1 px-4 py-2.5 text-sm bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] text-ink dark:text-paper placeholder-ink-muted focus:outline-none focus:border-ink dark:focus:border-paper"
            />
            <button
              type="submit"
              disabled={topicLoading || !topicInput.trim()}
              className="px-5 py-2.5 text-xs font-medium uppercase tracking-widest bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-90 disabled:opacity-40 transition-all"
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
              <div className="bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] p-6">
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

      {/* Schedule Digests */}
      {activeTab === 'schedule' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs text-ink-muted uppercase tracking-[0.2em]">Scheduled Digests</h2>
              <p className="text-xs text-ink-muted mt-1">Receive automated digest summaries at your preferred frequency</p>
            </div>
            <button
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              className="border border-ink dark:border-paper px-4 py-2 text-xs font-medium uppercase tracking-widest text-ink dark:text-paper hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink transition-colors"
            >
              {showScheduleForm ? 'Cancel' : '+ New Schedule'}
            </button>
          </div>

          {/* New Schedule Form */}
          {showScheduleForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={createSchedule}
              className="border border-[#e5e5e5] dark:border-[#222] p-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-ink-muted block mb-2">Frequency</label>
                  <select
                    value={newSchedule.frequency}
                    onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-paper-card border-2 border-ink dark:border-paper text-ink dark:text-paper focus:outline-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-ink-muted block mb-2">Delivery</label>
                  <select
                    value={newSchedule.delivery}
                    onChange={(e) => setNewSchedule({ ...newSchedule, delivery: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-paper-card border-2 border-ink dark:border-paper text-ink dark:text-paper focus:outline-none"
                  >
                    <option value="email">Email</option>
                    <option value="dashboard">Dashboard</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-ink-muted block mb-2">Topics (comma-separated)</label>
                <input
                  type="text"
                  value={newSchedule.topics}
                  onChange={(e) => setNewSchedule({ ...newSchedule, topics: e.target.value })}
                  placeholder="e.g. economy, politics, technology"
                  className="w-full px-3 py-2 text-sm bg-paper-card border-2 border-ink dark:border-paper text-ink dark:text-paper placeholder-ink-muted focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="border border-ink dark:border-paper px-5 py-2 text-xs font-medium uppercase tracking-widest text-ink dark:text-paper hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink transition-colors"
              >
                Create Schedule
              </button>
            </motion.form>
          )}

          {/* Schedules List */}
          {scheduleLoading ? (
            <div className="py-8 text-center">
              <div className="w-5 h-5 border-2 border-paper-line border-t-ink dark:border-t-paper rounded-full animate-spin mx-auto" />
              <p className="text-xs text-ink-muted mt-3">Loading schedules...</p>
            </div>
          ) : schedules.length > 0 ? (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <motion.div
                  key={schedule._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`border p-4 flex items-center justify-between transition-colors ${
                    schedule.enabled
                      ? 'border-ink/10 dark:border-paper/10'
                      : 'border-ink/5 dark:border-paper/5 opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                        {schedule.frequency}
                      </span>
                      {schedule.delivery && (
                        <span className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                          via {schedule.delivery}
                        </span>
                      )}
                    </div>
                    {schedule.topics && schedule.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {schedule.topics.map((topic, i) => (
                          <span key={i} className="px-2 py-0.5 text-[11px] text-ink-muted border border-ink/10 dark:border-paper/10">
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                    {!schedule.topics?.length && (
                      <span className="text-xs text-ink-muted">All topics</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <button
                      onClick={() => toggleSchedule(schedule._id, schedule.enabled)}
                      className={`relative w-10 h-5 transition-colors ${
                        schedule.enabled ? 'bg-ink dark:bg-paper' : 'bg-ink/20 dark:bg-paper/20'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-paper dark:bg-ink transition-transform ${
                        schedule.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                    <button
                      onClick={() => deleteSchedule(schedule._id)}
                      className="text-xs text-ink-muted hover:text-red-500 transition-colors uppercase tracking-widest"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border border-ink/10 dark:border-paper/10">
              <p className="text-sm text-ink-muted">No scheduled digests yet</p>
              <p className="text-xs text-ink-muted mt-1">Create a schedule to receive automated digest summaries</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Digest;
