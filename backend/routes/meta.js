// ===== Meta routes (class, role, session info) =====
const express = require('express');
const { protect, roleCheck } = require('../middleware/auth');

const router = express.Router();

// All admin routes require protection and admin role
router.use(protect);
router.use(roleCheck('admin'));

// ===== GET /api/admin/meta =====
// Returns class options, roles, and active sessions for the admin portal.
router.get('/meta', async (req, res) => {
  try {
    const Class = require('../models/Class');

    const [classes, users] = await Promise.all([
      Class.find({ isActive: true }).select('name'),
      require('../models/User').find({
        role: { $in: ['student', 'teacher', 'admin'] }
      }).select('role'),
    ]);

    // Extract unique roles
    const roles = [...new Set(users.map(u => u.role))];

    // Build class options format expected by frontend
    const classOptions = classes.map(cls => ({
      value: cls.name,
      label: cls.name,
      id: cls._id,
      level: cls.level,
      section: cls.section,
      isActive: cls.isActive,
    }));

    res.json({
      success: true,
      data: {
        classes: classOptions,
        classOptions: classOptions,
        roles,
        // Sessions for dropdowns (use current academic year)
        sessions: [
          { name: '2025/2026', startYear: '2025', endYear: '2026', isCurrent: true },
          { name: '2026/2027', startYear: '2026', endYear: '2027', isCurrent: false },
        ],
        // For backward compatibility with some components
        classNames: classes.map(cls => cls.name),
      },
      message: 'Meta data loaded successfully.'
    });
  } catch (err) {
    console.error('Meta fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching meta data.'
    });
  }
});

module.exports = router;
