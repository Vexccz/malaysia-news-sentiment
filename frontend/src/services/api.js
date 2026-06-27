import axios from 'axios';
import { getGeminiModel } from '../config/firebase';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  withCredentials: true, // Required for secure cookie-based auth
});

// Add request interceptor to attach JWT token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Map API/network errors to user-friendly messages
 */
const getFriendlyError = (error) => {
  // No response at all — network/server down
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Request timed out. The server might be busy — please try again.';
    }
    if (error.message?.includes('Network Error')) {
      return 'Cannot connect to the server. Please check if the backend is running.';
    }
    return 'Connection failed. Please check your internet connection.';
  }

  const status = error.response.status;
  const serverMsg = error.response.data?.error || error.response.data?.message;

  switch (status) {
    case 400: return serverMsg || 'Invalid request. Please check your input.';
    case 401: return 'Session expired. Please log in again.';
    case 403: return 'You don\'t have permission to do this.';
    case 404: return serverMsg || 'The requested resource was not found.';
    case 429: return 'Too many requests. Please wait a moment and try again.';
    case 500: return serverMsg || 'Server error. The AI service might be temporarily unavailable.';
    case 502:
    case 503:
    case 504: return 'Server is temporarily unavailable. Please try again in a moment.';
    default:  return serverMsg || `Something went wrong (Error ${status}).`;
  }
};

/**
 * Retry a failed request (for 5xx and network errors only)
 */
const retryRequest = async (error, maxRetries = 2) => {
  const config = error.config;
  if (!config) return Promise.reject(error);

  config.__retryCount = config.__retryCount || 0;

  // Only retry on network errors or 5xx server errors
  const isRetryable = !error.response || (error.response.status >= 500 && error.response.status < 600);
  
  if (!isRetryable || config.__retryCount >= maxRetries) {
    // Attach friendly message before rejecting
    error.friendlyMessage = getFriendlyError(error);
    return Promise.reject(error);
  }

  config.__retryCount += 1;
  const delay = config.__retryCount * 1500; // 1.5s, 3s
  console.warn(`[API] Retrying request (${config.__retryCount}/${maxRetries}) after ${delay}ms...`);

  await new Promise(resolve => setTimeout(resolve, delay));
  return api(config);
};

// Add response interceptor to handle errors, retries, and expired tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 — expired token
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
      error.friendlyMessage = getFriendlyError(error);
      return Promise.reject(error);
    }

    // Auto-retry for server/network errors
    return retryRequest(error);
  }
);

/**
 * Fetch and analyze news for a given search query.
 *
 * @param {string} query - Search query (topic)
 * @param {number} pageSize - Number of articles
 * @param {boolean} latest - Latest mode
 * @param {object} opts - { fast?: boolean }
 *   fast=true → serves pre-analysed articles from DB cache (typically <500ms).
 *               Skips RSS fetch + AI analysis. Best for initial render.
 *   fast=false (default) → full pipeline: RSS fetch + sentiment analysis + DB upsert.
 *                          Slow (~5-30s) but produces fresh analysis.
 */
export const fetchAndAnalyzeNews = async (query, pageSize = 12, latest = false, opts = {}) => {
  const response = await api.get('/news', {
    params: { q: query, pageSize, latest, ...(opts.fast ? { fast: 'true' } : {}) },
  });
  return response.data;
};

/**
 * Fast-path: fetch pre-analysed articles from DB cache.
 * Returns instantly. Use for initial render, then call `fetchAndAnalyzeNews`
 * in the background to refresh the cache with new articles.
 */
export const fetchNewsFast = async (query, pageSize = 12, latest = false) => {
  return fetchAndAnalyzeNews(query, pageSize, latest, { fast: true });
};

/**
 * Get all previously analyzed articles with full filtering and pagination
 * (#6 Pagination, #7 Search/Date Filter)
 */
export const getHistory = async (params = {}) => {
  const response = await api.get('/history', { params });
  return response.data;
};

/**
 * Get aggregate statistics (#16)
 */
export const getStats = async (params = {}) => {
  const response = await api.get('/history/stats', { params });
  return response.data;
};

/**
 * Get sentiment trend data over time
 */
