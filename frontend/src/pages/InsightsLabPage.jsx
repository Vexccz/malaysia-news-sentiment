import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const todayKey = () => new Date().toISOString().slice(0, 10);

const moodOptions = [
  { value: -2, label: 'Very Negative', emoji: '😞' },
  { value: -1, label: 'Negative', emoji: '🙂‍↕️' },
  { value: 0, label: 'Neutral', emoji: '😐' },
  { value: 1, label: 'Positive', emoji: '🙂' },
  { value: 2, label: 'Very Positive', emoji: '😄' },
];

export default function InsightsLabPage() {
  const { t } = useLanguage();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [loadingAsk, setLoadingAsk] = useState(false);

  const [date, setDate] = useState(todayKey());
  const [mood, setMood] = useState(0);
  const [note, setNote] = useState('');
  const [journalEntries, setJournalEntries] = useState([]);
  const [savingJournal, setSavingJournal] = useState(false);
  const [monthSummary, setMonthSummary] = useState(null);

  const monthKey = useMemo(() => date.slice(0, 7), [date]);

  const loadJournal = async (selectedDate = date) => {
    try {
      const [listRes, monthRes] = await Promise.all([
        api.get('/journal', { params: { limit: 12 } }),
        api.get(`/journal/month/${selectedDate.slice(0, 7)}`),
      ]);
      setJournalEntries(listRes.data.entries || []);
      setMonthSummary(monthRes.data.summary || null);

      const existing = (listRes.data.entries || []).find((e) => e.date === selectedDate);
      if (existing) {
        setMood(existing.mood ?? 0);
        setNote(existing.note || '');
      } else {
        setMood(0);
        setNote('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadJournal(date);
  }, [date]);

  const askAssistant = async () => {
    if (!question.trim()) return;
    setLoadingAsk(true);
    try {
      const { data } = await api.post('/assistant/ask', { question, chatId, limit: 6 });
      setAnswer(data.answer || '');
      setSources(data.sources || []);
      setChatId(data.chatId || null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to ask assistant');
    } finally {
      setLoadingAsk(false);
    }
  };

  const saveJournal = async () => {
    setSavingJournal(true);
    try {
      await api.put(`/journal/${date}`, { mood, note, tags: [] });
      toast.success('Journal saved');
      loadJournal(date);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save journal');
    } finally {
      setSavingJournal(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper dark:bg-paper-dark px-4 md:px-6 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="border-b border-paper-line dark:border-paper-dark-line pb-4">
          <p className="editorial-kicker mb-2">AI Workspace</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink dark:text-paper">Insights Lab</h1>
          <p className="mt-2 text-sm text-ink-muted dark:text-ink-faint max-w-2xl">
            Ask sentiment questions against your own article history, then log how today’s media cycle affected you.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <section className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
            <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
              <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-sans mb-1">Feature 27</p>
              <h2 className="font-display text-2xl font-bold text-ink dark:text-paper">Ask AI about your news</h2>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Example: What negative themes dominated Selangor coverage this week?"
                className="w-full min-h-[120px] border border-paper-line dark:border-paper-dark-line bg-transparent px-4 py-3 text-sm text-ink dark:text-paper focus:outline-none focus:border-accent"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-ink-muted dark:text-ink-faint">Gemini answer grounded on saved article context.</p>
                <button
                  onClick={askAssistant}
                  disabled={loadingAsk}
                  className="px-5 py-2.5 bg-ink dark:bg-paper text-paper dark:text-ink text-xs uppercase tracking-[0.18em] font-semibold hover:bg-accent hover:text-paper transition-colors disabled:opacity-50"
                >
                  {loadingAsk ? 'Thinking...' : 'Ask'}
                </button>
              </div>

              <div className="border-t border-paper-line dark:border-paper-dark-line pt-4 min-h-[180px]">
                {answer ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="border-l-[3px] border-accent pl-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Answer</p>
                      <p className="text-sm leading-relaxed text-ink dark:text-paper whitespace-pre-wrap">{answer}</p>
                    </div>
                    {!!sources.length && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint mb-2">Source Articles</p>
                        <div className="divide-y divide-paper-line dark:divide-paper-dark-line border border-paper-line dark:border-paper-dark-line">
                          {sources.map((s, idx) => (
                            <div key={idx} className="px-4 py-3">
                              <p className="font-medium text-sm text-ink dark:text-paper">[{idx + 1}] {s.title}</p>
                              <p className="text-xs text-ink-muted dark:text-ink-faint mt-1">{s.source} · {s.sentiment} · {Math.round((s.confidence || 0) * 100)}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="py-12 text-center text-sm text-ink-muted dark:text-ink-faint">
                    Ask something first. Grounded answer appear sini. Magically, not telepathy.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card">
            <div className="px-5 py-4 border-b border-paper-line dark:border-paper-dark-line">
              <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-sans mb-1">Feature 28</p>
              <h2 className="font-display text-2xl font-bold text-ink dark:text-paper">Sentiment Journal</h2>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint block mb-2">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-paper-line dark:border-paper-dark-line bg-transparent px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint block mb-2">Mood</label>
                  <div className="grid grid-cols-5 gap-2">
                    {moodOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setMood(opt.value)}
                        className={`px-2 py-2 border text-lg ${mood === opt.value ? 'border-accent bg-accent/10' : 'border-paper-line dark:border-paper-dark-line'}`}
                        title={opt.label}
                      >
                        {opt.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint block mb-2">Reflection</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What narrative stood out today? Did media tone affect your view?"
                  className="w-full min-h-[140px] border border-paper-line dark:border-paper-dark-line bg-transparent px-4 py-3 text-sm"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-ink-muted dark:text-ink-faint">
                  {monthSummary ? `${monthSummary.total || 0} entries this month · avg mood ${monthSummary.avgMood ?? 0}` : 'No monthly summary yet'}
                </div>
                <button
                  onClick={saveJournal}
                  disabled={savingJournal}
                  className="px-5 py-2.5 bg-ink dark:bg-paper text-paper dark:text-ink text-xs uppercase tracking-[0.18em] font-semibold hover:bg-accent hover:text-paper transition-colors disabled:opacity-50"
                >
                  {savingJournal ? 'Saving...' : 'Save Journal'}
                </button>
              </div>

              <div className="border-t border-paper-line dark:border-paper-dark-line pt-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint mb-3">Recent Entries</p>
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {journalEntries.length ? journalEntries.map((entry) => (
                    <button
                      key={entry._id}
                      onClick={() => setDate(entry.date)}
                      className="w-full text-left border border-paper-line dark:border-paper-dark-line px-4 py-3 hover:border-accent transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-sm text-ink dark:text-paper">{entry.date}</p>
                        <span className="text-[10px] uppercase tracking-[0.16em] text-accent">{entry.daySentiment?.label || 'Neutral'}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-muted dark:text-ink-faint line-clamp-2">{entry.note || 'No note recorded.'}</p>
                    </button>
                  )) : (
                    <div className="text-sm text-ink-muted dark:text-ink-faint py-6 text-center border border-dashed border-paper-line dark:border-paper-dark-line">
                      No journal entries yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
