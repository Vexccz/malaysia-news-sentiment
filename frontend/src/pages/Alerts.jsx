import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

// ─── localStorage helpers ────────────────────────────────────────────
const LS_RULES = 'mns_alert_rules';
const LS_HISTORY = 'mns_alert_history';
const LS_QUIET = 'mns_quiet_hours';

const loadLS = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
};
const saveLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));

// ─── Translations ────────────────────────────────────────────────────
const translations = {
  EN: {
    alerts: 'Alerts',
    alertsSub: 'Get notified when news matches your criteria',
    createAlert: 'Create Alert',
    editAlert: 'Edit Alert',
    alertType: 'Alert Type',
    telegramChatId: 'Telegram Chat ID',
    sentimentFilter: 'Sentiment Filter',
    anySentiment: 'Any sentiment',
    negativeOnly: 'Negative only',
    positiveOnly: 'Positive only',
    confidenceThreshold: 'Confidence Threshold',
    topics: 'Topics (comma-separated)',
    topicsPlaceholder: 'e.g. economy, politics, education',
    sources: 'Sources (comma-separated)',
    sourcesPlaceholder: 'e.g. The Star, Malaysiakini',
    cancel: 'Cancel',
    update: 'Update',
    create: 'Create',
    noAlerts: 'No alerts yet',
    noAlertsSub: 'Create your first alert to get notified about news sentiment changes',
    // Rules builder
    rulesBuilder: 'Alert Rules Builder',
    rulesBuilderSub: 'Define custom rules to trigger notifications',
    ruleName: 'Rule Name',
    ruleNamePlaceholder: 'e.g. High negative sentiment in politics',
    condition: 'Condition',
    field: 'Field',
    operator: 'Operator',
    value: 'Value',
    addCondition: 'Add Condition',
    removeCondition: 'Remove',
    saveRule: 'Save Rule',
    deleteRule: 'Delete',
    noRules: 'No rules defined yet',
    noRulesSub: 'Create rules to receive targeted alerts',
    sentiment: 'Sentiment',
    topic: 'Topic',
    source: 'Source',
    greaterThan: 'greater than',
    lessThan: 'less than',
    equals: 'equals',
    contains: 'contains',
    // History
    alertHistory: 'Alert History',
    alertHistorySub: 'Log of all triggered alerts',
    noHistory: 'No alerts triggered yet',
    noHistorySub: 'Triggered alerts will appear here',
    triggered: 'Triggered',
    cleared: 'Clear History',
    matched: 'Matched',
    rule: 'Rule',
    // Quiet hours
    quietHours: 'Quiet Hours',
    quietHoursSub: 'Suppress notifications during set hours',
    enabled: 'Enabled',
    disabled: 'Disabled',
    startTime: 'Start Time',
    endTime: 'End Time',
    saveQuietHours: 'Save',
    quietActive: 'Quiet hours active — notifications suppressed',
    // Tabs
    tabServerAlerts: 'Server Alerts',
    tabRules: 'Rules',
    tabHistory: 'History',
    tabQuietHours: 'Quiet Hours',
  },
  BM: {
    alerts: 'Amaran',
    alertsSub: 'Dapatkan pemberitahuan apabila berita memenuhi kriteria anda',
    createAlert: 'Cipta Amaran',
    editAlert: 'Sunting Amaran',
    alertType: 'Jenis Amaran',
    telegramChatId: 'ID Chat Telegram',
    sentimentFilter: 'Penapis Sentimen',
    anySentiment: 'Apa-apa sentimen',
    negativeOnly: 'Negatif sahaja',
    positiveOnly: 'Positif sahaja',
    confidenceThreshold: 'Ambang Keyakinan',
    topics: 'Topik (dipisahkan koma)',
    topicsPlaceholder: 'cth. ekonomi, politik, pendidikan',
    sources: 'Sumber (dipisahkan koma)',
    sourcesPlaceholder: 'cth. The Star, Malaysiakini',
    cancel: 'Batal',
    update: 'Kemaskini',
    create: 'Cipta',
    noAlerts: 'Tiada amaran lagi',
    noAlertsSub: 'Cipta amaran pertama anda untuk diberitahu tentang perubahan sentimen berita',
    // Rules builder
    rulesBuilder: 'Pembina Peraturan Amaran',
    rulesBuilderSub: 'Tentukan peraturan tersuai untuk mencetuskan pemberitahuan',
    ruleName: 'Nama Peraturan',
    ruleNamePlaceholder: 'cth. Sentimen negatif tinggi dalam politik',
    condition: 'Syarat',
    field: 'Medan',
    operator: 'Operator',
    value: 'Nilai',
    addCondition: 'Tambah Syarat',
    removeCondition: 'Buang',
    saveRule: 'Simpan Peraturan',
    deleteRule: 'Padam',
    noRules: 'Tiada peraturan ditakrifkan',
    noRulesSub: 'Cipta peraturan untuk menerima amaran yang disasarkan',
    sentiment: 'Sentimen',
    topic: 'Topik',
    source: 'Sumber',
    greaterThan: 'lebih besar daripada',
    lessThan: 'kurang daripada',
    equals: 'sama dengan',
    contains: 'mengandungi',
    // History
    alertHistory: 'Sejarah Amaran',
    alertHistorySub: 'Log semua amaran yang dicetuskan',
    noHistory: 'Tiada amaran dicetuskan lagi',
    noHistorySub: 'Amaran yang dicetuskan akan muncul di sini',
    triggered: 'Dicetuskan',
    cleared: 'Padam Sejarah',
    matched: 'Sepadan',
    rule: 'Peraturan',
    // Quiet hours
    quietHours: 'Waktu Senyap',
    quietHoursSub: 'Redam pemberitahuan dalam waktu ditetapkan',
    enabled: 'Diaktifkan',
    disabled: 'Dilumpuhkan',
    startTime: 'Masa Mula',
    endTime: 'Masa Tamat',
    saveQuietHours: 'Simpan',
    quietActive: 'Waktu senyap aktif — pemberitahuan disenyapkan',
    // Tabs
    tabServerAlerts: 'Amaran Pelayan',
    tabRules: 'Peraturan',
    tabHistory: 'Sejarah',
    tabQuietHours: 'Waktu Senyap',
  },
};

