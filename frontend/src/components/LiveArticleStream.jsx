/**
 * LiveArticleStream (Feature #2)
 *
 * Real-time banner that listens to Socket.IO 'article:new' events,
 * shows a slim notification + counter when fresh articles arrive,
 * and lets the user click to inject them into the visible list.
 *
 * Designed to live above the article list on Dashboard.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const SENT_COLOR = {
  Positive: '#22c55e',
  Negative: '#ef4444',
  Neutral: '#eab308',
};

const LiveArticleStream = ({ onApply }) => {
  const socket = useSocket();
  const [queue, setQueue] = useState([]); // articles arrived since user last cleared
  const [pulse, setPulse] = useState(false);
  const lastIdsRef = useRef(new Set());

  useEffect(() => {
    if (!socket) return;

    const handler = (payload) => {
      if (!payload || !payload.id) return;
      // Dedupe — Socket.IO may double-deliver during reconnects
      if (lastIdsRef.current.has(payload.id)) return;
      lastIdsRef.current.add(payload.id);
      // Cap dedupe set to avoid unbounded growth
      if (lastIdsRef.current.size > 500) {
        lastIdsRef.current = new Set(Array.from(lastIdsRef.current).slice(-250));
      }

      setQueue((prev) => {
        // newest first, cap at 25
        const next = [payload, ...prev].slice(0, 25);
        return next;
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 700);
    };

    socket.on('article:new', handler);
    return () => {
      socket.off('article:new', handler);
    };
  }, [socket]);

  if (queue.length === 0) return null;

  const apply = () => {
    if (typeof onApply === 'function') onApply(queue);
    setQueue([]);
  };

  const dismiss = () => setQueue([]);

  return (
    <AnimatePresence>
      <motion.div
        key="live-banner"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] mb-3"
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <div className={`relative flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`}>
            <Zap size={14} className="text-black dark:text-white" />
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-black dark:text-white">
              {queue.length} new article{queue.length === 1 ? '' : 's'} · live
            </p>
            <p className="text-xs text-gray-500 dark:text-[#999] truncate">
              {queue[0]?.source} — {queue[0]?.title}
            </p>
          </div>

          {/* Sentiment dots preview */}
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
            {queue.slice(0, 8).map((a, i) => (
              <span
                key={a.id + '-' + i}
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: SENT_COLOR[a.sentiment] || SENT_COLOR.Neutral }}
                title={`${a.sentiment} — ${a.source}`}
              />
            ))}
          </div>

          <button
            onClick={apply}
            className="px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex-shrink-0"
          >
            Show
          </button>
          <button
            onClick={dismiss}
            className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveArticleStream;
