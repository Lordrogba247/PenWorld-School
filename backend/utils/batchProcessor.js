// ===== Batch processing =====
const bcrypt = require('bcryptjs');

const { buildClassCatalog } = require('../utils/batchProcessor');
const { validateStudentRow, validateStaffRow } = require('./validation');

/**
 * Process student rows
 */
async function processStudentRows(rows) {
  const imported = [];
  const updated = [];
  const failed = [];
  const warnings = [];
  let successCount = 0;
  let failCount = 0;

  const { classMap, activeClasses, fallbackClass } = await buildClassCatalog();

  const User = require('../models/User');
  const existingStudents = await User.find({
    role: 'student',
    studentId: { $exists: true, $ne: null }
  }).select('studentId');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = row.rowNumber || i + 1;
    const { valid, errors, data } = validateStudentRow(row, rowNumber);

    if (!valid) {
      failCount++;
      failed.push({
        rowNumber,
        reason: errors.join('; ')
      });
      continue;
    }

    const existingStudent = await User.findOne({
      studentId: data.studentId,
      role: 'student'
    });

    if (existingStudent) {
      try {
        await User.findByIdAndUpdate(existingStudent._id, {
          firstName: data.surname,
          lastName: data.otherNames,
          sex: data.sex,
          email: data.guardianEmail || '',
          phone: data.guardianPhone || '',
          guardianName: data.guardianName,
          guardianPhone: data.guardianPhone,
          guardianEmail: data.guardianEmail,
        });

        const Student = require('../models/Student');
        await Student.findOneAndUpdate(
          { user: existingStudent._id },
          {
            class: classMap.get(data.studentClass.toUpperCase())._id,

/**
 * Process staff rows
 */
async function processStaffRows(rows) {
  const imported = [];
  const updated = [];
  const failed = [];
  const warnings = [];
  let successCount = 0;
  let failCount = 0;

  const { classMap, activeClasses, fallbackClass } = await buildClassCatalog();

  const User = require('../models/User');
  const existingStaff = await User.find({
    role: { $in: ['teacher', 'admin'] },
    staffId: { $exists: true, $ne: null }
  }).select('staffId');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = row.rowNumber || i + 1;
    const { valid, errors, data } = validateStaffRow(row, rowNumber);

    if (!valid) {
      failCount++;
      failed.push({
        rowNumber,
        reason: errors.join('; ')
      });
      continue;
    }

    const roleLower = data.role.toLowerCase();
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
      const className = data.role.replace(/^class teacher\s+/i, '').trim();
      if (classMap.has(className.toUpperCase())) {
        userRole = 'teacher';
        department = `Class Teacher - ${className}`;
        classId = classMap.get(className.toUpperCase())._id;
      } else {
        userRole = 'teacher';
        department = 'General';
        if (fallbackClass) {
          warnings.push({
            rowNumber,
            reason: `Role class "${className}" not found - assigned to first active class`
          });
        }
      }
    } else {
      userRole = 'teacher';
      department = 'General';
    }

    const existingStaffUser = await User.findOne({
      staffId: data.staffId,
      role: { $in: ['teacher', 'admin'] }
    });

    if (existingStaffUser) {
      try {
        await User.findByIdAndUpdate(existingStaffUser._id, {
          firstName: data.surname,
          lastName: data.otherNames,
          sex: data.sex,
          email: data.email,
          phone: data.phone,
        });

        const Teacher = require('../models/Teacher');
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
          name: existingStaffUser.fullName,
        });

        successCount++;
      } catch (err) {
        failCount++;
        failed.push({
          rowNumber,
          reason: `Failed to update: ${err.message}`
        });
      }
    } else {
      try {
        const userData = {
          firstName: data.surname,
          lastName: data.otherNames,
          sex: data.sex,
          staffId: data.staffId,
          role: userRole,
          email: data.email,
          phone: data.phone,
        };

        const defaultPassword = 'bulkimport';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        userData.password = hashedPassword;

        const newUser = new require('../models/User')(userData);
        const savedUser = await newUser.save();

        if (userRole === 'admin') {
          // Admin - no Teacher profile needed
        } else {
          const Teacher = require('../models/Teacher');
          const teacherData = {
            user: savedUser._id,
            staffId: data.staffId,
            role: userRole,
            department,
            classes: userRole === 'teacher' && classId ? [classId] : [],
            subjects: data.subject ? [data.subject] : [],
          };

          const newTeacher = new Teacher(teacherData);
          await newTeacher.save();
        }

        successCount++;
        imported.push({
          _id: savedUser._id,
          staffId: data.staffId,
          name: `${savedUser.firstName} ${savedUser.lastName}`,
        });
      } catch (err) {
        failCount++;
        failed.push({
          rowNumber,
          reason: `Failed to import: ${err.message}`
        });
      }
    }
  }

  return {
    imported: imported.length,
    updated: updated.length,
    failed: failed,
    warnings,
    totalRows: rows.length,
  };
}

module.exports = { processStudentRows, processStaffRows };

            academicSession: '2026/2027',
            updatedAt: new Date(),
          }
        );

        updated.push({
          _id: existingStudent._id,
          studentId: data.studentId,
          name: existingStudent.fullName,
        });

        successCount++;
      } catch (err) {
        failCount++;
        failed.push({
          rowNumber,
          reason: `Failed to update: ${err.message}`
        });
      }
    } else {
      try {
        const userData = {
          firstName: data.surname,
          lastName: data.otherNames,
          sex: data.sex,
          studentId: data.studentId,
          role: 'student',
          email: data.guardianEmail || '',
          phone: data.guardianPhone || '',
          guardianName: data.guardianName,
          guardianPhone: data.guardianPhone,
          guardianEmail: data.guardianEmail,
        };

        const defaultPassword = 'bulkimport';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        userData.password = hashedPassword;

        const newUser = new require('../models/User')(userData);
        const savedUser = await newUser.save();

        const Student = require('../models/Student');
        const studentData = {
          user: savedUser._id,
          studentId: data.studentId,
          class: classMap.get(data.studentClass.toUpperCase())._id,
          academicSession: '2026/2027',
        };

        const newStudent = new Student(studentData);
        await newStudent.save();

        successCount++;
        imported.push({
          _id: savedUser._id,
          studentId: data.studentId,
          name: `${savedUser.firstName} ${savedUser.lastName}`,
        });
      } catch (err) {
        failCount++;
        failed.push({
          rowNumber,
          reason: `Failed to import: ${err.message}`
        });
      }
    }
  }

  return {
    imported: imported.length,
    updated: updated.length,
    failed: failed,
    warnings,
    totalRows: rows.length,
  };
}