import { useMemo, useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { BULK_FORMS, downloadTemplate, parseFile } from "../../utils/bulkParser";
import { validateRows } from "../../utils/bulkValidation";
import { useBulkImport } from "../../hooks/useBulkImport";
import api from "../../api";
import { exportRows, prepareColumns } from "../../utils/bulkExport";

import "./12BulkData.css";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const PAGE_SIZE = 25;

// Windows often reports .csv files as application/vnd.ms-excel, so allow that too.
const ACCEPT = {
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

function rejectionMessage(rejection) {
  const code = rejection?.errors?.[0]?.code;
  if (code === "file-too-large") return "This file is too large. The maximum size is 5MB.";
  if (code === "too-many-files") return "Please upload one file at a time.";
  return "Wrong file type. Please upload a .csv or .xlsx file.";
}

function DropzoneZone({ onDrop, fileName, onRemove, disabled }) {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: ACCEPT,
    maxSize: MAX_SIZE,
    multiple: false,
    onDrop: disabled ? undefined : onDrop,
  });

  const zoneClass = [
    "bdz-zone",
    disabled ? "bdz-zone--disabled" : "",
    isDragActive ? "bdz-zone--active" : "",
    isDragReject ? "bdz-zone--reject" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={zoneClass} {...(!disabled ? getRootProps() : {})} aria-disabled={disabled}>
      <input {...getInputProps()} aria-label="Upload file" />
      <div className="bdz-zone-card">
        <div className="bdz-zone-mark">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" aria-hidden="true">
            <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
          </svg>
        </div>
        <div className="bdz-zone-text">
          <p className="bdz-zone-title">
            {isDragActive ? "Drop the file here ..." : "Drag & drop a file"}
          </p>
          <p className="bdz-zone-sub">
            or click to choose a .csv or .xlsx file (max 5MB) · every cell is read as text
          </p>
        </div>
        <div className="bdz-zone-meta">
          {fileName ? (
            <span className="bdz-file-chip">
              <span className="bdz-file-name">{fileName}</span>
              <button
                type="button"
                className="bdz-file-remove"
                aria-label="Remove file"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                ×
              </button>
            </span>
          ) : (
            <span className="bdz-placeholder">No file selected</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminBulkData() {
  const [activeTab, setActiveTab] = useState("import");
  const [formType, setFormType] = useState("student");
  const [fileName, setFileName] = useState("");
  const [parseResult, setParseResult] = useState(null);
  const [validation, setValidation] = useState(null); // { results, validRows, invalidRows, summary }
  const [info, setInfo] = useState("");
  const [errors, setErrors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [continueMessage, setContinueMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // ---- Export tab state ----
  const [exportType, setExportType] = useState("student"); // "student" | "staff"
  const [exportFilter, setExportFilter] = useState(""); // class / role
  const [exportGender, setExportGender] = useState(""); // "" | "Male" | "Female"
  const [exportColumns, setExportColumns] = useState(prepareColumns("student"));
  const [exportFormat, setExportFormat] = useState("csv"); // "csv" | "xlsx"
  const [exportRecords, setExportRecords] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportRecordCount, setExportRecordCount] = useState(0);

  const form = BULK_FORMS[formType];
  const bulk = useBulkImport({
    type: formType,
    validRows: validation ? validation.validRows : [],
    invalidRows: validation ? validation.invalidRows : [],
  });

  const resetResult = () => {
    setFileName("");
    setParseResult(null);
    setValidation(null);
    setInfo("");
    setErrors([]);
    setCurrentPage(1);
    setShowErrorsOnly(false);
    setContinueMessage("");
    setShowConfirm(false);
    bulk.resetFlow();
  };

  const handleDrop = async (accepted, rejections) => {
    setParseResult(null);
    setValidation(null);
    setInfo("");
    setErrors([]);
    setCurrentPage(1);
    setShowErrorsOnly(false);
    setContinueMessage("");
    setShowConfirm(false);

    if (rejections.length > 0) {
      setFileName("");
      setErrors([rejectionMessage(rejections[0])]);
      return;
    }

    const picked = accepted[0];
    if (!picked) return;

    setFileName(picked.name);
    setInfo("Reading file ...");

    try {
      const result = await parseFile(picked, formType);
      if (!result.ok) {
        setFileName("");
        setInfo("");
        setErrors([result.error || "Could not read this file."]);
        return;
      }

      const checked = validateRows(formType, result.rows);
      setParseResult(result);
      setValidation(checked);

      const { total, valid, invalid } = checked.summary;
      setInfo(
        invalid === 0
          ? `${total} row(s) read. All rows are valid.`
          : `${total} row(s) read: ${valid} valid, ${invalid} with errors.`
      );
    } catch (err) {
      setFileName("");
      setInfo("");
      setErrors([err.message || "Something went wrong while reading the file."]);
    }
  };

  const handleTypeChange = (next) => {
    setFormType(next);
    resetResult();
  };

  const handleContinue = () => {
    if (!validation || validation.validRows.length === 0) return;
    setShowConfirm(true);
    setContinueMessage("");
  };

  const handleBackFromConfirm = () => {
    setShowConfirm(false);
  };

  const handleStartImport = () => {
    setShowConfirm(false);
    bulk.startImport();
  };

  const handleImportAnother = () => {
    resetResult();
  };

  // Warn if the user closes or refreshes the tab while an import is running.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (bulk.importing) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [bulk.importing]);

  const isImporting = bulk.importing;
  const disabled = isImporting;

  // ---- Export tab: fetch + filter records from the existing API ----
  useEffect(() => {
    const allCols = prepareColumns(exportType);
    setExportColumns(allCols);
    setExportFilter("");
    setExportGender("");
    fetchExportRecords();
  }, [exportType]);

  const fetchExportRecords = useCallback(async () => {
    setExportLoading(true);
    try {
      let url;
      if (exportType === "student") {
        url = exportFilter
          ? `/api/admin/students?class=${encodeURIComponent(exportFilter)}`
          : "/api/admin/students";
      } else {
        url = "/api/admin/staff";
      }
      const res = await api.get(url);
      const raw = res.data && res.data.data ? res.data.data : res.data;
      const records = Array.isArray(raw) ? raw : [];

      // Client-side filters (gender is not supported by the existing endpoints).
      const filtered = records.filter((r) => {
        if (exportGender) {
          const sex = r.sex === "M" ? "Male" : r.sex === "F" ? "Female" : r.sex || "";
          if (sex !== exportGender) return false;
        }
        return true;
      });

      setExportRecords(filtered);
      setExportRecordCount(filtered.length);
    } catch (err) {
      setExportRecords([]);
      setExportRecordCount(0);
    } finally {
      setExportLoading(false);
    }
  }, [exportType, exportFilter, exportGender]);

  const toggleExportColumn = useCallback((col) => {
    setExportColumns((prev) => {
      if (prev.includes(col)) return prev.filter((c) => c !== col);
      return [...prev, col];
    });
  }, []);

  const selectAllExportColumns = useCallback(() => {
    setExportColumns(prepareColumns(exportType));
  }, [exportType]);

  const clearExportColumns = useCallback(() => {
    setExportColumns([]);
  }, []);

  const handleExportDownload = useCallback(() => {
    if (exportColumns.length === 0) return;
    exportRows(exportType, exportRecords, exportColumns, exportFormat);
  }, [exportType, exportRecords, exportColumns, exportFormat]);

  const canExport = exportColumns.length > 0 && exportRecordCount > 0;

  // Rows shown in the table (all rows, or only the ones with errors).
  const visibleRows = useMemo(() => {
    if (!validation) return [];
    return showErrorsOnly
      ? validation.results.filter((r) => r.errors.length > 0)
      : validation.results;
  }, [validation, showErrorsOnly]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = visibleRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const headers = parseResult?.headers || [];
  const summary = validation?.summary;
  const validCount = validation ? validation.validRows.length : 0;

  return (
    <div className="ad-page ad-bulk">
      <h1 className="ad-title">Bulk Data</h1>
      <p className="ad-sub">Import or export student &amp; staff records in bulk.</p>

      <div className="ad-tabs">
        <button
          type="button"
          className={`ad-tab ${activeTab === "import" ? "ad-tab--active" : ""}`}
          onClick={() => setActiveTab("import")}
          disabled={disabled}
        >
          Import
        </button>
        <button
          type="button"
          className={`ad-tab ${activeTab === "export" ? "ad-tab--active" : ""}`}
          onClick={() => setActiveTab("export")}
          disabled={disabled}
        >
          Export
        </button>
      </div>

      <div className="ad-bulk-body">
        {activeTab === "import" ? (
          <div className="ad-bulk-import">
            <div className="ad-bulk-card">
              <div className="ad-bulk-select">
                <label className="ad-bulk-label" htmlFor="bulk-form-type">
                  Select record type
                </label>
                <select
                  id="bulk-form-type"
                  className="ad-bulk-select-input"
                  value={formType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  {Object.entries(BULK_FORMS).map(([key, f]) => (
                    <option key={key} value={key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ad-bulk-actions">
                <button
                  type="button"
                  className="ad-bulk-btn ad-bulk-btn--primary"
                  onClick={() => downloadTemplate(formType)}
                  disabled={disabled}
                >
                  Download {form.label} Template
                </button>
                <button type="button" className="ad-bulk-btn" onClick={resetResult} disabled={disabled}>
                  Upload a different file
                </button>
                <button
                  type="button"
                  className="ad-bulk-btn ad-bulk-btn--primary"
                  onClick={handleContinue}
                  disabled={disabled || validCount === 0}
                >
                  Continue with valid rows only
                </button>
              </div>

              {showConfirm && (
                <div className="ad-bulk-confirm">
                  <p className="ad-bulk-confirm-title">
                    You are about to import {validCount} {form.label.toLowerCase()}
                  </p>
                  <p className="ad-bulk-confirm-note">
                    {validation.invalidRows.length} row(s) skipped because they were invalid.
                  </p>
                  <div className="ad-bulk-actions">
                    <button type="button" className="ad-bulk-btn" onClick={handleBackFromConfirm} disabled={disabled}>
                      Back
                    </button>
                    <button
                      type="button"
                      className="ad-bulk-btn ad-bulk-btn--primary"
                      onClick={handleStartImport}
                      disabled={disabled}
                    >
                      Start Import
                    </button>
                  </div>
                </div>
              )}
            </div>

            {!showConfirm && !isImporting && bulk.step !== "results" && (
              <>
                <DropzoneZone onDrop={handleDrop} fileName={fileName} onRemove={resetResult} />

                {errors.map((message, i) => (
                  <div key={i} className="ad-bulk-error">
                    {message}
                  </div>
                ))}

                {info && <div className="ad-bulk-info ad-bulk-info--success">{info}</div>}

                {parseResult?.warnings.map((message, i) => (
                  <div key={i} className="ad-bulk-info ad-bulk-info--warn">
                    {message}
                  </div>
                ))}

                {validation && headers.length > 0 && (
                  <div className="ad-bulk-preview-card">
                    <div className="ad-bulk-summary">
                      <div className="ad-bulk-summary-item">
                        <span className="ad-bulk-summary-value">{summary.total}</span>
                        <span className="ad-bulk-summary-label">Total rows</span>
                      </div>
                      <div className="ad-bulk-summary-item ad-bulk-summary-item--ok">
                        <span className="ad-bulk-summary-value">{summary.valid}</span>
                        <span className="ad-bulk-summary-label">Valid</span>
                      </div>
                      <div className="ad-bulk-summary-item ad-bulk-summary-item--err">
                        <span className="ad-bulk-summary-value">{summary.invalid}</span>
                        <span className="ad-bulk-summary-label">Invalid</span>
                      </div>
                    </div>

                    <div className="ad-bulk-check-row">
                      <label className="ad-bulk-check-label">
                        <input
                          type="checkbox"
                          checked={showErrorsOnly}
                          onChange={(e) => {
                            setShowErrorsOnly(e.target.checked);
                            setCurrentPage(1);
                          }}
                        />
                        Show errors only
                      </label>
                    </div>

                    {pageRows.length === 0 ? (
                      <p className="ad-bulk-preview-note">No rows with errors.</p>
                    ) : (
                      <div className="ad-bulk-table-wrap">
                        <table className="ad-bulk-table">
                          <thead>
                            <tr>
                              <th className="ad-bulk-th-num">Row</th>
                              {headers.map((h) => (
                                <th key={h}>{h}</th>
                              ))}
                              <th className="ad-bulk-th-errors">Errors</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageRows.map((row) => {
                              const isInvalid = row.errors.length > 0;
                              return (
                                <tr
                                  key={row.rowNumber}
                                  className={isInvalid ? "ad-bulk-table-row--invalid" : ""}
                                >
                                  <td className="ad-bulk-cell-num">{row.rowNumber}</td>
                                  {headers.map((h) => (
                                    <td
                                      key={h}
                                      className={
                                        row.errors.some((e) => e.field === h)
                                          ? "ad-bulk-cell--invalid"
                                          : ""
                                      }
                                    >
                                      {row.data[h]}
                                    </td>
                                  ))}
                                  <td className="ad-bulk-cell-errors">
                                    {row.errors.map((e, i) => (
                                      <div key={i}>{e.message}</div>
                                    ))}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="ad-bulk-pagination">
                      <button
                        type="button"
                        className="ad-bulk-btn"
                        onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                        disabled={safePage <= 1}
                      >
                        Previous
                      </button>
                      <span className="ad-bulk-pagination-count">
                        Page {safePage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        className="ad-bulk-btn"
                        onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                        disabled={safePage >= totalPages}
                      >
                        Next
                      </button>
                    </div>

                    <p className="ad-bulk-preview-note">
                      Row numbers match your spreadsheet. Rows with errors are highlighted in red and the
                      Errors column says what to fix.
                    </p>
                  </div>
                )}

                {continueMessage && (
                  <div className="ad-bulk-info ad-bulk-info--success">{continueMessage}</div>
                )}
              </>
            )}
            {isImporting && (
              <div className="ad-bulk-progress">
                <p className="ad-bulk-progress-title">Importing {form.label} …</p>
                <div className="ad-bulk-progress-bar">
                  <div
                    className="ad-bulk-progress-fill"
                    style={{
                      width:
                        bulk.progress.total > 0
                          ? (bulk.progress.done / bulk.progress.total) * 100
                          : 0,
                    }}
                  ></div>
                </div>
                <p className="ad-bulk-progress-text">
                  {bulk.progress.done} / {bulk.progress.total}
                </p>
                <button type="button" className="ad-bulk-btn" onClick={bulk.cancelImport}>
                  Cancel
                </button>
              </div>
            )}
            {bulk.step === "results" && (
              <div className="ad-bulk-results">
                <h2 className="ad-bulk-results-title">Import complete</h2>
                <div className="ad-bulk-results-cards">
                  <div className="ad-bulk-result-card ad-bulk-result-card--imported">
                    <span className="ad-bulk-result-value">{bulk.results.imported}</span>
                    <span className="ad-bulk-result-label">Imported</span>
                  </div>
                  <div className="ad-bulk-result-card ad-bulk-result-card--updated">
                    <span className="ad-bulk-result-value">{bulk.results.updated}</span>
                    <span className="ad-bulk-result-label">Updated</span>
                  </div>
                  <div className="ad-bulk-result-card ad-bulk-result-card--skipped">
                    <span className="ad-bulk-result-value">{bulk.results.skipped}</span>
                    <span className="ad-bulk-result-label">Skipped (invalid)</span>
                  </div>
                  <div className="ad-bulk-result-card ad-bulk-result-card--failed">
                    <span className="ad-bulk-result-value">{bulk.results.failed.length}</span>
                    <span className="ad-bulk-result-label">Failed</span>
                  </div>
                </div>

                {(bulk.results.failed.length > 0 || bulk.results.skipped > 0) && (
                  <>
                    <h3 className="ad-bulk-results-subtitle">Failed rows</h3>
                    <div className="ad-bulk-results-list">
                      <table className="ad-bulk-table">
                        <thead>
                          <tr>
                            <th className="ad-bulk-th-num">Row</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulk.results.skipped > 0 && (
                            <tr>
                              <td className="ad-bulk-cell-num" colSpan="2">
                                {bulk.results.skipped} row(s) invalid in the file (see preview above).
                              </td>
                            </tr>
                          )}
                          {bulk.results.failed.map((f) => (
                            <tr key={f.rowNumber}>
                              <td className="ad-bulk-cell-num">{f.rowNumber}</td>
                              <td>{f.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {bulk.hasReportRows && (
                      <button
                        type="button"
                        className="ad-bulk-btn ad-bulk-btn--primary"
                        onClick={bulk.downloadErrorReport}
                      >
                        Download error report
                      </button>
                    )}
                  </>
                )}

                <div className="ad-bulk-actions" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="ad-bulk-btn ad-bulk-btn--primary"
                    onClick={handleImportAnother}
                  >
                    Import another file
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="ad-bulk-export">
            <div className="ad-bulk-card">
              <div className="ad-bulk-select">
                <label className="ad-bulk-label" htmlFor="export-type">Record type</label>
                <select
                  id="export-type"
                  className="ad-bulk-select-input"
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                  disabled={disabled}
                >
                  <option value="student">Students</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              {/* ---- Filters ---- */}
              <div className="ad-bulk-filters">
                {exportType === "student" ? (
                  <>
                    <div className="ad-bulk-filter-field">
                      <label className="ad-bulk-filter-label">Class</label>
                      <select
                        className="ad-bulk-filter-input"
                        value={exportFilter}
                        onChange={(e) => setExportFilter(e.target.value)}
                        disabled={disabled}
                      >
                        <option value="">All classes</option>
                      </select>
                    </div>
                    <div className="ad-bulk-filter-field">
                      <label className="ad-bulk-filter-label">Gender</label>
                      <select
                        className="ad-bulk-filter-input"
                        value={exportGender}
                        onChange={(e) => setExportGender(e.target.value)}
                        disabled={disabled}
                      >
                        <option value="">All genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ad-bulk-filter-field">
                      <label className="ad-bulk-filter-label">Role</label>
                      <select
                        className="ad-bulk-filter-input"
                        value={exportFilter}
                        onChange={(e) => setExportFilter(e.target.value)}
                        disabled={disabled}
                      >
                        <option value="">All roles</option>
                      </select>
                    </div>
                    <div className="ad-bulk-filter-field">
                      <label className="ad-bulk-filter-label">Gender</label>
                      <select
                        className="ad-bulk-filter-input"
                        value={exportGender}
                        onChange={(e) => setExportGender(e.target.value)}
                        disabled={disabled}
                      >
                        <option value="">All genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="ad-bulk-export-info">
                {exportLoading ? (
                  <span className="ad-bulk-export-loading">Loading records…</span>
                ) : (
                  <span className="ad-bulk-export-count">
                    {exportRecordCount} record{exportRecordCount !== 1 ? "s" : ""} match your filters
                  </span>
                )}
              </div>

              {exportRecordCount === 0 && !exportLoading && (
                <p className="ad-bulk-export-note">No records match these filters.</p>
              )}

              {/* ---- Column picker ---- */}
              <div className="ad-bulk-column-picker">
                <label className="ad-bulk-label">Columns</label>
                <div className="ad-bulk-column-actions">
                  <button
                    type="button"
                    className="ad-bulk-btn"
                    onClick={selectAllExportColumns}
                    disabled={disabled || exportColumns.length >= prepareColumns(exportType).length}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="ad-bulk-btn"
                    onClick={clearExportColumns}
                    disabled={disabled || exportColumns.length === 0}
                  >
                    Clear
                  </button>
                </div>
                <div className="ad-bulk-column-list">
                  {prepareColumns(exportType).map((col) => (
                    <label
                      key={col}
                      className={`ad-bulk-column-checkbox ${exportColumns.includes(col) ? "ad-bulk-column-checkbox--checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={exportColumns.includes(col)}
                        onChange={() => toggleExportColumn(col)}
                        disabled={disabled}
                      />
                      {col}
                    </label>
                  ))}
                </div>
              </div>

              {/* ---- Format + Download ---- */}
              <div className="ad-bulk-export-actions">
                <div className="ad-bulk-format-select">
                  <label className="ad-bulk-label" htmlFor="export-format">Format</label>
                  <select
                    id="export-format"
                    className="ad-bulk-select-input"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    disabled={disabled || !canExport}
                  >
                    <option value="csv">CSV (.csv)</option>
                    <option value="xlsx">Excel (.xlsx)</option>
                  </select>
                </div>
                <button
                  type="button"
                  className={`ad-bulk-btn ad-bulk-btn--primary ${canExport ? "" : "ad-bulk-btn--disabled"}`}
                  onClick={handleExportDownload}
                  disabled={disabled || !canExport || exportLoading}
                >
                  {exportLoading ? "Building file…" : "Download"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}