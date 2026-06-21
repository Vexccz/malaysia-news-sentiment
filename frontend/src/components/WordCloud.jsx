import React, { useEffect, useState } from 'react';
import { getKeywords } from '../services/api';

const WordCloud = ({ words: propWords }) => {
  const [internalWords, setInternalWords] = useState([]);
  const [loading, setLoading] = useState(!propWords);
  const [error, setError] = useState(null);

  const displayWords = (propWords && propWords.length > 0) ? propWords : internalWords;

  useEffect(() => {
    if (propWords && propWords.length > 0) {
      setLoading(false);
      return;
    }

    const fetchWords = async () => {
      setLoading(true);
      try {
        const data = await getKeywords();
        setInternalWords(data);
      } catch (err) {
        console.error('Error fetching keywords:', err);
        setError('Unable to load trending keywords.');
      } finally {
        setLoading(false);
      }
    };
    fetchWords();
  }, [propWords]);

  if (loading) return (
    <div className="flex flex-wrap gap-2 p-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="h-4 bg-ink/5 dark:bg-paper/5 animate-pulse" style={{ width: `${Math.random() * 60 + 40}px` }} />
      ))}
    </div>
  );

  if (error || displayWords.length === 0) return null;

  const counts = displayWords.map(w => w.count);
  const max = Math.max(...counts);
  const min = Math.min(...counts);

  const getFontSize = (count) => {
    if (max === min) return '0.75rem';
    const scale = (count - min) / (max - min);
    return `${Math.round(12 + scale * 12)}px`;
  };

  const getWeight = (count) => {
    if (max === min) return '400';
    const scale = (count - min) / (max - min);
    if (scale > 0.7) return '700';
    if (scale > 0.4) return '600';
    return '400';
  };

  const getOpacity = (count) => {
    if (max === min) return '0.7';
    const scale = (count - min) / (max - min);
    return (0.4 + scale * 0.6).toFixed(2);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">
          Trending Keywords
        </h3>
        <span className="text-[10px] uppercase tracking-[0.15em] text-ink/30 dark:text-paper/30 font-sans">
          Based on latest data
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {displayWords.map((item, idx) => (
          <span
            key={idx}
            className="text-ink dark:text-paper font-sans hover:text-ink/80 dark:hover:text-paper/80 transition-colors cursor-default"
            style={{
              fontSize: getFontSize(item.count),
              fontWeight: getWeight(item.count),
              opacity: getOpacity(item.count),
            }}
            title={`${item.count} mentions`}
          >
            {item.word}
          </span>
        ))}
      </div>
    </div>
  );
};

export default WordCloud;
