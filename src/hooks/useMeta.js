import { useState, useEffect, useCallback, useRef } from "react";
import { normalizeClassesPayload, resolveLegacyClass } from "./useClasses.jsx";

const BASE_URL = "https://penworld-gloryseed-demo-school-back.vercel.app";

// Module-level cache so every component sharing this hook reuses one fetch
// per page-load instead of hitting /api/admin/meta again on every mount.
let metaCache = null;

export function useMeta() {
    const [meta, setMeta] = useState(metaCache);
    const [loading, setLoading] = useState(!metaCache);
    const [error, setError] = useState("");

    const fetchMeta = useCallback(async (force = false) => {
        if (metaCache && !force) {
            setMeta(metaCache);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/api/admin/meta`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to load meta data.");
            const json = await res.json();
            metaCache = normalizeClassesPayload(json);
            setMeta(metaCache);
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
    // Matches on full value, id, or legacy name so old callers keep working.
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

    // Live per-class subjects from the tightened backend:
    // GET /api/admin/classes/:classRef/subjects -> { success, data: { subjects: [...] } }
    // Falls back to meta.subjectsByClass(...) when the endpoint is missing/empty.
    const adminClassSubjectsCache = useRef({});
    const fetchClassSubjects = useCallback(
        async (classRef) => {
            const ref = String(classRef ?? "").trim();
            if (!ref) return [];
            if (adminClassSubjectsCache.current[ref]?.length) return adminClassSubjectsCache.current[ref];
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(
                    `${BASE_URL}/api/admin/classes/${encodeURIComponent(ref)}/subjects`,
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
                    adminClassSubjectsCache.current[ref] = names;
                    return names;
                }
            } catch {
                // ignore — caller falls back to meta-derived list
            }
            return [];
        },
        []
    );

    // Given a class name, return the subjects for that exact class, falling back to level.
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
        // sessions come back as objects: { name, startYear, endYear, isCurrent }
        sessions: meta?.sessions || [],
        terms: meta?.terms || [],
        roles: meta?.roles || [],
        loading,
        error,
        getLevelForClass,
        getSubjectsForClass,
        fetchClassSubjects,
        resolveLegacyClass: (v) => resolveLegacyClass(v, meta?.names || [], meta?.byBase || {}),
        refetch: () => fetchMeta(true),
    };
}

