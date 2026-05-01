"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { User, Building2, ArrowRight, ShieldCheck } from "lucide-react";

export default function RoleSelection() {
    return (
        <main className="relative min-h-screen flex items-center justify-center font-inter bg-[#0A0F1F] overflow-hidden text-[#FFFFFF] py-24">
            
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F1F] to-[#111627] z-0" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#4DA3FF]/10 via-[#0A0F1F]/0 to-transparent z-0" />

            <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center">
                
                {/* Header Section */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-center mb-16"
                >
                    <motion.div 
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-20 h-20 mx-auto bg-gradient-to-tr from-[#4DA3FF] to-[#7CC4FF] rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(77,163,255,0.4)]"
                    >
                        <ShieldCheck className="text-[#0A0F1F] w-10 h-10" />
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-[#FFFFFF] mb-4 tracking-tight drop-shadow-md">
                        Create Your Blackspire Account
                    </h1>
                    <p className="text-[#A0AEC0] text-lg font-medium max-w-2xl mx-auto">
                        Choose how you want to use the platform
                    </p>
                </motion.div>

                {/* Cards Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    
                    {/* CUSTOMER CARD */}
                    <motion.div 
                        initial={{ opacity: 0, x: -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                        className="relative group h-full"
                    >
                        <div className="h-full bg-[#111627]/70 backdrop-blur-2xl border border-[#4DA3FF]/20 rounded-[2rem] p-10 shadow-[0_20px_60px_rgba(77,163,255,0.05)] flex flex-col items-center text-center transition-all duration-500 hover:border-[#4DA3FF]/50 hover:shadow-[0_20px_60px_rgba(77,163,255,0.2)] hover:-translate-y-2 relative overflow-hidden">
                            {/* Hover Glow */}
                            <div className="absolute -top-[100px] -right-[100px] w-64 h-64 bg-[#7CC4FF]/0 rounded-full blur-[80px] group-hover:bg-[#7CC4FF]/20 transition-all duration-700"></div>
                            
                            <div className="w-24 h-24 bg-[#0A0F1F] border border-[#4DA3FF]/30 rounded-full flex items-center justify-center mb-8 shadow-inner group-hover:border-[#7CC4FF] transition-colors duration-500 relative z-10">
                                <User className="w-10 h-10 text-[#7CC4FF]" />
                            </div>
                            
                            <h2 className="text-3xl font-bold text-white mb-4 relative z-10">Customer</h2>
                            
                            <ul className="text-[#A0AEC0] space-y-3 mb-10 text-[15px] font-medium flex-grow relative z-10">
                                <li>• Browse plots and houses</li>
                                <li>• Save favorites</li>
                                <li>• Request site visits</li>
                                <li>• Explore investments</li>
                            </ul>
                            
                            <Link 
                                href="/register/customer"
                                className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] group-hover:shadow-[0_0_40px_rgba(77,163,255,0.6)] group-hover:from-[#7CC4FF] group-hover:to-[#4DA3FF] transition-all duration-300 flex justify-center items-center gap-2 relative z-10"
                            >
                                Continue as Customer
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                            </Link>
                        </div>
                    </motion.div>

                    {/* SELLER CARD */}
                    <motion.div 
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
                        className="relative group h-full"
                    >
                        <div className="h-full bg-[#111627]/70 backdrop-blur-2xl border border-[#4DA3FF]/20 rounded-[2rem] p-10 shadow-[0_20px_60px_rgba(77,163,255,0.05)] flex flex-col items-center text-center transition-all duration-500 hover:border-[#4DA3FF]/50 hover:shadow-[0_20px_60px_rgba(77,163,255,0.2)] hover:-translate-y-2 relative overflow-hidden">
                            {/* Hover Glow */}
                            <div className="absolute -bottom-[100px] -left-[100px] w-64 h-64 bg-[#4DA3FF]/0 rounded-full blur-[80px] group-hover:bg-[#4DA3FF]/20 transition-all duration-700"></div>
                            
                            <div className="w-24 h-24 bg-[#0A0F1F] border border-[#4DA3FF]/30 rounded-full flex items-center justify-center mb-8 shadow-inner group-hover:border-[#7CC4FF] transition-colors duration-500 relative z-10">
                                <Building2 className="w-10 h-10 text-[#7CC4FF]" />
                            </div>
                            
                            <h2 className="text-3xl font-bold text-white mb-4 relative z-10">Seller</h2>
                            
                            <ul className="text-[#A0AEC0] space-y-3 mb-10 text-[15px] font-medium flex-grow relative z-10">
                                <li>• List properties for sale</li>
                                <li>• Manage listings</li>
                                <li>• Receive verified leads</li>
                                <li>• Access Seller Dashboard</li>
                            </ul>
                            
                            <Link 
                                href="/register/seller"
                                className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] group-hover:shadow-[0_0_40px_rgba(77,163,255,0.6)] group-hover:from-[#7CC4FF] group-hover:to-[#4DA3FF] transition-all duration-300 flex justify-center items-center gap-2 relative z-10"
                            >
                                Continue as Seller
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                            </Link>
                        </div>
                    </motion.div>

                </div>
            </div>
        </main>
    );
}
