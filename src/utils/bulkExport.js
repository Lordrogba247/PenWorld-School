// ===== Bulk export utility =====
// Builds a CSV or Excel file from rows and triggers a browser download.
// All column names match the Import template (BULK_FORMS in bulkParser.js)
// so an exported file can be edited and re-uploaded through the Import tab.
import Papa from "papaparse";
import * as XLSX from "xlsx";

// Characters that can start a spreadsheet formula. Prefixing with a single
// quote neutralises them so Excel / LibreOffice treat the cell as plain text.
const FORMULA_PREFIXES = ["=", "+", "-", "@"];

function sanitizeCell(value) {
  const text = value == null ? "" : String(value);
  if (FORMULA_PREFIXES.some((p) => text.startsWith(p))) {
    return "'" + text;
  }
  return text;
}

function buildFileName(type, format) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const ext = format === "xlsx" ? "xlsx" : "csv";
  return `${type}s-${yyyy}-${mm}-${dd}.${ext}`;
}

function prepareColumns(type) {
  const importHeaders = {
    student: [
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
    staff: [
      "staffId",
      "surname",
      "otherNames",
      "sex",
      "role",
      "email",
      "phone",
      "subject",
    ],
  };
  return importHeaders[type] || [];
}

// Map raw API record fields to import-template column names.
// The existing list API returns a combined "name" and single-letter "sex",
// so we normalise them to the import-template shape.
function normalizeRecord(type, record) {
  const out = {};
  const columns = prepareColumns(type);

  // Direct field copies.
  if (type === "student") {
    out.studentId = record.studentId || record.id || "";
    out.studentClass = record.studentClass || record.class || "";
    out.sex = record.sex === "M" ? "Male" : record.sex === "F" ? "Female" : record.sex || "";
    out.dateOfBirth = record.dateOfBirth || "";
    out.guardianName = record.guardianName || "";
    out.guardianPhone = record.guardianPhone || record.phone || "";
    out.guardianEmail = record.guardianEmail || record.email || "";
    out.address = record.address || "";
    // Split combined "name" into surname / otherNames.
    const nameParts = (record.name || "").trim().split(/\s+/);
    out.surname = nameParts[0] || "";
    out.otherNames = nameParts.slice(1).join(" ") || "";
  } else {
    // staff
    out.staffId = record.staffId || record.id || "";
    out.role = record.role || "";
    out.sex = record.sex === "M" ? "Male" : record.sex === "F" ? "Female" : record.sex || "";
    out.email = record.email || "";
    out.phone = record.phone || "";
    out.subject = record.subject || "";
    const nameParts = (record.name || "").trim().split(/\s+/);
    out.surname = nameParts[0] || "";
    out.otherNames = nameParts.slice(1).join(" ") || "";
  }

  // Keep only the requested columns, sanitised for formula injection.
  const row = {};
  columns.forEach((col) => {
    row[col] = sanitizeCell(out[col] ?? "");
  });
  return row;
}

export function exportRows(type, rows, columns, format) {
  if (!columns || columns.length === 0) return;

  const data = rows.map((r) => normalizeRecord(type, r, columns));
  const fileName = buildFileName(type, format);

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    // Write every cell as a string so phone numbers keep leading zeros.
    const wsData = [columns, ...data.map((r) => columns.map((c) => String(r[c] ?? "")))];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Force text format on all cells so Excel does not strip leading zeros.
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cellRef]) {
          ws[cellRef].t = "s";
        }
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", cellText: true });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    downloadBlob(blob, fileName);
  } else {
    // CSV with UTF-8 BOM so Excel reads special characters correctly.
    const csv = Papa.unparse(data, { columns, quotes: true, quoteChar: '"' });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, fileName);
  }
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { prepareColumns };
