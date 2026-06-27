import React, { useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

/**
 * Editorial-style confirm dialog. Replaces window.confirm() / window.alert().
 *
 * Usage:
 *   <ConfirmDialog
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onConfirm={async () => { await doThing(); setOpen(false); }}
 *     title="Delete article?"
 *     message="This action cannot be undone."
 *     confirmText="Delete"
 *     variant="danger"
 *   />
 *
 * Variants:
 *   - 'danger'  red accent, AlertTriangle (default for destructive)
 *   - 'success' green accent, CheckCircle2
 *   - 'info'    blue/ink accent, Info (default)
 *
 * Set `mode="alert"` to show only an OK button (no Cancel).
 */
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  mode = 'confirm', // 'confirm' or 'alert'
  loading = false,
}) => {
  // ESC closes
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape' && !loading) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, loading]);

  if (!open) return null;

  const variantConfig = {
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-red-50 dark:bg-red-950/30',
      iconColor: 'text-red-700 dark:text-red-400',
      btnBg: 'bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700',
      btnText: 'text-white',
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-green-50 dark:bg-green-950/30',
      iconColor: 'text-green-700 dark:text-green-400',
      btnBg: 'bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700',
      btnText: 'text-white',
    },
    info: {
      icon: Info,
      iconBg: 'bg-[#fafafa] dark:bg-[#1a1a1a]',
      iconColor: 'text-ink dark:text-paper',
      btnBg: 'bg-ink hover:bg-accent dark:bg-paper dark:hover:bg-accent dark:text-ink',
      btnText: 'text-paper',
    },
  };
  const cfg = variantConfig[variant] || variantConfig.info;
  const Icon = cfg.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-paper dark:bg-[#0a0a0a] border-2 border-ink dark:border-paper max-w-md w-full shadow-2xl">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#e5e5e5] dark:border-[#222]">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 ${cfg.iconBg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${cfg.iconColor}`} strokeWidth={2.2} />
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-ink-muted dark:text-ink-faint font-sans">
              {mode === 'alert' ? 'Notice' : variant === 'danger' ? 'Confirm Action' : 'Confirm'}
            </span>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              className="text-ink-muted hover:text-ink dark:text-ink-faint dark:hover:text-paper transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <h2
            id="confirm-dialog-title"
            className="font-['Playfair_Display'] text-xl font-bold text-ink dark:text-paper mb-2 leading-tight"
          >
            {title}
          </h2>
          {message && (
            <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">
              {message}
            </p>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#0a0a0a]">
          {mode === 'confirm' && (
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-colors font-sans disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 text-xs font-semibold uppercase tracking-wider ${cfg.btnBg} ${cfg.btnText} transition-colors font-sans disabled:opacity-50 flex items-center gap-2`}
          >
            {loading && (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? 'Working...' : (mode === 'alert' ? 'OK' : confirmText)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
