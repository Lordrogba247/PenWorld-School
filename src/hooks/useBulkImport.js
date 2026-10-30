// ===== Bulk import hook =====
// Manages the confirm step, batched sequential import, progress, cancel and the
// result summary screen. The component stays small and readable.
import { useState, useCallback, useEffect, useRef } from "react";
import { importBatch } from "../services/bulkApi";
import Papa from "papaparse";

const BATCH_SIZE = 100;

export function useBulkImport({ type, validRows, invalidRows }) {
  const [step, setStep] = useState("confirm"); // "confirm" | "importing" | "results"
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
    imported: 0,
    updated: 0,
    failed: 0,
  });
  const [results, setResults] = useState(null); // { imported, updated, skipped, failed: [] }
  const [error, setError] = useState(null);

  const cancelRequestedRef = useRef(false);

  // rowNumber -> original row data, used to build the error report CSV.
  const rowDataRef = useRef({});
  useEffect(() => {
    const map = {};
    validRows.forEach((r) => {
      map[r.rowNumber] = r;
    });
    invalidRows.forEach((r) => {
      map[r.rowNumber] = r.data;
    });
    rowDataRef.current = map;
  }, [validRows, invalidRows]);

  const startImport = useCallback(async () => {
    cancelRequestedRef.current = false;
    setError(null);
    setResults(null);
    setStep("importing");
    setImporting(true);

    const total = validRows.length;
    const batches = [];
    for (let i = 0; i < total; i += BATCH_SIZE) {
      batches.push(validRows.slice(i, i + BATCH_SIZE));
    }

    setProgress({ done: 0, total, imported: 0, updated: 0, failed: 0 });

    let imported = 0;
    let updated = 0;
    let failed = [];
    let done = 0;

    for (const batch of batches) {
      if (cancelRequestedRef.current) break;

      try {
        const res = await importBatch(type, batch);
        imported += res.imported;
        updated += res.updated;
        failed.push(...res.failed);
      } catch (err) {
        // Whole batch request failed: mark every row in the batch as failed.
        batch.forEach((row) => {
          failed.push({ rowNumber: row.rowNumber, reason: "Network error" });
        });
      }

      done += batch.length;
      setProgress({
        done: Math.min(total, done),
        total,
        imported,
        updated,
        failed: failed.length,
      });
    }

    setImporting(false);
    setStep("results");
    setResults({ imported, updated, skipped: invalidRows.length, failed });
    setProgress({ done: total, total, imported, updated, failed: failed.length });
  }, [type, validRows, invalidRows]);

  const cancelImport = useCallback(() => {
    cancelRequestedRef.current = true;
  }, []);

  const resetFlow = useCallback(() => {
    setStep("confirm");
    setImporting(false);
    cancelRequestedRef.current = false;
    setResults(null);
    setError(null);
    setProgress({ done: 0, total: 0, imported: 0, updated: 0, failed: 0 });
  }, []);

  const downloadErrorReport = useCallback(() => {
    const skipped = invalidRows.map((r) => ({
      ...r.data,
      rowNumber: r.rowNumber,
      reason: r.errors.map((e) => e.message).join("; "),
    }));

    const failedRows = (results.failed || []).map((f) => {
      const data = rowDataRef.current[f.rowNumber] || {};
      return { ...data, rowNumber: f.rowNumber, reason: f.reason };
    });

    const all = [...skipped, ...failedRows];
    if (all.length === 0) return;

    // Prefix phone-like values with a tab so Excel keeps leading zeros
    // (e.g. 08031234567 stays 08031234567 instead of becoming 8031234567).
    const processed = all.map((row) => {
      const out = {};
      for (const [key, value] of Object.entries(row)) {
        const text = String(value ?? "");
        if (/^0\d{9,14}$/.test(text)) {
          out[key] = "\t" + text;
        } else {
          out[key] = text;
        }
      }
      return out;
    });

    const csv = Papa.unparse(processed);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bulk-import-error-report-${type}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [invalidRows, results, type]);

  const hasReportRows =
    results != null && ((results.skipped || 0) > 0 || (results.failed || []).length > 0);

  return {
    step,
    importing,
    progress,
    results,
    error,
    startImport,
    cancelImport,
    resetFlow,
    downloadErrorReport,
    hasReportRows,
  };
}
