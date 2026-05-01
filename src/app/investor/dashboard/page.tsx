"use client";

import { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";
import { getInvestorPortfolio, getMarketAnalytics } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Building2, Landmark, Activity, CheckCircle2 } from "lucide-react";

export default function InvestorDashboard() {
    const [auth, setAuth] = useState<any>(null);
    const [portfolio, setPortfolio] = useState<any>(null);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const authData = getAuth();
        setAuth(authData);
        
        async function fetchData() {
            try {
                const [portData, analData] = await Promise.all([
                    getInvestorPortfolio(),
                    getMarketAnalytics()
                ]);
                setPortfolio(portData);
                setAnalytics(analData);
            } catch (error) {
                console.error("Error fetching investor data:", error);
            } finally {
                setLoading(false);
            }
        }

        if (authData) fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#4DA3FF]/20 border-t-[#4DA3FF] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0F1F] text-white pb-20">
            <Navbar />
            
            <div className="max-w-7xl mx-auto px-6 mt-32">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black mb-2 font-poppins">Investor Portfolio</h1>
                        <p className="text-[#A0AEC0] font-medium">Real-time performance of your asset holdings.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-[#121A2F] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Net Profit</p>
                                <p className="text-xl font-black text-white">+{portfolio?.netProfit || "12.4"}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Portfolio Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#121A2F] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Wallet className="w-24 h-24 text-[#4DA3FF]" />
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Total Value</p>
                        <h2 className="text-4xl font-black text-white mb-4">₹{portfolio?.totalValue?.toLocaleString("en-IN") || "4,25,00,000"}</h2>
                        <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                            <ArrowUpRight className="w-4 h-4" /> +2.4% this month
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-[#121A2F] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Landmark className="w-24 h-24 text-[#FFD700]" />
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Monthly Returns</p>
                        <h2 className="text-4xl font-black text-white mb-4">₹{portfolio?.monthlyReturns?.toLocaleString("en-IN") || "8,40,000"}</h2>
                        <div className="flex items-center gap-2 text-[#FFD700] text-sm font-bold">
                            <Activity className="w-4 h-4" /> Stable Payouts
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-[#121A2F] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Building2 className="w-24 h-24 text-brand-teal" />
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Assets Held</p>
                        <h2 className="text-4xl font-black text-white mb-4">{portfolio?.assetsCount || "14"} Assets</h2>
                        <div className="flex items-center gap-2 text-brand-teal text-sm font-bold">
                            <CheckCircle2 className="w-4 h-4" /> 100% Verified
                        </div>
                    </motion.div>
                </div>

                {/* Market Insights */}
                <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-[#4DA3FF]" /> Market Analytics
                        </h3>
                        <div className="bg-[#121A2F]/50 p-8 rounded-3xl border border-white/5">
                            <p className="text-[#A0AEC0] mb-8 font-medium">Property price trends in your investment areas.</p>
                            <div className="space-y-6">
                                {analytics?.trends?.map((trend: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-[#4DA3FF]" />
                                            <span className="font-bold text-white">{trend.area}</span>
                                        </div>
                                        <span className="text-green-400 font-black">+{trend.growth}%</span>
                                    </div>
                                ))}
                                {/* Mock data if analytics empty */}
                                {!analytics?.trends && ["Whitefield", "Sarjapur", "Electronic City", "Indiranagar"].map((area, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-[#4DA3FF]" />
                                            <span className="font-bold text-white">{area}</span>
                                        </div>
                                        <span className="text-green-400 font-black">+{8 + (i * 2.4)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            <PieChart className="w-6 h-6 text-[#FFD700]" /> Asset Allocation
                        </h3>
                        <div className="bg-[#121A2F]/50 p-8 rounded-3xl border border-white/5">
                             <p className="text-[#A0AEC0] mb-8 font-medium">Distribution by property category.</p>
                             <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "Plots", value: "45%", color: "bg-[#4DA3FF]" },
                                    { label: "Commercial", value: "30%", color: "bg-[#7CC4FF]" },
                                    { label: "Residential", value: "15%", color: "bg-brand-teal" },
                                    { label: "Industrial", value: "10%", color: "bg-purple-500" }
                                ].map((item, i) => (
                                    <div key={i} className="bg-[#0A0F1F] p-4 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-2 h-2 rounded-full ${item.color}`} />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</span>
                                        </div>
                                        <p className="text-lg font-black text-white">{item.value}</p>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
