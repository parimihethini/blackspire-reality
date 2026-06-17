"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, Loader2, RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { authFetch, readApiError } from "@/lib/httpClient";

interface AdminConversation {
    id: number;
    startup_id: number | null;
    startup_name: string | null;
    investor: { id: number; name: string | null; email: string };
    founder: { id: number; name: string | null; email: string };
    subject: string | null;
    last_message_at: string | null;
    created_at: string;
}

export default function AdminConversationsPage() {
    const router = useRouter();
    const [items, setItems]   = useState<AdminConversation[]>([]);
    const [total, setTotal]   = useState(0);
    const [loading, setLoad]  = useState(true);
    const [search, setSearch] = useState("");
    const [skip, setSkip]     = useState(0);
    const LIMIT = 50;

    useEffect(() => {
        const auth = getAuth();
        if (!auth?.loggedIn || !["admin","super_admin","team_member"].includes(auth.role)) {
            router.replace("/admin");
            return;
        }
        load(0);
    }, []);

    const load = async (s: number) => {
        setLoad(true);
        try {
            const res = await authFetch(`/admin/conversations?skip=${s}&limit=${LIMIT}`);
            const data = await res.json();
            setItems(data.items || []);
            setTotal(data.total || 0);
            setSkip(s);
        } finally { setLoad(false); }
    };

    const filtered = items.filter(c => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            c.startup_name?.toLowerCase().includes(q) ||
            c.investor.name?.toLowerCase().includes(q) ||
            c.investor.email.toLowerCase().includes(q) ||
            c.founder.name?.toLowerCase().includes(q) ||
            c.founder.email.toLowerCase().includes(q) ||
            c.subject?.toLowerCase().includes(q)
        );
    });

    return (
        <main className="min-h-screen bg-[#0A0F1F] text-white">
            <div className="sticky top-0 z-40 bg-[#0A0F1F]/80 backdrop-blur-xl border-b border-[#4DA3FF]/15">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <MessageSquare size={20} className="text-[#4DA3FF]" />
                            <h1 className="text-lg font-extrabold">All Conversations</h1>
                            <span className="text-xs text-[#A0AEC0] bg-[#121A2F] px-2 py-0.5 rounded-full">{total}</span>
                        </div>
                        <button onClick={() => load(skip)} className="p-2 text-[#A0AEC0] hover:text-white hover:bg-[#121A2F] rounded-lg transition-all">
                            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]" />
                        <input type="text" placeholder="Search by startup, investor, or founder…" value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full bg-[#121A2F] border border-[#4DA3FF]/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#A0AEC0]/60 focus:outline-none focus:border-[#4DA3FF]/40 transition-colors" />
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-[#A0AEC0]"><Loader2 size={20} className="animate-spin mr-2" /> Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#A0AEC0]">
                        <MessageSquare size={36} className="mb-3 opacity-20" />
                        <p className="font-bold text-white">No conversations found</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {filtered.map(c => (
                                <Link key={c.id} href={`/messaging/${c.id}`}
                                    className="flex items-center gap-4 bg-[#121A2F] hover:bg-[#121A2F]/70 border border-[#4DA3FF]/10 hover:border-[#4DA3FF]/25 rounded-xl p-4 transition-all group">
                                    <div className="flex-1 min-w-0 grid grid-cols-3 gap-4">
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide font-bold mb-0.5">Startup</p>
                                            <p className="text-sm font-semibold text-white truncate">{c.startup_name || "—"}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide font-bold mb-0.5">Investor</p>
                                            <p className="text-sm truncate text-[#7CC4FF]">{c.investor.name || c.investor.email}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide font-bold mb-0.5">Founder</p>
                                            <p className="text-sm truncate text-[#A0AEC0]">{c.founder.name || c.founder.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <span className="text-[10px] text-[#A0AEC0]/60">
                                            {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : new Date(c.created_at).toLocaleDateString()}
                                        </span>
                                        <ChevronRight size={14} className="text-[#4DA3FF]/30 group-hover:text-[#4DA3FF] transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {/* Pagination */}
                        <div className="flex justify-center gap-3 mt-6">
                            <button disabled={skip === 0} onClick={() => load(Math.max(0, skip - LIMIT))}
                                className="px-4 py-2 text-xs font-bold text-[#A0AEC0] hover:text-white bg-[#121A2F] rounded-lg transition-all disabled:opacity-30">← Prev</button>
                            <span className="px-4 py-2 text-xs text-[#A0AEC0]">{skip + 1}–{Math.min(skip + LIMIT, total)} of {total}</span>
                            <button disabled={skip + LIMIT >= total} onClick={() => load(skip + LIMIT)}
                                className="px-4 py-2 text-xs font-bold text-[#A0AEC0] hover:text-white bg-[#121A2F] rounded-lg transition-all disabled:opacity-30">Next →</button>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
