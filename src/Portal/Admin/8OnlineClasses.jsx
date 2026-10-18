import { useState, useEffect } from "react";
import "./8OnlineClasses.css";
import { useMeta } from "../../hooks/useMeta";

const BASE_URL = "https://penworld-demo-school-backend.vercel.app";

const emptyForm = { date: "", time: "", classLabel: "", subject: "", meetingLink: "" };

export default function AdminOnlineClass() {
    const { classes: classOptions, getSubjectsForClass, loading: metaLoading } = useMeta();

    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);

    const token = localStorage.getItem("token");

    // Subjects available for the currently selected class, derived from level
    const subjectOptions = form.classLabel ? getSubjectsForClass(form.classLabel) : [];

    const loadSessions = () => {
        setLoading(true);
        setError("");
        fetch(`${BASE_URL}/api/admin/online-classes`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load sessions.");
                return res.json();
            })
            .then((data) => setSessions(data.data || []))
            .catch(() => setError("Failed to load online classes."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadSessions();
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

    const openModal = () => {
        setForm(emptyForm);
        setFormError("");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setForm(emptyForm);
    };

    const handleFormChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSchedule = async (e) => {
        e.preventDefault();
        if (!form.date.trim() || !form.time.trim() || !form.classLabel || !form.subject || !form.meetingLink.trim()) {
            return;
        }

        setSubmitting(true);
        setFormError("");
        try {
            const res = await fetch(`${BASE_URL}/api/admin/online-classes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    date: form.date,
                    time: form.time,
                    classLabel: form.classLabel,
                    subject: form.subject,
                    meetingLink: form.meetingLink,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to schedule session.");

            closeModal();
            loadSessions(); // refresh from server so we get the real ID
        } catch (err) {
            setFormError(err.message || "Failed to schedule session. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStartSession = (session) => {
        const link = session.link || session.meetingLink;
        if (link) {
            window.open(link, "_blank", "noopener,noreferrer");
        } else {
            alert("No meeting link has been set for this session yet.");
        }
    };

    const confirmDelete = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/online-classes/${deleteTarget._id || deleteTarget.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to delete session.");
            }
            setSessions((prev) => prev.filter((s) => (s._id || s.id) !== (deleteTarget._id || deleteTarget.id)));
        } catch (err) {
            setError(err.message || "Failed to delete session.");
        } finally {
            setDeleteTarget(null);
        }
    };

    if (loading) return <div className="aoc-page"><p>Loading sessions...</p></div>;

    return (
        <div className="aoc-page">
            <h1 className="aoc-title">Online Classes</h1>
            <p className="aoc-sub">See below the available online classes</p>

            {error && <p className="aoc-error">{error}</p>}

            <button className="aoc-schedule-btn" onClick={openModal}>
                Schedule Session
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                </svg>
            </button>

            <div className="aoc-list">
                {sessions.map((s, index) => {
                    const isNavy = index % 2 === 0;
                    return (
                        <div className="aoc-card" key={s._id || s.id}>
                            <div className={`aoc-card-header ${isNavy ? "aoc-card-header--navy" : "aoc-card-header--red"}`}>
                                <p className="aoc-card-subject">{s.subject}</p>
                                <div className="aoc-card-meta">
                                    <span className="aoc-meta-item">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                                            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                                        </svg>
                                        {s.date}
                                    </span>
                                    <span className="aoc-meta-item">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                                        </svg>
                                        {s.classLabel}
                                    </span>
                                    <span className="aoc-meta-item">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                        </svg>
                                        {s.time}
                                    </span>
                                </div>
                            </div>

                            <div className="aoc-card-body">
                                <button
                                    className={`aoc-start-btn ${isNavy ? "aoc-start-btn--navy" : "aoc-start-btn--red"}`}
                                    onClick={() => handleStartSession(s)}
                                >
                                    Start Session Now
                                </button>
                                <button
                                    className="aoc-delete-btn"
                                    onClick={() => setDeleteTarget(s)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}

                {sessions.length === 0 && (
                    <p className="aoc-empty">No sessions scheduled yet.</p>
                )}
            </div>

            {/* Schedule Session modal */}
            {modalOpen && (
                <div className="aoc-modal-overlay" onClick={closeModal}>
                    <div className="aoc-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="aoc-modal-close" onClick={closeModal} aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </button>

                        <h2 className="aoc-modal-title">Online Class</h2>
                        <p className="aoc-modal-sub">Schedule an online class session for your students</p>

                        <form onSubmit={handleSchedule}>
                            <div className="aoc-form-row">
                                <div className="aoc-field">
                                    <label className="aoc-label" htmlFor="date">Date</label>
                                    <input
                                        id="date"
                                        type="text"
                                        className="aoc-input"
                                        placeholder="Type here..."
                                        value={form.date}
                                        onChange={(e) => handleFormChange("date", e.target.value)}
                                    />
                                </div>

                                <div className="aoc-field">
                                    <label className="aoc-label" htmlFor="time">Time</label>
                                    <input
                                        id="time"
                                        type="text"
                                        className="aoc-input"
                                        placeholder="Type here..."
                                        value={form.time}
                                        onChange={(e) => handleFormChange("time", e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="aoc-form-row">
                                <select
                                    className="aoc-select"
                                    value={form.classLabel}
                                    onChange={(e) => handleFormChange("classLabel", e.target.value)}
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
                                    className="aoc-select"
                                    value={form.subject}
                                    onChange={(e) => handleFormChange("subject", e.target.value)}
                                    disabled={metaLoading || !form.classLabel}
                                >
                                    <option value="" disabled>{form.classLabel ? "Subject" : "Select a class first"}</option>
                                    {subjectOptions.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="aoc-field aoc-field--link">
                                <label className="aoc-label" htmlFor="meetingLink">Meeting Link</label>
                                <input
                                    id="meetingLink"
                                    type="url"
                                    className="aoc-input"
                                    placeholder="Paste meeting link here..."
                                    value={form.meetingLink}
                                    onChange={(e) => handleFormChange("meetingLink", e.target.value)}
                                />
                            </div>

                            <button type="submit" className="aoc-submit-btn" disabled={submitting}>
                                {submitting ? "Scheduling..." : "Schedule Session"}
                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                                </svg>
                            </button>

                            {formError && <p className="aoc-error">{formError}</p>}
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            {deleteTarget && (
                <div className="aoc-modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="aoc-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="aoc-confirm-title">Delete Session?</h3>
                        <p className="aoc-confirm-text">
                            Are you sure you want to delete the <strong>{deleteTarget.subject}</strong> session for {deleteTarget.classLabel}? This cannot be undone.
                        </p>
                        <div className="aoc-confirm-actions">
                            <button
                                className="aoc-confirm-btn aoc-confirm-btn--cancel"
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="aoc-confirm-btn aoc-confirm-btn--delete"
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

