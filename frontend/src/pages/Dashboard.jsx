import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import SearchBarClean from '../components/SearchBarClean';
import ArticleCardCompact from '../components/ArticleCardCompact';
import { StaggerList, StaggerItem } from '../components/StaggerList';
import SentimentDonutChart from '../components/SentimentDonutChart';
import SentimentHorizontalBar from '../components/SentimentHorizontalBar';
import SentimentAreaChart from '../components/SentimentAreaChart';
import SentimentHeatmap from '../components/SentimentHeatmap';
import TopSourcesHorizontal from '../components/TopSourcesHorizontal';
import AiDigestCard from '../components/AiDigestCard';
import WordCloud from '../components/WordCloud';
import ForecastCard from '../components/ForecastCard';
import ScrollToTop from '../components/ScrollToTop';
import AnalyzingOverlay from '../components/AnalyzingOverlay';
import TrendingTicker from '../components/TrendingTicker';
import usePullToRefresh from '../hooks/usePullToRefresh';
import useSwipeTabs from '../hooks/useSwipeTabs';
import { hapticImpact } from '../utils/haptics';
import { Search, Clock, ArrowLeft, Sparkles, FileDown, Printer, ChevronLeft, ChevronRight, BarChart3, TrendingUp, Brain, Download, Settings2, Globe, GripVertical, Activity, Users, MessageSquare } from 'lucide-react';
import DashboardCustomizer from '../components/DashboardCustomizer';
import EmptyState from '../components/EmptyState';
import DashboardSummary from '../components/DashboardSummary';
import OnboardingTour, { useOnboardingTour } from '../components/OnboardingTour';

// Lazy load chart components
const SentimentBarChart = lazy(() => import('../components/SentimentBarChart'));
const TrendLineChart = lazy(() => import('../components/TrendLineChart'));
const TopSourcesChart = lazy(() => import('../components/TopSourcesChart'));
const SentimentMap = lazy(() => import('../components/SentimentMap'));

