"use client";

import { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";
import { fetchAdminStats, type AdminStats } from "@/lib/adminApi";
import Link from "next/link";
import { Users, Home, BarChart3, ShieldAlert, ArrowRight } from "lucide-react";

export default function AdminDashboard() {
    const [email, setEmail] = useState("");
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const auth = getAuth();
        if (auth) setEmail(auth.email || "");
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const s = await fetchAdminStats();
                if (!cancelled) setStats(s);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load stats");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
            <div className="max-w-7xl mx-auto relative z-10">
                <h1 className="text-4xl font-extrabold text-[#FFFFFF] mb-2 drop-shadow-md">
                    Platform <span className="text-[#4DA3FF] drop-shadow-[0_0_8px_rgba(77,163,255,0.4)]">Control</span>
                </h1>
                <p className="text-[#A0AEC0] font-medium mb-10">
                    Signed in as <span className="text-[#FFFFFF]">{email || "admin"}</span>
                </p>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-400 text-sm font-semibold">
                        {error}
                    </div>
                )}

                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
                    {[
                        { label: "Total users", value: stats?.total_users, icon: Users, sub: stats ? `${stats.customers} customers · ${stats.sellers} sellers` : "—" },
                        { label: "Listings", value: stats?.total_properties, icon: Home, sub: stats ? `${stats.published_properties} published` : "—" },
                        { label: "Admins", value: stats?.admins, icon: ShieldAlert, sub: "Platform operators" },
                        { label: "Pending review", value: stats?.pending_listings, icon: BarChart3, sub: "Unpublished or unverified" },
                    ].map((card) => (
                        <div
                            key={card.label}
                            className="bg-[#121A2F]/80 backdrop-blur-xl border border-[#4DA3FF]/20 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:border-[#4DA3FF]/40 transition-all"
                        >
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-[#4DA3FF]/10 rounded-xl">
                                    <card.icon className="w-7 h-7 text-[#4DA3FF]" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0]">{card.label}</p>
                            </div>
                            <p className="text-3xl font-extrabold text-white">
                                {loading ? "…" : card.value ?? "—"}
                            </p>
                            <p className="text-[#A0AEC0] text-xs font-medium mt-2">{card.sub}</p>
                        </div>
                    ))}
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <Link
                        href="/admin/users"
                        className="group bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-6 flex items-center justify-between hover:border-[#4DA3FF]/50 transition-all"
                    >
                        <span className="font-bold text-white">Manage users</span>
                        <ArrowRight className="w-5 h-5 text-[#4DA3FF] group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                        href="/admin/properties"
                        className="group bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-6 flex items-center justify-between hover:border-[#4DA3FF]/50 transition-all"
                    >
                        <span className="font-bold text-white">Moderate listings</span>
                        <ArrowRight className="w-5 h-5 text-[#4DA3FF] group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                        href="/admin/analytics"
                        className="group bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-6 flex items-center justify-between hover:border-[#4DA3FF]/50 transition-all"
                    >
                        <span className="font-bold text-white">Analytics</span>
                        <ArrowRight className="w-5 h-5 text-[#4DA3FF] group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
    );
}
