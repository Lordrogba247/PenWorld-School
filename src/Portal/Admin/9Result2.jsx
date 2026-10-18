import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./9Result2.css";
import schoolLogo from "../../assets/logo3.png";
import principalSign from "../../assets/sign1.png";
import lowerSign from "../../assets/sign2.png";

const BASE_URL = "https://pen-world-school.vercel.app";

const schoolInfo = {
    name: "PenWorld College & PRIMARY SCHOOL",
};

function isLowerSchoolClass(studentClass) {
    if (!studentClass) return false;
    const cls = String(studentClass).toLowerCase();
    return cls.includes("primary") || cls.includes("nursery") || cls.includes("kindergarten") || cls.includes("creche") || /(^|[^a-z])kg([^a-z]|$)/.test(cls);
}

function normaliseTermValue(t) {
    if (!t) return "";
    const v = String(t).toLowerCase();
    if (v.includes("first")) return "first";
    if (v.includes("second")) return "second";
    if (v.includes("third")) return "third";
    return v;
}

function getGradeFromTotal(total) {
    const x = Number(total) || 0;
    if (x >= 75) return { grade: "A1", remark: "Excellent" };
    if (x >= 70) return { grade: "B2", remark: "V.Good" };
    if (x >= 65) return { grade: "B3", remark: "Good" };
    if (x >= 60) return { grade: "C4", remark: "Credit" };
    if (x >= 55) return { grade: "C5", remark: "Credit" };
    if (x >= 50) return { grade: "C6", remark: "Credit" };
    if (x >= 45) return { grade: "D7", remark: "Pass" };
    if (x >= 40) return { grade: "E8", remark: "Pass" };
    return { grade: "F9", remark: "Fail" };
}

