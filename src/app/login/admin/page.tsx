"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, getPostLoginPath } from "@/lib/auth";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Shield } from "lucide-react";



export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Please fill in both email and password.");
            return;
        }

        setIsLoading(true);

        try {
            const data = await login({
                email,
                password,
                role: "admin",
            });

            router.push(getPostLoginPath(data.role ?? data.user?.role));
            window.dispatchEvent(new Event("storage"));
        } catch (err: any) {
            console.error("Login Error:", err);
            setError(err.message || "Failed to log in as admin. Access denied.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen flex items-center justify-center font-inter overflow-hidden text-white">
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-lg px-6"
            >
                <div className="bg-[#111627]/70 backdrop-blur-2xl border border-red-500/20 rounded-[2rem] p-10 shadow-[0_20px_60px_rgba(239,68,68,0.08)] flex flex-col items-center relative overflow-hidden">
                    {/* Glow */}
                    <div className="absolute -top-[100px] -right-[100px] w-64 h-64 bg-red-500/10 rounded-full blur-[80px]" />
                    <div className="absolute -bottom-[100px] -left-[100px] w-64 h-64 bg-red-400/8 rounded-full blur-[80px]" />

                    {/* Icon */}
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-20 h-20 bg-gradient-to-tr from-red-500 to-red-400 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.4)] relative z-10"
                    >
                        <Shield className="text-white w-10 h-10" />
                    </motion.div>

                    <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 text-center tracking-tight drop-shadow-md relative z-10">
                        Admin Access
                    </h1>
                    <p className="text-[#A0AEC0] text-[15px] text-center mb-10 font-medium relative z-10">
                        Restricted zone. Authorized personnel only.
                    </p>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold px-4 py-3 rounded-xl mb-6 text-center w-full relative z-10"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form className="flex flex-col gap-6 w-full relative z-10" onSubmit={handleLogin}>
                        <div className="flex flex-col gap-2 relative group">
                            <label className="text-xs font-bold text-[#A0AEC0] ml-1 uppercase tracking-wider">Admin Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0] group-focus-within:text-red-400 transition-colors duration-300" />
                                <input
                                    type="email"
                                    placeholder="admin@blackspire.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-4 rounded-xl text-white outline-none focus:border-red-400/60 focus:bg-[#0A0F1F]/90 focus:shadow-[0_0_20px_rgba(239,68,68,0.15)] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-[15px]"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 relative group">
                            <label className="text-xs font-bold text-[#A0AEC0] ml-1 uppercase tracking-wider">Admin Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0] group-focus-within:text-red-400 transition-colors duration-300" />
                                <input
                                    type="password"
                                    placeholder="••••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-4 rounded-xl text-white outline-none focus:border-red-400/60 focus:bg-[#0A0F1F]/90 focus:shadow-[0_0_20px_rgba(239,68,68,0.15)] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-[15px] tracking-wider"
                                />
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="mt-4 w-full bg-gradient-to-r from-red-500 to-red-400 text-white font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 group/btn"
                        >
                            {isLoading ? "Authenticating..." : "Enter Admin Panel"}
                            {!isLoading && <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1.5 transition-transform duration-300" />}
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        </main>
    );
}
