"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Search, Trash2, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { fetchConversations, deleteConversation, type ConversationRow } from "@/lib/messagingApi";

export default function MessagingInboxPage() {
    const router = useRouter();
    const [convs, setConvs]   = useState<ConversationRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch]   = useState("");
    const [myId, setMyId]       = useState<number | null>(null);

    useEffect(() => {
        const auth = getAuth();
        if (!auth?.loggedIn) { router.replace("/login"); return; }
        setMyId(auth.id ?? null);
        fetchConversations().then(setConvs).finally(() => setLoading(false));
    }, []);

    const filtered = convs.filter(c => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            c.startup_name?.toLowerCase().includes(q) ||
            c.investor?.name?.toLowerCase().includes(q) ||
            c.founder?.name?.toLowerCase().includes(q) ||
            c.subject?.toLowerCase().includes(q)
        );
    });

    const handleDelete = async (id: number) => {
        await deleteConversation(id);
        setConvs(prev => prev.filter(c => c.id !== id));
    };

    const getOtherParty = (c: ConversationRow) => {
        if (!myId) return null;
        return c.investor?.id === myId ? c.founder : c.investor;
    };

    return (
        <main className="min-h-screen bg-[#0A0F1F] text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[#0A0F1F]/80 backdrop-blur-xl border-b border-[#4DA3FF]/15">
                <div className="max-w-3xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-3 mb-4">
                        <MessageCircle size={20} className="text-[#4DA3FF]" />
                        <h1 className="text-lg font-extrabold tracking-tight">Messages</h1>
                        <span className="text-xs text-[#A0AEC0] bg-[#121A2F] px-2 py-0.5 rounded-full">{convs.length}</span>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]" />
                        <input
                            type="text" placeholder="Search conversations…" value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-[#121A2F] border border-[#4DA3FF]/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#A0AEC0]/60 focus:outline-none focus:border-[#4DA3FF]/40 transition-colors"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-[#A0AEC0]">
                        <Loader2 size={24} className="animate-spin mr-2" /> Loading conversations…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-[#A0AEC0]">
                        <MessageCircle size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-bold text-white">
                            {search ? "No matching conversations" : "No conversations yet"}
                        </p>
                        <p className="text-sm mt-1 text-center max-w-xs">
                            {search ? "Try a different search term." : "Express interest in a startup to start a conversation with its founder."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(c => {
                            const other = getOtherParty(c);
                            return (
                                <div key={c.id} className="group flex items-center gap-3 bg-[#121A2F] hover:bg-[#121A2F]/80 border border-[#4DA3FF]/10 hover:border-[#4DA3FF]/25 rounded-xl p-4 transition-all cursor-pointer">
                                    <Link href={`/messaging/${c.id}`} className="flex-1 flex items-center gap-3 min-w-0">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4DA3FF]/30 to-[#7CC4FF]/20 flex items-center justify-center text-[#7CC4FF] font-bold text-sm flex-shrink-0 border border-[#4DA3FF]/20">
                                            {(other?.name?.[0] ?? other?.email?.[0] ?? "?").toUpperCase()}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-sm text-white truncate">{other?.name || other?.email || "Unknown"}</p>
                                                {c.startup_name && (
                                                    <span className="text-[10px] bg-[#4DA3FF]/10 text-[#7CC4FF] px-2 py-0.5 rounded-full truncate max-w-[120px]">{c.startup_name}</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-[#A0AEC0] truncate mt-0.5">{c.subject || "No subject"}</p>
                                        </div>
                                        {/* Meta */}
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <span className="text-[10px] text-[#A0AEC0]/60">
                                                {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : new Date(c.created_at).toLocaleDateString()}
                                            </span>
                                            <ChevronRight size={14} className="text-[#4DA3FF]/40 group-hover:text-[#4DA3FF] transition-colors" />
                                        </div>
                                    </Link>
                                    {/* Delete */}
                                    <button onClick={() => handleDelete(c.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
