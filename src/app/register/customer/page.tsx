"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuth, register } from "@/lib/auth";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, Mail, Phone, Lock, ArrowRight, UserPlus } from "lucide-react";


export default function CustomerRegister() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name || !email || !phone || !password) {
            setError("Please fill in all fields.");
            return;
        }

        if (phone.replace(/\D/g, "").length < 10) {
            setError("Please enter a valid phone number (10 digits minimum).");
            return;
        }

        setIsLoading(true);

        try {
            // Call centralized register endpoint wrapper
            const result = await register({
                name,
                email,
                phone,
                password,
                role: "customer"
            });

            if (!result.success) {
                setError(result.error || "Failed to create account. Please try again.");
                return;
            }

            // Redirect to verify OTP
            router.push(`/verify-otp?email=${encodeURIComponent(email)}&role=customer`);
        } catch (err: any) {
            console.error("Registration Error:", err);
            setError(err.message || "Failed to create account. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen flex items-center justify-center font-inter bg-[#0A0F1F] overflow-hidden text-[#FFFFFF] py-24">


            {/* Register Card Container */}
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
                        className="w-20 h-20 bg-gradient-to-tr from-[#4DA3FF] to-[#7CC4FF] rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(77,163,255,0.4)] relative z-10"
                    >
                        <UserPlus className="text-[#0A0F1F] w-10 h-10" />
                    </motion.div>
                    
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[#FFFFFF] mb-2 text-center tracking-tight drop-shadow-md relative z-10">Create Account</h1>
                    <p className="text-[#A0AEC0] text-[15px] text-center mb-10 font-medium relative z-10">Join to save favorites and request visits</p>
                    
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold px-4 py-3 rounded-xl mb-6 text-center w-full relative z-10"
                        >
                            {error}
                        </motion.div>
                    )}
                    
                    <form className="flex flex-col gap-5 w-full relative z-10" onSubmit={handleRegister}>
                        {/* Name Input */}
                        <div className="flex flex-col gap-2 relative group">
                            <label className="text-xs font-bold text-[#A0AEC0] ml-1 uppercase tracking-wider">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0] group-focus-within:text-[#7CC4FF] transition-colors duration-300" />
                                <input 
                                    type="text" 
                                    placeholder="Enter your name" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-3.5 rounded-xl text-[#FFFFFF] outline-none focus:border-[#7CC4FF] focus:bg-[#0A0F1F]/90 focus:shadow-[0_0_20px_rgba(124,196,255,0.15)] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-[15px]" 
                                />
                            </div>
                        </div>

                        {/* Email Input */}
                        <div className="flex flex-col gap-2 relative group">
                            <label className="text-xs font-bold text-[#A0AEC0] ml-1 uppercase tracking-wider">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0] group-focus-within:text-[#7CC4FF] transition-colors duration-300" />
                                <input 
                                    type="email" 
                                    placeholder="name@example.com" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-3.5 rounded-xl text-[#FFFFFF] outline-none focus:border-[#7CC4FF] focus:bg-[#0A0F1F]/90 focus:shadow-[0_0_20px_rgba(124,196,255,0.15)] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-[15px]" 
                                />
                            </div>
                        </div>

                        {/* Phone Input */}
                        <div className="flex flex-col gap-2 relative group">
                            <label className="text-xs font-bold text-[#A0AEC0] ml-1 uppercase tracking-wider">👉 Mobile Number / WhatsApp Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0] group-focus-within:text-[#7CC4FF] transition-colors duration-300" />
                                <input 
                                    type="tel" 
                                    placeholder="e.g. 9876543210 or +1..." 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-3.5 rounded-xl text-[#FFFFFF] outline-none focus:border-[#7CC4FF] focus:bg-[#0A0F1F]/90 focus:shadow-[0_0_20px_rgba(124,196,255,0.15)] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-[15px]" 
                                />
                            </div>
                            <span className="text-[10px] text-[#A0AEC0] ml-1">Include country code if outside India (e.g. +1...)</span>
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
                                    className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-3.5 rounded-xl text-[#FFFFFF] outline-none focus:border-[#7CC4FF] focus:bg-[#0A0F1F]/90 focus:shadow-[0_0_20px_rgba(124,196,255,0.15)] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-[15px] tracking-wider" 
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit" 
                            disabled={isLoading}
                            className="mt-6 w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] hover:shadow-[0_0_40px_rgba(77,163,255,0.6)] hover:from-[#7CC4FF] hover:to-[#4DA3FF] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 group/btn"
                        >
                            {isLoading ? "Creating Account..." : "Create Account"}
                            {!isLoading && <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1.5 transition-transform duration-300" />}
                        </motion.button>

                        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
                            <span className="text-sm text-[#A0AEC0] font-medium">Already have an account?</span>
                            <Link href="/login/customer" className="text-[#7CC4FF] hover:text-[#FFFFFF] text-sm font-bold hover:underline transition-colors drop-shadow-[0_0_5px_rgba(124,196,255,0.4)]">
                                Log in
                            </Link>
                        </div>
                    </form>
                </div>
            </motion.div>
        </main>
    );
}
