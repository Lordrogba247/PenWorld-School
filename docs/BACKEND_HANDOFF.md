# Backend Handoff — Bulk Upload / Download (Admin)

**Prepared by:** Frontend developer
**Audience:** Backend developer
**Project:** PenWorld Academy — Admin portal
**Frontend base URL:** `https://penworld-gloryseed-demo-school-back.vercel.app`
**Auth convention:** `Authorization: Bearer <localStorage.token>` on every authed call
**Envelope convention:** `{ success: boolean, data: any, message?: string }`
**Source of truth:** `src/utils/bulkParser.js` + `src/utils/bulkValidation.js` + `src/Portal/Admin/12BulkData.jsx`

---

## Current state — Phase 1 + Phase 2 client-side; Phase 3 calls new endpoints

The frontend does not call any backend endpoint in Phase 1 or Phase 2. Everything is client-side:

1. **Route** `/portal/admin/bulk-data` with sidebar link "Bulk Data" (added in `AdminLayout.jsx`, route in `App.jsx`).
2. **Import tab** lets the admin choose "Students" or "Staff".
3. **Download Template** generates a CSV in the browser (client-side Blob). No API call.
4. **Drag-and-drop** accepts `.csv` and `.xlsx` only, max 5MB (`react-dropzone`).
5. **Parsing** is done in the browser:
   - CSV → PapaParse (`header: 1`, raw array of rows)
   - XLSX → SheetJS (`sheet_to_json` with `header: 1, raw: true`)
   - Every cell is read as **text** so phone numbers keep leading zeros (e.g. `08031234567`).
   - Headers are trimmed and matched case-insensitively (spaces/underscores ignored).
6. **Validation** runs in the browser via `zod` (`src/utils/bulkValidation.js`). Invalid rows are flagged with plain-English error messages and shown in a paginated preview table (25 rows/page).
7. **"Continue with valid rows only"** shows a confirm step, then submits valid rows in batches of 100 to the backend via `src/services/bulkApi.js` (`importBatch`). Progress, cancel and a result summary are handled client-side. **Phase 3 calls the new bulk import endpoints below.**
8. **Export tab** lets the admin choose Students or Staff, filter by class/role and gender, pick columns, choose CSV or Excel format, and download. Data is read from the existing list endpoints (`GET /api/admin/students`, `GET /api/admin/staff`) via the project's axios instance. No new backend endpoints are needed for export.

**Bottom line:** Phase 1 and Phase 2 are fully client-side. Phase 3 adds batched import submit to the new bulk import endpoints below. Phase 4 adds export using existing list endpoints. All filtering for export is done client-side (gender is not supported by the existing list endpoints).

---

## 1. NEW ENDPOINTS NEEDED (Phase 3 — not called by Phase 1/2 frontend)

### A) Bulk import students & staff

The frontend sends one request per batch of 100 rows, sequentially. The URL depends on the record type:

- **Students:** `POST /api/admin/students/bulk`
- **Staff:** `POST /api/admin/staff/bulk`
- **Auth:** Bearer token (admin role required)
- **Content-Type:** `application/json`
- **Body:** `{ "rows": [ {...}, {...} ] }` — each row object uses the field names below plus an internal `rowNumber` (added by the frontend so the backend can identify which rows failed). The backend should ignore `rowNumber` for storage; it only echoes it back in `failed`.

Conventions copied from existing API:
- Base URL path style: `/api/admin/...` (matches `/api/admin/students`, `/api/admin/staff`).
- Auth: Bearer JWT (same as all admin routes).
- JSON body (matches existing student/staff create endpoints).
- Success envelope: `{ success: true, data: {...} }` (same as all existing responses).
- Error envelope: `{ success: false, message: "..." }` (same as all existing responses).
- IDs: `studentId` / `staffId` (registration numbers) are the natural unique keys; Mongo `_id` / `id` returned on existing list endpoints.

### Example request body — Students

