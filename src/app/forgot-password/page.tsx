"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, ArrowRight, ShieldCheck, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { authFetch, API_ORIGIN } from "@/lib/httpClient";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setMessage("");

        try {
            const response = await authFetch(`${API_ORIGIN}/auth/forgot-password`, {
                method: "POST",
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                throw new Error("Failed to send reset link.");
            }

            setMessage("If an account exists with this email, a reset link has been sent.");
        } catch (err: any) {
            setError(err.message || "Failed to process request.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen flex items-center justify-center font-inter bg-[#0A0F1F] overflow-hidden text-[#FFFFFF]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1F] via-[#111627] to-[#0A1A2E] z-0" />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-md px-6"
            >
                <div className="bg-[#111627]/80 backdrop-blur-3xl border border-[#4DA3FF]/20 rounded-[2.5rem] p-10 shadow-[0_20px_60px_rgba(77,163,255,0.1)] flex flex-col items-center">
                    
                    <motion.div 
                        initial={{ rotate: -10, scale: 0.8 }}
                        animate={{ rotate: 0, scale: 1 }}
                        className="w-20 h-20 bg-gradient-to-tr from-[#4DA3FF] to-[#7CC4FF] rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(77,163,255,0.4)]"
                    >
                        <ShieldCheck className="text-[#0A0F1F] w-10 h-10" />
                    </motion.div>

                    <h1 className="text-3xl font-extrabold text-white mb-2 text-center tracking-tight">Recover Access</h1>
                    <p className="text-[#A0AEC0] text-[15px] text-center mb-10 font-medium">
                        Enter your email to receive a secure password reset link.
                    </p>

                    {message && (
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold px-4 py-3 rounded-xl mb-6 text-center w-full">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold px-4 py-3 rounded-xl mb-6 text-center w-full">
                            {error}
                        </div>
                    )}

                    {!message ? (
                        <form className="w-full flex flex-col gap-6" onSubmit={handleSubmit}>
                            <div className="flex flex-col gap-2 group">
                                <label className="text-xs font-bold text-[#A0AEC0] ml-1 uppercase tracking-wider">Registered Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0] group-focus-within:text-[#7CC4FF] transition-colors" />
                                    <input 
                                        type="email" 
                                        placeholder="your@email.com" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-4 rounded-xl text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all"
                                        required 
                                    />
                                </div>
                            </div>

                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit" 
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] flex justify-center items-center gap-2"
                            >
                                {isLoading ? "Requesting Link..." : "Send Reset Link"}
                                {!isLoading && <ArrowRight className="w-5 h-5" />}
                            </motion.button>
                        </form>
                    ) : (
                        <Link 
                            href="/login"
                            className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 hover:bg-white/10 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Back to Login
                        </Link>
                    )}

                    {!message && (
                        <Link href="/login" className="mt-8 text-sm text-[#A0AEC0] hover:text-[#7CC4FF] font-bold transition-colors">
                            Wait, I remember my password
                        </Link>
                    )}
                </div>
            </motion.div>
        </main>
    );
}
