import { useState, useEffect } from "react";
import "./10Profile.css";

const BASE_URL = "https://penworld-demo-school-backend.vercel.app";
const CHANGE_PASSWORD_API_URL = `${BASE_URL}/api/auth/change-password`;

export default function StaffProfile() {
    const [staffInfo, setStaffInfo] = useState(() => {
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

    // Refresh staff info from API (StaffLayout already fetches this too, but keeping this
    // page self-sufficient in case it's ever loaded independently or the cache is stale)
    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(`${BASE_URL}/api/staff/me`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load profile.");
                return res.json();
            })
            .then((data) => {
                // Confirmed shape: { success, data: { name, initials, role, staffId, email, phone, sex, profileImage, department, assignedClass } }
                setStaffInfo(data.data);
                localStorage.setItem("user", JSON.stringify(data.data));
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
        <div className="sp-page">
            <h1 className="sp-title">Profile</h1>
            <p className="sp-sub">Your name, Staff ID, sex, role, and password</p>

            {/* Important notice */}
            <div className="sp-alert">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className="sp-alert-icon">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <p className="sp-alert-text">
                    <span className="sp-alert-bold">Important:</span> You can change your password only
                </p>
            </div>

            {/* Staff info */}
            <div className="sp-info">
                <div className="sp-avatar-row">
                    <div className="sp-avatar">
                        {staffInfo.profileImage ? (
                            <img src={staffInfo.profileImage} alt={staffInfo.name} className="sp-avatar-img" />
                        ) : (
                            <span className="sp-avatar-initials">{staffInfo.initials}</span>
                        )}
                    </div>
                </div>
                <div className="sp-info-row">
                    <span className="sp-info-label">Name:</span>
                    <span className="sp-info-value">{staffInfo.name}</span>
                </div>
                <div className="sp-info-row">
                    <span className="sp-info-label">Role:</span>
                    <span className="sp-info-value">{staffInfo.role}</span>
                </div>
                <div className="sp-info-row">
                    <span className="sp-info-label">Staff ID:</span>
                    <span className="sp-info-value">{staffInfo.staffId}</span>
                </div>
                <div className="sp-info-row">
                    <span className="sp-info-label">Sex:</span>
                    <span className="sp-info-value">{staffInfo.sex}</span>
                </div>

                <div className="sp-info-row">
                    <span className="sp-info-label">Department:</span>
                    <span className="sp-info-value">{staffInfo.department}</span>
                </div>
                <div className="sp-info-row">
                    <span className="sp-info-label">Assigned Class:</span>
                    <span className="sp-info-value">{staffInfo.assignedClass}</span>
                </div>
            </div>

            <hr className="sp-divider" />

            {/* Password change form */}
            <div className="sp-pw-form">
                <div className="sp-pw-grid">
                    <div className="sp-field">
                        <label className="sp-label">Old Password</label>
                        <input
                            name="oldPassword"
                            type="password"
                            className="sp-input"
                            placeholder="Type here..."
                            value={passwords.oldPassword}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="sp-field">
                        <label className="sp-label">New Password</label>
                        <input
                            name="newPassword"
                            type="password"
                            className="sp-input"
                            placeholder="Type here..."
                            value={passwords.newPassword}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="sp-field">
                        <label className="sp-label">Confirm New Password</label>
                        <input
                            name="confirmPassword"
                            type="password"
                            className="sp-input"
                            placeholder="Type here..."
                            value={passwords.confirmPassword}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="sp-btn-wrap">
                        {error && <p className="sp-error">{error}</p>}
                        {success && <p className="sp-success">{success}</p>}
                        <button className="sp-change-btn" onClick={handleChangePassword} disabled={loading}>
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

