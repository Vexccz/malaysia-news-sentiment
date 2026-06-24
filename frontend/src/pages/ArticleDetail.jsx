import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import SentimentBadge from '../components/SentimentBadge';
import ArticleComments from '../components/ArticleComments';
import ShareModal from '../components/ShareModal';
import { useFreshness } from '../context/FreshnessContext';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const deriveSourceLabel = (source, url) => {
  if (source && source !== 'Unknown' && source !== 'Source' && source !== 'Media Source') return source;
  if (!url) return 'News Source';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const label = host.split('.')[0] || host;
    return label.split(/[-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  } catch { return 'News Source'; }
};

const getFaviconUrl = (url) => {
  if (!url) return null;
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; } catch { return null; }
};

const CREDIBILITY_LABELS = {
  high:   { label: 'High',   color: '#059669' },
  medium: { label: 'Medium', color: '#d97706' },
  low:    { label: 'Low',    color: '#dc2626' },
  unknown:{ label: 'N/A',    color: '#6b7280' },
};

const getCredibilityLevel = (score) => {
  if (!score && score !== 0) return 'unknown';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

const SentimentBreakdown = ({ sentiment, confidence, feedback }) => {
  const label = sentiment?.label || sentiment || 'Neutral';
  const score = confidence || sentiment?.score || 0;
  const pct = Math.round(score * 100);
  const isPos = label === 'Positive';
  const isNeg = label === 'Negative';
  const color = isPos ? '#059669' : isNeg ? '#dc2626' : '#6b7280';

  const fbText = typeof feedback === 'string' ? feedback : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-lg font-bold" style={{ color }}>{label}</span>
        <span className="text-sm text-ink/40">{pct}% confidence</span>
      </div>
      <div className="w-full h-2 bg-ink/5 overflow-hidden">
        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      {fbText && (
        <p className="text-xs text-ink/50 mt-2 italic">{fbText}</p>
      )}
      {typeof feedback === 'object' && feedback && (
        <div className="flex gap-3 mt-2 text-[11px] text-ink/40">
          <span>+{feedback.upVotes || 0}</span>
          <span>-{feedback.downVotes || 0}</span>
        </div>
      )}
    </div>
  );
};

