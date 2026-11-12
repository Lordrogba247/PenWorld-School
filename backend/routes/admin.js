// ===== Admin bulk import routes =====
const express = require('express');
const { protect, roleCheck } = require('../middleware/auth');
const { processStudentRows, processStaffRows } = require('../utils/batchProcessor');

const router = express.Router();

// All admin routes require protection and admin role
router.use(protect);
router.use(roleCheck('admin'));

// ===== POST /api/admin/students/bulk =====
router.post('/students/bulk', async (req, res) => {
  try {
    const rows = req.body.rows;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rows provided. Expected an array of row objects.'
      });
    }

    // Max 500 rows per request
    const MAX_ROWS = 500;
    if (rows.length > MAX_ROWS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_ROWS} rows allowed per request. Received ${rows.length} rows.`
      });
    }

    const results = await processStudentRows(rows);
    const { imported, updated, failed, warnings, totalRows } = results;

    res.json({
      success: true,
      data: {
        imported,
        updated,
        failed,
        warnings,
        totalRows,
      },
      message: `Bulk import complete. ${imported} row(s) imported, ${updated} updated, ${failed} failed.`
    });
  } catch (err) {
    console.error('Bulk student import error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk import.'
    });
  }
});

// ===== POST /api/admin/staff/bulk =====
router.post('/staff/bulk', async (req, res) => {
  try {
    const rows = req.body.rows;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rows provided. Expected an array of row objects.'
      });
    }

    // Max 500 rows per request
    const MAX_ROWS = 500;
    if (rows.length > MAX_ROWS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_ROWS} rows allowed per request. Received ${rows.length} rows.`
      });
    }

    const results = await processStaffRows(rows);
    const { imported, updated, failed, warnings, totalRows } = results;

    res.json({
      success: true,
      data: {
        imported,
        updated,
        failed,
        warnings,
        totalRows,
      },
      message: `Bulk import complete. ${imported} row(s) imported, ${updated} updated, ${failed} failed.`
    });
  } catch (err) {
    console.error('Bulk staff import error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk import.'
    });
  }
});

module.exports = router;