export const getTrends = async (params = {}) => {
  const response = await api.get('/history/trends', { params });
  return response.data;
};

/**
 * Get top news sources with sentiment breakdown
 */
export const getTopSources = async (topic = '') => {
  const response = await api.get('/news/sources', { params: topic ? { topic } : {} });
  return response.data;
};

/**
 * Get keyword frequency for Word Cloud (#11)
 */
export const getKeywords = async (params = {}) => {
  const response = await api.get('/news/keywords', { params });
  return response.data;
};

/**
 * Generate an AI digest summary for a batch of articles
 */
export const generateDigest = async (articles, topic) => {
  const gemini = await getGeminiModel();
  if (gemini) {
    try {
      const articleSummary = articles
        .slice(0, 15)
        .map((a, i) => `${i + 1}. [${a.sentiment}] ${a.title}`)
        .join('\n');

      const prompt = `You are an expert Malaysian news analyst fluent in English and Bahasa Malaysia.
Summarize the recent news about "${topic || 'General News'}":

${articleSummary}

Task: Provide a structured digest that is extremely clear and professional.
1. Start with an 'Executive overview:' header followed by 1-2 sentences. 
2. Use a 'Key news themes' header.
3. List news themes starting with a bullet character '•'.

Format as strict JSON ONLY, no markdown formatting:
{
  "en": "Executive overview: ...\\n\\nKey news themes:\\n• ...",
  "ms": "Ringkasan eksekutif: ...\\n\\nTema utama berita:\\n• ..."
}`;

      const result = await gemini.generateContent(prompt);
      let responseText = await result.response.text();
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(responseText);
      return { digest: parsed };
    } catch (error) {
      console.error("Firebase AI Logic digest failed, falling back to backend:", error);
    }
  }

  const response = await api.post('/news/digest', { articles, topic });
  return response.data;
};

/**
 * Generate a 7-day AI forecast based on analyzed articles
 */
export const generateForecast = async (articles, topic) => {
  const gemini = await getGeminiModel();
  if (gemini) {
    try {
      const summary = articles.slice(0, 30)
        .map(a => `- [${a.sentiment}] ${a.title}`)
        .join('\n');
    
      const prompt = `You are a Malaysian political and economic analyst. Forecast sentiment trends based on news headlines.
Based on these recent headlines regarding "${topic || 'General'}", provide a 7-day outlook.
Include translation for both English (en) and Bahasa Melayu (ms).

Format as strict JSON ONLY, no markdown formatting:
{ 
  "projectionScore": 85,
  "en": {
    "outlook": ["Paragraph 1", "Paragraph 2", "Paragraph 3"],
    "risks": ["risk1", "risk2", "risk3"]
  },
  "ms": {
    "outlook": ["Perenggan 1", "Perenggan 2", "Perenggan 3"],
    "risks": ["risiko1", "risiko2", "risiko3"]
  }
}

Headlines:
${summary}`;
      
      const result = await gemini.generateContent(prompt);
      let responseText = await result.response.text();
      // Remove any markdown fencing before parsing
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Firebase AI Logic forecast failed, falling back to backend:", error);
    }
  }

  const response = await api.post('/news/forecast', { articles, topic });
  return response.data;
};

/**
 * Delete an article by ID
 */
export const deleteArticle = async (id) => {
  const response = await api.delete(`/history/${id}`);
  return response.data;
};

/**
 * Bulk delete articles by IDs
 */
export const bulkDeleteArticles = async (ids) => {
  const response = await api.delete('/history/bulk', { data: { ids } });
  return response.data;
};

/**
 * Get sentiment breakdown by region (Malaysian States)
 * (#1 Heatmap)
 */
export const getRegionalData = async (topic = '') => {
  const response = await api.get('/news/regional', { params: topic ? { topic } : {} });
  return response.data;
};

/**
 * Increment article view count and track history (#1)
 */
export const trackView = async (id) => {
  const response = await api.post(`/news/${id}/view`);
  return response.data;
};

/**
 * Submit user sentiment feedback (#2 Hybrid)
 * @param {string} sentiment - Positive, Negative, Neutral
 * @param {string} type - up, down (optional)
 */
