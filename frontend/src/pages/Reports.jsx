import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Calendar, Clock, Download, FileText, RefreshCw, Trash2, Plus, Check, ChevronDown, ChevronUp, BarChart3, PieChart, Newspaper, Globe } from 'lucide-react';

/* ─── Localization helper ──────────────────────────────────────────── */
const LABELS = {
  en: {
    reports: 'Reports',
    subtitle: 'Generate and download sentiment analysis reports',
    reportTemplate: 'Report Template',
    savedTemplates: 'Saved Templates',
    templatePreview: 'Template Preview',
    collapse: 'Collapse',
    expand: 'Expand',
    sectionsIncluded: 'sections included',
    selectSections: 'Select Sections',
    saveAsTemplate: '+ Save as template',
    templateName: 'Template name',
    save: 'Save',
    cancel: 'Cancel',
    topic: 'Topic',
    topicPlaceholder: 'e.g. economy, politics (leave empty for all)',
    compareWith: 'Compare With (Topic B)',
    comparePlaceholder: 'e.g. politics, economy',
    reportType: 'Report Type',
    fullReport: 'Full Report',
    topicSpecific: 'Topic-Specific',
    comparison: 'Comparison',
    from: 'From',
    to: 'To',
    generating: 'Generating...',
    downloadPdf: 'Download PDF',
    history: 'History',
    clear: 'Clear',
    noHistory: 'No reports generated yet',
    reDownload: 'Re-download',
    scheduleTitle: 'Scheduled Reports',
    scheduleSubtitle: 'Auto-generate reports on a recurring basis',
    frequency: 'Frequency',
    weekly: 'Weekly',
    monthly: 'Monthly',
    scheduledTopic: 'Topic',
    scheduledTopicPlaceholder: 'e.g. economy (leave empty for all)',
    addSchedule: 'Add Schedule',
    noSchedules: 'No scheduled reports',
    scheduleFreq: 'Frequency',
    scheduleNextRun: 'Next run',
    scheduleSections: 'Sections',
    customSections: 'summary, charts, articles, sources, sentiment',
    removeSchedule: 'Remove',
    sectionsSummary: 'Summary',
    sectionsCharts: 'Charts',
    sectionsArticles: 'Articles',
    sectionsSources: 'Sources',
    sectionsSentiment: 'Sentiment Breakdown',
    selectTemplateSections: 'Select Sections to Include',
  },
  ms: {
    reports: 'Laporan',
    subtitle: 'Janakan dan muat turun laporan analisis sentimen',
    reportTemplate: 'Templat Laporan',
    savedTemplates: 'Templat Disimpan',
    templatePreview: 'Pratonton Templat',
    collapse: 'Kuncup',
    expand: 'Kembang',
    sectionsIncluded: 'bahagian disertakan',
    selectSections: 'Pilih Bahagian',
    saveAsTemplate: '+ Simpan sebagai templat',
    templateName: 'Nama templat',
    save: 'Simpan',
    cancel: 'Batal',
    topic: 'Topik',
    topicPlaceholder: 'cth. ekonomi, politik (biarkan kosong untuk semua)',
    compareWith: 'Bandingkan Dengan (Topik B)',
    comparePlaceholder: 'cth. politik, ekonomi',
    reportType: 'Jenis Laporan',
    fullReport: 'Laporan Penuh',
    topicSpecific: 'Khusus Topik',
    comparison: 'Perbandingan',
    from: 'Dari',
    to: 'Hingga',
    generating: 'Menghasilkan...',
    downloadPdf: 'Muat Turun PDF',
    history: 'Sejarah',
    clear: 'Padam',
    noHistory: 'Tiada laporan dijana lagi',
    reDownload: 'Muat Turun Semula',
    scheduleTitle: 'Laporan Berjadual',
    scheduleSubtitle: 'Janakan laporan secara automatik secara berkala',
    frequency: 'Kekerapan',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    scheduledTopic: 'Topik',
    scheduledTopicPlaceholder: 'cth. ekonomi (biarkan kosong untuk semua)',
    addSchedule: 'Tambah Jadual',
    noSchedules: 'Tiada laporan berjadual',
    scheduleFreq: 'Kekerapan',
    scheduleNextRun: 'Seterusnya',
    scheduleSections: 'Bahagian',
    customSections: 'ringkasan, carta, artikel, sumber, sentimen',
    removeSchedule: 'Buang',
    sectionsSummary: 'Ringkasan',
    sectionsCharts: 'Carta',
    sectionsArticles: 'Artikel',
    sectionsSources: 'Sumber',
    sectionsSentiment: 'Pecahan Sentimen',
    selectTemplateSections: 'Pilih Bahagian untuk Disertakan',
  },
};

