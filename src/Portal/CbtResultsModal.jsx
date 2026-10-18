import { useState, useEffect, useMemo } from "react";
import "./CbtResultsModal.css";

const BASE_URL = "https://pen-world-school.vercel.app";

// role: "admin" | "teacher" — decides which route prefix to hit
// (admin -> /api/admin/cbt/:id/results, teacher -> /api/teacher/cbt/:id/results)
export default function CbtResultsModal({ test, role, onClose }) {
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const testId = test._id || test.id;

    useEffect(() => {
        const token = localStorage.getItem("token");
        setLoading(true);
        setError("");

        fetch(`${BASE_URL}/api/${role}/cbt/${encodeURIComponent(testId)}/results`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || "Failed to load results.");
                return data;
            })
            .then((data) => setAttempts(data.data || []))
            .catch((err) => setError(err.message || "Failed to load results."))
            .finally(() => setLoading(false));
    }, [testId, role]);

    // The API returns every attempt, newest first. Work out "Attempt X of Y" per student:
    // the first row we meet for a student is their latest attempt.
    const { rows, studentCount } = useMemo(() => {
        const totals = {};
        attempts.forEach((a) => {
            totals[a.studentId] = (totals[a.studentId] || 0) + 1;
        });

        const seen = {};
        const withNumbers = attempts.map((a) => {
            seen[a.studentId] = (seen[a.studentId] || 0) + 1;
            return {
                ...a,
                attemptTotal: totals[a.studentId],
                attemptNo: totals[a.studentId] - seen[a.studentId] + 1,
            };
        });

        return { rows: withNumbers, studentCount: Object.keys(totals).length };
    }, [attempts]);

    const formatDuration = (secs) => {
        if (secs === null || secs === undefined) return "—";
        const m = Math.floor(secs / 60);
        const s = (secs % 60).toString().padStart(2, "0");
        return `${m}m ${s}s`;
    };

    const formatDate = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

    return (
        <div className="cbr-overlay" onClick={onClose}>
            <div className="cbr-modal" onClick={(e) => e.stopPropagation()}>
                <div className="cbr-header">
                    <div>
                        <h2 className="cbr-title">{test.subject} — Results</h2>
                        <p className="cbr-sub">
                            {test.classLevel} &nbsp;·&nbsp; {test.description}
                        </p>
                    </div>
                    <button className="cbr-close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                <div className="cbr-body">
                    {loading && <p className="cbr-empty">Loading results...</p>}
                    {!loading && error && <p className="cbr-error">{error}</p>}

                    {!loading && !error && rows.length === 0 && (
                        <p className="cbr-empty">No student has taken this test yet.</p>
                    )}

                    {!loading && !error && rows.length > 0 && (
                        <>
                            <p className="cbr-summary">
                                {studentCount} student{studentCount === 1 ? "" : "s"} &nbsp;·&nbsp; {rows.length} attempt{rows.length === 1 ? "" : "s"}
                            </p>

                            <div className="cbr-table-wrap">
                                <table className="cbr-table">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Attempt</th>
                                            <th>Score</th>
                                            <th>Percentage</th>
                                            <th>Status</th>
                                            <th>Time Taken</th>
                                            <th>Submitted</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, i) => (
                                            <tr key={r.attemptId || `${r.studentId}-${i}`}>
                                                <td className="cbr-name">{r.name}</td>
                                                <td>
                                                    <span className={`cbr-attempt ${r.attemptTotal > 1 ? "cbr-attempt--multi" : ""}`}>
                                                        {r.attemptNo} of {r.attemptTotal}
                                                    </span>
                                                </td>
                                                <td>{r.score}/{r.totalQuestions}</td>
                                                <td>{r.percentage}%</td>
                                                <td>
                                                    <span className={`cbr-badge ${r.passed ? "cbr-badge--pass" : "cbr-badge--fail"}`}>
                                                        {r.passed ? "Passed" : "Failed"}
                                                    </span>
                                                </td>
                                                <td>{formatDuration(r.timeTakenSeconds)}</td>
                                                <td>{formatDate(r.submittedAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

