// ===== Bulk import API =====
// Single entry point for the whole app: importBatch(type, rows) -> Promise.
// Set USE_MOCK = false to switch to the real backend (change one word).
import api from "../api";

// When true, the mock below runs instead of the real axios call.
// Both paths return exactly the same shape: { imported, updated, failed: [{ rowNumber, reason }] }
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

// Mock failure reason per type so the failure flow can be tested.
const FAIL_REASON = {
  student: "Class not found",
  staff: "Role not found",
};

// In-memory "database" used only by the mock, pre-filled with a few existing records.
const EXISTING_KEYS = {
  student: new Set(["PW/2026/001", "PW/2026/002", "PW/2026/003"]),
  staff: new Set(["STF-2026-010", "STF-2026-011"]),
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Every 25th row (by rowNumber) fails in the mock so the failure flow can be tested.
function shouldMockFail(rowNumber) {
  return rowNumber % 25 === 0;
}

// Response shape: { imported: number, updated: number, failed: [{ rowNumber, reason }] }
export async function importBatch(type, rows) {
  // Add rowNumber to every row so the backend can identify which rows failed.
  const rowsWithNumbers = rows.map((row, i) => ({
    ...row,
    rowNumber: row.rowNumber != null ? row.rowNumber : i + 1,
  }));

  if (USE_MOCK) {
    await delay(600);
    const existing = EXISTING_KEYS[type];
    const keyField = KEY_FIELD[type];
    const failReason = FAIL_REASON[type];
    let imported = 0;
    let updated = 0;
    const failed = [];

    for (const row of rowsWithNumbers) {
      if (shouldMockFail(row.rowNumber)) {
        failed.push({ rowNumber: row.rowNumber, reason: failReason });
        continue;
      }

      const key = String(row[keyField] ?? "").trim();
      if (!key) {
        failed.push({ rowNumber: row.rowNumber, reason: `Missing ${keyField}` });
        continue;
      }

      if (existing.has(key)) {
        updated += 1;
      } else {
        imported += 1;
        existing.add(key);
      }
    }

    return { imported, updated, failed };
  }

  // Real backend call. Reuses the project's axios instance (base URL + JWT interceptor).
  const res = await api.post(ENDPOINT[type], { rows: rowsWithNumbers });
  const data = res.data && res.data.data ? res.data.data : res.data;
  return {
    imported: Number(data.imported ?? 0),
    updated: Number(data.updated ?? 0),
    failed: Array.isArray(data.failed) ? data.failed : [],
  };
}
