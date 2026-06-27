import React, { useState, useEffect } from 'react';
import { getArticleAnalysis, trackView } from '../services/api';
import api from '../services/api';

const deriveSourceLabel = (source, url) => {
  if (source && source !== 'Unknown' && source !== 'Source' && source !== 'Media Source') return source;
  if (!url) return 'News Source';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host.split('.')[0].charAt(0).toUpperCase() + host.split('.')[0].slice(1);
  } catch { return 'News Source'; }
};

const buildFallbackAnalysis = (article) => {
  if (!article) return null;
  const sentiment = article.sentiment || 'Neutral';
  return {
    summary: article.description || 'Detailed AI summary is currently being generated or is temporarily unavailable.',
    entities: { topics: article.topic ? [article.topic] : [] },
    sentimentBreakdown: {
      negative: sentiment === 'Negative' ? 70 : 15,
      neutral: sentiment === 'Neutral' ? 70 : 20,
      positive: sentiment === 'Positive' ? 70 : 10,
      reasoning: article.reason || 'Heuristic sentiment analysis based on headline and description.',
    },
  };
};

const ArticleDetailPanel = ({ article, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    if (!isOpen || !article) {
      setAnalysis(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const articleId = article._id || article.id;
        if (articleId) {
          trackView(articleId).catch(err => console.error('View tracking failed:', err));
        }
        const data = await getArticleAnalysis(article);
        setAnalysis(data);
      } catch (err) {
        console.error('Analysis failed:', err);
        setAnalysis(buildFallbackAnalysis(article));
      } finally {
        setLoading(false);
      }
    };
    load();

    // Load comments
    const articleId = article._id || article.id;
    if (articleId) {
      setCommentsLoading(true);
      api.get(`/collab/comments/${articleId}`)
        .then(({ data }) => setComments(data.comments || []))
        .catch(() => {})
        .finally(() => setCommentsLoading(false));
    }
  }, [isOpen, article]);

  if (!article && isOpen) return null;

  const submitComment = async () => {
    if (!newComment.trim() || submitting) return;
    const articleId = article?._id || article?.id;
    if (!articleId) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/collab/comments', { articleId, content: newComment.trim(), isAnonymous });
      setComments(prev => [data.comment, ...prev]);
      setNewComment('');
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

  const { title, url, source, publishedAt, description, urlToImage } = article || {};
  const currentAnalysis = analysis || buildFallbackAnalysis(article);
  const sourceLabel = deriveSourceLabel(source, url);

  return (
    <>
      <div className={`detail-panel-backdrop ${isOpen ? 'is-open' : ''}`} onClick={onClose} />
      <div className={`detail-panel ${isOpen ? 'is-open' : ''}`}>
        
        {/* Cinematic Header */}
        <div className="detail-header-premium">
          <div className="detail-header-bg" style={{ backgroundImage: urlToImage ? `url(${urlToImage})` : 'none' }} />
          <div className="detail-header-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div className="detail-meta-premium">
                  <span className="detail-source-tag">{sourceLabel}</span>
                  <span className="detail-date-tag">{publishedAt ? new Date(publishedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : ''}</span>
               </div>
               <button aria-label="Close article details" className="detail-close-btn-premium" onClick={onClose}>
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
               </button>
            </div>
            <h2 className="detail-title-premium">{title}</h2>
          </div>
        </div>

        <div className="detail-scroll-area">
          <div className="detail-content-inner">
            
            {loading ? (
              <div className="detail-loading-state">
                <div className="shimmer-line title" />
                <div className="shimmer-line text" />
                <p>Synthesizing Intelligence...</p>
              </div>
            ) : (
              <>
                <div className="detail-tabs-premium">
                  {['summary', 'sentiment', 'entities', 'discussion'].map(tab => (
                    <button 
                      key={tab}
                      className={`detail-tab-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="tab-pane-premium">
                  {activeTab === 'summary' && (
                    <div className="animate-in">
                      <span className="premium-label">Intelligence Summary</span>
                      <p className="premium-summary-text">{currentAnalysis?.summary}</p>
                    </div>
                  )}

                  {activeTab === 'sentiment' && (
                    <div className="animate-in">
                       <span className="premium-label">Sentiment Breakdown</span>
                       <div className="sentiment-matrix">
                          {['Positive', 'Neutral', 'Negative'].map(s => {
                            const val = currentAnalysis?.sentimentBreakdown?.[s.toLowerCase()] || 0;
                            const color = s === 'Positive' ? 'var(--pos)' : (s === 'Neutral' ? 'var(--neu)' : 'var(--neg)');
                            return (
                              <div key={s} className="matrix-row">
                                 <span className="matrix-name">{s}</span>
                                 <div className="matrix-bar-bg"><div className="matrix-bar-fill" style={{ width: `${val}%`, background: color }} /></div>
                                 <span className="matrix-val">{val}%</span>
                              </div>
                            );
                          })}
                       </div>
                       <p className="premium-reasoning">"{currentAnalysis?.sentimentBreakdown?.reasoning}"</p>
                    </div>
                  )}

                  {activeTab === 'entities' && (
                    <div className="animate-in">
                        <span className="premium-label">Extracted Entities</span>
                        <div className="premium-tag-wall">
                           {currentAnalysis?.entities?.topics?.map(t => <span key={t} className="premium-tag">{t}</span>)}
                           {(!currentAnalysis?.entities?.topics || currentAnalysis.entities.topics.length === 0) && <p style={{ color: 'var(--text-400)' }}>No entities found.</p>}
                        </div>
                    </div>
                  )}

                  {activeTab === 'discussion' && (
                    <div className="animate-in">
                      <span className="premium-label">Discussion ({comments.length})</span>
                      
                      {/* Anonymous toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <button
                          onClick={() => setIsAnonymous(!isAnonymous)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', fontSize: 10, fontWeight: 600,
                            border: isAnonymous ? '1px solid #f59e0b' : '1px solid var(--border)',
                            background: isAnonymous ? '#f59e0b10' : 'transparent',
                            color: isAnonymous ? '#f59e0b' : 'var(--text-muted)',
                            cursor: 'pointer', transition: 'all 0.2s',
                          }}
                        >
                          {isAnonymous ? '👤 Anonymous' : '🧑 Visible'}
                        </button>
                        <span style={{ fontSize: 10, color: 'var(--text-muted, #999)' }}>
                          {isAnonymous ? 'Your identity is hidden' : 'Your name is shown'}
                        </span>
                      </div>

                      {/* Comment input */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                          placeholder="Add a comment..."
                          style={{
                            flex: 1, padding: '10px 12px', fontSize: 13,
                            border: '1px solid var(--border)', background: 'var(--bg)',
                            color: 'var(--text-primary)', outline: 'none', borderRadius: 0,
                          }}
                        />
                        <button
                          onClick={submitComment}
                          disabled={!newComment.trim() || submitting}
                          style={{
                            padding: '10px 16px', fontSize: 11, fontWeight: 700,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            background: 'var(--text-primary, #111)', color: '#fff',
                            border: 'none', cursor: newComment.trim() ? 'pointer' : 'default',
                            opacity: newComment.trim() ? 1 : 0.3, borderRadius: 0,
                          }}
                        >
                          Post
                        </button>
                      </div>

                      {/* Comments list */}
                      {commentsLoading ? (
                        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-400)', fontSize: 12 }}>Loading comments...</div>
                      ) : comments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-400)', fontSize: 12 }}>
                          No comments yet. Start the discussion!
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                          {comments.map(c => (
                            <div key={c._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {c.user?.name || 'Anonymous'}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--text-400)', marginLeft: 'auto' }}>
                                  {timeAgo(c.createdAt)}
                                </span>
                              </div>
                              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>
                                {c.content}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                <button
                                  onClick={() => likeComment(c._id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-400)', padding: 0 }}
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
              </>
            )}

            <div style={{ marginTop: 40, borderTop: '1px solid var(--border-light)', paddingTop: 32 }}>
               <span className="premium-label">Contextual Background</span>
               <p className="premium-desc">{description || 'No additional content provided.'}</p>
            </div>

            <div style={{ marginTop: 32 }}>
               <a href={url} target="_blank" rel="noopener noreferrer" className="premium-action-btn">
                 Visit Original Report
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
               </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .detail-header-premium {
          position: relative; height: 260px; min-height: 260px; overflow: hidden;
          background: #1A1A1A; display: flex; flex-direction: column; justify-content: flex-end;
        }
        .detail-header-bg {
          position: absolute; inset: 0; background-size: cover; background-position: center;
          filter: brightness(0.4); transform: scale(1.05);
        }
        .detail-header-content { position: relative; z-index: 2; padding: 32px; background: rgba(0,0,0,0.7); }
        .detail-title-premium { font-family: 'Playfair Display', Georgia, serif; color: #fff; font-size: 20px; font-weight: 700; line-height: 1.4; margin-top: 12px; }
        .detail-meta-premium { display: flex; align-items: center; gap: 12px; }
        .detail-source-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1A1A1A; background: #fff; padding: 4px 10px; border-radius: 0; }
        .detail-date-tag { font-size: 11px; color: rgba(255,255,255,0.7); font-weight: 600; }
        .detail-close-btn-premium { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); width: 34px; height: 34px; border-radius: 0; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .detail-close-btn-premium:hover { background: #f43f5e; border-color: #f43f5e; }

        .detail-scroll-area { flex: 1; overflow-y: auto; background: var(--surface); }
        .detail-content-inner { padding: 32px; }

        .premium-label { font-size: 10px; font-weight: 900; color: var(--text-400); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px; display: block; }
        .detail-tabs-premium { display: flex; gap: 0; margin-bottom: 24px; border: 1px solid var(--border); }
        .detail-tab-btn { flex: 1; padding: 10px; border: none; border-right: 1px solid var(--border); background: transparent; color: var(--text-500); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; border-radius: 0; transition: all 0.2s; }
        .detail-tab-btn:last-child { border-right: none; }
        .detail-tab-btn.active { background: transparent; color: var(--text-900, #111); border-bottom: 2px solid var(--text-900, #111); font-weight: 800; }
        [data-theme='dark'] .detail-tab-btn.active { color: #fff; border-bottom-color: #fff; }

        .premium-summary-text { font-size: 15px; line-height: 1.8; color: var(--text-700); font-weight: 500; }
        .sentiment-matrix { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }
        .matrix-row { display: flex; align-items: center; gap: 12px; }
        .matrix-name { width: 70px; font-size: 12px; font-weight: 700; color: var(--text-500); }
        .matrix-bar-bg { flex: 1; height: 4px; background: var(--bg); border-radius: 0; overflow: hidden; }
        .matrix-bar-fill { height: 100%; border-radius: 0; transition: width 1s cubic-bezier(0.16, 1, 0.3, 1); }
        .matrix-val { width: 35px; font-size: 12px; font-weight: 800; color: var(--text-900); text-align: right; }

        .premium-reasoning { font-size: 13.5px; line-height: 1.6; color: var(--text-500); font-style: italic; background: var(--bg); padding: 16px; border-radius: 0; border-left: 3px solid var(--brand); }
        .premium-tag-wall { display: flex; flex-wrap: wrap; gap: 8px; }
        .premium-tag { padding: 6px 14px; background: var(--brand-bg); color: var(--brand); border-radius: 0; font-size: 12px; font-weight: 700; border: 1px solid var(--border); }
        
        .premium-desc { font-size: 14px; line-height: 1.7; color: var(--text-500); }
        .premium-action-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 16px; background: #1A1A1A; color: #fff; border-radius: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; transition: all 0.2s; }
        .premium-action-btn:hover { background: #333; }

        .animate-in { animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        
        .shimmer-line { height: 12px; background: var(--bg); border-radius: 0; margin-bottom: 12px; }
      `}</style>
    </>
  );
};

export default ArticleDetailPanel;
