"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";

export function SellerOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        const auth = getAuth();
        if (auth && auth.role === "seller") {
            setIsAuthorized(true);
        } else {
            setIsAuthorized(false);
            if (!fallback) router.push("/");
        }
    }, [fallback, router]);

    if (isAuthorized === null) return null; // loading
    if (!isAuthorized) return <>{fallback}</>;
    
    return <>{children}</>;
}

export function CustomerOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        const auth = getAuth();
        // Since visitors could also see some customer parts, this specifically enforces 'customer' role
        if (auth && auth.role === "customer") {
            setIsAuthorized(true);
        } else {
            setIsAuthorized(false);
            if (!fallback) router.push("/login/customer");
        }
    }, [fallback, router]);

    if (isAuthorized === null) return null; // loading
    if (!isAuthorized) return <>{fallback}</>;
    
    return <>{children}</>;
}
