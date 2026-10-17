import { useState, useEffect } from "react";
import "./3Student.css";
import AddStudentModal from "./4Add";

const BASE_URL = "https://heroesschool-management-backend.vercel.app";

export default function StudentsList() {
    const [staff, setStaff] = useState({ assignedClass: "" });
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null); // null = adding, otherwise the student object being edited
    const [deleteTarget, setDeleteTarget] = useState(null); // student object pending delete confirmation
    const [actionError, setActionError] = useState("");

    const token = localStorage.getItem("token");

    const loadStudents = () => {
        setLoading(true);
        setError("");
        fetch(`${BASE_URL}/api/staff/students`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load students.");
                return res.json();
            })
            .then((data) => {
                // Confirmed shape: { success, data: [ { id, name, studentId, sex, class } ], assignedClass }
                setStudents(data.data || []);
                // The endpoint itself returns assignedClass — prefer this fresh value
                // over the cached localStorage copy used as the initial/fallback state.
                if (data.assignedClass) {
                    setStaff({ assignedClass: data.assignedClass });
                }
            })
            .catch(() => setError("Failed to load students. Please try again."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        // Staff profile (for assignedClass) — used as an initial fallback until
        // loadStudents() returns the server-confirmed assignedClass value.
        const saved = localStorage.getItem("user");
        if (saved) {
            const parsed = JSON.parse(saved);
            setStaff({ assignedClass: parsed.assignedClass || parsed.class || "" });
        }
        loadStudents();
    }, []);

    const openAddModal = () => {
        setEditingStudent(null);
        setActionError("");
        setModalOpen(true);
    };

    const openEditModal = (student) => {
        setEditingStudent(student);
        setActionError("");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingStudent(null);
    };

    const handleModalSubmit = async (form) => {
        const sexLetter = form.sex === "Male" ? "M" : form.sex === "Female" ? "F" : form.sex;
        const payload = {
            surname: form.surname,
            otherNames: form.otherNames,
            sex: sexLetter,
        };

        setActionError("");
        try {
            if (editingStudent) {
                const res = await fetch(`${BASE_URL}/api/staff/students/${editingStudent._id || editingStudent.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to update student.");
            } else {
                const res = await fetch(`${BASE_URL}/api/staff/students`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to add student.");
            }
            closeModal();
            loadStudents(); // refresh list from server so we get the real studentId/id
        } catch (err) {
            setActionError(err.message || "Something went wrong. Please try again.");
        }
    };

    const confirmDelete = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/staff/students/${deleteTarget._id || deleteTarget.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to remove student.");
            }
            setStudents((prev) => prev.filter((s) => (s._id || s.id) !== (deleteTarget._id || deleteTarget.id)));
        } catch (err) {
            setError(err.message || "Failed to remove student.");
        } finally {
            setDeleteTarget(null);
        }
    };

    if (loading) return <div className="stu-page"><p>Loading students...</p></div>;

    return (
        <div className="stu-page">
            <h1 className="stu-title">Students</h1>
            <p className="stu-sub">Find below the list of students in your class</p>

            {error && <p className="stu-error">{error}</p>}

            <div className="stu-table-card">
                <div className="stu-table-wrap">
                    <table className="stu-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Student ID</th>
                                <th>Sex</th>
                                <th>Class</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s) => (
                                <tr key={s._id || s.id}>
                                    <td className="stu-name">{s.name}</td>
                                    <td>{s.studentId}</td>
                                    <td>{s.sex}</td>
                                    <td>{s.class || s.studentClass}</td>
                                    <td>
                                        <div className="stu-actions">
                                            <span>Edit details</span>
                                            <button
                                                className="stu-icon-btn stu-icon-btn--edit"
                                                onClick={() => openEditModal(s)}
                                                aria-label="Edit student"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                                                    <path d="M0 0h24v24H0z" fill="none" />
                                                    <path fill="currentColor" d="M3.548 20.938h16.9a.5.5 0 0 0 0-1h-16.9a.5.5 0 0 0 0 1M9.71 17.18a2.6 2.6 0 0 0 1.12-.65l9.54-9.54a1.75 1.75 0 0 0 0-2.47l-.94-.93a1.79 1.79 0 0 0-2.47 0l-9.54 9.53a2.5 2.5 0 0 0-.64 1.12L6.04 17a.74.74 0 0 0 .19.72a.77.77 0 0 0 .53.22Zm.41-1.36a1.47 1.47 0 0 1-.67.39l-.97.26l-1-1l.26-.97a1.5 1.5 0 0 1 .39-.67l.38-.37l1.99 1.99Zm1.09-1.08l-1.99-1.99l6.73-6.73l1.99 1.99Zm8.45-8.45L18.65 7.3l-1.99-1.99l1.01-1.02a.75.75 0 0 1 1.06 0l.93.94a.754.754 0 0 1 0 1.06" />
                                                </svg>

                                            </button>
                                            <button
                                                className="stu-icon-btn stu-icon-btn--delete"
                                                onClick={() => setDeleteTarget(s)}
                                                aria-label="Delete student"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                                                    <path d="M0 0h24v24H0z" fill="none" />
                                                    <path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z" />
                                                </svg>

                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="stu-add-row">
                <button className="stu-add-btn" onClick={openAddModal}>
                    Add Student
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                </button>
            </div>

            {actionError && <p className="stu-error">{actionError}</p>}

            {/* Add / Edit modal — separate component */}
            <AddStudentModal
                isOpen={modalOpen}
                onClose={closeModal}
                onSubmit={handleModalSubmit}
                assignedClass={staff.assignedClass}
                editingStudent={editingStudent}
            />

            {/* Delete confirmation */}
            {deleteTarget && (
                <div className="stu-modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="stu-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="stu-confirm-title">Remove Student?</h3>
                        <p className="stu-confirm-text">
                            Are you sure you want to remove <strong>{deleteTarget.name}</strong> from your class list? This cannot be undone.
                        </p>
                        <div className="stu-confirm-actions">
                            <button
                                className="stu-confirm-btn stu-confirm-btn--cancel"
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="stu-confirm-btn stu-confirm-btn--delete"
                                onClick={confirmDelete}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

