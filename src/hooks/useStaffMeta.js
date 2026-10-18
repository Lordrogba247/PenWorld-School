import { useState, useEffect, useCallback, useRef } from "react";
import { normalizeClassesPayload, resolveLegacyClass } from "./useClasses.jsx";

const BASE_URL = "https://pen-world-school.vercel.app";

// Module-level cache — same pattern as useMeta, separate cache since this hits a different endpoint
let staffMetaCache = null;

export function useStaffMeta() {
    const [meta, setMeta] = useState(staffMetaCache);
    const [loading, setLoading] = useState(!staffMetaCache);
    const [error, setError] = useState("");

    const fetchMeta = useCallback(async (force = false) => {
        if (staffMetaCache && !force) {
            setMeta(staffMetaCache);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/api/staff/meta`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to load meta data.");
            const json = await res.json();
            staffMetaCache = normalizeClassesPayload(json);
            setMeta(staffMetaCache);
        } catch (err) {
            setError(err.message || "Failed to load meta data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMeta();
    }, [fetchMeta]);

    // Given a class name (e.g. "Primary 1 Gaa-Akanbi"), return its level (e.g. "primary").
    const getLevelForClass = useCallback(
        (className) => {
            const classes = meta?.classes || meta?.classOptions || [];
            const hit = classes.find(
                (c) => (c.value ?? c.name) === className || (c.name ?? c.value) === className || String(c.id) === String(className)
            );
            return hit?.level || null;
        },
        [meta]
    );

    // Given a class name, return the subjects for that exact class, falling back to level.
    // (Live per-class list from GET /api/staff/classes/:classRef/subjects is
    // fetched via fetchClassSubjects below; this stays as the instant fallback.)
    const classSubjectsCache = useRef({});
    const fetchClassSubjects = useCallback(
        async (classRef) => {
            const ref = String(classRef ?? "").trim();
            if (!ref) return [];
            if (classSubjectsCache.current[ref]?.length) return classSubjectsCache.current[ref];
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(
                    `${BASE_URL}/api/staff/classes/${encodeURIComponent(ref)}/subjects`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json().catch(() => ({}));
                const d = json?.data ?? json;
                const rawList =
                    (Array.isArray(d?.subjects) && d.subjects) ||
                    (Array.isArray(d) && d) ||
                    (Array.isArray(json?.subjects) && json.subjects) ||
                    [];
                const names = rawList
                    .map((s) => (typeof s === "string" ? s : (s?.name ?? s?.subject ?? s?.title ?? s?.value ?? "")))
                    .map((s) => String(s ?? "").trim())
                    .filter(Boolean);
                if (names.length > 0) {
                    classSubjectsCache.current[ref] = names;
                    return names;
                }
            } catch {
                // ignore — caller falls back to meta-derived list
            }
            return [];
        },
        []
    );
    const getSubjectsForClass = useCallback(
        (className) => {
            if (!className) return [];
            if (meta?.subjectsByClass?.[className]?.length) return meta.subjectsByClass[className];
            const classes = meta?.classes || meta?.classOptions || [];
            const match = classes.find(
                (c) => (c.value ?? c.name) === className || (c.name ?? c.value) === className || String(c.id) === String(className)
            );
            if (match && meta?.subjectsByClass?.[match.value]?.length) return meta.subjectsByClass[match.value];
            if (match?.baseName && meta?.subjectsByClass?.[match.baseName]?.length)
                return meta.subjectsByClass[match.baseName];
            const level = match?.level || null;
            return level ? (meta?.subjectsByLevel?.[level] || []) : [];
        },
        [meta]
    );

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
        getLevelForClass,
        getSubjectsForClass,
        fetchClassSubjects,
        resolveLegacyClass: (v) => resolveLegacyClass(v, meta?.names || [], meta?.byBase || {}),
        refetch: () => fetchMeta(true),
    };
}

