"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { apiPost, buildApiUrl } from "@/lib/httpClient";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: Record<string, unknown>) => void;
                    renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
                };
            };
        };
    }
}

interface OAuthButtonsProps {
    role?: string;
    redirectPath?: string;
}

function getGoogleClientId(): string {
    return (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
}

export default function OAuthButtons({ role = "customer", redirectPath }: OAuthButtonsProps) {
    const googleRef = useRef<HTMLDivElement>(null);
    const renderedRef = useRef(false);
    const [error, setError] = useState("");
    const [gsiReady, setGsiReady] = useState(false);
    const { setSessionFromOAuth, getRedirectPath } = useAuth();
    const router = useRouter();
    const clientId = getGoogleClientId();

    const handleGoogleCredential = useCallback(
        async (credential: string) => {
            setError("");
            try {
                const res = await apiPost("/auth/google", {
                    id_token: credential,
                    role,
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(
                        typeof data.detail === "string" ? data.detail : "Google sign-in failed",
                    );
                }
                setSessionFromOAuth(data);
                router.push(redirectPath || getRedirectPath(data.role ?? data.user?.role));
            } catch (err) {
                setError(err instanceof Error ? err.message : "Google sign-in failed");
            }
        },
        [role, redirectPath, router, setSessionFromOAuth, getRedirectPath],
    );

    const renderGoogleButton = useCallback(() => {
        if (!clientId || !gsiReady || !window.google?.accounts?.id || !googleRef.current) {
            return;
        }

        const container = googleRef.current;
        container.innerHTML = "";
        renderedRef.current = false;

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: { credential?: string }) => {
                if (response.credential) {
                    void handleGoogleCredential(response.credential);
                }
            },
        });

        window.google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            type: "standard",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: 320,
        });
        renderedRef.current = true;
    }, [clientId, gsiReady, handleGoogleCredential]);

    useEffect(() => {
        renderGoogleButton();
    }, [renderGoogleButton]);

    const startLinkedIn = async () => {
        setError("");
        const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
        try {
            const res = await fetch(
                buildApiUrl(
                    `/auth/linkedin/url?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(role)}`,
                ),
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.url) {
                throw new Error(
                    typeof data.detail === "string" ? data.detail : "LinkedIn sign-in is not configured",
                );
            }
            sessionStorage.setItem("linkedin_oauth_role", role);
            window.location.href = data.url;
        } catch (err) {
            setError(err instanceof Error ? err.message : "LinkedIn sign-in failed");
        }
    };

    return (
        <div className="w-full flex flex-col items-center gap-3 mt-2 relative z-20">
            {clientId ? (
                <>
                    <Script
                        src="https://accounts.google.com/gsi/client"
                        strategy="afterInteractive"
                        onLoad={() => setGsiReady(true)}
                    />
                    <div
                        ref={googleRef}
                        className="flex justify-center items-center min-h-[44px] w-full max-w-[320px] overflow-visible"
                        aria-label="Sign in with Google"
                    />
                </>
            ) : null}

            <button
                type="button"
                onClick={startLinkedIn}
                className="w-full max-w-[320px] py-3 rounded-xl border border-[#4DA3FF]/30 bg-[#0A0F1F]/60 text-white font-semibold hover:border-[#7CC4FF]/50 transition-colors"
            >
                Continue with LinkedIn
            </button>

            {error ? <p className="text-red-400 text-sm text-center">{error}</p> : null}
        </div>
    );
}

export function OAuthDivider() {
    return (
        <div className="relative w-full my-2">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#A0AEC0]/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#111627] px-2 text-[#A0AEC0]">Or continue with</span>
            </div>
        </div>
    );
}
