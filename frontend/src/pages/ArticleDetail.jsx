import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import SentimentBadge from '../components/SentimentBadge';
import ArticleCard from '../components/ArticleCard';
import { useFreshness } from '../context/FreshnessContext';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const deriveSourceLabel = (source, url) => {
  if (source && source !== 'Unknown' && source !== 'Source' && source !== 'Media Source') {
    return source;
  }
  if (!url) return 'News Source';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const label = host.split('.')[0] || host;
    return label.split(/[-_]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  } catch {
    return 'News Source';
  }
};

const getFaviconUrl = (url) => {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return null;
  }
};

const CREDIBILITY_LABELS = {
  high: { label: 'High Credibility', color: '#059669' },
  medium: { label: 'Medium Credibility', color: '#d97706' },
  low: { label: 'Low Credibility', color: '#dc2626' },
  unknown: { label: 'Unrated Source', color: '#6b7280' },
};

const getCredibilityLevel = (score) => {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  if (score > 0) return 'low';
  return 'unknown';
};

const ArticleSkeleton = () => (
  <div className="max-w-3xl mx-auto animate-pulse">
    <div className="h-4 w-32 bg-ink/10 mb-6" />
    <div className="h-3 w-48 bg-ink/10 mb-4" />
    <div className="h-10 w-full bg-ink/10 mb-2" />
    <div className="h-10 w-3/4 bg-ink/10 mb-6" />
    <div className="border-t border-ink/10 my-6" />
    <div className="space-y-3">
      <div className="h-4 w-full bg-ink/10" />
      <div className="h-4 w-full bg-ink/10" />
      <div className="h-4 w-5/6 bg-ink/10" />
      <div className="h-4 w-full bg-ink/10" />
      <div className="h-4 w-2/3 bg-ink/10" />
    </div>
    <div className="border-t border-ink/10 my-8" />
    <div className="h-5 w-40 bg-ink/10 mb-4" />
    <div className="h-3 w-full bg-ink/10 mb-2" />
    <div className="h-3 w-full bg-ink/10 mb-2" />
    <div className="h-3 w-1/2 bg-ink/10" />
  </div>
);

