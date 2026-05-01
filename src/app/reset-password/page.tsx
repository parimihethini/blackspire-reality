"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, ArrowRight, KeyRound, ChevronLeft, CheckCircle2 } from "lucide-react";
import { authFetch, API_ORIGIN } from "@/lib/httpClient";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!token?.trim()) {
            setError("Invalid reset link. Request a new password reset from the login page.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await authFetch(`${API_ORIGIN}/auth/reset-password`, {
                method: "POST",
                body: JSON.stringify({
                    token: token.trim(),
                    new_password: password,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const detail = data?.detail;
                const msg =
                    typeof detail === "string"
                        ? detail
                        : Array.isArray(detail)
                          ? detail.map((d: { msg?: string }) => d.msg || "").join(" ")
                          : "Could not reset password. The link may have expired.";
                throw new Error(msg || "Password reset failed.");
            }

            setSuccess(true);
            setPassword("");
            setConfirm("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="bg-[#111627]/80 backdrop-blur-3xl border border-[#4DA3FF]/20 rounded-[2.5rem] p-10 shadow-[0_20px_60px_rgba(77,163,255,0.1)] w-full max-w-md text-center">
                <h1 className="text-2xl font-extrabold text-white mb-2">Invalid link</h1>
                <p className="text-[#A0AEC0] text-sm mb-8">
                    This reset link is missing a token. Open the link from your email, or request a new reset.
                </p>
                <Link
                    href="/forgot-password"
                    className="inline-flex items-center gap-2 text-[#7CC4FF] font-bold hover:text-white transition-colors"
                >
                    <ChevronLeft size={18} /> Back to forgot password
                </Link>
            </div>
        );
    }

    if (success) {
        return (
            <div className="bg-[#111627]/80 backdrop-blur-3xl border border-green-500/30 rounded-[2.5rem] p-10 shadow-[0_20px_60px_rgba(34,197,94,0.15)] w-full max-w-md text-center">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-6" />
                <h1 className="text-2xl font-extrabold text-white mb-2">Password reset successful</h1>
                <p className="text-[#A0AEC0] text-sm mb-8">
                    You can sign in with your new password.
                </p>
                <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl flex items-center justify-center gap-2"
                >
                    Go to login <ArrowRight size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="bg-[#111627]/80 backdrop-blur-3xl border border-[#4DA3FF]/20 rounded-[2.5rem] p-10 shadow-[0_20px_60px_rgba(77,163,255,0.1)] w-full max-w-md">
            <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                className="w-20 h-20 bg-gradient-to-tr from-[#4DA3FF] to-[#7CC4FF] rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-[0_0_30px_rgba(77,163,255,0.4)]"
            >
                <KeyRound className="text-[#0A0F1F] w-10 h-10" />
            </motion.div>

            <h1 className="text-3xl font-extrabold text-white mb-2 text-center tracking-tight">Set new password</h1>
            <p className="text-[#A0AEC0] text-[15px] text-center mb-8 font-medium">
                Choose a strong password (at least 8 characters).
            </p>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold px-4 py-3 rounded-xl mb-6 text-center w-full">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2 text-left">
                    <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">New password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0]" />
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-4 rounded-xl text-white outline-none focus:border-[#7CC4FF]"
                            placeholder="••••••••"
                            required
                            minLength={8}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2 text-left">
                    <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Confirm password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0]" />
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-4 rounded-xl text-white outline-none focus:border-[#7CC4FF]"
                            placeholder="••••••••"
                            required
                            minLength={8}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    {isLoading ? "Updating…" : "Reset password"}
                    {!isLoading && <ArrowRight className="w-5 h-5" />}
                </button>
            </form>

            <Link
                href="/login"
                className="mt-8 flex items-center justify-center gap-1 text-sm text-[#7CC4FF] hover:text-white font-semibold"
            >
                <ChevronLeft size={16} /> Back to login
            </Link>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <main className="relative min-h-screen flex items-center justify-center font-inter bg-[#0A0F1F] overflow-hidden text-[#FFFFFF] py-16 px-4">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1F] via-[#111627] to-[#0A1A2E] z-0" />
            <div className="relative z-10 w-full flex justify-center">
                <Suspense
                    fallback={
                        <div className="text-[#4DA3FF] font-semibold animate-pulse py-20">Loading…</div>
                    }
                >
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </main>
    );
}
