import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./AdminLayout.css";
import logo from "../../assets/logo2.png";
import api from "../../api";
import { ClassesProvider } from "../../hooks/useClasses.jsx";

const navItems = [
    {
        label: "Dashboard",
        path: "/portal/admin/dashboard",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="currentColor" d="M13 9V3h8v6zM3 13V3h8v10zm10 8V11h8v10zM3 21v-6h8v6z" />
            </svg>
        ),
    },
    {
        label: "Students",
        path: "/portal/admin/students",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 48 48">
                <path d="M0 0h48v48H0z" fill="none" />
                <path fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M24 20a7 7 0 1 0 0-14a7 7 0 0 0 0 14M6 40.8V42h36v-1.2c0-4.48 0-6.72-.872-8.432a8 8 0 0 0-3.496-3.496C35.92 28 33.68 28 29.2 28H18.8c-4.48 0-6.72 0-8.432.872a8 8 0 0 0-3.496 3.496C6 34.08 6 36.32 6 40.8" />
            </svg>
        ),
    },
    {
        label: "Staff",
        path: "/portal/admin/staff",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
        ),
    },
    {
        label: "Bulk Data",
        path: "/portal/admin/bulk-data",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" />
                <path d="M14 2v6h6" />
                <path d="M9 12h6M9 16h6" />
                <path d="M8 6h8v4H8z" />
            </svg>
        ),
    },
    {
        label: "Classes",
        path: "/portal/admin/classes",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14zM7 7h2v10H7zm4 0h2v6h-2zm4 0h2v8h-2z" />
            </svg>
        ),
    },
    {
        label: "Assignments",
        path: "/portal/admin/assignments",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 20 20">
                <path d="M0 0h20v20H0z" fill="none" />
                <path fill="currentColor" d="M5 17h13v2H5c-1.66 0-3-1.34-3-3V4c0-1.66 1.34-3 3-3h13v14H5c-.55 0-1 .45-1 1s.45 1 1 1m2-3.5v-11c0-.28-.22-.5-.5-.5s-.5.22-.5.5v11c0 .28.22.5.5.5s.5-.22.5-.5" />
            </svg>
        ),
    },
    {
        label: "Online Classes",
        path: "/portal/admin/online-classes",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="1.5em" height="1.5em">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
        ),
    },
    {
        label: "Results",
        path: "/portal/admin/results",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 32 32">
                <path d="M0 0h32v32H0z" fill="none" />
                <path fill="currentColor" d="m29.7 19.3l-3-3c-.4-.4-1-.4-1.4 0L16 25.6V30h4.4l9.3-9.3c.4-.4.4-1 0-1.4M19.6 28H18v-1.6l5-5l1.6 1.6zm6.4-6.4L24.4 20l1.6-1.6l1.6 1.6zM10 23h2v2h-2zm4-5h4v2h-4zm-4 0h2v2h-2zm4-5h8v2h-8zm-4 0h2v2h-2z" />
                <path fill="currentColor" d="M7 28V7h3v3h12V7h3v6h2V7c0-1.1-.9-2-2-2h-3V4c0-1.1-.9-2-2-2h-8c-1.1 0-2 .9-2 2v1H7c-1.1 0-2 .9-2 2v21c0 1.1.9 2 2 2h5v-2zm5-24h8v4h-8z" />
            </svg>
        ),
    },
    {
        label: "CBT Tests/Exams",
        path: "/portal/admin/cbt",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="1.5em" height="1.5em">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
        ),
    },
    {
        label: "Profile",
        path: "/portal/admin/profile",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="currentColor" d="M14 13h5v-2h-5zm0-3h5V8h-5zm-9 6h8v-.55q0-1.125-1.1-1.787T9 13t-2.9.663T5 15.45zm5.413-4.587Q11 10.825 11 10t-.587-1.412T9 8t-1.412.588T7 10t.588 1.413T9 12t1.413-.587M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20z" />
            </svg>
        ),
    },
];

export default function AdminLayout() {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Load from localStorage first so topbar no go blank on refresh
    const [admin, setAdmin] = useState(() => {
        const saved = localStorage.getItem("user");
        return saved ? JSON.parse(saved) : { name: "", initials: "", role: "Admin" };
    });

    useEffect(() => {
        api.get("/api/admin/me")
            .then((res) => {
                const raw = res.data?.data || res.data;
                const name = raw.name || raw.fullName || "";
                const initials = raw.initials || name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                const adminData = { name, initials, role: raw.role || "Admin" };
                setAdmin(adminData);
                localStorage.setItem("user", JSON.stringify(adminData));
            })
            .catch(() => { }); // 401 handled globally by api.js interceptor
    }, []);

    const handleLogout = async () => {
        try { await api.post("/api/auth/logout"); } catch { }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/portal/admin/login");
    };

    return (
        <ClassesProvider portal="admin">
        <div className="adl-root">
            {/* ===== Top bar ===== */}
            <header className="adl-topbar">
                <div className="adl-topbar-left">
                    {/* Mobile hamburger */}
                    <button
                        className="adl-hamburger"
                        onClick={() => setSidebarOpen((o) => !o)}
                        aria-label="Toggle sidebar"
                    >
                        <span /><span /><span />
                    </button>
                    <NavLink to="/" className="adl-brand">
                        <img src={logo} alt="PenWorld College" className="adl-brand-logo" />
                        <div className="adl-brand-titles">
                            <span className="adl-brand-name">PenWorld College</span>
                            <span className="adl-brand-sub">&amp; Primary School</span>
                        </div>
                    </NavLink>
                </div>
                <div className="adl-topbar-right">
                    <div className="adl-user">
                        <div className="adl-avatar">{admin.initials}</div>
                        <div className="adl-user-info">
                            <span className="adl-user-name">{admin.name}</span>
                            <span className="adl-user-role">{admin.role}</span>
                        </div>
                    </div>
                    <button className="adl-logout" onClick={handleLogout}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                        </svg>
                        Logout
                    </button>
                </div>
            </header>
            <div className="adl-body">
                {/* ===== Sidebar ===== */}
                {sidebarOpen && (
                    <div className="adl-overlay" onClick={() => setSidebarOpen(false)} />
                )}
                <aside className={`adl-sidebar ${sidebarOpen ? "adl-sidebar--open" : ""}`}>
                    <nav className="adl-nav">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `adl-nav-item ${isActive ? "adl-nav-item--active" : ""}`
                                }
                                onClick={() => setSidebarOpen(false)}
                            >
                                <span className="adl-nav-icon">{item.icon}</span>
                                <span className="adl-nav-label">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                {/* ===== Page content ===== */}
                <main className="adl-main">
                    <Outlet />
                </main>
            </div>
        </div>
        </ClassesProvider>
    );
}
