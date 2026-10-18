import { useState, useEffect } from "react";
import "./11Profile.css";

const BASE_URL = "https://penworld-demo-school-backend.vercel.app";
const CHANGE_PASSWORD_API_URL = `${BASE_URL}/api/auth/change-password`;

export default function AdminProfile() {
    const [adminInfo, setAdminInfo] = useState(() => {
        const saved = localStorage.getItem("user");
        return saved ? JSON.parse(saved) : { name: "", role: "", staffId: "", sex: "" };
    });

    const [passwords, setPasswords] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    // Refresh admin info from API (AdminLayout already fetches this too, but keeping this
    // page self-sufficient in case it's ever loaded independently or the cache is stale)
    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(`${BASE_URL}/api/admin/me`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load profile.");
                return res.json();
            })
            .then((data) => {
                setAdminInfo(data);
                localStorage.setItem("user", JSON.stringify(data));
            })
            .catch(() => {
                // Silent fail — falls back to whatever was cached in localStorage
            });
    }, []);

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
        setError("");
        setSuccess("");
    };

    const handleChangePassword = async () => {
        const { oldPassword, newPassword, confirmPassword } = passwords;
        if (!oldPassword || !newPassword || !confirmPassword) {
            setError("Please fill in all password fields.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("New password and confirm password do not match.");
            return;
        }
        if (newPassword.length < 6) {
            setError("New password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");
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

            setSuccess("Password changed successfully!");
            setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="adp-page">
            <h1 className="adp-title">Profile</h1>
            <p className="adp-sub">Your name, Staff ID, sex, role, and password</p>

            {/* Alert */}
            <div className="adp-alert">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className="adp-alert-icon">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <p className="adp-alert-text">
                    <span className="adp-alert-bold">Important:</span> You can change your password only
                </p>
            </div>

            {/* Admin info */}
            <div className="adp-info">
                <div className="adp-info-row">
                    <span className="adp-info-label">Name:</span>
                    <span className="adp-info-value">{adminInfo.name}</span>
                </div>
                <div className="adp-info-row">
                    <span className="adp-info-label">Role:</span>
                    <span className="adp-info-value">{adminInfo.role}</span>
                </div>
                <div className="adp-info-row">
                    <span className="adp-info-label">Staff ID:</span>
                    <span className="adp-info-value">{adminInfo.staffId}</span>
                </div>
                <div className="adp-info-row">
                    <span className="adp-info-label">Sex:</span>
                    <span className="adp-info-value">{adminInfo.sex}</span>
                </div>
            </div>

            <hr className="adp-divider" />

            {/* Password form */}
            <div className="adp-pw-form">
                <div className="adp-pw-grid">
                    <div className="adp-field">
                        <label className="adp-label">Old Password</label>
                        <input
                            name="oldPassword"
                            type="password"
                            className="adp-input"
                            placeholder="Type here..."
                            value={passwords.oldPassword}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="adp-field">
                        <label className="adp-label">New Password</label>
                        <input
                            name="newPassword"
                            type="password"
                            className="adp-input"
                            placeholder="Type here..."
                            value={passwords.newPassword}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="adp-field">
                        <label className="adp-label">Confirm New Password</label>
                        <input
                            name="confirmPassword"
                            type="password"
                            className="adp-input"
                            placeholder="Type here..."
                            value={passwords.confirmPassword}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="adp-btn-wrap">
                        {error && <p className="adp-error">{error}</p>}
                        {success && <p className="adp-success">{success}</p>}
                        <button className="adp-change-btn" onClick={handleChangePassword} disabled={loading}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none" />
                                <path fill="currentColor" d="M12.63 2c5.53 0 10.01 4.5 10.01 10s-4.48 10-10.01 10c-3.51 0-6.58-1.82-8.37-4.57l1.58-1.25C7.25 18.47 9.76 20 12.64 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8C8.56 4 5.2 7.06 4.71 11h2.76l-3.74 3.73L0 11h2.69c.5-5.05 4.76-9 9.94-9m2.96 8.24c.5.01.91.41.91.92v4.61c0 .5-.41.92-.92.92h-5.53c-.51 0-.92-.42-.92-.92v-4.61c0-.51.41-.91.91-.92V9.23c0-1.53 1.25-2.77 2.77-2.77c1.53 0 2.78 1.24 2.78 2.77zm-2.78-2.38c-.75 0-1.37.61-1.37 1.37v1.01h2.75V9.23c0-.76-.62-1.37-1.38-1.37" />
                            </svg>

                            {loading ? "Changing..." : "Change Password"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

