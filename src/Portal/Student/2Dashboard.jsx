import { useState, useEffect } from "react";
import "./2Dashboard.css";

const BASE_URL = "https://heroesschool-management-backend.vercel.app";

// Static icon config — counts come from API. `key` maps to the matching stats field name.
const statConfig = [
    {
        id: "assignments",
        key: "activeAssignments",
        label: "Active\nAssignments",
        accent: "purple",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 512 512">
                <path d="M0 0h512v512H0z" fill="none" />
                <path fill="#9577c9" d="M202.24 74C166.11 56.75 115.61 48.3 48 48a31.36 31.36 0 0 0-17.92 5.33A32 32 0 0 0 16 79.9V366c0 19.34 13.76 33.93 32 33.93c71.07 0 142.36 6.64 185.06 47a4.11 4.11 0 0 0 6.94-3V106.82a15.9 15.9 0 0 0-5.46-12A143 143 0 0 0 202.24 74m279.68-20.7A31.33 31.33 0 0 0 464 48c-67.61.3-118.11 8.71-154.24 26a143.3 143.3 0 0 0-32.31 20.78a15.93 15.93 0 0 0-5.45 12v337.13a3.93 3.93 0 0 0 6.68 2.81c25.67-25.5 70.72-46.82 185.36-46.81a32 32 0 0 0 32-32v-288a32 32 0 0 0-14.12-26.61" />
            </svg>
        ),
    },
    {
        id: "online",
        key: "onlineClasses",
        label: "Online Classes",
        accent: "navy",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
        ),
    },
    {
        id: "cbt",
        key: "upcomingCbt",
        label: "upcoming\nCBT Tests/Exam",
        accent: "red",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
        ),
    },
];

export default function StudentDashboard() {
    const [dashData, setDashData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // The dashboard response has no `student` field — read the cached profile
    // that StudentLayout already fetches from /api/student/me instead.
    const cachedUser = (() => {
        const saved = localStorage.getItem("user");
        return saved ? JSON.parse(saved) : {};
    })();

    useEffect(() => {
        const token = localStorage.getItem("token");

        fetch(`${BASE_URL}/api/student/dashboard`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load dashboard.");
                return res.json();
            })
            .then((data) => setDashData(data.data || data))
            .catch(() => setError("Failed to load dashboard. Please try again."))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="sd-loading">Loading...</div>;
    if (error) return <div className="sd-error">{error}</div>;

    // Confirmed shape: { stats: { activeAssignments, onlineClasses, upcomingCbt },
    //                    recentAssignment: {...} | null, recentCbt: {...} | null }
    const { stats, recentAssignment, recentCbt } = dashData || {};

    if (!stats) {
        return <div className="sd-error">Dashboard data is incomplete. Please contact support.</div>;
    }

    const statCards = statConfig.map((s) => ({ ...s, count: stats[s.key] ?? 0 }));

    return (
        <div className="sd-page">
            <h1 className="sd-welcome">Welcome, {cachedUser?.name?.split(" ")[0] || "Student"}</h1>
            <p className="sd-sub">Here's What's happening with your studies today!</p>

            {/* Stat cards */}
            <div className="sd-stats">
                {statCards.map((s) => (
                    <div className={`sd-stat-card sd-stat-card--${s.accent}`} key={s.id}>
                        <div className={`sd-stat-icon sd-stat-icon--${s.accent}`}>{s.icon}</div>
                        <div className="sd-stat-info">
                            <span className={`sd-stat-count sd-stat-count--${s.accent}`}>
                                {s.count}
                            </span>
                            <span className="sd-stat-label">{s.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom panels */}
            <div className="sd-panels">
                {/* Recent Assignments */}
                <div className="sd-panel">
                    <div className="sd-panel-header sd-panel-header--navy">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20">
                            <path d="M0 0h20v20H0z" fill="none" />
                            <path fill="#ffffff" d="M5 17h13v2H5c-1.66 0-3-1.34-3-3V4c0-1.66 1.34-3 3-3h13v14H5c-.55 0-1 .45-1 1s.45 1 1 1m2-3.5v-11c0-.28-.22-.5-.5-.5s-.5.22-.5.5v11c0 .28.22.5.5.5s.5-.22.5-.5" />
                        </svg>
                        <div>
                            <p className="sd-panel-title">Recent Assignments</p>
                            <p className="sd-panel-subtitle">Stay on top of your assignments</p>
                        </div>
                    </div>
                    <div className="sd-panel-body">
                        {recentAssignment ? (
                            <div className="sd-item" key={recentAssignment._id || recentAssignment.id}>
                                <div className="sd-item-icon sd-item-icon--navy">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20">
                                        <path d="M0 0h20v20H0z" fill="none" />
                                        <path fill="#112562" d="M5 17h13v2H5c-1.66 0-3-1.34-3-3V4c0-1.66 1.34-3 3-3h13v14H5c-.55 0-1 .45-1 1s.45 1 1 1m2-3.5v-11c0-.28-.22-.5-.5-.5s-.5.22-.5.5v11c0 .28.22.5.5.5s.5-.22.5-.5" />
                                    </svg>
                                </div>
                                <div className="sd-item-info">
                                    <p className="sd-item-title">{recentAssignment.subject}</p>
                                    <p className="sd-item-meta">{recentAssignment.dueDate || recentAssignment.due}</p>
                                </div>
                                <span className={`sd-badge sd-badge--${recentAssignment.status === "Active" ? "active" : "expired"}`}>
                                    {recentAssignment.status}
                                </span>
                            </div>
                        ) : (
                            <p style={{ fontSize: 13, color: "#999", margin: "0 0 16px" }}>No assignments yet.</p>
                        )}
                        <div className="sd-view-all">
                            <a href="/portal/student/assignments">View all →</a>
                        </div>
                    </div>
                </div>

                {/* CBT Tests */}
                <div className="sd-panel">
                    <div className="sd-panel-header sd-panel-header--red">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                        </svg>
                        <div>
                            <p className="sd-panel-title">CBT Tests/Exams</p>
                            <p className="sd-panel-subtitle">Take your Computer-based Tests/Exams</p>
                        </div>
                    </div>
                    <div className="sd-panel-body">
                        {recentCbt ? (
                            <div className="sd-item" key={recentCbt._id || recentCbt.id}>
                                <div className="sd-item-icon sd-item-icon--red">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                    </svg>
                                </div>
                                <div className="sd-item-info">
                                    <p className="sd-item-title">{recentCbt.subject}</p>
                                    <p className="sd-item-meta">{recentCbt.description || recentCbt.type || recentCbt.detail}</p>
                                </div>
                                <span className={`sd-badge sd-badge--${recentCbt.status === "Active" ? "active" : "expired"}`}>
                                    {recentCbt.status}
                                </span>
                            </div>
                        ) : (
                            <p style={{ fontSize: 13, color: "#999", margin: "0 0 16px" }}>No CBT tests yet.</p>
                        )}
                        <div className="sd-view-all">
                            <a href="/portal/student/cbt">View all →</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

