// ===== Student Model =====
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  // Reference to User (one-to-one)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // Admissions info
  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  // Class info
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  academicSession: {
    type: String,
    trim: true,
  },

  // Admitted on
  admittedAt: {
    type: Date,
    default: Date.now,
  },

  // Audit fields
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
studentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Student', studentSchema);
