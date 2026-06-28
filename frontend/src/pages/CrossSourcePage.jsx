import React, { useState, useEffect, useCallback } from 'react';
import { Newspaper, Scale, TrendingUp, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { CardSkeleton } from '../components/Skeletons';
import api from '../services/api';

const DAYS = [7, 14, 30];
const SC = { Positive: '#10b981', Negative: '#ef4444', Neutral: '#f59e0b' };

const badgeStyle = (sentiment) => ({
  color: SC[sentiment] || '#888',
  border: `1px solid ${SC[sentiment] || '#888'}`,
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: '1px 6px',
  borderRadius: 2,
  display: 'inline-block',
});

export default function CrossSourcePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [days, setDays] = useState(7);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const bg = isDark ? '#0a0a0a' : '#fff';
  const cardBg = isDark ? '#111' : '#fafafa';
  const border = isDark ? '#222' : '#e5e5e5';
  const text = isDark ? '#fff' : '#111';
  const muted = isDark ? '#999' : '#666';
  const accent = isDark ? '#fff' : '#000';

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/cross-source/top', { params: { days } });
      setEvents(data.events || []);
    } catch { setEvents([]); }
    setLoading(false);
  }, [days]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div style={{ background: bg, color: text, minHeight: '100vh', padding: '32px 24px' }}>
      <header style={{ marginBottom: 28, maxWidth: 960, margin: '0 auto 28px' }}>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: muted, marginBottom: 4, fontWeight: 600 }}>
          <Scale size={12} style={{ marginRight: 6, verticalAlign: -1 }} />Media Analysis
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
          Cross-Source Comparison
        </h1>
        <p style={{ color: muted, fontSize: 13, marginTop: 6 }}>
          How Malaysian outlets cover top stories — sentiment scored side by side.
        </p>
        <div style={{ display: 'flex', gap: 0, marginTop: 16 }}>
          {DAYS.map((d) => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: '6px 16px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
              border: `1px solid ${border}`, borderRadius: 0, cursor: 'pointer',
              background: days === d ? accent : 'transparent', color: days === d ? (isDark ? '#000' : '#fff') : text,
              borderRight: d !== 30 ? 'none' : `1px solid ${border}`,
            }}>{d}D</button>
          ))}
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {loading ? <CardSkeleton count={4} /> : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, border: `1px solid ${border}`, borderRadius: 2 }}>
            <Newspaper size={24} color={muted} />
            <p style={{ color: muted, fontSize: 13, marginTop: 12 }}>No cross-source events found for this period.</p>
          </div>
        ) : events.map((ev, ei) => (
          <div key={ei} style={{
            background: cardBg, border: `1px solid ${border}`, borderRadius: 2, marginBottom: 20,
            borderLeft: `3px solid ${accent}`, padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>
                <TrendingUp size={14} style={{ marginRight: 8, verticalAlign: -1 }} color={muted} />
                {ev.topic}
              </h2>
              <span style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                {ev.sourceCount} sources · {ev.totalArticles} articles
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(ev.comparisons?.length || 1, 4)}, 1fr)`, gap: 12 }}>
              {(ev.comparisons || []).map((src, si) => {
                const key = `${ei}-${si}`;
                const isOpen = expanded[key];
                return (
                  <div key={si} style={{
                    border: `1px solid ${border}`, borderRadius: 2, padding: '12px 14px', cursor: 'pointer',
                    background: isDark ? '#0d0d0d' : '#fff',
                    borderLeft: `3px solid ${SC[src.dominantSentiment] || '#888'}`,
                  }} onClick={() => toggle(key)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em' }}>{src.name}</span>
                      <BarChart3 size={12} color={muted} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: SC[src.dominantSentiment] || text }}>
                        {src.sentimentScore >= 0 ? '+' : ''}{src.sentimentScore?.toFixed(2)}
                      </span>
                      <span style={badgeStyle(src.dominantSentiment)}>{src.dominantSentiment}</span>
                    </div>
                    <div style={{ fontSize: 11, color: muted, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{src.articleCount} articles</span>
                      {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </div>

                    {isOpen && src.articles?.length > 0 && (
                      <div style={{ marginTop: 10, borderTop: `1px solid ${border}`, paddingTop: 10 }}>
                        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, fontWeight: 600, marginBottom: 6 }}>
                          Latest Headlines
                        </p>
                        {src.articles.slice(0, 5).map((a, ai) => (
                          <p key={ai} style={{ fontSize: 12, margin: '0 0 4px', lineHeight: 1.4, color: text }}>
                            {a.title || a}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
