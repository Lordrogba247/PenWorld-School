import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./StaffLayout.css";
import logo from "../../assets/logo2.png";
import api from "../../api";
import { ClassesProvider } from "../../hooks/useClasses.jsx";

const navItems = [
    {
        label: "Dashboard",
        path: "/portal/staff/dashboard",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="currentColor" d="M13 9V3h8v6zM3 13V3h8v10zm10 8V11h8v10zM3 21v-6h8v6z" />
            </svg>
        ),
    },
    {
        label: "Students",
        path: "/portal/staff/students",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 48 48">
                <path d="M0 0h48v48H0z" fill="none" />
                <path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M24 20a7 7 0 1 0 0-14a7 7 0 0 0 0 14M6 40.8V42h36v-1.2c0-4.48 0-6.72-.872-8.432a8 8 0 0 0-3.496-3.496C35.92 28 33.68 28 29.2 28H18.8c-4.48 0-6.72 0-8.432.872a8 8 0 0 0-3.496 3.496C6 34.08 6 36.32 6 40.8" />
            </svg>
        ),
    },
    {
        label: "Assignments",
        path: "/portal/staff/assignments",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 20 20">
                <path d="M0 0h20v20H0z" fill="none" />
                <path fill="#888888" d="M5 17h13v2H5c-1.66 0-3-1.34-3-3V4c0-1.66 1.34-3 3-3h13v14H5c-.55 0-1 .45-1 1s.45 1 1 1m2-3.5v-11c0-.28-.22-.5-.5-.5s-.5.22-.5.5v11c0 .28.22.5.5.5s.5-.22.5-.5" />
            </svg>
        ),
    },
    {
        label: "Online Classes",
        path: "/portal/staff/online-classes",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="1.5em" height="1.5em">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
        ),
    },
    {
        label: "Results",
        path: "/portal/staff/results",
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
        path: "/portal/staff/cbt",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="1.5em" height="1.5em">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
        ),
    },
    {
        label: "Profile",
        path: "/portal/staff/profile",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="currentColor" d="M14 13h5v-2h-5zm0-3h5V8h-5zm-9 6h8v-.55q0-1.125-1.1-1.787T9 13t-2.9.663T5 15.45zm5.413-4.587Q11 10.825 11 10t-.587-1.412T9 8t-1.412.588T7 10t.588 1.413T9 12t1.413-.587M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20z" />
            </svg>
        ),
    },
];

export default function StaffLayout() {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Load from localStorage first so topbar no go blank on refresh
    const [staff, setStaff] = useState(() => {
        const saved = localStorage.getItem("user");
        return saved ? JSON.parse(saved) : { name: "", initials: "", role: "" };
    });

    // Fetch fresh profile from API
    useEffect(() => {
        api.get("/api/staff/me")
            .then((res) => {
                const staffData = res.data.data || res.data;
                setStaff(staffData);
                localStorage.setItem("user", JSON.stringify(staffData));
            })
            .catch(() => {
                // Token invalid or expired — interceptor in api.js handles redirect
            });
    }, []);

    const handleLogout = async () => {
        try { await api.post("/api/auth/logout"); } catch (_) { }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/portal/staff/login");
    };

    return (
        <ClassesProvider portal="staff">
        <div className="stf-root">
            {/* ===== Top bar ===== */}
            <header className="stf-topbar">
                <div className="stf-topbar-left">
                    {/* Mobile hamburger */}
                    <button
                        className="stf-hamburger"
                        onClick={() => setSidebarOpen((o) => !o)}
                        aria-label="Toggle sidebar"
                    >
                        <span /><span /><span />
                    </button>
                    <NavLink to="/" className="stf-brand">
                        <img src={logo} alt="PenWorld College" className="stf-brand-logo" />
                        <div className="stf-brand-titles">
                            <span className="stf-brand-name">PenWorld College</span>
                            <span className="stf-brand-sub">&amp; Primary School</span>
                        </div>
                    </NavLink>
                </div>

                <div className="stf-topbar-right">
                    <div className="stf-user">
                        <div className="stf-avatar">{staff.initials}</div>
                        <div className="stf-user-info">
                            <span className="stf-user-name">{staff.name}</span>
                            <span className="stf-user-role">{staff.role}</span>
                        </div>
                    </div>
                    <button className="stf-logout" onClick={handleLogout}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                        </svg>
                        Logout
                    </button>
                </div>
            </header>

            <div className="stf-body">
                {/* ===== Sidebar ===== */}
                {sidebarOpen && (
                    <div
                        className="stf-overlay"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
                <aside className={`stf-sidebar ${sidebarOpen ? "stf-sidebar--open" : ""}`}>
                    <nav className="stf-nav">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `stf-nav-item ${isActive ? "stf-nav-item--active" : ""}`
                                }
                                onClick={() => setSidebarOpen(false)}
                            >
                                <span className="stf-nav-icon">{item.icon}</span>
                                <span className="stf-nav-label">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                {/* ===== Page content ===== */}
                <main className="stf-main">
                    <Outlet />
                </main>
            </div>
        </div>
        </ClassesProvider>
    );
}
