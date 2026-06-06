"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type RoleName =
    | "customer"
    | "seller"
    | "admin"
    | "super_admin"
    | "team_member"
    | "startup_founder"
    | "investor";

function roleAllowed(userRole: string, allowed: RoleName[]): boolean {
    const role = userRole.toLowerCase();
    if (allowed.includes(role as RoleName)) return true;
    if (allowed.includes("admin") && role === "super_admin") return true;
    if (allowed.includes("customer") && role === "investor") return true;
    if (allowed.includes("seller") && role === "startup_founder") return true;
    return false;
}

export function SellerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [ok, setOk] = useState<boolean | null>(null);

    useEffect(() => {
        if (isLoading) return;
        const allowed = user?.loggedIn && roleAllowed(user.role, ["seller", "startup_founder"]);
        setOk(Boolean(allowed));
        if (!allowed && !fallback) router.push("/login/seller");
    }, [user, isLoading, fallback, router]);

    if (isLoading || ok === null) return null;
    if (!ok) return <>{fallback}</>;
    return <>{children}</>;
}

export function CustomerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [ok, setOk] = useState<boolean | null>(null);

    useEffect(() => {
        if (isLoading) return;
        const allowed = user?.loggedIn && roleAllowed(user.role, ["customer", "investor"]);
        setOk(Boolean(allowed));
        if (!allowed && !fallback) router.push("/login/customer");
    }, [user, isLoading, fallback, router]);

    if (isLoading || ok === null) return null;
    if (!ok) return <>{fallback}</>;
    return <>{children}</>;
}

export function RoleGuard({
    roles,
    children,
    fallback,
    redirectTo = "/login",
}: {
    roles: RoleName[];
    children: ReactNode;
    fallback?: ReactNode;
    redirectTo?: string;
}) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [ok, setOk] = useState<boolean | null>(null);

    useEffect(() => {
        if (isLoading) return;
        const allowed = user?.loggedIn && roleAllowed(user.role, roles);
        setOk(Boolean(allowed));
        if (!allowed && !fallback) router.push(redirectTo);
    }, [user, isLoading, roles, fallback, redirectTo, router]);

    if (isLoading || ok === null) return null;
    if (!ok) return <>{fallback ?? null}</>;
    return <>{children}</>;
}
