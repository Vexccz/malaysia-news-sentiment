const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware to extract user from token
const getUser = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'mynews_sentiment_secret');
  } catch {
    return null;
  }
};

// In-memory storage (replace with MongoDB model in production)
let bookmarkFolders = [];
let bookmarks = {}; // { userId: [{ articleId, folderId, createdAt }] }

// GET /bookmarks/folders
router.get('/folders', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const userFolders = bookmarkFolders.filter(f => f.userId === user.id);
  res.json({ folders: userFolders });
});

// POST /bookmarks/folders
router.post('/folders', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }
  
  const folder = {
    id: Date.now().toString(),
    userId: user.id,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  
  bookmarkFolders.push(folder);
  res.json({ folder });
});

// PUT /bookmarks/folders/:id
router.put('/folders/:id', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id } = req.params;
  const { name } = req.body;
  
  const folder = bookmarkFolders.find(f => f.id === id && f.userId === user.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  
  if (name && name.trim()) {
    folder.name = name.trim();
  }
  
  res.json({ folder });
});

// DELETE /bookmarks/folders/:id
router.delete('/folders/:id', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id } = req.params;
  const index = bookmarkFolders.findIndex(f => f.id === id && f.userId === user.id);
  if (index === -1) return res.status(404).json({ error: 'Folder not found' });
  
  bookmarkFolders.splice(index, 1);
  
  // Remove folder reference from bookmarks
  if (bookmarks[user.id]) {
    bookmarks[user.id] = bookmarks[user.id].map(b => 
      b.folderId === id ? { ...b, folderId: null } : b
    );
  }
  
  res.json({ success: true });
});

// PUT /bookmarks/:id/folder
router.put('/:id/folder', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id } = req.params;
  const { folderId } = req.body;
  
  if (!bookmarks[user.id]) {
    bookmarks[user.id] = [];
  }
  
  const existing = bookmarks[user.id].find(b => b.articleId === id);
  if (existing) {
    existing.folderId = folderId || null;
  } else {
    bookmarks[user.id].push({
      articleId: id,
      folderId: folderId || null,
      createdAt: new Date().toISOString(),
    });
  }
  
  res.json({ success: true });
});

module.exports = router;
