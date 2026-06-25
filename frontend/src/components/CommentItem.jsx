import React, { useState, useEffect, useRef } from 'react';
import HoverProfileTooltip from './HoverProfileTooltip';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

const MAX_DEPTH = 3;
const MAX_REPLY_LENGTH = 500;
const DRAFT_SAVE_DELAY = 1000;
const DRAFT_INDICATOR_DURATION = 2000;

const relativeTime = (dateStr) => {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
};

const sentimentStyle = (sentiment) => {
  switch (sentiment) {
    case 'positive': return 'bg-green-700 text-white';
    case 'negative': return 'bg-red-700 text-white';
    case 'neutral': return 'bg-amber-700 text-white';
    default: return 'bg-gray-300 dark:bg-gray-700 text-black dark:text-white';
  }
};

const roleBadgeStyle = (role) => {
  switch (role) {
    case 'admin': return 'bg-red-700 text-white';
    case 'moderator': return 'bg-amber-700 text-white';
    default: return 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  }
};

const CommentItem = ({
  comment,
  onLike,
  onReport,
  currentUserId,
  articleSentiment,
  depth = 0,
  onReply,
}) => {
  const { t } = useLanguage();
  const { user, token } = useAuth();

  const [repliesVisible, setRepliesVisible] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userBadges, setUserBadges] = useState([]);
  const [badgesFetched, setBadgesFetched] = useState(false);
  const [showDraftSaved, setShowDraftSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes || 0);
  const [reported, setReported] = useState(false);

  const draftTimer = useRef(null);
  const textareaRef = useRef(null);

  const commentId = comment._id;
  const discussionId = comment.discussionId;
  const replies = comment.replies || [];

  // Restore draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(`draft_reply_${commentId}`);
    if (draft) {
      setReplyInput(draft);
      setReplyOpen(true);
    }
  }, [commentId]);

  // Auto-save draft
  useEffect(() => {
    if (!replyOpen) return;
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      if (replyInput.trim()) {
        localStorage.setItem(`draft_reply_${commentId}`, replyInput);
        setShowDraftSaved(true);
        setTimeout(() => setShowDraftSaved(false), DRAFT_INDICATOR_DURATION);
      } else {
        localStorage.removeItem(`draft_reply_${commentId}`);
      }
    }, DRAFT_SAVE_DELAY);
    return () => clearTimeout(draftTimer.current);
  }, [replyInput, replyOpen, commentId]);

  // Fetch user badges
  useEffect(() => {
    const fetchBadges = async () => {
      if (badgesFetched || !comment.author) return;
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE}/collab/badges/${comment.author}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setUserBadges(data.badges || data || []);
        }
      } catch (e) {
        // silently fail
      } finally {
        setBadgesFetched(true);
      }
    };
    fetchBadges();
  }, [comment.author, token, badgesFetched]);

  const handleReplyToggle = () => setReplyOpen((v) => !v);

  const handleReplySubmit = async () => {
    if (!replyInput.trim() || replyInput.length > MAX_REPLY_LENGTH || submitting) return;
    setSubmitting(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(
        `${API_BASE}/collab/discussions/${discussionId}/${commentId}/reply`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: replyInput }),
        }
      );
      if (res.ok) {
        setReplyInput('');
        setReplyOpen(false);
        localStorage.removeItem(`draft_reply_${commentId}`);
        if (onReply) onReply(commentId, replyInput);
      }
    } catch (e) {
      console.error('Failed to submit reply:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = () => {
    if (liked) return;
    setLiked(true);
    setLikeCount((c) => c + 1);
    if (onLike) onLike(commentId);
  };

  const handleReport = () => {
    if (reported) return;
    setReported(true);
    if (onReport) onReport(commentId);
  };

  const charCountColor =
    replyInput.length > MAX_REPLY_LENGTH
      ? 'text-red-700'
      : replyInput.length > 400
      ? 'text-amber-700'
      : 'text-gray-500 dark:text-gray-400';

  const displayBadges = userBadges.slice(0, 3);
  const indentClass = depth > 0 ? 'pl-4 border-l-2 border-red-700' : '';
  const isOwnComment = currentUserId && comment.author === currentUserId;

  return (
    <div className={`${indentClass} ${depth > 0 ? 'mt-2' : ''}`}>
      <div className="border border-black/10 dark:border-white/10 bg-white dark:bg-gray-950 p-3">
        {/* Header: avatar + name + badges + role + time */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {/* Author avatar initial */}
          <div className="w-7 h-7 border border-black/20 dark:border-white/20 bg-red-700 text-white flex items-center justify-center text-xs font-serif font-bold">
            {(comment.authorName || 'A')[0]?.toUpperCase() || '?'}
          </div>

          {/* Author name with hover profile */}
          <HoverProfileTooltip
            userId={comment.author}
            userName={comment.authorName}
            userRole={comment.authorRole}
          >
            <span className="font-serif font-bold text-sm text-black dark:text-white cursor-pointer hover:text-red-700 dark:hover:text-red-400">
              {comment.authorName || t('anonymous') || 'Anonymous'}
            </span>
          </HoverProfileTooltip>

          {/* User badges (up to 3) */}
          {displayBadges.map((badge, i) => (
            <span
              key={i}
              className="inline-block px-1 py-0.5 text-[10px] bg-amber-700 text-white font-sans cursor-help"
              title={badge.description || badge.name}
            >
              {badge.icon || badge.name}
            </span>
          ))}

          {/* Role badge */}
          <span
            className={`inline-block px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-sans ${roleBadgeStyle(
              comment.authorRole
            )}`}
          >
            {comment.authorRole || 'user'}
          </span>

          {/* Timestamp */}
          <span className="text-xs text-gray-500 dark:text-gray-400 font-sans ml-auto">
            {relativeTime(comment.createdAt)}
          </span>
        </div>

        {/* Sentiment tag */}
        {comment.sentiment && (
          <span
            className={`inline-block px-1.5 py-0.5 text-[10px] font-sans uppercase tracking-wider mb-1.5 ${sentimentStyle(
              comment.sentiment
            )}`}
          >
            {comment.sentiment}
          </span>
        )}

        {/* Content */}
        <p className="text-sm text-black dark:text-white font-sans whitespace-pre-wrap mb-2">
          {comment.content}
        </p>

        {/* Actions row */}
        <div className="flex items-center gap-3 border-t border-black/10 dark:border-white/10 pt-2">
          {/* Like button */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-xs font-sans transition-colors ${
              liked
                ? 'text-red-700 font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-red-700 dark:hover:text-red-400'
            }`}
            disabled={liked || isOwnComment}
            aria-label={t('like') || 'Like'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.723.723 0 01-.692 0h-.002z" />
            </svg>
            {likeCount}
          </button>

          {/* Reply button (only if depth < MAX_DEPTH) */}
          {depth < MAX_DEPTH && (
            <button
              onClick={handleReplyToggle}
              className="text-xs font-sans text-gray-500 dark:text-gray-400 hover:text-red-700 dark:hover:text-red-400 transition-colors"
            >
              {t('reply') || 'Reply'}
            </button>
          )}

          {/* Report button */}
          {!isOwnComment && (
            <button
              onClick={handleReport}
              disabled={reported}
              className={`text-xs font-sans transition-colors ${
                reported
                  ? 'text-gray-400 dark:text-gray-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-red-700 dark:hover:text-red-400'
              }`}
            >
              {reported ? (t('reported') || 'Reported') : (t('report') || 'Report')}
            </button>
          )}

          {/* Draft saved indicator */}
          {showDraftSaved && (
            <span className="text-[10px] text-amber-700 font-sans ml-auto italic">
              {t('draftSaved') || 'Draft saved'}
            </span>
          )}
        </div>

        {/* Reply input area */}
        {replyOpen && depth < MAX_DEPTH && (
          <div className="mt-2 border-t border-black/10 dark:border-white/10 pt-2">
            <textarea
              ref={textareaRef}
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder={t('writeReply') || 'Write a reply...'}
              rows={3}
              maxLength={MAX_REPLY_LENGTH + 50}
              className="w-full p-2 border border-black/20 dark:border-white/20 bg-white dark:bg-gray-900 text-sm text-black dark:text-white font-sans resize-none focus:outline-none focus:border-red-700"
              style={{ borderRadius: 0 }}
            />
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs font-sans ${charCountColor}`}>
                {replyInput.length}/{MAX_REPLY_LENGTH}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setReplyOpen(false);
                    setReplyInput('');
                    localStorage.removeItem(`draft_reply_${commentId}`);
                  }}
                  className="text-xs font-sans text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white px-2 py-1 border border-black/10 dark:border-white/10"
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  onClick={handleReplySubmit}
                  disabled={!replyInput.trim() || replyInput.length > MAX_REPLY_LENGTH || submitting}
                  className="text-xs font-sans text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 border border-red-700"
                >
                  {submitting ? (t('submitting') || 'Submitting...') : (t('submit') || 'Submit')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Replies section */}
      {replies.length > 0 && (
        <div className="mt-1">
          {!repliesVisible ? (
            <button
              onClick={() => setRepliesVisible(true)}
              className="text-xs font-sans text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 pl-2 underline"
            >
              {t('viewReplies') || 'View'} {replies.length}{' '}
              {replies.length === 1 ? (t('reply') || 'reply') : (t('replies') || 'replies')}
            </button>
          ) : (
            <>
              <button
                onClick={() => setRepliesVisible(false)}
                className="text-xs font-sans text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 pl-2 underline mb-1"
              >
                {t('hideReplies') || 'Hide replies'}
              </button>
              {replies.map((reply) => (
                <CommentItem
                  key={reply._id}
                  comment={reply}
                  onLike={onLike}
                  onReport={onReport}
                  currentUserId={currentUserId}
                  articleSentiment={articleSentiment}
                  depth={depth + 1}
                  onReply={onReply}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
