"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, getAuth, getPostLoginPath } from "@/lib/auth";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, UserCircle, AlertCircle } from "lucide-react";

// Mock customer credentials for demo
const MOCK_CUSTOMER = { email: "customer@demo.com", password: "demo123" };

export default function CustomerLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [currentRole, setCurrentRole] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const auth = getAuth();
        if (auth?.loggedIn) {
            if (auth.role === "customer") {
                router.push("/");
            } else {
                setCurrentRole(auth.role);
            }
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const data = await login({
                email,
                password,
                role: "customer",
            });

            router.push(getPostLoginPath(data.role ?? data.user?.role));
            window.dispatchEvent(new Event("storage"));
        } catch (err: any) {
            console.error("Login Error:", err);
            if (err.message && err.message.includes("Email not verified")) {
                router.push(`/verify-otp?email=${encodeURIComponent(email)}&role=customer`);
                return;
            }
            setError(err.message || "Failed to log in. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen flex items-center justify-center font-inter bg-[#0A0F1F] overflow-hidden text-[#FFFFFF]">
            <div 
                className="absolute inset-0 bg-cover bg-center z-0"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2000')" }}
            />
            <div className="absolute inset-0 bg-[#0A0F1F]/80 mix-blend-multiply z-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1F] via-[#0A0F1F]/60 to-[#0A0F1F]/20 z-0" />

            <motion.div 
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="relative z-10 w-full max-w-lg px-6"
            >
                <div className="bg-[#111627]/70 backdrop-blur-2xl border border-[#4DA3FF]/20 rounded-[2.5rem] p-10 shadow-[0_20px_60px_rgba(77,163,255,0.08)] flex flex-col items-center group/card transition-all duration-500 hover:border-[#4DA3FF]/40 relative overflow-hidden">
                    
                    <div className="absolute -top-[100px] -right-[100px] w-64 h-64 bg-[#7CC4FF]/10 rounded-full blur-[80px]"></div>
                    
                    <motion.div 
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="w-20 h-20 bg-gradient-to-tr from-[#4DA3FF] to-[#7CC4FF] rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(77,163,255,0.4)] relative z-10"
                    >
                        <UserCircle className="text-[#0A0F1F] w-10 h-10" />
                    </motion.div>
                    
                    <h1 className="text-3xl font-extrabold text-[#FFFFFF] mb-2 text-center tracking-tight">Customer Login</h1>
                    <p className="text-[#A0AEC0] text-sm text-center mb-10 font-medium">Access your secure buyer dashboard.</p>
                    
                    {currentRole === "seller" && (
                        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-sm font-semibold px-4 py-3 rounded-xl mb-6 text-center w-full relative z-10 flex items-center justify-center gap-2">
                            <AlertCircle size={18} />
                            <span>You are currently a Seller. Logout to switch.</span>
                        </div>
                    )}

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
                        <div className="flex flex-col gap-2 relative group text-left w-full">
                            <label className="text-xs font-bold text-[#A0AEC0] ml-1 uppercase tracking-wider">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0]" />
                                <input 
                                    type="email" 
                                    placeholder="name@example.com" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-4 rounded-xl text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all" 
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 relative group text-left w-full">
                            <label className="text-xs font-bold text-[#A0AEC0] ml-1 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0]" />
                                <input 
                                    type="password" 
                                    placeholder="••••••••••••••" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-12 py-4 rounded-xl text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all" 
                                />
                            </div>
                            <div className="flex justify-end p-1">
                                <Link href="/forgot-password" className="text-xs text-[#7CC4FF] hover:text-[#FFFFFF] font-bold transition-all hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>

                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit" 
                            disabled={isLoading}
                            className="mt-4 w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] hover:shadow-[0_0_40px_rgba(77,163,255,0.6)] transition-all flex justify-center items-center gap-2"
                        >
                            {isLoading ? "Signing In..." : "Secure Sign In"}
                            {!isLoading && <ArrowRight className="w-5 h-5" />}
                        </motion.button>

                        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
                            <span className="text-sm text-[#A0AEC0] font-medium">Don't have an account?</span>
                            <Link href="/register/customer" className="text-[#7CC4FF] hover:text-[#FFFFFF] text-sm font-bold transition-colors">
                                Register as Buyer
                            </Link>
                        </div>
                    </form>
                </div>
            </motion.div>
        </main>
    );
}
