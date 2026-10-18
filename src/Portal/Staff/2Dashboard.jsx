import { useState, useEffect } from "react";
import "./2Dashboard.css";

const BASE_URL = "https://pen-world-school.vercel.app";

export default function StaffDashboard() {
    const [dashData, setDashData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");

        fetch(`${BASE_URL}/api/staff/dashboard`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load dashboard.");
                return res.json();
            })
            .then((data) => setDashData(data.data))
            .catch(() => setError("Failed to load dashboard. Please try again."))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="sfd-loading">Loading...</div>;
    if (error) return <div className="sfd-error">{error}</div>;

    const { staff, stats, recentAssignments, cbtTests } = dashData || [];

    return (
        <div className="sfd-page">
            <h1 className="sfd-title">Welcome, {staff?.firstName}</h1>
            <p className="sfd-sub">Here's What's happening wih your Class today!</p>

            {/* Stats row */}
            <div className="sfd-stats">
                <div className="sfd-stat-card">
                    <div className="sfd-stat-icon sfd-stat-icon--purple">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="2em" height="2em">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </div>
                    <div>
                        <p className="sfd-stat-value">{stats?.activeStudents}</p>
                        <p className="sfd-stat-label">Active Students</p>
                    </div>
                </div>

                <div className="sfd-stat-card">
                    <div className="sfd-stat-icon sfd-stat-icon--navy">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                        </svg>
                    </div>
                    <div>
                        <p className="sfd-stat-value">{stats?.onlineClasses}</p>
                        <p className="sfd-stat-label">Online Classes</p>
                    </div>
                </div>

                <div className="sfd-stat-card">
                    <div className="sfd-stat-icon sfd-stat-icon--red">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                        </svg>
                    </div>
                    <div>
                        <p className="sfd-stat-value sfd-stat-value--red">{stats?.upcomingCbt}</p>
                        <p className="sfd-stat-label">upcoming CBT Tests/Exam</p>
                    </div>
                </div>
            </div>

            {/* Bottom cards */}
            <div className="sfd-cards-row">
                <div className="sfd-card">
                    <div className="sfd-card-header sfd-card-header--navy">
                        <div className="sfd-card-header-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20">
                                <path d="M0 0h20v20H0z" fill="none" />
                                <path fill="#ffffff" d="M5 17h13v2H5c-1.66 0-3-1.34-3-3V4c0-1.66 1.34-3 3-3h13v14H5c-.55 0-1 .45-1 1s.45 1 1 1m2-3.5v-11c0-.28-.22-.5-.5-.5s-.5.22-.5.5v11c0 .28.22.5.5.5s.5-.22.5-.5" />
                            </svg>
                        </div>
                        <div>
                            <p className="sfd-card-title">Recent Assignments</p>
                            <p className="sfd-card-subtitle">Manage your assignments</p>
                        </div>
                    </div>

                    <div className="sfd-card-body">
                        {(recentAssignments || []).map((a) => (
                            <div className="sfd-list-item" key={a._id || a.id}>
                                <span className="sfd-list-icon sfd-list-icon--navy">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20">
                                        <path d="M0 0h20v20H0z" fill="none" />
                                        <path fill="#112562" d="M5 17h13v2H5c-1.66 0-3-1.34-3-3V4c0-1.66 1.34-3 3-3h13v14H5c-.55 0-1 .45-1 1s.45 1 1 1m2-3.5v-11c0-.28-.22-.5-.5-.5s-.5.22-.5.5v11c0 .28.22.5.5.5s.5-.22.5-.5" />
                                    </svg>
                                </span>
                                <div className="sfd-list-text">
                                    <p className="sfd-list-title">{a.subject}</p>
                                    <p className="sfd-list-meta">
                                        {a.classLabel}. To be submitted {a.due || a.dueDate}
                                    </p>
                                </div>
                                <span className={`sfd-badge sfd-badge--${a.status === "Active" ? "active" : "expired"}`}>
                                    {a.status}
                                </span>
                            </div>
                        ))}

                        <a href="/portal/staff/assignments" className="sfd-view-all">
                            View all
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                            </svg>
                        </a>
                    </div>
                </div>

                <div className="sfd-card">
                    <div className="sfd-card-header sfd-card-header--red">
                        <div className="sfd-card-header-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                            </svg>
                        </div>
                        <div>
                            <p className="sfd-card-title">CBT Tests/Exams</p>
                            <p className="sfd-card-subtitle">Schedule a Computer-based Tests/Exams</p>
                        </div>
                    </div>

                    <div className="sfd-card-body">
                        {(cbtTests || []).map((t) => (
                            <div className="sfd-list-item" key={t._id || t.id}>
                                <span className="sfd-list-icon sfd-list-icon--red">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                    </svg>
                                </span>
                                <div className="sfd-list-text">
                                    <p className="sfd-list-title">{t.subject}</p>
                                    <p className="sfd-list-meta">{t.type || t.description}</p>
                                </div>
                                <span className={`sfd-badge sfd-badge--${t.status === "Active" ? "active" : "expired"}`}>
                                    {t.status}
                                </span>
                            </div>
                        ))}

                        <a href="/portal/staff/cbt" className="sfd-view-all">
                            View all
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

