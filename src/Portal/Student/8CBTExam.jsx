import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./8CBTExam.css";
import {
    isTestSubmitted,
    isTestSubmittedByRecord,
    isTestSubmittedLocally,
    isAlreadySubmittedMessage,
    markTestSubmitted,
} from "./cbtSubmitGuard";

const BASE_URL = "https://heroesschool-management-backend.vercel.app";

// Fullscreen exam page — rendered OUTSIDE StudentLayout (see App.jsx),
// so no sidebar/topbar shows. Includes its own minimal brand header + auth guard.
export default function StudentCBTExam() {
    const { testId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const passedTest = location.state?.test;

    // Guard: kicked to login if no token (layout no longer does this for us)
    useEffect(() => {
        if (!localStorage.getItem("token")) {
            navigate("/portal/student/login", { replace: true });
        }
    }, [navigate]);

    const [examData, setExamData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    // Whether the student has clicked "Begin Exam" and fullscreen/timer has started
    const [examStarted, setExamStarted] = useState(false);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { [questionId]: "A" }

    const [secondsLeft, setSecondsLeft] = useState(null);
    const startTimeRef = useRef(null); // Date.now() when the exam actually started
    const timerRef = useRef(null);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [result, setResult] = useState(null); // { score, totalQuestions, percentage, passed }
    const hasSubmittedRef = useRef(false); // guards against double-submit (manual + timeout race)
    // True when this student already submitted THIS test before this page
    // loaded — blocks the exam UI entirely (covers refresh / direct-URL
    // re-entry after submit). Set from localStorage + backend record/403s.
    const [alreadySubmitted, setAlreadySubmitted] = useState(() =>
        isTestSubmittedLocally(testId) || isTestSubmitted(passedTest)
    );

    // Anti-cheat: violation modal + strike counters
    const [violation, setViolation] = useState(null); // { type: "focus"|"copy", final: boolean, message: string }
    const focusStrikesRef = useRef(0);
    const copyStrikesRef = useRef(0);

    const token = localStorage.getItem("token");

    // Fetch questions on mount (does NOT start the timer yet — that happens on "Begin Exam")
    // If the student already submitted this test, they may NOT re-enter it:
    // power-outage / refresh BEFORE submit still loads fine (answers are not
    // locked until submit succeeds), but AFTER submit the exam is blocked.
    useEffect(() => {
        if (isTestSubmittedLocally(testId) || isTestSubmitted(passedTest)) {
            setAlreadySubmitted(true);
            setLoading(false);
            return;
        }
        setLoading(true);
        setLoadError("");
        fetch(`${BASE_URL}/api/cbt/${testId}/questions`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                // Backend enforces the scheduled-day window: before day D -> 403
                // "not available yet"; day D+1 onwards -> 403 "closed". Surface
                // that message with a back button instead of a generic error.
                if (res.status === 403) {
                    const msg = data.message || "This test is only available on its scheduled date.";
                    // Backend single-attempt enforcement: treat "already submitted"
                    // 403s as a submitted lock, not a generic error.
                    if (isAlreadySubmittedMessage(msg) || isTestSubmittedByRecord(data.data)) {
                        markTestSubmitted(testId);
                        setAlreadySubmitted(true);
                        return null;
                    }
                    throw new Error(msg);
                }
                if (res.status === 409) {
                    markTestSubmitted(testId);
                    setAlreadySubmitted(true);
                    return null;
                }
                if (!res.ok) {
                    const msg = data.message || "Failed to load test questions.";
                    if (isAlreadySubmittedMessage(msg)) {
                        markTestSubmitted(testId);
                        setAlreadySubmitted(true);
                        return null;
                    }
                    throw new Error(msg);
                }
                // Some backends embed the submitted flag in the payload itself.
                if (isTestSubmittedByRecord(data.data) || isTestSubmittedByRecord(data)) {
                    markTestSubmitted(testId);
                    setAlreadySubmitted(true);
                    return null;
                }
                return data;
            })
            .then((data) => {
                if (!data) return;
                setExamData(data.data);
                setSecondsLeft((data.data.duration || 0) * 60);
            })
            .catch((err) => setLoadError(err.message || "Failed to load test questions."))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testId]);

    const buildAnswersPayload = useCallback(() => {
        return Object.entries(answers).map(([questionId, selected]) => ({ questionId, selected }));
    }, [answers]);

    const getElapsedSeconds = useCallback(() => {
        if (!startTimeRef.current) return 0;
        return Math.round((Date.now() - startTimeRef.current) / 1000);
    }, []);

    const submitTest = useCallback(async () => {
        if (hasSubmittedRef.current || alreadySubmitted) return;
        hasSubmittedRef.current = true;
        if (timerRef.current) clearInterval(timerRef.current);

        setSubmitting(true);
        setSubmitError("");
        try {
            const res = await fetch(`${BASE_URL}/api/cbt/${testId}/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    answers: buildAnswersPayload(),
                    timeTakenSeconds: getElapsedSeconds(),
                }),
            });
            const data = await res.json().catch(() => ({}));

            // Backend says "already submitted" (duplicate/retry after success):
            // lock the student out — the first submit already counted.
            if (
                res.status === 409 ||
                isAlreadySubmittedMessage(data.message) ||
                isTestSubmittedByRecord(data.data) ||
                isTestSubmittedByRecord(data)
            ) {
                markTestSubmitted(testId);
                setAlreadySubmitted(true);
                // Prefer the backend's result payload when it sent one (score
                // screen); otherwise the already-submitted screen below takes
                // over and still blocks any re-entry.
                if (data.data) {
                    setResult(data.data);
                    setSubmitError("");
                }
                return;
            }

            if (res.status === 400) {
                // Timer-expired auto-submit: the attempt is consumed, so lock
                // future re-entry (next visit shows "Already Submitted") while
                // this visit still shows the expiry message.
                markTestSubmitted(testId);
                setSubmitError(data.message || "Time expired for this test.");
                setResult(null);
                return;
            }
            // Backend day-window enforcement: 403 "not available yet" (before D)
            // or 403 "closed" (after D). Keep student on an explanatory screen.
            if (res.status === 403) {
                setSubmitError(data.message || "This test is only available on its scheduled date.");
                setResult(null);
                return;
            }
            if (!res.ok) throw new Error(data.message || "Failed to submit test.");

            // SUCCESS — this is the single attempt. Lock the test for this
            // student NOW (before showing the result screen) so a refresh,
            // back-button, or direct URL can never re-open it. A power outage
            // BEFORE this point leaves no lock, so the student can still
            // re-enter and finish the test.
            markTestSubmitted(testId);
            setAlreadySubmitted(true);
            setResult(data.data);
        } catch (err) {
            setSubmitError(err.message || "Failed to submit test. Please try again.");
            hasSubmittedRef.current = false; // allow retry on genuine network/error failures
        } finally {
            setSubmitting(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testId, buildAnswersPayload, getElapsedSeconds, alreadySubmitted]);

    // Strike 1: warn. Strike 2: auto-submit. Used for leaving fullscreen / switching tabs.
    const handleFocusViolation = useCallback(() => {
        if (hasSubmittedRef.current || !examStarted || result) return;
        focusStrikesRef.current += 1;
        if (focusStrikesRef.current >= 2) {
            setViolation({
                type: "focus",
                final: true,
                message: "You left the test screen a second time. Your test is being submitted automatically.",
            });
            submitTest();
        } else {
            setViolation({
                type: "focus",
                final: false,
                message: "You left the test screen. Return to fullscreen now — doing this again will auto-submit your test.",
            });
        }
    }, [examStarted, result, submitTest]);

    // Strike 1: warn. Strike 2: auto-submit. Used for copy/cut attempts.
    const handleCopyAttempt = useCallback((e) => {
        e.preventDefault();
        if (hasSubmittedRef.current || !examStarted || result) return;
        copyStrikesRef.current += 1;
        if (copyStrikesRef.current >= 2) {
            setViolation({
                type: "copy",
                final: true,
                message: "You attempted to copy test content a second time. Your test is being submitted automatically.",
            });
            submitTest();
        } else {
            setViolation({
                type: "copy",
                final: false,
                message: "Copying is not allowed during the test. Attempting to copy again will auto-submit your test.",
            });
        }
    }, [examStarted, result, submitTest]);

    // Countdown timer — starts once examStarted is true, auto-submits at zero
    useEffect(() => {
        if (!examStarted || secondsLeft === null || result || loadError) return;

        timerRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    submitTest();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examStarted, secondsLeft !== null]);

    // Detect leaving fullscreen
    useEffect(() => {
        if (!examStarted) return;
        const onFsChange = () => {
            const inFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
            if (!inFullscreen) handleFocusViolation();
        };
        document.addEventListener("fullscreenchange", onFsChange);
        document.addEventListener("webkitfullscreenchange", onFsChange);
        return () => {
            document.removeEventListener("fullscreenchange", onFsChange);
            document.removeEventListener("webkitfullscreenchange", onFsChange);
        };
    }, [examStarted, handleFocusViolation]);

    // Detect tab switch / minimizing
    useEffect(() => {
        if (!examStarted) return;
        const onVisibility = () => {
            if (document.hidden) handleFocusViolation();
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
    }, [examStarted, handleFocusViolation]);

    // Block copy/cut, right-click, and a few keyboard shortcuts during the exam
    useEffect(() => {
        if (!examStarted) return;

        const onContextMenu = (e) => e.preventDefault();
        const onKeyDown = (e) => {
            const key = e.key.toLowerCase();
            const blockedCombo = (e.ctrlKey || e.metaKey) && ["u", "s", "p"].includes(key);
            const devToolsCombo = (e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(key);
            if (e.key === "F12" || blockedCombo || devToolsCombo) e.preventDefault();
        };

        document.addEventListener("copy", handleCopyAttempt);
        document.addEventListener("cut", handleCopyAttempt);
        document.addEventListener("contextmenu", onContextMenu);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("copy", handleCopyAttempt);
            document.removeEventListener("cut", handleCopyAttempt);
            document.removeEventListener("contextmenu", onContextMenu);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [examStarted, handleCopyAttempt]);

    // Exit fullscreen once the test is done, and on unmount
    useEffect(() => {
        if (result && (document.fullscreenElement || document.webkitFullscreenElement)) {
            (document.exitFullscreen || document.webkitExitFullscreen)?.call(document).catch(() => { });
        }
    }, [result]);

    useEffect(() => {
        return () => {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                (document.exitFullscreen || document.webkitExitFullscreen)?.call(document).catch(() => { });
            }
        };
    }, []);

    const handleBeginExam = async () => {
        // Double-check the single-attempt lock at the last possible moment
        // (covers the case where another tab submitted while this one sat on
        // the ready screen).
        if (alreadySubmitted || isTestSubmittedLocally(testId)) {
            setAlreadySubmitted(true);
            return;
        }
        try {
            const el = document.documentElement;
            const request = el.requestFullscreen || el.webkitRequestFullscreen;
            if (request) await request.call(el);
        } catch {
            // Some browsers/devices (notably iOS Safari) don't support fullscreen —
            // proceed anyway; tab-switch/copy detection still works.
        }
        startTimeRef.current = Date.now();
        setExamStarted(true);
    };

    const handleReturnToFullscreen = async () => {
        try {
            const el = document.documentElement;
            const request = el.requestFullscreen || el.webkitRequestFullscreen;
            if (request) await request.call(el);
        } catch {
            // ignore
        }
        setViolation(null);
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, "0");
        const s = (secs % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const handleSelectOption = (questionId, optionLabel) => {
        setAnswers((prev) => ({ ...prev, [questionId]: optionLabel }));
    };

    const handleManualSubmit = () => {
        if (submitting || alreadySubmitted) return;
        // Final confirmation — submitting is permanent and the test can never
        // be retaken afterwards.
        const proceedFinal = window.confirm(
            "Submit this test/exam now? You will NOT be able to take it again."
        );
        if (!proceedFinal) return;
        const unanswered = (examData?.questions || []).length - Object.keys(answers).length;
        if (unanswered > 0) {
            const proceed = window.confirm(
                `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit anyway? You cannot retake this test afterwards.`
            );
            if (!proceed) return;
        }
        submitTest();
    };

    if (loading) {
        return (
            <div className="cbtx-fullscreen">
                <div className="cbtx-brandbar">
                    <span className="cbtx-brand-name">PenWorld College <em>&amp; Primary School</em></span>
                </div>
                <div className="cbtx-page">
                    <p>Loading exam...</p>
                </div>
            </div>
        );
    }

    // Already submitted in a previous session (refresh / direct URL /
    // power restored after a successful submit): block the exam entirely.
    // NOTE: this only triggers when a submit succeeded — a power outage
    // BEFORE submitting leaves no lock, so the student can still come back
    // and take the test.
    // A submitError (e.g. timer-expiry 400) on THIS visit takes priority so
    // the student still sees the actual message.
    if (alreadySubmitted && !result && !submitError) {
        return (
            <div className="cbtx-fullscreen">
                <div className="cbtx-brandbar">
                    <span className="cbtx-brand-name">PenWorld College <em>&amp; Primary School</em></span>
                </div>
                <div className="cbtx-page">
                    <div className="cbtx-result-card">
                        <div className="cbtx-result-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                        </div>
                        <h2 className="cbtx-result-title">Already Submitted</h2>
                        <p className="cbtx-result-subject">{examData?.subject || passedTest?.subject}</p>
                        <p className="cbtx-result-message">
                            You have already submitted this test/exam. You cannot take it again.
                            Your result will be made available by your school.
                        </p>
                        <button className="cbtx-back-btn" onClick={() => navigate("/portal/student/cbt")}>
                            ← Back to Tests
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="cbtx-fullscreen">
                <div className="cbtx-brandbar">
                    <span className="cbtx-brand-name">PenWorld College <em>&amp; Primary School</em></span>
                </div>
                <div className="cbtx-page">
                    <p className="cbtx-error">{loadError}</p>
                    <button className="cbtx-back-btn" onClick={() => navigate("/portal/student/cbt")}>
                        ← Back to Tests
                    </button>
                </div>
            </div>
        );
    }

    const questions = examData?.questions || [];

    // Result screen (successful submission) — takes priority over everything else
    if (result) {
        return (
            <div className="cbtx-fullscreen">
                <div className="cbtx-brandbar">
                    <span className="cbtx-brand-name">PenWorld College <em>&amp; Primary School</em></span>
                </div>
                <div className="cbtx-page">
                    <div className="cbtx-result-card">
                        <div className="cbtx-result-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                        </div>
                        <h2 className="cbtx-result-title">Test Submitted</h2>
                        <p className="cbtx-result-subject">{examData?.subject || passedTest?.subject}</p>
                        <p className="cbtx-result-message">
                            Your answers have been recorded. Your result will be made available by your school.
                        </p>
                        <button className="cbtx-back-btn" onClick={() => navigate("/portal/student/cbt")}>
                            ← Back to Tests
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Submit blocked (400 time expired) with no result payload
    if (submitError && !examStarted) {
        return (
            <div className="cbtx-fullscreen">
                <div className="cbtx-brandbar">
                    <span className="cbtx-brand-name">PenWorld College <em>&amp; Primary School</em></span>
                </div>
                <div className="cbtx-page">
                    <p className="cbtx-error">{submitError}</p>
                    <button className="cbtx-back-btn" onClick={() => navigate("/portal/student/cbt")}>
                        ← Back to Tests
                    </button>
                </div>
            </div>
        );
    }

    // Ready screen — shown before fullscreen/timer starts
    if (examData && !examStarted) {
        return (
            <div className="cbtx-fullscreen">
                <div className="cbtx-brandbar">
                    <span className="cbtx-brand-name">PenWorld College <em>&amp; Primary School</em></span>
                </div>
                <div className="cbtx-page">
                    <div className="cbtx-ready-card">
                        <h2 className="cbtx-ready-title">{examData.subject}</h2>
                        <p className="cbtx-ready-sub">
                            {questions.length} questions · {examData.duration} minutes
                        </p>
                        <div className="cbtx-ready-rules">
                            <p>⚠ Once you begin, the test opens in fullscreen.</p>
                            <p>⚠ Leaving fullscreen or switching tabs twice auto-submits your test.</p>
                            <p>⚠ Attempting to copy test content twice auto-submits your test.</p>
                            <p>⚠ Right-click and copy/paste are disabled during the test.</p>
                            <p>⚠ This test is only available today (its scheduled date).</p>
                            <p>⚠ Once submitted, you cannot retake this test — submit only when you are done.</p>
                        </div>
                        <button className="cbtx-begin-btn" onClick={handleBeginExam}>
                            Begin Exam
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const answeredCount = Object.keys(answers).length;

    return (
        <div className="cbtx-fullscreen">
            <div className="cbtx-brandbar">
                <span className="cbtx-brand-name">PenWorld College <em>&amp; Primary School</em></span>
                <span className="cbtx-brand-timer">{formatTime(secondsLeft)}</span>
            </div>
            <div className="cbtx-page cbtx-page--locked">
            <div className="cbtx-header">
                <div>
                    <h1 className="cbtx-subject">{examData?.subject}</h1>
                    <p className="cbtx-progress">
                        Question {currentIndex + 1} of {questions.length} &nbsp;·&nbsp; {answeredCount} answered
                    </p>
                </div>
                <div className="cbtx-timer">{formatTime(secondsLeft)}</div>
            </div>

            {submitError && <p className="cbtx-error">{submitError}</p>}

            {currentQuestion && (
                <div className="cbtx-question-card">
                    <p className="cbtx-question-text">{currentQuestion.text}</p>
                    <div className="cbtx-options">
                        {currentQuestion.options.map((opt) => {
                            const letter = opt.trim().charAt(0);
                            const isSelected = answers[currentQuestion.id] === letter;
                            return (
                                <button
                                    key={opt}
                                    className={`cbtx-option ${isSelected ? "cbtx-option--selected" : ""}`}
                                    onClick={() => handleSelectOption(currentQuestion.id, letter)}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="cbtx-nav">
                <button
                    className="cbtx-nav-btn"
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                >
                    Previous
                </button>

                {currentIndex < questions.length - 1 ? (
                    <button
                        className="cbtx-nav-btn cbtx-nav-btn--primary"
                        onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                    >
                        Next
                    </button>
                ) : (
                    <button className="cbtx-submit-btn" onClick={handleManualSubmit} disabled={submitting}>
                        {submitting ? "Submitting..." : "Submit Test"}
                    </button>
                )}
            </div>

            <div className="cbtx-jumper">
                {questions.map((q, i) => (
                    <button
                        key={q.id}
                        className={`cbtx-jumper-dot ${i === currentIndex ? "cbtx-jumper-dot--current" : ""} ${answers[q.id] ? "cbtx-jumper-dot--answered" : ""}`}
                        onClick={() => setCurrentIndex(i)}
                    >
                        {i + 1}
                    </button>
                ))}
            </div>

            {/* Violation warning modal */}
            {violation && !violation.final && (
                <div className="cbtx-violation-overlay">
                    <div className="cbtx-violation-modal">
                        <h3 className="cbtx-violation-title">⚠ Warning</h3>
                        <p className="cbtx-violation-text">{violation.message}</p>
                        <button className="cbtx-violation-btn" onClick={handleReturnToFullscreen}>
                            Return to Fullscreen & Continue
                        </button>
                    </div>
                </div>
            )}

            {/* Final violation — submission already triggered, just inform them */}
            {violation && violation.final && (
                <div className="cbtx-violation-overlay">
                    <div className="cbtx-violation-modal cbtx-violation-modal--final">
                        <h3 className="cbtx-violation-title">Test Submitted</h3>
                        <p className="cbtx-violation-text">{violation.message}</p>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

