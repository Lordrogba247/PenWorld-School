// ===== Class Model =====
const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  level: {
    type: String,
    enum: ['Creche', 'Nursery', 'Primary', 'JSS', 'SSS'],
    required: true,
  },
  section: {
    type: String,
    trim: true,
  },
  academicSession: {
    type: String,
    trim: true,
  },
  // Whether the class is active
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt on save
classSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Class', classSchema);
