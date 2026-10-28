import { useState, useEffect, useRef } from "react";
import "./3Student.css";
import AddStudentModal from "./4Add";
import { useMeta } from "../../hooks/useMeta";

const BASE_URL = "https://penworld-gloryseed-demo-school-back.vercel.app";

export default function AdminStudentsList() {
    // Live list from /api/admin/meta: classNames (plain strings, school order).
    const { classNames, classesByBase, loading: metaLoading, error: metaError, refetch: refetchMeta } = useMeta();
    const classOptions = classNames.length > 0 ? classNames : [];
    const didFallbackLoad = useRef(false);

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [classFilter, setClassFilter] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [resetTarget, setResetTarget] = useState(null);
    const [actionError, setActionError] = useState("");

    const token = localStorage.getItem("token");

    const loadStudents = (cls) => {
        setLoading(true);
        setError("");
        const url = cls
            ? `${BASE_URL}/api/admin/students?class=${encodeURIComponent(cls)}`
            : `${BASE_URL}/api/admin/students`;
        fetch(url, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load students.");
                return res.json();
            })
            .then((result) => {
                // Response shape: { success, data: [...] } — data is a plain array
                setStudents(result.data || []);
            })
            .catch(() => {
                setError("Failed to load students.");
                setStudents([]);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (classFilter) loadStudents(classFilter);
    }, [classFilter]);

    // Once the live list arrives, default to the first class (Creche 1 Gaa-Akanbi).
    // Also resolves a stale stored value like "JSS 2" to its live full name.
    useEffect(() => {
        if (classOptions.length === 0) return;
        if (!classFilter) {
            setClassFilter(classOptions[0]);
        } else if (!classOptions.includes(classFilter)) {
            const resolved = classesByBase?.[classFilter]?.[0];
            setClassFilter(
                typeof resolved === "string" ? resolved : resolved?.name || resolved?.value || classOptions[0]
            );
        }
    }, [classOptions]);

    // Fallback: if meta finished but yielded no classes (backend unreachable or
    // empty), stop spinning and try an unfiltered load so the page never sticks
    // on "Loading students..." forever.
    useEffect(() => {
        if (metaLoading || classOptions.length > 0 || classFilter || didFallbackLoad.current) return;
        didFallbackLoad.current = true;
        loadStudents("");
    }, [metaLoading, classOptions, classFilter]);

    const openAddModal = () => {
        setEditingStudent(null);
        setActionError("");
        setModalOpen(true);
    };

    const openEditModal = (student) => {
        setEditingStudent(student);
        setActionError("");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingStudent(null);
    };

    const handleModalSubmit = async (form) => {
        const sexLetter = form.sex === "Male" ? "M" : form.sex === "Female" ? "F" : form.sex;
        const payload = {
            surname: form.surname,
            otherNames: form.otherNames,
            sex: sexLetter,
            studentClass: form.studentClass || classFilter,
        };

        setActionError("");
        try {
            if (editingStudent) {
                const res = await fetch(`${BASE_URL}/api/admin/students/${editingStudent.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to update student.");
            } else {
                const res = await fetch(`${BASE_URL}/api/admin/students`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to add student.");
            }
            closeModal();
            loadStudents(classFilter);
        } catch (err) {
            setActionError(err.message || "Something went wrong. Please try again.");
        }
    };

    const confirmDelete = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/students/${deleteTarget.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to remove student.");
            }
            setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        } catch (err) {
            setError(err.message || "Failed to remove student.");
        } finally {
            setDeleteTarget(null);
        }
    };

    if (loading) return <div className="stu-page"><p>Loading students...</p></div>;

    return (
        <div className="stu-page">
            <h1 className="stu-title">Students</h1>
            <p className="stu-sub">Add, assign class and manage student details</p>

            <select
                className="stu-class-filter"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                disabled={metaLoading || classOptions.length === 0}
            >
                {classOptions.length === 0 && (
                    <option value="">{metaLoading ? "Loading classes..." : "No classes found"}</option>
                )}
                {classOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                ))}
            </select>

            {error && <p className="stu-error">{error}</p>}
            {!metaLoading && classOptions.length === 0 && (
                <p className="stu-error">
                    {metaError ? `Could not load classes: ${metaError}. ` : "No classes found on the server. "}
                    <button
                        type="button"
                        style={{ marginLeft: 8, textDecoration: "underline", cursor: "pointer" }}
                        onClick={() => { didFallbackLoad.current = false; refetchMeta(); }}
                    >
                        Retry
                    </button>
                </p>
            )}

            <div className="stu-table-card">
                <div className="stu-table-wrap">
                    <table className="stu-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Student ID</th>
                                <th>Sex</th>
                                <th>Class</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s) => (
                                <tr key={s.id}>
                                    <td className="stu-name">{s.name}</td>
                                    <td>{s.studentId}</td>
                                    <td>{s.sex}</td>
                                    <td>{s.class}</td>
                                    <td>
                                        <div className="stu-actions">
                                            <span>Edit details</span>
                                            <button
                                                className="stu-icon-btn stu-icon-btn--edit"
                                                onClick={() => openEditModal(s)}
                                                aria-label="Edit student"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                                                    <path d="M0 0h24v24H0z" fill="none" />
                                                    <path fill="currentColor" d="M3.548 20.938h16.9a.5.5 0 0 0 0-1h-16.9a.5.5 0 0 0 0 1M9.71 17.18a2.6 2.6 0 0 0 1.12-.65l9.54-9.54a1.75 1.75 0 0 0 0-2.47l-.94-.93a1.79 1.79 0 0 0-2.47 0l-9.54 9.53a2.5 2.5 0 0 0-.64 1.12L6.04 17a.74.74 0 0 0 .19.72a.77.77 0 0 0 .53.22Zm.41-1.36a1.47 1.47 0 0 1-.67.39l-.97.26l-1-1l.26-.97a1.5 1.5 0 0 1 .39-.67l.38-.37l1.99 1.99Zm1.09-1.08l-1.99-1.99l6.73-6.73l1.99 1.99Zm8.45-8.45L18.65 7.3l-1.99-1.99l1.01-1.02a.75.75 0 0 1 1.06 0l.93.94a.754.754 0 0 1 0 1.06" />
                                                </svg>
                                            </button>
                                            <button
                                                className="stu-icon-btn stu-icon-btn--delete"
                                                onClick={() => setDeleteTarget(s)}
                                                aria-label="Delete student"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                                                    <path d="M0 0h24v24H0z" fill="none" />
                                                    <path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z" />
                                                </svg>
                                            </button>
                                            <button
                                                className="stu-icon-btn stu-icon-btn--lock"
                                                onClick={() => setResetTarget(s)}
                                                aria-label="Reset password"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                                                    <path d="M0 0h24v24H0z" fill="none" />
                                                    <path fill="currentColor" d="M12.63 2c5.53 0 10.01 4.5 10.01 10s-4.48 10-10.01 10c-3.51 0-6.58-1.82-8.37-4.57l1.58-1.25C7.25 18.47 9.76 20 12.64 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8C8.56 4 5.2 7.06 4.71 11h2.76l-3.74 3.73L0 11h2.69c.5-5.05 4.76-9 9.94-9m2.96 8.24c.5.01.91.41.91.92v4.61c0 .5-.41.92-.92.92h-5.53c-.51 0-.92-.42-.92-.92v-4.61c0-.51.41-.91.91-.92V9.23c0-1.53 1.25-2.77 2.77-2.77c1.53 0 2.78 1.24 2.78 2.77zm-2.78-2.38c-.75 0-1.37.61-1.37 1.37v1.01h2.75V9.23c0-.76-.62-1.37-1.38-1.37" />
                                                </svg>

                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {students.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="stu-empty-row">
                                        No students in {classFilter} yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="stu-add-row">
                <button className="stu-add-btn" onClick={openAddModal}>
                    Add Student
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                </button>
            </div>

            {actionError && <p className="stu-error">{actionError}</p>}

            <AddStudentModal
                isOpen={modalOpen}
                onClose={closeModal}
                onSubmit={handleModalSubmit}
                editingStudent={editingStudent}
                defaultClass={classFilter}
                classOptions={classOptions}
            />

            {deleteTarget && (
                <div className="stu-modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="stu-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="stu-confirm-title">Remove Student?</h3>
                        <p className="stu-confirm-text">
                            Are you sure you want to remove <strong>{deleteTarget.name}</strong> from the student list? This cannot be undone.
                        </p>
                        <div className="stu-confirm-actions">
                            <button
                                className="stu-confirm-btn stu-confirm-btn--cancel"
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="stu-confirm-btn stu-confirm-btn--delete"
                                onClick={confirmDelete}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {resetTarget && (
                <ResetPasswordModal
                    student={resetTarget}
                    token={token}
                    onClose={() => setResetTarget(null)}
                />
            )}
        </div>
    );
}

function ResetPasswordModal({ student, token, onClose }) {
    const [newPassword, setNewPassword] = useState("");
    const [status, setStatus] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleReset = async () => {
        setSubmitting(true);
        setStatus(null);
        try {
            const trimmed = newPassword.trim();
            const usingCustomPassword = trimmed.length >= 6;
            const body = usingCustomPassword ? { newPassword: trimmed } : {};

            const res = await fetch(
                `${BASE_URL}/api/admin/students/${student.id}/reset-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to reset password.");

            setStatus({
                type: "success",
                message: `Password reset for ${student.name}.`,
                password: data.data?.newPassword || trimmed,
            });
        } catch (err) {
            setStatus({ type: "error", message: err.message || "Failed to reset password." });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="stu-modal-overlay" onClick={onClose}>
            <div className="stu-reset-modal" onClick={(e) => e.stopPropagation()}>
                <button className="stu-modal-close" onClick={onClose} aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </button>

                <h3 className="stu-reset-title">Reset Password</h3>
                <p className="stu-reset-sub">
                    Set a new password for <strong>{student.name}</strong> ({student.studentId})
                </p>
                <p className="stu-reset-hint">
                    Leave blank to auto-generate a password, or type one (min. 6 characters).
                </p>

                <div className="stu-reset-field-row">
                    <input
                        type="text"
                        className="stu-input"
                        placeholder="New password (optional)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={status?.type === "success"}
                    />
                </div>

                {status?.type === "success" && (
                    <div className="stu-reset-result">
                        <p className="stu-reset-result-label">New password:</p>
                        <p className="stu-reset-result-value">{status.password}</p>
                    </div>
                )}

                {status && (
                    <p className={`stu-reset-status stu-reset-status--${status.type}`}>
                        {status.message}
                    </p>
                )}

                <button className="stu-submit-btn" onClick={handleReset} disabled={submitting || status?.type === "success"}>
                    {submitting ? "Resetting..." : status?.type === "success" ? "Password Reset" : "Reset Password"}
                </button>
            </div>
        </div>
    );
}

