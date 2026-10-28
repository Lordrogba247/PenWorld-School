import { useState } from "react";
import "./5Result.css";
import schoolLogo from "../../assets/logo4.png";
import principalSign from "../../assets/sign1.png";
import lowerSign from "../../assets/sign2.png";
import { useStudentMeta } from "../../hooks/useStudentMeta";

const BASE_URL = "https://penworld-gloryseed-demo-school-back.vercel.app";

// Term display labels — backend expects lowercase values ("first"/"second"/"third")
const TERM_LABELS = { first: "First Term", second: "Second Term", third: "Third Term" };

// Decide which school name to show on the result header, based on the student's class.
// Kindergarten/Nursery/Primary classes → "PenWorld Nursery and Primary School"
// Everything else (JSS/SSS) → "PenWorld College"
function getSchoolName(studentClass) {
    if (!studentClass) return "PenWorld College & PRIMARY SCHOOL";
    const cls = String(studentClass).toLowerCase();
    const isLowerSchool = cls.includes("primary") || cls.includes("nursery") || cls.includes("kindergarten") || cls.includes("creche") || /(^|[^a-z])kg([^a-z]|$)/.test(cls);
    return isLowerSchool
        ? "PenWorld NURSERY AND PRIMARY SCHOOL"
        : "PenWorld College";
}

// Grade column + sign2 signature only apply to Kindergarten/Nursery/Primary.
// Secondary (JSS/SSS) keeps Grade column + sign1 signature.
function isLowerSchoolClass(studentClass) {
    if (!studentClass) return false;
    const cls = String(studentClass).toLowerCase();
    return cls.includes("primary") || cls.includes("nursery") || cls.includes("kindergarten") || cls.includes("creche") || /(^|[^a-z])kg([^a-z]|$)/.test(cls);
}

function getGradeFromTotal(total) {
    const t = Number(total) || 0;
    if (t >= 75) return { grade: "A1", remark: "Excellent" };
    if (t >= 70) return { grade: "B2", remark: "V.Good" };
    if (t >= 65) return { grade: "B3", remark: "Good" };
    if (t >= 60) return { grade: "C4", remark: "Credit" };
    if (t >= 55) return { grade: "C5", remark: "Credit" };
    if (t >= 50) return { grade: "C6", remark: "Credit" };
    if (t >= 45) return { grade: "D7", remark: "Pass" };
    if (t >= 40) return { grade: "E8", remark: "Pass" };
    return { grade: "F9", remark: "Fail" };
}

// Normalise term value/label coming from meta or state to "first"/"second"/"third"
function normaliseTermValue(t) {
    if (!t) return "";
    const v = String(t).toLowerCase();
    if (v.includes("first")) return "first";
    if (v.includes("second")) return "second";
    if (v.includes("third")) return "third";
    return v;
}

