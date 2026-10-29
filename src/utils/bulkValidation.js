// ===== Bulk import validation (zod) =====
// One schema per record type. The field names are the same ones used in the
// template and the existing API (see BULK_FORMS in bulkParser.js), so error
// messages and highlighted cells match the column headers the admin sees.

import { z } from "zod";

// ---- Editable lists --------------------------------------------------------

// IMPORTANT: this list must match the class names used in the portal EXACTLY
// (spelling and arms, e.g. "Primary 1 Gaa-Akanbi" if your classes have arms).
// Matching ignores capital letters and extra spaces. A student whose class is
// not in this list is flagged as invalid.
export const CLASS_OPTIONS = [
  "Creche 1",
  "Creche 2",
  "Nursery 1",
  "Nursery 2",
  "Primary 1",
  "Primary 2",
  "Primary 3",
  "Primary 4",
  "Primary 5",
  "Primary 6",
  "JSS 1",
  "JSS 2",
  "JSS 3",
  "SSS 1",
  "SSS 2",
  "SSS 3",
];

export const ROLE_OPTIONS = [
  "Teacher",
  "Admin",
  "Accountant",
  "Librarian",
  "Security",
  "Other",
];

// What gets sent for "sex" after cleaning. Change the values on the right if
// the existing API expects something else (for example "M" / "F").
const SEX_VALUES = { male: "Male", female: "Female" };

// ---- Helpers ---------------------------------------------------------------

const PHONE_RE = /^0\d{10}$|^\+234\d{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeSpaces = (v) => v.trim().replace(/\s+/g, " ");
const lookupKey = (v) => normalizeSpaces(v).toLowerCase();

const CLASS_LOOKUP = new Map(CLASS_OPTIONS.map((c) => [lookupKey(c), c]));
const ROLE_LOOKUP = new Map(ROLE_OPTIONS.map((r) => [lookupKey(r), r]));
const SEX_LOOKUP = new Map([
  ["m", SEX_VALUES.male],
  ["male", SEX_VALUES.male],
  ["f", SEX_VALUES.female],
  ["female", SEX_VALUES.female],
]);

// Returns a plain-English problem with a date of birth, or "" if it is fine.
function dobProblem(value, minAge, maxAge) {
  if (value === "") return "dateOfBirth is required";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "dateOfBirth must be written as YYYY-MM-DD (for example 2014-05-21)";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return "dateOfBirth is not a real date";
  }

  const today = new Date();
  if (date > today) return "dateOfBirth cannot be in the future";

  let age = today.getFullYear() - year;
  const birthdayNotYet =
    today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day);
  if (birthdayNotYet) age -= 1;
  if (age < minAge || age > maxAge) {
    return `dateOfBirth gives an age of ${age}; it should be between ${minAge} and ${maxAge}`;
  }
  return "";
}

const requiredText = (name) =>
  z.string().trim().min(1, `${name} is required`).max(100, `${name} is too long`);

const nameText = (name) =>
  z
    .string()
    .trim()
    .max(100, `${name} is too long`)
    .superRefine((v, ctx) => {
      if (v === "") ctx.addIssue({ code: "custom", message: `${name} is required` });
      else if (v.length < 2) ctx.addIssue({ code: "custom", message: `${name} must be at least 2 characters` });
    });

// Optional, but at least 2 characters when something is typed.
const optionalName = (name) =>
  z
    .string()
    .trim()
    .max(100, `${name} is too long`)
    .refine((v) => v === "" || v.length >= 2, `${name} must be at least 2 characters`);

const sexField = z
  .string()
  .trim()
  .min(1, "sex is required")
  .refine((v) => v === "" || SEX_LOOKUP.has(lookupKey(v)), "sex must be Male or Female (M or F)");

const phoneField = (name) =>
  z
    .string()
    .trim()
    .min(1, `${name} is required`)
    .refine(
      (v) => v === "" || PHONE_RE.test(v),
      `${name} must look like 08031234567 or +2348031234567`
    );

// ---- Schemas ---------------------------------------------------------------

