import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { BULK_FORMS, downloadTemplate, parseFile } from "../../utils/bulkParser";
import { validateRows } from "../../utils/bulkValidation";

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

function DropzoneZone({ onDrop, fileName, onRemove }) {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: ACCEPT,
    maxSize: MAX_SIZE,
    multiple: false,
    onDrop,
  });

  const zoneClass = [
    "bdz-zone",
    isDragActive ? "bdz-zone--active" : "",
    isDragReject ? "bdz-zone--reject" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={zoneClass} {...getRootProps()}>
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

  const form = BULK_FORMS[formType];

  const resetResult = () => {
    setFileName("");
    setParseResult(null);
    setValidation(null);
    setInfo("");
    setErrors([]);
    setCurrentPage(1);
    setShowErrorsOnly(false);
    setContinueMessage("");
  };

  const handleDrop = async (accepted, rejections) => {
    setParseResult(null);
    setValidation(null);
    setInfo("");
    setErrors([]);
    setCurrentPage(1);
    setShowErrorsOnly(false);
    setContinueMessage("");

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
    setContinueMessage(`Ready to upload ${validation.validRows.length} row(s).`);
  };

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
        >
          Import
        </button>
        <button
          type="button"
          className={`ad-tab ${activeTab === "export" ? "ad-tab--active" : ""}`}
          onClick={() => setActiveTab("export")}
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
                >
                  Download {form.label} Template
                </button>
                <button type="button" className="ad-bulk-btn" onClick={resetResult}>
                  Upload a different file
                </button>
                <button
                  type="button"
                  className="ad-bulk-btn ad-bulk-btn--primary"
                  onClick={handleContinue}
                  disabled={validCount === 0}
                >
                  Continue with valid rows only
                </button>
              </div>
            </div>

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
          </div>
        ) : (
          <div className="ad-bulk-export ad-bulk-empty">
            <p>Export is not implemented yet.</p>
            <p className="ad-bulk-empty-hint">
              This placeholder will show the filters and the Export to CSV / Excel buttons in a
              later phase.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}