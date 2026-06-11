"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchFounderDashboard, fetchMyStartups, type FounderDashboard, type StartupRow } from "@/lib/startupApi";
import { Eye, Heart, Mail, FileText, TrendingUp, Rocket, Edit3 } from "lucide-react";

export default function FounderDashboardPage() {
    const [stats, setStats] = useState<FounderDashboard | null>(null);
    const [startups, setStartups] = useState<StartupRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setError("");
        setLoading(true);
        try {
            const [dash, mine] = await Promise.all([fetchFounderDashboard(), fetchMyStartups()]);
            setStats(dash);
            setStartups(mine);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const cards = stats ? [
        { label: "Published", value: stats.published_startups, icon: Rocket, color: "text-emerald-400" },
        { label: "Total Views", value: stats.total_views, icon: Eye, color: "text-[#4DA3FF]" },
        { label: "Saves", value: stats.saves_count, icon: Heart, color: "text-pink-400" },
        { label: "Deck Requests", value: stats.deck_requests, icon: FileText, color: "text-amber-400" },
        { label: "Contacts", value: stats.contact_requests, icon: Mail, color: "text-purple-400" },
        { label: "Interest", value: stats.interest_expressions, icon: TrendingUp, color: "text-[#7CC4FF]" },
    ] : [];

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-white">Founder Dashboard</h1>
                <p className="text-[#A0AEC0] text-sm mt-1">Track funding progress and investor interest</p>
            </div>

            {error && <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-400 text-sm">{error}</div>}

            {loading ? (
                <p className="text-[#A0AEC0] animate-pulse">Loading dashboard…</p>
            ) : stats && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                        {cards.map((c) => (
                            <div key={c.label} className="bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-5">
                                <c.icon className={`w-5 h-5 ${c.color} mb-2`} />
                                <p className="text-2xl font-extrabold text-white">{c.value}</p>
                                <p className="text-xs text-[#A0AEC0] uppercase tracking-wider font-bold">{c.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-white mb-4">Funding Progress</h2>
                            <div className="flex justify-between text-sm text-[#A0AEC0] mb-2">
                                <span>Raised: ${stats.funding_raised.toLocaleString()}</span>
                                <span>Goal: ${stats.funding_requirement.toLocaleString()}</span>
                            </div>
                            <div className="h-3 bg-[#0A0F1F] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#4DA3FF] to-[#3B82F6] rounded-full transition-all"
                                    style={{
                                        width: `${stats.funding_requirement > 0 ? Math.min(100, (stats.funding_raised / stats.funding_requirement) * 100) : 0}%`,
                                    }}
                                />
                            </div>
                        </div>
                        <div className="bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-white mb-4">Profile Completion</h2>
                            <p className="text-4xl font-extrabold text-[#4DA3FF] mb-2">{stats.profile_completion}%</p>
                            <p className="text-sm text-[#A0AEC0] mb-4">Complete your profile to submit for review (min 50%)</p>
                            <Link href="/founder/startups/edit" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4DA3FF] text-[#0A0F1F] font-bold text-sm">
                                <Edit3 size={16} /> Edit Startup
                            </Link>
                        </div>
                    </div>

                    <div className="bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Your Startups</h2>
                        {startups.length === 0 ? (
                            <p className="text-[#A0AEC0] text-sm">No startups yet. <Link href="/founder/startups/edit" className="text-[#4DA3FF] font-semibold">Create one</Link></p>
                        ) : (
                            <div className="space-y-3">
                                {startups.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between p-4 rounded-xl bg-[#0A0F1F] border border-white/5">
                                        <div>
                                            <p className="font-bold text-white">{s.name}</p>
                                            <p className="text-xs text-[#A0AEC0] capitalize">{s.status.replace("_", " ")} · {s.profile_completion}% complete</p>
                                        </div>
                                        <Link href={`/founder/startups/edit?id=${s.id}`} className="text-sm text-[#4DA3FF] font-semibold">Edit</Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
