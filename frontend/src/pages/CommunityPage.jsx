import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { MessageSquare } from 'lucide-react';

const CARD = 'bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222]';

112|/* --- Sentiment Mark (used by Analytics + Community inline) --- */
113|const SentimentMarkInline = ({ sentiment }) => {
114|  const map = {
115|    Positive: { symbol: "+", color: "text-green-700 dark:text-green-400" },
116|    Negative: { symbol: "\u2212", color: "text-red-700 dark:text-red-400" },
117|    Neutral:  { symbol: "~", color: "text-gray-500 dark:text-gray-400" },
118|  };
119|  const m = map[sentiment] || map.Neutral;
120|  return <span className={`inline-block text-xs font-bold ${m.color} mr-1`}>{m.symbol}</span>;
121|};
122|/* ─── Inline: Community (Discussion Threads + Hot Takes) ─────────── */
123|const CommunityInline = () => {
124|  const [discussions, setDiscussions] = useState([]);
125|  const [hotTakes, setHotTakes] = useState([]);
126|  const [dotd, setDotd] = useState(null);
127|  const [loading, setLoading] = useState(true);
128|  const [expandedId, setExpandedId] = useState(null);
129|  const [comments, setComments] = useState([]);
130|  const [commentsLoading, setCommentsLoading] = useState(false);
131|  const [newComment, setNewComment] = useState('');
132|  const [submitting, setSubmitting] = useState(false);
133|  const [isAnonymous, setIsAnonymous] = useState(false);
134|
135|  useEffect(() => {
136|    let cancelled = false;
137|    (async () => {
138|      try {
139|        const [discRes, hotRes, dotdRes] = await Promise.all([
140|          api.get('/collab/discussions'),
141|          api.get('/collab/hot-takes?limit=3'),
142|          api.get('/collab/discussion-of-day'),
143|        ]);
144|        if (!cancelled) {
145|          setDiscussions(discRes.data.discussions || []);
146|          setHotTakes(hotRes.data.hotTakes || []);
147|          setDotd(dotdRes.data.discussion || null);
148|        }
149|      } catch (err) {
150|        console.error('Community fetch failed:', err);
151|      } finally {
152|        if (!cancelled) setLoading(false);
153|      }
154|    })();
155|    return () => { cancelled = true; };
156|  }, []);
157|
158|  const loadComments = async (articleId) => {
159|    if (expandedId === articleId) { setExpandedId(null); return; }
160|    setExpandedId(articleId);
161|    setCommentsLoading(true);
162|    try {
163|      const { data } = await api.get(`/collab/comments/${articleId}`);
164|      setComments(data.comments || []);
165|    } catch { setComments([]); }
166|    finally { setCommentsLoading(false); }
167|  };
168|
169|  const submitComment = async (articleId) => {
170|    if (!newComment.trim() || submitting) return;
171|    setSubmitting(true);
172|    try {
173|      const { data } = await api.post('/collab/comments', { articleId, content: newComment.trim(), isAnonymous });
174|      setComments(prev => [data.comment, ...prev]);
175|      setNewComment('');
176|      setDiscussions(prev => prev.map(d => 
177|        d.articleId === articleId ? { ...d, commentCount: d.commentCount + 1, lastComment: newComment.trim(), lastCommentAt: new Date().toISOString(), userName: isAnonymous ? 'Anonymous' : d.userName } : d
178|      ));
179|    } catch { /* silent */ }
180|    finally { setSubmitting(false); }
181|  };
182|
183|  const likeComment = async (commentId) => {
184|    try { await api.post(`/collab/comments/${commentId}/like`); } catch {}
185|  };
186|
187|  const timeAgo = (dateStr) => {
188|    if (!dateStr) return '';
189|    const diff = Date.now() - new Date(dateStr).getTime();
190|    const mins = Math.floor(diff / 60000);
191|    if (mins < 1) return 'just now';
192|    if (mins < 60) return mins + 'm ago';
193|    const hrs = Math.floor(mins / 60);
194|    if (hrs < 24) return hrs + 'h ago';
195|    return Math.floor(hrs / 24) + 'd ago';
196|  };
197|
198|  const sentimentColor = (s) => s === 'Positive' ? '#4ADE80' : s === 'Negative' ? '#FB7185' : '#FBBF24';
199|
200|  if (loading) {
201|    return (
202|      <div className={`${CARD} p-5 animate-pulse space-y-3`}>
203|        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
204|        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
205|        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
206|      </div>
207|    );
208|  }
209|
210|  return (
211|    <div className="space-y-4">
212|      {/* Discussion of the Day */}
213|      {dotd && dotd.articleId && (
214|        <div className={`${CARD} overflow-hidden border-l-2`} style={{ borderLeftColor: '#f59e0b' }}>
215|          <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-950/10">
216|            <div className="flex items-center gap-2 mb-1">
217|              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Discussion of the Day</span>
218|              <span className="text-[10px] text-ink-faint">🔥</span>
219|            </div>
220|            <button onClick={() => loadComments(dotd.articleId._id)} className="w-full text-left">
221|              <h4 className="text-sm font-semibold text-ink dark:text-paper leading-snug mb-1">
222|                {dotd.articleId.title}
223|              </h4>
224|              <div className="flex items-center gap-3 text-[10px] text-ink-faint">
225|                <span className="font-semibold uppercase tracking-wider">{dotd.articleId.source}</span>
226|                <span>·</span>
227|                <span>{dotd.commentCount} comment{dotd.commentCount !== 1 ? 's' : ''}</span>
228|                {dotd.reason && <><span>·</span><span className="italic">{dotd.reason}</span></>}
229|              </div>
230|            </button>
231|          </div>
232|
233|          {expandedId === dotd.articleId._id && (
234|            <div className="border-t border-[#e5e5e5] dark:border-[#222]">
235|              <div className="p-3 border-b border-[#e5e5e5] dark:border-[#222] bg-gray-50/50 dark:bg-white/[0.01]">
236|                <div className="flex items-center gap-2 mb-2">
237|                  <button onClick={() => setIsAnonymous(!isAnonymous)}
238|                    className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium border transition-colors ${isAnonymous ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'border-[#e5e5e5] dark:border-[#333] text-ink-faint'}`}>
239|                    {isAnonymous ? '👤' : '🧑'} {isAnonymous ? 'Anonymous' : 'Visible'}
240|                  </button>
241|                </div>
242|                <div className="flex gap-2">
243|                  <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
244|                    onKeyDown={(e) => e.key === 'Enter' && submitComment(dotd.articleId._id)}
245|                    placeholder="Add a comment..."
246|                    className="flex-1 px-3 py-2 text-sm border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-ink dark:focus:border-paper transition-colors" />
247|                  <button onClick={() => submitComment(dotd.articleId._id)} disabled={!newComment.trim() || submitting}
248|                    className="px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-80 disabled:opacity-30 transition-all">
249|                    Post
250|                  </button>
251|                </div>
252|              </div>
253|              {commentsLoading ? (
254|                <div className="p-4 animate-pulse space-y-2"><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" /></div>
255|              ) : (
256|                <div className="max-h-48 overflow-y-auto divide-y divide-[#e5e5e5] dark:divide-[#222]">
257|                  {comments.map(c => <CommentItem key={c._id} c={c} onLike={likeComment} timeAgo={timeAgo} sentimentColor={sentimentColor} />)}
258|                  {comments.length === 0 && <div className="p-4 text-center text-xs text-ink-faint">No comments yet.</div>}
259|                </div>
260|              )}
261|            </div>
262|          )}
263|        </div>
264|      )}
265|
266|      {/* Hot Takes */}
267|      {hotTakes.length > 0 && (
268|        <div className={`${CARD} p-4`}>
269|          <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-3 flex items-center gap-1.5">
270|            🔥 Hot Takes <span className="text-ink-faint font-normal">this week</span>
271|          </h3>
272|          <div className="space-y-2">
273|            {hotTakes.map((ht, i) => (
274|              <button key={ht.articleId} onClick={() => loadComments(ht.articleId)}
275|                className="w-full text-left flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
276|                <span className="text-lg font-bold text-ink-faint w-6 text-right" style={{ fontFamily: 'monospace' }}>{i + 1}</span>
277|                <div className="flex-1 min-w-0">
278|                  <h4 className="text-xs font-semibold text-ink dark:text-paper leading-snug line-clamp-1 mb-0.5">
279|                    {ht.articleTitle || 'Untitled'}
280|                  </h4>
281|                  <div className="flex items-center gap-2 text-[10px] text-ink-faint">
282|                    <span className="font-semibold uppercase tracking-wider">{ht.articleSource || '?'}</span>
283|                    <span>·</span>
284|                    <span>{ht.commentCount} comment{ht.commentCount !== 1 ? 's' : ''}</span>
285|                    <span>·</span>
286|                    <span>{ht.uniqueUserCount} user{ht.uniqueUserCount !== 1 ? 's' : ''}</span>
287|                    {ht.controversy > 30 && (
288|                      <>
289|                        <span>·</span>
290|                        <span className="text-amber-500 font-semibold">⚡ {ht.controversy}% controversial</span>
291|                      </>
292|                    )}
293|                  </div>
294|                </div>
295|                {ht.articleSentiment && (
296|                  <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: sentimentColor(ht.articleSentiment) }} />
297|                )}
298|              </button>
299|            ))}
300|          </div>
301|        </div>
302|      )}
303|
304|      {/* Recent Discussions */}
305|      <div>
306|        <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-2 px-1">
307|          Recent Discussions
308|        </h3>
309|        {!discussions.length ? (
310|          <div className={`${CARD} p-8 text-center`}>
311|            <MessageSquare size={24} className="mx-auto mb-2 text-ink-faint" />
312|            <p className="text-sm text-ink-faint">No discussions yet.</p>
313|            <p className="text-xs text-ink-faint mt-1">Open an article and leave a comment to start.</p>
314|          </div>
315|        ) : (
316|          <div className="space-y-2">
317|            {discussions.map(d => (
318|              <div key={d.articleId} className={`${CARD} overflow-hidden`}>
319|                <button onClick={() => loadComments(d.articleId)}
320|                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
321|                  <div className="flex-shrink-0 pt-0.5"><SentimentMarkInline sentiment={d.articleSentiment} /></div>
322|                  <div className="flex-1 min-w-0">
323|                    <h4 className="text-sm font-semibold text-ink dark:text-paper leading-snug line-clamp-1 mb-1">
324|                      {d.articleTitle || 'Untitled'}
325|                    </h4>
326|                    <p className="text-xs text-ink-muted dark:text-ink-faint line-clamp-1 mb-1.5">
327|                      {d.lastIsAnonymous ? '👤 ' : ''}{d.userName}: "{d.lastComment}"
328|                    </p>
329|                    <div className="flex items-center gap-3 text-[10px] text-ink-faint">
330|                      <span className="font-semibold uppercase tracking-wider">{d.articleSource || 'Unknown'}</span>
331|                      <span>·</span>
332|                      <span>{d.commentCount} comment{d.commentCount !== 1 ? 's' : ''}</span>
333|                      <span>·</span>
334|                      <span>{timeAgo(d.lastCommentAt)}</span>
335|                    </div>
336|                  </div>
337|                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
338|                    className={`flex-shrink-0 text-ink-faint transition-transform ${expandedId === d.articleId ? 'rotate-180' : ''}`}>
339|                    <polyline points="6 9 12 15 18 9"/>
340|                  </svg>
341|                </button>
342|
343|                {expandedId === d.articleId && (
344|                  <div className="border-t border-[#e5e5e5] dark:border-[#222]">
345|                    <div className="p-3 border-b border-[#e5e5e5] dark:border-[#222] bg-gray-50/50 dark:bg-white/[0.01]">
346|                      <div className="flex items-center gap-2 mb-2">
347|                        <button onClick={() => setIsAnonymous(!isAnonymous)}
348|                          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium border transition-colors ${isAnonymous ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'border-[#e5e5e5] dark:border-[#333] text-ink-faint'}`}>
349|                          {isAnonymous ? '👤' : '🧑'} {isAnonymous ? 'Anonymous' : 'Visible'}
350|                        </button>
351|                      </div>
352|                      <div className="flex gap-2">
353|                        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
354|                          onKeyDown={(e) => e.key === 'Enter' && submitComment(d.articleId)}
355|                          placeholder="Add a comment..."
356|                          className="flex-1 px-3 py-2 text-sm border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-ink dark:focus:border-paper transition-colors" />
357|                        <button onClick={() => submitComment(d.articleId)} disabled={!newComment.trim() || submitting}
358|                          className="px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-80 disabled:opacity-30 transition-all">
359|                          Post
360|                        </button>
361|                      </div>
362|                    </div>
363|                    {commentsLoading ? (
364|                      <div className="p-4 animate-pulse space-y-2"><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" /></div>
365|                    ) : (
366|                      <div className="max-h-60 overflow-y-auto divide-y divide-[#e5e5e5] dark:divide-[#222]">
367|                        {comments.map(c => <CommentItem key={c._id} c={c} onLike={likeComment} timeAgo={timeAgo} sentimentColor={sentimentColor} />)}
368|                        {comments.length === 0 && <div className="p-4 text-center text-xs text-ink-faint">No comments yet.</div>}
369|                      </div>
370|                    )}
371|                  </div>
372|                )}
373|              </div>
374|            ))}
375|          </div>
376|        )}
377|      </div>
378|    </div>
379|  );
380|};
381|
382|/* Shared comment item component */
383|const CommentItem = ({ c, onLike, timeAgo, sentimentColor }) => {
384|  const [showReply, setShowReply] = useState(false);
385|  const [replyText, setReplyText] = useState('');
386|  const [replying, setReplying] = useState(false);
387|  const [showReplies, setShowReplies] = useState(false);
388|  const [localReplies, setLocalReplies] = useState(c.replies || []);
389|  const [replyAnonymous, setReplyAnonymous] = useState(false);
390|
391|  const submitReply = async () => {
392|    if (!replyText.trim() || replying) return;
393|    setReplying(true);
394|    try {
395|      const { data } = await api.post(`/collab/comments/${c._id}/reply`, { content: replyText.trim(), isAnonymous: replyAnonymous });
396|      setLocalReplies(prev => [...prev, data.reply]);
397|      setReplyText('');
398|      setShowReply(false);
399|      setShowReplies(true);
400|    } catch { /* silent */ }
401|    finally { setReplying(false); }
402|  };
403|
404|  return (
405|    <div className="px-4 py-3">
406|      <div className="flex items-center gap-2 mb-1">
407|        <span className="text-xs font-semibold text-ink dark:text-paper">
408|          {c.isAnonymous ? '👤 Anonymous' : (c.user?.name || 'Anonymous')}
409|        </span>
410|        {c.commentSentiment && (
411|          <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
412|            style={{ background: sentimentColor(c.commentSentiment) + '15', color: sentimentColor(c.commentSentiment) }}>
413|            {c.commentSentiment}
414|          </span>
415|        )}
416|        {c.badges?.slice(0, 2).map((b, i) => (
417|          <span key={i} title={b.label} className="text-[10px]">{b.icon}</span>
418|        ))}
419|        <span className="text-[10px] text-ink-faint ml-auto">{timeAgo(c.createdAt)}</span>
420|      </div>
421|      <p className="text-sm text-ink-secondary dark:text-ink-muted leading-relaxed">{c.content}</p>
422|      <div className="flex items-center gap-3 mt-1.5">
423|        <button onClick={() => onLike(c._id)}
424|          className="flex items-center gap-1 text-[10px] text-ink-faint hover:text-ink dark:hover:text-paper transition-colors">
425|          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
426|            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
427|          </svg>
428|          {c.likes?.length || 0}
429|        </button>
430|        <button onClick={() => setShowReply(!showReply)}
431|          className="flex items-center gap-1 text-[10px] text-ink-faint hover:text-ink dark:hover:text-paper transition-colors">
432|          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
433|            <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
434|          </svg>
435|          Reply
436|        </button>
437|        {localReplies.length > 0 && (
438|          <button onClick={() => setShowReplies(!showReplies)}
439|            className="flex items-center gap-1 text-[10px] text-ink-faint hover:text-ink dark:hover:text-paper transition-colors">
440|            {localReplies.length} repl{localReplies.length !== 1 ? 'ies' : 'y'}
441|            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
442|              style={{ transform: showReplies ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
443|              <polyline points="6 9 12 15 18 9"/>
444|            </svg>
445|          </button>
446|        )}
447|      </div>
448|
449|      {/* Reply input */}
450|      {showReply && (
451|        <div className="mt-2 ml-4 pl-3 border-l-2 border-[#e5e5e5] dark:border-[#333]">
452|          <div className="flex items-center gap-2 mb-1.5">
453|            <button onClick={() => setReplyAnonymous(!replyAnonymous)}
454|              className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium border transition-colors ${replyAnonymous ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'border-[#e5e5e5] dark:border-[#333] text-ink-faint'}`}>
455|              {replyAnonymous ? '👤 Anonymous' : '🧑 Visible'}
456|            </button>
457|          </div>
458|          <div className="flex gap-2">
459|            <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
460|              onKeyDown={(e) => e.key === 'Enter' && submitReply()}
461|              placeholder="Write a reply..."
462|              className="flex-1 px-2.5 py-1.5 text-xs border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-ink dark:focus:border-paper transition-colors" />
463|            <button onClick={submitReply} disabled={!replyText.trim() || replying}
464|              className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-80 disabled:opacity-30 transition-all">
465|              Reply
466|            </button>
467|          </div>
468|        </div>
469|      )}
470|
471|      {/* Replies list */}
472|      {showReplies && localReplies.length > 0 && (
473|        <div className="mt-2 ml-4 pl-3 border-l-2 border-[#e5e5e5] dark:border-[#333] space-y-2">
474|          {localReplies.map(r => (
475|            <div key={r._id} className="py-1.5">
476|              <div className="flex items-center gap-2 mb-0.5">
477|                <span className="text-[11px] font-semibold text-ink dark:text-paper">
478|                  {r.isAnonymous ? '👤 Anonymous' : (r.user?.name || 'Anonymous')}
479|                </span>
480|                <span className="text-[9px] text-ink-faint">{timeAgo(r.createdAt)}</span>
481|              </div>
482|              <p className="text-xs text-ink-secondary dark:text-ink-muted leading-relaxed">{r.content}</p>
483|            </div>
484|          ))}
485|        </div>
486|      )}
487|    </div>
488|  );
489|};

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
