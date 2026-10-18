import { useState, useRef, useEffect } from "react";
import "./7Assignment.css";
import { useMeta } from "../../hooks/useMeta";

const BASE_URL = "https://pen-world-school.vercel.app";

const emptyForm = { subject: "", classLabel: "", instructions: "", dueDate: "" };

export default function AdminAssignment() {
    const { classes: classOptions, getSubjectsForClass, loading: metaLoading } = useMeta();

    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [attachment, setAttachment] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const fileInputRef = useRef(null);

    const [deleteTarget, setDeleteTarget] = useState(null);

    const token = localStorage.getItem("token");

    // Subjects available for the currently selected class, derived from level
    const subjectOptions = form.classLabel ? getSubjectsForClass(form.classLabel) : [];

    const loadAssignments = () => {
        setLoading(true);
        setError("");
        fetch(`${BASE_URL}/api/admin/assignments`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load assignments.");
                return res.json();
            })
            .then((data) => setAssignments(data.data || []))
            .catch(() => setError("Failed to load assignments."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadAssignments();
    }, []);

    // Reset the selected subject whenever the class changes, since the old
    // subject may not belong to the new class's level.
    // Also clears a stale class value that is no longer in the live list.
    useEffect(() => {
        if (form.classLabel && classOptions.length > 0) {
            const valid = classOptions.some((c) => (c.value ?? c.name) === form.classLabel);
            if (!valid) {
                setForm((prev) => ({ ...prev, classLabel: "", subject: "" }));
                return;
            }
        }
        setForm((prev) => (prev.subject ? { ...prev, subject: "" } : prev));
    }, [form.classLabel]);

    const openAddModal = () => {
        setForm(emptyForm);
        setAttachment(null);
        setFormError("");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setForm(emptyForm);
        setAttachment(null);
    };

    const handleFormChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e) => {
        setAttachment(e.target.files[0] || null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.subject || !form.classLabel || !form.instructions.trim() || !form.dueDate.trim()) {
            return;
        }

        setSubmitting(true);
        setFormError("");
        try {
            const formData = new FormData();
            formData.append("subject", form.subject);
            formData.append("classLabel", form.classLabel);
            formData.append("instructions", form.instructions);
            formData.append("dueDate", form.dueDate);
            if (attachment) formData.append("attachment", attachment);

            const res = await fetch(`${BASE_URL}/api/admin/assignments`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to create assignment.");

            closeModal();
            loadAssignments(); // refresh from server so we get the real ID
        } catch (err) {
            setFormError(err.message || "Failed to create assignment. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/assignments/${deleteTarget._id || deleteTarget.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to delete assignment.");
            }
            setAssignments((prev) => prev.filter((a) => (a._id || a.id) !== (deleteTarget._id || deleteTarget.id)));
        } catch (err) {
            setError(err.message || "Failed to delete assignment.");
        } finally {
            setDeleteTarget(null);
        }
    };

    if (loading) return <div className="ada-page"><p>Loading assignments...</p></div>;

    return (
        <div className="ada-page">
            <h1 className="ada-title">Assignments</h1>
            <p className="ada-sub">See below the available assignments</p>

            {error && <p className="ada-error">{error}</p>}

            <button className="ada-add-btn" onClick={openAddModal}>
                Add Assignment
                <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 20 20">
                    <path d="M0 0h20v20H0z" fill="none" />
                    <path fill="currentColor" d="M5 17h13v2H5c-1.66 0-3-1.34-3-3V4c0-1.66 1.34-3 3-3h13v14H5c-.55 0-1 .45-1 1s.45 1 1 1m2-3.5v-11c0-.28-.22-.5-.5-.5s-.5.22-.5.5v11c0 .28.22.5.5.5s.5-.22.5-.5" />
                </svg>
            </button>

            <div className="ada-list">
                {assignments.map((a) => (
                    <div className="ada-row" key={a._id || a.id}>
                        <span className="ada-row-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 20 20">
                                <path d="M0 0h20v20H0z" fill="none" />
                                <path fill="currentColor" d="M5 17h13v2H5c-1.66 0-3-1.34-3-3V4c0-1.66 1.34-3 3-3h13v14H5c-.55 0-1 .45-1 1s.45 1 1 1m2-3.5v-11c0-.28-.22-.5-.5-.5s-.5.22-.5.5v11c0 .28.22.5.5.5s.5-.22.5-.5" />
                            </svg>
                        </span>
                        <div className="ada-row-text">
                            <p className="ada-row-title">{a.subject}</p>
                            <p className="ada-row-meta">
                                {a.classLabel} . To be submitted {a.due || a.dueDate}
                            </p>
                        </div>
                        <button
                            className="ada-delete-btn"
                            onClick={() => setDeleteTarget(a)}
                        >
                            Delete
                        </button>
                    </div>
                ))}

                {assignments.length === 0 && (
                    <p className="ada-empty">No assignments posted yet.</p>
                )}
            </div>

            {/* Add Assignment modal */}
            {modalOpen && (
                <div className="ada-modal-overlay" onClick={closeModal}>
                    <div className="ada-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="ada-modal-close" onClick={closeModal} aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </button>

                        <h2 className="ada-modal-title">Assignment</h2>
                        <p className="ada-modal-sub">Manage assignment for your Students</p>

                        <form onSubmit={handleSubmit}>
                            <div className="ada-form-row">
                                <select
                                    className="ada-select"
                                    value={form.classLabel}
                                    onChange={(e) => handleFormChange("classLabel", e.target.value)}
                                    required
                                    disabled={metaLoading}
                                >
                                    <option value="" disabled>Select Class</option>
                                    {classOptions.map((c) => {
                                        const val = c.value ?? c.name;
                                        const label = c.label ?? c.name ?? val;
                                        return <option key={c.id ?? val} value={val}>{label}</option>;
                                    })}
                                </select>

                                <select
                                    className="ada-select"
                                    value={form.subject}
                                    onChange={(e) => handleFormChange("subject", e.target.value)}
                                    required
                                    disabled={metaLoading || !form.classLabel}
                                >
                                    <option value="" disabled>{form.classLabel ? "Subject" : "Select a class first"}</option>
                                    {subjectOptions.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="ada-form-row">
                                <div className="ada-field">
                                    <label className="ada-label" htmlFor="instructions">Instructions</label>
                                    <textarea
                                        id="instructions"
                                        className="ada-textarea"
                                        placeholder="Type here..."
                                        value={form.instructions}
                                        onChange={(e) => handleFormChange("instructions", e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="ada-field">
                                    <label className="ada-label" htmlFor="attachment">Attachment</label>
                                    <div
                                        className="ada-attach-box"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {attachment ? attachment.name : "attach file here"}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        id="attachment"
                                        type="file"
                                        style={{ display: "none" }}
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>

                            <div className="ada-form-row ada-form-row--bottom">
                                <div className="ada-field">
                                    <label className="ada-label" htmlFor="dueDate">Due Date</label>
                                    <input
                                        id="dueDate"
                                        type="text"
                                        className="ada-input"
                                        placeholder="Type here..."
                                        value={form.dueDate}
                                        onChange={(e) => handleFormChange("dueDate", e.target.value)}
                                        required
                                    />
                                </div>

                                <button type="submit" className="ada-submit-btn" disabled={submitting}>
                                    {submitting ? "Adding..." : "Add Assignment"}
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
                                    </svg>
                                </button>
                            </div>

                            {formError && <p className="ada-error">{formError}</p>}
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            {deleteTarget && (
                <div className="ada-modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="ada-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="ada-confirm-title">Delete Assignment?</h3>
                        <p className="ada-confirm-text">
                            Are you sure you want to delete the <strong>{deleteTarget.subject}</strong> assignment for {deleteTarget.classLabel}? This cannot be undone.
                        </p>
                        <div className="ada-confirm-actions">
                            <button
                                className="ada-confirm-btn ada-confirm-btn--cancel"
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="ada-confirm-btn ada-confirm-btn--delete"
                                onClick={confirmDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

