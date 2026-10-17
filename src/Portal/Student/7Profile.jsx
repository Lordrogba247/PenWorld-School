import { useState, useEffect } from "react";
import "./7Profile.css";

const BASE_URL = "https://heroesschool-management-backend.vercel.app";
const CHANGE_PASSWORD_API_URL = `${BASE_URL}/api/auth/change-password`;

const MIN_PASSWORD_LENGTH = 6;

export default function StudentProfile() {
    // Load from localStorage first (already populated by StudentLayout's /api/student/me
    // fetch) so this page doesn't flash empty, then refresh independently below in case
    // this page is ever loaded on its own.
    const [studentInfo, setStudentInfo] = useState(() => {
        const saved = localStorage.getItem("user");
        return saved ? JSON.parse(saved) : { name: "", class: "", studentId: "", sex: "" };
    });

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState(null); // { type: "error" | "success", message: string }
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(`${BASE_URL}/api/student/me`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load profile.");
                return res.json();
            })
            .then((data) => {
                // Assuming { success, data: {...} } — same convention as every other
                // confirmed endpoint. Falls back to res.data itself if this endpoint
                // isn't wrapped the same way.
                const fresh = data.data || data;
                setStudentInfo(fresh);
                localStorage.setItem("user", JSON.stringify(fresh));
            })
            .catch(() => {
                // Silent fail — falls back to whatever was cached in localStorage
            });
    }, []);

    const resetForm = () => {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus(null);

        // ===== Frontend validation =====
        if (!oldPassword.trim()) {
            setStatus({ type: "error", message: "Please enter your old password." });
            return;
        }
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setStatus({
                type: "error",
                message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
            });
            return;
        }
        if (newPassword !== confirmPassword) {
            setStatus({ type: "error", message: "New password and confirmation do not match." });
            return;
        }
        if (newPassword === oldPassword) {
            setStatus({ type: "error", message: "New password must be different from old password." });
            return;
        }

        // ===== Submit to API =====
        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            const res = await fetch(CHANGE_PASSWORD_API_URL, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    currentPassword: oldPassword,
                    newPassword: newPassword,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to change password.");
            }

            setStatus({ type: "success", message: "Password changed successfully." });
            resetForm();
        } catch (err) {
            setStatus({ type: "error", message: err.message || "Something went wrong. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pf-page">
            <h1 className="pf-title">Profile</h1>
            <p className="pf-sub">Your name, student ID, sex, class, and password</p>

            <div className="pf-warning">
                <span className="pf-warning-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                    </svg>
                </span>
                <p className="pf-warning-text">
                    <span className="pf-warning-bold">Important:</span> You can change your password only.
                </p>
            </div>

            {/* Read-only info */}
            <div className="pf-info-list">
                <p className="pf-info-row">
                    <span className="pf-info-label">Name:</span>
                    <span className="pf-info-value">{studentInfo.name}</span>
                </p>
                <p className="pf-info-row">
                    <span className="pf-info-label">Class:</span>
                    <span className="pf-info-value">{studentInfo.class}</span>
                </p>
                <p className="pf-info-row">
                    <span className="pf-info-label">Student ID:</span>
                    <span className="pf-info-value">{studentInfo.studentId}</span>
                </p>
                <p className="pf-info-row">
                    <span className="pf-info-label">Sex:</span>
                    <span className="pf-info-value">{studentInfo.sex}</span>
                </p>
            </div>

            <div className="pf-divider" />

            {/* Password change form */}
            <form className="pf-form" onSubmit={handleSubmit}>
                <div className="pf-form-grid">
                    <div className="pf-field">
                        <label className="pf-label" htmlFor="oldPassword">Old Password</label>
                        <input
                            id="oldPassword"
                            type="password"
                            className="pf-input"
                            placeholder="Type here..."
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                        />
                    </div>

                    <div className="pf-field">
                        <label className="pf-label" htmlFor="newPassword">New Password</label>
                        <input
                            id="newPassword"
                            type="password"
                            className="pf-input"
                            placeholder="Type here..."
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div className="pf-field">
                        <label className="pf-label" htmlFor="confirmPassword">Confirm New Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            className="pf-input"
                            placeholder="Type here..."
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <div className="pf-field pf-field--btn">
                        <button className="pf-submit-btn" type="submit" disabled={loading}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none" />
                                <path fill="currentColor" d="M12.63 2c5.53 0 10.01 4.5 10.01 10s-4.48 10-10.01 10c-3.51 0-6.58-1.82-8.37-4.57l1.58-1.25C7.25 18.47 9.76 20 12.64 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8C8.56 4 5.2 7.06 4.71 11h2.76l-3.74 3.73L0 11h2.69c.5-5.05 4.76-9 9.94-9m2.96 8.24c.5.01.91.41.91.92v4.61c0 .5-.41.92-.92.92h-5.53c-.51 0-.92-.42-.92-.92v-4.61c0-.51.41-.91.91-.92V9.23c0-1.53 1.25-2.77 2.77-2.77c1.53 0 2.78 1.24 2.78 2.77zm-2.78-2.38c-.75 0-1.37.61-1.37 1.37v1.01h2.75V9.23c0-.76-.62-1.37-1.38-1.37" />
                            </svg>

                            {loading ? "Changing..." : "Change Password"}
                        </button>
                    </div>
                </div>

                {status && (
                    <p className={`pf-status pf-status--${status.type}`}>{status.message}</p>
                )}
            </form>
        </div>
    );
}

