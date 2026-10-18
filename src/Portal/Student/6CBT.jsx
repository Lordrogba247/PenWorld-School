import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./6CBT.css";
import { isTestSubmitted } from "./cbtSubmitGuard";

const BASE_URL = "https://penworld-demo-school-backend.vercel.app";

// A test is visible only while it is live:
// - explicitly deactivated (isActive === false) -> hidden
// - explicit status like "expired"/"closed"/"inactive" -> hidden
// - past expiresAt -> hidden (covers admin "Reactivate +1 Day" = now + 24h)
// - past scheduled date (test.date before today) -> hidden
//   (backend deletes staff/admin history after 7 days, but students must
//   stop seeing it the day after the scheduled date / expiry)
// - otherwise (no expiry info) -> show, backend is the source of truth
const isTestLive = (test) => {
    if (!test || typeof test !== "object") return false;
    if (test.isActive === false) return false;
    if (typeof test.status === "string" && /expir|clos|inactive|archived/i.test(test.status)) return false;
    if (typeof test.isPublished === "boolean" && test.isPublished === false) return false;
    for (const key of ["expiresAt", "expires_at", "expiryDate"]) {
        if (test[key]) {
            const exp = new Date(test[key]).getTime();
            if (!Number.isNaN(exp) && exp <= Date.now()) return false;
        }
    }
    // Scheduled-date expiry: a test lives only on its scheduled date (plus any
    // explicit expiresAt window above, e.g. +24h reactivation).
    // test.date may be "2026-10-01", ISO string, or display string — parse defensively.
    if (!test.expiresAt && !test.expires_at && !test.expiryDate && test.date) {
        const d = new Date(test.date);
        if (!Number.isNaN(d.getTime())) {
            const endOfScheduledDay = new Date(d);
            endOfScheduledDay.setHours(23, 59, 59, 999);
            if (endOfScheduledDay.getTime() < Date.now()) return false;
        }
    }
    return true;
};

export default function StudentCBT() {
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Bumped whenever the tab regains focus / storage changes so a test that
    // was just submitted (in the exam tab) instantly shows as "Submitted".
    const [, setAttemptTick] = useState(0);

    const fetchTests = useCallback(() => {
        const token = localStorage.getItem("token");

        setLoading(true);
        fetch(`${BASE_URL}/api/cbt`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load CBT tests.");
                return res.json();
            })
            .then((data) => setTests((data.data || []).filter(isTestLive)))
            .catch((err) => setError(err.message || "Failed to load CBT tests."))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchTests();
        // Re-check expiry every 60s so a test that just expired disappears
        // without needing a page reload.
        const id = setInterval(() => {
            setTests((prev) => prev.filter(isTestLive));
        }, 60000);
        return () => clearInterval(id);
    }, [fetchTests]);

    // Also re-filter when tab regains focus (student leaves tab open past expiry).
    // Also re-render on focus / storage change so a test submitted in the
    // exam tab immediately shows its "Submitted" state when coming back here.
    useEffect(() => {
        const onFocus = () => {
            setTests((prev) => prev.filter(isTestLive));
            setAttemptTick((t) => t + 1);
        };
        const onStorage = () => setAttemptTick((t) => t + 1);
        window.addEventListener("focus", onFocus);
        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    const handleStartTest = (test) => {
        // Single-attempt rule: once submitted, this student can never open
        // the test again (even via a direct URL / page refresh).
        if (isTestSubmitted(test)) {
            alert("You have already submitted this test/exam. You cannot take it again.");
            return;
        }
        // Guard: don't let a stale card (expired while list was open) start.
        if (!isTestLive(test)) {
            setTests((prev) => prev.filter((t) => (t._id || t.id) !== (test._id || test.id)));
            return;
        }
        navigate(`/portal/student/cbt/${test._id || test.id}`, { state: { test } });
    };

    if (loading) return (
        <div className="cbt-page">
            <h1 className="cbt-title">CBT Test/Exam</h1>
            <p className="cbt-sub">Take your computer-based tests and exam</p>
            <p style={{ fontFamily: "Poppins, sans-serif", fontSize: 13, color: "#888" }}>Loading...</p>
        </div>
    );

    if (error) return (
        <div className="cbt-page">
            <h1 className="cbt-title">CBT Test/Exam</h1>
            <p className="cbt-sub">Take your computer-based tests and exam</p>
            <p style={{ fontFamily: "Poppins, sans-serif", fontSize: 13, color: "#c0392b" }}>{error}</p>
        </div>
    );

    return (
        <div className="cbt-page">
            <h1 className="cbt-title">CBT Test/Exam</h1>
            <p className="cbt-sub">Tests scheduled for today only — take each test on its scheduled date</p>

            {tests.length === 0 ? (
                <div className="cbt-soon-card">
                    <div className="cbt-soon-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                        </svg>
                    </div>
                    <h2 className="cbt-soon-title">No Tests Today</h2>
                    <p className="cbt-soon-text">
                        No CBT Tests/Exams are scheduled for today. Each test is only available on its scheduled date — check back on your test day!
                    </p>
                </div>
            ) : (
                <div className="cbt-list">
                    <div className="cbt-warning">
                        <span className="cbt-warning-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                            </svg>
                        </span>
                        <p className="cbt-warning-text">
                            <span className="cbt-warning-bold">Important:</span> Each test is only available on its scheduled date. Once you start an exam, you cannot pause it. Ensure you have a stable internet connection and sufficient time to complete the exam. The timer will start immediately upon clicking "Start Exam".
                        </p>
                    </div>

                    {tests.map((test) => {
                        const submitted = isTestSubmitted(test);
                        return (
                        <div className="cbt-card" key={test._id || test.id}>
                            <div className="cbt-card-header">
                                <p className="cbt-card-subject">{test.subject}</p>
                                <p className="cbt-card-type">{test.description}</p>
                            </div>
                            <div className="cbt-card-body">
                                <p className="cbt-meta-row">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                    </svg>
                                    Duration: {test.duration}mins
                                </p>
                                <p className="cbt-meta-row">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                                        <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                                    </svg>
                                    Questions: {test.questions}
                                </p>
                                <p className="cbt-meta-row">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                                    </svg>
                                    Date of Test/Exam: {test.date}
                                </p>
                                {submitted ? (
                                    <>
                                        <p className="cbt-submitted-note">
                                            ✓ You have already submitted this test/exam. You cannot take it again.
                                        </p>
                                        <button className="cbt-start-btn cbt-start-btn--submitted" disabled>
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                            </svg>
                                            Submitted
                                        </button>
                                    </>
                                ) : (
                                <button className="cbt-start-btn" onClick={() => handleStartTest(test)}>
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                    Start Test/Exam
                                </button>
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

