// ===== Bulk import parser (client-side) =====
// Reads CSV (PapaParse) and XLSX (SheetJS) files into plain-text row objects
// keyed by the template's column names. Every value is kept as text so
// leading zeros in phone numbers are not lost to numeric coercion.

import Papa from "papaparse";
import * as XLSX from "xlsx";

export const BULK_FORMS = {
  student: {
    label: "Students",
    description: "Import students (admission, guardian, class, ...)",
    headers: [
      "studentId",
      "surname",
      "otherNames",
      "sex",
      "studentClass",
      "dateOfBirth",
      "guardianName",
      "guardianPhone",
      "guardianEmail",
      "address",
    ],
    required: ["studentId", "surname", "sex", "studentClass"],
    download: "bulk_students_template.csv",
  },
  staff: {
    label: "Staff",
    description: "Import staff (name, role, contact, subject, ...)",
    headers: ["staffId", "surname", "otherNames", "sex", "role", "email", "phone", "subject"],
    required: ["staffId", "surname", "sex", "role"],
    download: "bulk_staff_template.csv",
  },
};

const PREVIEW_ROWS = 10;

// Every cell becomes trimmed text.
function toText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

// "Student ID", "student_id" and "studentId" all match the same column.
function headerKey(raw) {
  return toText(raw).toLowerCase().replace(/[\s_]/g, "");
}

export function downloadTemplate(formType) {
  const form = BULK_FORMS[formType];
  if (!form) return;
  const csv = form.headers.join(",");
  const blob = new Blob(["\uFEFF" + csv + "\r\n"], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = form.download;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Both readers return an array of rows, each row an array of cell values.
async function readCsv(file) {
  const text = await file.text();
  const result = Papa.parse(text, { skipEmptyLines: "greedy" });
  return result.data;
}

async function readXlsx(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  // raw:true keeps text cells as text and gives real Date objects for date
  // cells; toText() turns those into YYYY-MM-DD.
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: false,
  });
}

// Returns { ok, error?, fileType?, headers?, rows?, totalRows?, preview?, warnings? }
export async function parseFile(file, formType) {
  const form = BULK_FORMS[formType];
  if (!form) return { ok: false, error: "Unknown record type." };

  const name = (file.name || "").toLowerCase();
  let fileType;
  let table;

  try {
    if (name.endsWith(".csv")) {
      fileType = "csv";
      table = await readCsv(file);
    } else if (name.endsWith(".xlsx")) {
      fileType = "xlsx";
      table = await readXlsx(file);
    } else {
      return { ok: false, error: "Unsupported file type. Please upload a .csv or .xlsx file." };
    }
  } catch {
    return {
      ok: false,
      error: "This file could not be read. It may be damaged or password-protected.",
    };
  }

  table = table.filter((cells) => cells.some((c) => toText(c) !== ""));

  if (table.length === 0) {
    return { ok: false, error: "The file is empty (no rows found)." };
  }
  if (table.length === 1) {
    return { ok: false, error: "The file has a header row but no data rows below it." };
  }

  // Match the file's columns to the template's column names.
  const keyToCanonical = {};
  form.headers.forEach((h) => {
    keyToCanonical[headerKey(h)] = h;
  });

  const columnIndex = {};
  const unknownColumns = [];
  table[0].forEach((rawHeader, i) => {
    const canonical = keyToCanonical[headerKey(rawHeader)];
    if (canonical) {
      if (!(canonical in columnIndex)) columnIndex[canonical] = i;
    } else if (toText(rawHeader) !== "") {
      unknownColumns.push(toText(rawHeader));
    }
  });

  const missingRequired = form.required.filter((h) => !(h in columnIndex));
  if (missingRequired.length > 0) {
    return {
      ok: false,
      error: `Missing required column(s): ${missingRequired
        .map((h) => '"' + h + '"')
        .join(", ")}. Please use the "Download Template" file to get the correct headers.`,
    };
  }

  const warnings = [];
  const missingOptional = form.headers.filter((h) => !(h in columnIndex));
  if (missingOptional.length > 0) {
    warnings.push(`Optional column(s) not found and left blank: ${missingOptional.join(", ")}.`);
  }
  if (unknownColumns.length > 0) {
    warnings.push(`Ignored column(s) that are not in the template: ${unknownColumns.join(", ")}.`);
  }

  const rows = table.slice(1).map((cells) => {
    const row = {};
    form.headers.forEach((h) => {
      row[h] = h in columnIndex ? toText(cells[columnIndex[h]]) : "";
    });
    return row;
  });

  return {
    ok: true,
    fileType,
    headers: form.headers,
    totalRows: rows.length,
    rows,
    preview: rows.slice(0, PREVIEW_ROWS),
    warnings,
  };
}