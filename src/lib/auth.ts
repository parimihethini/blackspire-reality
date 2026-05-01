import { authFetch, API_ORIGIN } from "./httpClient";

export interface AuthUser {
    id?: number;
    role: "customer" | "seller" | "admin" | "investor";
    email: string;
    name?: string;
    phone?: string;
    profile_image?: string;
    loggedIn: boolean;
    token?: string;
}

const ROLE_KEY = "role";

function maskToken(token?: string) {
    if (!token) return "missing";
    return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

function normalizeRole(r: unknown): string {
    if (r == null) return "";
    if (typeof r === "string") return r;
    if (typeof r === "object" && r !== null && "value" in (r as object)) {
        return String((r as { value: string }).value);
    }
    return String(r);
}

/** Read canonical session from localStorage. */
function readStoredSession(): { token: string; user: Record<string, unknown> } | null {
    if (typeof window === "undefined") return null;

    const standalone = localStorage.getItem("token")?.trim() || "";
    const raw = localStorage.getItem("auth");
    const roleFromLs = localStorage.getItem(ROLE_KEY)?.trim() || "";

    if (!raw) {
        return null;
    }

    let auth: Record<string, unknown>;
    try {
        auth = JSON.parse(raw);
    } catch {
        return null;
    }

    const token =
        (typeof auth.token === "string" && auth.token) ||
        (typeof auth.access_token === "string" && auth.access_token) ||
        standalone;

    let user = auth.user as Record<string, unknown> | undefined;
    if (!user || typeof user !== "object") {
        if (typeof auth.email === "string" && auth.email) {
            user = {
                id: auth.id,
                email: auth.email,
                role: auth.role,
                name: auth.name,
                phone: auth.phone,
            };
        }
    }

    if (!token || !user || typeof user.email !== "string") {
        return null;
    }

    if (roleFromLs && !user.role) {
        user = { ...user, role: roleFromLs };
    }
    if (user.role) {
        user = { ...user, role: normalizeRole(user.role) };
    }

    return { token, user };
}

export function getAuthToken(): string {
    const session = readStoredSession();
    if (session?.token) return session.token;
    if (typeof window !== "undefined") {
        return localStorage.getItem("token")?.trim() || "";
    }
    return "";
}

export function getAuth(): AuthUser | null {
    const session = readStoredSession();
    if (!session) return null;

    const { token, user } = session;
    return {
        ...(user as unknown as AuthUser),
        token,
        loggedIn: true,
    };
}

/**
 * Where to send the user after a successful login / OTP, by API role string.
 */
export function getPostLoginPath(role: unknown): string {
    const r = normalizeRole(role).toLowerCase();
    if (r === "admin") return "/admin";
    if (r === "seller") return "/seller/dashboard";
    return "/";
}

/**
 * Save session after login or profile update.
 */
export function setAuth(data: {
    access_token?: string;
    user?: any;
    token?: string;
    role?: string;
    id?: number;
    email?: string;
    name?: string;
    phone?: string;
    company?: string;
    [key: string]: unknown;
}) {
    if (typeof window === "undefined") return;

    const prev = readStoredSession();

    const token =
        (typeof data.access_token === "string" && data.access_token) ||
        (typeof data.token === "string" && data.token) ||
        prev?.token ||
        "";

    let user = data.user;
    if (!user || typeof user !== "object") {
        const base = (prev?.user || {}) as Record<string, unknown>;
        user = {
            ...base,
            id: data.id ?? base.id,
            email: data.email ?? base.email,
            role: data.role ?? base.role,
            name: data.name ?? base.name,
            phone: data.phone ?? base.phone,
            profile_image: data.profile_image ?? base.profile_image,
        };
        if (data.company !== undefined) {
            (user as Record<string, unknown>).company = data.company;
        }
    }

    const roleStr =
        (typeof data.role === "string" && data.role) ||
        normalizeRole((user as { role?: unknown }).role) ||
        "";

    if (user && roleStr) {
        (user as { role?: string }).role = roleStr;
    }

    if (!token) {
        console.error("[AUTH] setAuth: missing token; refusing to overwrite session");
        return;
    }
    if (!user || typeof (user as { email?: string }).email !== "string") {
        console.error("[AUTH] setAuth: missing user email; refusing to overwrite session");
        return;
    }

    localStorage.setItem("auth", JSON.stringify({ token, user }));
    localStorage.setItem("token", token);
    if (roleStr) {
        localStorage.setItem(ROLE_KEY, roleStr);
    }

    console.log("[AUTH] Stored auth session", {
        email: (user as { email?: string }).email,
        role: roleStr,
        token: maskToken(token),
    });
    window.dispatchEvent(new Event("storage"));
}

export function clearAuth() {
    if (typeof window !== "undefined") {
        localStorage.removeItem("auth");
        localStorage.removeItem("token");
        localStorage.removeItem(ROLE_KEY);
        window.dispatchEvent(new Event("storage"));
    }
}

/** Wipe storage then apply a fresh login (avoids stale tokens / wrong role). */
export function replaceSessionFromLoginResponse(data: {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    role?: string;
    user: { id: number; email: string; role?: unknown; name?: string; phone?: string | null };
}) {
    if (typeof window === "undefined") return;
    localStorage.clear();
    const role = data.role ?? normalizeRole(data.user?.role);
    setAuth({
        access_token: data.access_token,
        user: data.user,
        role,
    });
}

export async function login(credentials: { email: string; password: string; role: string }) {
    const response = await authFetch(`${API_ORIGIN}/auth/login`, {
        method: "POST",
        body: JSON.stringify(credentials),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(
            typeof data?.detail === "string" ? data.detail : "Authentication failed"
        );
    }

    replaceSessionFromLoginResponse({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
        role: data.role,
        user: data.user,
    });

    return data;
}

export async function register(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: string;
}) {
    const response = await authFetch(`${API_ORIGIN}/auth/register`, {
        method: "POST",
        body: JSON.stringify(data),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(
            typeof result?.detail === "string"
                ? result.detail
                : JSON.stringify(result?.detail) || "Registration failed"
        );
    }
    return result;
}
