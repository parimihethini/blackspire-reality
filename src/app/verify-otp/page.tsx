"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { replaceSessionFromLoginResponse, getPostLoginPath } from "@/lib/auth";
import { getErrorDetail, readJsonSafely } from "@/lib/api";
import { apiPost } from "@/lib/httpClient";
import { ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";

function VerifyOTPContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    const role = searchParams.get("role") || "customer";

    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState("");

    useEffect(() => {
        if (!email) {
            router.push(`/login/${role}`);
        }
    }, [email, role, router]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length < 6) {
            setError("Please enter a valid 6-digit OTP.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await apiPost('/auth/verify-otp', { email, otp });

            if (!response.ok) {
                throw new Error(await getErrorDetail(response, "Verification failed"));
            }

            const data = await readJsonSafely(response);

            replaceSessionFromLoginResponse({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                role: data.role,
                user: data.user,
            });

            window.dispatchEvent(new Event("storage"));
            router.push(getPostLoginPath(data.role ?? data.user?.role));
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to verify OTP.";
            if (message === "Not authenticated") {
                setError("Your session has expired or is invalid. Please sign out and sign in again to submit a review.");
            } else {
                setError(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        setResendMessage("");
        try {
            const response = await apiPost('/auth/resend-otp', { email });

            if (!response.ok) {
                const detail = await response.text().catch(() => "");
                throw new Error(detail || "Failed to resend OTP");
            }

            setResendMessage("New OTP sent to your email!");
            setTimeout(() => setResendMessage(""), 5000);
        } catch (err) {
            console.error("Resend OTP failed:", err);
            setError(err instanceof Error ? err.message : "Failed to resend OTP. Please try again.");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <main className="relative min-h-screen flex items-center justify-center font-inter bg-[#0A0F1F] overflow-hidden text-[#FFFFFF] py-24">
            
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4DA3FF]/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7CC4FF]/10 rounded-full blur-[120px]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md px-6"
            >
                <div className="bg-[#111627]/70 backdrop-blur-2xl border border-[#4DA3FF]/20 rounded-[2rem] p-10 shadow-[0_20px_60px_rgba(77,163,255,0.08)] flex flex-col items-center">
                    
                    <motion.div 
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-20 h-20 bg-gradient-to-tr from-[#4DA3FF] to-[#7CC4FF] rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(77,163,255,0.4)]"
                    >
                        <ShieldCheck className="text-[#0A0F1F] w-10 h-10" />
                    </motion.div>
                    
                    <h1 className="text-3xl font-extrabold text-[#FFFFFF] mb-2 text-center tracking-tight">Verify Email</h1>
                    <p className="text-[#A0AEC0] text-[15px] text-center mb-8 font-medium">
                        We sent a 6-digit code to<br/>
                        <span className="text-[#7CC4FF] font-bold">{email}</span>
                    </p>
                    
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold px-4 py-3 rounded-xl mb-6 text-center w-full">
                            {error}
                        </div>
                    )}

                    {resendMessage && (
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold px-4 py-3 rounded-xl mb-6 text-center w-full">
                            {resendMessage}
                        </div>
                    )}
                    
                    <form className="flex flex-col gap-6 w-full" onSubmit={handleVerify}>
                        <div className="flex flex-col gap-2 group">
                            <label className="text-xs font-bold text-[#A0AEC0] ml-1 uppercase tracking-wider">Verification Code</label>
                            <input 
                                type="text" 
                                maxLength={6}
                                placeholder="000000" 
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-6 py-4 rounded-xl text-[#FFFFFF] text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-[#7CC4FF] focus:bg-[#0A0F1F]/90 transition-all duration-300 placeholder:text-[#A0AEC0]/20" 
                                required
                            />
                        </div>

                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] hover:shadow-[0_0_40px_rgba(77,163,255,0.6)] transition-all duration-300 disabled:opacity-70 flex justify-center items-center gap-2 group/btn"
                        >
                            {isLoading ? "Verifying..." : "Verify Identity"}
                            {!isLoading && <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1.5 transition-transform duration-300" />}
                        </motion.button>

                        <button 
                            type="button"
                            onClick={handleResend}
                            disabled={isResending}
                            className="text-sm text-[#A0AEC0] hover:text-[#7CC4FF] transition-colors flex items-center justify-center gap-2 font-bold"
                        >
                            <RefreshCw className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`} />
                            Resend Code
                        </button>
                    </form>
                </div>
            </motion.div>
        </main>
    );
}

export default function VerifyOTP() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center text-white">Loading Verification...</div>}>
            <VerifyOTPContent />
        </Suspense>
    );
}
