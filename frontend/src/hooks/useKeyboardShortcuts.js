import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const SHORTCUTS = [
  { key: '1', path: '/dashboard', label: 'Dashboard' },
  { key: '2', path: '/trending', label: 'Trending' },
  { key: '3', path: '/heatmap', label: 'Heatmap' },
  { key: '4', path: '/entities', label: 'Entities' },
  { key: '5', path: '/history', label: 'History' },
  { key: '6', path: '/compare', label: 'Compare' },
  { key: '7', path: '/forecast', label: 'Forecast' },
  { key: '8', path: '/digest', label: 'Digest' },
  { key: '9', path: '/reports', label: 'Reports' },
];

const isEditable = (el) => {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
};

const useKeyboardShortcuts = ({ onShowHelp, onCloseModals }) => {
  const navigate = useNavigate();

  const handler = useCallback((e) => {
    if (isEditable(e.target)) return;

    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onShowHelp?.();
      return;
    }

    if (e.key === 'Escape') {
      onCloseModals?.();
      return;
    }

    if (e.key === '/') {
      e.preventDefault();
      const search = document.querySelector('input[type="search"], input[placeholder*="Search" i], input[placeholder*="search" i]');
      if (search) search.focus();
      return;
    }

    const shortcut = SHORTCUTS.find(s => s.key === e.key);
    if (shortcut && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      navigate(shortcut.path);
    }
  }, [navigate, onShowHelp, onCloseModals]);

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
};

export { SHORTCUTS };
export default useKeyboardShortcuts;