/* ─── Template / Section constants ─────────────────────────────────── */
const TEMPLATES = [
  {
    id: 'executive',
    name: 'Executive Summary',
    description: 'High-level overview with key metrics and actionable insights for leadership.',
    sections: ['Key Findings', 'Sentiment Overview', 'Top Stories', 'Recommendations'],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    id: 'detailed',
    name: 'Detailed Analysis',
    description: 'Comprehensive breakdown with full sentiment data, source analysis, and methodology.',
    sections: ['Title Page', 'Executive Summary', 'Sentiment Breakdown', 'Source Analysis', 'Article Listing', 'Methodology', 'Appendices'],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    id: 'comparison',
    name: 'Comparison Report',
    description: 'Side-by-side analysis comparing sentiment across topics, time periods, or sources.',
    sections: ['Comparison Overview', 'Topic A Analysis', 'Topic B Analysis', 'Side-by-Side Metrics', 'Key Differences', 'Conclusions'],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Build your own report by selecting exactly which sections to include.',
    sections: [],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

const ALL_SECTIONS = [
  'Title Page',
  'Executive Summary',
  'Sentiment Breakdown',
  'Source Analysis',
  'Article Listing',
  'Methodology',
  'Key Findings',
  'Top Stories',
  'Recommendations',
  'Appendices',
  'Comparison Overview',
  'Side-by-Side Metrics',
  'Key Differences',
  'Conclusions',
];

/* Custom template section checkboxes (user-facing) */
const CUSTOM_SECTION_OPTIONS = [
  { key: 'summary', icon: FileText },
  { key: 'charts', icon: BarChart3 },
  { key: 'articles', icon: Newspaper },
  { key: 'sources', icon: Globe },
  { key: 'sentiment', icon: PieChart },
];

/* ─── Helpers ──────────────────────────────────────────────────────── */
const nextRunDate = (frequency) => {
  const d = new Date();
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
};

const fmtShort = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }); }
  catch { return iso; }
};

