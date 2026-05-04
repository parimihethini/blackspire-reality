"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, getPostLoginPath } from "@/lib/auth";
import { apiPost } from "@/lib/httpClient";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Briefcase } from "lucide-react";

export default function SellerLogin() {
    const [step, setStep] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
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
                role: "seller",
            });

            router.push(getPostLoginPath(data.role ?? data.user?.role));
            window.dispatchEvent(new Event("storage"));
        } catch (err: any) {
            console.error("Login Error:", err);
            if (err.message && err.message.includes("Email not verified")) {
                router.push(`/verify-otp?email=${encodeURIComponent(email)}&role=seller`);
                return;
            }
            setError(err.message || "Failed to log in. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            alert("Please enter your email first");
            return;
        }

        try {
            const res = await apiPost('/auth/forgot-password', { email });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                alert("OTP sent to your email");
                setStep("otp");
            } else {
                alert(data.message || data.detail || "Failed to send reset link");
            }
        } catch (err) {
            console.error("Forgot password error:", err);
            alert("Something went wrong");
        }
    };

    const verifyOtp = () => {
        if (!otp || otp.length !== 6) {
            alert("Please enter a valid 6-digit OTP");
            return;
        }
        setStep("reset");
    };

    const resetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        if (!newPassword || newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);
        try {
            const res = await apiPost('/auth/verify-reset-otp', {
                email,
                otp,
                new_password: newPassword
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                alert("Password updated successfully");
                setStep("login");
                setPassword("");
                setOtp("");
                setNewPassword("");
            } else {
                setError(data.message || data.detail || "Failed to reset password");
            }
        } catch (err: any) {
            setError("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen flex items-center justify-center font-inter bg-[#0A0F1F] overflow-hidden text-[#FFFFFF]">
            
            {/* Dynamic Background Image */}
            <div 
                className="absolute inset-0 bg-cover bg-center z-0"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2000')" }}
            />
            {/* Dark Overlay for readability */}
            <div className="absolute inset-0 bg-[#0A0F1F]/80 mix-blend-multiply z-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1F] via-[#0A0F1F]/60 to-[#0A0F1F]/20 z-0" />

            {/* Login Card Container */}
            <motion.div 
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-lg px-6"
            >
                <div className="bg-[#111627]/70 backdrop-blur-2xl border border-[#4DA3FF]/20 rounded-[2rem] p-10 shadow-[0_20px_60px_rgba(77,163,255,0.08)] flex flex-col items-center group/card transition-all duration-500 hover:border-[#4DA3FF]/40 hover:shadow-[0_20px_60px_rgba(77,163,255,0.15)] relative overflow-hidden">
                    
                    {/* Floating Glow Inside Card */}
                    <div className="absolute -top-[100px] -right-[100px] w-64 h-64 bg-[#7CC4FF]/10 rounded-full blur-[80px] group-hover/card:bg-[#7CC4FF]/20 transition-all duration-700"></div>
                    <div className="absolute -bottom-[100px] -left-[100px] w-64 h-64 bg-[#4DA3FF]/10 rounded-full blur-[80px] group-hover/card:bg-[#4DA3FF]/20 transition-all duration-700"></div>

                    {/* Header */}
                    <motion.div 
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-20 h-20 bg-gradient-to-tr from-[#7CC4FF] to-[#4DA3FF] rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(124,196,255,0.4)] relative z-10"
                    >
                        <Briefcase className="text-[#0A0F1F] w-10 h-10" />
                    </motion.div>
                    
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[#FFFFFF] mb-2 text-center tracking-tight drop-shadow-md relative z-10">Seller Portal</h1>
                    <p className="text-[#A0AEC0] text-[15px] text-center mb-10 font-medium relative z-10">Manage properties, uploads, and inquiries.</p>
                    
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold px-4 py-3 rounded-xl mb-6 text-center w-full relative z-10"
                        >
                            {error}
                        </motion.div>
                    )}
                    
                    {step === "login" && (
                        <form className="flex flex-col gap-6 w-full relative z-10" onSubmit={handleLogin}>
                            {/* Email Input */}
                            <div className="flex flex-col gap-2 relative group">
                                <label className="text-xs font-bold text-[#A0AEC0] ml-1 uppercase tracking-wider">Agent Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0] group-focus-within:text-[#7CC4FF] transition-colors duration-300" />
                                    <input 
                                        type="email" 
                                        placeholder="agent@example.com" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-4 rounded-xl text-[#FFFFFF] outline-none focus:border-[#7CC4FF] focus:bg-[#0A0F1F]/90 focus:shadow-[0_0_20px_rgba(124,196,255,0.15)] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-[15px]" 
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="flex flex-col gap-2 relative group">
                                <label className="text-xs font-bold text-[#A0AEC0] ml-1 uppercase tracking-wider">Secure Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0] group-focus-within:text-[#7CC4FF] transition-colors duration-300" />
                                    <input 
                                        type="password" 
                                        placeholder="••••••••••••••" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-4 rounded-xl text-[#FFFFFF] outline-none focus:border-[#7CC4FF] focus:bg-[#0A0F1F]/90 focus:shadow-[0_0_20px_rgba(124,196,255,0.15)] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-[15px] tracking-wider" 
                                    />
                                </div>
                                <div className="flex justify-end p-1">
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-blue-400 hover:underline text-sm"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit" 
                                disabled={isLoading}
                                className="mt-4 w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] hover:shadow-[0_0_40px_rgba(77,163,255,0.6)] hover:from-[#7CC4FF] hover:to-[#4DA3FF] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 group/btn"
                            >
                                {isLoading ? "Authenticating Portal..." : "Login to Portal"}
                                {!isLoading && <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1.5 transition-transform duration-300" />}
                            </motion.button>

                            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
                                <span className="text-sm text-[#A0AEC0] font-medium">Want to list your property?</span>
                                <Link href="/register" className="text-[#7CC4FF] hover:text-[#FFFFFF] text-sm font-bold hover:underline transition-colors drop-shadow-[0_0_5px_rgba(124,196,255,0.4)]">
                                    Register
                                </Link>
                            </div>
                        </form>
                    )}

                    {step === "otp" && (
                        <div className="flex flex-col gap-6 w-full relative z-10">
                            <h2 className="text-xl font-bold text-center text-[#FFFFFF]">Verify OTP</h2>
                            <p className="text-sm text-center text-[#A0AEC0] -mt-4">We've sent a 6-digit code to {email}</p>
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    placeholder="Enter 6-digit OTP" 
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-4 rounded-xl text-[#FFFFFF] outline-none focus:border-[#7CC4FF] focus:bg-[#0A0F1F]/90 text-center tracking-widest font-bold transition-all" 
                                />
                            </div>
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={verifyOtp}
                                className="mt-4 w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] transition-all"
                            >
                                Verify OTP
                            </motion.button>
                            <button type="button" onClick={() => setStep("login")} className="text-sm text-[#A0AEC0] hover:text-white mt-2 transition-colors">Back to Login</button>
                        </div>
                    )}

                    {step === "reset" && (
                        <form className="flex flex-col gap-6 w-full relative z-10" onSubmit={resetPassword}>
                            <h2 className="text-xl font-bold text-center text-[#FFFFFF]">Set New Password</h2>
                            <div className="relative group text-left">
                                <label className="text-xs font-bold text-[#A0AEC0] ml-1 uppercase tracking-wider">New Password</label>
                                <div className="relative mt-2">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0]" />
                                    <input 
                                        type="password" 
                                        placeholder="New Password" 
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-4 rounded-xl text-[#FFFFFF] outline-none focus:border-[#7CC4FF] focus:bg-[#0A0F1F]/90 transition-all" 
                                        required
                                        minLength={8}
                                    />
                                </div>
                                <p className="text-xs text-[#A0AEC0]/70 ml-1 mt-2">At least 8 characters</p>
                            </div>
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={isLoading}
                                className="mt-4 w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] disabled:opacity-70 transition-all"
                            >
                                {isLoading ? "Updating..." : "Update Password"}
                            </motion.button>
                            <button type="button" onClick={() => setStep("login")} className="text-sm text-[#A0AEC0] hover:text-white mt-2 transition-colors text-center w-full">Cancel</button>
                        </form>
                    )}
                </div>
            </motion.div>
        </main>
    );
}
