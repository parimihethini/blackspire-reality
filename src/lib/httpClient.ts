/**
 * Shared API base + authenticated fetch (no dependency on ./auth — avoids circular imports).
 */

const rawBase = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\s/g, "");
let sanitizedBase = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
if (sanitizedBase && !sanitizedBase.startsWith("http://") && !sanitizedBase.startsWith("https://")) {
    sanitizedBase = `https://${sanitizedBase}`;
}
export const API_BASE = sanitizedBase;
export const API_ORIGIN = API_BASE;

if (process.env.NODE_ENV === "development") {
    console.log("[DEV] API URL:", process.env.NEXT_PUBLIC_API_URL);
}

/**
 * Ensures clean URL construction
 */
export function buildApiUrl(path: string) {
    if (!path) return API_BASE;
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE}${cleanPath}`;
}

export const apiPost = async (path: string, data: any, options: RequestInit = {}) => {
    return authFetch(path, {
        ...options,
        method: "POST",
        body: JSON.stringify(data),
    });
};

export const apiGet = async (path: string, options: RequestInit = {}) => {
    return authFetch(path, {
        ...options,
        method: "GET",
    });
};

/**
 * Fetch with JSON defaults and Bearer token from localStorage `token`.
 * Matches backend expectations; only sends Authorization when a token exists.
 */
export async function authFetch(input: string | URL, options: RequestInit = {}) {
    if (typeof window === "undefined") {
        return fetch(typeof input === "string" ? buildApiUrl(input) : input, options);
    }

    let token = localStorage.getItem("token");
    if (!token) {
        try {
            const rawAuth = localStorage.getItem("auth");
            if (rawAuth) {
                const parsed = JSON.parse(rawAuth);
                token = parsed?.token || parsed?.access_token || parsed?.user?.token || "";
            }
        } catch {
            token = "";
        }
    }

    const incoming = options.headers;
    const merged: Record<string, string> = {};

    if (incoming instanceof Headers) {
        incoming.forEach((v, k) => {
            merged[k] = v;
        });
    } else if (Array.isArray(incoming)) {
        for (const [k, v] of incoming) {
            merged[k] = v;
        }
    } else if (incoming && typeof incoming === "object") {
        Object.assign(merged, incoming as Record<string, string>);
    }

    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

    if (!isFormData && !Object.keys(merged).some((k) => k.toLowerCase() === "content-type")) {
        merged["Content-Type"] = "application/json";
    }

    if (token) {
        merged["Authorization"] = `Bearer ${token}`;
    }

    const resolvedInput = typeof input === "string" ? buildApiUrl(input) : input;

    try {
        return await fetch(resolvedInput, {
            ...options,
            headers: merged,
        });
    } catch (error) {
        console.error("[authFetch] Network request failed", { input: resolvedInput, error });
        throw new Error("Backend connection failed. Please try again later.");
    }
}
