const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, blockGuest } = require('../middleware/auth');
const User = require('../models/User');
const { validate } = require('../middleware/validate');
const { bookmarkSchemas } = require('../middleware/schemas');

const { suggestCategory, autoAssignFolder } = require('../services/bookmarkAutoCategorize');
// ── All bookmark folder routes require authentication ──
router.use(protect, blockGuest);

// GET /bookmarks/folders
router.get('/folders', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('bookmarkFolders').lean();
    res.json({ folders: user?.bookmarkFolders || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /bookmarks/folders
router.post('/folders', validate(bookmarkSchemas.createFolder), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = {
      id: new mongoose.Types.ObjectId().toString(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };

    await User.findByIdAndUpdate(req.userId, {
      $push: { bookmarkFolders: folder },
    });

    res.json({ folder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /bookmarks/folders/:id
router.put('/folders/:id', validate(bookmarkSchemas.renameFolder), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const result = await User.findOneAndUpdate(
      { _id: req.userId, 'bookmarkFolders.id': id },
      { $set: { 'bookmarkFolders.$.name': name.trim() } },
      { new: true }
    );

    if (!result) return res.status(404).json({ error: 'Folder not found' });

    const folder = result.bookmarkFolders.find(f => f.id === id);
    res.json({ folder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /bookmarks/folders/:id
router.delete('/folders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await User.findByIdAndUpdate(req.userId, {
      $pull: { bookmarkFolders: { id } },
    });

    // Clear folder reference from bookmarks
    await User.findByIdAndUpdate(req.userId, {
      $set: { 'bookmarkMeta.$[elem].folderId': null },
    }, {
      arrayFilters: [{ 'elem.folderId': id }],
    }).catch(() => {}); // bookmarkMeta may not exist yet

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /bookmarks/:id/folder — assign article bookmark to folder
router.put('/:id/folder', validate(bookmarkSchemas.moveBookmark), async (req, res) => {
  try {
    const { id } = req.params; // article id
    const { folderId } = req.body;

    // Verify folder exists if folderId provided
    if (folderId) {
      const user = await User.findById(req.userId).select('bookmarkFolders').lean();
      const folderExists = user?.bookmarkFolders?.some(f => f.id === folderId);
      if (!folderExists) return res.status(404).json({ error: 'Folder not found' });
    }

    // Upsert bookmark metadata
    const existing = await User.findOne({
      _id: req.userId,
      'bookmarkMeta.articleId': id,
    });

    if (existing) {
      await User.updateOne(
        { _id: req.userId, 'bookmarkMeta.articleId': id },
        { $set: { 'bookmarkMeta.$.folderId': folderId || null } }
      );
    } else {
      await User.findByIdAndUpdate(req.userId, {
        $push: { bookmarkMeta: { articleId: id, folderId: folderId || null } },
      });
    }

    res.json({ success: true, articleId: id, folderId: folderId || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /bookmarks/:id/read-later — toggle Read Later flag
router.put('/:id/read-later', async (req, res) => {
  try {
    const { id } = req.params;
    const { readLater } = req.body; // boolean

    const existing = await User.findOne({
      _id: req.userId,
      'bookmarkMeta.articleId': id,
    });

    if (existing) {
      await User.updateOne(
        { _id: req.userId, 'bookmarkMeta.articleId': id },
        { $set: { 'bookmarkMeta.$.readLater': !!readLater } }
      );
    } else {
      await User.findByIdAndUpdate(req.userId, {
        $push: { bookmarkMeta: { articleId: id, readLater: !!readLater } },
      });
    }

    res.json({ success: true, articleId: id, readLater: !!readLater });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /bookmarks/:id/mark-read — mark Read Later item as read (sets readAt)
router.post('/:id/mark-read', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await User.findOne({
      _id: req.userId,
      'bookmarkMeta.articleId': id,
    });

    if (existing) {
      await User.updateOne(
        { _id: req.userId, 'bookmarkMeta.articleId': id },
        { $set: { 'bookmarkMeta.$.readAt': new Date(), 'bookmarkMeta.$.readLater': false } }
      );
    } else {
      await User.findByIdAndUpdate(req.userId, {
        $push: { bookmarkMeta: { articleId: id, readAt: new Date(), readLater: false } },
      });
    }

    res.json({ success: true, articleId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /bookmarks/meta — fetch all bookmark metadata for current user
router.get('/meta', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('bookmarkMeta').lean();
    res.json({ meta: user?.bookmarkMeta || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// POST /bookmarks/suggest — suggest folder category for an article
router.post('/suggest', async (req, res) => {
  try {
    const { articleId } = req.body;
    if (!articleId) return res.status(400).json({ error: 'articleId required' });
    
    const suggestion = await suggestCategory(articleId);
    res.json(suggestion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /bookmarks/auto-assign — auto-categorize and assign bookmark to folder
router.post('/auto-assign', async (req, res) => {
  try {
    const { articleId } = req.body;
    if (!articleId) return res.status(400).json({ error: 'articleId required' });
    
    const result = await autoAssignFolder(req.userId, articleId, User);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
