"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    AuthUser,
    clearAuth,
    getAuth,
    getPostLoginPath,
    login as authLogin,
    logout as authLogout,
    refreshAccessToken,
    replaceSessionFromLoginResponse,
} from "@/lib/auth";

export type UserRole =
    | "customer"
    | "seller"
    | "admin"
    | "super_admin"
    | "team_member"
    | "startup_founder"
    | "investor";

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: { email: string; password: string; role: string }) => Promise<unknown>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<boolean>;
    setSessionFromOAuth: (data: {
        access_token: string;
        refresh_token?: string;
        role?: string;
        user: { id: number; email: string; role?: unknown; name?: string; phone?: string | null };
    }) => void;
    getRedirectPath: (role?: unknown) => string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const syncFromStorage = useCallback(() => {
        setUser(getAuth());
    }, []);

    useEffect(() => {
        syncFromStorage();
        setIsLoading(false);

        const onStorage = () => syncFromStorage();
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [syncFromStorage]);

    const login = useCallback(
        async (credentials: { email: string; password: string; role: string }) => {
            const data = await authLogin(credentials);
            syncFromStorage();
            return data;
        },
        [syncFromStorage],
    );

    const logout = useCallback(async () => {
        await authLogout();
        setUser(null);
    }, []);

    const refreshSession = useCallback(async () => {
        const ok = await refreshAccessToken();
        syncFromStorage();
        return ok;
    }, [syncFromStorage]);

    const setSessionFromOAuth = useCallback(
        (data: Parameters<AuthContextValue["setSessionFromOAuth"]>[0]) => {
            replaceSessionFromLoginResponse(data);
            syncFromStorage();
        },
        [syncFromStorage],
    );

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isAuthenticated: Boolean(user?.loggedIn),
            isLoading,
            login,
            logout,
            refreshSession,
            setSessionFromOAuth,
            getRedirectPath: getPostLoginPath,
        }),
        [user, isLoading, login, logout, refreshSession, setSessionFromOAuth],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
}
