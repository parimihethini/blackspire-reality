"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/httpClient";
import { useAuth } from "@/contexts/AuthContext";

export default function LinkedInCallbackPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { setSessionFromOAuth, getRedirectPath } = useAuth();
    const [error, setError] = useState("");

    useEffect(() => {
        const code = searchParams.get("code");
        const role = sessionStorage.getItem("linkedin_oauth_role") || "customer";
        if (!code) {
            setError("Missing LinkedIn authorization code.");
            return;
        }

        const redirectUri = `${window.location.origin}/auth/linkedin/callback`;

        (async () => {
            try {
                const res = await apiPost("/auth/linkedin", {
                    code,
                    redirect_uri: redirectUri,
                    role,
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(data.detail || "LinkedIn sign-in failed");
                }
                sessionStorage.removeItem("linkedin_oauth_role");
                setSessionFromOAuth(data);
                router.replace(getRedirectPath(data.role ?? data.user?.role));
            } catch (err) {
                setError(err instanceof Error ? err.message : "LinkedIn sign-in failed");
            }
        })();
    }, [searchParams, router, setSessionFromOAuth, getRedirectPath]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#0A0F1F] text-white">
            <div className="text-center px-6">
                {error ? (
                    <>
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            type="button"
                            onClick={() => router.replace("/login")}
                            className="text-[#7CC4FF] font-bold"
                        >
                            Back to login
                        </button>
                    </>
                ) : (
                    <p className="text-[#A0AEC0]">Completing LinkedIn sign-in…</p>
                )}
            </div>
        </main>
    );
}
