import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./1Login.css";
import logo from "../../assets/logo2.png";

const BASE_URL = "https://heroesschool-management-backend.vercel.app";

export default function AdminLogin() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ staffId: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    staffId: form.staffId,
                    password: form.password,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error(
                        data.message ||
                        "Login service unavailable (route not found — backend may be redeploying or DB not connected). Please wait a minute and try again."
                    );
                }
                throw new Error(data.message || "Login failed. Check your credentials.");
            }

            const token = data.token || data.data?.token;
            const user = data.user || data.data?.user || data.data;
            if (!token) {
                throw new Error("Login succeeded but no session token was returned. Please try again.");
            }
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            navigate("/portal/admin/dashboard");
        } catch (err) {
            if (err instanceof TypeError) {
                setError("Cannot reach the login server. Check your internet connection and try again.");
            } else {
                setError(err.message || "Login failed. Check your credentials.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sl-page">
            <Link to="/" className="sl-brand">
                <img src={logo} alt="PenWorld College logo" className="sl-brand-logo" />
                <div className="sl-brand-titles">
                    <span className="sl-brand-name">PenWorld College</span>
                    <span className="sl-brand-sub">&amp; Primary School</span>
                </div>
            </Link>

            <div className="sl-card">
                <div className="sl-icon sl-icon--red">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="7" r="4" />
                        <path d="M12 13c-4.42 0-8 1.79-8 4v1h16v-1c0-2.21-3.58-4-8-4z" />
                    </svg>
                </div>

                <h1 className="sl-title sl-title--red">Admin Portal</h1>
                <p className="sl-subtitle">
                    Login with your User Id and Password to access your dashboard
                </p>

                <form className="sl-form" onSubmit={handleLogin}>
                    <div className="sl-field">
                        <label className="sl-label sl-label--red" htmlFor="staffId">Admin Id</label>
                        <input
                            id="staffId"
                            name="staffId"
                            type="text"
                            className="sl-input sl-input--red"
                            placeholder="Type here..."
                            value={form.staffId}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="sl-field">
                        <label className="sl-label sl-label--red" htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            className="sl-input sl-input--red"
                            placeholder="Type here..."
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {error && <p className="sl-error">{error}</p>}

                    <button type="submit" className="sl-btn sl-btn--red" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="sl-forgot">Forgot Password? Contact School Admin</p>
            </div>

            <div className="sl-bottom-links">
                <Link to="/portal/student/login" className="sl-bottom-link">Login as Student</Link>
                <Link to="/portal/staff/login" className="sl-bottom-link">Login as Staff</Link>
            </div>
        </div>
    );
}

