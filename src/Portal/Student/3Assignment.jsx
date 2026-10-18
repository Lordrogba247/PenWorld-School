import { useState, useEffect, useRef } from "react";
import "./3Assignment.css";
import api from "../../api";

const BASE_URL = "https://pen-world-school.vercel.app";

function resolveFileUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `${BASE_URL}${url}`;
    return `${BASE_URL}/${url}`;
}

function getTeacherAttachments(assignment) {
    if (!assignment || typeof assignment !== "object") return [];
    // 1) Known keys first
    const knownKeys = [
        "teacherAttachment", "teacherAttachments", "teacherFile", "teacherFiles",
        "attachment", "attachments", "attachmentUrl", "attachmentURL",
        "attachmentPath", "attachment_path",
        "fileUrl", "fileURL", "filePath", "file", "files",
        "document", "documents", "documentUrl", "documentURL",
        "upload", "uploads", "uploadUrl", "media", "mediaUrl", "resource", "resourceUrl",
    ];
    let candidates = [];
    for (const k of knownKeys) {
        if (assignment[k] !== undefined && assignment[k] !== null && assignment[k] !== "") {
            candidates.push(assignment[k]);
        }
    }
    // 2) Fallback: scan EVERY key for anything looking like a file/url,
    //    so an unexpected backend field name still shows up.
    //    Skip known non-file keys.
    const skipKeys = new Set([
        "id", "_id", "subject", "type", "title", "classLabel", "class", "due", "dueDate",
        "instruction", "instructions", "description", "submitted", "isSubmitted",
        "hasSubmitted", "status", "createdAt", "updatedAt", "__v",
    ]);
    for (const [k, v] of Object.entries(assignment)) {
        if (skipKeys.has(k) || knownKeys.includes(k)) continue;
        if (typeof v === "string" && v.length > 3 &&
            (/^(https?:\/\/|\/|uploads?\/|files?\/|attachments?\/|documents?\/)/i.test(v) ||
             /\.(pdf|docx?|xlsx?|pptx?|txt|png|jpe?g|gif|webp|zip|rar|csv)$/i.test(v))) {
            candidates.push(v);
        } else if (v && typeof v === "object" && !Array.isArray(v) &&
                   (v.url || v.path || v.link || v.href || v.secure_url || v.secureUrl)) {
            candidates.push(v);
        } else if (Array.isArray(v) && v.length > 0 && /attach|file|doc|upload|media|resource/i.test(k)) {
            candidates.push(...v);
        }
    }
    // flatten one level (attachments could be nested arrays)
    const flat = [];
    for (const c of candidates.flat(Infinity)) {
        if (c === null || c === undefined || c === "") continue;
        // guard: never treat a plain number/boolean or long prose as a file
        if (typeof c === "string" && c.length > 500) continue;
        flat.push(c);
    }
    if (flat.length === 0) return [];
    return flat
        .map((item) => {
            if (typeof item === "string") {
                return { url: resolveFileUrl(item), name: item.split("/").pop() || "Attachment" };
            }
            if (typeof item === "object") {
                const url = item.url || item.path || item.link || item.href || item.secure_url || item.secureUrl || "";
                const name = item.originalName || item.originalname || item.name || item.filename || item.original_name || (url ? String(url).split("/").pop() : "Attachment");
                if (!url && !name) return null;
                return { url: url ? resolveFileUrl(String(url)) : "", name: name || "Attachment" };
            }
            return null;
        })
        .filter(Boolean);
}

function AssignmentCard({ assignment }) {
    const teacherFiles = getTeacherAttachments(assignment);
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(assignment.submitted);
    const [error, setError] = useState("");
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...selected]);
    };

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError("");
        try {
            const formData = new FormData();
            files.forEach((file) => formData.append("files", file));

            await api.post(`/api/student/assignments/${assignment.id}/submit`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setSubmitted(true);
            setFiles([]);
        } catch (err) {
            setError(err.response?.data?.message || "Submission failed. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="sa-card">
            <div className="sa-card-header">
                <p className="sa-card-subject">{assignment.subject}</p>
                <p className="sa-card-type">{assignment.type}</p>
            </div>

            <div className="sa-card-body">
                <p className="sa-due">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
                    </svg>
                    Due: {assignment.due || assignment.dueDate}
                </p>

                <p className="sa-instruction-label">Instruction</p>
                <p className="sa-instruction-text">{assignment.instruction || assignment.instructions}</p>

                {/* Teacher/admin attached file(s) */}
                {teacherFiles.length > 0 && (
                    <div className="sa-teacher-files">
                        <p className="sa-instruction-label">
                            Attachment{teacherFiles.length !== 1 ? "s" : ""} ({teacherFiles.length})
                        </p>
                        <ul className="sa-file-list">
                            {teacherFiles.map((f, i) => (
                                <li key={i} className="sa-file-item">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                    </svg>
                                    {f.url ? (
                                        <a className="sa-file-name sa-file-link" href={f.url} target="_blank" rel="noreferrer">
                                            {f.name}
                                        </a>
                                    ) : (
                                        <span className="sa-file-name">{f.name}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {submitted ? (
                    <p className="sa-submitted-msg">✅ Assignment submitted</p>
                ) : (
                    <>
                        <div className="sa-attach-section">
                            <div className="sa-attach-row">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    width="18"
                                    height="18"
                                    className="sa-attach-icon"
                                    onClick={() => fileInputRef.current.click()}
                                    title="Click to attach file"
                                >
                                    <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 015 0v10.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V6H9v9.5a2.5 2.5 0 005 0V5c0-2.21-1.79-4-4-4S6 2.79 6 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1z" />
                                </svg>
                                <span className="sa-attach-label">
                                    {files.length} attachment{files.length !== 1 ? "s" : ""} — your files to submit
                                </span>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                            />

                            {files.length > 0 && (
                                <ul className="sa-file-list">
                                    {files.map((file, i) => (
                                        <li key={i} className="sa-file-item">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                            </svg>
                                            <span className="sa-file-name">{file.name}</span>
                                            <button className="sa-file-remove" onClick={() => removeFile(i)}>✕</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {error && <p className="sa-error">{error}</p>}

                        <div className="sa-card-footer">
                            <button className="sa-submit-btn" onClick={handleSubmit} disabled={submitting}>
                                {submitting ? "Submitting..." : "Mark as Submitted"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function StudentAssignment() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/api/student/assignments")
            // Assuming { success, data: [...] } — same convention as every other confirmed
            // endpoint. Was previously setting assignments to the whole response object,
            // which crashed .map() below since that object has no .map method.
            .then((res) => {
                const list = res.data?.data || res.data || [];
                setAssignments(Array.isArray(list) ? list : []);
            })
            .catch(() => setError("Failed to load assignments."))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="sa-loading">Loading...</div>;
    if (error) return <div className="sa-error">{error}</div>;

    return (
        <div className="sa-page">
            <h1 className="sa-title">Assignments</h1>
            <p className="sa-sub">View and submit assignments</p>

            <div className="sa-list">
                {assignments.length === 0 ? (
                    <p className="sa-empty">No assignments available.</p>
                ) : (
                    assignments.map((a) => <AssignmentCard key={a.id} assignment={a} />)
                )}
            </div>
        </div>
    );
}

