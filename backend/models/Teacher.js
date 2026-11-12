// ===== Teacher Model =====
const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  // Reference to User (one-to-one)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // Staff info
  staffId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  // Role info
  role: {
    type: String,
    enum: ['teacher', 'admin', 'classTeacher'],
    required: true,
  },

  // Department (e.g., "Class Teacher - JSS 1", or subject department)
  department: {
    type: String,
    trim: true,
  },

  // Linked classes (for class teachers)
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
  }],

  // Subjects taught
  subjects: [{
    type: String,
    trim: true,
  }],

  // Academic info
  academicSession: {
    type: String,
    trim: true,
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
teacherSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Teacher', teacherSchema);
