// ===== Batch processing =====
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { buildClassCatalog } = require('../utils/batchProcessor');
const { validateStudentRow, validateStaffRow } = require('./validation');

const DEFAULT_PASSWORD = 'bulkimport';
const ACADEMIC_SESSION = '2026/2027';

// Drop undefined / null / empty values so missing optional columns
// never overwrite existing data or create empty strings.
function clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
}

/**
 * Process student rows
 */
async function processStudentRows(rows) {
  const imported = [];
  const updated = [];
  const failed = [];
  const warnings = [];

  const { classMap, fallbackClass } = await buildClassCatalog();

  // Hash once instead of once per row (much faster for big files).
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = row.rowNumber || i + 1;
    const { valid, errors, data } = validateStudentRow(row, rowNumber);

    if (!valid) {
      failed.push({
        rowNumber,
        reason: errors.join('; '),
      });
      continue;
    }

    // Resolve the class (fall back to the first active class if not found).
    const className = String(data.studentClass || '').trim();
    let classDoc = classMap.get(className.toUpperCase());

    if (!classDoc) {
      if (!fallbackClass) {
        failed.push({
          rowNumber,
          reason: `Class "${className}" not found and no active class is available`,
        });
        continue;
      }
      classDoc = fallbackClass;
      warnings.push({
        rowNumber,
        reason: `Class "${className}" not recognised - assigned to first active class`,
      });
    }

    const fullName = `${data.surname} ${data.otherNames}`.trim();

    let existingStudent;
    try {
      existingStudent = await User.findOne({
        studentId: data.studentId,
        role: 'student',
      });
    } catch (err) {
      failed.push({
        rowNumber,
        reason: `Failed to look up student: ${err.message}`,
      });
      continue;
    }

    if (existingStudent) {
      // ---- Update existing student ----
      try {
        await User.findByIdAndUpdate(
          existingStudent._id,
          clean({
            firstName: data.surname,
            lastName: data.otherNames,
            sex: data.sex,
            email: data.guardianEmail,
            phone: data.guardianPhone,
            guardianName: data.guardianName,
            guardianPhone: data.guardianPhone,
            guardianEmail: data.guardianEmail,
          })
        );

        await Student.findOneAndUpdate(
          { user: existingStudent._id },
          {
            class: classDoc._id,
            academicSession: ACADEMIC_SESSION,
            updatedAt: new Date(),
          }
        );

        updated.push({
          _id: existingStudent._id,
          studentId: data.studentId,
          name: fullName,
        });
      } catch (err) {
        failed.push({
          rowNumber,
          reason: `Failed to update: ${err.message}`,
        });
      }
    } else {
      // ---- Create new student ----
      let savedUser = null;
      try {
        const userData = clean({
          firstName: data.surname,
          lastName: data.otherNames,
          sex: data.sex,
          studentId: data.studentId,
          role: 'student',
          email: data.guardianEmail,
          phone: data.guardianPhone,
          guardianName: data.guardianName,
          guardianPhone: data.guardianPhone,
          guardianEmail: data.guardianEmail,
          password: passwordHash,
        });

        savedUser = await new User(userData).save();

        await new Student({
          user: savedUser._id,
          studentId: data.studentId,
          class: classDoc._id,
          academicSession: ACADEMIC_SESSION,
        }).save();

        imported.push({
          _id: savedUser._id,
          studentId: data.studentId,
          name: fullName,
        });
      } catch (err) {
        // Avoid leaving a User behind without its Student profile.
        if (savedUser) {
          await User.findByIdAndDelete(savedUser._id).catch(() => { });
        }
        failed.push({
          rowNumber,
          reason: `Failed to import: ${err.message}`,
        });
      }
    }
  }

  return {
    imported: imported.length,
    updated: updated.length,
    failed,
    warnings,
    totalRows: rows.length,
  };
}

/**
 * Process staff rows
 */
