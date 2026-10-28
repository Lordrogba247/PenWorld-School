import { useState, useEffect } from "react";
import "./6OnlineClass.css";
import { useStaffMeta } from "../../hooks/useStaffMeta";

const BASE_URL = "https://penworld-gloryseed-demo-school-back.vercel.app";

export default function StaffOnlineClass() {
    const { classes: classOptions, getSubjectsForClass, loading: metaLoading } = useStaffMeta();

    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [classLabel, setClassLabel] = useState("");
    const [subject, setSubject] = useState("");
    const [meetingLink, setMeetingLink] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);

    const token = localStorage.getItem("token");

    // Subjects available for the currently selected class, derived from level
    const subjectOptions = classLabel ? getSubjectsForClass(classLabel) : [];

    const loadSessions = () => {
        setLoading(true);
        setError("");
        fetch(`${BASE_URL}/api/staff/online-classes`, {
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
        if (classLabel && classOptions.length > 0) {
            const valid = classOptions.some((c) => (c.value ?? c.name) === classLabel);
            if (!valid) {
                setClassLabel("");
                setSubject("");
                return;
            }
        }
        setSubject((prev) => (prev ? "" : prev));
    }, [classLabel]);

    const resetForm = () => {
        setDate("");
        setTime("");
        setClassLabel("");
        setSubject("");
        setMeetingLink("");
    };

    const handleSchedule = async (e) => {
        e.preventDefault();
        if (!date.trim() || !time.trim() || !classLabel || !subject || !meetingLink.trim()) {
            return;
        }

        setSubmitting(true);
        setFormError("");
        try {
            const res = await fetch(`${BASE_URL}/api/staff/online-classes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ date, time, classLabel, subject, meetingLink }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to schedule session.");

            resetForm();
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
            const res = await fetch(`${BASE_URL}/api/staff/online-classes/${deleteTarget._id || deleteTarget.id}`, {
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

    return (
        <div className="soc-page">
            <h1 className="soc-title">Online Class</h1>
            <p className="soc-sub">Schedule, start online class session with your students</p>

            {/* Schedule form */}
            <form className="soc-form" onSubmit={handleSchedule}>
                <div className="soc-form-row">
                    <div className="soc-field">
                        <label className="soc-label" htmlFor="date">Date</label>
                        <input
                            id="date"
                            type="text"
                            className="soc-input"
                            placeholder="Type here..."
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    <div className="soc-field">
                        <label className="soc-label" htmlFor="time">Time</label>
                        <input
                            id="time"
                            type="text"
                            className="soc-input"
                            placeholder="Type here..."
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>
                </div>

                <div className="soc-form-row">
                    <select
                        className="soc-select"
                        value={classLabel}
                        onChange={(e) => setClassLabel(e.target.value)}
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
                        className="soc-select"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        disabled={metaLoading || !classLabel}
                    >
                        <option value="" disabled>{classLabel ? "Subject" : "Select a class first"}</option>
                        {subjectOptions.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div className="soc-field soc-field--link">
                    <label className="soc-label" htmlFor="meetingLink">Meeting Link</label>
                    <input
                        id="meetingLink"
                        type="url"
                        className="soc-input"
                        placeholder="Paste meeting link here..."
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                    />
                </div>

                <button type="submit" className="soc-schedule-btn" disabled={submitting}>
                    {submitting ? "Scheduling..." : "Schedule Session"}
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                    </svg>
                </button>

                {formError && <p className="soc-error">{formError}</p>}
            </form>

            {/* Scheduled sessions */}
            <div className="soc-list">
                {loading && <p className="soc-empty">Loading sessions...</p>}
                {!loading && error && <p className="soc-error">{error}</p>}

                {!loading && sessions.map((s) => (
                    <div className="soc-card" key={s._id || s.id}>
                        <div className="soc-card-header">
                            <p className="soc-card-subject">{s.subject}</p>
                            <div className="soc-card-meta">
                                <span className="soc-meta-item">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                                    </svg>
                                    {s.date}
                                </span>
                                <span className="soc-meta-item">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                                    </svg>
                                    {s.classLabel}
                                </span>
                                <span className="soc-meta-item">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                    </svg>
                                    {s.time}
                                </span>
                            </div>
                        </div>

                        <div className="soc-card-body">
                            <button
                                className="soc-start-btn"
                                onClick={() => handleStartSession(s)}
                            >
                                Start Session Now
                            </button>
                            <button
                                className="soc-delete-btn"
                                onClick={() => setDeleteTarget(s)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}

                {!loading && sessions.length === 0 && (
                    <p className="soc-empty">No sessions scheduled yet.</p>
                )}
            </div>

            {/* Delete confirmation */}
            {deleteTarget && (
                <div className="soc-modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="soc-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="soc-confirm-title">Delete Session?</h3>
                        <p className="soc-confirm-text">
                            Are you sure you want to delete the <strong>{deleteTarget.subject}</strong> session for {deleteTarget.classLabel}? This cannot be undone.
                        </p>
                        <div className="soc-confirm-actions">
                            <button
                                className="soc-confirm-btn soc-confirm-btn--cancel"
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="soc-confirm-btn soc-confirm-btn--delete"
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