const ChartFallback = () => (
  <div className="h-48 bg-white dark:bg-[#1a1a1a] rounded-sm border border-[#eee] dark:border-[#2a2a2a] p-5 space-y-3">
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
    </div>
    <div className="flex items-end gap-3 h-28 pt-4">
      <div className="flex-1 h-[60%] rounded-t-lg bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ animationDelay: '0ms' }} />
      <div className="flex-1 h-[80%] rounded-t-lg bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ animationDelay: '150ms' }} />
      <div className="flex-1 h-[45%] rounded-t-lg bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ animationDelay: '300ms' }} />
      <div className="flex-1 h-[70%] rounded-t-lg bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ animationDelay: '450ms' }} />
      <div className="flex-1 h-[55%] rounded-t-lg bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ animationDelay: '600ms' }} />
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    {/* Header skeleton */}
    <div className="space-y-2">
      <div className="h-7 w-48 rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
    {/* Search bar skeleton */}
    <div className="h-12 rounded-sm bg-gray-200 dark:bg-gray-700" />
    {/* KPI row skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-5 space-y-2">
          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-12 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
    {/* Charts skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {[1,2].map(i => (
        <div key={i} className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
    {/* Article cards skeleton — editorial */}
    <div>
      <div className="border-t-2 border-gray-200 dark:border-gray-700 mb-1" />
      <div className="border-t border-gray-200 dark:border-gray-800 mb-4" />
      {[1,2,3].map(i => (
        <div key={i} className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] border-l-[3px] border-l-gray-200 dark:border-l-[#333] py-4 px-5 mb-px">
          <div className="flex gap-4">
            <div className="w-7 h-7 bg-gray-200 dark:bg-[#252525] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <div className="h-2.5 w-20 bg-gray-200 dark:bg-[#252525]" />
                <div className="h-2.5 w-14 bg-gray-200 dark:bg-[#252525]" />
              </div>
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#252525]" />
              <div className="h-3 w-full bg-gray-200 dark:bg-[#252525]" />
              <div className="h-2 w-1/3 bg-gray-200 dark:bg-[#252525] mt-2 pt-2 border-t border-gray-100 dark:border-[#1a1a1a]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

import SourceCredibility from '../components/SourceCredibility';
import ExportPPT from '../components/ExportPPT';
import { InlineErrorBoundary } from '../components/ErrorBoundary';
import { Skeleton } from 'boneyard-js/react';


/* --- Sentiment Mark (used by Analytics + Community inline) --- */
const SentimentMarkInline = ({ sentiment }) => {
  const map = {
    Positive: { symbol: "+", color: "text-green-700 dark:text-green-400" },
    Negative: { symbol: "\u2212", color: "text-red-700 dark:text-red-400" },
    Neutral:  { symbol: "~", color: "text-gray-500 dark:text-gray-400" },
  };
  const m = map[sentiment] || map.Neutral;
  return <span className={`inline-block text-xs font-bold ${m.color} mr-1`}>{m.symbol}</span>;
};
/* ─── Inline: Community (Discussion Threads + Hot Takes) ─────────── */
const CommunityInline = () => {
  const [discussions, setDiscussions] = useState([]);
  const [hotTakes, setHotTakes] = useState([]);
  const [dotd, setDotd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [discRes, hotRes, dotdRes] = await Promise.all([
          api.get('/collab/discussions'),
          api.get('/collab/hot-takes?limit=3'),
          api.get('/collab/discussion-of-day'),
        ]);
        if (!cancelled) {
          setDiscussions(discRes.data.discussions || []);
          setHotTakes(hotRes.data.hotTakes || []);
          setDotd(dotdRes.data.discussion || null);
        }
      } catch (err) {
        console.error('Community fetch failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadComments = async (articleId) => {
    if (expandedId === articleId) { setExpandedId(null); return; }
    setExpandedId(articleId);
    setCommentsLoading(true);
    try {
      const { data } = await api.get(`/collab/comments/${articleId}`);
      setComments(data.comments || []);
    } catch { setComments([]); }
    finally { setCommentsLoading(false); }
  };

  const submitComment = async (articleId) => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/collab/comments', { articleId, content: newComment.trim(), isAnonymous });
      setComments(prev => [data.comment, ...prev]);
      setNewComment('');
      setDiscussions(prev => prev.map(d => 
        d.articleId === articleId ? { ...d, commentCount: d.commentCount + 1, lastComment: newComment.trim(), lastCommentAt: new Date().toISOString(), userName: isAnonymous ? 'Anonymous' : d.userName } : d
      ));
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  const likeComment = async (commentId) => {
    try { await api.post(`/collab/comments/${commentId}/like`); } catch {}
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  };

  const sentimentColor = (s) => s === 'Positive' ? '#4ADE80' : s === 'Negative' ? '#FB7185' : '#FBBF24';

  if (loading) {
    return (
      <div className={`${CARD} p-5 animate-pulse space-y-3`}>
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Discussion of the Day */}
      {dotd && dotd.articleId && (
        <div className={`${CARD} overflow-hidden border-l-2`} style={{ borderLeftColor: '#f59e0b' }}>
          <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-950/10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Discussion of the Day</span>
              <span className="text-[10px] text-ink-faint">🔥</span>
            </div>
            <button onClick={() => loadComments(dotd.articleId._id)} className="w-full text-left">
              <h4 className="text-sm font-semibold text-ink dark:text-paper leading-snug mb-1">
                {dotd.articleId.title}
              </h4>
              <div className="flex items-center gap-3 text-[10px] text-ink-faint">
                <span className="font-semibold uppercase tracking-wider">{dotd.articleId.source}</span>
                <span>·</span>
                <span>{dotd.commentCount} comment{dotd.commentCount !== 1 ? 's' : ''}</span>
                {dotd.reason && <><span>·</span><span className="italic">{dotd.reason}</span></>}
              </div>
            </button>
          </div>

          {expandedId === dotd.articleId._id && (
            <div className="border-t border-[#e5e5e5] dark:border-[#222]">
              <div className="p-3 border-b border-[#e5e5e5] dark:border-[#222] bg-gray-50/50 dark:bg-white/[0.01]">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium border transition-colors ${isAnonymous ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'border-[#e5e5e5] dark:border-[#333] text-ink-faint'}`}>
                    {isAnonymous ? '👤' : '🧑'} {isAnonymous ? 'Anonymous' : 'Visible'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitComment(dotd.articleId._id)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 text-sm border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-ink dark:focus:border-paper transition-colors" />
                  <button onClick={() => submitComment(dotd.articleId._id)} disabled={!newComment.trim() || submitting}
                    className="px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-80 disabled:opacity-30 transition-all">
                    Post
                  </button>
                </div>
              </div>
              {commentsLoading ? (
                <div className="p-4 animate-pulse space-y-2"><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" /></div>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-[#e5e5e5] dark:divide-[#222]">
                  {comments.map(c => <CommentItem key={c._id} c={c} onLike={likeComment} timeAgo={timeAgo} sentimentColor={sentimentColor} />)}
                  {comments.length === 0 && <div className="p-4 text-center text-xs text-ink-faint">No comments yet.</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hot Takes */}
      {hotTakes.length > 0 && (
        <div className={`${CARD} p-4`}>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-3 flex items-center gap-1.5">
            🔥 Hot Takes <span className="text-ink-faint font-normal">this week</span>
          </h3>
          <div className="space-y-2">
            {hotTakes.map((ht, i) => (
              <button key={ht.articleId} onClick={() => loadComments(ht.articleId)}
                className="w-full text-left flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <span className="text-lg font-bold text-ink-faint w-6 text-right" style={{ fontFamily: 'monospace' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-ink dark:text-paper leading-snug line-clamp-1 mb-0.5">
                    {ht.articleTitle || 'Untitled'}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-ink-faint">
                    <span className="font-semibold uppercase tracking-wider">{ht.articleSource || '?'}</span>
                    <span>·</span>
                    <span>{ht.commentCount} comment{ht.commentCount !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{ht.uniqueUserCount} user{ht.uniqueUserCount !== 1 ? 's' : ''}</span>
                    {ht.controversy > 30 && (
                      <>
                        <span>·</span>
                        <span className="text-amber-500 font-semibold">⚡ {ht.controversy}% controversial</span>
                      </>
                    )}
                  </div>
                </div>
                {ht.articleSentiment && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: sentimentColor(ht.articleSentiment) }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Discussions */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-2 px-1">
          Recent Discussions
        </h3>
        {!discussions.length ? (
          <div className={`${CARD} p-8 text-center`}>
            <MessageSquare size={24} className="mx-auto mb-2 text-ink-faint" />
            <p className="text-sm text-ink-faint">No discussions yet.</p>
            <p className="text-xs text-ink-faint mt-1">Open an article and leave a comment to start.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {discussions.map(d => (
              <div key={d.articleId} className={`${CARD} overflow-hidden`}>
                <button onClick={() => loadComments(d.articleId)}
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex-shrink-0 pt-0.5"><SentimentMarkInline sentiment={d.articleSentiment} /></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-ink dark:text-paper leading-snug line-clamp-1 mb-1">
                      {d.articleTitle || 'Untitled'}
                    </h4>
                    <p className="text-xs text-ink-muted dark:text-ink-faint line-clamp-1 mb-1.5">
                      {d.lastIsAnonymous ? '👤 ' : ''}{d.userName}: "{d.lastComment}"
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-ink-faint">
                      <span className="font-semibold uppercase tracking-wider">{d.articleSource || 'Unknown'}</span>
                      <span>·</span>
                      <span>{d.commentCount} comment{d.commentCount !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{timeAgo(d.lastCommentAt)}</span>
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`flex-shrink-0 text-ink-faint transition-transform ${expandedId === d.articleId ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {expandedId === d.articleId && (
                  <div className="border-t border-[#e5e5e5] dark:border-[#222]">
                    <div className="p-3 border-b border-[#e5e5e5] dark:border-[#222] bg-gray-50/50 dark:bg-white/[0.01]">
                      <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => setIsAnonymous(!isAnonymous)}
                          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium border transition-colors ${isAnonymous ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'border-[#e5e5e5] dark:border-[#333] text-ink-faint'}`}>
                          {isAnonymous ? '👤' : '🧑'} {isAnonymous ? 'Anonymous' : 'Visible'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && submitComment(d.articleId)}
                          placeholder="Add a comment..."
                          className="flex-1 px-3 py-2 text-sm border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-ink dark:focus:border-paper transition-colors" />
                        <button onClick={() => submitComment(d.articleId)} disabled={!newComment.trim() || submitting}
                          className="px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-80 disabled:opacity-30 transition-all">
                          Post
                        </button>
                      </div>
                    </div>
                    {commentsLoading ? (
                      <div className="p-4 animate-pulse space-y-2"><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" /></div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto divide-y divide-[#e5e5e5] dark:divide-[#222]">
                        {comments.map(c => <CommentItem key={c._id} c={c} onLike={likeComment} timeAgo={timeAgo} sentimentColor={sentimentColor} />)}
                        {comments.length === 0 && <div className="p-4 text-center text-xs text-ink-faint">No comments yet.</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* Shared comment item component */
const CommentItem = ({ c, onLike, timeAgo, sentimentColor }) => {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [localReplies, setLocalReplies] = useState(c.replies || []);
  const [replyAnonymous, setReplyAnonymous] = useState(false);

  const submitReply = async () => {
    if (!replyText.trim() || replying) return;
    setReplying(true);
    try {
      const { data } = await api.post(`/collab/comments/${c._id}/reply`, { content: replyText.trim(), isAnonymous: replyAnonymous });
      setLocalReplies(prev => [...prev, data.reply]);
      setReplyText('');
      setShowReply(false);
      setShowReplies(true);
    } catch { /* silent */ }
    finally { setReplying(false); }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-ink dark:text-paper">
          {c.isAnonymous ? '👤 Anonymous' : (c.user?.name || 'Anonymous')}
        </span>
        {c.commentSentiment && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: sentimentColor(c.commentSentiment) + '15', color: sentimentColor(c.commentSentiment) }}>
            {c.commentSentiment}
          </span>
        )}
        {c.badges?.slice(0, 2).map((b, i) => (
          <span key={i} title={b.label} className="text-[10px]">{b.icon}</span>
        ))}
        <span className="text-[10px] text-ink-faint ml-auto">{timeAgo(c.createdAt)}</span>
      </div>
      <p className="text-sm text-ink-secondary dark:text-ink-muted leading-relaxed">{c.content}</p>
      <div className="flex items-center gap-3 mt-1.5">
        <button onClick={() => onLike(c._id)}
          className="flex items-center gap-1 text-[10px] text-ink-faint hover:text-ink dark:hover:text-paper transition-colors">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
          </svg>
          {c.likes?.length || 0}
        </button>
        <button onClick={() => setShowReply(!showReply)}
          className="flex items-center gap-1 text-[10px] text-ink-faint hover:text-ink dark:hover:text-paper transition-colors">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
          </svg>
          Reply
        </button>
        {localReplies.length > 0 && (
          <button onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-[10px] text-ink-faint hover:text-ink dark:hover:text-paper transition-colors">
            {localReplies.length} repl{localReplies.length !== 1 ? 'ies' : 'y'}
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: showReplies ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        )}
      </div>

      {/* Reply input */}
      {showReply && (
        <div className="mt-2 ml-4 pl-3 border-l-2 border-[#e5e5e5] dark:border-[#333]">
          <div className="flex items-center gap-2 mb-1.5">
            <button onClick={() => setReplyAnonymous(!replyAnonymous)}
              className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium border transition-colors ${replyAnonymous ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'border-[#e5e5e5] dark:border-[#333] text-ink-faint'}`}>
              {replyAnonymous ? '👤 Anonymous' : '🧑 Visible'}
            </button>
          </div>
          <div className="flex gap-2">
            <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitReply()}
              placeholder="Write a reply..."
              className="flex-1 px-2.5 py-1.5 text-xs border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-ink dark:focus:border-paper transition-colors" />
            <button onClick={submitReply} disabled={!replyText.trim() || replying}
              className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-80 disabled:opacity-30 transition-all">
              Reply
            </button>
          </div>
        </div>
      )}

      {/* Replies list */}
      {showReplies && localReplies.length > 0 && (
        <div className="mt-2 ml-4 pl-3 border-l-2 border-[#e5e5e5] dark:border-[#333] space-y-2">
          {localReplies.map(r => (
            <div key={r._id} className="py-1.5">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-semibold text-ink dark:text-paper">
                  {r.isAnonymous ? '👤 Anonymous' : (r.user?.name || 'Anonymous')}
                </span>
                <span className="text-[9px] text-ink-faint">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="text-xs text-ink-secondary dark:text-ink-muted leading-relaxed">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
import { 
  fetchAndAnalyzeNews, fetchNewsFast, getDashboardInit, getTopSources,
  generateDigest, generateForecast, getRegionalData, getHistory
} from '../services/api';
import { exportToCSV } from '../services/exportUtils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const FILTER_OPTIONS = [
  { key: 'All',      label: 'All' },
  { key: 'Positive', label: 'Positive' },
  { key: 'Negative', label: 'Negative' },
  { key: 'Neutral',  label: 'Neutral' },
  { key: 'Alerts',   label: '🔴 Alerts', isAlert: true },
];

const ALL_SOURCES = 'ALL_SOURCES';

const calcDistribution = (arts) => ({
  Positive: arts.filter(a => (a.sentiment || 'Neutral') === 'Positive').length,
  Negative: arts.filter(a => (a.sentiment || 'Neutral') === 'Negative').length,
  Neutral:  arts.filter(a => (a.sentiment || 'Neutral') === 'Neutral').length,
});

const TIME_OPTIONS = [
  { key: '',    labelKey: 'allTime' },
  { key: '24h', labelKey: 'last24h' },
  { key: '7d',  labelKey: 'last7d' },
  { key: '30d', labelKey: 'last30d' },
];

// Consistent card style
const CARD = 'border border-paper-line dark:border-paper-dark-line bg-paper-card dark:bg-paper-dark-card';

// Widget layout defaults
const DEFAULT_VISIBILITY = { kpi: true, charts: true, articles: true, ai: true, wordcloud: true, sources: true };
const DEFAULT_WIDGET_ORDER = ['kpi', 'charts', 'ai', 'articles', 'wordcloud', 'sources'];
const WIDGET_ID_MAP = {
  'sentiment-overview': 'kpi',
  'recent-articles': 'articles',
  'source-stats': 'sources',
  'ai-insights': 'ai',
};

/**
 * Trend badge – shows % change vs previous period.
 * `pct` is the raw percentage change (e.g. 12, -5, 0).
 * `inverted` inverts the arrow colour logic (used for Negative sentiment
 * where a decrease is actually good).
 */
const TrendBadge = ({ pct, inverted = false }) => {
  if (pct === 0 || pct === undefined || pct === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-1">
        → 0% vs last week
      </span>
    );
  }
  const isUp = pct > 0;
  // For "normal" metrics up = green, down = red.
  // For inverted metrics (negative sentiment) flip that.
  const good = inverted ? !isUp : isUp;
  const colorClass = good
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-500 dark:text-red-400';
  const arrow = isUp ? '↑' : '↓';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${colorClass} mt-1`}>
      {arrow}{Math.abs(pct)}% vs last week
    </span>
  );
};

const Dashboard = () => {
  const { user, toggleBookmark } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const socket = useSocket();
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [filter, setFilter]               = useState('All');
  const [sourceFilter, setSourceFilter]     = useState(ALL_SOURCES);
  const [page, setPage]                 = useState(1);
  const LIMIT                           = 10;
  const [timeframe, setTimeframe]         = useState('');
  const [isHistoryView, setIsHistoryView] = useState(true);
  const [currentQuery, setCurrentQuery]   = useState('');

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState('overview');
  const [tabSwitching, setTabSwitching] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [dashboardLayout, setDashboardLayout] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showFabTooltip, setShowFabTooltip] = useState(false);

  // Widget layout state (persisted to localStorage)
  const [widgetVisibility, setWidgetVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard-widget-visibility');
      return saved ? { ...DEFAULT_VISIBILITY, ...JSON.parse(saved) } : DEFAULT_VISIBILITY;
    } catch { return DEFAULT_VISIBILITY; }
  });
  const [layoutOrder, setLayoutOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard-layout-order');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = [...new Set([...parsed, ...DEFAULT_WIDGET_ORDER])];
        return merged.filter(k => DEFAULT_WIDGET_ORDER.includes(k));
      }
      return DEFAULT_WIDGET_ORDER;
    } catch { return DEFAULT_WIDGET_ORDER; }
  });
  const [draggedWidget, setDraggedWidget] = useState(null);

  // Onboarding tour
  const { key: tourKey, startTour } = useOnboardingTour();

  const handleTabSwitch = useCallback((tab) => {
    if (tab === mobileTab) return;
    setTabSwitching(true);
    setMobileTab(tab);
    setTimeout(() => setTabSwitching(false), 150);
  }, [mobileTab]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pull-to-refresh
  const handlePullRefresh = useCallback(async () => {
    await queryClient.invalidateQueries(['dashboardInit']);
    await queryClient.invalidateQueries(['topSources']);
    await queryClient.invalidateQueries(['regionalData']);
  }, [queryClient]);
  const { pullDistance, isRefreshing, onTouchStart: pullTouchStart, onTouchMove: pullTouchMove, onTouchEnd: pullTouchEnd } = usePullToRefresh(handlePullRefresh);

  // Swipe between tabs
  const MOBILE_TABS = ['overview', 'charts', 'community', 'ai'];
  const { onTouchStart: swipeTouchStart, onTouchEnd: swipeTouchEnd } = useSwipeTabs(MOBILE_TABS, mobileTab, setMobileTab);

  // FAB label tooltip on first visit
  useEffect(() => {
    if (!isMobile) return;
    const seen = localStorage.getItem('fab-tooltip-seen');
    if (!seen) {
      setShowFabTooltip(true);
      const timer = setTimeout(() => {
        setShowFabTooltip(false);
        localStorage.setItem('fab-tooltip-seen', '1');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  // Persist widget layout to localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-widget-visibility', JSON.stringify(widgetVisibility));
  }, [widgetVisibility]);
  useEffect(() => {
    localStorage.setItem('dashboard-layout-order', JSON.stringify(layoutOrder));
  }, [layoutOrder]);

  // Dashboard Init Query (History Mode)
  const { 
    data: dashboardData, 
    isFetching: isDashboardFetching,
    isLoading: isDashboardLoading,
    error: dashboardError 
  } = useQuery({
    queryKey: ['dashboardInit', timeframe, page],
    queryFn: () => getDashboardInit({ limit: LIMIT, page, timeframe }),
    enabled: isHistoryView,
    staleTime: 60000,
  });

  // Top Sources Query
  const { data: sourcesData, isLoading: isSourcesLoading } = useQuery({
    queryKey: ['topSources', isHistoryView ? '' : currentQuery],
    queryFn: () => getTopSources(isHistoryView ? '' : currentQuery),
    staleTime: 60000,
  });

  // Regional Data Query
  const { data: regData, isLoading: isRegLoading } = useQuery({
    queryKey: ['regionalData', isHistoryView ? '' : currentQuery],
    queryFn: () => getRegionalData(isHistoryView ? '' : currentQuery),
    staleTime: 60000,
  });

  // States that still need manual management
  const [searchArticles, setSearchArticles] = useState([]);
  const [searchDistribution, setSearchDistribution] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [digest, setDigest]               = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [forecast, setForecast]           = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [manualError, setManualError]     = useState('');
  const [noResultsQuery, setNoResultsQuery] = useState(null);
  const [showExportSheet, setShowExportSheet] = useState(false);

  // Back gesture handling for export sheet
  useEffect(() => {
    if (!showExportSheet) return;
    window.history.pushState(null, '');
    const handlePopState = () => setShowExportSheet(false);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showExportSheet]);

  // Reset page when timeframe changes
  useEffect(() => {
    setPage(1);
  }, [timeframe]);

  // Derived Values
  const articles = isHistoryView ? (dashboardData?.history?.articles || []) : searchArticles;
  const distribution = isHistoryView 
    ? (dashboardData?.stats?.sentiments || { Positive: 0, Negative: 0, Neutral: 0 })
    : (searchDistribution || { Positive: 0, Negative: 0, Neutral: 0 });
  const trends = dashboardData?.trends || [];
  const sources = sourcesData || [];
  const regionalData = regData || [];

  // Transform distribution for new charts (capital -> lowercase)
  const chartDistribution = {
    positive: distribution.Positive || distribution.positive || 0,
    negative: distribution.Negative || distribution.negative || 0,
    neutral: distribution.Neutral || distribution.neutral || 0,
  };
  const keywords = dashboardData?.keywords || [];
  const stats = dashboardData?.stats || { total: 0, sentiments: {}, alerts: 0 };
  const periodComparison = dashboardData?.periodComparison || { total: 0, positive: 0, negative: 0, neutral: 0 };
  const error = manualError || (dashboardError ? (dashboardError.friendlyMessage || 'Could not load analysis history. Please check if the server is running.') : '');
  
  const initLoading = isDashboardLoading && isHistoryView;
  const historyLoading = isDashboardFetching && !isDashboardLoading && isHistoryView;

  const loadForecastAndDigest = useCallback((fetchedArticles, query) => {
    if (!fetchedArticles.length) {
      setDigest(null);
      setForecast(null);
      setDigestLoading(false);
      setForecastLoading(false);
      return;
    }

    setDigestLoading(true);
    setForecastLoading(true);

    generateDigest(fetchedArticles, query)
      .then(res => setDigest(res.digest || null))
      .catch(() => setDigest(null))
      .finally(() => setDigestLoading(false));

    generateForecast(fetchedArticles, query)
      .then(res => setForecast(res))
      .catch(() => setForecast(null))
      .finally(() => setForecastLoading(false));
  }, []);

  // Automatically trigger forecast when history data loads (once per view switch)
  const hasTriedAutoForecast = useRef(false);
  useEffect(() => {
    if (!isHistoryView) hasTriedAutoForecast.current = false;
  }, [isHistoryView]);

  useEffect(() => {
    if (isHistoryView && articles.length > 0 && !digest && !forecast && !digestLoading && !forecastLoading && !hasTriedAutoForecast.current) {
      hasTriedAutoForecast.current = true;
      loadForecastAndDigest(articles, 'Recent History');
    }
  }, [articles, isHistoryView, digest, forecast, digestLoading, forecastLoading, loadForecastAndDigest]);

  const handleManualForecast = () => {
    if (isMobile) setMobileTab('ai');
    loadForecastAndDigest(articles, isHistoryView ? 'History Overview' : currentQuery);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleSearch = async (query, pageSize, latest = false) => {
    setSearchLoading(true);
    setManualError('');
    setIsHistoryView(false);
    setCurrentQuery(latest ? 'Latest Headlines' : query);
    setDigest(null);

    const msg = latest ? 'Fetching Latest Headlines...' : `Searching for "${query}"...`;
    const searchToast = toast.loading(msg);
    setAnalysisProgress({ done: 0, total: 0 });

    const progressHandler = (data) => {
      setAnalysisProgress(data);
      if (data.total > 0) {
        toast.loading(`Analyzing ${data.done}/${data.total} articles...`, { id: searchToast });
      }
      if (data.complete) setAnalysisProgress(null);
    };
    if (socket) socket.on('analysis_progress', progressHandler);

    try {
      // FAST PATH: get cached articles from DB instantly (<500ms)
      let fastData = null;
      try {
        fastData = await fetchNewsFast(query, pageSize, latest);
        if (fastData?.articles?.length > 0) {
          setSearchArticles(fastData.articles);
          setSearchDistribution(fastData.sentimentDistribution || calcDistribution(fastData.articles));
          setNoResultsQuery(null);
          toast.loading(`Showing ${fastData.articles.length} cached articles. Fetching fresh...`, { id: searchToast });
        }
      } catch (fastErr) {
        // Fast path failed (e.g. DB not connected) — continue with full pipeline
        console.warn('Fast path unavailable:', fastErr.message);
      }

      // FULL PIPELINE: RSS fetch + AI analysis + DB upsert (slow but fresh)
      const data = await fetchAndAnalyzeNews(query, pageSize, latest);
      const fetched = data.articles || [];

      if (fetched.length === 0 && !fastData?.articles?.length) {
        toast.error('No articles found.', { id: searchToast });
        setNoResultsQuery(latest ? null : query);
        setIsHistoryView(true);
        return;
      }
      setNoResultsQuery(null);
      setSearchArticles(fetched.length > 0 ? fetched : fastData.articles);
      setSearchDistribution(data.sentimentDistribution || calcDistribution(fetched));
      toast.success(`Analyzed ${fetched.length || fastData.articles.length} articles!`, { id: searchToast });

      queryClient.invalidateQueries(['dashboardInit']);
      loadForecastAndDigest(fetched.length > 0 ? fetched : fastData.articles, query);
    } catch (err) {
      const msg = err.friendlyMessage || err.response?.data?.error || err.message || 'Failed to fetch news.';
      setManualError(msg);
      toast.error(msg, { id: searchToast });
    } finally {
      setSearchLoading(false);
      setAnalysisProgress(null);
      if (socket) socket.off('analysis_progress');
    }
  };

  const handleExport = () => {
    const filename = isHistoryView ? 'malaysia-news-history.csv' : `sentiment-analysis-${currentQuery}.csv`;
    exportToCSV(articles, filename);
    toast.success('Successfully exported to CSV');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const pdfToast = toast.loading('Generating PDF report...');
    try {
      const response = await api.post('/reports/generate', {
        topic: currentQuery || 'All Topics',
        dateFrom: '',
        dateTo: '',
      }, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `malaysia-news-sentiment-report-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF report downloaded!', { id: pdfToast });
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF report.', { id: pdfToast });
    }
  };

  // Extract unique sources for the source filter dropdown
  const uniqueSources = useMemo(() => {
    const names = [...new Set(articles.map(a => {
      const s = a.source;
      return typeof s === 'object' ? s?.name : s;
    }).filter(Boolean))].sort();
    return names;
  }, [articles]);

  const filteredArticles = useMemo(() => {
    let result = articles;
    if (filter !== 'All' && filter !== 'all') {
      result = result.filter(a => a.sentiment === filter);
    }
    if (sourceFilter !== ALL_SOURCES) {
      result = result.filter(a => {
        const s = a.source;
        const name = typeof s === 'object' ? s?.name : s;
        return name === sourceFilter;
      });
    }
    return result;
  }, [articles, filter, sourceFilter]);

  const counts = {
    total:    stats.total || articles.length,
    positive: stats.sentiments?.Positive || articles.filter(a => a.sentiment === 'Positive').length,
    negative: stats.sentiments?.Negative || articles.filter(a => a.sentiment === 'Negative').length,
    neutral:  stats.sentiments?.Neutral || articles.filter(a => a.sentiment === 'Neutral').length,
    alerts:   stats.alerts || articles.filter(a => a.isAlert).length,
  };

  const KPI = [
    { 
      label: t('totalArticles'), 
      value: counts.total, 
      color: 'text-white', 
      sub: 'articles analyzed', 
      hero: true,
      trend: periodComparison.total,
    },
    { 
      label: t('positive'), 
      value: counts.positive, 
      color: 'text-white', 
      sub: `${counts.total ? Math.round(counts.positive / counts.total * 100) : 0}% of total`,
      trend: periodComparison.positive,
    },
    { 
      label: t('negative'), 
      value: counts.negative, 
      color: 'text-white', 
      sub: `${counts.total ? Math.round(counts.negative / counts.total * 100) : 0}% of total`,
      trend: periodComparison.negative,
      trendInverted: true,
    },
    { 
      label: t('neutral'), 
      value: counts.neutral, 
      color: 'text-white', 
      sub: `${counts.total ? Math.round(counts.neutral / counts.total * 100) : 0}% of total`,
      trend: periodComparison.neutral,
    },
  ];

  // Track previous tab index for slide direction
  const prevTabIndex = useRef(0);
  const MOBILE_TAB_KEYS = ['overview', 'charts', 'ai'];
  const currentTabIndex = MOBILE_TAB_KEYS.indexOf(mobileTab);
  const slideDirection = currentTabIndex > prevTabIndex.current ? 1 : -1;
  
  useEffect(() => {
    prevTabIndex.current = currentTabIndex;
  }, [currentTabIndex]);

  // Activity 2.4: Responsive slide offset based on screen width
  const slideVariants = {
    enter: (direction) => ({ 
      x: direction > 0 ? (window.innerWidth < 375 ? 60 : 80) : (window.innerWidth < 375 ? -60 : -80), 
      opacity: 0 
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ 
      x: direction > 0 ? (window.innerWidth < 375 ? -60 : -80) : (window.innerWidth < 375 ? 60 : 80), 
      opacity: 0 
    }),
  };

  // Click-to-filter on pie chart (Activity 2.2 - Toggle behaviour)
  const handlePieSegmentClick = (sentimentName) => {
    // Toggle: if already filtered by this sentiment, reset to 'all'
    setFilter(filter === sentimentName ? 'All' : sentimentName);
  };

  // Click-to-filter on KPI cards (Activity 1.1 - Perfective Maintenance)
  const handleKpiClick = (sentimentLabel) => {
    // Map KPI label to sentiment filter value
    const labelToSentiment = {
      'positive': 'Positive',
      'negative': 'Negative', 
      'neutral': 'Neutral'
    };
    
    const sentimentValue = labelToSentiment[sentimentLabel.toLowerCase()];
    if (sentimentValue) {
      // Toggle: if already filtered by this sentiment, reset to 'all'
      setFilter(filter === sentimentValue ? 'All' : sentimentValue);
    }
  };

  // Drag-and-drop handlers for widget reordering
  const handleDragStart = useCallback((e, widgetKey) => {
    setDraggedWidget(widgetKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widgetKey);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetKey) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetKey) { setDraggedWidget(null); return; }
    setLayoutOrder(prev => {
      const newOrder = [...prev];
      const fromIdx = newOrder.indexOf(draggedWidget);
      const toIdx = newOrder.indexOf(targetKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, draggedWidget);
      return newOrder;
    });
    setDraggedWidget(null);
  }, [draggedWidget]);

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null);
  }, []);

  // Handle customizer save — maps DashboardCustomizer layout to widget states
  const handleCustomizerSave = useCallback((layout) => {
    setDashboardLayout(layout);
    const vis = { ...DEFAULT_VISIBILITY };
    const order = [];
    layout.forEach(item => {
      const key = WIDGET_ID_MAP[item.widgetId];
      if (key) {
        vis[key] = item.visible;
        order.push(key);
      }
    });
    // Add widgets not present in the customizer (charts, wordcloud)
    DEFAULT_WIDGET_ORDER.forEach(k => { if (!order.includes(k)) order.push(k); });
    setWidgetVisibility(vis);
    setLayoutOrder(order.filter(k => DEFAULT_WIDGET_ORDER.includes(k)));
  }, []);

  // Reset layout to defaults
  const handleResetLayout = useCallback(() => {
    setWidgetVisibility(DEFAULT_VISIBILITY);
    setLayoutOrder(DEFAULT_WIDGET_ORDER);
    localStorage.removeItem('dashboard-widget-visibility');
    localStorage.removeItem('dashboard-layout-order');
  }, []);

  const isLoading = initLoading || searchLoading;

  // Animation variants - subtle
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.02 }
    }
  };

  const kpiItemVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: { 
      opacity: 1, y: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const chartVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const articleVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { 
      opacity: 1, y: 0,
      transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
    }
  };

  // Section header component
  const SectionHeader = ({ title, badge, widgetKey, children }) => (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
        {widgetKey && (
          <span
            draggable
            onDragStart={(e) => handleDragStart(e, widgetKey)}
            onDragEnd={handleDragEnd}
            className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
            title="Drag to reorder"
          >
            <GripVertical size={14} />
          </span>
        )}
        {title}
        {badge !== undefined && (
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full normal-case tracking-normal">{badge}</span>
        )}
      </h2>
      {children}
    </div>
  );

  return (
    <div
      className="relative"
      onTouchStart={(e) => { pullTouchStart(e); swipeTouchStart(e); }}
      onTouchMove={pullTouchMove}
      onTouchEnd={(e) => { pullTouchEnd(e); swipeTouchEnd(e); }}
    >
      {/* Pull-to-refresh indicator */}
      {isMobile && (pullDistance > 0 || isRefreshing) && (
        <div className="flex items-center justify-center overflow-hidden transition-all" style={{ height: pullDistance, opacity: Math.min(pullDistance / 80, 1) }}>
          <div className={`text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 3}deg)` }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </div>
        </div>
      )}

      <AnalyzingOverlay progress={analysisProgress} />

      {/* Newspaper Masthead */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-0 border-b border-ink dark:border-paper pb-0"
        data-tour="metrics"
      >
        {/* Top utility bar */}
        <div className="flex items-center justify-between py-2 border-b border-ink/10 dark:border-paper/10">
          <div className="flex items-center gap-3">
            <button
              onClick={startTour}
              className="text-[9px] font-semibold uppercase tracking-[0.25em] text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-colors font-sans"
            >
              Tour
            </button>
            <button
              onClick={() => setLang(lang === 'en' ? 'ms' : 'en')}
              className="text-[9px] font-semibold uppercase tracking-[0.25em] text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper transition-colors font-sans flex items-center gap-1"
            >
              <Globe size={12} />
              {lang === 'en' ? 'BM' : 'ENG'}
            </button>
          </div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-ink-muted/70 dark:text-ink-faint/70 font-sans">
            {new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {/* Masthead title */}
        <div className="text-center py-5 sm:py-6">
          <h1 className="font-['Playfair_Display'] text-5xl sm:text-6xl lg:text-[4.5rem] font-black text-ink dark:text-paper tracking-tight leading-none">
            MY News <span className="italic font-normal">Sentiment</span>
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2.5">
            <span className="text-[9px] uppercase tracking-[0.35em] text-ink-muted dark:text-ink-faint font-sans font-medium">Vol 1</span>
            <span className="w-1 h-1 bg-ink/20 dark:bg-paper/20" />
            <span className="text-[9px] uppercase tracking-[0.35em] text-ink-muted dark:text-ink-faint font-sans font-medium">Kuala Lumpur</span>
            <span className="w-1 h-1 bg-ink/20 dark:bg-paper/20" />
            <span className="text-[9px] uppercase tracking-[0.35em] text-ink-muted dark:text-ink-faint font-sans font-medium">Malaysia</span>
          </div>
        </div>
      </motion.div>

      {/* Trending Entities Ticker (O) */}
      <TrendingTicker />

      {/* Search — editorial frame */}
      <div className="border-x border-t border-ink/10 dark:border-paper/10 bg-paper-card dark:bg-paper-dark-card">
        <div className="px-4 py-2.5 border-b border-ink/10 dark:border-paper/10">
          <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-ink-muted dark:text-ink-faint font-sans">Search Archives</span>
        </div>
        <div className="p-4">
          <SearchBarClean onSearch={handleSearch} loading={searchLoading} noResultsQuery={noResultsQuery} />
        </div>
      </div>

      {/* Dashboard Summary Banner */}
      <DashboardSummary distribution={distribution} keywords={keywords} articles={articles} />

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 px-4 py-3 border-l-2 border-red-600 text-red-700 dark:text-red-400 text-sm font-sans"
          role="alert"
        >
          {error}
        </motion.div>
      )}

      {/* Content */}
      <div className="mt-8 transition-opacity">
        {/* Full-page skeleton for initial load with no cached data */}
        {initLoading && articles.length === 0 && !error && (
          <DashboardSkeleton />
        )}

        {/* Empty State */}
        {!error && !isLoading && articles.length === 0 && !initLoading && (
          <EmptyState />
        )}

        {!error && (articles.length > 0 || (isLoading && !initLoading)) && (
          <>
            {/* View Banner - Compact toolbar */}
            <Skeleton name="dash-banner" loading={isLoading}>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border border-ink/10 dark:border-paper/10 flex flex-wrap items-center gap-3 px-4 py-2.5 mb-8"
              >
                {isHistoryView ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Clock size={14} className="text-gray-400" />
                    <span>Showing <strong className="text-gray-900 dark:text-white">{articles.length}</strong> analyses</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Search size={14} className="text-gray-400" />
                    <span>Results for <strong className="text-gray-900 dark:text-white">"{currentQuery}"</strong></span>
                    <button 
                      onClick={() => { setIsHistoryView(true); setManualError(''); }}
                      className="ml-2 flex items-center gap-1 text-[11px] uppercase tracking-wider font-medium text-ink dark:text-paper hover:text-ink-muted dark:hover:text-ink-faint transition-colors"
                    >
                      <ArrowLeft size={12} /> Back
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  {isHistoryView && (
                    <div className="flex items-center gap-0">
                      {TIME_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          className={`px-2 text-xs font-medium uppercase tracking-wider transition-colors font-sans ${
                            timeframe === opt.key 
                              ? 'text-ink dark:text-paper font-bold' 
                              : 'text-ink-faint hover:text-ink-muted'
                          }`}
                          onClick={() => { setTimeframe(opt.key); setPage(1); }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Source filter dropdown */}
                  {uniqueSources.length > 1 && (
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="filter-select text-[11px] uppercase tracking-wider font-medium text-ink dark:text-paper bg-transparent border border-gray-200 dark:border-[#2a2a2a] px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                      title="Filter by source"
                    >
                      <option value={ALL_SOURCES}>ALL SOURCES</option>
                      {uniqueSources.map(src => (
                        <option key={src} value={src}>{src.toUpperCase()}</option>
                      ))}
                    </select>
                  )}
                  {/* Desktop action buttons - icon-only for cleanliness */}
                  <div className="hidden md:flex items-center gap-1 border-l border-gray-200 dark:border-[#2a2a2a] pl-2 ml-1">
                    <button onClick={() => setShowCustomizer(true)} className="p-1.5 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors" title="Customize">
                      <Settings2 size={14} />
                    </button>
                    <button aria-label="Generate forecast" onClick={handleManualForecast} className="p-1.5 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors" title="AI Forecast">
                      <BarChart3 size={14} />
                    </button>
                    <ExportPPT articles={articles} distribution={distribution} sources={sources} query={currentQuery} />
                    <button aria-label="Download as PDF" onClick={handleDownloadPDF} className="p-1.5 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors" title="Download PDF">
                      <FileDown size={14} />
                    </button>
                    <button aria-label="Print dashboard" onClick={handlePrint} className="p-1.5 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors" title="Print Report">
                      <Printer size={14} />
                    </button>
                    <button aria-label="Export data" onClick={handleExport} className="p-1.5 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors" title="Export CSV">
                      <Download size={14} />
                    </button>
                  </div>
                  {/* Mobile: only customize + AI forecast inline, rest in FAB */}
                  <div className="flex md:hidden items-center gap-1">
                    <button onClick={() => setShowCustomizer(true)} className="p-1.5 text-ink-faint hover:text-ink dark:hover:text-paper transition-colors">
                      <Settings2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </Skeleton>

            {/* Mobile Tab Layout */}
            {isMobile ? (
              <>
                <div className="flex border-b border-ink/10 dark:border-paper/10 mb-5">
                  {[
                    { key: 'overview', label: 'Overview', icon: <BarChart3 size={12} /> },
                    { key: 'charts', label: 'Charts', icon: <TrendingUp size={12} /> },
                    
                    { key: 'community', label: 'Community', icon: <Users size={12} /> },
                    { key: 'ai', label: 'AI Insights', icon: <Brain size={12} /> },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] uppercase tracking-wider font-medium transition-all border-b-2 ${
                        mobileTab === tab.key
                          ? 'border-ink dark:border-paper text-ink dark:text-paper'
                          : 'border-transparent text-ink-muted dark:text-ink-faint'
                      }`}
                      onClick={() => handleTabSwitch(tab.key)}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait" custom={slideDirection}>
                {mobileTab === 'overview' && (
                  <motion.div
                    key="overview"
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  >
                  <div className="space-y-6">
                    {/* KPI Cards - PROPER DESIGN */}
                    <div>
                      <SectionHeader title={t("keyMetrics")} />
                      <Skeleton name="kpi-row" loading={isLoading}>
                        <motion.div 
                          className="space-y-5"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {/* Editorial Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-ink/10 dark:border-paper/10">
                            {/* Total Articles — full-width hero stat */}
                            <motion.div 
                              className="col-span-2 p-5 border-b border-ink/10 dark:border-paper/10 bg-paper-card dark:bg-paper-dark-card"
                              variants={kpiItemVariants}
                            >
                              <div className="text-[9px] uppercase tracking-[0.3em] text-ink-muted dark:text-ink-faint font-sans mb-2 font-semibold">
                                Total Analyzed
                              </div>
                              <div className="font-['Playfair_Display'] text-5xl font-black text-flag leading-none">
                                {counts.total.toLocaleString()}
                              </div>
                              <div className="mt-1">
                                <TrendBadge pct={periodComparison.total} />
                              </div>
                            </motion.div>

                            {/* Positive */}
                            <motion.div 
                              className="p-5 border-r border-b border-ink/10 dark:border-paper/10 border-l-[3px] border-l-emerald-500 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors"
                              variants={kpiItemVariants}
                              onClick={() => handleKpiClick('positive')}
                            >
                              <div className="text-[9px] uppercase tracking-[0.3em] text-ink-muted dark:text-ink-faint font-sans mb-2 font-semibold">
                                Positive
                              </div>
                              <div className="font-['Playfair_Display'] text-5xl font-black text-emerald-600 dark:text-emerald-500 leading-none">
                                {counts.positive.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-ink-muted dark:text-ink-faint mt-1.5 font-sans">
                                {counts.total ? Math.round(counts.positive / counts.total * 100) : 0}%
                              </div>
                            </motion.div>

                            {/* Negative */}
                            <motion.div 
                              className="p-5 border-b border-ink/10 dark:border-paper/10 border-l-[3px] border-l-red-500 cursor-pointer hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors"
                              variants={kpiItemVariants}
                              onClick={() => handleKpiClick('negative')}
                            >
                              <div className="text-[9px] uppercase tracking-[0.3em] text-ink-muted dark:text-ink-faint font-sans mb-2 font-semibold">
                                Negative
                              </div>
                              <div className="font-['Playfair_Display'] text-5xl font-black text-red-600 dark:text-red-500 leading-none">
                                {counts.negative.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-ink-muted dark:text-ink-faint mt-1.5 font-sans">
                                {counts.total ? Math.round(counts.negative / counts.total * 100) : 0}%
                              </div>
                            </motion.div>

                            {/* Neutral */}
                            <motion.div 
                              className="col-span-2 p-5 border-l-[3px] border-l-gray-400 dark:border-l-gray-500 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors"
                              variants={kpiItemVariants}
                              onClick={() => handleKpiClick('neutral')}
                            >
                              <div className="text-[9px] uppercase tracking-[0.3em] text-ink-muted dark:text-ink-faint font-sans mb-2 font-semibold">
                                Neutral
                              </div>
                              <div className="font-['Playfair_Display'] text-5xl font-black text-gray-500 dark:text-gray-400 leading-none">
                                {counts.neutral.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-ink-muted dark:text-ink-faint mt-1.5 font-sans">
                                {counts.total ? Math.round(counts.neutral / counts.total * 100) : 0}%
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                      </Skeleton>
                    </div>
                    {/* Pie Chart - Editorial */}
                    <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#999] dark:text-[#666] font-sans mb-4 pb-2 border-b border-[#e5e5e5] dark:border-[#222]">Sentiment Distribution</p>
                      <InlineErrorBoundary name="Pie Chart">
                        <SentimentDonutChart distribution={chartDistribution} onSegmentClick={handlePieSegmentClick} activeFilter={filter} />
                      </InlineErrorBoundary>
                    </div>

                    {/* Articles — Editorial */}
                    <div>
                      <div className="border-t-2 border-ink dark:border-paper mb-1" />
                      <div className="border-t border-ink/30 dark:border-paper/30 mb-3" />
                      <SectionHeader title={t("recentArticles")} badge={filteredArticles.length} />
                      <div className="flex gap-1 overflow-x-auto pb-3 mb-3 scrollbar-hide -mx-1 px-1">
                        {FILTER_OPTIONS.map(opt => (
                          <button
                            key={opt.key}
                            className={`shrink-0 px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-semibold transition-colors border ${
                              filter === opt.key
                                ? 'border-ink dark:border-paper text-ink dark:text-paper'
                                : 'border-transparent text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper'
                            }`}
                            onClick={() => setFilter(opt.key)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <StaggerList>
                        <Skeleton name="article-card" loading={isLoading || historyLoading} count={3}>
                          {filteredArticles.length === 0 && !isLoading ? (
                            <div className="text-center py-12 px-6 border border-dashed border-[#e5e5e5] dark:border-[#222]">
                              <p className="font-display text-2xl text-ink dark:text-paper mb-2">
                                No articles yet
                              </p>
                              <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint italic font-serif">
                                {filter !== 'All' || sourceFilter !== ALL_SOURCES
                                  ? 'Try clearing your filters to see all stories.'
                                  : 'Stories appear here once the newsroom ingests fresh articles.'}
                              </p>
                              <div className="editorial-rule mt-6 max-w-[140px] mx-auto" />
                            </div>
                          ) : filteredArticles.slice(0, 5).map((article, idx) => (
                            <React.Fragment key={article._id || article.url}>
                              <StaggerItem>
                                <ArticleCardCompact
                                  article={article}
                                  onBookmark={toggleBookmark}
                                  isBookmarked={user?.bookmarks?.includes(article._id || article.id)}
                                />
                              </StaggerItem>
                              {idx < Math.min(filteredArticles.length, 5) - 1 && (
                                <div className="border-b border-[#e5e5e5] dark:border-[#1a1a1a]" />
                              )}
                            </React.Fragment>
                          ))}
                        </Skeleton>
                      </StaggerList>

                      {isHistoryView && stats.total > LIMIT && (
                        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-[#e5e5e5] dark:border-[#222]">
                          <button
                            disabled={page === 1 || isLoading}
                            onClick={() => handlePageChange(page - 1)}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400 disabled:opacity-30 transition-colors border border-[#e5e5e5] dark:border-[#222]"
                          >
                            <ChevronLeft size={14} /> Prev
                          </button>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-sans">
                            <strong className="text-gray-900 dark:text-white normal-case">{page}</strong> / {Math.ceil(stats.total / LIMIT)}
                          </span>
                          <button
                            disabled={page >= Math.ceil(stats.total / LIMIT) || isLoading}
                            onClick={() => handlePageChange(page + 1)}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400 disabled:opacity-30 transition-colors border border-[#e5e5e5] dark:border-[#222]"
                          >
                            Next <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  </motion.div>
                )}

                {mobileTab === 'charts' && (
                  <motion.div
                    key="charts"
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  >
                  <div className="space-y-5">
                    {articles.length === 0 && !isLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                        <BarChart3 size={48} strokeWidth={1.5} />
                        <p className="mt-3 font-medium">No chart data available</p>
                        <span className="text-xs mt-1">Search or analyze news to see charts</span>
                      </div>
                    ) : (
                      <Skeleton name="charts-grid" loading={isLoading}>
                        <motion.div 
                          className="space-y-4"
                          variants={chartVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <SectionHeader title={t("charts")} />

                          {/* Sentiment Breakdown */}
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#999] dark:text-[#666] font-sans mb-1 pb-2 border-b border-[#e5e5e5] dark:border-[#222]">Sentiment Breakdown</p>
                            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-5">
                              <Suspense fallback={<ChartFallback />}>
                                <InlineErrorBoundary name="Bar Chart">
                                  <SentimentHorizontalBar distribution={chartDistribution} />
                                </InlineErrorBoundary>
                              </Suspense>
                            </div>
                          </div>

                          <hr className="border-0 border-t border-[#e5e5e5] dark:border-[#222] my-1" />

                          {/* Trends Over Time */}
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#999] dark:text-[#666] font-sans mb-1 pb-2 border-b border-[#e5e5e5] dark:border-[#222]">Trends Over Time</p>
                            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-5">
                              <Suspense fallback={<ChartFallback />}>
                                <InlineErrorBoundary name="Trend Chart">
                                  <SentimentAreaChart trendsData={trends} />
                                </InlineErrorBoundary>
                              </Suspense>
                            </div>
                          </div>

                          <hr className="border-0 border-t border-[#e5e5e5] dark:border-[#222] my-1" />

                          {/* Regional Heatmap */}
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#999] dark:text-[#666] font-sans mb-1 pb-2 border-b border-[#e5e5e5] dark:border-[#222]">Regional Sentiment</p>
                            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-5">
                              <Suspense fallback={<ChartFallback />}>
                                <InlineErrorBoundary name="Sentiment Map">
                                  <SentimentHeatmap data={regionalData} loading={isLoading} />
                                </InlineErrorBoundary>
                              </Suspense>
                            </div>
                          </div>

                          <hr className="border-0 border-t border-[#e5e5e5] dark:border-[#222] my-1" />

                          {/* Top Sources */}
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#999] dark:text-[#666] font-sans mb-1 pb-2 border-b border-[#e5e5e5] dark:border-[#222]">Top News Sources</p>
                            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-5">
                              <Suspense fallback={<ChartFallback />}>
                                <InlineErrorBoundary name="Sources Chart">
                                  <TopSourcesHorizontal sourcesData={sources} />
                                </InlineErrorBoundary>
                              </Suspense>
                            </div>
                          </div>
                        </motion.div>
                      </Skeleton>
                    )}
                  </div>
                  </motion.div>
                )}

                {mobileTab === 'community' && (
                  <motion.div
                    key="community"
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  >
                  <div className="space-y-5">
                    <SectionHeader title="Community" />
                    <InlineErrorBoundary name="Community">
                      <CommunityInline />
                    </InlineErrorBoundary>
                  </div>
                  </motion.div>
                )}

                {mobileTab === 'ai' && (
                  <motion.div
                    key="ai"
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  >
                  <div className="space-y-5">
                    <SectionHeader title={t("aiInsights")} />
                    {(digest || digestLoading) && (
                      <AiDigestCard digest={digest} loading={digestLoading} topic={currentQuery} />
                    )}
                    <InlineErrorBoundary name="AI Forecast">
                      <ForecastCard forecast={forecast} loading={forecastLoading} topic={currentQuery} />
                    </InlineErrorBoundary>
                    <Skeleton name="word-cloud" loading={isLoading}>
                      <div className={`${CARD} p-4`}>
                        <InlineErrorBoundary name="Word Cloud">
                          <WordCloud words={keywords} />
                        </InlineErrorBoundary>
                      </div>
                    </Skeleton>
                    <div className={`${CARD} p-4`}>
                      <InlineErrorBoundary name="Source Credibility">
                        <SourceCredibility />
                      </InlineErrorBoundary>
                    </div>
                  </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </>
            ) : (
              /* Desktop Layout */
              <>
                <div className="grid grid-cols-[1fr_300px] gap-8">
                  <div className="flex flex-col gap-8">
                    {(digest || digestLoading) && !isHistoryView && (
                      <AiDigestCard digest={digest} loading={digestLoading} topic={currentQuery} />
                    )}

                    {/* KPI Cards - PROPER DESIGN */}
                    {widgetVisibility.kpi && (
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'kpi')}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, 'kpi')}
                      onDragEnd={handleDragEnd}
                      style={{ order: layoutOrder.indexOf('kpi') }}
                      className={`transition-opacity ${draggedWidget === 'kpi' ? 'opacity-40' : ''}`}
                    >
                    <div>
                      <SectionHeader title={t("keyMetrics")} widgetKey="kpi" />
                      <Skeleton name="kpi-row" loading={isLoading}>
                        <motion.div
                          className="space-y-5"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {/* Editorial Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-ink/10 dark:border-paper/10">
                            {/* Total Articles — hero stat */}
                            <motion.div
                              className="p-5 border-r border-b border-ink/10 dark:border-paper/10 bg-paper-card dark:bg-paper-dark-card"
                              variants={kpiItemVariants}
                            >
                              <div className="text-[9px] uppercase tracking-[0.3em] text-ink-muted dark:text-ink-faint font-sans mb-2 font-semibold">
                                Total Analyzed
                              </div>
                              <div className="font-['Playfair_Display'] text-5xl font-black text-flag leading-none">
                                {counts.total.toLocaleString()}
                              </div>
                              <div className="mt-1">
                                <TrendBadge pct={periodComparison.total} />
                              </div>
                            </motion.div>

                            {/* Positive */}
                            <motion.div
                              className="p-5 border-r border-b border-ink/10 dark:border-paper/10 border-l-[3px] border-l-emerald-500 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors"
                              variants={kpiItemVariants}
                              onClick={() => handleKpiClick('positive')}
                            >
                              <div className="text-[9px] uppercase tracking-[0.3em] text-ink-muted dark:text-ink-faint font-sans mb-2 font-semibold">
                                Positive
                              </div>
                              <div className="font-['Playfair_Display'] text-5xl font-black text-emerald-600 dark:text-emerald-500 leading-none">
                                {counts.positive.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-ink-muted dark:text-ink-faint mt-1.5 font-sans">
                                {counts.total ? Math.round(counts.positive / counts.total * 100) : 0}%
                              </div>
                            </motion.div>

                            {/* Negative */}
                            <motion.div
                              className="p-5 border-r border-b border-ink/10 dark:border-paper/10 border-l-[3px] border-l-red-500 cursor-pointer hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors"
                              variants={kpiItemVariants}
                              onClick={() => handleKpiClick('negative')}
                            >
                              <div className="text-[9px] uppercase tracking-[0.3em] text-ink-muted dark:text-ink-faint font-sans mb-2 font-semibold">
                                Negative
                              </div>
                              <div className="font-['Playfair_Display'] text-5xl font-black text-red-600 dark:text-red-500 leading-none">
                                {counts.negative.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-ink-muted dark:text-ink-faint mt-1.5 font-sans">
                                {counts.total ? Math.round(counts.negative / counts.total * 100) : 0}%
                              </div>
                            </motion.div>

                            {/* Neutral */}
                            <motion.div
                              className="p-5 border-l-[3px] border-l-gray-400 dark:border-l-gray-500 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors"
                              variants={kpiItemVariants}
                              onClick={() => handleKpiClick('neutral')}
                            >
                              <div className="text-[9px] uppercase tracking-[0.3em] text-ink-muted dark:text-ink-faint font-sans mb-2 font-semibold">
                                Neutral
                              </div>
                              <div className="font-['Playfair_Display'] text-5xl font-black text-gray-500 dark:text-gray-400 leading-none">
                                {counts.neutral.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-ink-muted dark:text-ink-faint mt-1.5 font-sans">
                                {counts.total ? Math.round(counts.neutral / counts.total * 100) : 0}%
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                      </Skeleton>
                    </div>
                    </div>
                    )}
                    {/* Charts Grid */}
                    {widgetVisibility.charts && (
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'charts')}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, 'charts')}
                      onDragEnd={handleDragEnd}
                      style={{ order: layoutOrder.indexOf('charts') }}
                      className={`transition-opacity ${draggedWidget === 'charts' ? 'opacity-40' : ''}`}
                    >
                    <div>
                      <SectionHeader title={t("charts")} widgetKey="charts" />
                      <Skeleton name="charts-grid" loading={isLoading}>
                        <motion.div
                          className="space-y-0"
                          variants={chartVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {/* Row 1: Donut + Horizontal Bar — 2-column */}
                          <div className="grid grid-cols-2 gap-5">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.2em] text-[#999] dark:text-[#666] font-sans mb-1 pb-2 border-b border-[#e5e5e5] dark:border-[#222]">Sentiment Overview</p>
                              <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-5 min-h-[280px] flex flex-col">
                                <InlineErrorBoundary name="Pie Chart">
                                  <SentimentDonutChart distribution={chartDistribution} onSegmentClick={handlePieSegmentClick} activeFilter={filter} />
                                </InlineErrorBoundary>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.2em] text-[#999] dark:text-[#666] font-sans mb-1 pb-2 border-b border-[#e5e5e5] dark:border-[#222]">Sentiment Breakdown</p>
                              <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-5 min-h-[280px] flex flex-col">
                                <Suspense fallback={<ChartFallback />}>
                                  <InlineErrorBoundary name="Bar Chart">
                                    <SentimentHorizontalBar distribution={chartDistribution} />
                                  </InlineErrorBoundary>
                                </Suspense>
                              </div>
                            </div>
                          </div>

                          <hr className="border-0 border-t border-[#e5e5e5] dark:border-[#222] my-4" />

                          {/* Row 2: Regional Heatmap — full width */}
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#999] dark:text-[#666] font-sans mb-1 pb-2 border-b border-[#e5e5e5] dark:border-[#222]">Regional Sentiment</p>
                            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-5 min-h-[280px] flex flex-col">
                              <Suspense fallback={<ChartFallback />}>
                                <InlineErrorBoundary name="Sentiment Map">
                                  <SentimentHeatmap data={regionalData} loading={isLoading} />
                                </InlineErrorBoundary>
                              </Suspense>
                            </div>
                          </div>

                          <hr className="border-0 border-t border-[#e5e5e5] dark:border-[#222] my-4" />

                          {/* Row 3: Trend Chart — full width */}
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#999] dark:text-[#666] font-sans mb-1 pb-2 border-b border-[#e5e5e5] dark:border-[#222]">Trends Over Time</p>
                            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-5 min-h-[280px] flex flex-col">
                              <Suspense fallback={<ChartFallback />}>
                                <InlineErrorBoundary name="Trend Chart">
                                  <SentimentAreaChart trendsData={trends} />
                                </InlineErrorBoundary>
                              </Suspense>
                            </div>
                          </div>

                          <hr className="border-0 border-t border-[#e5e5e5] dark:border-[#222] my-4" />

                          {/* Row 4: Top Sources — full width */}
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#999] dark:text-[#666] font-sans mb-1 pb-2 border-b border-[#e5e5e5] dark:border-[#222]">Top News Sources</p>
                            <div className="border border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111] p-5">
                              <Suspense fallback={<ChartFallback />}>
                                <InlineErrorBoundary name="Sources Chart">
                                  <TopSourcesHorizontal sourcesData={sources} />
                                </InlineErrorBoundary>
                              </Suspense>
                            </div>
                          </div>
                        </motion.div>
                      </Skeleton>
                    </div>
                    </div>
                    )}

                    {/* Forecast */}
                    {widgetVisibility.ai && (
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'ai')}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, 'ai')}
                      onDragEnd={handleDragEnd}
                      style={{ order: layoutOrder.indexOf('ai') }}
                      className={`transition-opacity ${draggedWidget === 'ai' ? 'opacity-40' : ''}`}
                    >
                      <SectionHeader title={t("aiInsights")} widgetKey="ai" />
                      <InlineErrorBoundary name="AI Forecast">
                        <ForecastCard forecast={forecast} loading={forecastLoading} topic={currentQuery} />
                      </InlineErrorBoundary>
                    </div>
                    )}
                  </div>
                  
                  {/* Sidebar */}
                  <aside className="space-y-5">
                    <div className="sticky top-6 space-y-5">
                      {widgetVisibility.wordcloud && (
                      <Skeleton name="word-cloud" loading={isLoading}>
                        <div className={`${CARD} p-5 border-l-[3px] border-l-accent`}>
                          <InlineErrorBoundary name="Word Cloud">
                            <WordCloud words={keywords} />
                          </InlineErrorBoundary>
                        </div>
                      </Skeleton>
                      )}
                      {widgetVisibility.sources && (
                      <div className={`${CARD} p-5 border-l-[3px] border-l-accent`}>
                        <InlineErrorBoundary name="Source Credibility">
                          <SourceCredibility />
                        </InlineErrorBoundary>
                      </div>
                      )}
                    </div>
                  </aside>
                </div>

                {/* Articles Section — Editorial */}
                {widgetVisibility.articles && (
                <div className="mt-10" id="analysis-results">
                  {/* Section rule */}
                  <div className="border-t-2 border-ink dark:border-paper mb-1" />
                  <div className="border-t border-ink/30 dark:border-paper/30 mb-4" />

                  <SectionHeader title={t("recentArticles")} badge={filteredArticles.length}>
                    <div className="flex gap-1">
                      {FILTER_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors border ${
                            filter === opt.key
                              ? 'border-ink dark:border-paper text-ink dark:text-paper'
                              : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                          }`}
                          onClick={() => setFilter(opt.key)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </SectionHeader>

                  <StaggerList>
                    <Skeleton name="article-card" loading={isLoading || historyLoading} count={3}>
                      {filteredArticles.map((article, idx) => (
                          <React.Fragment key={article._id || article.url}>
                            <StaggerItem>
                              <ArticleCardCompact
                                article={article}
                                onBookmark={toggleBookmark}
                                isBookmarked={user?.bookmarks?.includes(article._id || article.id)}
                              />
                            </StaggerItem>
                            {idx < filteredArticles.length - 1 && (
                              <div className="border-b border-[#e5e5e5] dark:border-[#1a1a1a]" />
                            )}
                          </React.Fragment>
                        ))}
                    </Skeleton>
                  </StaggerList>

                  {/* Pagination — Editorial */}
                  {isHistoryView && stats.total > LIMIT && (
                    <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-[#e5e5e5] dark:border-[#222]">
                      <button
                        disabled={page === 1 || isLoading}
                        onClick={() => handlePageChange(page - 1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-gray-900 dark:hover:text-white transition-colors border border-[#e5e5e5] dark:border-[#222]"
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <div className="text-xs text-gray-400 dark:text-gray-500 font-sans uppercase tracking-wider">
                        Page <strong className="text-gray-900 dark:text-white normal-case">{page}</strong> of {Math.ceil(stats.total / LIMIT)}
                      </div>
                      <button
                        disabled={page >= Math.ceil(stats.total / LIMIT) || isLoading}
                        onClick={() => handlePageChange(page + 1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-gray-900 dark:hover:text-white transition-colors border border-[#e5e5e5] dark:border-[#222]"
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
                )}

                {/* Community Section */}
                <div className="mt-10">
                  <SectionHeader title="COMMUNITY" />
                  <InlineErrorBoundary name="Community">
                    <CommunityInline />
                  </InlineErrorBoundary>
                </div>

                {/* Newspaper Footer */}
                <footer className="mt-16 mb-8">
                  <div className="border-t-2 border-ink dark:border-paper mb-1" />
                  <div className="border-t border-ink/20 dark:border-paper/20 mb-5" />
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div>
                      <p className="font-['Playfair_Display'] text-sm font-bold text-gray-900 dark:text-white">
                        MY News Sentiment
                      </p>
                      <p className="text-[9px] uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 font-sans mt-0.5">
                        Automated sentiment analysis for Malaysian news
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-sans">
                        {articles.length} Articles Indexed
                      </span>
                      <span className="w-px h-3 bg-gray-300 dark:bg-[#333]" />
                      <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-sans">
                        Edition {new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#e5e5e5] dark:border-[#1a1a1a] text-center">
                    <p className="text-[8px] uppercase tracking-[0.3em] text-gray-300 dark:text-[#444] font-sans">
                      All analysis is automated and for informational purposes only
                    </p>
                  </div>
                </footer>
              </>
            )}
          </>
        )}
      </div>

      {/* Mobile FABs */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30 md:hidden">
        <AnimatePresence>
          {showFabTooltip && (
            <motion.div
              className="absolute right-14 top-0 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >Export</motion.div>
          )}
        </AnimatePresence>
        <motion.button
          className={`w-11 h-11 rounded-full ${CARD} flex items-center justify-center text-gray-600 dark:text-gray-300`}
          onClick={() => { hapticImpact('Light'); setShowExportSheet(true); }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Export options"
        >
          <Download size={18} />
        </motion.button>
        <AnimatePresence>
          {showFabTooltip && (
            <motion.div
              className="absolute right-14 bottom-0 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >AI Forecast</motion.div>
          )}
        </AnimatePresence>

        <motion.button
          className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white"
          onClick={() => { hapticImpact('Medium'); handleManualForecast(); }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="AI Forecast"
        >
          <BarChart3 size={20} />
        </motion.button>
      </div>

      {/* Export Bottom Sheet */}
      <AnimatePresence>
        {showExportSheet && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExportSheet(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] rounded-t-3xl z-50 p-6 pb-8"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) setShowExportSheet(false);
              }}
            >
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Export Options</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left" onClick={() => { document.querySelector('.export-ppt-trigger')?.click(); setShowExportSheet(false); }}>
                  <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <Printer size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Export PPTX</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left" onClick={() => { handlePrint(); setShowExportSheet(false); }}>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Printer size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Print Report</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left" onClick={() => { handleExport(); setShowExportSheet(false); }}>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <FileDown size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Export CSV</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left" onClick={() => { handleDownloadPDF(); setShowExportSheet(false); }}>
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                    <FileDown size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Download PDF Report</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ScrollToTop />

      {/* Onboarding Tour */}
      <OnboardingTour key={tourKey} />

      {/* Dashboard Customizer Modal */}
      <DashboardCustomizer
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        onSave={handleCustomizerSave}
      />
    </div>
  );
};

export default Dashboard;
// redeploy 1782300222
