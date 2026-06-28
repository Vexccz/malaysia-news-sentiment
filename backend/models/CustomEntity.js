const mongoose = require('mongoose');

const customEntitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  synonyms: [{ type: String, trim: true }], // Alternative names/aliases
  category: { type: String, default: 'CUSTOM', enum: ['PERSON', 'ORGANIZATION', 'LOCATION', 'CUSTOM'] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Compound index: one entity name per user
customEntitySchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('CustomEntity', customEntitySchema);
