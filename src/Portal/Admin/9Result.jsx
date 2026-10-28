import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMeta } from "../../hooks/useMeta";
import "./9Result.css";

const BASE_URL = "https://penworld-gloryseed-demo-school-back.vercel.app";

// Terms are hardcoded/stable per the backend docs, so no need to pull these from meta.
const TERM_OPTIONS = [
    { value: "first", label: "First Term" },
    { value: "second", label: "Second Term" },
    { value: "third", label: "Third Term" },
];
const TERM_LABELS = Object.fromEntries(TERM_OPTIONS.map((t) => [t.value, t.label]));

export default function AdminResultsList() {
    const navigate = useNavigate();
    const { classes, classNames, sessions: metaSessions, loading: metaLoading, error: metaError, refetch: refetchMeta } = useMeta();
    const liveNames = classNames.length > 0 ? classNames : classes.map((c) => c.value ?? c.name);

    const [session, setSession] = useState("");
    const [term, setTerm] = useState(TERM_OPTIONS[2].value);
    const [classLabel, setClassLabel] = useState("");

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [publishing, setPublishing] = useState(false);
    const [publishingId, setPublishingId] = useState(null);
    const [publishTarget, setPublishTarget] = useState(null);

    // Add Session modal state
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [newSessionName, setNewSessionName] = useState("");
    const [newSessionStart, setNewSessionStart] = useState("");
    const [newSessionEnd, setNewSessionEnd] = useState("");
    const [addingSession, setAddingSession] = useState(false);
    const [addSessionError, setAddSessionError] = useState("");

    const token = localStorage.getItem("token");

    // Once meta loads, default session to whichever one is marked current,
    // and default class to the first one in the live list.
    useEffect(() => {
        if (metaSessions.length > 0 && !session) {
            const current = metaSessions.find((s) => s.isCurrent) || metaSessions[0];
            setSession(current.name);
        }
        if (classes.length > 0 && !classLabel) {
            setClassLabel(classes[0].value ?? classes[0].name);
        }
    }, [metaSessions, classes, session, classLabel]);

    // Guard against a stale selection: after any refetch, if the held value
    // isn't in the live list, clear it so the table doesn't silently show nothing.
    useEffect(() => {
        if (liveNames.length > 0 && classLabel && !liveNames.includes(classLabel)) {
            setClassLabel("");
            setStudents([]);
        }
    }, [liveNames, classLabel]);

    const handleGetClassResults = async () => {
        setLoading(true);
        setLoadError("");
        setUploadStatus(null);
        try {
            const params = new URLSearchParams({ session, term: TERM_LABELS[term], classLabel });
            const res = await fetch(`${BASE_URL}/api/admin/results?${params}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to load class results.");
            const data = await res.json();
            // Confirmed shape: { success, data: [ { studentId, name, registrationId, sex, class, totalScore, subjectCount, isSubmitted, isFinal } ] }
            setStudents(data.data || []);
        } catch (err) {
            setLoadError(err.message || "Failed to load class results.");
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadResults = async () => {
        if (students.length === 0) return;
        setPublishing(true);
        setUploadStatus(null);
        try {
            const res = await fetch(`${BASE_URL}/api/admin/results/publish`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ session, term: TERM_LABELS[term], classLabel }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to publish results.");

            setUploadStatus({
                type: "success",
                message: `All results for ${classLabel} (${session}, ${TERM_LABELS[term]}) have been uploaded.`,
            });
            setStudents((prev) => prev.map((s) => ({ ...s, isFinal: true })));
        } catch (err) {
            setUploadStatus({ type: "error", message: err.message || "Failed to publish results." });
        } finally {
            setPublishing(false);
        }
    };

    // Publish a single student's result instead of the whole class.
    // CBT-style caution on Publish (not on upload): published results lock —
    // backend refuses edits with 403 "already published and can no longer
    // be edited", so warn first with a confirm modal before locking.
    const handlePublishOne = (student) => {
        if (!session || !term) {
            setUploadStatus({ type: "error", message: "Please select a session, term, and class." });
            return;
        }
        setPublishTarget(student);
    };

    const confirmPublishOne = async () => {
        const student = publishTarget;
        if (!student || publishingId) return;
        setPublishTarget(null);
        setPublishingId(student.studentId);
        setUploadStatus(null);
        try {
            const res = await fetch(
                `${BASE_URL}/api/admin/results/${encodeURIComponent(student.studentId)}/publish`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({ session, term: TERM_LABELS[term] }),
                }
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "Failed to publish result.");

            setStudents((prev) =>
                prev.map((s) => (s.studentId === student.studentId ? { ...s, isFinal: true } : s))
            );
            setUploadStatus({
                type: "success",
                message: data.message || "Result published.",
            });
        } catch (err) {
            setUploadStatus({ type: "error", message: err.message || "Failed to publish result." });
        } finally {
            setPublishingId(null);
        }
    };

    const handleViewResult = (student) => {
        navigate(`/portal/admin/results/${encodeURIComponent(student.studentId)}`, {
            state: { session, term: TERM_LABELS[term], classLabel },
        });
    };

    const handleEditResult = (student) => {
        navigate(`/portal/admin/results/${encodeURIComponent(student.studentId)}/edit`, {
            state: { session, term: TERM_LABELS[term], classLabel, student },
        });
    };

    const confirmDelete = async () => {
        try {
            const params = new URLSearchParams({ session, term: TERM_LABELS[term] });
            const res = await fetch(
                `${BASE_URL}/api/admin/results/${encodeURIComponent(deleteTarget.studentId)}?${params}`,
                {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` },
                }
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to delete result.");
            }
            setStudents((prev) => prev.filter((s) => s.studentId !== deleteTarget.studentId));
        } catch (err) {
            setLoadError(err.message || "Failed to delete result.");
        } finally {
            setDeleteTarget(null);
        }
    };

    // Add Session: opens a small form, POSTs to /api/admin/sessions, then
    // refreshes the shared meta cache so every page's dropdown updates immediately.
    const openSessionModal = () => {
        setNewSessionName("");
        setNewSessionStart("");
        setNewSessionEnd("");
        setAddSessionError("");
        setShowSessionModal(true);
    };

    const handleAddSession = async () => {
        if (!newSessionName.trim() || !newSessionStart || !newSessionEnd) {
            setAddSessionError("Please fill in the session name, start year, and end year.");
            return;
        }
        setAddingSession(true);
        setAddSessionError("");
        try {
            const res = await fetch(`${BASE_URL}/api/admin/sessions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: newSessionName.trim(),
                    startYear: Number(newSessionStart),
                    endYear: Number(newSessionEnd),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to create session.");

            await refetchMeta();
            setSession(newSessionName.trim());
            setShowSessionModal(false);
        } catch (err) {
            setAddSessionError(err.message || "Failed to create session.");
        } finally {
            setAddingSession(false);
        }
    };

    return (
        <div className="adr-page">
            <h1 className="adr-title">Results</h1>
            <p className="adr-sub">See below the available results by session, term and classes</p>

            {metaError && (
                <p className="adr-status adr-status--error">
                    Couldn't load sessions/classes ({metaError}).{" "}
                    <button type="button" className="adr-retry-link" onClick={refetchMeta}>
                        Retry
                    </button>
                </p>
            )}

            <div className="adr-selectors">
                <select
                    className="adr-select"
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                    disabled={metaLoading}
                >
                    {metaSessions.length === 0 && !metaLoading && (
                        <option value="" disabled>No sessions found — add one</option>
                    )}
                    {metaSessions.map((s) => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                </select>

                <button type="button" className="adr-add-session-btn" onClick={openSessionModal}>
                    + Add Session
                </button>

                <select
                    className="adr-select"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                >
                    {TERM_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>

                <select
                    className="adr-select"
                    value={classLabel}
                    onChange={(e) => setClassLabel(e.target.value)}
                    disabled={metaLoading}
                >
                    {classes.length === 0 && !metaLoading && (
                        <option value="" disabled>No classes found</option>
                    )}
                    {classes.map((c) => {
                        const val = c.value ?? c.name;
                        const label = c.label ?? c.name ?? val;
                        return <option key={c.id ?? val} value={val}>{label}</option>;
                    })}
                </select>
            </div>

            <div className="adr-action-row">
                <button className="adr-get-btn" onClick={handleGetClassResults} disabled={loading || metaLoading}>
                    {loading ? "Loading..." : "Get Class Results"}
                </button>
                <button
                    className="adr-upload-btn"
                    onClick={handleUploadResults}
                    disabled={students.length === 0 || publishing}
                >
                    {publishing ? "Uploading..." : "Publish All"}
                </button>
            </div>

            {loadError && <p className="adr-status adr-status--error">{loadError}</p>}
            {uploadStatus && (
                <p className={`adr-status adr-status--${uploadStatus.type}`}>
                    {uploadStatus.message}
                </p>
            )}

            {students.length > 0 && (
                <div className="adr-table-card">
                    <div className="adr-table-wrap">
                        <table className="adr-table">
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
                                    <tr key={s.studentId}>
                                        <td className="adr-name">{s.name || `${s.surname} ${s.otherNames}`}</td>
                                        <td>{s.registrationId}</td>
                                        <td>{s.sex}</td>
                                        <td>
                                            <div className="adr-actions">
                                                <button
                                                    className="adr-view-btn"
                                                    onClick={() => handleViewResult(s)}
                                                >
                                                    View Result
                                                </button>
                                                {!s.isFinal && (
                                                    <button
                                                        className="adr-view-btn"
                                                        onClick={() => handleEditResult(s)}
                                                    >
                                                        Add/Edit Result
                                                    </button>
                                                )}
                                                <button
                                                    className="adr-publish-btn"
                                                    onClick={() => handlePublishOne(s)}
                                                    disabled={s.isFinal || publishingId === s.studentId}
                                                >
                                                    {s.isFinal
                                                        ? "Published ✓"
                                                        : publishingId === s.studentId
                                                            ? "Publishing..."
                                                            : "Publish"}
                                                </button>
                                                <button
                                                    className="adr-icon-btn adr-icon-btn--delete"
                                                    onClick={() => setDeleteTarget(s)}
                                                    aria-label="Delete result"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 24 24">
                                                        <path d="M0 0h24v24H0z" fill="none" />
                                                        <path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z" />
                                                    </svg>

                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Publish confirmation — same caution pattern as CBT submit: this locks the result */}
            {publishTarget && (
                <div className="adr-modal-overlay" onClick={() => setPublishTarget(null)}>
                    <div className="adr-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="adr-confirm-title">Publish Result?</h3>
                        <p className="adr-confirm-text">
                            You are about to publish <strong>{publishTarget.name || `${publishTarget.surname} ${publishTarget.otherNames}`}</strong>'s result
                            for <strong>{session} · {TERM_LABELS[term]}</strong>.
                        </p>
                        <p className="adr-confirm-text adr-confirm-warning">
                            ⚠ Important: You cannot edit this result after you publish it.
                        </p>
                        <div className="adr-confirm-actions">
                            <button
                                className="adr-confirm-btn adr-confirm-btn--cancel"
                                onClick={() => setPublishTarget(null)}
                                disabled={!!publishingId}
                            >
                                Cancel
                            </button>
                            <button
                                className="adr-confirm-btn adr-confirm-btn--publish"
                                onClick={confirmPublishOne}
                                disabled={!!publishingId}
                            >
                                Publish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            {deleteTarget && (
                <div className="adr-modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="adr-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="adr-confirm-title">Delete Result?</h3>
                        <p className="adr-confirm-text">
                            Are you sure you want to delete the result for <strong>{deleteTarget.name}</strong>? This cannot be undone.
                        </p>
                        <div className="adr-confirm-actions">
                            <button
                                className="adr-confirm-btn adr-confirm-btn--cancel"
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="adr-confirm-btn adr-confirm-btn--delete"
                                onClick={confirmDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Session modal */}
            {showSessionModal && (
                <div className="adr-modal-overlay" onClick={() => setShowSessionModal(false)}>
                    <div className="adr-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="adr-confirm-title">Add Academic Session</h3>

                        <div className="adr-session-form">
                            <label className="adr-session-label">
                                Session name
                                <input
                                    type="text"
                                    className="adr-session-input"
                                    placeholder="e.g. 2026/2027"
                                    value={newSessionName}
                                    onChange={(e) => setNewSessionName(e.target.value)}
                                />
                            </label>

                            <label className="adr-session-label">
                                Start year
                                <input
                                    type="number"
                                    className="adr-session-input"
                                    placeholder="e.g. 2026"
                                    value={newSessionStart}
                                    onChange={(e) => setNewSessionStart(e.target.value)}
                                />
                            </label>

                            <label className="adr-session-label">
                                End year
                                <input
                                    type="number"
                                    className="adr-session-input"
                                    placeholder="e.g. 2027"
                                    value={newSessionEnd}
                                    onChange={(e) => setNewSessionEnd(e.target.value)}
                                />
                            </label>
                        </div>

                        {addSessionError && <p className="adr-status adr-status--error">{addSessionError}</p>}

                        <div className="adr-confirm-actions">
                            <button
                                className="adr-confirm-btn adr-confirm-btn--cancel"
                                onClick={() => setShowSessionModal(false)}
                                disabled={addingSession}
                            >
                                Cancel
                            </button>
                            <button
                                className="adr-confirm-btn"
                                onClick={handleAddSession}
                                disabled={addingSession}
                            >
                                {addingSession ? "Adding..." : "Add Session"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

