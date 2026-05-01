/**
 * Shared API base + authenticated fetch (no dependency on ./auth — avoids circular imports).
 */

export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Fetch with JSON defaults and Bearer token from localStorage `token`.
 * Matches backend expectations; only sends Authorization when a token exists.
 */
export async function authFetch(input: string | URL, options: RequestInit = {}) {
    if (typeof window === "undefined") {
        return fetch(input, options);
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

    const resolvedInput =
        typeof input === "string" && input.startsWith("/")
            ? `${API_ORIGIN}${input}`
            : input;

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
