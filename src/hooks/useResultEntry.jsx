import { useState, useEffect, useRef } from "react";
import { useMeta } from "./useMeta";
import { useStaffMeta } from "./useStaffMeta";

export const RESULT_BASE_URL = "https://heroesschool-management-backend.vercel.app";

export const FALLBACK_SUBJECT_OPTIONS = [
    "Mathematics", "English Language", "Basic Science", "Basic Technology",
    "Civic Education", "Social Studies", "Computer Studies/ICT", "Agricultural Science",
    "Christian Religious Studies", "Islamic Religious Studies", "Yoruba", "Hausa", "Igbo",
    "French", "Home Economics", "Physical and Health Education", "Creative and Cultural Arts",
    "Verbal Reasoning", "Quantitative Reasoning", "Business Studies", "Physics", "Chemistry",
    "Biology", "Further Mathematics", "Geography", "Government", "Economics",
    "Literature-in-English", "History", "Financial Account", "Commerce", "Marketing",
    "Technical Drawing", "Food and Nutrition",
];
// Last-resort fallback only (custom `other`-level classes / offline). The live
// per-class list (offeredSubjects) always wins when available.

export const RESULT_FALLBACK_SESSIONS = ["2024/2025", "2025/2026", "2026/2027"];
export const RESULT_FALLBACK_TERMS = ["First Term", "Second Term", "Third Term"];
export const RESULT_TERM_OPTIONS = [
    { value: "first", label: "First Term" },
    { value: "second", label: "Second Term" },
    { value: "third", label: "Third Term" },
];
const TERM_VALUE_TO_LABEL = Object.fromEntries(RESULT_TERM_OPTIONS.map((t) => [t.value, t.label]));

export function getResultGrade(total) {
    if (total >= 75) return { grade: "A1", remark: "Excellent" };
    if (total >= 70) return { grade: "B2", remark: "V.Good" };
    if (total >= 65) return { grade: "B3", remark: "Good" };
    if (total >= 60) return { grade: "C4", remark: "Credit" };
    if (total >= 55) return { grade: "C5", remark: "Credit" };
    if (total >= 50) return { grade: "C6", remark: "Credit" };
    if (total >= 45) return { grade: "D7", remark: "Pass" };
    if (total >= 40) return { grade: "E8", remark: "Pass" };
    return { grade: "F9", remark: "Fail" };
}

export function isLowerSchoolClass(studentClass) {
    if (!studentClass) return false;
    const cls = String(studentClass).toLowerCase();
    return cls.includes("primary") || cls.includes("nursery") || cls.includes("kindergarten") || cls.includes("creche") || /(^|[^a-z])kg([^a-z]|$)/.test(cls);
}

export function formatCommentAuthor(a) {
    if (!a) return "";
    if (typeof a === "string") return a;
    const fn = a.firstName || a.first_name || "";
    const ln = a.lastName || a.last_name || a.surname || "";
    const full = `${fn} ${ln}`.trim();
    return full || a.name || a.fullName || "";
}

export function normResultTerm(t) {
    const raw = t && typeof t === "object" ? (t.name ?? t.label ?? t.value ?? t.title ?? "") : t;
    const v = String(raw ?? "").trim().toLowerCase();
    if (v.includes("first") || v.includes("1st")) return "first";
    if (v.includes("second") || v.includes("2nd")) return "second";
    if (v.includes("third") || v.includes("3rd")) return "third";
    return v;
}

export function toSubjectName(n) {
    return typeof n === "string" ? n : (n?.name ?? n?.subject ?? n?.title ?? n?.value ?? "");
}

export function normSubjectNames(list) {
    return (Array.isArray(list) ? list : [])
        .map(toSubjectName)
        .map((s) => String(s ?? "").trim())
        .filter(Boolean);
}

export const EMPTY_RESULT_ROW = { subject: "", ca1: "", ca2: "", exam: "" };