export default function AdminResultView() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const { session, term, classLabel } = location.state || {
        session: "2025/2026",
        term: "Third Term",
        classLabel: "",
    };

    const [student, setStudent] = useState(null);
    const [resultData, setResultData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        const isThird = normaliseTermValue(term) === "third";

        const fetchOne = async (termLabel) => {
            const params = new URLSearchParams({ session, term: termLabel });
            const res = await fetch(`${BASE_URL}/api/admin/results/${encodeURIComponent(studentId)}?${params}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (!res.ok) return null;
            const json = await res.json();
            return json.data || null;
        };

        (async () => {
            try {
                const current = await fetchOne(term);
                if (!current) throw new Error("No result found for this student.");

                // Same fallback as student view: if the result has no single comment,
                // pull the latest staff thread comment so it still shows on the sheet.
                let withComment = current;
                if (!current.comment) {
                    try {
                        const cp = new URLSearchParams({ session, term });
                        const cr = await fetch(
                            `${BASE_URL}/api/admin/results/${encodeURIComponent(studentId)}/comments?${cp}`,
                            { method: "GET", headers: { "Authorization": `Bearer ${token}` } }
                        );
                        if (cr.ok) {
                            const cj = await cr.json();
                            const list = cj.data || cj.comments || [];
                            let latest = Array.isArray(list) ? list[list.length - 1] : null;
                            let text = latest?.text || cj.comment || null;
                            if (!text) {
                                // Selector may be stale while the backend attached the
                                // comment to the latest result — retry unfiltered.
                                try {
                                    const ur = await fetch(
                                        `${BASE_URL}/api/admin/results/${encodeURIComponent(studentId)}/comments`,
                                        { method: "GET", headers: { "Authorization": `Bearer ${token}` } }
                                    );
                                    if (ur.ok) {
                                        const uj = await ur.json();
                                        const all = uj.data || uj.comments || [];
                                        latest = Array.isArray(all) ? all[all.length - 1] : null;
                                        text = latest?.text || uj.comment || null;
                                    }
                                } catch {
                                    // keep sheet rendering without the thread comment
                                }
                            }
                            if (text) withComment = { ...current, comment: text };
                        }
                    } catch {
                        // Non-fatal — sheet still renders without the thread comment.
                    }
                }
                let result = withComment;

                if (isThird) {
                    // Labels used by admin list are "First Term"/"Second Term"
                    const [firstData, secondData] = await Promise.all([
                        fetchOne("First Term"),
                        fetchOne("Second Term"),
                    ]);
                    const getTotalFor = (subj) => Number(subj?.total ?? subj?.percent ?? 0) || 0;
                    const mapByName = (subjects = []) => {
                        const m = {};
                        (subjects || []).forEach((s) => {
                            const key = String(s?.name || s?.subject || "").toLowerCase();
                            if (key) m[key] = s;
                        });
                        return m;
                    };
                    const firstMap = mapByName(firstData?.subjects);
                    const secondMap = mapByName(secondData?.subjects);
                    const mergedSubjects = (current.subjects || []).map((s) => {
                        const key = String(s?.name || s?.subject || "").toLowerCase();
                        const thirdTotal = getTotalFor(s);
                        const f = firstMap[key];
                        const snd = secondMap[key];
                        const firstTotal = f ? getTotalFor(f) : null;
                        const secondTotal = snd ? getTotalFor(snd) : null;
                        const parts = [firstTotal, secondTotal, thirdTotal].filter((v) => v !== null && !Number.isNaN(v));
                        const grandTotal = parts.length > 0
                            ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10
                            : thirdTotal;
                        const calc = getGradeFromTotal(grandTotal);
                        return { ...s, firstTotal, secondTotal, thirdTotal, grandTotal, grade: calc.grade, remark: calc.remark };
                    });
                    const grandSum = mergedSubjects.reduce((a, s) => a + (Number(s.grandTotal) || 0), 0);
                    const grandPercentage = mergedSubjects.length > 0
                        ? Math.round((grandSum / mergedSubjects.length) * 10) / 10
                        : current.percentage;
                    result = { ...withComment, subjects: mergedSubjects, totalScore: grandSum, percentage: grandPercentage, isThirdTerm: true };
                }

                setStudent(result?.studentInfo || null);
                setResultData(result);
            } catch (err) {
                setError(err.message || "Failed to load result.");
            } finally {
                setLoading(false);
            }
        })();
    }, [studentId, session, term]);

    if (loading) return (
        <div className="adr2-page">
            <button className="adr2-back-btn" onClick={() => navigate("/portal/admin/results")}>
                ← Back to Results
            </button>
            <p>Loading result...</p>
        </div>
    );

    if (error || !resultData) return (
        <div className="adr2-page">
            <button className="adr2-back-btn" onClick={() => navigate("/portal/admin/results")}>
                ← Back to Results
            </button>
            <p className="adr2-error">{error || "No result found."}</p>
        </div>
    );

    const showGrade = !isLowerSchoolClass(student?.class || student?.studentClass || classLabel);
    const signatureImg = isLowerSchoolClass(student?.class || student?.studentClass || classLabel) ? lowerSign : principalSign;

    return (
        <div className="adr2-page">
            <button className="adr2-back-btn" onClick={() => navigate("/portal/admin/results")}>
                ← Back to Results
            </button>

            <div className="adr2-card">
                {/* Letterhead */}
                <div className="adr2-letterhead">
                    <img src={schoolLogo} alt="PenWorld College" className="adr2-letterhead-logo" />
                    <p className="adr2-letterhead-name">{schoolInfo.name}</p>
                </div>

                {/* Student info */}
                <div className="adr2-info-grid">
                    <p className="adr2-info-item"><span className="adr2-info-label">Name:</span> {student?.name}</p>
                    {/* Note: for this endpoint studentInfo.studentId is the human-readable
                        registration ID (e.g. HC/2026/XXXX), not the Mongo ObjectId */}
                    <p className="adr2-info-item"><span className="adr2-info-label">Student ID:</span> {student?.studentId}</p>
                    <p className="adr2-info-item"><span className="adr2-info-label">Sex:</span> {student?.sex}</p>
                    <p className="adr2-info-item"><span className="adr2-info-label">Session:</span> {session}</p>
                    <p className="adr2-info-item"><span className="adr2-info-label">Term:</span> {term}</p>
                    <p className="adr2-info-item"><span className="adr2-info-label">Class:</span> {student?.class || classLabel}</p>
                </div>

                {/* Subjects table */}
                <div className="adr2-table-wrap">
                    <table className="adr2-table">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>1st C.A (20)</th>
                                <th>2nd C.A (20)</th>
                                <th>Exam (60)</th>
                                <th>Total (100)</th>
                                {resultData.isThirdTerm && <th>1st Term Total</th>}
                                {resultData.isThirdTerm && <th>2nd Term Total</th>}
                                {resultData.isThirdTerm && <th>Grand Total</th>}
                                {showGrade && <th>Grade</th>}
                                <th>Remark</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(resultData.subjects || []).map((s) => (
                                <tr key={s.name || s.subject}>
                                    <td className="adr2-subject-name">{s.name || s.subject}</td>
                                    <td>{s.ca1}</td>
                                    <td>{s.ca2}</td>
                                    <td>{s.exam}</td>
                                    <td>{s.total || s.percent || s.thirdTotal}</td>
                                    {resultData.isThirdTerm && <td>{s.firstTotal ?? "—"}</td>}
                                    {resultData.isThirdTerm && <td>{s.secondTotal ?? "—"}</td>}
                                    {resultData.isThirdTerm && <td>{s.grandTotal}</td>}
                                    {showGrade && <td>{s.grade}</td>}
                                    <td>{s.remark}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary stats */}
                <div className="adr2-stats">
                    <div className="adr2-stat-box">
                        <p className="adr2-stat-value">{resultData.subjects?.length}</p>
                        <p className="adr2-stat-label">Subjects</p>
                    </div>
                    <div className="adr2-stat-box">
                        <p className="adr2-stat-value">{resultData.totalScore}</p>
                        <p className="adr2-stat-label">Total Score</p>
                    </div>
                    <div className="adr2-stat-box">
                        <p className="adr2-stat-value">{resultData.percentage}</p>
                        <p className="adr2-stat-label">Percentage</p>
                    </div>
                </div>

                {/* Comment */}
                <div className="adr2-comment-section">
                    <p className="adr2-comment-label">Comment</p>
                    <p className="adr2-comment-text">{resultData.comment}</p>
                    <img src={signatureImg} alt="Signature" className="adr2-signature1" style={{ width: 120, display: "block", marginBottom: 4 }} />
                    <p className="adr2-signature" style={{ fontSize: 12, color: "#666", margin: 0 }}>Principal's Signature</p>
                </div>
            </div>
        </div>
    );
}

