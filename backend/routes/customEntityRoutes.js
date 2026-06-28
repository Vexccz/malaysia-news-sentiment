const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const CustomEntity = require('../models/CustomEntity');

// GET /api/v1/custom-entities - list user's custom entities
router.get('/', protect, async (req, res) => {
  try {
    const entities = await CustomEntity.find({ user: req.userId, isActive: true }).sort({ createdAt: -1 });
    res.json({ entities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/custom-entities - add custom entity
router.post('/', protect, async (req, res) => {
  try {
    const { name, synonyms, category } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    
    const entity = await CustomEntity.create({
      user: req.userId,
      name: name.trim(),
      synonyms: synonyms || [],
      category: category || 'CUSTOM'
    });
    res.status(201).json(entity);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Entity already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/custom-entities/:id - soft delete
router.delete('/:id', protect, async (req, res) => {
  try {
    await CustomEntity.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isActive: false }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
