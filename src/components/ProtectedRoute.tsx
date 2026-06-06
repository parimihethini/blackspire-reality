"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type UserRole =
    | "customer"
    | "seller"
    | "admin"
    | "super_admin"
    | "team_member"
    | "startup_founder"
    | "investor";

interface ProtectedRouteProps {
    children: ReactNode;
    redirectTo?: string;
    allowedRoles?: UserRole[];
}

export function ProtectedRoute({
    children,
    redirectTo = "/login",
    allowedRoles,
}: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();
    const [allowed, setAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated || !user) {
            router.replace(redirectTo);
            setAllowed(false);
            return;
        }

        if (allowedRoles?.length) {
            const role = (user.role || "").toLowerCase() as UserRole;
            const ok =
                allowedRoles.includes(role) ||
                (allowedRoles.includes("admin") && role === "super_admin");
            if (!ok) {
                router.replace("/");
                setAllowed(false);
                return;
            }
        }

        setAllowed(true);
    }, [isAuthenticated, isLoading, user, allowedRoles, redirectTo, router]);

    if (isLoading || allowed === null) return null;
    if (!allowed) return null;
    return <>{children}</>;
}

interface RoleGuardProps {
    children: ReactNode;
    roles: UserRole[];
    fallback?: ReactNode;
    redirectTo?: string;
}

export function RoleGuard({ children, roles, fallback, redirectTo }: RoleGuardProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [ok, setOk] = useState<boolean | null>(null);

    useEffect(() => {
        if (isLoading) return;
        const role = (user?.role || "").toLowerCase() as UserRole;
        const allowed =
            Boolean(user?.loggedIn) &&
            (roles.includes(role) || (roles.includes("admin") && role === "super_admin"));
        setOk(allowed);
        if (!allowed && !fallback && redirectTo) {
            router.replace(redirectTo);
        }
    }, [user, isLoading, roles, fallback, redirectTo, router]);

    if (isLoading || ok === null) return null;
    if (!ok) return <>{fallback ?? null}</>;
    return <>{children}</>;
}
