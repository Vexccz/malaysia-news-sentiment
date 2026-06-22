import React from 'react';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';

const EXTRA_SHORTCUTS = [
  { key: '/', label: 'Focus search' },
  { key: 'Esc', label: 'Close modals' },
  { key: '?', label: 'Show this help' },
];

const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-paper border border-ink/10 max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="uppercase tracking-widest text-[10px] text-ink/40 mb-1">Navigation</p>
            <h2 className="font-['Playfair_Display'] text-xl font-bold text-ink">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-ink text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="border-t border-ink/10 mb-4" />

        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-ink/70">{s.label}</span>
              <kbd className="px-2 py-0.5 bg-ink/5 border border-ink/10 text-xs font-mono text-ink/60 min-w-[28px] text-center">
                {s.key}
              </kbd>
            </div>
          ))}

          <div className="border-t border-ink/10 my-2" />

          {EXTRA_SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-ink/70">{s.label}</span>
              <kbd className="px-2 py-0.5 bg-ink/5 border border-ink/10 text-xs font-mono text-ink/60">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="border-t border-ink/10 mt-4 pt-4">
          <p className="text-xs text-ink/40 text-center">
            Press <kbd className="px-1 py-0.5 bg-ink/5 border border-ink/10 text-[10px] font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
