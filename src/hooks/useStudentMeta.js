import { useState, useEffect, useCallback } from "react";
import { normalizeClassesPayload } from "./useClasses.jsx";

const BASE_URL = "https://pen-world-school.vercel.app";

let studentMetaCache = null;

export function useStudentMeta() {
    const [meta, setMeta] = useState(studentMetaCache);
    const [loading, setLoading] = useState(!studentMetaCache);
    const [error, setError] = useState("");

    const fetchMeta = useCallback(async (force = false) => {
        if (studentMetaCache && !force) {
            setMeta(studentMetaCache);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/api/student/meta`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to load meta data.");
            const json = await res.json();
            studentMetaCache = normalizeClassesPayload(json);
            setMeta(studentMetaCache);
        } catch (err) {
            setError(err.message || "Failed to load meta data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMeta();
    }, [fetchMeta]);

    return {
        subjects: meta?.subjects || [],
        subjectsByLevel: meta?.subjectsByLevel || {},
        subjectsByClass: meta?.subjectsByClass || {},
        classes: meta?.classes || [],
        classOptions: meta?.options || meta?.classes || [],
        classNames: meta?.names || [],
        divisions: meta?.divisions || [],
        classesByBase: meta?.byBase || {},
        classesByDivision: meta?.byDivision || {},
        sessions: meta?.sessions || [],
        terms: meta?.terms || [],
        loading,
        error,
        refetch: () => fetchMeta(true),
    };
}

