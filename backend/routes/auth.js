// ===== Auth routes (public) =====
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect, roleCheck } = require('../middleware/auth');

const router = express.Router();

const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'penworld-secret-key-change-in-production';

// ===== POST /api/auth/login =====
// Admin login
router.post('/login', async (req, res) => {
  try {
    const { staffId, password } = req.body;

    if (!staffId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide staffId and password.'
      });
    }

    // Find user by staffId
    const user = await User.findOne({ staffId });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        staffId: user.staffId,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Get user data without password
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: userResponse.fullName,
          role: user.role,
          staffId: user.staffId,
        }
      },
      message: 'Login successful.'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
});

// ===== POST /api/auth/logout =====
router.post('/logout', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

module.exports = router;
