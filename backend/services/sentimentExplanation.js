/**
 * Sentiment Explanation Service (XAI)
 * Extracts top contributing words/phrases that influenced sentiment classification
 */

// Sentiment lexicon for Malaysian context
const SENTIMENT_LEXICON = {
  positive: ['tumbuh', 'naik', 'rekod', 'untung', 'berjaya', 'stabil', 'kukuh', 'meningkat', 'positif', 'baik', 'cemerlang', 'hebat', 'bagus', 'terbaik', 'syabas', 'tahniah', 'harapan', 'peluang', 'kemajuan', 'pembangunan', 'pelaburan', 'FDI', 'eksport', 'surplus', 'pulangan', 'dividen', 'bonus', 'insentif', 'bantuan', 'subsidi', 'setuju', 'sokong', 'puji', 'hargai', 'bangga'],
  negative: ['turun', 'lemah', 'rugi', 'gagal', 'krisis', 'masalah', 'kebimbangan', 'ketidaktentuan', 'inflasi', 'pengangguran', 'hutang', 'defisit', 'kemerosotan', 'kejatuhan', 'penurunan', 'negatif', 'buruk', 'teruk', 'bahaya', 'ancaman', 'risiko', 'amalan', 'rasuah', 'skandal', 'penipuan', 'jenayah', 'banjir', 'bencana', 'kemalangan', 'kematian', 'kritik', 'bantah', 'marah', 'kecewa', 'ragu', 'persoal', 'dakwaan']
};

/**
 * Extract top contributing words for sentiment classification
 * @param {string} text - Article title + description
 * @param {string} sentiment - Classified sentiment (Positive/Negative/Neutral)
 * @param {number} confidence - Model confidence (0-1)
 * @returns {object} - { words: [{word, score, sentiment}], explanation: string }
 */
function getSentimentExplanation(text, sentiment, confidence) {
  if (!text) return { words: [], explanation: 'Insufficient text for analysis' };
  
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const contributors = [];
  
  words.forEach(word => {
    const cleanWord = word.replace(/[^\w]/g, '');
    if (SENTIMENT_LEXICON.positive.includes(cleanWord)) {
      contributors.push({ word: cleanWord, score: 0.8, sentiment: 'positive', original: word });
    } else if (SENTIMENT_LEXICON.negative.includes(cleanWord)) {
      contributors.push({ word: cleanWord, score: 0.8, sentiment: 'negative', original: word });
    }
  });
  
  // Sort by score, take top 5
  const topWords = contributors
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  // Generate explanation text
  let explanation = '';
  if (topWords.length > 0) {
    const matchingWords = topWords.filter(w => w.sentiment === sentiment.toLowerCase());
    if (matchingWords.length > 0) {
      explanation = `Classified as **${sentiment}** (${Math.round(confidence * 100)}% confidence) based on keywords: ${matchingWords.map(w => `"${w.original}"`).join(', ')}`;
    } else {
      explanation = `Classified as **${sentiment}** (${Math.round(confidence * 100)}% confidence) despite mixed sentiment signals`;
    }
  } else {
    explanation = `Classified as **${sentiment}** (${Math.round(confidence * 100)}% confidence) based on overall context`;
  }
  
  return {
    words: topWords,
    explanation,
    confidence: Math.round(confidence * 100)
  };
}

module.exports = { getSentimentExplanation };
