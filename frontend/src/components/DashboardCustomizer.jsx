import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const AVAILABLE_WIDGETS = [
  { id: 'sentiment-overview', label: 'Sentiment Overview', description: 'KPI cards showing sentiment distribution' },
  { id: 'recent-articles', label: 'Recent Articles', description: 'Latest analyzed articles' },
  { id: 'trending-topics', label: 'Trending Topics', description: 'Currently trending news topics' },
  { id: 'category-breakdown', label: 'Category Breakdown', description: 'Articles by category' },
  { id: 'source-stats', label: 'Source Stats', description: 'Top news sources' },
  { id: 'quick-search', label: 'Quick Search', description: 'Search articles quickly' },
  { id: 'ai-insights', label: 'AI Insights', description: 'AI-generated digest and analysis' },
  { id: 'heatmap-mini', label: 'Heatmap Mini', description: 'Regional sentiment heatmap' },
];

const DEFAULT_LAYOUT = [
  { widgetId: 'sentiment-overview', position: 0, size: 'lg', visible: true },
  { widgetId: 'recent-articles', position: 1, size: 'md', visible: true },
  { widgetId: 'trending-topics', position: 2, size: 'md', visible: true },
  { widgetId: 'category-breakdown', position: 3, size: 'md', visible: true },
  { widgetId: 'source-stats', position: 4, size: 'sm', visible: true },
  { widgetId: 'quick-search', position: 5, size: 'sm', visible: true },
  { widgetId: 'ai-insights', position: 6, size: 'md', visible: true },
  { widgetId: 'heatmap-mini', position: 7, size: 'lg', visible: true },
];

const DashboardCustomizer = ({ isOpen, onClose, onSave }) => {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchLayout = async () => {
      try {
        const res = await api.get('/user/dashboard-layout');
        if (res.data.layout?.length) {
          setLayout(res.data.layout);
        }
      } catch {
        // Use default
      } finally {
        setLoading(false);
      }
    };
    fetchLayout();
  }, [isOpen]);

  const toggleVisibility = (widgetId) => {
    setLayout(prev => prev.map(item =>
      item.widgetId === widgetId ? { ...item, visible: !item.visible } : item
    ));
  };

  const changeSize = (widgetId, size) => {
    setLayout(prev => prev.map(item =>
      item.widgetId === widgetId ? { ...item, size } : item
    ));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    setLayout(prev => {
      const newLayout = [...prev];
      [newLayout[index - 1], newLayout[index]] = [newLayout[index], newLayout[index - 1]];
      return newLayout.map((item, i) => ({ ...item, position: i }));
    });
  };

  const moveDown = (index) => {
    if (index === layout.length - 1) return;
    setLayout(prev => {
      const newLayout = [...prev];
      [newLayout[index], newLayout[index + 1]] = [newLayout[index + 1], newLayout[index]];
      return newLayout.map((item, i) => ({ ...item, position: i }));
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/user/dashboard-layout', { layout });
      toast.success('Dashboard layout saved!');
      onSave(layout);
      onClose();
    } catch {
      toast.error('Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLayout(DEFAULT_LAYOUT);
  };

  const getWidgetLabel = (widgetId) => {
    return AVAILABLE_WIDGETS.find(w => w.id === widgetId)?.label || widgetId;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#eee] dark:border-[#2a2a2a] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customize Dashboard</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Reorder, resize, and toggle widgets</p>
            </div>
            <button aria-label="Close customizer" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Widget List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              layout.map((item, index) => (
                <div
                  key={item.widgetId}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    item.visible
                      ? 'border-[#eee] dark:border-[#2a2a2a] bg-white dark:bg-[#111]'
                      : 'border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0a0a0a] opacity-60'
                  }`}
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === layout.length - 1}
                      className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  </div>

                  {/* Widget info */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{getWidgetLabel(item.widgetId)}</span>
                  </div>

                  {/* Size selector */}
                  <div className="flex gap-1">
                    {['sm', 'md', 'lg'].map(size => (
                      <button
                        key={size}
                        onClick={() => changeSize(item.widgetId, size)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                          item.size === size
                            ? 'bg-accent text-white'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>

                  {/* Visibility toggle */}
                  <button
                    onClick={() => toggleVisibility(item.widgetId)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.visible
                        ? 'text-accent hover:bg-accent/10'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {item.visible ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#eee] dark:border-[#2a2a2a] flex items-center justify-between">
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Reset to Default
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Layout'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export { DashboardCustomizer, AVAILABLE_WIDGETS, DEFAULT_LAYOUT };
export default DashboardCustomizer;
