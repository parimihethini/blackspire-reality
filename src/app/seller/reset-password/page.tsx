"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, ArrowRight, KeyRound, ChevronLeft, CheckCircle2 } from "lucide-react";
import { apiPost } from "@/lib/httpClient";

function SellerResetPasswordForm() {
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
            setError("Invalid reset link. Request a new password reset from the seller login page.");
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
            const response = await apiPost('/auth/reset-password', {
                token: token.trim(),
                new_password: password,
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
                    href="/seller/forgot-password"
                    className="inline-flex items-center gap-2 text-[#7CC4FF] font-bold hover:text-white transition-colors"
                >
                    <ChevronLeft size={18} /> Request new reset link
                </Link>
            </div>
        );
    }

    if (success) {
        return (
            <div className="bg-[#111627]/80 backdrop-blur-3xl border border-green-500/30 rounded-[2.5rem] p-10 shadow-[0_20px_60px_rgba(34,197,94,0.15)] w-full max-w-md text-center">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-6" />
                <h1 className="text-2xl font-extrabold text-white mb-2">Password reset successful!</h1>
                <p className="text-[#A0AEC0] text-sm mb-8">
                    Your portal password has been updated. You can now sign in with your new password.
                </p>
                <button
                    type="button"
                    onClick={() => router.push("/seller/login")}
                    className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl flex items-center justify-center gap-2"
                >
                    Back to Seller Login <ArrowRight size={18} />
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

            <h1 className="text-3xl font-extrabold text-white mb-2 text-center tracking-tight">Set New Portal Password</h1>
            <p className="text-[#A0AEC0] text-[15px] text-center mb-8 font-medium">
                Choose a strong password to secure your seller account.
            </p>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold px-4 py-3 rounded-xl mb-6 text-center w-full">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2 text-left">
                    <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">New Password</label>
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
                    <p className="text-xs text-[#A0AEC0]/70 ml-1">Minimum 8 characters recommended</p>
                </div>

                <div className="flex flex-col gap-2 text-left">
                    <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Confirm Password</label>
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

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-4 bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Resetting..." : "Reset Password"}
                    {!isLoading && <ArrowRight size={18} />}
                </motion.button>
            </form>

            <Link
                href="/seller/forgot-password"
                className="mt-8 block text-sm text-[#A0AEC0] hover:text-[#7CC4FF] text-center font-bold transition-colors"
            >
                Request another reset link
            </Link>
        </div>
    );
}

export default function SellerResetPassword() {
    return (
        <main className="relative min-h-screen flex items-center justify-center font-inter bg-[#0A0F1F] overflow-hidden text-[#FFFFFF]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1F] via-[#111627] to-[#0A1A2E] z-0" />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-md px-6"
            >
                <Suspense fallback={<div className="text-white">Loading...</div>}>
                    <SellerResetPasswordForm />
                </Suspense>
            </motion.div>
        </main>
    );
}
