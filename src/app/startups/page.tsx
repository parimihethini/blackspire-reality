"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StartupCard from "@/components/StartupCard";
import { fetchPublicStartups, type StartupRow } from "@/lib/startupApi";
import { Search } from "lucide-react";

const INDUSTRIES = ["", "FinTech", "HealthTech", "EdTech", "SaaS", "AI/ML", "E-Commerce", "CleanTech"];
const STAGES = ["", "Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Growth"];

export default function StartupsPage() {
    const [items, setItems] = useState<StartupRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [industry, setIndustry] = useState("");
    const [stage, setStage] = useState("");
    const [country, setCountry] = useState("");
    const [sortBy, setSortBy] = useState("created_at");

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q), 350);
        return () => clearTimeout(t);
    }, [q]);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetchPublicStartups({
                q: debouncedQ || undefined,
                industry: industry || undefined,
                stage: stage || undefined,
                country: country || undefined,
                page,
                per_page: 12,
                sort_by: sortBy,
                sort_order: "desc",
            });
            setItems(res.items);
            setTotal(res.total);
            setPages(res.pages);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load startups");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [debouncedQ, industry, stage, country, page, sortBy]);

    useEffect(() => { load(); }, [load]);

    const selectCls = "bg-[#121A2F] border border-white/10 px-4 py-3 rounded-xl text-sm text-white min-w-[140px]";

    return (
        <main className="bg-[#0A0F1F] min-h-screen text-white pt-24">
            <Navbar />
            <div className="max-w-7xl mx-auto px-6 py-12">
                <h1 className="text-4xl font-extrabold mb-2">Startup <span className="text-[#4DA3FF]">Marketplace</span></h1>
                <p className="text-[#A0AEC0] mb-8">Discover innovative startups seeking investment</p>

                <div className="flex flex-col md:flex-row gap-3 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0AEC0]" />
                        <input
                            value={q}
                            onChange={(e) => { setQ(e.target.value); setPage(1); }}
                            placeholder="Search startups, founders, keywords…"
                            className="w-full bg-[#121A2F] border border-white/10 pl-12 pr-4 py-3 rounded-xl text-sm text-white"
                        />
                    </div>
                    <select value={industry} onChange={(e) => { setIndustry(e.target.value); setPage(1); }} className={selectCls}>
                        <option value="">All Industries</option>
                        {INDUSTRIES.filter(Boolean).map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <select value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }} className={selectCls}>
                        <option value="">All Stages</option>
                        {STAGES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} placeholder="Country" className={selectCls} />
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectCls}>
                        <option value="created_at">Newest</option>
                        <option value="views_count">Most Viewed</option>
                        <option value="funding_requirement">Funding Need</option>
                    </select>
                </div>

                {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}

                {loading ? (
                    <p className="text-[#A0AEC0] animate-pulse">Loading startups…</p>
                ) : items.length === 0 ? (
                    <p className="text-[#A0AEC0]">No startups found. Check back soon!</p>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map((s) => <StartupCard key={s.id} startup={s} />)}
                    </div>
                )}

                {pages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-10">
                        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 rounded-xl border border-[#4DA3FF]/30 text-sm disabled:opacity-40">Prev</button>
                        <span className="text-sm text-[#A0AEC0]">Page {page} of {pages} ({total} total)</span>
                        <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-xl border border-[#4DA3FF]/30 text-sm disabled:opacity-40">Next</button>
                    </div>
                )}
            </div>
            <Footer />
        </main>
    );
}
