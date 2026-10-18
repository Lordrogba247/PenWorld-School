import { useState, useEffect } from "react";
import "./4Online.css";

const BASE_URL = "https://penworld-demo-school-backend.vercel.app";

export default function StudentOnlineClass() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");

        fetch(`${BASE_URL}/api/student/online-classes`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load online classes.");
                return res.json();
            })
            // Assuming { success, data: [...] } — same convention as every other
            // confirmed endpoint (matches the shape Victor confirmed for the admin
            // online-classes endpoint: id, subject, classLabel, date, time, link, accent).
            .then((data) => setClasses(data.data || []))
            .catch(() => setError("Failed to load online classes."))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="oc-loading">Loading...</div>;
    if (error) return <div className="oc-error">{error}</div>;

    return (
        <div className="oc-page">
            <h1 className="oc-title">Online Classes</h1>
            <p className="oc-sub">Join live session with your teacher</p>

            <div className="oc-list">
                {classes.length === 0 ? (
                    <p className="oc-empty">No online classes scheduled.</p>
                ) : (
                    classes.map((c, index) => (
                        <div className="oc-card" key={c._id || c.id}>
                            <div className={`oc-card-header oc-card-header--${index % 2 === 0 ? "navy" : "red"}`}>
                                <p className="oc-subject">{c.subject}</p>
                                <div className="oc-meta">
                                    <span className="oc-meta-item">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
                                        </svg>
                                        {c.date}
                                    </span>
                                    <span className="oc-meta-item">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
                                        </svg>
                                        {c.classLabel || c.class}
                                    </span>
                                    <span className="oc-meta-item">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                                        </svg>
                                        {c.time}
                                    </span>
                                </div>
                            </div>

                            <div className="oc-card-body">
                                <a
                                    href={c.meetingLink || c.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`oc-join-btn oc-join-btn--${index % 2 === 0 ? "navy" : "red"}`}
                                >
                                    Join Class Now
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

