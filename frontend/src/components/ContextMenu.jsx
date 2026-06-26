import React, { useEffect, useRef } from 'react';

const ITEM_BASE =
  'flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] text-ink/85 transition-colors hover:bg-ink/5 dark:text-paper/85 dark:hover:bg-paper/10';

const Divider = () => <div className="my-1 h-px bg-ink/10 dark:bg-paper/10" />;

const ContextMenu = ({ x, y, onClose, items = [] }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', onClose, true);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  // clamp inside viewport
  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 280);

  return (
    <div
      ref={ref}
      role="menu"
      style={{ top: adjustedY, left: adjustedX }}
      className="fixed z-[1000] w-56 border border-ink/15 bg-paper py-1 shadow-md dark:border-paper/15 dark:bg-paper-dark"
    >
      <div className="border-b border-ink/10 px-3 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-ink-muted dark:border-paper/10 dark:text-ink-faint">
        Article Actions
      </div>
      {items.map((item, index) => {
        if (item === 'divider') return <Divider key={`div-${index}`} />;
        if (item.hidden) return null;
        return (
          <button
            key={item.label}
            role="menuitem"
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            className={`${ITEM_BASE} ${item.accent ? 'text-flag dark:text-flag' : ''}`}
          >
            {item.icon ? <span className="flex h-4 w-4 items-center justify-center text-ink-muted dark:text-ink-faint">{item.icon}</span> : <span className="w-4" />}
            <span className="flex-1">{item.label}</span>
            {item.shortcut ? (
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted dark:text-ink-faint">
                {item.shortcut}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu;
