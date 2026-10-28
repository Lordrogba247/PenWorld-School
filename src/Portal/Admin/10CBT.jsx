import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import "./10CBT.css";
import { useMeta } from "../../hooks/useMeta";
import CbtResultsModal from "../CbtResultsModal";

const BASE_URL = "https://penworld-gloryseed-demo-school-back.vercel.app";

// Card colors alternate purple/red
const cardAccents = ["purple", "red"];

export default function AdminCBT() {
    const { classes: classOptions, getSubjectsForClass, loading: metaLoading } = useMeta();

    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reactivatingId, setReactivatingId] = useState(null);
    const [resultsTest, setResultsTest] = useState(null); // test whose results modal is open

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        duration: "", date: "", description: "", classLevel: "", subject: "",
    });
    const [file, setFile] = useState(null);
    const [questionCount, setQuestionCount] = useState(0);
    const [scheduling, setScheduling] = useState(false);
    const [formError, setFormError] = useState("");
    const fileInputRef = useRef(null);

    const token = localStorage.getItem("token");

    // Subjects available for the currently selected class, derived from level
    const subjectOptions = form.classLevel ? getSubjectsForClass(form.classLevel) : [];

    const loadTests = () => {
        setLoading(true);
        setError("");
        fetch(`${BASE_URL}/api/admin/cbt`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load CBT tests.");
                return res.json();
            })
            .then((data) => {
                const list = data.data || data.tests || [];
                const withAccents = list.map((t, i) => ({ ...t, accent: cardAccents[i % 2] }));
                setTests(withAccents);
            })
            .catch(() => setError("Failed to load CBT tests."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadTests();
    }, []);

    // Reset the selected subject whenever the class changes, since the old
    // subject may not belong to the new class's level.
    // Also clears a stale class value that is no longer in the live list.
    useEffect(() => {
        if (form.classLevel && classOptions.length > 0) {
            const valid = classOptions.some((c) => (c.value ?? c.name) === form.classLevel);
            if (!valid) {
                setForm((prev) => ({ ...prev, classLevel: "", subject: "" }));
                return;
            }
        }
        setForm((prev) => (prev.subject ? { ...prev, subject: "" } : prev));
    }, [form.classLevel]);

    // A test is "live" if it's explicitly active AND neither its expiry window
    // nor its scheduled date has passed. Covers every inactive spelling the
    // backend may send: isActive=false, status "closed"/"expired"/..., or a
    // past date / expiresAt.
    const isTestLive = (test) => {
        if (!test || typeof test !== "object") return false;
        if (test.isActive === false) return false;
        if (typeof test.status === "string" && /expir|clos|inactive|archived|disabled/i.test(test.status)) return false;
        if (typeof test.isPublished === "boolean" && test.isPublished === false) return false;
        for (const key of ["expiresAt", "expires_at", "expiryDate"]) {
            if (test[key]) {
                const exp = new Date(test[key]).getTime();
                if (!Number.isNaN(exp) && exp <= Date.now()) return false;
            }
        }
        // Scheduled-date expiry: with no explicit expiresAt window, a test
        // lives only through the end of its scheduled date.
        if (!test.expiresAt && !test.expires_at && !test.expiryDate && test.date) {
            const d = new Date(test.date);
            if (!Number.isNaN(d.getTime())) {
                const endOfScheduledDay = new Date(d);
                endOfScheduledDay.setHours(23, 59, 59, 999);
                if (endOfScheduledDay.getTime() < Date.now()) return false;
            }
        }
        // isActive missing entirely + no date info: treat as NOT live so stale
        // "closed" records never render as Active (consistent with Student view).
        if (
            test.isActive === undefined &&
            test.status === undefined &&
            !test.expiresAt && !test.expires_at && !test.expiryDate && !test.date
        ) {
            return false;
        }
        return true;
    };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setFile(selected);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);
            setQuestionCount(rows.length);
        };
        reader.readAsArrayBuffer(selected);
    };

    const handleSchedule = async () => {
        if (!form.subject || !form.classLevel || !form.duration || !form.date || !file) {
            alert("Please fill all fields and upload a question file.");
            return;
        }

        setScheduling(true);
        setFormError("");
        try {
            const formData = new FormData();
            formData.append("subject", form.subject);
            formData.append("classLevel", form.classLevel);
            formData.append("description", form.description);
            formData.append("duration", form.duration);
            formData.append("date", form.date);
            formData.append("excelFile", file);

            const res = await fetch(`${BASE_URL}/api/admin/cbt`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to schedule test.");

            setForm({ duration: "", date: "", description: "", classLevel: "", subject: "" });
            setFile(null);
            setQuestionCount(0);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setShowModal(false);
            loadTests(); // refresh from server so we get the real ID and server-parsed question count
        } catch (err) {
            setFormError(err.message || "Failed to schedule test. Please try again.");
        } finally {
            setScheduling(false);
        }
    };

    const handleDelete = async (test) => {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/cbt/${test._id || test.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to delete test.");
            }
            setTests((prev) => prev.filter((t) => (t._id || t.id) !== (test._id || test.id)));
        } catch (err) {
            setError(err.message || "Failed to delete test.");
        }
    };

    // Reactivate extends availability by one more day from now.
    // Backend: POST /api/admin/cbt/:id/reactivate -> sets isActive=true,
    // expiresAt = now + 24h. UI falls back to +1 day optimistically.
    const handleReactivate = async (test) => {
        const id = test._id || test.id;
        const ok = window.confirm(
            `Reactivate "${test.subject || "this test"}" for one more day? Students will be able to take it until tomorrow.`
        );
        if (!ok) return;
        setReactivatingId(id);
        setError("");
        try {
            const res = await fetch(`${BASE_URL}/api/admin/cbt/${id}/reactivate`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "Failed to reactivate test.");

            // Prefer whatever the server returns for the updated test; fall back to
            // +1 day from now so the UI reflects "available for one more day".
            const updated = data.data || data.test || {};
            const oneMoreDay = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            setTests((prev) =>
                prev.map((t) =>
                    (t._id || t.id) === id
                        ? { ...t, isActive: true, expiresAt: updated.expiresAt || oneMoreDay, ...updated }
                        : t
                )
            );
        } catch (err) {
            setError(err.message || "Failed to reactivate test.");
        } finally {
            setReactivatingId(null);
        }
    };

    return (
        <div className="acbt-page">
            <h1 className="acbt-title">CBT Tests/Exams</h1>
            <p className="acbt-sub">See below the available computer-based tests/exams at your school</p>

            {error && <p className="acbt-error">{error}</p>}

            {/* Schedule button */}
            <button className="acbt-schedule-btn" onClick={() => setShowModal(true)}>
                Schedule CBT Test/Exam
                <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
                    <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
                </svg>
            </button>

            {/* Tests list — backend keeps staff/admin history for 7 days after the scheduled date, then deletes it */}
            <div className="acbt-list">
                {loading && <p className="acbt-empty">Loading tests...</p>}
                {!loading && tests.length === 0 && <p className="acbt-empty">No tests scheduled yet.</p>}

                {!loading && tests.map((t) => {
                    const live = isTestLive(t);
                    const id = t._id || t.id;
                    return (
                        <div className="acbt-card" key={id}>
                            <div className={`acbt-card-header acbt-card-header--${t.accent}`}>
                                <p className="acbt-card-subject">{t.subject}</p>
                                <p className="acbt-card-meta-top">{t.classLevel} &nbsp;·&nbsp; {t.description}</p>
                            </div>
                            <div className="acbt-card-body">
                                <div className="acbt-card-info">
                                    <p className="acbt-card-detail">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                                        </svg>
                                        Duration: {t.duration}
                                    </p>
                                    <p className="acbt-card-detail">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                                        </svg>
                                        Questions: {t.questions}
                                    </p>
                                    <p className="acbt-card-detail">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
                                        </svg>
                                        Date of Test/Exam: {t.date}
                                    </p>
                                    <p className={`acbt-card-detail acbt-status ${live ? "acbt-status--live" : "acbt-status--closed"}`}>
                                        {live ? "● Active" : "● Closed"}
                                        {t.expiresAt && live ? ` (reopened until ${new Date(t.expiresAt).toLocaleString()})` : ""}
                                    </p>
                                </div>
                                <div className="acbt-card-actions">
                                    <button className="acbt-results-btn" onClick={() => setResultsTest(t)}>
                                        View Results
                                    </button>
                                    {/* Always beside Active/Closed status: extends test by one more day */}
                                    <button
                                        className="acbt-reactivate-btn"
                                        onClick={() => handleReactivate(t)}
                                        disabled={reactivatingId === id}
                                        title="Make this CBT available for one more day"
                                    >
                                        {reactivatingId === id ? "Reactivating..." : "Reactivate +1 Day"}
                                    </button>
                                    <button className="acbt-delete-btn" onClick={() => handleDelete(t)}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Results modal */}
            {resultsTest && (
                <CbtResultsModal
                    test={resultsTest}
                    role="admin"
                    onClose={() => setResultsTest(null)}
                />
            )}

            {/* Schedule Modal */}
            {showModal && (
                <div className="acbt-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="acbt-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="acbt-modal-header">
                            <h2 className="acbt-modal-title">Schedule CBT Test/Exam</h2>
                            <button className="acbt-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="acbt-modal-body">
                            <div className="acbt-modal-grid">
                                <div className="acbt-field">
                                    <label className="acbt-label">Duration</label>
                                    <input name="duration" className="acbt-input" placeholder="e.g 30mins" value={form.duration} onChange={handleChange} />
                                </div>
                                <div className="acbt-field">
                                    <label className="acbt-label">Date</label>
                                    <input name="date" type="date" className="acbt-input" value={form.date} onChange={handleChange} />
                                </div>
                                <div className="acbt-field">
                                    <label className="acbt-label">Description</label>
                                    <input name="description" className="acbt-input" placeholder="First CA Test" value={form.description} onChange={handleChange} />
                                </div>
                                <div className="acbt-field">
                                    <label className="acbt-label">Upload file</label>
                                    <div className="acbt-upload" onClick={() => fileInputRef.current.click()}>
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                            <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 015 0v10.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V6H9v9.5a2.5 2.5 0 005 0V5c0-2.21-1.79-4-4-4S6 2.79 6 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1z" />
                                        </svg>
                                        <span>{file ? file.name : "attach file here"}</span>
                                        {questionCount > 0 && <span className="acbt-q-count">{questionCount} questions</span>}
                                    </div>
                                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFileChange} />
                                </div>
                                <div className="acbt-field">
                                    <select name="classLevel" className="acbt-select" value={form.classLevel} onChange={handleChange} disabled={metaLoading}>
                                        <option value="">Select Class</option>
                                        {classOptions.map((c) => {
                                            const val = c.value ?? c.name;
                                            const label = c.label ?? c.name ?? val;
                                            return <option key={c.id ?? val} value={val}>{label}</option>;
                                        })}
                                    </select>
                                </div>
                                <div className="acbt-field">
                                    <select
                                        name="subject"
                                        className="acbt-select"
                                        value={form.subject}
                                        onChange={handleChange}
                                        disabled={metaLoading || !form.classLevel}
                                    >
                                        <option value="">{form.classLevel ? "Subject" : "Select a class first"}</option>
                                        {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {formError && <p className="acbt-error">{formError}</p>}

                            <button className="acbt-submit-btn" onClick={handleSchedule} disabled={scheduling}>
                                {scheduling ? "Scheduling..." : "Schedule CBT Test/Exam"}
                                <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
                                    <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

