import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';
import SentimentBadge from './SentimentBadge';
import AlertBadge from './AlertBadge';
import { trackView, voteSentiment, toggleBookmark } from '../services/api';
import api from '../services/api';
import { X, Bookmark, BookmarkCheck, ExternalLink, TrendingUp, TrendingDown, Minus, Lightbulb, MessageSquare } from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const getSentimentColor = (s) => {
  if (s === 'Positive') return '#4ADE80';
  if (s === 'Negative') return '#FB7185';
  return '#FBBF24';
};

const getSentimentIcon = (s) => {
  if (s === 'Positive') return TrendingUp;
  if (s === 'Negative') return TrendingDown;
  return Minus;
};

const ArticlePreviewModal = ({ article, isOpen, onClose }) => {
  const [voted, setVoted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [localFeedback, setLocalFeedback] = useState(article?.feedback || null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isOpen && article?._id) {
      document.body.style.overflow = 'hidden';
      trackView(article._id).catch(() => {});
      // Load comments
      setCommentsLoading(true);
      api.get(`/collab/comments/${article._id}`)
        .then(({ data }) => setComments(data.comments || []))
        .catch(() => {})
        .finally(() => setCommentsLoading(false));
    }
    return () => { document.body.style.overflow = originalOverflow || ''; };
  }, [isOpen, article?._id]);

  if (!isOpen || !article) return null;

  const {
    _id, title, description, source, url, urlToImage,
    publishedAt, topic, sentiment, aiSentiment, reason, confidence, isAlert, content
  } = article;

  const effectiveSentiment = aiSentiment || sentiment || 'Neutral';
  const SentimentIcon = getSentimentIcon(effectiveSentiment);
  const sentimentColor = getSentimentColor(effectiveSentiment);

  const handleVote = async (s) => {
    try {
      const res = await voteSentiment(_id, { sentiment: s });
      setLocalFeedback(res.feedback);
      setVoted(true);
      toast.success('Feedback recorded!');
    } catch { toast.error('Failed to submit vote'); }
  };

  const handleBookmark = async () => {
    try {
      const res = await toggleBookmark(_id);
      setIsBookmarked(res.bookmarked);
      toast.success(res.bookmarked ? 'Saved!' : 'Removed!');
    } catch { toast.error('Bookmark error'); }
  };

  const submitComment = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/collab/comments', { articleId: _id, content: newComment.trim() });
      setComments(prev => [data.comment, ...prev]);
      setNewComment('');
      toast.success('Comment posted');
    } catch { toast.error('Failed to post comment'); }
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

    // XSS-safe HTML sanitizer powered by DOMPurify.
    // Strips <script>, <iframe>, <object>, inline handlers, javascript: URLs,
    // SVG payloads, and any DOM-clobbering tricks. Allow basic editorial markup
    // (paragraphs, links, emphasis) so article body still renders properly.
    const cleanHtml = (html) => {
      if (!html) return '';
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p','br','strong','em','b','i','u','a','span','ul','ol','li','blockquote','h1','h2','h3','h4','h5','h6','code','pre'],
        ALLOWED_ATTR: ['href','target','rel','class'],
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ['style','script','iframe','object','embed','link','img','svg','figure'],
        FORBID_ATTR: ['style','onerror','onload','onclick','onmouseover','onfocus','onblur'],
      });
    };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 16px',
        overflowY: 'auto',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg, #fff)',
          border: '1px solid var(--border, #e5e5e5)',
          width: '100%', maxWidth: 680,
          position: 'relative',
        }}
      >
        {/* Top bar — source + actions */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border, #e5e5e5)',
          background: 'var(--card, #fafafa)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'var(--brand, #e11d48)',
            }}>
              {source || 'Unknown'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted, #999)' }}>
              {formatDate(publishedAt)}
            </span>
            {topic && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--text-400, #aaa)',
                padding: '2px 8px', border: '1px solid var(--border, #e5e5e5)',
              }}>
                {topic}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button 
              onClick={handleBookmark}
              title={isBookmarked ? "Remove bookmark" : "Add to bookmarks"}
              style={{ 
                background: 'none', border: 'none', cursor: 'pointer',
                color: isBookmarked ? '#f59e0b' : 'var(--text-400, #aaa)',
                padding: 4, display: 'flex',
              }}
            >
              {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
            <button 
              onClick={onClose}
              style={{ 
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-400, #aaa)', padding: 4, display: 'flex',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Article content */}
        <div style={{ padding: '20px 20px 0' }}>
          {isAlert && <AlertBadge />}
          
          {/* Title */}
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 22, fontWeight: 700, lineHeight: 1.3,
            color: 'var(--text-primary, #000)',
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
          }}>
            {title}
          </h2>

          {/* Image */}
          {urlToImage && (
            <div style={{
              margin: '0 -20px 16px', height: 240, overflow: 'hidden',
              background: 'var(--bg, #f5f5f5)',
              borderTop: '1px solid var(--border, #e5e5e5)',
              borderBottom: '1px solid var(--border, #e5e5e5)',
            }}>
              <img 
                src={urlToImage} alt={title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy" decoding="async" 
              />
            </div>
          )}
        </div>

        {/* Analysis section — editorial style */}
        <div style={{ padding: '0 20px 16px' }}>
          {/* Sentiment + Confidence row */}
          <div style={{
            display: 'flex', alignItems: 'stretch', gap: 0,
            border: '1px solid var(--border, #e5e5e5)',
            marginBottom: 16,
          }}>
            {/* Sentiment */}
            <div style={{
              flex: 1, padding: '12px 16px',
              borderRight: '1px solid var(--border, #e5e5e5)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${sentimentColor}15`, color: sentimentColor,
              }}>
                <SentimentIcon size={14} />
              </div>
              <div>
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
                  textTransform: 'uppercase', color: 'var(--text-muted, #999)',
                  marginBottom: 2,
                }}>
                  Sentiment
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: sentimentColor,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {effectiveSentiment}
                </div>
              </div>
            </div>

            {/* Confidence */}
            <div style={{
              flex: 1, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--card, #f5f5f5)', color: 'var(--text-secondary, #666)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'monospace' }}>
                  {Math.round((confidence || 0) * 100)}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
                  textTransform: 'uppercase', color: 'var(--text-muted, #999)',
                  marginBottom: 4,
                }}>
                  Confidence
                </div>
                <div style={{
                  height: 4, background: 'var(--border, #e5e5e5)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: `${Math.round((confidence || 0) * 100)}%`,
                    background: sentimentColor,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Reason */}
          {reason && (
            <div style={{
              display: 'flex', gap: 10, padding: '12px 16px',
              borderLeft: `3px solid ${sentimentColor}`,
              background: 'var(--card, #fafafa)',
              marginBottom: 16,
            }}>
              <Lightbulb size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
              <p style={{
                fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary, #666)',
                margin: 0, fontStyle: 'italic',
              }}>
                {reason}
              </p>
            </div>
          )}

          {/* Vote */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            paddingTop: 12, borderTop: '1px dashed var(--border, #e5e5e5)',
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--text-muted, #999)',
              marginRight: 4,
            }}>
              Feedback
            </span>
            {['Positive', 'Neutral', 'Negative'].map(s => {
              const btnColor = getSentimentColor(s);
              return (
                <button 
                  key={s}
                  onClick={() => !voted && handleVote(s)}
                  disabled={voted}
                  style={{
                    padding: '5px 12px', fontSize: 11, fontWeight: 600,
                    border: `1px solid ${voted ? 'var(--border)' : btnColor}40`,
                    background: voted ? 'var(--card)' : 'transparent',
                    color: voted ? 'var(--text-muted)' : btnColor,
                    cursor: voted ? 'default' : 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    transition: 'all 0.2s',
                    opacity: voted ? 0.6 : 1,
                  }}
                >
                  {s} {localFeedback?.[s] > 0 && `(${localFeedback[s]})`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--text-muted, #999)',
            marginBottom: 8,
          }}>
            Description
          </div>
          <p style={{
            fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary, #444)',
            margin: '0 0 16px',
          }}>
            {description}
          </p>

          {content && (
            <>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
                textTransform: 'uppercase', color: 'var(--text-muted, #999)',
                marginBottom: 8,
              }}>
                Strategic Excerpt
              </div>
              <div 
                style={{
                  fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted, #888)',
                  padding: '12px 16px',
                  borderLeft: '3px solid var(--border, #e5e5e5)',
                  background: 'var(--card, #fafafa)',
                }}
                dangerouslySetInnerHTML={{ 
                  __html: cleanHtml(
                    (content.split('[+')[0].length > 450 
                      ? content.split('[+')[0].slice(0, 450) + '...' 
                      : content.split('[+')[0])
                  ) 
                }}
              />
            </>
          )}
        </div>

        {/* Discussion */}
        <div style={{ padding: '0 20px 16px' }}>
          <button
            onClick={() => setShowComments(!showComments)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'var(--text-muted, #999)',
              padding: '8px 0',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Discussion ({comments.length})
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: showComments ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showComments && (
            <div style={{ marginTop: 8, border: '1px solid var(--border, #e5e5e5)' }}>
              {/* Input */}
              <div style={{ display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid var(--border, #e5e5e5)', background: 'var(--card, #fafafa)' }}>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                  placeholder="Add a comment..."
                  style={{
                    flex: 1, padding: '8px 12px', fontSize: 13,
                    border: '1px solid var(--border, #e5e5e5)',
                    background: 'var(--bg, #fff)', color: 'var(--text-primary, #000)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={submitComment}
                  disabled={!newComment.trim() || submitting}
                  style={{
                    padding: '8px 14px', fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: 'var(--text-primary, #000)', color: '#fff',
                    border: 'none', cursor: newComment.trim() ? 'pointer' : 'default',
                    opacity: newComment.trim() ? 1 : 0.3,
                  }}
                >
                  Post
                </button>
              </div>

              {/* Comments */}
              {commentsLoading ? (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted, #999)' }}>Loading...</div>
              ) : comments.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted, #999)' }}>No comments yet. Be the first!</div>
              ) : (
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {comments.map(c => (
                    <div key={c._id} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border, #e5e5e5)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #000)' }}>
                          {c.user?.name || 'Anonymous'}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted, #999)', marginLeft: 'auto' }}>
                          {timeAgo(c.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary, #444)', margin: 0 }}>
                        {c.content}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <button
                          onClick={() => likeComment(c._id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted, #999)' }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                          </svg>
                          {c.likes?.length || 0}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 20px',
          borderTop: '1px solid var(--border, #e5e5e5)',
          background: 'var(--card, #fafafa)',
        }}>
          {url ? (
            <button 
              onClick={() => window.open(url, '_blank')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--text-primary, #000)', color: '#fff',
                padding: '8px 18px', border: 'none',
                fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
            >
              Read Full Story
              <ExternalLink size={13} />
            </button>
          ) : (
            <button 
              disabled 
              style={{
                padding: '8px 18px', border: 'none',
                fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', opacity: 0.4, cursor: 'not-allowed',
                background: 'var(--text-primary, #000)', color: '#fff',
              }}
            >
              Source Unavailable
            </button>
          )}
          <button 
            onClick={onClose}
            style={{
              padding: '8px 16px', background: 'transparent',
              border: '1px solid var(--border, #e5e5e5)',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--text-secondary, #666)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticlePreviewModal;