// ─── Available fields/operators for rule builder ─────────────────────
const FIELDS = ['sentiment', 'topic', 'source'];
const OPERATORS = ['greaterThan', 'lessThan', 'equals', 'contains'];

// ─── Tab button component ────────────────────────────────────────────
const Tab = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] border-b-2 transition-colors ${
      active
        ? 'border-black dark:border-white text-black dark:text-white'
        : 'border-transparent text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white'
    }`}
  >
    {children}
  </button>
);

const Alerts = () => {
  // ── Server alerts state (existing) ──────────────────────────────────
  const [alerts, setAlerts] = useState([]);
  const { t, lang } = useLanguage();
  const tr = translations[lang] || translations.EN;
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [form, setForm] = useState({
    type: 'email',
    sentiment: 'any',
    threshold: 0.7,
    topics: '',
    sources: '',
    telegramChatId: '',
  });

  // ── Tab state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('server');

  // ── Alert rules state (localStorage) ────────────────────────────────
  const [rules, setRules] = useState(() => loadLS(LS_RULES, []));
  const [ruleForm, setRuleForm] = useState({
    name: '',
    conditions: [{ field: 'sentiment', operator: 'greaterThan', value: '70' }],
  });

  // ── Alert history state (localStorage) ──────────────────────────────
  const [history, setHistory] = useState(() => loadLS(LS_HISTORY, []));

  // ── Quiet hours state (localStorage) ────────────────────────────────
  const [quietHours, setQuietHours] = useState(() =>
    loadLS(LS_QUIET, { enabled: false, start: '22:00', end: '07:00' })
  );

  // Persist to localStorage on change
  useEffect(() => { saveLS(LS_RULES, rules); }, [rules]);
  useEffect(() => { saveLS(LS_HISTORY, history); }, [history]);
  useEffect(() => { saveLS(LS_QUIET, quietHours); }, [quietHours]);

  // ── Fetch server alerts (existing) ──────────────────────────────────
  useEffect(() => { fetchAlerts(); }, []);

  const fetchAlerts = async () => {
    try {
      const { data } = await api.get('/alerts');
      setAlerts(data.alerts || []);
    } catch (err) {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const payload = {
        type: form.type,
        conditions: {
          sentiment: form.sentiment,
          threshold: parseFloat(form.threshold),
          topics: form.topics ? form.topics.split(',').map(t => t.trim()).filter(Boolean) : [],
          sources: form.sources ? form.sources.split(',').map(s => s.trim()).filter(Boolean) : [],
        },
        telegramChatId: form.type === 'telegram' ? form.telegramChatId : undefined,
      };

      if (editingAlert) {
        const { data } = await api.put(`/alerts/${editingAlert._id}`, payload);
        setAlerts(prev => prev.map(a => a._id === editingAlert._id ? data.alert : a));
        toast.success('Alert updated');
      } else {
        const { data } = await api.post('/alerts', payload);
        setAlerts(prev => [data.alert, ...prev]);
        toast.success('Alert created');
      }

      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save alert');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts(prev => prev.filter(a => a._id !== id));
      toast.success('Alert deleted');
    } catch (err) {
      toast.error('Failed to delete alert');
    }
  };

  const handleToggle = async (alert) => {
    try {
      const { data } = await api.put(`/alerts/${alert._id}`, { enabled: !alert.enabled });
      setAlerts(prev => prev.map(a => a._id === alert._id ? data.alert : a));
    } catch (err) {
      toast.error('Failed to toggle alert');
    }
  };

  const handleTest = async (alertId) => {
    try {
      await api.post('/alerts/test', { alertId });
      toast.success('Test notification sent!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Test failed');
    }
  };

  const openEdit = (alert) => {
    setEditingAlert(alert);
    setForm({
      type: alert.type,
      sentiment: alert.conditions?.sentiment || 'any',
      threshold: alert.conditions?.threshold || 0.7,
      topics: (alert.conditions?.topics || []).join(', '),
      sources: (alert.conditions?.sources || []).join(', '),
      telegramChatId: alert.telegramChatId || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAlert(null);
    setForm({ type: 'email', sentiment: 'any', threshold: 0.7, topics: '', sources: '', telegramChatId: '' });
  };

  // ── Rule builder helpers ────────────────────────────────────────────
  const addCondition = () => {
    setRuleForm(f => ({
      ...f,
      conditions: [...f.conditions, { field: 'sentiment', operator: 'greaterThan', value: '70' }],
    }));
  };

  const updateCondition = (idx, key, val) => {
    setRuleForm(f => ({
      ...f,
      conditions: f.conditions.map((c, i) => i === idx ? { ...c, [key]: val } : c),
    }));
  };

  const removeCondition = (idx) => {
    setRuleForm(f => ({
      ...f,
      conditions: f.conditions.filter((_, i) => i !== idx),
    }));
  };

  const saveRule = () => {
    if (!ruleForm.name.trim()) return toast.error('Rule name required');
    if (ruleForm.conditions.length === 0) return toast.error('Add at least one condition');

    const newRule = { id: Date.now().toString(), ...ruleForm, createdAt: new Date().toISOString() };
    setRules(prev => [...prev, newRule]);
    setRuleForm({ name: '', conditions: [{ field: 'sentiment', operator: 'greaterThan', value: '70' }] });
    toast.success('Rule saved');
  };

  const deleteRule = (id) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success('Rule deleted');
  };

  // ── Simulate triggering an alert (for demo purposes) ───────────────
  const triggerDemoAlert = useCallback(() => {
    if (rules.length === 0) return toast.error('No rules to trigger');
    const rule = rules[Math.floor(Math.random() * rules.length)];
    const entry = {
      id: Date.now().toString(),
      ruleId: rule.id,
      ruleName: rule.name,
      triggeredAt: new Date().toISOString(),
      conditions: rule.conditions,
    };
    setHistory(prev => [entry, ...prev]);
    toast.success(`Alert triggered: ${rule.name}`);
  }, [rules]);

  // ── Quiet hours check ──────────────────────────────────────────────
  const isQuietHoursActive = useCallback(() => {
    if (!quietHours.enabled) return false;
    const now = new Date();
    const [sh, sm] = quietHours.start.split(':').map(Number);
    const [eh, em] = quietHours.end.split(':').map(Number);
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    if (startMin <= endMin) {
      return currentMin >= startMin && currentMin < endMin;
    }
    // Wraps midnight
    return currentMin >= startMin || currentMin < endMin;
  }, [quietHours]);

  // ── Loading state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-500 dark:text-[#999] text-sm uppercase tracking-[0.18em]">Loading alerts…</p>
        <div className="w-16 border-b-2 border-[#e5e5e5] dark:border-[#222]" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-black dark:text-white tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {tr.alerts}
          </h1>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
            {tr.alertsSub}
          </p>
          <div className="mt-3 border-b-2 border-[#e5e5e5] dark:border-[#222]" />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black text-[11px] font-medium uppercase tracking-[0.18em] hover:opacity-80 transition-colors flex items-center gap-2 mt-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {tr.createAlert}
        </button>
      </div>

      {/* Quiet hours warning banner */}
      {isQuietHoursActive() && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b-2 border-[#FBBF24] bg-[#FFFBEB] dark:bg-[#1a1700] p-3 flex items-center gap-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#FBBF24] shrink-0">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <span className="text-[11px] uppercase tracking-[0.18em] text-[#92400E] dark:text-[#FBBF24] font-medium">
            {tr.quietActive}
          </span>
        </motion.div>
      )}

      {/* Tab bar */}
      <div className="border-b border-[#e5e5e5] dark:border-[#222] flex gap-0">
        <Tab active={activeTab === 'server'} onClick={() => setActiveTab('server')}>
          {tr.tabServerAlerts}
        </Tab>
        <Tab active={activeTab === 'rules'} onClick={() => setActiveTab('rules')}>
          {tr.tabRules}
        </Tab>
        <Tab active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
          {tr.tabHistory}
        </Tab>
        <Tab active={activeTab === 'quiet'} onClick={() => setActiveTab('quiet')}>
          {tr.tabQuietHours}
        </Tab>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: Server Alerts (existing functionality)                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'server' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          {alerts.length === 0 ? (
            <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-12 text-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-200 dark:text-[#333] mb-4">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <h3 className="text-lg font-semibold text-black dark:text-white mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {tr.noAlerts}
              </h3>
              <p className="text-sm text-gray-500 dark:text-[#999]">{tr.noAlertsSub}</p>
            </div>
          ) : (
            <div className="border border-[#e5e5e5] dark:border-[#222] divide-y divide-[#e5e5e5] dark:divide-[#222]">
              <AnimatePresence>
                {alerts.map((alert, i) => {
                  const severityColor = alert.conditions?.sentiment === 'negative' ? 'bg-[#FB7185]' :
                    alert.conditions?.sentiment === 'positive' ? 'bg-[#4ADE80]' : 'bg-[#FBBF24]';
                  return (
                    <motion.div
                      key={alert._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white dark:bg-[#111] p-5 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-1 h-8 ${severityColor}`} />
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] border border-[#e5e5e5] dark:border-[#222] text-gray-600 dark:text-[#999]">
                              {alert.type}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${
                              alert.conditions?.sentiment === 'negative'
                                ? 'text-[#FB7185]'
                                : alert.conditions?.sentiment === 'positive'
                                ? 'text-[#4ADE80]'
                                : 'text-[#FBBF24]'
                            }`}>
                              {alert.conditions?.sentiment || 'any'}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.18em]">
                              ≥{Math.round((alert.conditions?.threshold || 0.7) * 100)}%
                            </span>
                          </div>

                          {(alert.conditions?.topics?.length > 0 || alert.conditions?.sources?.length > 0) && (
                            <div className="flex flex-wrap gap-1.5 mt-2 ml-4">
                              {alert.conditions.topics?.map(t => (
                                <span key={t} className="px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] border border-[#e5e5e5] dark:border-[#222]">{t}</span>
                              ))}
                              {alert.conditions.sources?.map(s => (
                                <span key={s} className="px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] border border-[#e5e5e5] dark:border-[#222]">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggle(alert)}
                            className={`relative w-10 h-5 transition-colors ${
                              alert.enabled ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-[#333]'
                            }`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white dark:bg-black transition-transform ${
                              alert.enabled ? 'translate-x-5' : 'translate-x-0.5'
                            }`} />
                          </button>
                          <button
                            onClick={() => handleTest(alert._id)}
                            className="p-2 text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white transition-colors"
                            title="Send test"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => openEdit(alert)}
                            className="p-2 text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(alert._id)}
                            className="p-2 text-gray-400 dark:text-[#666] hover:text-[#FB7185] transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: Alert Rules Builder                                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'rules' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
          {/* Section header */}
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {tr.rulesBuilder}
            </h2>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
              {tr.rulesBuilderSub}
            </p>
            <div className="mt-2 border-b-2 border-[#e5e5e5] dark:border-[#222]" />
          </div>

          {/* Rule form */}
          <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-5 space-y-4">
            {/* Rule name */}
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">{tr.ruleName}</label>
              <input
                type="text"
                value={ruleForm.name}
                onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))}
                placeholder={tr.ruleNamePlaceholder}
                className="w-full px-3 py-2.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#666] focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-2">{tr.condition}</label>
              <div className="space-y-2">
                {ruleForm.conditions.map((cond, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {/* Field selector */}
                    <select
                      value={cond.field}
                      onChange={e => updateCondition(idx, 'field', e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-xs text-black dark:text-white uppercase tracking-[0.18em] focus:outline-none focus:border-black dark:focus:border-white"
                    >
                      {FIELDS.map(f => <option key={f} value={f}>{tr[f]}</option>)}
                    </select>

                    {/* Operator selector */}
                    <select
                      value={cond.operator}
                      onChange={e => updateCondition(idx, 'operator', e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-xs text-black dark:text-white uppercase tracking-[0.18em] focus:outline-none focus:border-black dark:focus:border-white"
                    >
                      {OPERATORS.map(o => <option key={o} value={o}>{tr[o]}</option>)}
                    </select>

                    {/* Value input */}
                    <input
                      type="text"
                      value={cond.value}
                      onChange={e => updateCondition(idx, 'value', e.target.value)}
                      placeholder={tr.value}
                      className="flex-1 px-3 py-2 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-xs text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#666] focus:outline-none focus:border-black dark:focus:border-white"
                    />

                    {/* Remove button */}
                    {ruleForm.conditions.length > 1 && (
                      <button
                        onClick={() => removeCondition(idx)}
                        className="p-2 text-gray-400 dark:text-[#666] hover:text-[#FB7185] transition-colors"
                        title={tr.removeCondition}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addCondition}
                className="mt-3 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] border border-[#e5e5e5] dark:border-[#222] text-gray-500 dark:text-[#999] hover:border-black dark:hover:border-white transition-colors flex items-center gap-1.5"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {tr.addCondition}
              </button>
            </div>

            {/* Save button */}
            <button
              onClick={saveRule}
              className="w-full py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-colors"
            >
              {tr.saveRule}
            </button>
          </div>

          {/* Existing rules list */}
          {rules.length === 0 ? (
            <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-8 text-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-200 dark:text-[#333] mb-3">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <h3 className="text-base font-semibold text-black dark:text-white mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {tr.noRules}
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#999]">{tr.noRulesSub}</p>
            </div>
          ) : (
            <div className="border border-[#e5e5e5] dark:border-[#222] divide-y divide-[#e5e5e5] dark:divide-[#222]">
              <AnimatePresence>
                {rules.map((rule, i) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white dark:bg-[#111] p-4 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-black dark:text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                          {rule.name}
                        </h4>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {rule.conditions.map((c, ci) => (
                            <span key={ci} className="px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] border border-[#e5e5e5] dark:border-[#222]">
                              {tr[c.field]} {tr[c.operator]} {c.value}
                              {c.field === 'sentiment' ? '%' : ''}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-[#555] mt-2 uppercase tracking-[0.18em]">
                          {new Date(rule.createdAt).toLocaleDateString(lang === 'BM' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => triggerDemoAlert()}
                          className="p-2 text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white transition-colors"
                          title="Simulate trigger"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-2 text-gray-400 dark:text-[#666] hover:text-[#FB7185] transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: Alert History                                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
          {/* Section header */}
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {tr.alertHistory}
              </h2>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
                {tr.alertHistorySub}
              </p>
              <div className="mt-2 border-b-2 border-[#e5e5e5] dark:border-[#222]" />
            </div>
            {history.length > 0 && (
              <button
                onClick={() => { setHistory([]); toast.success('History cleared'); }}
                className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] border border-[#e5e5e5] dark:border-[#222] text-gray-500 dark:text-[#999] hover:text-[#FB7185] hover:border-[#FB7185] transition-colors"
              >
                {tr.cleared}
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-8 text-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-200 dark:text-[#333] mb-3">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <h3 className="text-base font-semibold text-black dark:text-white mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {tr.noHistory}
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#999]">{tr.noHistorySub}</p>
            </div>
          ) : (
            <div className="border border-[#e5e5e5] dark:border-[#222] divide-y divide-[#e5e5e5] dark:divide-[#222]">
              <AnimatePresence>
                {history.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white dark:bg-[#111] p-4 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Severity bar */}
                      <div className="w-1 h-8 bg-[#FB7185] mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] border border-[#e5e5e5] dark:border-[#222] text-gray-600 dark:text-[#999]">
                            {tr.matched}
                          </span>
                          <span className="text-sm font-semibold text-black dark:text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                            {entry.ruleName}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {entry.conditions?.map((c, ci) => (
                            <span key={ci} className="px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] border border-[#e5e5e5] dark:border-[#222]">
                              {c.field} {c.operator} {c.value}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-[#555] mt-2 uppercase tracking-[0.18em]">
                          {tr.triggered}: {new Date(entry.triggeredAt).toLocaleString(lang === 'BM' ? 'ms-MY' : 'en-MY', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: Quiet Hours                                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'quiet' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
          {/* Section header */}
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {tr.quietHours}
            </h2>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
              {tr.quietHoursSub}
            </p>
            <div className="mt-2 border-b-2 border-[#e5e5e5] dark:border-[#222]" />
          </div>

          <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-5 space-y-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {tr.quietHours}
                </h3>
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 dark:text-[#666] mt-0.5">
                  {quietHours.enabled ? tr.enabled : tr.disabled}
                </p>
              </div>
              <button
                onClick={() => setQuietHours(q => ({ ...q, enabled: !q.enabled }))}
                className={`relative w-12 h-6 transition-colors ${
                  quietHours.enabled ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-[#333]'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white dark:bg-black transition-transform ${
                  quietHours.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="border-t border-[#e5e5e5] dark:border-[#222]" />

            {/* Time pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">
                  {tr.startTime}
                </label>
                <input
                  type="time"
                  value={quietHours.start}
                  onChange={e => setQuietHours(q => ({ ...q, start: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-sm text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">
                  {tr.endTime}
                </label>
                <input
                  type="time"
                  value={quietHours.end}
                  onChange={e => setQuietHours(q => ({ ...q, end: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-sm text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-mono"
                />
              </div>
            </div>

            {/* Visual preview */}
            <div className="pt-2">
              <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-3">
                24h Preview
              </label>
              <div className="relative h-6 bg-[#f5f5f5] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222]">
                {/* Quiet zone */}
                {(() => {
                  const [sh, sm] = quietHours.start.split(':').map(Number);
                  const [eh, em] = quietHours.end.split(':').map(Number);
                  const startPct = ((sh * 60 + sm) / 1440) * 100;
                  const endPct = ((eh * 60 + em) / 1440) * 100;

                  if (startPct <= endPct) {
                    return (
                      <div
                        className="absolute top-0 h-full bg-[#FBBF24]/20 dark:bg-[#FBBF24]/10 border-x border-[#FBBF24]/40"
                        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
                      />
                    );
                  }
                  // Wraps midnight — two segments
                  return (
                    <>
                      <div
                        className="absolute top-0 h-full bg-[#FBBF24]/20 dark:bg-[#FBBF24]/10 border-r border-[#FBBF24]/40"
                        style={{ left: `${startPct}%`, width: `${100 - startPct}%` }}
                      />
                      <div
                        className="absolute top-0 h-full bg-[#FBBF24]/20 dark:bg-[#FBBF24]/10 border-l border-[#FBBF24]/40"
                        style={{ left: '0%', width: `${endPct}%` }}
                      />
                    </>
                  );
                })()}
                {/* Hour markers */}
                {[0, 6, 12, 18, 24].map(h => (
                  <div
                    key={h}
                    className="absolute top-full mt-1 text-[8px] text-gray-400 dark:text-[#555] uppercase tracking-widest"
                    style={{ left: `${(h / 24) * 100}%`, transform: 'translateX(-50%)' }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Status indicator */}
            {quietHours.enabled && (
              <div className={`flex items-center gap-2 p-3 border-b-2 ${
                isQuietHoursActive()
                  ? 'border-[#FBBF24] bg-[#FFFBEB] dark:bg-[#1a1700]'
                  : 'border-[#4ADE80] bg-[#F0FDF4] dark:bg-[#001a00]'
              }`}>
                <div className={`w-2 h-2 ${isQuietHoursActive() ? 'bg-[#FBBF24]' : 'bg-[#4ADE80]'}`} />
                <span className="text-[10px] uppercase tracking-[0.18em] font-medium text-gray-600 dark:text-[#999]">
                  {isQuietHoursActive()
                    ? (lang === 'BM' ? 'Senyap aktif sekarang' : 'Quiet hours active now')
                    : (lang === 'BM' ? 'Senyap tidak aktif' : 'Quiet hours not active')
                  }
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: Create/Edit Server Alert (original)                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && closeModal()}
            >
              <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-black dark:text-white mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {editingAlert ? tr.editAlert : tr.createAlert}
                </h2>
                <div className="mt-2 mb-4 border-b-2 border-[#e5e5e5] dark:border-[#222]" />

                <div className="space-y-4">
                  {/* Type */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">{tr.alertType}</label>
                    <div className="flex gap-2">
                      {['email', 'telegram'].map(t => (
                        <button
                          key={t}
                          onClick={() => setForm(f => ({ ...f, type: t }))}
                          className={`flex-1 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] border transition-colors ${
                            form.type === t
                              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                              : 'border-[#e5e5e5] dark:border-[#222] text-gray-500 dark:text-[#999] hover:border-black dark:hover:border-white'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Telegram Chat ID */}
                  {form.type === 'telegram' && (
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">{tr.telegramChatId}</label>
                      <input
                        type="text"
                        value={form.telegramChatId}
                        onChange={(e) => setForm(f => ({ ...f, telegramChatId: e.target.value }))}
                        placeholder="e.g. 123456789"
                        className="w-full px-3 py-2.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#666] focus:outline-none focus:border-black dark:focus:border-white"
                      />
                    </div>
                  )}

                  {/* Sentiment */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">{tr.sentimentFilter}</label>
                    <select
                      value={form.sentiment}
                      onChange={(e) => setForm(f => ({ ...f, sentiment: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-sm text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                    >
                      <option value="any">{tr.anySentiment}</option>
                      <option value="negative">{tr.negativeOnly}</option>
                      <option value="positive">{tr.positiveOnly}</option>
                    </select>
                  </div>

                  {/* Threshold */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">
                      {tr.confidenceThreshold}: {Math.round(form.threshold * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={form.threshold}
                      onChange={(e) => setForm(f => ({ ...f, threshold: parseFloat(e.target.value) }))}
                      className="w-full accent-black dark:accent-white"
                    />
                  </div>

                  {/* Topics */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">{tr.topics}</label>
                    <input
                      type="text"
                      value={form.topics}
                      onChange={(e) => setForm(f => ({ ...f, topics: e.target.value }))}
                      placeholder={tr.topicsPlaceholder}
                      className="w-full px-3 py-2.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#666] focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                  {/* Sources */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">{tr.sources}</label>
                    <input
                      type="text"
                      value={form.sources}
                      onChange={(e) => setForm(f => ({ ...f, sources: e.target.value }))}
                      placeholder={tr.sourcesPlaceholder}
                      className="w-full px-3 py-2.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#666] focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] border border-[#e5e5e5] dark:border-[#222] text-gray-500 dark:text-[#999] hover:border-black dark:hover:border-white transition-colors"
                  >
                    {tr.cancel}
                  </button>
                  <button
                    onClick={handleCreate}
                    className="flex-1 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-colors"
                  >
                    {editingAlert ? tr.update : tr.create}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Alerts;