export const STUDENT_SCHEMA = z.object({
  studentId: requiredText("studentId"),
  surname: nameText("surname"),
  otherNames: optionalName("otherNames"),
  sex: sexField,
  studentClass: z
    .string()
    .trim()
    .min(1, "studentClass is required")
    .refine((v) => v === "" || CLASS_LOOKUP.has(lookupKey(v)), "studentClass is not a class in the list"),
  dateOfBirth: z.string().trim().superRefine((v, ctx) => {
    const problem = dobProblem(v, 2, 25);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  }),
  guardianName: requiredText("guardianName"),
  guardianPhone: phoneField("guardianPhone"),
  guardianEmail: z
    .string()
    .trim()
    .refine((v) => v === "" || EMAIL_RE.test(v), "guardianEmail is not a valid email address"),
  address: z.string().trim().max(300, "address is too long"),
});

export const STAFF_SCHEMA = z.object({
  staffId: requiredText("staffId"),
  surname: nameText("surname"),
  otherNames: optionalName("otherNames"),
  sex: sexField,
  role: z
    .string()
    .trim()
    .min(1, "role is required")
    .refine((v) => v === "" || ROLE_LOOKUP.has(lookupKey(v)), "role is not in the list"),
  email: z
    .string()
    .trim()
    .min(1, "email is required")
    .refine((v) => v === "" || EMAIL_RE.test(v), "email is not a valid email address"),
  phone: phoneField("phone"),
  subject: z.string().trim().max(100, "subject is too long"),
});

const SCHEMAS = { student: STUDENT_SCHEMA, staff: STAFF_SCHEMA };

// Fields that must not repeat inside one file.
const UNIQUE_FIELDS = { student: ["studentId"], staff: ["staffId", "email"] };

// ---- Clean up values that passed validation ---------------------------------

function normalizeRow(type, data) {
  const out = { ...data, sex: SEX_LOOKUP.get(lookupKey(data.sex)) };
  if (type === "student") out.studentClass = CLASS_LOOKUP.get(lookupKey(data.studentClass));
  if (type === "staff") out.role = ROLE_LOOKUP.get(lookupKey(data.role));
  return out;
}

// ---- Duplicate detection ----------------------------------------------------

function addDuplicateErrors(results, fields) {
  fields.forEach((field) => {
    const seen = new Map(); // value -> [row numbers]
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

// ---- Main function ----------------------------------------------------------

// rows: the rows from parseFile() (each has a rowNumber matching the spreadsheet).
// Returns:
//   results      every row, in order: { rowNumber, data, errors }  (for the preview table)
//   validRows    cleaned rows ready to send, each with its rowNumber
//   invalidRows  { rowNumber, data, errors } for rows with problems
//   summary      { total, valid, invalid }
export function validateRows(type, rows) {
  const schema = SCHEMAS[type];
  if (!schema) {
    return { results: [], validRows: [], invalidRows: [], summary: { total: 0, valid: 0, invalid: 0 } };
  }

  const results = rows.map((row, i) => {
    const rowNumber = row.rowNumber ?? i + 2;
    const parsed = schema.safeParse(row);
    const errors = parsed.success
      ? []
      : parsed.error.issues.map((issue) => ({
        field: String(issue.path[0] ?? ""),
        message: issue.message,
      }));
    return { rowNumber, data: row, errors, cleaned: parsed.success ? parsed.data : null };
  });

  addDuplicateErrors(results, UNIQUE_FIELDS[type]);

  const validRows = [];
  const invalidRows = [];
  results.forEach((r) => {
    if (r.errors.length === 0 && r.cleaned) {
      validRows.push({ ...normalizeRow(type, r.cleaned), rowNumber: r.rowNumber });
    } else {
      invalidRows.push({ rowNumber: r.rowNumber, data: r.data, errors: r.errors });
    }
  });

  return {
    results: results.map(({ rowNumber, data, errors }) => ({ rowNumber, data, errors })),
    validRows,
    invalidRows,
    summary: { total: rows.length, valid: validRows.length, invalid: invalidRows.length },
  };
}