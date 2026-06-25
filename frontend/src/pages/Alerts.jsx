import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const { t, lang } = useLanguage();
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

  useEffect(() => {
    fetchAlerts();
  }, []);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-500 dark:text-[#999] text-sm uppercase tracking-[0.18em]">Loading alerts…</p>
        <div className="w-16 border-b border-[#e5e5e5] dark:border-[#222]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {t('alerts')}
          </h1>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
            Get notified when news matches your criteria
          </p>
          <div className="mt-3 border-b border-[#e5e5e5] dark:border-[#222]" />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black text-[11px] font-medium uppercase tracking-[0.18em] hover:opacity-80 transition-colors flex items-center gap-2 mt-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create Alert
        </button>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-12 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-200 dark:text-[#333] mb-4">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            No alerts yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#999]">Create your first alert to get notified about news sentiment changes</p>
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
                        {/* Severity indicator bar */}
                        <div className={`w-1 h-8 ${severityColor}`} />
                        
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] border border-[#e5e5e5] dark:border-[#222] ${
                          alert.type === 'email'
                            ? 'text-gray-600 dark:text-[#999]'
                            : 'text-gray-600 dark:text-[#999]'
                        }`}>
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
                        <span className="text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.18em]">≥{Math.round((alert.conditions?.threshold || 0.7) * 100)}%</span>
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
                      {/* Toggle */}
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

                      {/* Test */}
                      <button
                        onClick={() => handleTest(alert._id)}
                        className="p-2 text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white transition-colors"
                        title="Send test"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEdit(alert)}
                        className="p-2 text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>

                      {/* Delete */}
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

      {/* Create/Edit Modal */}
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
                  {editingAlert ? 'Edit Alert' : 'Create Alert'}
                </h2>
                <div className="mt-2 mb-4 border-b border-[#e5e5e5] dark:border-[#222]" />

                <div className="space-y-4">
                  {/* Type */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">Alert Type</label>
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
                      <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">Telegram Chat ID</label>
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
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">Sentiment Filter</label>
                    <select
                      value={form.sentiment}
                      onChange={(e) => setForm(f => ({ ...f, sentiment: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-sm text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                    >
                      <option value="any">Any sentiment</option>
                      <option value="negative">Negative only</option>
                      <option value="positive">Positive only</option>
                    </select>
                  </div>

                  {/* Threshold */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">
                      Confidence Threshold: {Math.round(form.threshold * 100)}%
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
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">Topics (comma-separated)</label>
                    <input
                      type="text"
                      value={form.topics}
                      onChange={(e) => setForm(f => ({ ...f, topics: e.target.value }))}
                      placeholder="e.g. economy, politics, education"
                      className="w-full px-3 py-2.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#666] focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                  {/* Sources */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-[#999] uppercase tracking-[0.18em] mb-1.5">Sources (comma-separated)</label>
                    <input
                      type="text"
                      value={form.sources}
                      onChange={(e) => setForm(f => ({ ...f, sources: e.target.value }))}
                      placeholder="e.g. The Star, Malaysiakini"
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
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    className="flex-1 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-colors"
                  >
                    {editingAlert ? 'Update' : 'Create'}
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
