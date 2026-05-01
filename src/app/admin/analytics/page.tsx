"use client";

import { useEffect, useState } from "react";
import { fetchAdminStats, type AdminStats } from "@/lib/adminApi";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";

export default function AdminAnalyticsPage() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const s = await fetchAdminStats();
                if (!c) setStats(s);
            } catch (e) {
                if (!c) setError(e instanceof Error ? e.message : "Failed to load analytics");
            } finally {
                if (!c) setLoading(false);
            }
        })();
        return () => {
            c = true;
        };
    }, []);

    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

    return (
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-extrabold text-white mb-2">Analytics</h1>
                <p className="text-[#A0AEC0] text-sm mb-8">Snapshot of platform scale and moderation backlog</p>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-400 text-sm font-semibold">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-[#4DA3FF] animate-pulse font-semibold py-16 text-center">Loading metrics…</div>
                ) : stats ? (
                    <div className="grid gap-6">
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-6 flex gap-4">
                                <BarChart3 className="w-10 h-10 text-[#4DA3FF]" />
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-[#A0AEC0] font-bold">User mix</p>
                                    <p className="text-white font-extrabold text-2xl mt-1">{stats.total_users}</p>
                                    <p className="text-[#A0AEC0] text-xs mt-2">
                                        {pct(stats.customers, stats.total_users)}% customers ·{" "}
                                        {pct(stats.sellers, stats.total_users)}% sellers
                                    </p>
                                </div>
                            </div>
                            <div className="bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-6 flex gap-4">
                                <PieChart className="w-10 h-10 text-[#7CC4FF]" />
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-[#A0AEC0] font-bold">Listings</p>
                                    <p className="text-white font-extrabold text-2xl mt-1">{stats.total_properties}</p>
                                    <p className="text-[#A0AEC0] text-xs mt-2">
                                        {pct(stats.published_properties, stats.total_properties)}% published live
                                    </p>
                                </div>
                            </div>
                            <div className="bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-6 flex gap-4">
                                <TrendingUp className="w-10 h-10 text-emerald-400" />
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-[#A0AEC0] font-bold">Moderation</p>
                                    <p className="text-white font-extrabold text-2xl mt-1">{stats.pending_listings}</p>
                                    <p className="text-[#A0AEC0] text-xs mt-2">Pending verification / unpublished</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[#121A2F]/60 border border-[#4DA3FF]/15 rounded-2xl p-6 text-sm text-[#A0AEC0]">
                            Admins on record: <span className="text-white font-bold">{stats.admins}</span>. Connect BI or
                            export APIs later for time-series charts.
                        </div>
                    </div>
                ) : null}
            </div>
    );
}
