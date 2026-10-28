import { useEffect, useState } from "react";
import "./6Classes.css";
import { useMeta } from "../../hooks/useMeta";
import { normalizeClassesPayload } from "../../hooks/useClasses.jsx";

const BASE_URL = "https://penworld-gloryseed-demo-school-back.vercel.app";
const CLASSES_ENDPOINT = `${BASE_URL}/api/admin/classes`;
const STAFF_ENDPOINT = `${BASE_URL}/api/admin/staff`;
const SESSIONS_ENDPOINT = `${BASE_URL}/api/admin/sessions`;
const PROMOTE_ENDPOINT = `${BASE_URL}/api/admin/promote`;

// No hardcoded fallback — the class table always renders the live
// /api/admin/classes payload (28 sectioned classes). Shows empty on failure.
const emptyForm = { name: "", code: "", level: "", grade: "", academicSession: "" };
const emptySessionForm = { startYear: "", endYear: "" };

export default function AdminClasses() {
    const { sessions: metaSessions, refetch: refetchMeta } = useMeta();

    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    // ===== Delete class state =====
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteClassKey, setDeleteClassKey] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    // ===== Sessions section state =====
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [sessionsError, setSessionsError] = useState("");

    const [showSessionModal, setShowSessionModal] = useState(false);
    const [sessionForm, setSessionForm] = useState(emptySessionForm);
    const [creatingSession, setCreatingSession] = useState(false);
    const [sessionFormError, setSessionFormError] = useState("");

    const [showPromotePrompt, setShowPromotePrompt] = useState(false);
    const [promoting, setPromoting] = useState(false);
    const [promoteResult, setPromoteResult] = useState(null);
    const [promoteError, setPromoteError] = useState("");

    const token = localStorage.getItem("token");

    async function loadClassData() {
        setLoading(true);
        setError(null);

        try {
            const headers = { "Authorization": `Bearer ${token}` };

            const [classesRes, staffRes] = await Promise.all([
                fetch(CLASSES_ENDPOINT, { method: "GET", headers }),
                fetch(STAFF_ENDPOINT, { method: "GET", headers }),
            ]);

            if (!classesRes.ok || !staffRes.ok) {
                throw new Error("Failed to load class data");
            }

            const classesResult = await classesRes.json();
            const staffResult = await staffRes.json();

            // /api/admin/classes returns { data, classOptions, classNames, ... } where
            // `data` itself may be the legacy array. Normalize handles every shape.
            const normalized = normalizeClassesPayload(classesResult);
            const fetchedClasses = normalized.classes.length > 0 ? normalized.classes : normalized.options;
            const staffList = staffResult.data || [];

            if (fetchedClasses.length === 0) {
                setClasses([]);
                return;
            }

            const nameByStaffId = {};
            const addIdName = (key, name) => {
                if (key === undefined || key === null || key === "") return;
                nameByStaffId[String(key)] = name;
                nameByStaffId[String(key).trim()] = name;
            };
            staffList.forEach((s) => {
                addIdName(s.staffId, s.name);
                addIdName(s.id, s.name);
                addIdName(s._id, s.name);
            });

            // Fallback: derive teacher from staff.role ("Class Teacher <ClassName>")
            // because some backends never write Class.teacher back on role assignment.
            const normKey = (v) =>
                String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
            const teacherByClassKey = {};
            staffList.forEach((s) => {
                const role = String(s.role || "");
                const m = role.match(/^\s*class\s*teacher\s+(.+?)\s*$/i);
                if (m && s.name && !teacherByClassKey[normKey(m[1])]) {
                    teacherByClassKey[normKey(m[1])] = s.name;
                }
            });

            const resolveTeacherName = (c) => {
                // 1) Direct reference stored on the class (id, staffId, object, or name)
                let ref =
                    c.classTeacher ?? c.teacherId ?? c.teacher ??
                    c.class_teacher ?? c.teacher_id ?? null;
                if (ref && typeof ref === "object") {
                    const refName = ref.name || ref.fullName || ref.staffName;
                    const refId = ref.staffId || ref.id || ref._id;
                    if (refId && nameByStaffId[String(refId)]) return nameByStaffId[String(refId)];
                    if (refName) return refName;
                    ref = refId || refName || null;
                }
                if (ref !== undefined && ref !== null && String(ref).trim() !== "") {
                    const hit =
                        nameByStaffId[String(ref)] || nameByStaffId[String(ref).trim()];
                    if (hit) return hit;
                    // ref already looks like a human name (not a bare id) — show it
                    if (/\s/.test(String(ref).trim())) return String(ref).trim();
                }
                // 2) Fallback: staff whose role targets this class
                for (const key of [c.value, c.name, c.label]) {
                    const hit = key ? teacherByClassKey[normKey(key)] : null;
                    if (hit) return hit;
                }
                // 3) Last resort: raw ref if it exists, else unassigned
                if (ref !== undefined && ref !== null && String(ref).trim() !== "") {
                    return String(ref).trim();
                }
                return "Not assigned";
            };

            const merged = fetchedClasses.map((c) => ({
                ...c,
                teacherName: resolveTeacherName(c),
            }));

            setClasses(merged);
        } catch (err) {
            setError(err.message);
            setClasses([]);
        } finally {
            setLoading(false);
        }
    }

    async function loadSessions() {
        setSessionsLoading(true);
        setSessionsError("");
        try {
            const res = await fetch(SESSIONS_ENDPOINT, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to load sessions.");
            const data = await res.json();
            setSessions(data.data || []);
        } catch (err) {
            setSessionsError(err.message || "Failed to load sessions.");
        } finally {
            setSessionsLoading(false);
        }
    }

    useEffect(() => {
        loadClassData();
        loadSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openAddModal = () => {
        setForm({
            ...emptyForm,
            academicSession: metaSessions[0] ? (typeof metaSessions[0] === "string" ? metaSessions[0] : metaSessions[0].name) : "",
        });
        setFormError("");
        setShowAddModal(true);
    };

    const handleFormChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddClass = async () => {
        if (!form.name.trim() || !form.code.trim() || !form.level.trim() || !form.grade || !form.academicSession) {
            setFormError("Please fill in all fields.");
            return;
        }

        setSubmitting(true);
        setFormError("");
        try {
            const res = await fetch(CLASSES_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: form.name.trim(),
                    code: form.code.trim(),
                    level: form.level.trim(),
                    grade: Number(form.grade),
                    academicSession: form.academicSession,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to create class.");

            setShowAddModal(false);
            await refetchMeta(); // so other pages' class dropdowns pick up the new class too
            loadClassData(); // refresh this page's table
        } catch (err) {
            setFormError(err.message || "Failed to create class.");
        } finally {
            setSubmitting(false);
        }
    };

    // ===== Delete class =====
    const openDeleteModal = () => {
        setDeleteClassKey("");
        setDeleteConfirm(false);
        setDeleteError("");
        setShowDeleteModal(true);
    };

    const selectedDeleteClass = classes.find(
        (c) => String(c.id ?? c.value ?? c.name) === String(deleteClassKey)
    ) || null;

    const handleDeleteClass = async () => {
        if (!deleteClassKey) {
            setDeleteError("Please select which class you want to delete.");
            return;
        }
        if (!deleteConfirm) {
            setDeleteError("Please confirm by ticking the checkbox before deleting.");
            return;
        }

        const target = selectedDeleteClass;
        const idOrName = target?.id ?? target?.value ?? target?.name ?? deleteClassKey;

        setDeleting(true);
        setDeleteError("");
        try {
            // Try id-based delete first, fall back to name-based if backend expects that.
            const candidates = [
                `${CLASSES_ENDPOINT}/${encodeURIComponent(idOrName)}`,
            ];
            if (target?.name && String(target.name) !== String(idOrName)) {
                candidates.push(`${CLASSES_ENDPOINT}/${encodeURIComponent(target.name)}`);
            }

            let lastError = "";
            let deleted = false;
            for (const url of candidates) {
                const res = await fetch(url, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` },
                });
                let data = null;
                try { data = await res.json(); } catch { data = null; }
                if (res.ok) { deleted = true; break; }
                // If backend has no DELETE route at all, stop and surface a clear message.
                if (res.status === 404 || res.status === 405) {
                    lastError = data?.message || "Delete is not supported by the backend yet (no DELETE /api/admin/classes/:id route).";
                    break;
                }
                lastError = data?.message || "Failed to delete class.";
            }

            if (!deleted) throw new Error(lastError || "Failed to delete class.");

            setShowDeleteModal(false);
            setDeleteClassKey("");
            setDeleteConfirm(false);
            await refetchMeta();
            loadClassData();
        } catch (err) {
            setDeleteError(err.message || "Failed to delete class.");
        } finally {
            setDeleting(false);
        }
    };

    // ===== Sessions: create =====
    const openSessionModal = () => {
        setSessionForm(emptySessionForm);
        setSessionFormError("");
        setShowSessionModal(true);
    };

    const handleSessionFormChange = (field, value) => {
        setSessionForm((prev) => ({ ...prev, [field]: value }));
    };

    // Auto-generated preview name, e.g. "2026/2027"
    const previewSessionName =
        sessionForm.startYear && sessionForm.endYear
            ? `${sessionForm.startYear}/${sessionForm.endYear}`
            : "";

    const handleCreateSession = async () => {
        if (!sessionForm.startYear || !sessionForm.endYear) {
            setSessionFormError("Please fill in both the start and end year.");
            return;
        }
        const startYear = Number(sessionForm.startYear);
        const endYear = Number(sessionForm.endYear);
        if (endYear !== startYear + 1) {
            setSessionFormError("End year should be exactly one year after the start year.");
            return;
        }

        setCreatingSession(true);
        setSessionFormError("");
        try {
            const res = await fetch(SESSIONS_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: `${startYear}/${endYear}`,
                    startYear,
                    endYear,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to create session.");

            setShowSessionModal(false);
            await refetchMeta(); // Add Class modal's academic session dropdown updates immediately
            loadSessions();
            setPromoteResult(null);
            setPromoteError("");
            setShowPromotePrompt(true); // ask whether to promote students now that a new session exists
        } catch (err) {
            setSessionFormError(err.message || "Failed to create session.");
        } finally {
            setCreatingSession(false);
        }
    };

    // ===== Sessions: promote =====
    const handlePromote = async () => {
        setPromoting(true);
        setPromoteError("");
        setPromoteResult(null);
        try {
            const res = await fetch(PROMOTE_ENDPOINT, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to promote students.");

            setPromoteResult(data.data || null);
            loadClassData(); // class counts will have shifted
        } catch (err) {
            setPromoteError(err.message || "Failed to promote students.");
        } finally {
            setPromoting(false);
        }
    };

    return (
        <div className="adc-page">
            <h1 className="adc-title">Classes</h1>
            <p className="adc-subtitle">Find below the available classes at your school</p>

            {error && <p className="adc-error">Couldn't load class data: {error}</p>}

            <div className="adc-table-wrap">
                <table className="adc-table">
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Teacher</th>
                            <th>No in class</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3}>Loading…</td></tr>
                        ) : (
                            classes.map((c, i) => (
                                <tr key={c.id || c.value || c.name || i}>
                                    <td>{c.label || c.name || c.value}</td>
                                    <td>{c.teacherName || (c.classTeacher ? c.classTeacher : "Not assigned")}</td>
                                    <td>{c.studentCount ?? c.count ?? 0}{c.capacity ? ` / ${c.capacity}` : ""}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="adc-actions">
                <button className="adc-add-btn" onClick={openAddModal}>
                    Add Class
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8zm2 16H8v-2h8zm0-4H8v-2h8zm-3-5V3.5L18.5 9z"
                        />
                    </svg>
                </button>

                <button className="adc-add-btn adc-add-btn--danger" onClick={openDeleteModal}>
                    Delete Class
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                        />
                    </svg>
                </button>
            </div>

            {/* ===== Classes/Sessions ===== */}
            <div className="adc-sessions-section">
                <h2 className="adc-sessions-title">Classes/Sessions</h2>
                <p className="adc-subtitle">Manage academic sessions and promote students to the next class</p>

                {sessionsError && <p className="adc-error">Couldn't load sessions: {sessionsError}</p>}

                <div className="adc-table-wrap">
                    <table className="adc-table">
                        <thead>
                            <tr>
                                <th>Session</th>
                                <th>Start Year</th>
                                <th>End Year</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessionsLoading ? (
                                <tr><td colSpan={4}>Loading…</td></tr>
                            ) : sessions.length === 0 ? (
                                <tr><td colSpan={4}>No sessions yet — add one below.</td></tr>
                            ) : (
                                sessions.map((s) => (
                                    <tr key={s._id}>
                                        <td>{s.name}</td>
                                        <td>{s.startYear}</td>
                                        <td>{s.endYear}</td>
                                        <td>
                                            {s.isCurrent ? (
                                                <span className="adc-session-badge adc-session-badge--current">Current</span>
                                            ) : (
                                                <span className="adc-session-badge">Past</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="adc-sessions-actions">
                    <button className="adc-add-btn" onClick={openSessionModal}>
                        Add Session
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zm-7-9h-2v2H8v2h2v2h2v-2h2v-2h-2z" />
                        </svg>
                    </button>
                    <button
                        className="adc-add-btn adc-add-btn--secondary"
                        onClick={() => {
                            setPromoteResult(null);
                            setPromoteError("");
                            setShowPromotePrompt(true);
                        }}
                    >
                        Promote Students
                    </button>
                </div>

                {promoteResult && (
                    <p className="adc-promote-summary">
                        Promotion complete — {promoteResult.promoted} promoted, {promoteResult.graduated} graduated, {promoteResult.skipped} skipped.
                    </p>
                )}
            </div>

            {/* Add Class modal */}
            {showAddModal && (
                <div className="adc-modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="adc-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="adc-modal-title">Add Class</h3>

                        <div className="adc-modal-form">
                            <label className="adc-modal-label">
                                Class name
                                <input
                                    type="text"
                                    className="adc-modal-input"
                                    placeholder="e.g. JSS 1"
                                    value={form.name}
                                    onChange={(e) => handleFormChange("name", e.target.value)}
                                />
                            </label>

                            <label className="adc-modal-label">
                                Code
                                <input
                                    type="text"
                                    className="adc-modal-input"
                                    placeholder="e.g. JSS1"
                                    value={form.code}
                                    onChange={(e) => handleFormChange("code", e.target.value)}
                                />
                            </label>

                            <label className="adc-modal-label">
                                Level
                                <select
                                    className="adc-modal-input"
                                    value={form.level}
                                    onChange={(e) => handleFormChange("level", e.target.value)}
                                >
                                    <option value="" disabled>Select level...</option>
                                    <option value="creche">Creche</option>
                                    <option value="nursery">Nursery</option>
                                    <option value="primary">Primary</option>
                                    <option value="junior-secondary">Junior Secondary (JSS)</option>
                                    <option value="senior-secondary">Senior Secondary (SSS)</option>
                                    <option value="other">Other</option>
                                </select>
                            </label>

                            <label className="adc-modal-label">
                                Grade
                                <input
                                    type="number"
                                    min="1"
                                    className="adc-modal-input"
                                    placeholder="e.g. 1 (for Primary 1, JSS 1, etc.)"
                                    value={form.grade}
                                    onChange={(e) => handleFormChange("grade", e.target.value)}
                                />
                            </label>

                            <label className="adc-modal-label">
                                Academic session
                                <select
                                    className="adc-modal-input"
                                    value={form.academicSession}
                                    onChange={(e) => handleFormChange("academicSession", e.target.value)}
                                >
                                    {metaSessions.length === 0 && (
                                        <option value="" disabled>No sessions yet — add one first</option>
                                    )}
                                    {metaSessions.map((s) => {
                                        const name = typeof s === "string" ? s : s.name;
                                        return <option key={name} value={name}>{name}</option>;
                                    })}
                                </select>
                            </label>
                        </div>

                        {formError && <p className="adc-error">{formError}</p>}

                        <div className="adc-modal-actions">
                            <button
                                className="adc-modal-btn adc-modal-btn--cancel"
                                onClick={() => setShowAddModal(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="adc-modal-btn adc-modal-btn--submit"
                                onClick={handleAddClass}
                                disabled={submitting}
                            >
                                {submitting ? "Adding..." : "Add Class"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Class modal — step 1: ask which class to delete */}
            {showDeleteModal && (
                <div className="adc-modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="adc-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="adc-modal-title">Delete Class</h3>
                        <p className="adc-modal-text">
                            Which class do you want to delete? This cannot be undone.
                        </p>

                        <div className="adc-modal-form">
                            <label className="adc-modal-label">
                                Select class
                                <select
                                    className="adc-modal-input"
                                    value={deleteClassKey}
                                    onChange={(e) => {
                                        setDeleteClassKey(e.target.value);
                                        setDeleteConfirm(false);
                                        setDeleteError("");
                                    }}
                                >
                                    <option value="" disabled>Choose a class...</option>
                                    {classes.map((c, i) => {
                                        const key = String(c.id ?? c.value ?? c.name ?? i);
                                        const label = c.label || c.name || c.value || key;
                                        return <option key={key} value={key}>{label}</option>;
                                    })}
                                </select>
                            </label>

                            {selectedDeleteClass && (
                                <p className="adc-delete-preview">
                                    Selected: <strong>{selectedDeleteClass.label || selectedDeleteClass.name}</strong>
                                    {selectedDeleteClass.teacherName && selectedDeleteClass.teacherName !== "Not assigned"
                                        ? ` — Class teacher: ${selectedDeleteClass.teacherName}`
                                        : ""}
                                    {(selectedDeleteClass.studentCount ?? selectedDeleteClass.count ?? 0) > 0
                                        ? ` — ${selectedDeleteClass.studentCount ?? selectedDeleteClass.count} student(s) in this class`
                                        : ""}
                                </p>
                            )}

                            <label className="adc-delete-confirm">
                                <input
                                    type="checkbox"
                                    checked={deleteConfirm}
                                    disabled={!deleteClassKey}
                                    onChange={(e) => setDeleteConfirm(e.target.checked)}
                                />
                                Yes, I understand this class will be permanently deleted.
                            </label>
                        </div>

                        {deleteError && <p className="adc-error">{deleteError}</p>}

                        <div className="adc-modal-actions">
                            <button
                                className="adc-modal-btn adc-modal-btn--cancel"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="adc-modal-btn adc-modal-btn--danger"
                                onClick={handleDeleteClass}
                                disabled={deleting || !deleteClassKey}
                            >
                                {deleting ? "Deleting..." : "Delete Class"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Session modal */}
            {showSessionModal && (
                <div className="adc-modal-overlay" onClick={() => setShowSessionModal(false)}>
                    <div className="adc-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="adc-modal-title">Add Session</h3>

                        <div className="adc-modal-form">
                            <label className="adc-modal-label">
                                Start year
                                <input
                                    type="number"
                                    className="adc-modal-input"
                                    placeholder="e.g. 2026"
                                    value={sessionForm.startYear}
                                    onChange={(e) => handleSessionFormChange("startYear", e.target.value)}
                                />
                            </label>

                            <label className="adc-modal-label">
                                End year
                                <input
                                    type="number"
                                    className="adc-modal-input"
                                    placeholder="e.g. 2027"
                                    value={sessionForm.endYear}
                                    onChange={(e) => handleSessionFormChange("endYear", e.target.value)}
                                />
                            </label>

                            {previewSessionName && (
                                <p className="adc-session-preview">Session name: <strong>{previewSessionName}</strong></p>
                            )}
                        </div>

                        {sessionFormError && <p className="adc-error">{sessionFormError}</p>}

                        <div className="adc-modal-actions">
                            <button
                                className="adc-modal-btn adc-modal-btn--cancel"
                                onClick={() => setShowSessionModal(false)}
                                disabled={creatingSession}
                            >
                                Cancel
                            </button>
                            <button
                                className="adc-modal-btn adc-modal-btn--submit"
                                onClick={handleCreateSession}
                                disabled={creatingSession}
                            >
                                {creatingSession ? "Adding..." : "Add Session"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Promote confirmation */}
            {showPromotePrompt && (
                <div className="adc-modal-overlay" onClick={() => setShowPromotePrompt(false)}>
                    <div className="adc-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="adc-modal-title">Promote Students to Next Class?</h3>
                        <p className="adc-modal-text">
                            This moves every student up one class (e.g. JSS 1 → JSS 2). Students in SSS 3 will be marked as graduated.
                            Creche/Nursery students are skipped — the backend doesn't have a promotion path for them yet.
                            This cannot be undone.
                        </p>

                        {promoteError && <p className="adc-error">{promoteError}</p>}

                        <div className="adc-modal-actions">
                            <button
                                className="adc-modal-btn adc-modal-btn--cancel"
                                onClick={() => setShowPromotePrompt(false)}
                                disabled={promoting}
                            >
                                Not now
                            </button>
                            <button
                                className="adc-modal-btn adc-modal-btn--submit"
                                onClick={async () => {
                                    await handlePromote();
                                    setShowPromotePrompt(false);
                                }}
                                disabled={promoting}
                            >
                                {promoting ? "Promoting..." : "Promote Students"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

