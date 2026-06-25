import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { MessageSquare } from 'lucide-react';

const CARD = 'bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222]';

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

const CommunityPage = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {t('community') || 'Community'}
        </h1>
        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
          Discussion threads, hot takes, and community sentiment across Malaysian news
        </p>
        <div className="mt-3 border-b border-[#e5e5e5] dark:border-[#222]" />
      </div>

      <CommunityInline />
    </div>
  );
};

export default CommunityPage;
