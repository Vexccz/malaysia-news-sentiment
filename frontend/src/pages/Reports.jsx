import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

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

const Reports = () => {
  const [topic, setTopic] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportType, setReportType] = useState('full');
  const [loading, setLoading] = useState(false);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState('executive');
  const [showPreview, setShowPreview] = useState(false);
  const [customSections, setCustomSections] = useState([]);
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('custom-report-templates') || '[]'); } catch { return []; }
  });
  const [showSaveForm, setShowSaveForm] = useState(false);

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('report-history') || '[]'); } catch { return []; }
  });

  const activeTemplate = selectedTemplate === 'custom'
    ? { id: 'custom', name: 'Custom', sections: customSections }
    : TEMPLATES.find(t => t.id === selectedTemplate);

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

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const endpoint = reportType === 'topic' ? '/reports/topic' : '/api/reports/generate';
      const payload = {
        topic,
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
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('report-history');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="border-b-2 border-ink dark:border-paper pb-3">
        <h1 className="font-['Playfair_Display'] text-2xl font-black text-ink dark:text-paper tracking-tight uppercase">
          Reports
        </h1>
        <p className="text-[10px] text-ink-muted dark:text-ink-faint mt-1 uppercase tracking-[0.2em]">
          Generate and download sentiment analysis reports
        </p>
      </div>

      {/* Template Selection */}
      <div className="space-y-3">
        <label className="block text-[10px] font-medium text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em]">
          Report Template
        </label>
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
              Saved Templates
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
            Template Preview
          </p>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-[10px] text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper uppercase tracking-[0.2em] transition-colors"
          >
            {showPreview ? 'Collapse' : 'Expand'}
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
                    {activeTemplate?.sections?.length || 0} sections included
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

      {/* Custom Section Picker */}
      {selectedTemplate === 'custom' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-[10px] font-medium text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em]">
            Select Sections
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
                    placeholder="Template name"
                    className="flex-1 px-3 py-2 border border-ink/10 dark:border-paper/10 bg-white dark:bg-[#111] text-sm text-ink dark:text-paper focus:outline-none focus:border-ink dark:focus:border-paper"
                  />
                  <button
                    onClick={saveCustomTemplate}
                    disabled={!customTemplateName.trim()}
                    className="px-4 py-2 border border-ink dark:border-paper text-xs font-medium text-ink dark:text-paper uppercase tracking-[0.15em] hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink disabled:opacity-30 transition-all"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowSaveForm(false); setCustomTemplateName(''); }}
                    className="px-3 py-2 text-xs text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="text-[10px] text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper uppercase tracking-[0.2em] transition-colors"
                >
                  + Save as template
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Generate Form */}
      <div className="space-y-4 border-t border-ink/10 dark:border-paper/10 pt-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-medium text-ink-muted dark:text-ink-faint mb-1.5 uppercase tracking-[0.2em]">
              Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. economy, politics (leave empty for all)"
              className="w-full px-3 py-2.5 border border-ink/10 dark:border-paper/10 bg-white dark:bg-[#111] text-sm text-ink dark:text-paper focus:outline-none focus:border-ink dark:focus:border-paper placeholder-ink-muted/50 dark:placeholder-ink-faint/50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-ink-muted dark:text-ink-faint mb-1.5 uppercase tracking-[0.2em]">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="w-full px-3 py-2.5 border border-ink/10 dark:border-paper/10 bg-white dark:bg-[#111] text-sm text-ink dark:text-paper focus:outline-none focus:border-ink dark:focus:border-paper"
            >
              <option value="full">Full Report</option>
              <option value="topic">Topic-Specific</option>
              <option value="comparison">Comparison</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-ink-muted dark:text-ink-faint mb-1.5 uppercase tracking-[0.2em]">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2.5 border border-ink/10 dark:border-paper/10 bg-white dark:bg-[#111] text-sm text-ink dark:text-paper focus:outline-none focus:border-ink dark:focus:border-paper"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-ink-muted dark:text-ink-faint mb-1.5 uppercase tracking-[0.2em]">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2.5 border border-ink/10 dark:border-paper/10 bg-white dark:bg-[#111] text-sm text-ink dark:text-paper focus:outline-none focus:border-ink dark:focus:border-paper"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || (selectedTemplate === 'custom' && customSections.length === 0)}
          className="px-5 py-2.5 text-sm font-medium border border-ink dark:border-paper text-ink dark:text-paper hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink disabled:opacity-30 transition-all flex items-center gap-2 uppercase tracking-[0.1em]"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-ink dark:border-paper border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PDF
            </>
          )}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="border-t border-ink/10 dark:border-paper/10 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-bold text-ink dark:text-paper uppercase tracking-[0.2em]">
              History
            </h2>
            <button
              onClick={clearHistory}
              className="text-[10px] text-ink-muted dark:text-ink-faint hover:text-red-500 uppercase tracking-[0.15em] transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="space-y-0 divide-y divide-ink/5 dark:divide-paper/5">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-ink dark:text-paper">{entry.topic}</p>
                  <p className="text-[10px] text-ink-muted dark:text-ink-faint uppercase tracking-[0.15em]">
                    {entry.template || entry.type} &middot; {entry.dateFrom} to {entry.dateTo}
                  </p>
                </div>
                <span className="text-[10px] text-ink-muted dark:text-ink-faint">
                  {new Date(entry.generatedAt).toLocaleDateString('en-MY')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Reports;
