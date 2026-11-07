// ===== Bulk import API =====
// Single entry point for the whole app: importBatch(type, rows) -> Promise.
// Set USE_MOCK = false to switch to the real backend (change one word).
import api from "../api";
import axios from "axios";

// When true, the mock below runs instead of the real axios call.
// Both paths return exactly the same shape: { imported, updated, warnings: [{ rowNumber, reason }] }
export const USE_MOCK = true;

// Endpoints mirror the existing admin URL style (/api/admin/students, /api/admin/staff).
const ENDPOINT = {
  student: "/api/admin/students/bulk",
  staff: "/api/admin/staff/bulk",
};

// Unique key per type, matching the field names the existing API / templates use.
const KEY_FIELD = {
  student: "studentId",
  staff: "staffId",
};

// Mock warning reason per type so the warning flow can be tested.
const WARN_REASON = {
  student: 'Class not recognised — assigned to first active class',
  staff: 'Role not recognised — assigned to Teacher',
};

// In-memory "database" used only by the mock, pre-filled with a few existing records.
const EXISTING_KEYS = {
  student: new Set(["PW/2026/001", "PW/2026/002", "PW/2026/003"]),
  staff: new Set(["STF-2026-010", "STF-2026-011"]),
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Every 25th row (by rowNumber) gets a warning in the mock so the warning flow can be tested.
function shouldMockWarn(rowNumber) {
  return rowNumber % 25 === 0;
}

// Response shape: { imported: number, updated: number, warnings: [{ rowNumber, reason }] }
export async function importBatch(type, rows, file = null) {
  // Add rowNumber to every row so the backend can identify rows with warnings.
  const rowsWithNumbers = rows.map((row, i) => ({
    ...row,
    rowNumber: row.rowNumber != null ? row.rowNumber : i + 1,
  }));

  if (USE_MOCK) {
    await delay(600);
    const existing = EXISTING_KEYS[type];
    const keyField = KEY_FIELD[type];
    const warnReason = WARN_REASON[type];
    let imported = 0;
    let updated = 0;
    const warnings = [];

    for (const row of rowsWithNumbers) {
      if (shouldMockWarn(row.rowNumber)) {
        warnings.push({ rowNumber: row.rowNumber, reason: warnReason });
      }

      const key = String(row[keyField] ?? "").trim();
      if (existing.has(key)) {
        updated += 1;
      } else {
        imported += 1;
        existing.add(key);
      }
    }

    return { imported, updated, warnings };
  }

  // Real backend call.
  // The backend can accept either:
  //   - multipart/form-data with file field "excelFile" (backend parses it with xlsx)
  //   - JSON { rows: [...] } (fallback; the fields were pre-parsed client-side)
  if (file) {
    const formData = new FormData();
    formData.append("excelFile", file);
    // Only include rows if they are non-empty (backend accepts JSON rows too)
    if (rowsWithNumbers.length > 0) {
      formData.append("rows", JSON.stringify(rowsWithNumbers));
    }
    const res = await api.post(ENDPOINT[type], formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const data = res.data && res.data.data ? res.data.data : res.data;
    return {
      imported: Number(data.imported ?? 0),
      updated: Number(data.updated ?? 0),
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
    };
  }

  // JSON rows fallback (no file uploaded)
  const res = await api.post(ENDPOINT[type], { rows: rowsWithNumbers });
  const data = res.data && res.data.data ? res.data.data : res.data;
  return {
    imported: Number(data.imported ?? 0),
    updated: Number(data.updated ?? 0),
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
  };
}
