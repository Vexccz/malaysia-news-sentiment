import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MessageSquare, X, Eye, Bookmark, MessageCircle, Calendar, Shield } from 'lucide-react';

const CARD = 'bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222]';

/* ── User Profile Modal ── */
const UserProfileModal = ({ userId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get(`/auth/profile/${userId}`)
      .then(res => setProfile(res.data.user))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId]);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const sentimentColor = (s) => s === 'Positive' ? '#4ADE80' : s === 'Negative' ? '#FB7185' : '#FBBF24';

  const initials = (profile?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#111] border-b border-[#e5e5e5] dark:border-[#222] px-5 py-3 flex items-center justify-between z-10">
          <span className="text-xs font-semibold text-ink dark:text-paper uppercase tracking-[0.2em] font-sans">User Profile</span>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <X size={16} className="text-ink-muted dark:text-ink-faint" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 animate-pulse space-y-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mx-auto" />
          </div>
        ) : !profile ? (
          <div className="p-6 text-center text-sm text-ink-faint">User not found</div>
        ) : (
          <>
            {/* Profile Info */}
            <div className="p-5 flex flex-col items-center text-center border-b border-[#e5e5e5] dark:border-[#222]">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-16 h-16 rounded-full object-cover border-2 border-[#e5e5e5] dark:border-[#222]" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xl font-bold font-display border-2 border-accent/20">
                  {initials}
                </div>
              )}
              <h3 className="font-display text-lg font-bold text-ink dark:text-paper mt-2">{profile.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider border ${profile.role === 'admin' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-[#e5e5e5] dark:border-[#222] text-ink-muted dark:text-ink-faint'}`}>
                  {profile.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-[11px] text-ink-faint">
                <Calendar size={11} />
                <span>Member since {memberSince}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-[#e5e5e5] dark:divide-[#222] border-b border-[#e5e5e5] dark:border-[#222]">
              <div className="py-3 text-center">
                <p className="text-lg font-bold font-display text-ink dark:text-paper">{profile.analysisCount?.toLocaleString() || '0'}</p>
                <p className="text-[9px] text-ink-faint uppercase tracking-wider">Analyses</p>
              </div>
              <div className="py-3 text-center">
                <p className="text-lg font-bold font-display text-ink dark:text-paper">{profile.commentCount || '0'}</p>
                <p className="text-[9px] text-ink-faint uppercase tracking-wider">Comments</p>
              </div>
              <div className="py-3 text-center">
                <p className="text-lg font-bold font-display text-ink dark:text-paper">{profile.bookmarksCount || '0'}</p>
                <p className="text-[9px] text-ink-faint uppercase tracking-wider">Bookmarks</p>
              </div>
            </div>

            {/* Recent Comments */}
            {profile.recentComments?.length > 0 && (
              <div>
                <div className="px-5 py-2.5 border-b border-[#e5e5e5] dark:border-[#222]">
                  <span className="text-[10px] font-semibold text-ink dark:text-paper uppercase tracking-[0.15em]">Recent Comments</span>
                </div>
                <div className="divide-y divide-[#e5e5e5] dark:divide-[#222]">
                  {profile.recentComments.map((c, i) => (
                    <div key={i} className="px-5 py-2.5">
                      <p className="text-xs text-ink dark:text-paper leading-relaxed line-clamp-2">&ldquo;{c.content}&rdquo;</p>
                      <div className="flex items-center gap-2 mt-1">
                        {c.sentiment && (
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sentimentColor(c.sentiment) }} />
                        )}
                        <span className="text-[10px] text-ink-faint truncate flex-1">{c.articleTitle}</span>
                        <span className="text-[10px] text-ink-faint shrink-0">{timeAgo(c.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const SentimentMarkInline = ({ sentiment }) => {
  const map = {
    Positive: { symbol: "+", color: "text-green-700 dark:text-green-400" },
    Negative: { symbol: "\u2212", color: "text-red-700 dark:text-red-400" },
    Neutral:  { symbol: "~", color: "text-gray-500 dark:text-gray-400" },
  };
  const m = map[sentiment] || map.Neutral;
  return <span className={`inline-block text-xs font-bold ${m.color} mr-1`}>{m.symbol}</span>;
};

const ALLOWED_REACTIONS = ['😂', '😢', '😡', '🔥', '👏', '❤️', '🤔', '💯'];

const CommentItem = ({ c, onLike, timeAgo, sentimentColor, onUserClick, currentUserId, onReact }) => {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [localReplies, setLocalReplies] = useState(c.replies || []);
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [liked, setLiked] = useState(c.likes?.some(id => id === currentUserId || id?.toString() === currentUserId) || false);
  const [likeCount, setLikeCount] = useState(c.likes?.length || 0);
  const [liking, setLiking] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [localReactions, setLocalReactions] = useState(() => {
    // Group reactions from comment data
    const grouped = {};
    (c.reactions || []).forEach(r => {
      const emoji = r.emoji;
      if (!grouped[emoji]) grouped[emoji] = { emoji, count: 0, userReacted: false };
      grouped[emoji].count++;
      if (r.userId === currentUserId || r.userId?.toString() === currentUserId) grouped[emoji].userReacted = true;
    });
    return Object.values(grouped);
  });

  const userInitials = (c.user?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    // Optimistic update
    setLiked(prev => !prev);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    try {
      const { data } = await onLike(c._id);
      setLiked(data.liked);
      setLikeCount(data.likes);
    } catch {
      // Revert on error
      setLiked(prev => !prev);
      setLikeCount(prev => liked ? prev + 1 : prev - 1);
    } finally {
      setLiking(false);
    }
  };

  const handleReact = async (emoji) => {
    setShowReactionPicker(false);
    try {
      const { data } = await onReact(c._id, emoji);
      setLocalReactions(data.reactions || []);
    } catch {}
  };

  const submitReply = async () => {
    if (!replyText.trim() || replying) return;
    setReplying(true);
    try {
      const { data } = await api.post(`/collab/comments/${c._id}/reply`, { content: replyText.trim(), isAnonymous: replyAnonymous });
      setLocalReplies(prev => [...prev, data.reply]);
      setReplyText('');
      setShowReply(false);
      setShowReplies(true);
    } catch {}
    finally { setReplying(false); }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2.5 mb-1.5">
        {/* Avatar */}
        {c.isAnonymous ? (
          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] text-ink-faint flex-shrink-0">
            ?
          </div>
        ) : c.user?.avatar ? (
          <img
            src={c.user.avatar}
            alt={c.user.name}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => c.userId && onUserClick(c.userId)}
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => c.userId && onUserClick(c.userId)}
          >
            {userInitials}
          </div>
        )}
        {/* Username */}
        <span
          className={`text-xs font-semibold ${c.isAnonymous ? 'text-ink-faint' : 'text-ink dark:text-paper cursor-pointer hover:underline'}`}
          onClick={() => !c.isAnonymous && c.userId && onUserClick(c.userId)}
        >
          {c.isAnonymous ? 'Anonymous' : (c.user?.name || 'Anonymous')}
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
      <p className="text-sm text-ink-secondary dark:text-ink-muted leading-relaxed ml-[38px]">{c.content}</p>
      <div className="flex items-center gap-3 mt-1.5 ml-[38px]">
        <button onClick={handleLike} disabled={liking}
          className={`flex items-center gap-1 text-[10px] transition-colors ${liked ? 'text-red-500' : 'text-ink-faint hover:text-ink dark:hover:text-paper'}`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {likeCount}
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
        {/* Reaction button */}
        <div className="relative ml-auto">
          <button onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="text-[10px] text-ink-faint hover:text-ink dark:hover:text-paper transition-colors px-1">
            😊+
          </button>
          {showReactionPicker && (
            <div className="absolute bottom-full right-0 mb-1 flex gap-0.5 p-1.5 bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#333] shadow-lg z-20">
              {ALLOWED_REACTIONS.map(emoji => (
                <button key={emoji} onClick={() => handleReact(emoji)}
                  className="w-7 h-7 flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reaction display */}
      {localReactions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 ml-[38px]">
          {localReactions.map(r => (
            <button key={r.emoji} onClick={() => handleReact(r.emoji)}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] border transition-colors ${
                r.userReacted
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-[#e5e5e5] dark:border-[#333] text-ink-muted dark:text-ink-faint hover:border-ink/30 dark:hover:border-paper/30'
              }`}>
              <span className="text-xs">{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}
        </div>
      )}

      {showReply && (
        <div className="mt-2 ml-[38px] pl-3 border-l-2 border-[#e5e5e5] dark:border-[#333]">
          <div className="flex items-center gap-2 mb-1.5">
            <button onClick={() => setReplyAnonymous(!replyAnonymous)}
              className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium border transition-colors ${replyAnonymous ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'border-[#e5e5e5] dark:border-[#333] text-ink-faint'}`}>
              {replyAnonymous ? 'Anonymous' : 'Visible'}
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

      {showReplies && localReplies.length > 0 && (
        <div className="mt-2 ml-[38px] pl-3 border-l-2 border-[#e5e5e5] dark:border-[#333] space-y-2">
          {localReplies.map(r => {
            const replyInitials = (r.user?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={r._id} className="py-1.5">
                <div className="flex items-center gap-2 mb-0.5">
                  {r.isAnonymous ? (
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[8px] text-ink-faint">?</div>
                  ) : r.user?.avatar ? (
                    <img src={r.user.avatar} alt={r.user.name}
                      className="w-5 h-5 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => r.userId && onUserClick(r.userId)} />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[8px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => r.userId && onUserClick(r.userId)}>
                      {replyInitials}
                    </div>
                  )}
                  <span
                    className={`text-[11px] font-semibold ${r.isAnonymous ? 'text-ink-faint' : 'text-ink dark:text-paper cursor-pointer hover:underline'}`}
                    onClick={() => !r.isAnonymous && r.userId && onUserClick(r.userId)}
                  >
                    {r.isAnonymous ? 'Anonymous' : (r.user?.name || 'Anonymous')}
                  </span>
                  <span className="text-[9px] text-ink-faint">{timeAgo(r.createdAt)}</span>
                </div>
                <p className="text-xs text-ink-secondary dark:text-ink-muted leading-relaxed ml-7">{r.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CommunityPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const socket = useSocket();
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
  const [viewingUserId, setViewingUserId] = useState(null);
  const [trendingKeywords, setTrendingKeywords] = useState([]);
  const [sentimentPulse, setSentimentPulse] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [postContent, setPostContent] = useState('');
  const [postAnonymous, setPostAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState('discussions'); // 'discussions' | 'posts'
  const [polls, setPolls] = useState([]);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [discRes, hotRes, dotdRes, kwRes, spRes] = await Promise.all([
          api.get('/collab/discussions'),
          api.get('/collab/hot-takes?limit=5'),
          api.get('/collab/discussion-of-day'),
          api.get('/collab/trending-keywords?days=7&limit=15'),
          api.get('/collab/sentiment-pulse?days=7'),
          api.get('/collab/leaderboard?days=7&limit=5'),
          api.get('/collab/posts?limit=10'),
          api.get('/collab/polls?limit=3'),
        ]);
        if (!cancelled) {
          setDiscussions(discRes.data.discussions || []);
          setHotTakes(hotRes.data.hotTakes || []);
          setDotd(dotdRes.data.discussion || null);
          setTrendingKeywords(kwRes.data.keywords || []);
          setSentimentPulse(spRes.data || null);
          setLeaderboard(lbRes.data.leaderboard || []);
          setCommunityPosts(postsRes.data.posts || []);
          setPolls(pollsRes.data.polls || []);
        }
      } catch (err) {
        console.error('Community fetch failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Real-time Socket.IO listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewComment = (data) => {
      const { articleId, comment } = data;
      // Update discussions list comment count
      setDiscussions(prev => prev.map(d =>
        d.articleId === articleId
          ? { ...d, commentCount: d.commentCount + 1, lastComment: comment.content, lastCommentAt: comment.createdAt, userName: comment.user?.name || 'Anonymous' }
          : d
      ));
      // If currently viewing this article's comments, add the new one
      if (expandedId === articleId) {
        setComments(prev => {
          if (prev.some(c => c._id === comment._id)) return prev;
          return [comment, ...prev];
        });
      }
    };

    const handleLikeUpdate = (data) => {
      setComments(prev => prev.map(c =>
        c._id === data.commentId ? { ...c, likes: Array(data.likes).fill(null) } : c
      ));
    };

    socket.on('comment:new', handleNewComment);
    socket.on('comment:like', handleLikeUpdate);

    return () => {
      socket.off('comment:new', handleNewComment);
      socket.off('comment:like', handleLikeUpdate);
    };
  }, [socket, expandedId]);

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
    } catch {}
    finally { setSubmitting(false); }
  };

  const likeComment = async (commentId) => {
    const { data } = await api.post(`/collab/comments/${commentId}/like`);
    return { data };
  };

  const reactToComment = async (commentId, emoji) => {
    const { data } = await api.post(`/collab/comments/${commentId}/react`, { emoji });
    return { data };
  };

  const submitPost = async () => {
    if (!postContent.trim() || posting) return;
    setPosting(true);
    try {
      const { data } = await api.post('/collab/posts', { content: postContent.trim(), isAnonymous: postAnonymous });
      setCommunityPosts(prev => [data.post, ...prev]);
      setPostContent('');
      setPostAnonymous(false);
    } catch {}
    finally { setPosting(false); }
  };

  const votePoll = async (pollId, optionIndex) => {
    try {
      const { data } = await api.post(`/collab/polls/${pollId}/vote`, { optionIndex });
      setPolls(prev => prev.map(p =>
        p._id === pollId ? { ...p, options: data.options, totalVotes: data.totalVotes } : p
      ));
    } catch {}
  };

  const createPoll = async () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    try {
      const { data } = await api.post('/collab/polls', {
        question: pollQuestion.trim(),
        options: pollOptions.filter(o => o.trim()),
      });
      // Re-fetch polls to get formatted data
      const res = await api.get('/collab/polls?limit=3');
      setPolls(res.data.polls || []);
      setPollQuestion('');
      setPollOptions(['', '']);
      setShowCreatePoll(false);
    } catch {}
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
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {t('community') || 'Community'}
          </h1>
          <div className="mt-3 border-b border-[#e5e5e5] dark:border-[#222]" />
        </div>
        <div className="space-y-3 animate-pulse">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Share Your Take compose box */}
          <div className={`${CARD} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-faint">Share Your Take</span>
              <button onClick={() => setPostAnonymous(!postAnonymous)}
                className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium border transition-colors ${postAnonymous ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'border-[#e5e5e5] dark:border-[#333] text-ink-faint'}`}>
                {postAnonymous ? 'Anonymous' : 'Visible'}
              </button>
            </div>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What's on your mind about Malaysian news?"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-ink dark:focus:border-paper transition-colors resize-none"
            />
            <div className="flex justify-end mt-2">
              <button onClick={submitPost} disabled={!postContent.trim() || posting}
                className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-80 disabled:opacity-30 transition-all">
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-0 border-b border-[#e5e5e5] dark:border-[#222]">
            <button
              onClick={() => setActiveTab('discussions')}
              className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === 'discussions'
                  ? 'border-ink dark:border-paper text-ink dark:text-paper'
                  : 'border-transparent text-ink-faint hover:text-ink dark:hover:text-paper'
              }`}
            >
              Article Discussions
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === 'posts'
                  ? 'border-ink dark:border-paper text-ink dark:text-paper'
                  : 'border-transparent text-ink-faint hover:text-ink dark:hover:text-paper'
              }`}
            >
              Community Posts
            </button>
          </div>
          {/* Tab content */}
          {activeTab === 'discussions' && (
          <>
          {/* Discussion of the Day */}
          {dotd && dotd.articleId && (
            <div className={`${CARD} overflow-hidden border-l-2`} style={{ borderLeftColor: '#f59e0b' }}>
              <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-950/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Discussion of the Day</span>
                  <span className="text-[10px] text-ink-faint">{'\uD83D\uDD25'}</span>
                </div>
                <button onClick={() => loadComments(dotd.articleId._id)} className="w-full text-left">
                  <h4 className="text-sm font-semibold text-ink dark:text-paper leading-snug mb-1">
                    {dotd.articleId.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] text-ink-faint">
                    <span className="font-semibold uppercase tracking-wider">{dotd.articleId.source}</span>
                    <span>\u00b7</span>
                    <span>{dotd.commentCount} comment{dotd.commentCount !== 1 ? 's' : ''}</span>
                    {dotd.reason && <><span>\u00b7</span><span className="italic">{dotd.reason}</span></>}
                  </div>
                </button>
              </div>

              {expandedId === dotd.articleId._id && (
                <div className="border-t border-[#e5e5e5] dark:border-[#222]">
                  <div className="p-3 border-b border-[#e5e5e5] dark:border-[#222] bg-gray-50/50 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-2 mb-2">
                      <button onClick={() => setIsAnonymous(!isAnonymous)}
                        className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium border transition-colors ${isAnonymous ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'border-[#e5e5e5] dark:border-[#333] text-ink-faint'}`}>
                        {isAnonymous ? '\uD83D\uDC64' : '\uD83E\uDDD1'} {isAnonymous ? 'Anonymous' : 'Visible'}
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
                    <div className="max-h-60 overflow-y-auto divide-y divide-[#e5e5e5] dark:divide-[#222]">
                      {comments.map(c => <CommentItem key={c._id} c={c} onLike={likeComment} timeAgo={timeAgo} sentimentColor={sentimentColor} onUserClick={setViewingUserId} currentUserId={user?._id || user?.id} onReact={reactToComment} />)}
                      {comments.length === 0 && <div className="p-4 text-center text-xs text-ink-faint">No comments yet.</div>}
                    </div>
                  )}
                </div>
              )}
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
                          {d.lastIsAnonymous ? '\uD83D\uDC64 ' : ''}{d.userName}: &ldquo;{d.lastComment}&rdquo;
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-ink-faint">
                          <span className="font-semibold uppercase tracking-wider">{d.articleSource || 'Unknown'}</span>
                          <span>\u00b7</span>
                          <span>{d.commentCount} comment{d.commentCount !== 1 ? 's' : ''}</span>
                          <span>\u00b7</span>
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
                              {isAnonymous ? '\uD83D\uDC64' : '\uD83E\uDDD1'} {isAnonymous ? 'Anonymous' : 'Visible'}
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
                            {comments.map(c => <CommentItem key={c._id} c={c} onLike={likeComment} timeAgo={timeAgo} sentimentColor={sentimentColor} onUserClick={setViewingUserId} currentUserId={user?._id || user?.id} onReact={reactToComment} />)}
                            {comments.length === 0 && <div className="p-4 text-center text-xs text-ink-faint">No comments yet.</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
          )}

          {/* Community Posts tab */}
          {activeTab === 'posts' && (
            <div className="space-y-3">
              {communityPosts.length === 0 ? (
                <div className={`${CARD} p-8 text-center`}>
                  <MessageSquare size={24} className="mx-auto mb-2 text-ink-faint" />
                  <p className="text-sm text-ink-faint">No posts yet.</p>
                  <p className="text-xs text-ink-faint mt-1">Be the first to share your take!</p>
                </div>
              ) : (
                communityPosts.map(p => {
                  const postInitials = (p.user?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={p._id} className={`${CARD} p-4`}>
                      <div className="flex items-center gap-2.5 mb-2">
                        {p.isAnonymous ? (
                          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] text-ink-faint">?</div>
                        ) : p.user?.avatar ? (
                          <img src={p.user.avatar} alt={p.user.name}
                            className="w-7 h-7 rounded-full object-cover cursor-pointer hover:opacity-80"
                            onClick={() => setViewingUserId(p.userId)} />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold cursor-pointer hover:opacity-80"
                            onClick={() => setViewingUserId(p.userId)}>
                            {postInitials}
                          </div>
                        )}
                        <span className={`text-xs font-semibold ${p.isAnonymous ? 'text-ink-faint' : 'text-ink dark:text-paper cursor-pointer hover:underline'}`}
                          onClick={() => !p.isAnonymous && setViewingUserId(p.userId)}>
                          {p.isAnonymous ? 'Anonymous' : (p.user?.name || 'Anonymous')}
                        </span>
                        {p.sentiment && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={{ background: sentimentColor(p.sentiment) + '15', color: sentimentColor(p.sentiment) }}>
                            {p.sentiment}
                          </span>
                        )}
                        <span className="text-[10px] text-ink-faint ml-auto">{timeAgo(p.createdAt)}</span>
                      </div>
                      <p className="text-sm text-ink dark:text-paper leading-relaxed ml-[38px]">{p.content}</p>
                      {p.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 ml-[38px]">
                          {p.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 text-[9px] border border-[#e5e5e5] dark:border-[#333] text-ink-faint">#{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2 ml-[38px]">
                        <span className="flex items-center gap-1 text-[10px] text-ink-faint">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                          </svg>
                          {p.likes?.length || 0}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-ink-faint">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                          </svg>
                          {p.replies?.length || 0}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          {/* Community Polls */}
          {polls.length > 0 && (
            <div className={`${CARD} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-faint flex items-center gap-1.5">
                  {'\uD83D\uDCCA'} Community Polls
                </h3>
                <button onClick={() => setShowCreatePoll(!showCreatePoll)}
                  className="text-[10px] text-accent hover:underline">
                  + Create
                </button>
              </div>

              {/* Create poll form */}
              {showCreatePoll && (
                <div className="mb-3 pb-3 border-b border-[#e5e5e5] dark:border-[#222]">
                  <input
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className="w-full px-2.5 py-1.5 text-xs border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-ink dark:focus:border-paper mb-2"
                  />
                  {pollOptions.map((opt, i) => (
                    <input
                      key={i}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[i] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="w-full px-2.5 py-1 text-[11px] border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] text-ink dark:text-paper placeholder:text-ink-faint focus:outline-none focus:border-ink dark:focus:border-paper mb-1"
                    />
                  ))}
                  {pollOptions.length < 6 && (
                    <button onClick={() => setPollOptions([...pollOptions, ''])}
                      className="text-[10px] text-ink-faint hover:text-ink dark:hover:text-paper mb-2">
                      + Add option
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button onClick={createPoll}
                      className="flex-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-80">
                      Create Poll
                    </button>
                    <button onClick={() => setShowCreatePoll(false)}
                      className="px-2 py-1.5 text-[10px] text-ink-faint border border-[#e5e5e5] dark:border-[#222] hover:bg-gray-50 dark:hover:bg-white/5">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Poll list */}
              <div className="space-y-3">
                {polls.map(poll => (
                  <div key={poll._id}>
                    <p className="text-xs font-semibold text-ink dark:text-paper mb-2">{poll.question}</p>
                    <div className="space-y-1.5">
                      {poll.options.map((opt, i) => {
                        const hasVoted = poll.options.some(o => o.userVoted);
                        return (
                          <button
                            key={i}
                            onClick={() => !hasVoted && votePoll(poll._id, i)}
                            disabled={hasVoted}
                            className={`w-full text-left relative overflow-hidden transition-colors ${
                              hasVoted ? 'cursor-default' : 'hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer'
                            }`}
                          >
                            {/* Background bar */}
                            {hasVoted && (
                              <div
                                className="absolute inset-0 transition-all duration-500"
                                style={{
                                  width: `${opt.percentage}%`,
                                  background: opt.userVoted ? 'rgba(74,222,128,0.15)' : 'rgba(148,152,158,0.1)',
                                }}
                              />
                            )}
                            <div className="relative flex items-center justify-between px-2.5 py-1.5 border border-[#e5e5e5] dark:border-[#222]">
                              <span className="text-[11px] text-ink dark:text-paper">
                                {opt.userVoted && <span className="mr-1">✓</span>}
                                {opt.text}
                              </span>
                              {hasVoted && (
                                <span className="text-[10px] text-ink-faint font-medium">{opt.percentage}%</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-ink-faint mt-1">{poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sentiment Pulse */}
          {sentimentPulse && sentimentPulse.sentiments?.length > 0 && (
            <div className={`${CARD} p-4`}>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-3 flex items-center gap-1.5">
                {'\uD83D\uDCA4'} Sentiment Pulse <span className="text-ink-faint font-normal">7d</span>
              </h3>
              {/* Bar chart */}
              <div className="space-y-2">
                {sentimentPulse.sentiments.map(s => {
                  const color = s.sentiment === 'Positive' ? '#4ADE80' : s.sentiment === 'Negative' ? '#FB7185' : '#FBBF24';
                  return (
                    <div key={s.sentiment}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-medium text-ink dark:text-paper">{s.sentiment}</span>
                        <span className="text-[10px] text-ink-faint">{s.count} ({s.percentage}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full transition-all duration-700"
                          style={{ width: `${s.percentage}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-ink-faint mt-2 text-center">
                {sentimentPulse.total} comments this week
              </p>
            </div>
          )}

          {/* Trending Keywords */}
          {trendingKeywords.length > 0 && (
            <div className={`${CARD} p-4`}>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-3 flex items-center gap-1.5">
                {'\uD83D\uDD2D'} Trending Keywords
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {trendingKeywords.map((kw, i) => {
                  const isTop = i < 3;
                  return (
                    <span
                      key={kw.word}
                      className={`inline-block px-2 py-0.5 border transition-colors cursor-default ${
                        isTop
                          ? 'text-[11px] font-semibold border-ink/30 dark:border-paper/30 text-ink dark:text-paper'
                          : 'text-[10px] border-[#e5e5e5] dark:border-[#333] text-ink-muted dark:text-ink-faint'
                      }`}
                    >
                      {kw.word}
                      <span className="ml-1 text-[8px] opacity-50">{kw.count}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className={`${CARD} p-4`}>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-3 flex items-center gap-1.5">
                {'\uD83C\uDFC6'} Top Contributors <span className="text-ink-faint font-normal">7d</span>
              </h3>
              <div className="space-y-2">
                {leaderboard.map((u, i) => {
                  const lbInitials = (u.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={u.userId} className="flex items-center gap-2.5 py-1">
                      <span className="text-sm w-5 text-center">{i < 3 ? medals[i] : <span className="text-[10px] text-ink-faint">{i + 1}</span>}</span>
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[8px] font-bold">{lbInitials}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-semibold text-ink dark:text-paper truncate block">{u.name}</span>
                        <span className="text-[9px] text-ink-faint">{u.commentCount} comments · {u.totalLikes} likes</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hotTakes.length > 0 && (
            <div className={`${CARD} p-4`}>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-faint mb-3 flex items-center gap-1.5">
                {'\uD83D\uDD25'} Hot Takes <span className="text-ink-faint font-normal">this week</span>
              </h3>
              <div className="space-y-2">
                {hotTakes.map((ht, i) => (
                  <button key={ht.articleId} onClick={() => loadComments(ht.articleId)}
                    className="w-full text-left flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <span className="text-lg font-bold text-ink-faint w-6 text-right" style={{ fontFamily: 'monospace' }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-ink dark:text-paper leading-snug line-clamp-2 mb-0.5">
                        {ht.articleTitle || 'Untitled'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-ink-faint">
                        <span className="font-semibold uppercase tracking-wider">{ht.articleSource || '?'}</span>
                        <span>\u00b7</span>
                        <span>{ht.commentCount} comment{ht.commentCount !== 1 ? 's' : ''}</span>
                        {ht.controversy > 30 && (
                          <>
                            <span>\u00b7</span>
                            <span className="text-amber-500 font-semibold">{'\u26A1'} {ht.controversy}%</span>
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
        </div>
      </div>

      {/* User Profile Modal */}
      {viewingUserId && (
        <UserProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}
    </div>
  );
};

export default CommunityPage;