const ArticleDetail = () => {
  const { id } = useParams();
  const { updateFreshness } = useFreshness();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [credibility, setCredibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const fetchArticle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/history/${id}`);
      const data = res.data?.article || res.data;
      setArticle(data);
      updateFreshness();

      if (data) {
        const category = data.categories?.[0] || data.topic;
        try {
          const relatedRes = await api.get('/history', {
            params: { limit: 4, topic: category || '' },
          });
          const related = (relatedRes.data?.articles || [])
            .filter(a => (a._id || a.id) !== (data._id || data.id))
            .slice(0, 3);
          setRelatedArticles(related);
        } catch {}

        const srcName = data.source;
        if (srcName && srcName !== 'Unknown' && srcName !== 'Source' && srcName !== 'Media Source') {
          try {
            const credRes = await api.get(`/credibility/${encodeURIComponent(srcName)}`);
            setCredibility(credRes.data?.source || credRes.data);
          } catch {}
        }
      }
    } catch (err) {
      console.error('[ArticleDetail] fetch error:', err);
      setError(err.response?.data?.error || 'Article not found');
    } finally {
      setLoading(false);
    }
  }, [id, updateFreshness]);

  useEffect(() => {
    fetchArticle();
    window.scrollTo(0, 0);
  }, [fetchArticle]);

  if (loading) {
    return (
      <div className="bg-paper min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-8 lg:px-0 animate-pulse">
          <div className="h-4 w-24 bg-ink/5 mb-8" />
          <div className="h-3 w-48 bg-ink/5 mb-4" />
          <div className="h-8 w-3/4 bg-ink/5 mb-6" />
          <div className="border-t border-ink/10 mb-8" />
          {[...Array(6)].map((_, i) => <div key={i} className="h-4 w-full bg-ink/5 mb-3" />)}
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="bg-paper min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink/30 text-sm uppercase tracking-widest mb-2">Error</p>
          <p className="text-ink font-semibold mb-4">{error || 'Article not found'}</p>
          <Link to="/dashboard" className="text-xs uppercase tracking-widest text-ink/50 hover:text-ink no-underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const {
    title, description, content, source, url,
    publishedAt, sentiment, confidence, reason, categories,
    topic, viewCount, bookmarksCount, feedback, impactScore,
  } = article;

  const sourceLabel = deriveSourceLabel(source, url);
  const faviconUrl = getFaviconUrl(url);
  const credLevel = getCredibilityLevel(credibility?.credibilityScore);
  const credMeta = CREDIBILITY_LABELS[credLevel];
  const bodyText = content || description || '';

  return (
    <div className="bg-paper min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8 lg:px-0">


        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {faviconUrl && <img src={faviconUrl} alt="" width="14" height="14" style={{ borderRadius: 2 }} loading="lazy" />}
          <span className="text-[11px] uppercase tracking-widest text-ink/50 font-semibold">{sourceLabel}</span>
          <span className="text-ink/20">|</span>
          <span className="text-[11px] text-ink/40">{formatDate(publishedAt)}</span>
          <span className="text-ink/20">|</span>
          <SentimentBadge sentiment={sentiment} />
        </div>

        {/* Title */}
        <h1 className="font-['Playfair_Display'] text-2xl sm:text-3xl lg:text-[2.5rem] font-bold text-ink leading-tight mb-6">
          {title}
        </h1>

        <div className="border-t border-ink/10 mb-8" />

        {/* Body */}
        <article
          className="text-ink text-[15px] leading-[1.85] mb-10"
          dangerouslySetInnerHTML={{ __html: bodyText }}
        />
        <style>{`
          article p { margin-bottom: 1.1em; }
          article figure { margin: 1.5em 0; text-align: left; }
          article figure img { max-width: 50%; max-height: 400px; object-fit: contain; object-position: center top; height: auto; display: block; background: #f5f5f5; }
          article figcaption { font-size: 0.8em; color: #6b7280; margin-top: 0.5em; font-style: italic; }
          article a { color: #4f46e5; text-decoration: underline; }
        `}</style>

        {/* Read original */}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-ink/15 text-ink text-[11px] uppercase tracking-widest no-underline hover:bg-ink hover:text-paper transition-colors mb-10"
          >
            Read Original
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}

        <div className="border-t border-ink/10 mb-8" />

        {/* Analysis grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className="border border-ink/8 p-5">
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-semibold mb-3">Sentiment</p>
            <SentimentBreakdown sentiment={sentiment} confidence={confidence} feedback={feedback} />
          </div>

          {reason && (
            <div className="border border-ink/8 p-5">
              <p className="text-[10px] uppercase tracking-widest text-ink/40 font-semibold mb-3">AI Assessment</p>
              <p className="text-sm text-ink/70 leading-relaxed italic">&ldquo;{reason}&rdquo;</p>
            </div>
          )}

          {credibility && (
            <div className="border border-ink/8 p-5">
              <p className="text-[10px] uppercase tracking-widest text-ink/40 font-semibold mb-3">Source Credibility</p>
              <div className="flex items-center gap-3">
                <div className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider" style={{ border: `1px solid ${credMeta.color}`, color: credMeta.color }}>
                  {credMeta.label}
                </div>
                <span className="text-ink/60 text-sm">{credibility.credibilityScore || '--'}/100</span>
                {credibility.bias && credibility.bias !== 'unknown' && (
                  <span className="text-ink/30 text-[11px] uppercase tracking-wider">{credibility.bias}</span>
                )}
              </div>
            </div>
          )}

          <div className="border border-ink/8 p-5">
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-semibold mb-3">Details</p>
            <div className="space-y-2 text-sm">
              {topic && <div className="flex justify-between"><span className="text-ink/40">Topic</span><span className="text-ink/70">{topic}</span></div>}
              {impactScore > 0 && <div className="flex justify-between"><span className="text-ink/40">Impact</span><span className="text-ink/70">{impactScore}/100</span></div>}
              {viewCount > 0 && <div className="flex justify-between"><span className="text-ink/40">Views</span><span className="text-ink/70">{viewCount}</span></div>}
              {categories?.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-ink/40">Tags</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {categories.map((cat, i) => (
                      <span key={i} className="px-1.5 py-0.5 text-[10px] border border-ink/10 text-ink/50 uppercase tracking-wider">{cat}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related */}
        {relatedArticles.length > 0 && (
          <div className="mb-8">
            <div className="border-t border-ink/10 mb-6" />
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-semibold mb-4">Related Stories</p>
            <div className="divide-y divide-ink/8">
              {relatedArticles.map((a) => {
                const aid = a._id || a.id;
                const src = deriveSourceLabel(a.source, a.url);
                const sent = a.sentiment?.label || a.sentiment || 'Neutral';
                const sentColor = sent === 'Positive' ? 'text-green-600' : sent === 'Negative' ? 'text-red-600' : 'text-ink/40';
                return (
                  <Link key={aid} to={'/articles/' + aid} className="flex items-start gap-4 py-4 no-underline group">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-ink/40 mb-1">{src}</p>
                      <h4 className="text-sm font-semibold text-ink group-hover:text-[#4f46e5] leading-snug line-clamp-2">{a.title}</h4>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap ${sentColor}`}>{sent}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-ink/10 pt-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-ink/40 hover:text-ink text-[11px] uppercase tracking-widest no-underline transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ArticleDetail;