export default function StudentResults() {
    const { sessions: metaSessions, terms: metaTerms, loading: metaLoading } = useStudentMeta();

    const [session, setSession] = useState("");
    const [term, setTerm] = useState("");
    const [resultData, setResultData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Default session/term once meta loads
    useState(() => {
        if (metaSessions.length > 0 && !session) {
            const current = metaSessions.find((s) => s.isCurrent) || metaSessions[0];
            setSession(typeof current === "string" ? current : current.name);
        }
        if (metaTerms.length > 0 && !term) {
            setTerm(metaTerms[metaTerms.length - 1]);
        }
    }, [metaSessions, metaTerms]);

    const handleCheckResults = async () => {
        setLoading(true);
        setError("");
        setResultData(null);

        try {
            const token = localStorage.getItem("token");

            const params = new URLSearchParams({ session, term });

            const res = await fetch(`${BASE_URL}/api/student/results?${params}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "No result found for the selected session and term.");
            }

            // Confirmed shape: { success, data: { studentInfo, subjects, totalScore, percentage, comment } }
            let current = data.data || data;

            // The result sheet shows ONE comment, but staff comments may live on the
            // separate comment-thread endpoint. If the result has no comment, fall back
            // to the latest thread comment so "Add Comment" still shows on the result.
            if (!current.comment) {
                try {
                    const cp = new URLSearchParams({ session, term });
                    const cr = await fetch(`${BASE_URL}/api/student/results/comments?${cp}`, {
                        method: "GET",
                        headers: { "Authorization": `Bearer ${token}` },
                    });
                    if (cr.ok) {
                        const cj = await cr.json();
                        const list = cj.data || cj.comments || [];
                        let latest = Array.isArray(list) ? list[list.length - 1] : null;
                        let text = latest?.text || cj.comment || null;
                        if (!text) {
                            // Selector may be stale while the backend attached the
                            // comment to the latest result — retry unfiltered.
                            try {
                                const ur = await fetch(`${BASE_URL}/api/student/results/comments`, {
                                    method: "GET",
                                    headers: { "Authorization": `Bearer ${token}` },
                                });
                                if (ur.ok) {
                                    const uj = await ur.json();
                                    const all = uj.data || uj.comments || [];
                                    latest = Array.isArray(all) ? all[all.length - 1] : null;
                                    text = latest?.text || uj.comment || null;
                                }
                            } catch {
                                // keep result rendering without the thread comment
                            }
                        }
                        if (text) current = { ...current, comment: text };
                    }
                } catch {
                    // Non-fatal — result still displays without the thread comment.
                }
            }

            // For third term: also fetch first + second term so we can show
            // 1st Term Total | 2nd Term Total | Grand Total (average of the 3 term totals).
            // Grand Total is then used for percentage + grading.
            const isThird = normaliseTermValue(term) === "third";
            if (isThird) {
                const fetchTerm = async (termValue) => {
                    try {
                        const p = new URLSearchParams({ session, term: termValue });
                        const r = await fetch(`${BASE_URL}/api/student/results?${p}`, {
                            method: "GET",
                            headers: { "Authorization": `Bearer ${token}` },
                        });
                        if (!r.ok) return null;
                        const j = await r.json();
                        return j.data || j || null;
                    } catch {
                        return null;
                    }
                };
                const [firstData, secondData] = await Promise.all([
                    fetchTerm("first"),
                    fetchTerm("second"),
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
                    // Average of available term totals (first + second + third).
                    const parts = [firstTotal, secondTotal, thirdTotal].filter((v) => v !== null && !Number.isNaN(v));
                    const grandTotal = parts.length > 0
                        ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10
                        : thirdTotal;
                    const calc = getGradeFromTotal(grandTotal);
                    return {
                        ...s,
                        firstTotal,
                        secondTotal,
                        thirdTotal,
                        grandTotal,
                        // In third term, grade AND remark come from Grand Total
                        grade: calc.grade,
                        remark: calc.remark,
                    };
                });

                const grandSum = mergedSubjects.reduce((a, s) => a + (Number(s.grandTotal) || 0), 0);
                const grandPercentage = mergedSubjects.length > 0
                    ? Math.round((grandSum / mergedSubjects.length) * 10) / 10
                    : current.percentage;

                current = {
                    ...current,
                    subjects: mergedSubjects,
                    totalScore: grandSum,
                    percentage: grandPercentage,
                    isThirdTerm: true,
                };
            }

            setResultData(current);
        } catch (err) {
            setError(err.message || "No result found for the selected session and term.");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="sr-page">
            <h1 className="sr-title">My Results</h1>
            <p className="sr-sub">Select Session &amp; Term to view your results</p>

            <div className="sr-selectors">
                <select className="sr-select" value={session} onChange={(e) => setSession(e.target.value)} disabled={metaLoading}>
                    {metaSessions.map((s) => {
                        const name = typeof s === "string" ? s : s.name;
                        return <option key={name} value={name}>{name}</option>;
                    })}
                </select>
                <select className="sr-select" value={term} onChange={(e) => setTerm(e.target.value)} disabled={metaLoading}>
                    {metaTerms.map((t) => (
                        <option key={t} value={t}>{TERM_LABELS[t] || t}</option>
                    ))}
                </select>
                <button className="sr-check-btn" onClick={handleCheckResults} disabled={loading || metaLoading}>
                    {loading ? "Loading..." : "Check Results"}
                </button>
            </div>

            {error && <p className="sr-fetch-error">{error}</p>}

            {resultData && (() => {
                const showGrade = !isLowerSchoolClass(resultData.studentInfo?.class);
                const signatureImg = isLowerSchoolClass(resultData.studentInfo?.class) ? lowerSign : principalSign;
                return (
                    <div className="sr-card">
                        {/* Letterhead */}
                        <div className="sr-letterhead">
                            <img src={schoolLogo} alt={getSchoolName(resultData.studentInfo?.class)} className="sr-letterhead-logo" />
                            <div className="sr-letterhead-text">
                                <p className="sr-letterhead-name">{getSchoolName(resultData.studentInfo?.class)}</p>
                                <p className="sr-letterhead-address"><span className="sr-lh-bold">School A:</span> 84, Gaa-Akanbi Road behind Erin-Ile Junction, Ilorin, Kwara State.</p>
                                <p className="sr-letterhead-address"><span className="sr-lh-bold">School B:</span> Redemption Road Gbogede, Amoyo, Kwara State.</p>
                                <p className="sr-letterhead-address"><span className="sr-lh-bold">Tel:</span> 08038607740, 08118958365, 08129807674, 07031259915.</p>
                                <p className="sr-letterhead-motto"><span className="sr-lh-bold">Motto:</span> serving God &amp; Humanity</p>
                            </div>
                        </div>

                        {/* Student info */}
                        <div className="sr-info-grid">
                            <p className="sr-info-item">
                                <span className="sr-info-label">Name:</span> {resultData.studentInfo?.name}
                            </p>
                            <p className="sr-info-item">
                                <span className="sr-info-label">Student ID:</span> {resultData.studentInfo?.studentId}
                            </p>
                            <p className="sr-info-item">
                                <span className="sr-info-label">Sex:</span> {resultData.studentInfo?.sex}
                            </p>
                            <p className="sr-info-item">
                                <span className="sr-info-label">Session:</span> {session}
                            </p>
                            <p className="sr-info-item">
                                <span className="sr-info-label">Term:</span> {TERM_LABELS[term] || term}
                            </p>
                            <p className="sr-info-item">
                                <span className="sr-info-label">Class:</span> {resultData.studentInfo?.class}
                            </p>
                        </div>

                        {/* Subjects table */}
                        <div className="sr-table-wrap">
                            <table className="sr-table">
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
                                    {resultData.subjects?.map((s) => (
                                        <tr key={s.name || s.subject}>
                                            <td className="sr-subject-name">{s.name || s.subject}</td>
                                            <td>{s.ca1}</td>
                                            <td>{s.ca2}</td>
                                            <td>{s.exam}</td>
                                            <td>{s.percent ?? s.total ?? s.thirdTotal}</td>
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
                        <div className="sr-stats">
                            <div className="sr-stat-box">
                                <p className="sr-stat-value">{resultData.subjects?.length}</p>
                                <p className="sr-stat-label">Subjects</p>
                            </div>
                            <div className="sr-stat-box">
                                <p className="sr-stat-value">{resultData.totalScore}</p>
                                <p className="sr-stat-label">Total Score</p>
                            </div>
                            <div className="sr-stat-box">
                                <p className="sr-stat-value">{resultData.percentage}</p>
                                <p className="sr-stat-label">Percentage</p>
                            </div>
                        </div>

                        {/* Comment */}
                        <div className="sr-comment-section">
                            <p className="sr-comment-label">Comment</p>
                            <p className="sr-comment-text">{resultData.comment}</p>
                            <img src={signatureImg} alt="Principal Signature" className="sr-signature1" />
                            <p className="sr-signature">Principal's Signature</p>
                        </div>

                        {/* Print button */}
                        <div className="sr-print-row">
                            <button className="sr-print-btn" onClick={handlePrint}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
                                    <path d="M0 0h24v24H0z" fill="none" />
                                    <path fill="#fff" d="M18 7H6V3h12zm0 5.5q.425 0 .713-.288T19 11.5t-.288-.712T18 10.5t-.712.288T17 11.5t.288.713t.712.287M16 19v-4H8v4zm2 2H6v-4H2v-6q0-1.275.875-2.137T5 8h14q1.275 0 2.138.863T22 11v6h-4z" />
                                </svg>
                                Print Result
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

