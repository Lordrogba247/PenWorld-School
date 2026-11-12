// ===== User Model =====
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Unique registration ID (e.g., HCS/2026/0001, STF/2026/5678)
  studentId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  staffId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },

  // Personal info
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  sex: {
    type: String,
    enum: ['M', 'F'],
    required: true,
  },
  dateOfBirth: {
    type: Date,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },

  // Guardian info (for students)
  guardianName: {
    type: String,
    trim: true,
  },
  guardianPhone: {
    type: String,
    trim: true,
  },
  guardianEmail: {
    type: String,
    trim: true,
  },

  // Roles & access
  role: {
    type: String,
    enum: ['student', 'admin', 'teacher'],
    default: 'student',
  },

  // Auth
  password: {
    type: String,
    required: function () {
      return this.role === 'admin' || this.role === 'teacher';
    },
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
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
