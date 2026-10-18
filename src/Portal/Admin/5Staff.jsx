import { useState, useEffect } from "react";
import "./5Staff.css";
import { useMeta } from "../../hooks/useMeta";

const BASE_URL = "https://penworld-demo-school-backend.vercel.app";

const emptyForm = { surname: "", otherNames: "", sex: "", role: "" };

export default function AdminStaffList() {
    // meta.roles is precomputed server-side ("Class Teacher JSS 1 Gaa-Akanbi", ...).
    // Fall back to deriving from live classNames so roles stay in sync even if meta.roles is empty.
    const { roles: metaRoles, classNames, loading: metaLoading } = useMeta();
    const roleOptions =
        metaRoles.length > 0
            ? metaRoles
            : ["Admin", "Teacher", ...classNames.map((n) => `Class Teacher ${n}`)];

    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [resetTarget, setResetTarget] = useState(null);

    const token = localStorage.getItem("token");

    const loadStaff = () => {
        setLoading(true);
        setError("");
        fetch(`${BASE_URL}/api/admin/staff`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load staff.");
                return res.json();
            })
            .then((result) => {
                const fetched = result.data || [];
                setStaffList(fetched);
            })
            .catch(() => {
                setError("Failed to load staff.");
                setStaffList([]);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadStaff();
    }, []);

    const openAddModal = () => {
        setEditingStaff(null);
        setForm(emptyForm);
        setFormError("");
        setModalOpen(true);
    };

    const openEditModal = (staff) => {
        const [surname, ...rest] = (staff.name || "").split(" ");

        setEditingStaff(staff);
        setForm({
            surname: surname || "",
            otherNames: rest.join(" "),
            sex: staff.sex === "M" ? "Male" : staff.sex === "F" ? "Female" : (staff.sex || ""),
            role: staff.role,
        });
        setFormError("");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingStaff(null);
        setForm(emptyForm);
    };

    const handleFormChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const sexLetter = form.sex === "Male" ? "M" : form.sex === "Female" ? "F" : form.sex;
        const payload = {
            surname: form.surname,
            otherNames: form.otherNames,
            sex: sexLetter,
            role: form.role,
        };

        setSubmitting(true);
        setFormError("");
        try {
            if (editingStaff) {
                const res = await fetch(`${BASE_URL}/api/admin/staff/${editingStaff.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to update staff.");
            } else {
                const res = await fetch(`${BASE_URL}/api/admin/staff`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to add staff.");
            }
            closeModal();
            loadStaff();
        } catch (err) {
            setFormError(err.message || "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/staff/${deleteTarget.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to remove staff.");
            }
            setStaffList((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        } catch (err) {
            setError(err.message || "Failed to remove staff.");
        } finally {
            setDeleteTarget(null);
        }
    };

    const isEditing = Boolean(editingStaff);

    if (loading) return <div className="adst-page"><p>Loading staff...</p></div>;

    return (
        <div className="adst-page">
            <h1 className="adst-title">Staff</h1>
            <p className="adst-sub">Add, assign role and manage staff details</p>

            {error && <p className="adst-error">{error}</p>}

            <div className="adst-table-card">
                <div className="adst-table-wrap">
                    <table className="adst-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Staff ID</th>
                                <th>Sex</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.map((s) => (
                                <tr key={s.id}>
                                    <td className="adst-name">{s.name}</td>
                                    <td>{s.staffId}</td>
                                    <td>{s.sex}</td>
                                    <td className="adst-role">{s.role}</td>
                                    <td>
                                        <div className="adst-actions">
                                            <span>Edit details</span>
                                            <button
                                                className="adst-icon-btn adst-icon-btn--edit"
                                                onClick={() => openEditModal(s)}
                                                aria-label="Edit staff"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                                                    <path d="M0 0h24v24H0z" fill="none" />
                                                    <path fill="currentColor" d="M3.548 20.938h16.9a.5.5 0 0 0 0-1h-16.9a.5.5 0 0 0 0 1M9.71 17.18a2.6 2.6 0 0 0 1.12-.65l9.54-9.54a1.75 1.75 0 0 0 0-2.47l-.94-.93a1.79 1.79 0 0 0-2.47 0l-9.54 9.53a2.5 2.5 0 0 0-.64 1.12L6.04 17a.74.74 0 0 0 .19.72a.77.77 0 0 0 .53.22Zm.41-1.36a1.47 1.47 0 0 1-.67.39l-.97.26l-1-1l.26-.97a1.5 1.5 0 0 1 .39-.67l.38-.37l1.99 1.99Zm1.09-1.08l-1.99-1.99l6.73-6.73l1.99 1.99Zm8.45-8.45L18.65 7.3l-1.99-1.99l1.01-1.02a.75.75 0 0 1 1.06 0l.93.94a.754.754 0 0 1 0 1.06" />
                                                </svg>
                                            </button>
                                            <button
                                                className="adst-icon-btn adst-icon-btn--delete"
                                                onClick={() => setDeleteTarget(s)}
                                                aria-label="Delete staff"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                                                    <path d="M0 0h24v24H0z" fill="none" />
                                                    <path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z" />
                                                </svg>
                                            </button>
                                            <button
                                                className="adst-icon-btn adst-icon-btn--lock"
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
                            {staffList.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="adst-empty-row">No staff added yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="adst-add-row">
                <button className="adst-add-btn" onClick={openAddModal}>
                    Add Staff
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                </button>
            </div>

            {modalOpen && (
                <div className="adst-modal-overlay" onClick={closeModal}>
                    <div className="adst-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="adst-modal-close" onClick={closeModal} aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </button>

                        <h2 className="adst-modal-title">{isEditing ? "Update Staff" : "Staff"}</h2>
                        <p className="adst-modal-sub">
                            {isEditing
                                ? "Update this staff member's information below"
                                : "Fill the information below to update your Staff list"}
                        </p>

                        <form onSubmit={handleSubmit}>
                            <div className="adst-form-grid">
                                <div className="adst-field">
                                    <label className="adst-label" htmlFor="surname">Surname</label>
                                    <input
                                        id="surname"
                                        type="text"
                                        className="adst-input"
                                        placeholder="Type here..."
                                        value={form.surname}
                                        onChange={(e) => handleFormChange("surname", e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="adst-field">
                                    <label className="adst-label" htmlFor="otherNames">Other Names</label>
                                    <input
                                        id="otherNames"
                                        type="text"
                                        className="adst-input"
                                        placeholder="Type here..."
                                        value={form.otherNames}
                                        onChange={(e) => handleFormChange("otherNames", e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="adst-field">
                                    <label className="adst-label" htmlFor="sex">Sex</label>
                                    <select
                                        id="sex"
                                        className="adst-input adst-select"
                                        value={form.sex}
                                        onChange={(e) => handleFormChange("sex", e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>

                                <div className="adst-field">
                                    <label className="adst-label" htmlFor="role">Staff Role</label>
                                    <select
                                        id="role"
                                        className="adst-input adst-select"
                                        value={form.role}
                                        onChange={(e) => handleFormChange("role", e.target.value)}
                                        required
                                        disabled={metaLoading}
                                    >
                                        <option value="" disabled>Staff Role</option>
                                        {roleOptions.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {formError && <p className="adst-error">{formError}</p>}

                            <button type="submit" className="adst-submit-btn" disabled={submitting}>
                                {submitting ? "Saving..." : isEditing ? "Save Changes" : "Add Staff"}
                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="adst-modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="adst-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="adst-confirm-title">Remove Staff?</h3>
                        <p className="adst-confirm-text">
                            Are you sure you want to remove <strong>{deleteTarget.name}</strong> from the staff list? This cannot be undone.
                        </p>
                        <div className="adst-confirm-actions">
                            <button
                                className="adst-confirm-btn adst-confirm-btn--cancel"
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="adst-confirm-btn adst-confirm-btn--delete"
                                onClick={confirmDelete}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {resetTarget && (
                <ResetStaffPasswordModal
                    staff={resetTarget}
                    token={token}
                    onClose={() => setResetTarget(null)}
                />
            )}
        </div>
    );
}

function ResetStaffPasswordModal({ staff, token, onClose }) {
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
                `${BASE_URL}/api/admin/staff/${staff.id}/reset-password`,
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
                message: `Password reset for ${staff.name}.`,
                password: data.data?.newPassword || trimmed,
            });
        } catch (err) {
            setStatus({ type: "error", message: err.message || "Failed to reset password." });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="adst-modal-overlay" onClick={onClose}>
            <div className="adst-reset-modal" onClick={(e) => e.stopPropagation()}>
                <button className="adst-modal-close" onClick={onClose} aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </button>

                <h3 className="adst-reset-title">Reset Password</h3>
                <p className="adst-reset-sub">
                    Set a new password for <strong>{staff.name}</strong> ({staff.staffId})
                </p>
                <p className="adst-reset-hint">
                    Leave blank to auto-generate a password, or type one (min. 6 characters).
                </p>

                <div className="adst-reset-field-row">
                    <input
                        type="text"
                        className="adst-input"
                        placeholder="New password (optional)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={status?.type === "success"}
                    />
                </div>

                {status?.type === "success" && (
                    <div className="adst-reset-result">
                        <p className="adst-reset-result-label">New password:</p>
                        <p className="adst-reset-result-value">{status.password}</p>
                    </div>
                )}

                {status && (
                    <p className={`adst-reset-status adst-reset-status--${status.type}`}>
                        {status.message}
                    </p>
                )}

                <button className="adst-submit-btn" onClick={handleReset} disabled={submitting || status?.type === "success"}>
                    {submitting ? "Resetting..." : status?.type === "success" ? "Password Reset" : "Reset Password"}
                </button>
            </div>
        </div>
    );
}

