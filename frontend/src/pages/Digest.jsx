import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Share2, Copy, Check, Trash2, Star, Bookmark, ChevronDown, Plus, X, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

// --- localStorage helpers ---
const HISTORY_KEY = 'digest_history';
const PRESETS_KEY = 'digest_topic_presets';

const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
};
const saveHistory = (list) => localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 50)));

const loadPresets = () => {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY)) || []; }
  catch { return []; }
};
const savePresets = (list) => localStorage.setItem(PRESETS_KEY, JSON.stringify(list));

// --- Topic presets ---
const AVAILABLE_TOPICS = [
  'Politics', 'Economy', 'Technology', 'Health', 'Education',
  'Environment', 'Crime', 'Sports', 'Entertainment', 'Business',
  'Finance', 'Infrastructure', 'Foreign Affairs', 'Culture', 'Food'
];

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

  // --- NEW: History state ---
  const [history, setHistory] = useState(loadHistory);
  const [selectedHistory, setSelectedHistory] = useState(null);

  // --- NEW: Share state ---
  const [shareTarget, setShareTarget] = useState(null); // 'whatsapp' | 'telegram' | null

  // --- NEW: Custom topics state ---
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [presets, setPresets] = useState(loadPresets);
  const [presetName, setPresetName] = useState('');
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [customDigest, setCustomDigest] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'daily' && !dailyData) fetchDaily();
    if (activeTab === 'weekly' && !weeklyData) fetchWeekly();
    if (activeTab === 'schedule' && schedules.length === 0) fetchSchedules();
  }, [activeTab]);

  // --- History: save digest when loaded ---
  const saveToHistory = useCallback((digestData, type, topicName) => {
    if (!digestData) return;
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      type,
      topic: topicName || null,
      articleCount: digestData.articleCount || 0,
      sentimentBreakdown: digestData.sentimentBreakdown || null,
      sentimentMood: digestData.sentimentMood || null,
      digest: digestData.digest || null,
      highlights: digestData.highlights || [],
      topSources: digestData.topSources || null,
    };
    setHistory(prev => {
      const next = [entry, ...prev];
      saveHistory(next);
      return next;
    });
  }, []);

  // Auto-save daily/weekly digests when they arrive
  useEffect(() => {
    if (dailyData) saveToHistory(dailyData, 'daily');
  }, [dailyData, saveToHistory]);
  useEffect(() => {
    if (weeklyData) saveToHistory(weeklyData, 'weekly');
  }, [weeklyData, saveToHistory]);

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
      saveToHistory(data, 'topic', topicInput.trim());
    } catch (err) {
      console.error('Failed to fetch topic digest:', err);
    } finally {
      setTopicLoading(false);
    }
  };

  // --- NEW: Fetch custom digest from selected topics ---
  const fetchCustomDigest = async () => {
    if (selectedTopics.length === 0) return;
    setCustomLoading(true);
    try {
      const topicParam = selectedTopics.join(',');
      const { data } = await api.get(`/digest/topic/${encodeURIComponent(topicParam)}`);
      setCustomDigest(data);
      saveToHistory(data, 'custom', topicParam);
    } catch (err) {
      console.error('Failed to fetch custom digest:', err);
      // Fallback: try topics one by one or use daily data
    } finally {
      setCustomLoading(false);
    }
  };

  // --- NEW: Preset management ---
  const savePreset = () => {
    if (!presetName.trim() || selectedTopics.length === 0) return;
    const preset = { id: Date.now(), name: presetName.trim(), topics: [...selectedTopics] };
    const next = [...presets, preset];
    setPresets(next);
    savePresets(next);
    setPresetName('');
    setShowPresetForm(false);
  };

  const loadPreset = (preset) => {
    setSelectedTopics([...preset.topics]);
  };

  const deletePreset = (id) => {
    const next = presets.filter(p => p.id !== id);
    setPresets(next);
    savePresets(next);
  };

  const toggleTopic = (topic) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  // --- Share helpers ---
  const getDigestText = (digest) => {
    if (!digest) return '';
    if (typeof digest === 'string') return digest;
    return digest.en || digest.ms || JSON.stringify(digest);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (text, platform) => {
    const shareText = encodeURIComponent(text);
    const pageTitle = encodeURIComponent('Malaysia News Digest');
    const pageUrl = encodeURIComponent(window.location.href);

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${shareText}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${pageUrl}&text=${shareText}`, '_blank');
    } else if (navigator.share) {
      navigator.share({ title: 'Malaysia News Digest', text, url: window.location.href })
        .catch(() => {});
    } else {
      handleCopy(text);
    }
    setShareTarget(platform);
    setTimeout(() => setShareTarget(null), 2000);
  };

  // --- Share buttons component ---
  const ShareButtons = ({ text, compact = false }) => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handleCopy(text)}
        title={lang === 'ms' ? 'Salin' : 'Copy'}
        className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-widest border transition-colors ${
          copied
            ? 'border-green-500 text-green-500'
            : 'border-ink/20 dark:border-paper/20 text-ink-muted hover:text-ink dark:hover:text-paper hover:border-ink dark:hover:border-paper'
        }`}
      >
        {copied ? <Check size={10} /> : <Copy size={10} />}
        {!compact && (copied ? (lang === 'ms' ? 'Disalin' : 'Copied') : (lang === 'ms' ? 'Salin' : 'Copy'))}
      </button>
      <button
        onClick={() => handleShare(text, 'whatsapp')}
        title="WhatsApp"
        className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-widest border transition-colors ${
          shareTarget === 'whatsapp'
            ? 'border-green-500 text-green-500'
            : 'border-ink/20 dark:border-paper/20 text-ink-muted hover:text-ink dark:hover:text-paper hover:border-ink dark:hover:border-paper'
        }`}
      >
        <MessageCircle size={10} />
        {!compact && 'WhatsApp'}
      </button>
      <button
        onClick={() => handleShare(text, 'telegram')}
        title="Telegram"
        className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-widest border transition-colors ${
          shareTarget === 'telegram'
            ? 'border-blue-400 text-blue-400'
            : 'border-ink/20 dark:border-paper/20 text-ink-muted hover:text-ink dark:hover:text-paper hover:border-ink dark:hover:border-paper'
        }`}
      >
        <Share2 size={10} />
        {!compact && 'Telegram'}
      </button>
    </div>
  );

  const currentData = activeTab === 'daily' ? dailyData : activeTab === 'weekly' ? weeklyData : null;

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatHistoryDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const typeLabel = (type) => {
    if (type === 'daily') return lang === 'ms' ? 'Harian' : 'Daily';
    if (type === 'weekly') return lang === 'ms' ? 'Mingguan' : 'Weekly';
    if (type === 'topic') return lang === 'ms' ? 'Topik' : 'Topic';
    if (type === 'custom') return lang === 'ms' ? 'Tersuai' : 'Custom';
    return type;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header — editorial style */}
      <div className="mb-4">
        <h1 className="font-['Playfair_Display'] text-2xl font-black text-ink dark:text-paper tracking-tight uppercase">
          {lang === 'ms' ? 'Ringkasan Berita' : 'News Digest'}
        </h1>
        <p className="text-[10px] text-ink-muted dark:text-ink-faint mt-1 uppercase tracking-[0.2em]">
          {formatDate()}
        </p>
        <div className="border-b-2 border-ink dark:border-paper mt-2 mb-3" />
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          {currentData && !selectedHistory && (
            <div className="flex items-center gap-4 text-xs text-ink-muted">
              <span>{currentData.articleCount} {lang === 'ms' ? 'artikel' : 'articles'}</span>
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
      <div className="flex gap-6 border-b-2 border-ink/10 dark:border-paper/10 overflow-x-auto">
        {['daily', 'weekly', 'topic', 'custom', 'schedule', 'history'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedHistory(null); }}
            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-widest transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'text-ink dark:text-paper border-b-2 border-ink dark:border-paper -mb-[2px]'
                : 'text-ink-muted hover:text-ink dark:hover:text-paper'
            }`}
          >
            {tab === 'history'
              ? (lang === 'ms' ? 'Sejarah' : 'History')
              : tab === 'custom'
                ? (lang === 'ms' ? 'Tersuai' : 'Custom')
                : tab.charAt(0).toUpperCase() + tab.slice(1)
            }
          </button>
        ))}
      </div>

      {/* Daily/Weekly Content */}
      {(activeTab === 'daily' || activeTab === 'weekly') && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (selectedHistory ? '-hist' : '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {loading ? (
              <div className="py-12 text-center">
                <div className="w-5 h-5 border-2 border-paper-line border-t-ink dark:border-t-paper rounded-full animate-spin mx-auto" />
                <p className="text-xs text-ink-muted mt-3">{lang === 'ms' ? 'Memuatkan ringkasan...' : 'Loading digest...'}</p>
              </div>
            ) : currentData ? (
              <>
                {/* Sentiment mood - subtle */}
                {currentData.sentimentMood && (
                  <div className="flex items-center gap-2 text-sm text-ink-muted">
                    <span className="font-medium text-ink dark:text-paper">
                      {lang === 'ms' ? 'Suasana keseluruhan:' : 'Overall mood:'}
                    </span>
                    <span>{currentData.sentimentMood.text}</span>
                  </div>
                )}

                {/* Main Digest - editorial card */}
                <div className="bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-ink dark:text-paper uppercase tracking-wide font-['Playfair_Display']">
                      {activeTab === 'daily'
                        ? (lang === 'ms' ? 'Ringkasan Hari Ini' : "Today's Summary")
                        : (lang === 'ms' ? 'Ringkasan Mingguan' : 'Weekly Roundup')
                      }
                    </h2>
                    <ShareButtons text={getDigestText(currentData.digest)} />
                  </div>
                  <div className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
                    {getDigestText(currentData.digest)}
                  </div>
                </div>

                {/* Highlights - editorial card */}
                {currentData.highlights && currentData.highlights.length > 0 && (
                  <div className="bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] p-6">
                    <h3 className="text-sm font-bold text-ink dark:text-paper uppercase tracking-wide mb-3 font-['Playfair_Display']">
                      {lang === 'ms' ? 'Cerita Utama' : 'Key Stories'}
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
                    <h3 className="text-sm font-bold text-ink dark:text-paper uppercase tracking-wide mb-3 font-['Playfair_Display']">
                      {lang === 'ms' ? 'Sumber' : 'Sources'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {currentData.topSources.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 text-xs text-ink-muted border border-paper-line">
                          {s.name} <span className="text-ink-muted opacity-60">({s.count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-ink-muted">{lang === 'ms' ? 'Tiada ringkasan untuk tempoh ini.' : 'No digest available for this period.'}</p>
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
              placeholder={lang === 'ms' ? 'Masukkan topik...' : 'Enter a topic...'}
              className="flex-1 px-4 py-2.5 text-sm bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] text-ink dark:text-paper placeholder-ink-muted focus:outline-none focus:border-ink dark:focus:border-paper"
            />
            <button
              type="submit"
              disabled={topicLoading || !topicInput.trim()}
              className="px-5 py-2.5 text-xs font-medium uppercase tracking-widest bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {topicLoading ? (
                <div className="w-4 h-4 border-2 border-paper dark:border-ink border-t-transparent rounded-full animate-spin" />
              ) : (lang === 'ms' ? 'Cari' : 'Search')}
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
                <div className="flex items-end justify-between border-b-2 border-paper-line pb-3 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-ink dark:text-paper font-['Playfair_Display']">
                      {topicData.topic}
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {topicData.articleCount} {lang === 'ms' ? 'artikel ditemui' : 'articles found'}
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
                    <ShareButtons text={getDigestText(topicData.digest)} />
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

      {/* Custom Topics */}
      {activeTab === 'custom' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Presets bar */}
          {presets.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                {lang === 'ms' ? 'Praset' : 'Presets'}
              </p>
              <div className="flex flex-wrap gap-2">
                {presets.map(preset => (
                  <div key={preset.id} className="flex items-center border border-ink/15 dark:border-paper/15">
                    <button
                      onClick={() => loadPreset(preset)}
                      className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink dark:hover:text-paper transition-colors"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="px-2 py-1.5 text-ink-muted hover:text-red-500 transition-colors border-l border-ink/10 dark:border-paper/10"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topic selector grid */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-3">
              {lang === 'ms' ? 'Pilih topik untuk ringkasan tersuai' : 'Select topics for a custom digest'}
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TOPICS.map(topic => {
                const active = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider border transition-all ${
                      active
                        ? 'bg-ink dark:bg-paper text-paper dark:text-ink border-ink dark:border-paper'
                        : 'bg-transparent text-ink-muted border-ink/15 dark:border-paper/15 hover:border-ink dark:hover:border-paper hover:text-ink dark:hover:text-paper'
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={fetchCustomDigest}
              disabled={customLoading || selectedTopics.length === 0}
              className="px-5 py-2.5 text-xs font-medium uppercase tracking-widest bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {customLoading ? (
                <div className="w-4 h-4 border-2 border-paper dark:border-ink border-t-transparent rounded-full animate-spin" />
              ) : (lang === 'ms' ? 'Jana Ringkasan' : 'Generate Digest')}
            </button>

            {selectedTopics.length > 0 && (
              <button
                onClick={() => setShowPresetForm(!showPresetForm)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs uppercase tracking-widest border border-ink/20 dark:border-paper/20 text-ink-muted hover:text-ink dark:hover:text-paper hover:border-ink dark:hover:border-paper transition-colors"
              >
                <Bookmark size={12} />
                {lang === 'ms' ? 'Simpan Praset' : 'Save Preset'}
              </button>
            )}

            {selectedTopics.length > 0 && (
              <span className="text-[10px] text-ink-muted uppercase tracking-widest">
                {selectedTopics.length} {lang === 'ms' ? 'dipilih' : 'selected'}
              </span>
            )}
          </div>

          {/* Save preset form */}
          {showPresetForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border border-[#e5e5e5] dark:border-[#222] p-4 flex gap-2"
            >
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={lang === 'ms' ? 'Nama praset...' : 'Preset name...'}
                className="flex-1 px-3 py-2 text-sm bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] text-ink dark:text-paper placeholder-ink-muted focus:outline-none focus:border-ink dark:focus:border-paper"
              />
              <button
                onClick={savePreset}
                disabled={!presetName.trim()}
                className="px-4 py-2 text-xs uppercase tracking-widest bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {lang === 'ms' ? 'Simpan' : 'Save'}
              </button>
              <button
                onClick={() => { setShowPresetForm(false); setPresetName(''); }}
                className="px-3 py-2 text-xs uppercase tracking-widest text-ink-muted hover:text-ink dark:hover:text-paper transition-colors"
              >
                {lang === 'ms' ? 'Batal' : 'Cancel'}
              </button>
            </motion.div>
          )}

          {/* Custom digest result */}
          {customDigest && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] p-6">
                <div className="flex items-end justify-between border-b-2 border-paper-line pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink dark:text-paper uppercase tracking-wide font-['Playfair_Display']">
                      {lang === 'ms' ? 'Ringkasan Tersuai' : 'Custom Digest'}
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {customDigest.articleCount} {lang === 'ms' ? 'artikel' : 'articles'} — {selectedTopics.join(', ')}
                    </p>
                  </div>
                  <ShareButtons text={getDigestText(customDigest.digest)} />
                </div>
                {customDigest.sentimentMood && (
                  <p className="text-xs text-ink-muted mb-3">
                    <span className="font-medium text-ink dark:text-paper">{lang === 'ms' ? 'Suasana:' : 'Mood:'}</span> {customDigest.sentimentMood.text}
                  </p>
                )}
                <div className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
                  {getDigestText(customDigest.digest)}
                </div>
              </div>

              {customDigest.highlights && customDigest.highlights.length > 0 && (
                <div className="bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] p-6">
                  <h3 className="text-sm font-bold text-ink dark:text-paper uppercase tracking-wide mb-3 font-['Playfair_Display']">
                    {lang === 'ms' ? 'Cerita Utama' : 'Key Stories'}
                  </h3>
                  <div className="space-y-0 divide-y divide-paper-line">
                    {customDigest.highlights.map((h, i) => (
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
                        <span className="text-[11px] text-ink-muted flex-shrink-0 font-medium">{h.source}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {customDigest === null && !customLoading && (
            <div className="py-12 text-center border border-ink/10 dark:border-paper/10">
              <p className="text-sm text-ink-muted">
                {lang === 'ms' ? 'Pilih topik dan klik Jana Ringkasan' : 'Select topics and click Generate Digest'}
              </p>
            </div>
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
              <h2 className="text-xs text-ink-muted uppercase tracking-[0.2em]">{lang === 'ms' ? 'Jadual Ringkasan' : 'Scheduled Digests'}</h2>
              <p className="text-xs text-ink-muted mt-1">{lang === 'ms' ? 'Terima ringkasan automatik pada frekuensi pilihan anda' : 'Receive automated digest summaries at your preferred frequency'}</p>
            </div>
            <button
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              className="border border-ink dark:border-paper px-4 py-2 text-xs font-medium uppercase tracking-widest text-ink dark:text-paper hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink transition-colors"
            >
              {showScheduleForm
                ? (lang === 'ms' ? 'Batal' : 'Cancel')
                : (lang === 'ms' ? '+ Jadual Baru' : '+ New Schedule')
              }
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
                  <label className="text-[10px] uppercase tracking-[0.2em] text-ink-muted block mb-2">{lang === 'ms' ? 'Kekerapan' : 'Frequency'}</label>
                  <select
                    value={newSchedule.frequency}
                    onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-paper-card border-2 border-ink dark:border-paper text-ink dark:text-paper focus:outline-none"
                  >
                    <option value="daily">{lang === 'ms' ? 'Harian' : 'Daily'}</option>
                    <option value="weekly">{lang === 'ms' ? 'Mingguan' : 'Weekly'}</option>
                    <option value="monthly">{lang === 'ms' ? 'Bulanan' : 'Monthly'}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-ink-muted block mb-2">{lang === 'ms' ? 'Penghantaran' : 'Delivery'}</label>
                  <select
                    value={newSchedule.delivery}
                    onChange={(e) => setNewSchedule({ ...newSchedule, delivery: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-paper-card border-2 border-ink dark:border-paper text-ink dark:text-paper focus:outline-none"
                  >
                    <option value="email">{lang === 'ms' ? 'Emel' : 'Email'}</option>
                    <option value="dashboard">{lang === 'ms' ? 'Papan Pemuka' : 'Dashboard'}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-ink-muted block mb-2">
                  {lang === 'ms' ? 'Topik (dipisahkan koma)' : 'Topics (comma-separated)'}
                </label>
                <input
                  type="text"
                  value={newSchedule.topics}
                  onChange={(e) => setNewSchedule({ ...newSchedule, topics: e.target.value })}
                  placeholder={lang === 'ms' ? 'cth. ekonomi, politik, teknologi' : 'e.g. economy, politics, technology'}
                  className="w-full px-3 py-2 text-sm bg-paper-card border-2 border-ink dark:border-paper text-ink dark:text-paper placeholder-ink-muted focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="border border-ink dark:border-paper px-5 py-2 text-xs font-medium uppercase tracking-widest text-ink dark:text-paper hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink transition-colors"
              >
                {lang === 'ms' ? 'Cipta Jadual' : 'Create Schedule'}
              </button>
            </motion.form>
          )}

          {/* Schedules List */}
          {scheduleLoading ? (
            <div className="py-8 text-center">
              <div className="w-5 h-5 border-2 border-paper-line border-t-ink dark:border-t-paper rounded-full animate-spin mx-auto" />
              <p className="text-xs text-ink-muted mt-3">{lang === 'ms' ? 'Memuatkan jadual...' : 'Loading schedules...'}</p>
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
                          {lang === 'ms' ? 'melalui' : 'via'} {schedule.delivery}
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
                      <span className="text-xs text-ink-muted">{lang === 'ms' ? 'Semua topik' : 'All topics'}</span>
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
                      {lang === 'ms' ? 'Padam' : 'Delete'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border border-ink/10 dark:border-paper/10">
              <p className="text-sm text-ink-muted">{lang === 'ms' ? 'Tiada jadual ringkasan lagi' : 'No scheduled digests yet'}</p>
              <p className="text-xs text-ink-muted mt-1">{lang === 'ms' ? 'Cipta jadual untuk menerima ringkasan automatik' : 'Create a schedule to receive automated digest summaries'}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {selectedHistory ? (
            /* Viewing a past digest */
            <div className="space-y-4">
              <button
                onClick={() => setSelectedHistory(null)}
                className="text-xs text-ink-muted hover:text-ink dark:hover:text-paper uppercase tracking-widest transition-colors flex items-center gap-1"
              >
                ← {lang === 'ms' ? 'Kembali ke sejarah' : 'Back to history'}
              </button>

              <div className="bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] p-6">
                <div className="flex items-end justify-between border-b-2 border-paper-line pb-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] border border-ink/15 dark:border-paper/15 text-ink-muted">
                        {typeLabel(selectedHistory.type)}
                      </span>
                      {selectedHistory.topic && (
                        <span className="text-xs text-ink-muted">{selectedHistory.topic}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-ink-muted uppercase tracking-[0.15em]">
                      {formatHistoryDate(selectedHistory.date)}
                    </p>
                  </div>
                  <ShareButtons text={getDigestText(selectedHistory.digest)} />
                </div>

                {selectedHistory.sentimentMood && (
                  <p className="text-xs text-ink-muted mb-3">
                    <span className="font-medium text-ink dark:text-paper">{lang === 'ms' ? 'Suasana:' : 'Mood:'}</span> {selectedHistory.sentimentMood.text}
                  </p>
                )}

                <div className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
                  {getDigestText(selectedHistory.digest)}
                </div>
              </div>

              {selectedHistory.highlights && selectedHistory.highlights.length > 0 && (
                <div className="bg-[#fafafa] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] p-6">
                  <h3 className="text-sm font-bold text-ink dark:text-paper uppercase tracking-wide mb-3 font-['Playfair_Display']">
                    {lang === 'ms' ? 'Cerita Utama' : 'Key Stories'}
                  </h3>
                  <div className="space-y-0 divide-y divide-paper-line">
                    {selectedHistory.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-3 py-2.5">
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          h.sentiment === 'Positive' ? 'bg-green-500' :
                          h.sentiment === 'Negative' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`} />
                        <span className="text-sm text-ink-muted flex-1">{h.title}</span>
                        <span className="text-[11px] text-ink-muted flex-shrink-0 font-medium">{h.source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* History list */
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs text-ink-muted uppercase tracking-[0.2em]">
                    {lang === 'ms' ? 'Sejarah Ringkasan' : 'Digest History'}
                  </h2>
                  <p className="text-xs text-ink-muted mt-1">
                    {history.length} {lang === 'ms' ? 'ringkasan disimpan' : 'digests saved'}
                  </p>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={() => { setHistory([]); saveHistory([]); }}
                    className="text-xs text-ink-muted hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    {lang === 'ms' ? 'Padam Semua' : 'Clear All'}
                  </button>
                )}
              </div>

              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <motion.button
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSelectedHistory(entry)}
                      className="w-full text-left border border-[#e5e5e5] dark:border-[#222] p-4 hover:border-ink dark:hover:border-paper transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] border border-ink/15 dark:border-paper/15 text-ink-muted">
                            {typeLabel(entry.type)}
                          </span>
                          {entry.topic && (
                            <span className="text-xs text-ink-muted">{entry.topic}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-ink-muted uppercase tracking-wider">
                          {formatHistoryDate(entry.date)}
                        </span>
                      </div>
                      <p className="text-sm text-ink-muted mt-2 line-clamp-2 group-hover:text-ink dark:group-hover:text-paper transition-colors">
                        {getDigestText(entry.digest).substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-ink-muted">
                          {entry.articleCount} {lang === 'ms' ? 'artikel' : 'articles'}
                        </span>
                        {entry.sentimentBreakdown && (
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-0.5 text-[10px] text-ink-muted">
                              <span className="w-1 h-1 rounded-full bg-green-500" />
                              {entry.sentimentBreakdown.Positive || 0}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] text-ink-muted">
                              <span className="w-1 h-1 rounded-full bg-red-500" />
                              {entry.sentimentBreakdown.Negative || 0}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center border border-ink/10 dark:border-paper/10">
                  <Clock size={24} className="mx-auto text-ink-muted mb-3 opacity-40" />
                  <p className="text-sm text-ink-muted">
                    {lang === 'ms' ? 'Tiada sejarah ringkasan lagi' : 'No digest history yet'}
                  </p>
                  <p className="text-xs text-ink-muted mt-1">
                    {lang === 'ms' ? 'Ringkasan akan disimpan secara automatik' : 'Digests will be saved automatically as you view them'}
                  </p>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Digest;
