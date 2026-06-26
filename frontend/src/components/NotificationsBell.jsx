import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, MessageSquare, ExternalLink, X } from 'lucide-react';
import api from '../services/api';

const iconFor = (type) => {
  switch (type) {
    case 'reply':
      return <MessageSquare className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const timeAgo = (date) => {
  if (!date) return '';
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'just now';
  const min = Math.floor(diff / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const NotificationsBell = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/notifications?limit=12');
      setItems(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // quiet fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 60000);
    return () => clearInterval(id);
  }, []);

  const handleMarkAll = async () => {
    try {
      await api.put('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const latestLabel = useMemo(() => {
    if (!items.length) return 'No updates';
    return items[0].title;
  }, [items]);

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchNotifications();
        }}
        className="relative flex h-10 w-10 items-center justify-center border border-[#e5e5e5] bg-white text-ink transition-colors hover:border-accent hover:text-accent dark:border-[#222] dark:bg-[#111] dark:text-paper"
        aria-label="Notifications"
        title={latestLabel}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] px-1 bg-flag text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[90vw] border border-[#e5e5e5] bg-white shadow-md dark:border-[#222] dark:bg-[#111] z-50">
          <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-3 dark:border-[#222]">
            <div>
              <p className="text-[9px] uppercase tracking-[0.24em] text-flag font-semibold">Notifications</p>
              <p className="font-['Playfair_Display'] text-lg font-bold text-ink dark:text-paper">Discussion updates</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink dark:text-ink-faint dark:hover:text-paper">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-b border-[#e5e5e5] dark:border-[#222]">
            <span className="text-[10px] uppercase tracking-[0.18em] text-ink-muted dark:text-ink-faint">
              {unreadCount} unread
            </span>
            <button
              onClick={handleMarkAll}
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-accent dark:text-ink-faint dark:hover:text-accent"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-ink-muted dark:text-ink-faint">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="font-['Playfair_Display'] text-lg text-ink dark:text-paper">Quiet desk.</p>
                <p className="mt-1 text-xs italic text-ink-muted dark:text-ink-faint">Replies and mentions will land here.</p>
              </div>
            ) : (
              items.map((item) => (
                <a
                  key={item._id}
                  href={item.link || '/community'}
                  className={`flex gap-3 px-4 py-3 border-b border-[#f0f0f0] transition-colors hover:bg-[#fafafa] dark:border-[#1a1a1a] dark:hover:bg-[#161616] ${
                    item.read ? '' : 'bg-flag-soft'
                  }`}
                >
                  <div className="mt-0.5 text-ink-muted dark:text-ink-faint">{iconFor(item.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug text-ink dark:text-paper">{item.title}</p>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.15em] text-ink-faint">{timeAgo(item.createdAt)}</span>
                    </div>
                    {item.body ? <p className="mt-1 text-xs leading-relaxed text-ink-muted dark:text-ink-faint">{item.body}</p> : null}
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-accent">
                      Open <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