// Shared result-entry logic for staff AND admin. `portal` is "staff" or
// "admin" and selects the API prefix (/api/<portal>/...), the meta hook, and
// the localStorage namespace. Everything else is identical.
export function useResultEntry(portal = "staff", studentId, incoming = {}) {
    const isAdmin = portal === "admin";
    const api = isAdmin ? "admin" : "staff";
    const storePrefix = isAdmin ? "admin-result" : "staff-result";
    // Both hooks are always called (Rules of Hooks); only the matching
    // portal's data is used below.
    const staffMeta = useStaffMeta();
    const adminMeta = useMeta();
    const meta = isAdmin ? adminMeta : staffMeta;
    const {
        sessions: metaSessions, terms: metaTerms,
        getSubjectsForClass, fetchClassSubjects,
    } = meta;
    const token = localStorage.getItem("token");

    const [student, setStudent] = useState(() => {
        const s = incoming.student;
        if (s && typeof s === "object") return s;
        return null;
    });
    const [loadingStudent, setLoadingStudent] = useState(() => !(incoming.student && typeof incoming.student === "object"));
    const [loadError, setLoadError] = useState("");
    // Subjects this student's class actually offers (tightened backend):
    // live endpoint -> results payload -> meta map -> fallback constant.
    const [liveClassSubjects, setLiveClassSubjects] = useState([]);
    const [offeredSubjects, setOfferedSubjects] = useState([]);
    const [classSubjectsLoading, setClassSubjectsLoading] = useState(false);

    const sessionOptions = Array.from(
        new Set([...metaSessions.map((s) => s.name), ...RESULT_FALLBACK_SESSIONS])
    ).sort();
    const metaTermValues = Array.from(
        new Set(metaTerms.map(normResultTerm).filter((v) => v in TERM_VALUE_TO_LABEL))
    );
    const termOptions =
        metaTermValues.length > 0 ? metaTermValues : RESULT_TERM_OPTIONS.map((t) => t.value);

    const [session, setSession] = useState(incoming.session || "");
    const [term, setTerm] = useState(normResultTerm(incoming.term) || "");
    const [rowInput, setRowInput] = useState(EMPTY_RESULT_ROW);
    const [results, setResults] = useState([]);
    const [editingId, setEditingId] = useState(null);

    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(true);
    const [commentInput, setCommentInput] = useState("");
    const [postingComment, setPostingComment] = useState(false);
    const [commentError, setCommentError] = useState("");
    const [commentNotice, setCommentNotice] = useState("");
    const [deletingCommentId, setDeletingCommentId] = useState(null);
    const [resultLocked, setResultLocked] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitNotice, setSubmitNotice] = useState("");
    const [loadingSaved, setLoadingSaved] = useState(true);
    const commentInFlight = useRef(false);
    const submitInFlight = useRef(false);
    const savedLoadSeq = useRef(0);

    const dedupeComments = (list) => {
        if (!Array.isArray(list)) return [];
        const seenIds = new Set();
        const seenTexts = new Set();
        const out = [];
        for (const c of list) {
            const id = c?._id || c?.id;
            const normText = String(c?.text ?? "").trim().toLowerCase();
            if (id && seenIds.has(String(id))) continue;
            if (id) seenIds.add(String(id));
            if (normText && seenTexts.has(normText)) continue;
            if (normText) seenTexts.add(normText);
            out.push(c);
        }
        return out;
    };

    const studentClassLabel =
        student?.classLabel?.name || student?.classLabel ||
        student?.class?.name || student?.class ||
        student?.studentClass || student?.student_class ||
        incoming.classLabel || "";
    const metaClassSubjects = studentClassLabel ? (getSubjectsForClass(studentClassLabel) || []) : [];
    const metaSubjectNames = normSubjectNames(metaClassSubjects);
    const subjectOptions =
        liveClassSubjects.length > 0 ? liveClassSubjects
        : offeredSubjects.length > 0 ? offeredSubjects
        : metaSubjectNames.length > 0 ? metaSubjectNames
        : FALLBACK_SUBJECT_OPTIONS;
    const usingFallbackSubjects =
        liveClassSubjects.length === 0 && offeredSubjects.length === 0 && metaSubjectNames.length === 0;
    const offeredSet = new Set(subjectOptions.map((s) => String(s).toUpperCase()));
    const isOfferedSubject = (name) =>
        usingFallbackSubjects || offeredSet.has(String(name ?? "").trim().toUpperCase());

    const canonicalSubjectName = (raw) => {
        const s = String(raw ?? "").trim();
        if (!s) return s;
        const map = new Map(subjectOptions.map((n) => [String(n).toUpperCase(), n]));
        return map.get(s.toUpperCase()) || s;
    };

    const termLabel = TERM_VALUE_TO_LABEL[term] || term;
    const clampScore = (v, max) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return 0;
        return Math.min(Math.max(Math.round(n), 0), max);
    };

    // Live per-class subjects: GET /api/<portal>/classes/:classRef/subjects.
    useEffect(() => {
        if (!studentClassLabel) return;
        let cancelled = false;
        setClassSubjectsLoading(true);
        fetchClassSubjects(studentClassLabel)
            .then((list) => { if (!cancelled && list.length > 0) setLiveClassSubjects(list); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setClassSubjectsLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentClassLabel]);

    const draftKey = () => `${storePrefix}-draft:v1:${studentId}:${session}:${normResultTerm(term)}`;

    useEffect(() => {
        if (sessionOptions.length > 0 && !session) {
            const current = metaSessions.find((s) => s.isCurrent);
            if (incoming.session && sessionOptions.includes(incoming.session)) {
                setSession(incoming.session);
            } else if (current) {
                setSession(current.name);
            } else {
                setSession(sessionOptions[sessionOptions.length - 1]);
            }
        }
        if (termOptions.length > 0 && !term) {
            const it = normResultTerm(incoming.term);
            if (it && termOptions.includes(it)) setTerm(it);
            else setTerm(termOptions[termOptions.length - 1]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionOptions.length]);

    useEffect(() => {
        if (student) {
            setLoadingStudent(false);
            return;
        }
        fetch(`${RESULT_BASE_URL}/api/${api}/students/${encodeURIComponent(studentId)}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Student not found.");
                return res.json();
            })
            .then((data) => setStudent(data.data || null))
            .catch(() => setLoadError("Failed to load student details."))
            .finally(() => setLoadingStudent(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    const normaliseSavedSubjects = (raw) => {
        const list = raw?.subjects || raw?.scores || raw?.items || [];
        if (!Array.isArray(list)) return [];
        return list
            .map((s, i) => {
                const name = s?.subject ?? s?.name ?? s?.title ?? "";
                if (!name) return null;
                const ca1 = Number(s?.ca1 ?? s?.ca1Score ?? 0) || 0;
                const ca2 = Number(s?.ca2 ?? s?.ca2Score ?? 0) || 0;
                const exam = Number(s?.exam ?? s?.examScore ?? 0) || 0;
                const total = Number(s?.total ?? s?.percent ?? s?.thirdTotal ?? (ca1 + ca2 + exam)) || 0;
                const g = s?.grade && s?.remark ? { grade: s.grade, remark: s.remark } : getResultGrade(total);
                return {
                    id: s?._id || s?.id || `saved-${i}`,
                    subject: canonicalSubjectName(name),
                    ca1, ca2, exam, total,
                    grade: g.grade, remark: g.remark,
                };
            })
            .filter(Boolean);
    };

    useEffect(() => {
        if (!studentId || !session) {
            setLoadingSaved(false);
            return;
        }
        const seq = ++savedLoadSeq.current;
        setLoadingSaved(true);
        setResults([]);
        setResultLocked(false);
        const wantTerm = normResultTerm(termLabel || term);

        let found = null;
        try {
            const draftRaw = localStorage.getItem(`${storePrefix}-draft:v1:${studentId}:${session}:${wantTerm}`);
            if (draftRaw) found = JSON.parse(draftRaw);
            if (!found) {
                const raw = localStorage.getItem(`${storePrefix}:v3:${studentId}:${session}:${wantTerm}`);
                if (raw) found = JSON.parse(raw);
            }
        } catch { /* ignore corrupt snapshot */ }

        // Tightened backend: the saved-results payload now carries
        // offeredSubjects / availableSubjects for this student's class.
        (async () => {
            try {
                const params = new URLSearchParams({ session, term: termLabel });
                const res = await fetch(
                    `${RESULT_BASE_URL}/api/${api}/results/${encodeURIComponent(studentId)}?${params}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.ok) return;
                const json = await res.json().catch(() => ({}));
                const d = json?.data ?? json?.result ?? json;
                const offered = d?.offeredSubjects ?? d?.availableSubjects ?? null;
                const list = normSubjectNames(offered);
                if (savedLoadSeq.current === seq && list.length > 0) setOfferedSubjects(list);
            } catch { /* optional — live class fetch covers this */ }
        })();

        if (savedLoadSeq.current !== seq) return;

        if (found) {
            const rows = normaliseSavedSubjects(found);
            const isFinal = Boolean(found?.isFinal ?? found?.published ?? false);
            if (rows.length > 0) setResults(rows);
            if (isFinal) setResultLocked(true);
            const single = found?.comment;
            const singleText = typeof single === "string" ? single : single?.text;
            if (singleText) {
                setComments((prev) => {
                    if (prev.length > 0) return prev;
                    return dedupeComments([{
                        _id: single?._id || single?.id || "result-comment",
                        text: singleText,
                        author: single?.author,
                        createdAt: single?.createdAt || found?.updatedAt || new Date().toISOString(),
                    }]);
                });
            }
        }
        setLoadingSaved(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId, session, term]);

    const loadComments = (overrideSession, overrideTermLabel) => {
        const effSession = overrideSession || session;
        const effTermLabel = overrideTermLabel || termLabel;
        if (!effSession || !effTermLabel) {
            setComments([]);
            setLoadingComments(false);
            return;
        }
        setLoadingComments(true);
        const params = new URLSearchParams({ session: effSession, term: effTermLabel });
        fetch(`${RESULT_BASE_URL}/api/${api}/results/${encodeURIComponent(studentId)}/comments?${params}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then(async (res) => {
                let json = {};
                try { json = await res.json(); } catch { /* ignore */ }
                if (!res.ok) {
                    if (res.status === 404) {
                        setComments((prev) => (prev.length > 0 ? prev : []));
                        return;
                    }
                    throw new Error(json.message || "Failed to load comments.");
                }
                const raw =
                    json.data && !Array.isArray(json.data) && Array.isArray(json.data.comments)
                        ? json.data.comments
                        : (json.data || json.comments || []);
                const list = Array.isArray(raw) ? raw : [];
                if (list.length > 0) {
                    setCommentNotice(
                        `Linked to your saved result (${effSession} · ${effTermLabel}) — comments save with the result.`
                    );
                }
                setComments(dedupeComments(list));
            })
            .catch(() => setLoadingComments(false))
            .finally(() => setLoadingComments(false));
    };

    useEffect(() => {
        loadComments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId, session, term]);

    // Live draft — restores unsaved typing after refresh; harmless because the
    // backend remains the source of truth for saved (v3) results.
    useEffect(() => {
        if (!studentId || !session || !term || resultLocked) return;
        const key = draftKey();
        try {
            const latestComment = [...comments]
                .map((c) => c?.text)
                .filter((t) => String(t ?? "").trim())
                .pop();
            localStorage.setItem(
                key,
                JSON.stringify({
                    session,
                    term: normResultTerm(term),
                    subjects: results.map((r) => ({
                        subject: r.subject,
                        ca1: r.ca1,
                        ca2: r.ca2,
                        exam: r.exam,
                        total: r.total,
                        grade: r.grade,
                        remark: r.remark,
                    })),
                    comment: latestComment || null,
                    updatedAt: new Date().toISOString(),
                })
            );
        } catch { /* storage may be unavailable */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [results, comments, session, term, studentId, resultLocked]);

    const handleAddComment = async () => {
        const text = commentInput.trim();
        if (!text || postingComment) return;
        if (commentInFlight.current) return;
        commentInFlight.current = true;
        setPostingComment(true);
        setCommentError("");
        setCommentNotice("");
        try {
            if (!session || !termLabel) throw new Error("Please select a session/term.");
            const res = await fetch(`${RESULT_BASE_URL}/api/${api}/results/${encodeURIComponent(studentId)}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ text, session, term: termLabel }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "Failed to add comment.");
            const attached = data.attachedTo || data.data?.attachedTo || null;
            if (attached?.fallback) {
                setCommentNotice(
                    `No result exists for ${session} · ${termLabel} yet — comment attached to ${attached.session || session} · ${attached.term || termLabel}.`
                );
            }
            setCommentInput("");
            loadComments(attached?.session || session, attached?.term || termLabel);
        } catch (err) {
            setCommentError(err.message || "Failed to add comment. Please try again.");
        } finally {
            commentInFlight.current = false;
            setPostingComment(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!commentId || deletingCommentId) return;
        setDeletingCommentId(commentId);
        setCommentError("");
        try {
            const params = new URLSearchParams({ session, term: termLabel });
            const res = await fetch(
                `${RESULT_BASE_URL}/api/${api}/results/${encodeURIComponent(studentId)}/comments/${encodeURIComponent(commentId)}?${params}`,
                { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } }
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to delete comment.");
            }
            setComments((prev) => prev.filter((c) => (c._id || c.id) !== commentId));
        } catch (err) {
            setCommentError(err.message || "Failed to delete comment.");
        } finally {
            setDeletingCommentId(null);
        }
    };

    const handleRowChange = (field, value) => {
        if (resultLocked) return;
        setSubmitError("");
        setRowInput((prev) => {
            const next = { ...prev, [field]: value };
            const { subject, ca1, ca2, exam } = next;
            const filledCount = [ca1, ca2, exam].filter((v) => String(v ?? "").trim() !== "").length;
            if (filledCount >= 2 && field !== "subject") {
                if (!subject) {
                    const first = subjectOptions[0];
                    if (first) next.subject = first;
                } else if (value !== "" && !usingFallbackSubjects && !isOfferedSubject(subject)) {
                    setSubmitError(
                        `"${subject}" is not offered in ${studentClassLabel || "this class"}. ` +
                        `Offered subjects: ${subjectOptions.join(", ")}`
                    );
                }
            }
            return next;
        });
    };

    const handleAddResult = () => {
        const { subject, ca1, ca2, exam } = rowInput;
        if (!subject || ca1 === "" || ca2 === "" || exam === "") return;
        const ca1Num = clampScore(ca1, 20);
        const ca2Num = clampScore(ca2, 20);
        const examNum = clampScore(exam, 60);
        if (ca1Num + ca2Num + examNum > 100) return;
        const canonSubject = canonicalSubjectName(subject);
        if (!usingFallbackSubjects && !isOfferedSubject(canonSubject)) {
            setSubmitError(
                `"${canonSubject}" is not offered in ${studentClassLabel || "this class"}. ` +
                `Offered subjects: ${subjectOptions.join(", ")}`
            );
            return;
        }
        setSubmitError("");
        const total = ca1Num + ca2Num + examNum;
        const { grade, remark } = getResultGrade(total);
        if (editingId) {
            setResults((prev) =>
                prev.map((r) =>
                    r.id === editingId
                        ? { ...r, subject: canonSubject, ca1: ca1Num, ca2: ca2Num, exam: examNum, total, grade, remark }
                        : r
                )
            );
            setEditingId(null);
        } else {
            setResults((prev) => [
                ...prev,
                { id: Date.now(), subject: canonSubject, ca1: ca1Num, ca2: ca2Num, exam: examNum, total, grade, remark },
            ]);
        }
        setRowInput(EMPTY_RESULT_ROW);
    };

    const handleEditRow = (r) => {
        setEditingId(r.id);
        setRowInput({
            subject: r.subject,
            ca1: String(r.ca1 ?? ""),
            ca2: String(r.ca2 ?? ""),
            exam: String(r.exam ?? ""),
        });
    };

    const handleDeleteRow = (id) => {
        setResults((prev) => prev.filter((r) => r.id !== id));
        if (editingId === id) {
            setEditingId(null);
            setRowInput(EMPTY_RESULT_ROW);
        }
    };

    const HEX24 = /^[0-9a-fA-F]{24}$/;

    const handleSubmitResult = async () => {
        if (submitInFlight.current) return;
        submitInFlight.current = true;
        setSubmitting(true);
        setSubmitError("");
        setSubmitNotice("");
        try {
            const sessionName = String(session || "").trim();
            const safeSession = sessionName && !HEX24.test(sessionName) ? sessionName : undefined;
            if (!safeSession) throw new Error("Please select a session/term.");
            const termValue = normResultTerm(term);
            if (!["first", "second", "third"].includes(termValue)) {
                throw new Error("Please select a term first.");
            }
            const normalizedSubjects = results
                .map((r) => ({
                    subject: canonicalSubjectName(r.subject),
                    ca1: clampScore(r.ca1, 20),
                    ca2: clampScore(r.ca2, 20),
                    exam: clampScore(r.exam, 60),
                }))
                .filter((s) => s.subject && (s.ca1 + s.ca2 + s.exam) <= 100);
            if (normalizedSubjects.length === 0) {
                throw new Error("At least one subject is required.");
            }
            if (!usingFallbackSubjects) {
                const offList = normalizedSubjects.filter((s) => !isOfferedSubject(s.subject));
                if (offList.length > 0) {
                    const unique = [...new Set(offList.map((s) => s.subject))];
                    throw new Error(
                        `${unique.join(", ")} ${unique.length === 1 ? "is" : "are"} not offered in ` +
                        `${studentClassLabel || "this class"}. Offered subjects: ${subjectOptions.join(", ")}`
                    );
                }
            }
            const studentRef = studentId || student?.id || student?._id || student?.studentId;
            const studentClass =
                student?.classLabel?.name || student?.classLabel ||
                student?.class?.name || student?.class ||
                student?.studentClass || student?.student_class || undefined;
            const payload = {
                studentId: studentRef,
                ...(safeSession ? { session: safeSession } : {}),
                term: termValue,
                subjects: normalizedSubjects,
                ...(studentClass ? { class: studentClass } : {}),
            };
            const res = await fetch(`${RESULT_BASE_URL}/api/${api}/results`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (res.status === 403 && /published/i.test(data.message || "")) {
                    setResultLocked(true);
                }
                throw new Error(`${data.message || "Failed to save result."} (HTTP ${res.status})`);
            }
            setSubmitNotice(
                `Result saved for ${safeSession} · ${TERM_VALUE_TO_LABEL[termValue] || termLabel}.`
            );
            loadComments(safeSession || undefined, TERM_VALUE_TO_LABEL[termValue] || termLabel);
            try {
                const snapTerm = normResultTerm(termValue || termLabel || term);
                const snapSession = safeSession || session;
                const latestComment = [...comments]
                    .map((c) => c?.text)
                    .filter((t) => String(t ?? "").trim())
                    .pop();
                localStorage.setItem(
                    `${storePrefix}:v3:${studentId}:${snapSession}:${snapTerm}`,
                    JSON.stringify({
                        session: snapSession,
                        term: snapTerm,
                        subjects: results.map((r) => ({
                            subject: r.subject,
                            ca1: r.ca1,
                            ca2: r.ca2,
                            exam: r.exam,
                            total: r.total,
                            grade: r.grade,
                            remark: r.remark,
                        })),
                        comment: latestComment || null,
                        isSubmitted: false,
                        updatedAt: new Date().toISOString(),
                    })
                );
                localStorage.removeItem(draftKey());
            } catch { /* snapshot is best-effort only */ }
        } catch (err) {
            setSubmitError(err.message || "Failed to save result. Please try again.");
        } finally {
            submitInFlight.current = false;
            setSubmitting(false);
        }
    };

    const livePreview =
        rowInput.ca1 !== "" && rowInput.ca2 !== "" && rowInput.exam !== ""
            ? (() => {
                const t = clampScore(rowInput.ca1, 20) + clampScore(rowInput.ca2, 20) + clampScore(rowInput.exam, 60);
                return { total: t, ...getResultGrade(t) };
            })()
            : null;

    return {
        student, loadingStudent, loadError,
        studentClassLabel, subjectOptions, usingFallbackSubjects,
        classSubjectsLoading, isOfferedSubject,
        session, setSession, term, setTerm, termLabel,
        sessionOptions, termOptions, termValueToLabel: TERM_VALUE_TO_LABEL,
        rowInput, setRowInput: handleRowChange, results,
        editingId, livePreview, showGrade: !isLowerSchoolClass(studentClassLabel),
        comments, loadingComments, commentInput, setCommentInput,
        postingComment, commentError, commentNotice, deletingCommentId,
        resultLocked, submitting, submitError, submitNotice, loadingSaved,
        handleAddComment, handleDeleteComment,
        handleAddResult, handleEditRow, handleDeleteRow, handleSubmitResult,
    };
}


