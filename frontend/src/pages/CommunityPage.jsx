import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import CommentItem from '../components/CommentItem';

const CHAR_LIMIT = 500;
const DRAFT_DEBOUNCE_MS = 500;
const DRAFT_FADE_MS = 2000;

const CommunityPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  // ── State: Discussions ──
  const [discussions, setDiscussions] = useState([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [discussionsLoading, setDiscussionsLoading] = useState(true);
  const [discussionsError, setDiscussionsError] = useState(null);

  // ── State: Comments ──
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);

  // ── State: Sorting & Filtering ──
  const [sortBy, setSortBy] = useState('newest');
  const [sentimentFilter, setSentimentFilter] = useState('all');

  // ── State: Comment Form ──
  const [commentText, setCommentText] = useState('');
  const [commentSentiment, setCommentSentiment] = useState('neutral');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ── State: Draft ──
  const [showDraftSaved, setShowDraftSaved] = useState(false);
  const draftTimerRef = useRef(null);
  const draftFadeTimerRef = useRef(null);

  // ── Refs ──
  const textareaRef = useRef(null);

  // ── Derived: draft key ──
  const draftKey = selectedDiscussion
    ? `draft_comment_${selectedDiscussion.id}`
    : 'draft_comment_standalone';

  // ── Character count ──
  const charCount = commentText.length;
  const charPercent = Math.min((charCount / CHAR_LIMIT) * 100, 100);
  const isOverLimit = charCount > CHAR_LIMIT;
  const isNearLimit = charCount > 400 && charCount <= CHAR_LIMIT;

  // ── Fetch Discussions ──
  useEffect(() => {
    const fetchDiscussions = async () => {
      setDiscussionsLoading(true);
      setDiscussionsError(null);
      try {
        const res = await fetch(`${API_BASE}/collab/discussions`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setDiscussions(data);
        if (data.length > 0 && !selectedDiscussion) {
          setSelectedDiscussion(data[0]);
        }
      } catch (err) {
        setDiscussionsError(err.message);
      } finally {
        setDiscussionsLoading(false);
      }
    };
    fetchDiscussions();
  }, []);

  // ── Fetch Comments when discussion changes ──
  useEffect(() => {
    if (!selectedDiscussion) return;

    const fetchComments = async () => {
      setCommentsLoading(true);
      setCommentsError(null);
      try {
        const res = await fetch(
          `${API_BASE}/collab/discussions/${selectedDiscussion.id}/comments`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setComments(data);
      } catch (err) {
        setCommentsError(err.message);
      } finally {
        setCommentsLoading(false);
      }
    };
    fetchComments();
  }, [selectedDiscussion]);

  // ── Restore Draft on mount / discussion change ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        setCommentText(draft.text || '');
        setCommentSentiment(draft.sentiment || 'neutral');
        setIsAnonymous(draft.anonymous || false);
        // Briefly show restored indicator
        setShowDraftSaved(true);
        if (draftFadeTimerRef.current) clearTimeout(draftFadeTimerRef.current);
        draftFadeTimerRef.current = setTimeout(() => setShowDraftSaved(false), DRAFT_FADE_MS);
      } else {
        setCommentText('');
        setCommentSentiment('neutral');
        setIsAnonymous(false);
      }
    } catch {
      // ignore parse errors
    }

    return () => {
      if (draftFadeTimerRef.current) clearTimeout(draftFadeTimerRef.current);
    };
  }, [draftKey]);

  // ── Auto-save Draft (debounced) ──
  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

    if (commentText.trim() === '' && !isAnonymous && commentSentiment === 'neutral') {
      // Clear draft if form is essentially empty
      localStorage.removeItem(draftKey);
      return;
    }

    draftTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            text: commentText,
            sentiment: commentSentiment,
            anonymous: isAnonymous,
          })
        );
        setShowDraftSaved(true);
        if (draftFadeTimerRef.current) clearTimeout(draftFadeTimerRef.current);
        draftFadeTimerRef.current = setTimeout(() => setShowDraftSaved(false), DRAFT_FADE_MS);
      } catch {
        // localStorage full or unavailable
      }
    }, DRAFT_DEBOUNCE_MS);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [commentText, commentSentiment, isAnonymous, draftKey]);

  // ── Sorted & Filtered Comments (memoised) ──
  const filteredComments = useMemo(() => {
    let result = [...comments];

    // Filter by sentiment
    if (sentimentFilter !== 'all') {
      result = result.filter(
        (c) => (c.sentiment || '').toLowerCase() === sentimentFilter
      );
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'mostLiked':
        result.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      default:
        break;
    }

    return result;
  }, [comments, sortBy, sentimentFilter]);

  // ── Handlers ──
  const handleTextChange = useCallback((e) => {
    setCommentText(e.target.value);
  }, []);

  const handleSentimentChange = useCallback((sentiment) => {
    setCommentSentiment(sentiment);
  }, []);

  const handleAnonymousToggle = useCallback(() => {
    setIsAnonymous((prev) => !prev);
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setCommentText('');
    setCommentSentiment('neutral');
    setIsAnonymous(false);
  }, [draftKey]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!commentText.trim() || isOverLimit) return;

      setSubmitting(true);
      setSubmitError(null);

      try {
        const payload = {
          text: commentText.trim(),
          sentiment: commentSentiment,
          anonymous: isAnonymous,
        };

        const url = selectedDiscussion
          ? `${API_BASE}/collab/discussions/${selectedDiscussion.id}/comments`
          : `${API_BASE}/collab/comments`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Clear draft & form
        localStorage.removeItem(draftKey);
        setCommentText('');
        setCommentSentiment('neutral');
        setIsAnonymous(false);

        // Refresh comments
        if (selectedDiscussion) {
          const refreshRes = await fetch(
            `${API_BASE}/collab/discussions/${selectedDiscussion.id}/comments`
          );
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setComments(data);
          }
        }
      } catch (err) {
        setSubmitError(err.message);
      } finally {
        setSubmitting(false);
      }
    },
    [commentText, commentSentiment, isAnonymous, isOverLimit, selectedDiscussion, draftKey]
  );

  const handleReply = useCallback(async () => {
    // Refresh comments after a reply is posted
    if (!selectedDiscussion) return;
    try {
      const res = await fetch(
        `${API_BASE}/collab/discussions/${selectedDiscussion.id}/comments`
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      // silently fail refresh
    }
  }, [selectedDiscussion]);

  const handleDiscussionSelect = useCallback((discussion) => {
    setSelectedDiscussion(discussion);
  }, []);

  // ── Sentiment chip helper ──
  const sentimentChips = [
    { key: 'all', label: t('all') },
    { key: 'positive', label: t('positive') },
    { key: 'negative', label: t('negative') },
    { key: 'neutral', label: t('neutral') },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-black dark:text-white font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* ── Header ── */}
        <header className="mb-8 border-b border-black/10 dark:border-white/10 pb-4">
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            {t('communityTitle')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('discussions')} &middot; {t('comments')}
          </p>
        </header>

        {/* ── Discussion Selector / Tabs ── */}
        <section className="mb-8">
          <h2 className="font-serif text-xl font-semibold mb-3 text-red-700">
            {t('discussions')}
          </h2>

          {discussionsLoading && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</p>
          )}

          {discussionsError && (
            <p className="text-sm text-red-700">{discussionsError}</p>
          )}

          {!discussionsLoading && !discussionsError && discussions.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('noComments')}</p>
          )}

          {discussions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {discussions.map((d) => {
                const isActive = selectedDiscussion?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => handleDiscussionSelect(d)}
                    className={`
                      px-4 py-2 text-sm font-medium border transition-colors
                      ${
                        isActive
                          ? 'bg-red-700 text-white border-red-700'
                          : 'bg-white dark:bg-gray-950 text-black dark:text-white border-black/10 dark:border-white/10 hover:border-red-700 hover:text-red-700'
                      }
                    `}
                  >
                    {d.title || `${t('discussions')} #${d.id}`}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Sort & Filter Controls ── */}
        {selectedDiscussion && (
          <section className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="sort-select"
                className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium"
              >
                {t('sortBy')}
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-black/10 dark:border-white/10 bg-white dark:bg-gray-950 text-black dark:text-white text-sm px-3 py-1.5 focus:outline-none focus:border-red-700"
              >
                <option value="newest">{t('newest')}</option>
                <option value="oldest">{t('oldest')}</option>
                <option value="mostLiked">{t('mostLiked')}</option>
              </select>
            </div>

            {/* Sentiment Filter Chips */}
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                {t('filterBySentiment')}
              </span>
              <div className="flex gap-1">
                {sentimentChips.map((chip) => {
                  const isActive = sentimentFilter === chip.key;
                  const chipColors = {
                    all: isActive
                      ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200'
                      : 'border-gray-400 dark:border-gray-500 text-gray-600 dark:text-gray-300',
                    positive: isActive
                      ? 'bg-green-700 text-white border-green-700'
                      : 'border-green-600/40 text-green-700 dark:text-green-400',
                    negative: isActive
                      ? 'bg-red-700 text-white border-red-700'
                      : 'border-red-600/40 text-red-700 dark:text-red-400',
                    neutral: isActive
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'border-amber-500/40 text-amber-700 dark:text-amber-400',
                  };
                  return (
                    <button
                      key={chip.key}
                      onClick={() => setSentimentFilter(chip.key)}
                      className={`
                        inline-block px-3 py-1 text-xs font-medium border transition-colors
                        ${chipColors[chip.key]}
                      `}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Comment Form ── */}
        {selectedDiscussion && (
          <section className="mb-8">
            <form onSubmit={handleSubmit}>
              <div className="border border-black/10 dark:border-white/10">
                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={handleTextChange}
                  placeholder={t('writeComment')}
                  rows={4}
                  className="w-full p-4 bg-white dark:bg-gray-950 text-black dark:text-white text-sm resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                />

                {/* Character Counter Bar */}
                <div className="h-1 w-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full transition-all duration-200 ${
                      isOverLimit
                        ? 'bg-red-700'
                        : isNearLimit
                          ? 'bg-amber-500'
                          : 'bg-red-700'
                    }`}
                    style={{ width: `${charPercent}%` }}
                  />
                </div>

                {/* Controls Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-black/10 dark:border-white/10">
                  {/* Left: sentiment selector, anonymous toggle */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Sentiment radio buttons */}
                    <div className="flex items-center gap-3">
                      {['positive', 'negative', 'neutral'].map((s) => (
                        <label
                          key={s}
                          className="flex items-center gap-1.5 cursor-pointer text-xs"
                        >
                          <input
                            type="radio"
                            name="commentSentiment"
                            value={s}
                            checked={commentSentiment === s}
                            onChange={() => handleSentimentChange(s)}
                            className="accent-red-700"
                          />
                          <span className="capitalize">{t(s)}</span>
                        </label>
                      ))}
                    </div>

                    {/* Anonymous toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={handleAnonymousToggle}
                        className="accent-red-700"
                      />
                      <span>{t('postAsAnonymous')}</span>
                    </label>
                  </div>

                  {/* Right: char count, draft indicator, submit */}
                  <div className="flex items-center gap-3">
                    {/* Draft saved indicator */}
                    {showDraftSaved && (
                      <span className="text-xs text-green-700 animate-pulse">
                        {t('draftSaved')}
                      </span>
                    )}

                    {/* Clear draft */}
                    {commentText.length > 0 && (
                      <button
                        type="button"
                        onClick={clearDraft}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-700 transition-colors underline"
                      >
                        {t('clearDraft')}
                      </button>
                    )}

                    {/* Character count */}
                    <span
                      className={`text-xs font-mono ${
                        isOverLimit
                          ? 'text-red-700 font-bold'
                          : isNearLimit
                            ? 'text-amber-600'
                            : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {charCount}/{CHAR_LIMIT}
                      {isOverLimit && ` — ${t('tooLong')}`}
                    </span>

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={submitting || !commentText.trim() || isOverLimit}
                      className="px-5 py-2 text-sm font-semibold bg-red-700 text-white hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? t('loading') : t('postComment')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit error */}
              {submitError && (
                <p className="mt-2 text-xs text-red-700">{submitError}</p>
              )}
            </form>
          </section>
        )}

        {/* ── Comments List ── */}
        {selectedDiscussion && (
          <section>
            <h2 className="font-serif text-lg font-semibold mb-4">
              {t('comments')}{' '}
              <span className="text-sm font-sans font-normal text-gray-500 dark:text-gray-400">
                ({filteredComments.length})
              </span>
            </h2>

            {commentsLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</p>
            )}

            {commentsError && (
              <p className="text-sm text-red-700">{commentsError}</p>
            )}

            {!commentsLoading && !commentsError && filteredComments.length === 0 && (
              <div className="border border-black/10 dark:border-white/10 p-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('noComments')}
                </p>
              </div>
            )}

            {!commentsLoading && filteredComments.length > 0 && (
              <div className="space-y-0">
                {filteredComments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onReply={handleReply}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── No discussion selected ── */}
        {!selectedDiscussion && !discussionsLoading && (
          <div className="border border-black/10 dark:border-white/10 p-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('discussions')} — {t('loading')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPage;
