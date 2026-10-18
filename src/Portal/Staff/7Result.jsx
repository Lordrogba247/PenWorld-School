import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStaffMeta } from "../../hooks/useStaffMeta";
import "./7Result.css";

const BASE_URL = "https://penworld-demo-school-backend.vercel.app";

// Fallback only — used if useStaffMeta fails for some reason.
// Keep in sync with newly created academic sessions.
const fallbackSessions = ["2024/2025", "2025/2026", "2026/2027"];
const fallbackTerms = ["First Term", "Second Term", "Third Term"];

export default function StaffResultsList() {
    const navigate = useNavigate();
    const { sessions: metaSessions, terms: metaTerms, error: metaError } = useStaffMeta();

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [publishingId, setPublishingId] = useState(null);
    const [publishStatus, setPublishStatus] = useState(null);
    const [publishTarget, setPublishTarget] = useState(null);

    const [session, setSession] = useState("");
    const [term, setTerm] = useState("");

    const token = localStorage.getItem("token");

    // Union live sessions + known fallback so a newly created session (e.g. 2026/2027)
    // still shows even if the cached /api/staff/meta response hasn't caught up yet.
    const sessionOptions = Array.from(
        new Set([...metaSessions.map((s) => s.name), ...fallbackSessions])
    ).sort();
    const termOptions = metaTerms.length > 0 ? metaTerms : fallbackTerms;

    useEffect(() => {
        if (sessionOptions.length > 0 && !session) {
            const current = metaSessions.find((s) => s.isCurrent);
            if (current) {
                setSession(current.name);
            } else if (sessionOptions.includes("2026/2027")) {
                setSession("2026/2027");
            } else {
                setSession(sessionOptions[sessionOptions.length - 1]);
            }
        }
        if (termOptions.length > 0 && !term) {
            setTerm(termOptions[termOptions.length - 1]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionOptions.length, termOptions.length]);

    useEffect(() => {
        fetch(`${BASE_URL}/api/staff/results/students`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load students.");
                return res.json();
            })
            .then((data) => setStudents(data.data || []))
            .catch(() => setError("Failed to load students."))
            .finally(() => setLoading(false));
    }, []);

    // Use the real Mongo id for routing/API calls — studentId is just the display registration number
    const handleUpload = (student) => {
        navigate(`/portal/staff/results/${encodeURIComponent(student.id)}`);
    };

    const handlePublishOne = async (student) => {
        // CBT-style caution on Publish (not on Save): published results lock —
        // backend refuses edits with 403 "already published and can no longer
        // be edited", so warn first with the same confirm-modal feel as CBT.
        if (!session || !term) {
            setPublishStatus({ type: "error", message: "Please select a session/term." });
            return;
        }
        setPublishTarget(student);
    };

    const confirmPublish = async () => {
        const student = publishTarget;
        if (!student || publishingId) return;
        setPublishTarget(null);
        setPublishingId(student.id);
        setPublishStatus(null);
        try {
            const res = await fetch(
                `${BASE_URL}/api/staff/results/${encodeURIComponent(student.id)}/publish`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({ session, term }),
                }
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "Failed to publish result.");

            setStudents((prev) =>
                prev.map((s) => (s.id === student.id ? { ...s, isFinal: true } : s))
            );
            setPublishStatus({ type: "success", message: data.message || "Result published." });
        } catch (err) {
            setPublishStatus({ type: "error", message: err.message || "Failed to publish result." });
        } finally {
            setPublishingId(null);
        }
    };

    if (loading) return <div className="srl-page"><p>Loading students...</p></div>;
    if (error) return <div className="srl-page"><p className="srl-error">{error}</p></div>;

    return (
        <div className="srl-page">
            <h1 className="srl-title">Results</h1>
            <p className="srl-sub">upload students results and comment on their performances</p>

            {metaError && (
                <p className="srl-status srl-status--error">
                    Couldn't load live sessions/terms — using default list. ({metaError})
                </p>
            )}

            <div className="srl-selectors">
                <select
                    className="srl-select"
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                >
                    {sessionOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                <select
                    className="srl-select"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                >
                    {termOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>

            {publishStatus && (
                <p className={`srl-status srl-status--${publishStatus.type}`}>
                    {publishStatus.message}
                </p>
            )}

            <div className="srl-table-card">
                <div className="srl-table-wrap">
                    <table className="srl-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Student ID</th>
                                <th>Sex</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s) => (
                                <tr key={s.id}>
                                    <td className="srl-name">{s.name}</td>
                                    <td>{s.studentId}</td>
                                    <td>{s.sex}</td>
                                    <td>
                                        <div className="srl-actions">
                                            <button
                                                className="srl-upload-btn"
                                                onClick={() => handleUpload(s)}
                                            >
                                                Upload Result
                                            </button>
                                            <button
                                                className="srl-publish-btn"
                                                onClick={() => handlePublishOne(s)}
                                                disabled={s.isFinal || publishingId === s.id}
                                            >
                                                {s.isFinal
                                                    ? "Published ✓"
                                                    : publishingId === s.id
                                                        ? "Publishing..."
                                                        : "Publish"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {students.length === 0 && (
                <p className="srl-empty">No students found in your class.</p>
            )}

            {/* Publish confirmation — same caution pattern as CBT submit: this locks the result */}
            {publishTarget && (
                <div className="srl-modal-overlay" onClick={() => setPublishTarget(null)}>
                    <div className="srl-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="srl-confirm-title">Publish Result?</h3>
                        <p className="srl-confirm-text">
                            You are about to publish <strong>{publishTarget.name}</strong>'s result
                            for <strong>{session} · {term}</strong>.
                        </p>
                        <p className="srl-confirm-warning">
                            ⚠ Important: You cannot edit this result after you publish it.
                        </p>
                        <div className="srl-confirm-actions">
                            <button
                                className="srl-confirm-btn srl-confirm-btn--cancel"
                                onClick={() => setPublishTarget(null)}
                                disabled={!!publishingId}
                            >
                                Cancel
                            </button>
                            <button
                                className="srl-confirm-btn srl-confirm-btn--publish"
                                onClick={confirmPublish}
                                disabled={!!publishingId}
                            >
                                Publish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