/* ─── Component ────────────────────────────────────────────────────── */
const Reports = () => {
  const [topic, setTopic] = useState('');
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const L = LABELS[lang] || LABELS.en;
  const isDark = theme === 'dark';

  const [topicB, setTopicB] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportType, setReportType] = useState('full');
  const [loading, setLoading] = useState(false);

  /* Template state */
  const [selectedTemplate, setSelectedTemplate] = useState('executive');
  const [showPreview, setShowPreview] = useState(false);
  const [customSections, setCustomSections] = useState([]);
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('custom-report-templates') || '[]'); } catch { return []; }
  });
  const [showSaveForm, setShowSaveForm] = useState(false);

  /* History */
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('report-history') || '[]'); } catch { return []; }
  });

  /* Scheduled reports */
  const [schedules, setSchedules] = useState(() => {
    try { return JSON.parse(localStorage.getItem('scheduled-reports') || '[]'); } catch { return []; }
  });
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [scheduleTopic, setScheduleTopic] = useState('');
  const [scheduleSections, setScheduleSections] = useState(['summary', 'charts', 'articles', 'sources', 'sentiment']);
  const [expandedSchedule, setExpandedSchedule] = useState(null);

  const activeTemplate = selectedTemplate === 'custom'
    ? { id: 'custom', name: 'Custom', sections: customSections }
    : TEMPLATES.find(t => t.id === selectedTemplate);

  /* ─── Custom template helpers ──────────────────────────────────── */
  const toggleCustomSection = (section) => {
    setCustomSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const saveCustomTemplate = useCallback(() => {
    if (!customTemplateName.trim() || customSections.length === 0) return;
    const newTemplate = {
      id: `custom-${Date.now()}`,
      name: customTemplateName.trim(),
      sections: [...customSections],
      createdAt: new Date().toISOString(),
    };
    const updated = [...savedTemplates, newTemplate];
    setSavedTemplates(updated);
    localStorage.setItem('custom-report-templates', JSON.stringify(updated));
    setShowSaveForm(false);
    setCustomTemplateName('');
  }, [customTemplateName, customSections, savedTemplates]);

  const deleteSavedTemplate = (id) => {
    const updated = savedTemplates.filter(t => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem('custom-report-templates', JSON.stringify(updated));
  };

  const loadSavedTemplate = (template) => {
    setSelectedTemplate('custom');
    setCustomSections(template.sections);
  };

  /* ─── Schedule helpers ─────────────────────────────────────────── */
  const toggleScheduleSection = (key) => {
    setScheduleSections(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const addSchedule = () => {
    const entry = {
      id: Date.now(),
      frequency: scheduleFrequency,
      topic: scheduleTopic.trim() || 'All Topics',
      sections: [...scheduleSections],
      template: activeTemplate?.name || 'Custom',
      createdAt: new Date().toISOString(),
      nextRun: nextRunDate(scheduleFrequency),
    };
    const updated = [...schedules, entry];
    setSchedules(updated);
    localStorage.setItem('scheduled-reports', JSON.stringify(updated));
    setShowScheduleForm(false);
    setScheduleTopic('');
  };

  const removeSchedule = (id) => {
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    localStorage.setItem('scheduled-reports', JSON.stringify(updated));
  };

  /* ─── Report generation ────────────────────────────────────────── */
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const endpoint = reportType === 'topic' ? '/reports/topic' : '/api/reports/generate';
      const payload = {
        topic,
        topicB,
        dateFrom,
        dateTo,
        template: selectedTemplate,
        sections: selectedTemplate === 'custom' ? customSections : activeTemplate?.sections,
      };
      const response = await api.post(endpoint, payload, { responseType: 'blob' });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentiment-report-${topic || 'all'}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      const entry = {
        id: Date.now(),
        topic: topic || 'All Topics',
        dateFrom: dateFrom || 'All time',
        dateTo: dateTo || 'Present',
        type: reportType,
        template: activeTemplate?.name || 'Custom',
        generatedAt: new Date().toISOString(),
      };
      const newHistory = [entry, ...history].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem('report-history', JSON.stringify(newHistory));
    } catch (err) {
      console.error('Report generation failed:', err);
      let errMsg = 'Failed to generate report. Please try again.';
      try {
        if (err.response?.data instanceof Blob) {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          errMsg = parsed.error || errMsg;
        } else if (err.response?.data?.error) {
          errMsg = err.response.data.error;
        }
      } catch (e) { /* ignore */ }
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  /* Re-download triggers the same generation flow using stored params */
  const handleRedownload = async (entry) => {
    setTopic(entry.topic === 'All Topics' ? '' : entry.topic);
    setDateFrom(entry.dateFrom === 'All time' ? '' : entry.dateFrom);
    setDateTo(entry.dateTo === 'Present' ? '' : entry.dateTo);
    setReportType(entry.type || 'full');
    /* small timeout so state settles before generating */
    setTimeout(() => handleGenerate(), 60);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('report-history');
  };

  /* ─── Section label resolver ───────────────────────────────────── */
  const sectionLabel = (key) => {
    const map = {
      summary: L.sectionsSummary,
      charts: L.sectionsCharts,
      articles: L.sectionsArticles,
      sources: L.sectionsSources,
      sentiment: L.sectionsSentiment,
    };
    return map[key] || key;
  };

  /* ─── Reusable UI atoms ────────────────────────────────────────── */
  const Label = ({ children }) => (
    <label className="block text-[10px] font-medium text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em]">
      {children}
    </label>
  );

  const inputCls = "w-full px-3 py-2.5 border border-ink/10 dark:border-paper/10 bg-white dark:bg-[#111] text-sm text-ink dark:text-paper focus:outline-none focus:border-ink dark:focus:border-paper";

  /* ─── Render ────────────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="border-b-2 border-ink dark:border-paper pb-3">
        <h1 className="font-['Playfair_Display'] text-2xl font-black text-ink dark:text-paper tracking-tight uppercase">
          {L.reports}
        </h1>
        <p className="text-[10px] text-ink-muted dark:text-ink-faint mt-1 uppercase tracking-[0.2em]">
          {L.subtitle}
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FEATURE 1 — SCHEDULED REPORTS
          ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="border-b-2 border-ink/10 dark:border-paper/10 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-ink dark:text-paper" />
            <h2 className="font-['Playfair_Display'] text-sm font-bold text-ink dark:text-paper uppercase tracking-wide">
              {L.scheduleTitle}
            </h2>
          </div>
          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-ink dark:border-paper text-[10px] font-medium text-ink dark:text-paper uppercase tracking-[0.15em] hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink transition-all"
          >
            <Plus size={10} />
            {L.addSchedule}
          </button>
        </div>

        <p className="text-[10px] text-ink-muted dark:text-ink-faint uppercase tracking-[0.15em]">
          {L.scheduleSubtitle}
        </p>

        {/* Schedule form */}
        <AnimatePresence>
          {showScheduleForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border border-ink/10 dark:border-paper/10 p-4 space-y-4">
                {/* Frequency */}
                <div>
                  <Label>{L.frequency}</Label>
                  <div className="flex gap-2 mt-2">
                    {[
                      { value: 'weekly', label: L.weekly },
                      { value: 'monthly', label: L.monthly },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setScheduleFrequency(opt.value)}
                        className={`flex-1 py-2.5 border text-xs font-medium uppercase tracking-[0.1em] transition-all ${
                          scheduleFrequency === opt.value
                            ? 'border-ink dark:border-paper bg-ink/5 dark:bg-paper/5 text-ink dark:text-paper'
                            : 'border-ink/10 dark:border-paper/10 text-ink-muted dark:text-ink-faint hover:border-ink/30 dark:hover:border-paper/30'
                        }`}
                      >
                        <Clock size={12} className="inline mr-1.5 -mt-0.5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic */}
                <div>
                  <Label>{L.scheduledTopic}</Label>
                  <input
                    type="text"
                    value={scheduleTopic}
                    onChange={e => setScheduleTopic(e.target.value)}
                    placeholder={L.scheduledTopicPlaceholder}
                    className={`${inputCls} mt-2 placeholder-ink-muted/50 dark:placeholder-ink-faint/50`}
                  />
                </div>

                {/* Section toggles */}
                <div>
                  <Label>{L.selectTemplateSections}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {CUSTOM_SECTION_OPTIONS.map((opt) => {
                      const active = scheduleSections.includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          onClick={() => toggleScheduleSection(opt.key)}
                          className={`flex items-center gap-2 px-3 py-2 border text-xs uppercase tracking-wide transition-all ${
                            active
                              ? 'border-ink dark:border-paper text-ink dark:text-paper bg-ink/5 dark:bg-paper/5'
                              : 'border-ink/10 dark:border-paper/10 text-ink-muted dark:text-ink-faint hover:border-ink/30 dark:hover:border-paper/30'
                          }`}
                        >
                          <span className={`w-3 h-3 border flex items-center justify-center ${
                            active ? 'border-ink dark:border-paper' : 'border-ink/20 dark:border-paper/20'
                          }`}>
                            {active && <Check size={8} strokeWidth={3} />}
                          </span>
                          {sectionLabel(opt.key)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={addSchedule}
                    disabled={scheduleSections.length === 0}
                    className="px-5 py-2.5 border border-ink dark:border-paper text-xs font-medium text-ink dark:text-paper uppercase tracking-[0.15em] hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink disabled:opacity-30 transition-all"
                  >
                    {L.save}
                  </button>
                  <button
                    onClick={() => setShowScheduleForm(false)}
                    className="px-4 py-2.5 text-xs text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper uppercase tracking-[0.1em] transition-colors"
                  >
                    {L.cancel}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schedule list */}
        {schedules.length === 0 && !showScheduleForm && (
          <p className="text-xs text-ink-muted dark:text-ink-faint italic">
            {L.noSchedules}
          </p>
        )}

        {schedules.length > 0 && (
          <div className="divide-y divide-ink/5 dark:divide-paper/5 border border-ink/10 dark:border-paper/10">
            {schedules.map((sch) => (
              <div key={sch.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-bold uppercase tracking-[0.15em] ${
                      sch.frequency === 'weekly'
                        ? 'border-ink dark:border-paper text-ink dark:text-paper'
                        : 'border-ink/30 dark:border-paper/30 text-ink-muted dark:text-ink-faint'
                    }`}>
                      <Clock size={10} />
                      {sch.frequency === 'weekly' ? L.weekly : L.monthly}
                    </span>
                    <span className="text-sm font-medium text-ink dark:text-paper">{sch.topic}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-ink-muted dark:text-ink-faint uppercase tracking-[0.1em]">
                      {L.scheduleNextRun}: {fmtShort(sch.nextRun)}
                    </span>
                    <button
                      onClick={() => setExpandedSchedule(expandedSchedule === sch.id ? null : sch.id)}
                      className="text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-colors"
                    >
                      {expandedSchedule === sch.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => removeSchedule(sch.id)}
                      className="text-ink-muted dark:text-ink-faint hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedSchedule === sch.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 mt-3 border-t border-ink/5 dark:border-paper/5 space-y-2">
                        <p className="text-[10px] text-ink-muted dark:text-ink-faint uppercase tracking-[0.15em]">
                          {L.scheduleSections}:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {sch.sections.map((sec) => (
                            <span
                              key={sec}
                              className="text-[10px] px-2 py-0.5 border border-ink/10 dark:border-paper/10 text-ink-muted dark:text-ink-faint uppercase tracking-wide"
                            >
                              {sectionLabel(sec)}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-ink-muted dark:text-ink-faint">
                          Template: {sch.template} &middot; Created {fmtDate(sch.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TEMPLATE SELECTION (existing)
          ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <Label>{L.reportTemplate}</Label>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`text-left p-3 border transition-all ${
                selectedTemplate === template.id
                  ? 'border-ink dark:border-paper bg-ink/5 dark:bg-paper/5'
                  : 'border-ink/10 dark:border-paper/10 hover:border-ink/30 dark:hover:border-paper/30'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className={`mt-0.5 ${selectedTemplate === template.id ? 'text-ink dark:text-paper' : 'text-ink-muted dark:text-ink-faint'}`}>
                  {template.icon}
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-bold uppercase tracking-wide ${
                    selectedTemplate === template.id ? 'text-ink dark:text-paper' : 'text-ink-muted dark:text-ink-faint'
                  }`}>
                    {template.name}
                  </p>
                  <p className="text-[11px] text-ink-muted dark:text-ink-faint mt-0.5 leading-snug">
                    {template.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Saved custom templates */}
        {savedTemplates.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em]">
              {L.savedTemplates}
            </p>
            <div className="flex flex-wrap gap-2">
              {savedTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center gap-2 px-3 py-1.5 border border-ink/10 dark:border-paper/10 text-xs text-ink dark:text-paper"
                >
                  <button
                    onClick={() => loadSavedTemplate(tpl)}
                    className="hover:underline"
                  >
                    {tpl.name}
                  </button>
                  <button
                    onClick={() => deleteSavedTemplate(tpl.id)}
                    className="text-ink-muted dark:text-ink-faint hover:text-red-500 transition-colors ml-1"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Template Preview */}
      <div className="border border-ink/10 dark:border-paper/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em]">
            {L.templatePreview}
          </p>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-[10px] text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper uppercase tracking-[0.2em] transition-colors"
          >
            {showPreview ? L.collapse : L.expand}
          </button>
        </div>

        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border border-ink/5 dark:border-paper/5 bg-ink/[0.02] dark:bg-paper/[0.02] p-4 space-y-3">
                <div className="border-b border-ink/10 dark:border-paper/10 pb-2">
                  <p className="font-['Playfair_Display'] text-sm font-bold text-ink dark:text-paper uppercase">
                    {activeTemplate?.name || 'Custom Template'}
                  </p>
                  <p className="text-[10px] text-ink-muted dark:text-ink-faint mt-0.5">
                    {activeTemplate?.sections?.length || 0} {L.sectionsIncluded}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {(activeTemplate?.sections || []).length > 0 ? (
                    (activeTemplate?.sections || []).map((section, i) => (
                      <div key={section} className="flex items-center gap-2 text-xs text-ink-muted dark:text-ink-faint">
                        <span className="text-[10px] font-mono text-ink/30 dark:text-paper/30 w-4">{String(i + 1).padStart(2, '0')}</span>
                        <span>{section}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-ink-muted dark:text-ink-faint italic">
                      Select sections below to build your custom template
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showPreview && activeTemplate?.sections?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeTemplate.sections.map((section) => (
              <span
                key={section}
                className="text-[10px] px-2 py-0.5 border border-ink/10 dark:border-paper/10 text-ink-muted dark:text-ink-faint"
              >
                {section}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FEATURE 2 — CUSTOM SECTION PICKER
          ═══════════════════════════════════════════════════════════ */}
      {selectedTemplate === 'custom' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-[10px] font-medium text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em]">
            {L.selectSections}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ALL_SECTIONS.map((section) => (
              <button
                key={section}
                onClick={() => toggleCustomSection(section)}
                className={`text-left px-3 py-2 border text-xs transition-all ${
                  customSections.includes(section)
                    ? 'border-ink dark:border-paper text-ink dark:text-paper bg-ink/5 dark:bg-paper/5'
                    : 'border-ink/10 dark:border-paper/10 text-ink-muted dark:text-ink-faint hover:border-ink/30 dark:hover:border-paper/30'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-3 h-3 border flex items-center justify-center ${
                    customSections.includes(section) ? 'border-ink dark:border-paper' : 'border-ink/20 dark:border-paper/20'
                  }`}>
                    {customSections.includes(section) && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </span>
                  {section}
                </span>
              </button>
            ))}
          </div>

          {/* Save custom template */}
          {customSections.length > 0 && (
            <div className="pt-2">
              {showSaveForm ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customTemplateName}
                    onChange={e => setCustomTemplateName(e.target.value)}
                    placeholder={L.templateName}
                    className={`${inputCls} flex-1 placeholder-ink-muted/50 dark:placeholder-ink-faint/50`}
                  />
                  <button
                    onClick={saveCustomTemplate}
                    disabled={!customTemplateName.trim()}
                    className="px-4 py-2 border border-ink dark:border-paper text-xs font-medium text-ink dark:text-paper uppercase tracking-[0.15em] hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink disabled:opacity-30 transition-all"
                  >
                    {L.save}
                  </button>
                  <button
                    onClick={() => { setShowSaveForm(false); setCustomTemplateName(''); }}
                    className="px-3 py-2 text-xs text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-colors"
                  >
                    {L.cancel}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="text-[10px] text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper uppercase tracking-[0.2em] transition-colors"
                >
                  {L.saveAsTemplate}
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Generate Form ───────────────────────────────────────── */}
      <div className="space-y-4 border-t border-ink/10 dark:border-paper/10 pt-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>{L.topic}</Label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder={L.topicPlaceholder}
              className={`${inputCls} mt-1.5 placeholder-ink-muted/50 dark:placeholder-ink-faint/50`}
            />
          </div>

          {selectedTemplate === 'comparison' && (
            <div>
              <Label>{L.compareWith}</Label>
              <input
                type="text"
                value={topicB}
                onChange={e => setTopicB(e.target.value)}
                placeholder={L.comparePlaceholder}
                className={`${inputCls} mt-1.5 placeholder-ink-muted/50 dark:placeholder-ink-faint/50`}
              />
            </div>
          )}

          <div>
            <Label>{L.reportType}</Label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className={`${inputCls} mt-1.5`}
            >
              <option value="full">{L.fullReport}</option>
              <option value="topic">{L.topicSpecific}</option>
              <option value="comparison">{L.comparison}</option>
            </select>
          </div>

          <div>
            <Label>{L.from}</Label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className={`${inputCls} mt-1.5`}
            />
          </div>

          <div>
            <Label>{L.to}</Label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className={`${inputCls} mt-1.5`}
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || (selectedTemplate === 'custom' && customSections.length === 0) || (selectedTemplate === 'comparison' && !topicB.trim())}
          className="px-5 py-2.5 text-sm font-medium border border-ink dark:border-paper text-ink dark:text-paper hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink disabled:opacity-30 transition-all flex items-center gap-2 uppercase tracking-[0.1em]"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-ink dark:border-paper border-t-transparent animate-spin" />
              {L.generating}
            </>
          ) : (
            <>
              <Download size={14} />
              {L.downloadPdf}
            </>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FEATURE 3 — REPORT HISTORY with re-download
          ═══════════════════════════════════════════════════════════ */}
      <div className="border-t border-ink/10 dark:border-paper/10 pt-5 space-y-3">
        <div className="flex items-center justify-between border-b-2 border-ink/10 dark:border-paper/10 pb-2">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-ink dark:text-paper" />
            <h2 className="font-['Playfair_Display'] text-sm font-bold text-ink dark:text-paper uppercase tracking-wide">
              {L.history}
            </h2>
            {history.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 border border-ink/10 dark:border-paper/10 text-ink-muted dark:text-ink-faint font-mono">
                {history.length}
              </span>
            )}
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-[10px] text-ink-muted dark:text-ink-faint hover:text-red-500 uppercase tracking-[0.15em] transition-colors"
            >
              {L.clear}
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-ink-muted dark:text-ink-faint italic py-4 text-center">
            {L.noHistory}
          </p>
        ) : (
          <div className="divide-y divide-ink/5 dark:divide-paper/5">
            {history.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between py-3 group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink dark:text-paper truncate">{entry.topic}</p>
                  <p className="text-[10px] text-ink-muted dark:text-ink-faint uppercase tracking-[0.15em]">
                    {entry.template || entry.type} &middot; {entry.dateFrom} — {entry.dateTo}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span className="text-[10px] text-ink-muted dark:text-ink-faint whitespace-nowrap">
                    {fmtDate(entry.generatedAt)}
                  </span>
                  <button
                    onClick={() => handleRedownload(entry)}
                    title={L.reDownload}
                    className="opacity-0 group-hover:opacity-100 text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-all"
                  >
                    <Download size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Reports;
