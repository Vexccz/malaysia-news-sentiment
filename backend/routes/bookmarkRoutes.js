const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, blockGuest } = require('../middleware/auth');
const User = require('../models/User');

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
router.post('/folders', async (req, res) => {
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
router.put('/folders/:id', async (req, res) => {
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
router.put('/:id/folder', async (req, res) => {
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

module.exports = router;
