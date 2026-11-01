// ===== Bulk import validation =====
// Backend accepts everything; preview table only flags required fields,
// hard duplicates, and structural problems. All other fields are accepted
// as-is; problems become WARNINGS, never errors.

export const CLASS_OPTIONS = [
  "Creche 1", "Creche 2", "Nursery 1", "Nursery 2",
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3",
];

export const ROLE_OPTIONS = [
  "Teacher", "Admin", "Accountant", "Librarian", "Security", "Other",
];

const normalizeSpaces = (v) => v.trim().replace(/\s+/g, " ");
const lookupKey = (v) => normalizeSpaces(v).toLowerCase();

const SEX_LOOKUP = new Map([
  ["m", "M"], ["male", "M"],
  ["f", "F"], ["female", "F"],
]);

const CLASS_LOOKUP = new Map(CLASS_OPTIONS.map((c) => [lookupKey(c), c]));

// ---- Per-row validation -----------------------------------------------------

// Validate a single student row. Returns { errors, warnings, data }.
function validateStudentRow(row, meta) {
  const errors = [];
  const warnings = [];
  const data = { ...row };

  if (!data.studentId || String(data.studentId).trim().length === 0) {
    errors.push({ field: "studentId", message: "studentId is required" });
  }
  if (!data.surname || String(data.surname).trim().length === 0) {
    errors.push({ field: "surname", message: "surname is required" });
  }
  if (data.otherNames !== undefined && data.otherNames !== "" &&
      String(data.otherNames).trim().length > 0 &&
      String(data.otherNames).trim().length < 2) {
    warnings.push({ field: "otherNames", message: "otherNames must be at least 2 characters" });
  }

  if (data.sex !== undefined && data.sex !== "") {
    const key = lookupKey(data.sex);
    if (SEX_LOOKUP.has(key)) data.sex = SEX_LOOKUP.get(key);
    else { warnings.push({ field: "sex", message: "Invalid sex; stored as M" }); data.sex = "M"; }
  } else data.sex = "M";
if (data.studentClass !== undefined && data.studentClass !== "") {
    const key = lookupKey(data.studentClass);
    const classes = meta?.classes || meta?.classOptions || [];
    const match = classes.find(c => c?.value !== undefined && lookupKey(c.value) === key);
    if (match) data.studentClass = match.value;
    else warnings.push({ field: "studentClass", message: "Class not recognised; stored as-is" });
  }

  if (data.dateOfBirth !== undefined && data.dateOfBirth !== "") {
    const text = String(data.dateOfBirth).trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) { warnings.push({ field: "dateOfBirth", message: "Invalid date; stored as null" }); data.dateOfBirth = null; }
    else {
      const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        warnings.push({ field: "dateOfBirth", message: "Not a real date; stored as null" });
        data.dateOfBirth = null;
      } else data.dateOfBirth = text;
    }
  }

  if (data.guardianPhone !== undefined) data.guardianPhone = String(data.guardianPhone).trim();
  if (data.guardianEmail !== undefined) data.guardianEmail = String(data.guardianEmail).trim().toLowerCase();
  if (data.address !== undefined) data.address = String(data.address).trim();

  return { errors, warnings, data };
}
// Validate a single staff row.
function validateStaffRow(row, meta) {
  const errors = [];
  const warnings = [];
  const data = { ...row };

  if (!data.staffId || String(data.staffId).trim().length === 0) {
    errors.push({ field: "staffId", message: "staffId is required" });
  }
  if (!data.surname || String(data.surname).trim().length === 0) {
    errors.push({ field: "surname", message: "surname is required" });
  }
  if (data.otherNames !== undefined && data.otherNames !== "" &&
      String(data.otherNames).trim().length > 0 &&
      String(data.otherNames).trim().length < 2) {
    warnings.push({ field: "otherNames", message: "otherNames must be at least 2 characters" });
  }

  if (data.sex !== undefined && data.sex !== "") {
    const key = lookupKey(data.sex);
    if (SEX_LOOKUP.has(key)) data.sex = SEX_LOOKUP.get(key);
    else { warnings.push({ field: "sex", message: "Invalid sex; stored as M" }); data.sex = "M"; }
  } else data.sex = "M";

  if (data.role !== undefined && data.role !== "") {
    const key = lookupKey(data.role);
    const roleList = meta?.roles || [];
    const match = roleList.find(r => String(r).trim().toLowerCase() === key);
    if (match) data.role = String(match).trim();
    else warnings.push({ field: "role", message: "Role not recognised; stored as-is" });
  }

  if (data.email !== undefined) data.email = String(data.email).trim().toLowerCase();
  if (data.phone !== undefined) data.phone = String(data.phone).trim();
  if (data.subject !== undefined) data.subject = String(data.subject).trim();

  return { errors, warnings, data };
}

// Fields that must not repeat inside one file. A duplicate is a hard failure.
const UNIQUE_FIELDS = {
  student: ["studentId"],
  staff: ["staffId"],
};

function addDuplicateErrors(results, fields) {
  fields.forEach((field) => {
    const seen = new Map(); // value -> [rowNumbers]
    results.forEach((r) => {
      const value = String(r.data[field] ?? "").trim().toLowerCase();
      if (!value) return;
      if (!seen.has(value)) seen.set(value, []);
      seen.get(value).push(r.rowNumber);
    });

    results.forEach((r) => {
      const value = String(r.data[field] ?? "").trim().toLowerCase();
      const rowsWithValue = value ? seen.get(value) : null;
      if (!rowsWithValue || rowsWithValue.length < 2) return;
      const others = rowsWithValue.filter((n) => n !== r.rowNumber);
      r.errors.push({
        field,
        message: `Duplicate ${field} (also in row${others.length > 1 ? "s" : ""} ${others.join(", ")})`,
      });
    });
  });
}

// ---- Main -------------------------------------------------------------------

// rows: rows from parseFile() (each has a rowNumber matching the spreadsheet).
// meta: optional meta object from useMeta() (provides classes / roles lists).
// Returns:
//   results      every row, in order: { rowNumber, data, errors, warnings }
//   validRows    rows with NO hard errors, ready to send
//   invalidRows  rows with hard errors (required missing, duplicates)
//   warnings     flat array of { field, message } from all rows
//   summary      { total, valid, invalid }
export function validateRows(type, rows, meta) {
  const isStudent = type === "student";
  const validator = isStudent ? validateStudentRow : validateStaffRow;
  const uniqueFields = UNIQUE_FIELDS[type];

  const results = rows.map((row, i) => {
    const rowNumber = row.rowNumber ?? i + 2;
    const { errors, warnings, data } = validator(row, meta);
    return { rowNumber, data, errors, warnings, cleaned: errors.length === 0 ? data : null };
  });

  addDuplicateErrors(results, uniqueFields);

  const validRows = results
    .filter((r) => r.errors.length === 0)
    .map((r) => ({ ...r.cleaned, rowNumber: r.rowNumber }));

  const invalidRows = results.filter((r) => r.errors.length > 0);
  const allWarnings = results.flatMap((r) => r.warnings);

  return {
    results: results.map(({ rowNumber, data, errors }) => ({ rowNumber, data, errors })),
    validRows,
    invalidRows,
    warnings: allWarnings,
    summary: { total: rows.length, valid: validRows.length, invalid: invalidRows.length },
  };
}