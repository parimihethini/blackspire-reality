"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";

type Props = { children: ReactNode };

/** Redirects to /login/admin if the user is not logged in as role admin. */
export default function AdminGuard({ children }: Props) {
    const router = useRouter();
    const [ok, setOk] = useState<boolean | null>(null);

    useEffect(() => {
        const auth = getAuth();
        if (!auth?.loggedIn || auth.role !== "admin") {
            router.replace("/login/admin");
            setOk(false);
            return;
        }
        setOk(true);
    }, [router]);

    if (ok === null || ok === false) {
        return (
            <div className="min-h-[40vh] flex items-center justify-center text-[#4DA3FF] font-semibold animate-pulse">
                Verifying admin access…
            </div>
        );
    }

    return <>{children}</>;
}
