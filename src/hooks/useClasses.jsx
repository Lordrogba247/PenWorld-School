import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const BASE_URL = "https://penworld-gloryseed-demo-school-back.vercel.app";
export const DIVISION_SUFFIX = / (Gaa-Akanbi|Amoyo)$/;

const Ctx = createContext(null);
export const PORTAL_PATH = { admin: "admin", teacher: "staff", staff: "staff", student: "student" };

// Normalize any /meta, /classes, or staff payload (old or new shape) into one consistent object.
// IMPORTANT: preserves backend-only fields like classTeacher / teacherId /
// studentCount so callers (e.g. Admin Classes table) can still read them.
export function normalizeClassesPayload(raw = {}) {
    // raw itself may be the legacy array of classes
    if (Array.isArray(raw)) {
        return normalizeClassesPayload({ classes: raw });
    }
    const d = raw?.data && typeof raw.data === "object" && !Array.isArray(raw.data) ? raw.data : raw;
    const src = d?.data && typeof d.data === "object" && !Array.isArray(d.data) ? d.data : d;

    // /api/admin/classes may return { data: [...] } where data IS the array.
    // In that case src = { data: [...] } and src.classOptions/src.classes are empty,
    // so fall back to src.data / d.data / raw.data when they are arrays.
    const arrayData =
        (Array.isArray(src?.data) && src.data) ||
        (Array.isArray(d?.data) && d.data) ||
        (Array.isArray(raw?.data) && raw.data) ||
        null;
    const rawOptions =
        (src.classOptions?.length ? src.classOptions : null) ||
        (src.classes?.length ? src.classes : null) ||
        arrayData || [];
    const options = rawOptions.map((c, i) =>
        typeof c === "string"
            ? { value: c, label: c, name: c, id: c, baseName: c.replace(DIVISION_SUFFIX, "") }
            : {
                // keep every backend field (classTeacher, teacherId, studentCount, ...) —
                // explicit keys below just guarantee sane defaults.
                ...c,
                value: c.value ?? c.name ?? "",
                label: c.label ?? c.name ?? c.value ?? "",
                name: c.name ?? c.value ?? c.label ?? "",
                id: c.id ?? c._id ?? c.value ?? c.name ?? String(i),
                code: c.code ?? "",
                baseName: c.baseName ?? (c.name || c.value || "").replace(DIVISION_SUFFIX, ""),
                level: c.level ?? null,
                grade: c.grade ?? null,
                division: c.division ?? null,
            }
    );

    const names =
        src.classNames && src.classNames.length > 0
            ? [...src.classNames]
            : options.map((o) => o.value).filter(Boolean);

    const divisions = src.divisions || [...new Set(options.map((o) => o.division).filter(Boolean))];

    const byBase = src.classesByBase || {};
    if (!src.classesByBase) {
        for (const full of names) {
            const base = full.replace(DIVISION_SUFFIX, "");
            (byBase[base] = byBase[base] || []).push(full);
        }
    }
    const byDivision = src.classesByDivision || {};

    const roles =
        src.roles && src.roles.length > 0
            ? [...src.roles]
            : ["Admin", "Teacher", ...names.map((n) => `Class Teacher ${n}`)];

    return {
        options, names, divisions, byBase, byDivision,
        subjectsByClass: src.subjectsByClass || {},
        subjectsByLevel: src.subjectsByLevel || {},
        subjects: src.subjects || [],
        classes: options,
        sessions: src.sessions || [],
        terms: src.terms || [],
        roles,
    };
}

// Resolve a stale stored value like "JSS 2" to the live full name ("JSS 2 Gaa-Akanbi").
export function resolveLegacyClass(stored, names, byBase) {
    if (!stored) return "";
    if (names.includes(stored)) return stored;
    const hit = byBase?.[stored];
    if (hit?.[0]) return typeof hit[0] === "string" ? hit[0] : hit[0].name || hit[0].value || "";
    const nospace = names.find((n) => n.replace(/ /g, "") === String(stored).replace(/ /g, ""));
    return nospace || "";
}

export function ClassesProvider({ portal = "admin", children }) {
    const [state, setState] = useState({
        options: [], names: [], divisions: [], byBase: {}, byDivision: {},
        subjectsByClass: {}, subjectsByLevel: {}, subjects: [],
        classes: [], sessions: [], terms: [], roles: [],
        loading: true, error: "",
    });

    useEffect(() => {
        let cancelled = false;
        const path = PORTAL_PATH[portal] || portal;
        const token = localStorage.getItem("token");
        fetch(`${BASE_URL}/api/${path}/meta`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => {
                if (!r.ok) throw new Error("Failed to load class data.");
                return r.json();
            })
            .then((json) =>
                !cancelled && setState({ ...normalizeClassesPayload(json), loading: false, error: "" })
            )
            .catch((err) => !cancelled && setState((s) => ({ ...s, loading: false, error: err.message })));
        return () => { cancelled = true; };
    }, [portal]);

    return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

const cache = {};
export function useLiveClasses(portal = "admin") {
    const path = PORTAL_PATH[portal] || portal;
    const [state, setState] = useState(
        cache[path] || {
            options: [], names: [], divisions: [], byBase: {}, byDivision: {},
            subjectsByClass: {}, subjectsByLevel: {}, subjects: [],
            classes: [], sessions: [], terms: [], roles: [],
            loading: true, error: "",
        }
    );

    useEffect(() => {
        if (cache[path]) { setState(cache[path]); return; }
        let cancelled = false;
        const token = localStorage.getItem("token");
        fetch(`${BASE_URL}/api/${path}/meta`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => {
                if (!r.ok) throw new Error("Failed to load class data.");
                return r.json();
            })
            .then((json) => {
                const next = { ...normalizeClassesPayload(json), loading: false, error: "" };
                cache[path] = next;
                if (!cancelled) setState(next);
            })
            .catch((err) => {
                if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message }));
            });
        return () => { cancelled = true; };
    }, [path]);

    const helpers = useMemo(() => {
        const byValue = new Map(state.options.map((o) => [o.value, o]));
        const byId = new Map(state.options.map((o) => [String(o.id), o]));
        const getOption = (key) =>
            byValue.get(key) || byId.get(String(key)) ||
            state.options.find((o) => o.name === key) || null;
        const getLevelForClass = (key) => getOption(key)?.level || null;
        const getSubjectsForClass = (key) => {
            if (!key) return [];
            const match = getOption(key);
            if (state.subjectsByClass[key]?.length) return state.subjectsByClass[key];
            if (match && state.subjectsByClass[match.value]?.length) return state.subjectsByClass[match.value];
            if (match?.baseName && state.subjectsByClass[match.baseName]?.length)
                return state.subjectsByClass[match.baseName];
            const level = match?.level;
            return level ? state.subjectsByLevel?.[level] || [] : [];
        };
        const groups = [];
        for (const full of state.names) {
            const base = full.replace(DIVISION_SUFFIX, "");
            const last = groups[groups.length - 1];
            if (last?.label === base) last.options.push(full);
            else groups.push({ label: base, options: [full] });
        }
        return { getOption, getLevelForClass, getSubjectsForClass, groups };
    }, [state]);

    return { ...state, ...helpers, resolveLegacyClass: (v) => resolveLegacyClass(v, state.names, state.byBase) };
}


