import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const SENTIMENT_COLORS = {
  Positive: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  Negative: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  Neutral:  { bg: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' },
};

const UserAvatar = ({ user, size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name} className={`${sizeClass} rounded-full object-cover flex-shrink-0`} />;
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
};

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' });
};

// ── Reply Component ───────────────────────────────────────────
const ReplyItem = ({ reply }) => (
  <div className="flex gap-2.5 py-2.5">
    <UserAvatar user={reply.user} size="sm" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{reply.user?.name || 'User'}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">{timeAgo(reply.createdAt)}</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{reply.content}</p>
    </div>
  </div>
);

// ── Comment Item Component ─────────────────────────────────────
const CommentItem = ({ comment, currentUserId }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [liked, setLiked] = useState(comment.likes?.includes(currentUserId));
  const [likeCount, setLikeCount] = useState(comment.likes?.length || 0);
  const [replies, setReplies] = useState(comment.replies || []);
  const [showReplies, setShowReplies] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  const handleLike = async () => {
    try {
      const res = await api.post(`/collab/comments/${comment._id}/like`);
      setLiked(res.data.liked);
      setLikeCount(res.data.likes);
    } catch (err) {
      // silently fail
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await api.post(`/collab/comments/${comment._id}/reply`, { content: replyText });
      setReplies(prev => [...prev, res.data.reply]);
      setReplyText('');
      setShowReplyForm(false);
      setShowReplies(true);
      toast.success('Reply added');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const sentColor = comment.sentiment ? SENTIMENT_COLORS[comment.sentiment] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-slate-100 dark:border-[#222] last:border-0 py-4"
    >
      <div className="flex gap-3">
        <UserAvatar user={comment.user} />
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-white">{comment.user?.name || 'User'}</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{timeAgo(comment.createdAt)}</span>
            {comment.sentiment && sentColor && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sentColor.bg} ${sentColor.text} ${sentColor.border} border`}>
                {comment.sentiment}
              </span>
            )}
          </div>

          {/* Content */}
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-2 whitespace-pre-wrap">{comment.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                liked
                  ? 'text-rose-500 font-semibold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-rose-400'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-blue-400 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Reply
            </button>

            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
              >
                {showReplies ? 'Hide' : `Show ${replies.length}`} {replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>

          {/* Reply Form */}
          <AnimatePresence>
            {showReplyForm && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleReply}
                className="mt-3 flex gap-2 overflow-hidden"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 text-sm px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#333] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  maxLength={1000}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || submittingReply}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {submittingReply ? '...' : 'Reply'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Replies */}
          <AnimatePresence>
            {showReplies && replies.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="ml-2 pl-3 border-l-2 border-slate-100 dark:border-[#2a2a2a] mt-2 overflow-hidden"
              >
                {replies.map((reply, i) => (
                  <ReplyItem key={reply._id || i} reply={reply} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// ── Main ArticleComments Component ──────────────────────────────
const ArticleComments = ({ articleId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const socket = useSocket();

  const currentUserId = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?._id || user?.id;
    } catch { return null; }
  })();

  const fetchComments = useCallback(async (p = 1) => {
    try {
      const res = await api.get(`/collab/comments/${articleId}?page=${p}&limit=20`);
      if (p === 1) {
        setComments(res.data.comments);
      } else {
        setComments(prev => [...prev, ...res.data.comments]);
      }
      setTotalPages(res.data.pages);
      setPage(p);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewComment = (data) => {
      if (data.articleId?.toString() === articleId?.toString()) {
        setComments(prev => {
          // Avoid duplicates
          if (prev.some(c => c._id === data.comment._id)) return prev;
          return [data.comment, ...prev];
        });
      }
    };

    socket.on('comment:new', handleNewComment);
    return () => socket.off('comment:new', handleNewComment);
  }, [socket, articleId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post('/collab/comments', {
        articleId,
        content: commentText,
      });
      setComments(prev => [res.data.comment, ...prev]);
      setCommentText('');
      toast.success('Comment added');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-5">
        <h3 className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold">
          Discussion
        </h3>
        <span className="text-[10px] text-slate-300 dark:text-slate-600">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts on this article..."
            className="flex-1 text-sm px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#333] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
            rows={3}
            maxLength={2000}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {commentText.length}/2000
          </span>
          <button
            type="submit"
            disabled={!commentText.trim() || submitting}
            className="px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3 py-4 border-b border-slate-100 dark:border-[#222]">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-[#333]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-slate-200 dark:bg-[#333] rounded" />
                <div className="h-3 w-full bg-slate-100 dark:bg-[#252525] rounded" />
                <div className="h-3 w-2/3 bg-slate-100 dark:bg-[#252525] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10">
          <svg className="w-10 h-10 mx-auto mb-3 text-slate-200 dark:text-[#333]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p className="text-sm text-slate-400 dark:text-slate-500">No comments yet. Be the first to share your thoughts.</p>
        </div>
      ) : (
        <>
          {comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              currentUserId={currentUserId}
            />
          ))}

          {page < totalPages && (
            <button
              onClick={() => fetchComments(page + 1)}
              className="w-full mt-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-[#333] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1e1e1e] transition-colors"
            >
              Load more comments
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default ArticleComments;
