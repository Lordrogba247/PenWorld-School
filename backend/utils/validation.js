// ===== Validation utilities =====
const bcrypt = require('bcryptjs');

/**
 * Validate student row
 * Returns { valid, errors, data }
 */
function validateStudentRow(row, rowNumber) {
  const data = { ...row };
  const errors = [];

  // studentId (required)
  if (!data.studentId || String(data.studentId).trim().length === 0) {
    errors.push(`Row ${rowNumber}: studentId is required`);
  } else {
    data.studentId = String(data.studentId).trim().toUpperCase();
  }

  // surname (required)
  if (!data.surname || String(data.surname).trim().length === 0) {
    errors.push(`Row ${rowNumber}: surname is required`);
  } else {
    data.surname = String(data.surname).trim();
  }

  // otherNames (required)
  if (data.otherNames !== undefined && data.otherNames !== '' &&
      String(data.otherNames).trim().length > 0) {
    if (String(data.otherNames).trim().length < 2) {
      errors.push(`Row ${rowNumber}: otherNames must be at least 2 characters`);
    }
  } else {
    data.otherNames = '';
  }
  data.otherNames = String(data.otherNames).trim();

  // sex (required, M/F)
  const sexMap = new Map([['m', 'M'], ['male', 'M'], ['f', 'F'], ['female', 'F']]);
  const sexKey = String(data.sex || '').trim().toLowerCase();
  if (!sexMap.has(sexKey)) {
    errors.push(`Row ${rowNumber}: Invalid sex. Must be M, F, Male, or Female`);
    data.sex = 'M';
  } else {
    data.sex = sexMap.get(sexKey);
  }

  // guardian fields (optional)
  if (data.guardianName !== undefined && data.guardianName !== '') {
    data.guardianName = String(data.guardianName).trim();
  } else {
    data.guardianName = '';
  }

  if (data.guardianPhone !== undefined && data.guardianPhone !== '') {
    const phone = String(data.guardianPhone).trim();
    if (!/^\d{10,14}$/.test(phone)) {
      errors.push(`Row ${rowNumber}: guardianPhone must be 10-14 digits`);
    }
    data.guardianPhone = phone;
  } else {
    data.guardianPhone = '';
  }

  if (data.guardianEmail !== undefined && data.guardianEmail !== '') {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(String(data.guardianEmail).trim())) {
      errors.push(`Row ${rowNumber}: Invalid guardianEmail format`);
    }
    data.guardianEmail = String(data.guardianEmail).trim();
  } else {
    data.guardianEmail = '';
  }

  return { valid: errors.length === 0, errors, data };
}

/**
 * Validate staff row
 * Returns { valid, errors, data }
 */
function validateStaffRow(row, rowNumber) {
  const data = { ...row };
  const errors = [];

  // staffId (required)
  if (!data.staffId || String(data.staffId).trim().length === 0) {
    errors.push(`Row ${rowNumber}: staffId is required`);
  } else {
    data.staffId = String(data.staffId).trim().toUpperCase();
  }

  // surname (required)
  if (!data.surname || String(data.surname).trim().length === 0) {
    errors.push(`Row ${rowNumber}: surname is required`);
  } else {
    data.surname = String(data.surname).trim();
  }

  // otherNames (required)
  if (data.otherNames !== undefined && data.otherNames !== '' &&
      String(data.otherNames).trim().length > 0) {
    if (String(data.otherNames).trim().length < 2) {
      errors.push(`Row ${rowNumber}: otherNames must be at least 2 characters`);
    }
  } else {
    data.otherNames = '';
  }
  data.otherNames = String(data.otherNames).trim();

  // sex (required, M/F)
  const sexMap = new Map([['m', 'M'], ['male', 'M'], ['f', 'F'], ['female', 'F']]);
  const sexKey = String(data.sex || '').trim().toLowerCase();
  if (!sexMap.has(sexKey)) {
    errors.push(`Row ${rowNumber}: Invalid sex. Must be M, F, Male, or Female`);
    data.sex = 'M';
  } else {
    data.sex = sexMap.get(sexKey);
  }

  // role (required)
  if (data.role !== undefined && data.role !== '') {
    const role = String(data.role).trim();
    if (!['teacher', 'admin', 'Class Teacher'].some(r =>
        role.toLowerCase().startsWith(r.toLowerCase()))) {
      errors.push(`Row ${rowNumber}: Invalid role. Must be teacher, admin, or Class Teacher <ClassName>`);
    }
  } else {
    errors.push(`Row ${rowNumber}: role is required`);
  }

  // email (optional)
  if (data.email !== undefined && data.email !== '') {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(String(data.email).trim())) {
      errors.push(`Row ${rowNumber}: Invalid email format`);
    }
    data.email = String(data.email).trim().toLowerCase();
  } else {
    data.email = '';
  }

  // phone (optional, 10-14 digits)
  if (data.phone !== undefined && data.phone !== '') {
    const phone = String(data.phone).trim();
    if (!/^\d{10,14}$/.test(phone)) {
      errors.push(`Row ${rowNumber}: phone must be 10-14 digits`);
    }
    data.phone = phone;
  } else {
    data.phone = '';
  }

  return { valid: errors.length === 0, errors, data };
}

module.exports = { validateStudentRow, validateStaffRow };
