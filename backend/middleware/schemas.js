// ─────────────────────────────────────────────────────────────
// Shared Zod schemas for request validation. Imported by route
// files via `const { authSchemas, profileSchemas, ... } = require(...)`.
//
// Keep schemas defensive but not overly strict — empty/optional
// fields should pass; only obviously malformed input should be
// rejected with 400.
// ─────────────────────────────────────────────────────────────

const { z } = require('zod');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');

// ── AUTH ─────────────────────────────────────────────────────
const authSchemas = {
  register: z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().email().max(200),
    password: z.string().min(8).max(200),
  }),
  login: z.object({
    email: z.string().email().max(200),
    password: z.string().min(1).max(200),
    rememberMe: z.boolean().optional(),
    twoFactorCode: z.string().regex(/^\d{6}$/).optional(),
  }),
  forgotPassword: z.object({
    email: z.string().email().max(200),
  }),
  resetPassword: z.object({
    token: z.string().min(10).max(500),
    password: z.string().min(8).max(200),
  }),
  resendVerification: z.object({
    email: z.string().email().max(200),
  }),
  changePassword: z.object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(8).max(200),
  }),
};

// ── PROFILE ──────────────────────────────────────────────────
const profileSchemas = {
  updateProfile: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    bio: z.string().max(280).optional(),
    phone: z.string().max(30).optional().or(z.literal('')),
    avatar: z.string().max(3 * 1024 * 1024).optional(), // base64 data: URL or http URL
  }),
  updatePreferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    language: z.enum(['en', 'ms']).optional(),
    articlesPerPage: z.number().int().min(5).max(100).optional(),
    emailNotifications: z.boolean().optional(),
    alertNotifications: z.boolean().optional(),
    autoRefresh: z.boolean().optional(),
    defaultTopic: z.string().max(100).optional(),
  }),
};

// ── BOOKMARKS ────────────────────────────────────────────────
const bookmarkSchemas = {
  createFolder: z.object({
    name: z.string().trim().min(1).max(60),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
  renameFolder: z.object({
    name: z.string().trim().min(1).max(60),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
  moveBookmark: z.object({
    folderId: z.string().nullable().optional(),
  }),
};

// ── COMMENTS / COLLABORATION ─────────────────────────────────
const collabSchemas = {
  postComment: z.object({
    articleId: objectId,
    content: z.string().trim().min(1).max(2000),
    isAnonymous: z.boolean().optional(),
  }),
  postReply: z.object({
    content: z.string().trim().min(1).max(2000),
    isAnonymous: z.boolean().optional(),
  }),
  reportComment: z.object({
    reason: z.string().min(1).max(500),
  }),
  reactToComment: z.object({
    reaction: z.enum(['like', 'love', 'agree', 'disagree', 'insightful']),
  }),
  shareArticle: z.object({
    articleId: objectId,
    audience: z.enum(['public', 'private']).optional(),
    message: z.string().max(500).optional(),
  }),
};

module.exports = {
  authSchemas,
  profileSchemas,
  bookmarkSchemas,
  collabSchemas,
  objectId,
};