async function processStaffRows(rows) {
  const imported = [];
  const updated = [];
  const failed = [];
  const warnings = [];

  const { classMap, fallbackClass } = await buildClassCatalog();

  // Hash once instead of once per row.
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = row.rowNumber || i + 1;
    const { valid, errors, data } = validateStaffRow(row, rowNumber);

    if (!valid) {
      failed.push({
        rowNumber,
        reason: errors.join('; '),
      });
      continue;
    }

    const rawRole = String(data.role || '').trim();
    const roleLower = rawRole.toLowerCase();
    let userRole;
    let department;
    let classId = null;

    if (roleLower === 'teacher') {
      userRole = 'teacher';
      department = 'General';
    } else if (roleLower === 'admin') {
      userRole = 'admin';
      department = null;
    } else if (roleLower.startsWith('class teacher')) {
      const className = rawRole.replace(/^class teacher\s+/i, '').trim();
      userRole = 'teacher';

      if (classMap.has(className.toUpperCase())) {
        department = `Class Teacher - ${className}`;
        classId = classMap.get(className.toUpperCase())._id;
      } else {
        department = 'General';
        if (fallbackClass) {
          classId = fallbackClass._id;
          warnings.push({
            rowNumber,
            reason: `Role class "${className}" not found - assigned to first active class`,
          });
        } else {
          warnings.push({
            rowNumber,
            reason: `Role class "${className}" not found - assigned as General teacher`,
          });
        }
      }
    } else {
      // Unknown role (e.g. Bursar, Librarian, Principal) -> treated as a Teacher.
      userRole = 'teacher';
      department = 'General';
      warnings.push({
        rowNumber,
        reason: `Role "${rawRole}" not recognised - assigned to Teacher`,
      });
    }

    const fullName = `${data.surname} ${data.otherNames}`.trim();

    let existingStaffUser;
    try {
      existingStaffUser = await User.findOne({
        staffId: data.staffId,
        role: { $in: ['teacher', 'admin'] },
      });
    } catch (err) {
      failed.push({
        rowNumber,
        reason: `Failed to look up staff: ${err.message}`,
      });
      continue;
    }

    if (existingStaffUser) {
      // ---- Update existing staff ----
      try {
        await User.findByIdAndUpdate(
          existingStaffUser._id,
          clean({
            firstName: data.surname,
            lastName: data.otherNames,
            sex: data.sex,
            email: data.email,
            phone: data.phone,
          })
        );

        // Admins have no Teacher profile, so this simply matches nothing for them.
        await Teacher.findOneAndUpdate(
          { user: existingStaffUser._id },
          {
            department,
            classes: userRole === 'teacher' && classId ? [classId] : [],
            subjects: data.subject ? [data.subject] : [],
            updatedAt: new Date(),
          }
        );

        updated.push({
          _id: existingStaffUser._id,
          staffId: data.staffId,
          name: fullName,
        });
      } catch (err) {
        failed.push({
          rowNumber,
          reason: `Failed to update: ${err.message}`,
        });
      }
    } else {
      // ---- Create new staff ----
      let savedUser = null;
      try {
        const userData = clean({
          firstName: data.surname,
          lastName: data.otherNames,
          sex: data.sex,
          staffId: data.staffId,
          role: userRole,
          email: data.email,
          phone: data.phone,
          password: passwordHash,
        });

        savedUser = await new User(userData).save();

        // Admins don't need a Teacher profile.
        if (userRole !== 'admin') {
          await new Teacher({
            user: savedUser._id,
            staffId: data.staffId,
            role: userRole,
            department,
            classes: classId ? [classId] : [],
            subjects: data.subject ? [data.subject] : [],
          }).save();
        }

        imported.push({
          _id: savedUser._id,
          staffId: data.staffId,
          name: fullName,
        });
      } catch (err) {
        // Avoid leaving a User behind without its Teacher profile.
        if (savedUser) {
          await User.findByIdAndDelete(savedUser._id).catch(() => { });
        }
        failed.push({
          rowNumber,
          reason: `Failed to import: ${err.message}`,
        });
      }
    }
  }

  return {
    imported: imported.length,
    updated: updated.length,
    failed,
    warnings,
    totalRows: rows.length,
  };
}

module.exports = { processStudentRows, processStaffRows };