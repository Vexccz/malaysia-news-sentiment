/**
 * Article content translation service.
 * Uses LibreTranslate (free, open-source) with localStorage caching.
 * Falls back gracefully if the API is unavailable.
 */

const CACHE_KEY = 'article-translations-cache';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// LibreTranslate public instances (try in order)
const API_ENDPOINTS = [
  'https://libretranslate.com/translate',
  'https://translate.terraprint.co/translate',
];

/**
 * Load translation cache from localStorage.
 * @returns {Map<string, object>}
 */
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    // Filter expired entries
    const now = Date.now();
    const entries = Object.entries(parsed).filter(([, v]) => now - v.ts < CACHE_MAX_AGE);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

/**
 * Save translation cache to localStorage.
 * @param {Map<string, object>} cache
 */
function saveCache(cache) {
  try {
    const obj = Object.fromEntries(cache);
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // localStorage might be full; silently ignore
  }
}

/**
 * Build a cache key for a given text + target language.
 */
function cacheKey(text, targetLang) {
  // Use first 100 chars + length as key to avoid huge keys
  return `${targetLang}:${text.slice(0, 100)}:${text.length}`;
}

/**
 * Translate text using LibreTranslate API.
 * Tries multiple endpoints for resilience.
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code ('ms' or 'en')
 * @param {string} sourceLang - Source language code ('en' or 'ms')
 * @returns {Promise<string>} Translated text
 */
async function callTranslateAPI(text, targetLang, sourceLang = 'auto') {
  const body = JSON.stringify({
    q: text,
    source: sourceLang === 'auto' ? 'auto' : sourceLang,
    target: targetLang === 'ms' ? 'ms' : targetLang,
    format: 'text',
  });

  for (const endpoint of API_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.translatedText) return data.translatedText;
    } catch {
      // Try next endpoint
      continue;
    }
  }

  // Last resort: use Google Translate unofficial endpoint
  try {
    const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
    const tl = targetLang === 'ms' ? 'ms' : targetLang;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        return data[0].map(s => s[0]).join('');
      }
    }
  } catch {
    // All endpoints failed
  }

  throw new Error('Translation API unavailable');
}

/**
 * Translate article text. Results are cached in localStorage.
 * @param {string} text - Article title or description to translate
 * @param {string} targetLang - Target language ('en' or 'ms')
 * @param {string} sourceLang - Source language ('en', 'ms', or 'auto')
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLang, sourceLang = 'auto') {
  if (!text || text.trim().length < 3) return text;

  const cache = loadCache();
  const key = cacheKey(text, targetLang);

  if (cache.has(key)) {
    return cache.get(key).text;
  }

  const translated = await callTranslateAPI(text, targetLang, sourceLang);

  // Save to cache
  cache.set(key, { text: translated, ts: Date.now() });
  saveCache(cache);

  return translated;
}

/**
 * Translate an article's title and description.
 * @param {object} article - Article object with title and description
 * @param {string} targetLang - Target language
 * @returns {Promise<{title: string, description: string}>}
 */
export async function translateArticle(article, targetLang) {
  const sourceLang = targetLang === 'ms' ? 'en' : 'ms';

  const [translatedTitle, translatedDesc] = await Promise.all([
    article.title ? translateText(article.title, targetLang, sourceLang) : Promise.resolve(''),
    article.description ? translateText(article.description, targetLang, sourceLang) : Promise.resolve(''),
  ]);

  return { title: translatedTitle, description: translatedDesc };
}

/**
 * Clear the translation cache.
 */
export function clearTranslationCache() {
  localStorage.removeItem(CACHE_KEY);
}