```json
{
  "rows": [
    {
      "studentId": "PW/2026/001",
      "surname": "Adeyemi",
      "otherNames": "Toluwalase",
      "sex": "F",
      "studentClass": "JSS 1 Gaa-Akanbi",
      "dateOfBirth": "2010-03-15",
      "guardianName": "Mrs. Adeyemi",
      "guardianPhone": "08031234567",
      "guardianEmail": "adeyemi.m@example.com",
      "address": "No 12, Oke-Ado, Ilorin, Kwara State"
    },
    {
      "studentId": "PW/2026/002",
      "surname": "Ibrahim",
      "otherNames": "Kelechi",
      "sex": "M",
      "studentClass": "Primary 4 Gaa-Akanbi",
      "dateOfBirth": "2014-07-22",
      "guardianName": "Mr. Ibrahim",
      "guardianPhone": "08129807674",
      "guardianEmail": "",
      "address": "15 Emir Road, Ilorin, Kwara State"
    }
  ]
}
```

### Example request body — Staff

```json
{
  "rows": [
    {
      "staffId": "STF-2026-010",
      "surname": "Okafor",
      "otherNames": "Chinwe",
      "sex": "F",
      "role": "Teacher",
      "email": "okafor.c@penworld.edu.ng",
      "phone": "08038607740",
      "subject": "Mathematics"
    },
    {
      "staffId": "STF-2026-011",
      "surname": "Bello",
      "otherNames": "Adebayo",
      "sex": "M",
      "role": "Admin",
      "email": "bello.a@penworld.edu.ng",
      "phone": "+2348031234567",
      "subject": ""
    }
  ]
}
```

---

## 2. RESPONSES

### Success response

```json
{
  "success": true,
  "data": {
    "imported": 2,
    "updated": 0,
    "failed": [],
    "totalRows": 2
  },
  "message": "Bulk import complete. 2 row(s) imported, 0 updated, 0 failed."
}
```

### Response with per-row errors (partial failure)

```json
{
  "success": true,
  "data": {
    "imported": 1,
    "updated": 0,
    "failed": [
      {
        "rowNumber": 3,
        "reason": "Duplicate studentId (also in row 2)"
      },
      {
        "rowNumber": 4,
        "reason": "guardianPhone must be a valid Nigerian phone number"
      }
    ],
    "totalRows": 4
  },
  "message": "Bulk import complete. 1 row(s) imported, 0 updated, 2 failed."
}
```

---

## 3. CHANGES TO EXISTING ENDPOINTS

None.

---

## 4. FIELD LIST for Students and Staff

### Students

| Field | Type | Required | Validation rule | Example value |
|---|---|---|---|---|
| `studentId` | string | Yes | Unique within the file. Trimmed, non-empty. | `PW/2026/001` |
| `surname` | string | Yes | At least 2 characters. | `Adeyemi` |
| `otherNames` | string | Yes | At least 2 characters. | `Toluwalase` |
| `sex` | string | Yes | `M` or `F` only (case-insensitive, normalized to single letter). | `F` |
| `studentClass` | string | Yes | Must match an existing live class full name (from `/api/admin/meta` classNames). | `JSS 1 Gaa-Akanbi` |
| `dateOfBirth` | string | Yes | `YYYY-MM-DD` format, real calendar date, not in the future, age between 2 and 25. | `2010-03-15` |
| `guardianName` | string | Yes | Trimmed, non-empty. | `Mrs. Adeyemi` |
| `guardianPhone` | string | Yes | Nigerian format: 11 digits starting with 0 (e.g. `08031234567`) or `+234` followed by 10 digits. Kept as text. | `08031234567` |
| `guardianEmail` | string | No | Valid email format if provided. | `adeyemi.m@example.com` |
| `address` | string | No | Trimmed. | `No 12, Oke-Ado, Ilorin, Kwara State` |

### Staff