export const voteSentiment = async (id, feedback) => {
  const response = await api.post(`/news/${id}/vote`, feedback);
  return response.data;
};

/**
 * Get top viewed news with filters (#1)
 */
export const getTopViewed = async (params = {}) => {
  const response = await api.get('/news/top', { params });
  return response.data;
};

/**
 * Toggle article bookmark status (#3)
 */
export const toggleBookmark = async (id) => {
  const response = await api.post(`/news/${id}/bookmark`);
  return response.data;
};

/**
 * Get all bookmark folders
 */
export const getBookmarkFolders = async () => {
  const response = await api.get('/bookmarks/folders');
  return response.data;
};

/**
 * Create a new bookmark folder
 */
export const createBookmarkFolder = async (name) => {
  const response = await api.post('/bookmarks/folders', { name });
  return response.data;
};

/**
 * Rename a bookmark folder
 */
export const updateBookmarkFolder = async (id, name) => {
  const response = await api.put(`/bookmarks/folders/${id}`, { name });
  return response.data;
};

/**
 * Delete a bookmark folder
 */
export const deleteBookmarkFolder = async (id) => {
  const response = await api.delete(`/bookmarks/folders/${id}`);
  return response.data;
};

/**
 * Move a bookmark to a folder
 */
export const moveBookmarkToFolder = async (articleId, folderId) => {
  const response = await api.put(`/bookmarks/${articleId}/folder`, { folderId });
  return response.data;
};

/**
 * Toggle Read Later flag on a bookmark (M)
 */
export const setReadLater = async (articleId, readLater) => {
  const response = await api.put(`/bookmarks/${articleId}/read-later`, { readLater });
  return response.data;
};

/**
 * Mark Read Later bookmark as read (M)
 */
export const markBookmarkRead = async (articleId) => {
  const response = await api.post(`/bookmarks/${articleId}/mark-read`);
  return response.data;
};

/**
 * Get all bookmark metadata (folder/readLater/readAt) for current user (M)
 */
export const getBookmarkMeta = async () => {
  const response = await api.get('/bookmarks/meta');
  return response.data;
};

/**
 * Get admin system overview stats (#4)
 */

/**
 * Get all users (admin)
 */
export const getAdminUsers = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

/**
 * Update user role (admin)
 */
export const updateUserRole = async (userId, role) => {
  const response = await api.put(`/admin/users/${userId}/role`, { role });
  return response.data;
};

/**
 * Delete user (admin)
 */
export const deleteUser = async (userId) => {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};

/**
 * Update user status (admin)
 */
export const updateUserStatus = async (userId, active) => {
  const response = await api.put(`/admin/users/${userId}/status`, { active });
  return response.data;
};

export const getAdminStats = async () => {
  const response = await api.get('/news/admin/stats');
  return response.data;
};

/**
 * Get real-time monitor stats
 */
export const getMonitorStats = async () => {
  const response = await api.get('/monitor/stats');
  return response.data;
};

/**
 * Get strategic AI insights (Risks/Opportunities) (#Meltwater Style)
 */
export const getAdminInsights = async () => {
  const response = await api.get('/news/admin/insights');
  return response.data;
};

/**
 * Performance #15: Composite dashboard init — replaces 4 parallel calls on mount.
 * Returns { history, stats, trends, keywords } in one round-trip.
 */
export const getDashboardInit = async (params = {}) => {
  const response = await api.get('/history/dashboard-init', { params });
  return response.data;
};

/**
 * Get detailed AI analysis for a specific article (Summary, Entities, Sentiment Breakdown)
 */
export const getArticleAnalysis = async (article) => {
  const response = await api.post('/news/analyze-article', { article });
  return response.data;
};

/**
 * Track a user behavior action
 */
export const trackBehaviorAction = async (action, data = {}) => {
  const response = await api.post('/behavior/track', {
    action,
    ...data,
  });
  return response.data;
};

/**
 * Get user behavior stats
 */
export const getBehaviorStats = async () => {
  const response = await api.get('/behavior/stats');
  return response.data;
};

/**
 * Get AI-generated user behavior insights
 */
export const getBehaviorInsights = async () => {
  const response = await api.get('/behavior/insights');
  return response.data;
};

export default api;