const SentimentBreakdown = ({ sentiment, confidence, feedback }) => {
  const posVotes = feedback?.Positive || 0;
  const negVotes = feedback?.Negative || 0;
  const neuVotes = feedback?.Neutral || 0;
  const totalVotes = posVotes + negVotes + neuVotes;

  let positive, negative, neutral;

  if (totalVotes > 0) {
    positive = Math.round((posVotes / totalVotes) * 100);
    negative = Math.round((negVotes / totalVotes) * 100);
    neutral = 100 - positive - negative;
  } else {
    const conf = Math.round((confidence || 0.5) * 100);
    if (sentiment === 'Positive') {
      positive = conf;
      negative = Math.round((100 - conf) * 0.3);
      neutral = 100 - positive - negative;
    } else if (sentiment === 'Negative') {
      negative = conf;
      positive = Math.round((100 - conf) * 0.3);
      neutral = 100 - positive - negative;
    } else {
      neutral = conf;
      positive = Math.round((100 - conf) * 0.5);
      negative = 100 - neutral - positive;
    }
  }

  return (
    <div>
      <p className="text-ink/50 uppercase tracking-widest text-xs mb-3 font-semibold">Sentiment Breakdown</p>
      <div className="flex h-3 w-full overflow-hidden" style={{ borderRadius: 0 }}>
        <div style={{ width: `${positive}%`, background: '#059669' }} title={`Positive: ${positive}%`} />
        <div style={{ width: `${neutral}%`, background: '#6b7280' }} title={`Neutral: ${neutral}%`} />
        <div style={{ width: `${negative}%`, background: '#dc2626' }} title={`Negative: ${negative}%`} />
      </div>
      <div className="flex justify-between mt-2 text-xs text-ink/60">
        <span><span className="inline-block w-2 h-2 mr-1" style={{ background: '#059669' }} />Positive {positive}%</span>
        <span><span className="inline-block w-2 h-2 mr-1" style={{ background: '#6b7280' }} />Neutral {neutral}%</span>
        <span><span className="inline-block w-2 h-2 mr-1" style={{ background: '#dc2626' }} />Negative {negative}%</span>
      </div>
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
      setError(err.response?.data?.error || err.friendlyMessage || 'Article not found');
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
      <div className="bg-paper dark:bg-paper-dark min-h-screen p-4 lg:p-8">
        <ArticleSkeleton />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="bg-paper dark:bg-paper-dark min-h-screen p-4 lg:p-8">
        <div className="max-w-3xl mx-auto text-center py-20">
          <p className="text-ink/50 uppercase tracking-widest text-xs mb-4">Error</p>
          <h1 className="font-['Playfair_Display'] text-3xl font-bold text-ink dark:text-paper mb-4">
            Article Not Found
          </h1>
          <p className="text-ink/60 mb-8">{error || 'The requested article could not be loaded.'}</p>
          <Link
            to="/dashboard"
            className="inline-block px-6 py-2 border border-ink/20 text-ink dark:text-paper text-sm uppercase tracking-widest no-underline hover:bg-ink hover:text-paper transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const {
    title, description, content, source, url, urlToImage,
    publishedAt, sentiment, confidence, reason, categories,
    topic, viewCount, bookmarksCount, feedback, impactScore,
  } = article;

  const sourceLabel = deriveSourceLabel(source, url);
  const faviconUrl = getFaviconUrl(url);
  const credLevel = getCredibilityLevel(credibility?.credibilityScore);
  const credMeta = CREDIBILITY_LABELS[credLevel];
  const bodyText = content || description || '';

  return (
    <div className="bg-paper dark:bg-paper-dark min-h-screen">
      <div className="max-w-3xl mx-auto p-4 lg:p-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-ink/50 hover:text-ink dark:hover:text-paper text-xs uppercase tracking-widest no-underline transition-colors mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          {faviconUrl && (
            <img src={faviconUrl} alt="" width="16" height="16" style={{ borderRadius: 2 }} loading="lazy" />
          )}
          <span className="text-ink/50 uppercase tracking-widest text-xs font-semibold">{sourceLabel}</span>
          <span className="text-ink/30">|</span>
          <span className="text-ink/50 text-xs">{formatDate(publishedAt)}</span>
          <SentimentBadge sentiment={sentiment} />
        </div>

        <h1 className="font-['Playfair_Display'] text-3xl lg:text-4xl font-bold text-ink dark:text-paper leading-tight mb-6">
          {title}
        </h1>

        {urlToImage && (
          <div className="mb-6">
            <img
              src={urlToImage}
              alt={title}
              className="w-full max-h-96 object-cover"
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        <div className="border-t border-ink/10 my-6" />

        <article
          className="text-ink dark:text-paper text-base leading-relaxed mb-8"
          style={{ lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: bodyText }}
        />
        <style>{`
          article p { margin-bottom: 1em; }
          article figure { margin: 1.5em 0; }
          article figure img { max-width: 100%; height: auto; }
          article figcaption { font-size: 0.8em; color: #6b7280; margin-top: 0.5em; font-style: italic; }
          article a { color: #4f46e5; text-decoration: underline; }
        `}</style>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-5 py-2 border border-ink/20 text-ink dark:text-paper text-xs uppercase tracking-widest no-underline hover:bg-ink hover:text-paper transition-colors mb-8"
          >
            Read Original Article
          </a>
        )}

        <div className="border-t border-ink/10 my-8" />

        <div className="mb-8">
          <SentimentBreakdown sentiment={sentiment} confidence={confidence} feedback={feedback} />
        </div>

        {reason && (
          <div className="mb-8">
            <p className="text-ink/50 uppercase tracking-widest text-xs mb-2 font-semibold">AI Analysis</p>
            <blockquote className="border-l-2 border-ink/20 pl-4 text-ink/70 italic text-sm">
              &ldquo;{reason}&rdquo;
            </blockquote>
          </div>
        )}

        {credibility && (
          <div className="mb-8">
            <p className="text-ink/50 uppercase tracking-widest text-xs mb-3 font-semibold">Source Credibility</p>
            <div className="flex items-center gap-4">
              <div
                className="px-3 py-1 text-xs font-bold uppercase tracking-wider"
                style={{ border: `1px solid ${credMeta.color}`, color: credMeta.color }}
              >
                {credMeta.label}
              </div>
              <span className="text-ink/60 text-sm">
                Score: {credibility.credibilityScore || '--'}/100
              </span>
              {credibility.bias && credibility.bias !== 'unknown' && (
                <span className="text-ink/40 text-xs uppercase tracking-wider">
                  Bias: {credibility.bias}
                </span>
              )}
            </div>
          </div>
        )}

        {categories && categories.length > 0 && (
          <div className="mb-8">
            <p className="text-ink/50 uppercase tracking-widest text-xs mb-3 font-semibold">Categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs border border-ink/15 text-ink/60 uppercase tracking-wider"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-6 text-xs text-ink/40 mb-8">
          {viewCount > 0 && <span>{viewCount} views</span>}
          {bookmarksCount > 0 && <span>{bookmarksCount} bookmarks</span>}
          {impactScore > 0 && <span>Impact: {impactScore}/100</span>}
          {topic && <span>Topic: {topic}</span>}
        </div>

        <div className="border-t border-ink/10 my-8" />

        {relatedArticles.length > 0 && (
          <div>
            <p className="text-ink/50 uppercase tracking-widest text-xs mb-4 font-semibold">Related Stories</p>
            <div className="space-y-3">
              {relatedArticles.map((a) => {
                const aid = a._id || a.id;
                const src = deriveSourceLabel(a.source, a.url);
                const sent = a.sentiment?.label || a.sentiment || 'Neutral';
                const sentColor = sent === 'Positive' ? 'text-green-600' : sent === 'Negative' ? 'text-red-600' : 'text-ink/40';
                return (
                  <Link
                    key={aid}
                    to={'/articles/' + aid}
                    className="flex items-start gap-4 p-4 border border-ink/8 hover:border-ink/20 transition-colors no-underline group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] uppercase tracking-widest text-ink/40 mb-1">{src}</p>
                      <h4 className="text-sm font-semibold text-ink group-hover:text-[#4f46e5] leading-snug line-clamp-2 mb-1">
                        {a.title}
                      </h4>
                      {a.description && (
                        <p className="text-xs text-ink/50 leading-relaxed line-clamp-1">{a.description}</p>
                      )}
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap ${sentColor}`}>
                      {sent}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-ink/10 mt-8 pt-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-ink/50 hover:text-ink dark:hover:text-paper text-xs uppercase tracking-widest no-underline transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
