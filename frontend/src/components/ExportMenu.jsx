import React, { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileJson, ChevronDown } from 'lucide-react';
import {
  exportToCSV,
  exportTableToCSV,
  exportArticlesToJSON,
  exportToJSON,
} from '../services/exportUtils';

const ITEM_BASE =
  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-ink/85 transition-colors hover:bg-ink/5 dark:text-paper/85 dark:hover:bg-paper/10';

/**
 * Generic export menu — pass either `articles` (array of article objects)
 * or `rows` (array of plain objects) + filenameBase.
 */
const ExportMenu = ({ articles, rows, json, filenameBase = 'export', label = 'Export', compact = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [open]);

  const hasArticles = Array.isArray(articles) && articles.length > 0;
  const hasRows = Array.isArray(rows) && rows.length > 0;
  const hasJSON = !!json;
  const disabled = !hasArticles && !hasRows && !hasJSON;

  const ts = new Date().toISOString().split('T')[0];

  const handleCsv = () => {
    if (hasArticles) exportToCSV(articles, `${filenameBase}-${ts}.csv`);
    else if (hasRows) exportTableToCSV(rows, `${filenameBase}-${ts}.csv`);
    setOpen(false);
  };

  const handleJson = () => {
    if (hasArticles) exportArticlesToJSON(articles, `${filenameBase}-${ts}.json`);
    else if (hasRows) exportToJSON(rows, `${filenameBase}-${ts}.json`);
    else if (hasJSON) exportToJSON(json, `${filenameBase}-${ts}.json`);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 border border-ink/15 bg-paper px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 dark:border-paper/15 dark:bg-paper-dark dark:text-paper dark:hover:border-accent dark:hover:text-accent ${
          compact ? 'h-7' : 'h-8'
        }`}
        title={disabled ? 'No data to export' : 'Export current view'}
      >
        <Download className="h-3.5 w-3.5" />
        {!compact && <span>{label}</span>}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 border border-ink/15 bg-paper py-1 shadow-md dark:border-paper/15 dark:bg-paper-dark">
          <div className="border-b border-ink/10 px-3 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-ink-muted dark:border-paper/10 dark:text-ink-faint">
            Export Format
          </div>
          <button onClick={handleCsv} className={ITEM_BASE}>
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="flex-1">CSV · Excel</span>
            <span className="text-[9px] uppercase tracking-wider text-ink-faint">.csv</span>
          </button>
          <button onClick={handleJson} className={ITEM_BASE}>
            <FileJson className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="flex-1">JSON · Raw</span>
            <span className="text-[9px] uppercase tracking-wider text-ink-faint">.json</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