| Field | Type | Required | Validation rule | Example value |
|---|---|---|---|---|
| `staffId` | string | Yes | Unique within the file. Trimmed, non-empty. | `STF-2026-010` |
| `surname` | string | Yes | At least 2 characters. | `Okafor` |
| `otherNames` | string | Yes | At least 2 characters. | `Chinwe` |
| `sex` | string | Yes | `M` or `F` only (case-insensitive, normalized to single letter). | `F` |
| `role` | string | Yes | Must match a role from `/api/admin/meta` roles. | `Teacher` |
| `email` | string | Yes | Valid email format, unique within the file. | `okafor.c@penworld.edu.ng` |
| `phone` | string | Yes | Nigerian format: 11 digits starting with 0 (e.g. `08031234567`) or `+234` followed by 10 digits. Kept as text. | `08038607740` |
| `subject` | string | No | Trimmed. | `Mathematics` |

Notes:
- Frontend reads `sex` as `M`/`F` from the file. Existing API uses `sex: M|F` for create/update.
- `surname` + `otherNames` are the exact API field names (not `firstName`/`lastName`).
- `studentClass` is the exact API create field name (filter param is `class`, but create body uses `studentClass`).
- Phone fields must be stored as text, not number (leading zeros must survive).
- The frontend adds an internal `rowNumber` to every row it sends so the backend can identify which rows failed; the backend echoes it back in `failed` and should not store it.

---

## 5. BEHAVIOUR THE BACKEND MUST HANDLE

1. **Unique key + update-vs-create:** Match on `studentId` (students) or `staffId` (staff). If the key exists → update; if not → create. Report counts separately in `imported` / `updated`.
2. **Re-validate everything:** Client-side validation is UX only. The backend must re-run full validation on every row and return per-row errors.
3. **Batch size / maximum rows:** Define a sensible cap (e.g. 500 or 1000 rows per request). Return a clear error if exceeded.
4. **Phone format:** Treat phone fields as text. Do not coerce to number (leading zeros must survive, e.g. `08031234567`). Accept Nigerian mobile format (`08031234567` or `+2348031234567`).
5. **Date format:** `dateOfBirth` as `YYYY-MM-DD` text. Validate it is a real calendar date.
6. **Error message style:** Return `reason` strings that are short and human-readable.
7. **Partial failure:** If some rows fail, still import the valid ones and return `failed` with row numbers. Do not reject the whole batch because of one bad row.
8. **Case-insensitive header matching:** The frontend already normalizes headers (trim, lowercase, strip spaces/underscores). Backend should be lenient too.

---

## 6. OPEN QUESTIONS FOR THE BACKEND DEVELOPER

1. What is the maximum row limit per bulk-import request?
2. Should `studentClass` / `role` be validated against live meta data, or accepted as free text?
3. For duplicate keys: should update overwrite all fields, or only fields present in the row?
4. Are `guardianPhone` / `phone` expected to be stored exactly as text (no formatting)?
5. Does a failed row abort the whole batch, or is partial import acceptable (frontend expects partial)?
6. Will you provide an export endpoint in a later phase, and what filters should it support (class, session, term, type)?
7. Should the import endpoint require a specific admin role, or is any authenticated admin sufficient?

---

**Files changed/created in Phases 1–3:**
- Created: `src/utils/bulkParser.js`, `src/utils/bulkValidation.js`, `src/Portal/Admin/12BulkData.jsx`, `src/Portal/Admin/12BulkData.css`, `src/services/bulkApi.js`, `src/hooks/useBulkImport.js`
- Edited: `src/App.jsx` (route `bulk-data`), `src/Portal/Admin/AdminLayout.jsx` (sidebar link), `src/Portal/Admin/12BulkData.jsx` (Phase 3 confirm/progress/results UI), `src/Portal/Admin/12BulkData.css` (Phase 3 styles), `package.json` (deps: `react-dropzone`, `papaparse`, `zod`)
- No existing feature files were modified.