"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import {
    fetchKanban, updateLeadStatus,
    type KanbanBoard, type CrmLeadRow, type CrmLeadStatus,
} from "@/lib/crmApi";

const COLUMNS: { key: CrmLeadStatus; label: string; color: string; accent: string }[] = [
    { key: "new_lead",             label: "New Lead",            color: "bg-[#1a2a3a]", accent: "border-[#4DA3FF]"   },
    { key: "contacted",            label: "Contacted",           color: "bg-[#1a2e28]", accent: "border-[#3ecf8e]"   },
    { key: "meeting_scheduled",    label: "Meeting Scheduled",   color: "bg-[#1e2a1a]", accent: "border-[#48bb78]"   },
    { key: "due_diligence",        label: "Due Diligence",       color: "bg-[#2a2a1a]", accent: "border-[#f6ad55]"   },
    { key: "negotiation",          label: "Negotiation",         color: "bg-[#2a1e1a]", accent: "border-[#fc8181]"   },
    { key: "investment_confirmed", label: "✅ Investment",        color: "bg-[#1a2a1a]", accent: "border-[#68d391]"   },
    { key: "rejected",             label: "Rejected",            color: "bg-[#2a1a1a]", accent: "border-[#e53e3e]"   },
    { key: "archived",             label: "Archived",            color: "bg-[#1a1a2a]", accent: "border-[#718096]"   },
];

const INTEREST_COLORS: Record<string, string> = {
    high:   "text-green-400",
    medium: "text-yellow-400",
    low:    "text-red-400",
};

export default function CrmKanbanPage() {
    const router = useRouter();
    const [board, setBoard]     = useState<KanbanBoard | null>(null);
    const [loading, setLoading] = useState(true);
    const [moving, setMoving]   = useState<number | null>(null);

    useEffect(() => {
        const auth = getAuth();
        if (!auth?.loggedIn || (auth.role !== "startup_founder" && auth.role !== "seller" && auth.role !== "admin" && auth.role !== "super_admin")) {
            router.replace("/login");
            return;
        }
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        try { setBoard(await fetchKanban()); }
        finally { setLoading(false); }
    };

    const handleStatusChange = async (lead: CrmLeadRow, newStatus: CrmLeadStatus) => {
        if (lead.status === newStatus || moving) return;
        setMoving(lead.id);
        try {
            const updated = await updateLeadStatus(lead.id, newStatus);
            setBoard(prev => {
                if (!prev) return prev;
                const next = { ...prev };
                // Remove from old column
                next[lead.status as CrmLeadStatus] = (next[lead.status as CrmLeadStatus] || []).filter(l => l.id !== lead.id);
                // Add to new column
                next[newStatus] = [updated, ...(next[newStatus] || [])];
                return next;
            });
        } catch (err: any) {
            alert(err.message);
        } finally {
            setMoving(null);
        }
    };

    const totalLeads = board ? Object.values(board).flat().length : 0;

    return (
        <main className="min-h-screen bg-[#0A0F1F] text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[#0A0F1F]/80 backdrop-blur-xl border-b border-[#4DA3FF]/15">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <LayoutGrid size={20} className="text-[#4DA3FF]" />
                        <h1 className="text-lg font-extrabold">CRM Pipeline</h1>
                        <span className="text-xs text-[#A0AEC0] bg-[#121A2F] px-2 py-0.5 rounded-full">{totalLeads} leads</span>
                    </div>
                    <button onClick={load} className="p-2 text-[#A0AEC0] hover:text-white hover:bg-[#121A2F] rounded-lg transition-all">
                        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32 text-[#A0AEC0]">
                    <Loader2 size={24} className="animate-spin mr-2" /> Loading pipeline…
                </div>
            ) : !board ? null : (
                <div className="overflow-x-auto pb-6">
                    <div className="flex gap-4 px-6 pt-6 min-w-max">
                        {COLUMNS.map(col => {
                            const leads = board[col.key] || [];
                            return (
                                <div key={col.key} className={`w-64 flex-shrink-0 rounded-2xl border-t-4 ${col.accent} ${col.color} flex flex-col overflow-hidden shadow-lg`}>
                                    {/* Column header */}
                                    <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
                                        <span className="text-xs font-bold text-white uppercase tracking-wide truncate">{col.label}</span>
                                        <span className="text-xs font-bold text-[#A0AEC0] bg-black/20 px-1.5 py-0.5 rounded-full">{leads.length}</span>
                                    </div>
                                    {/* Cards */}
                                    <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[65vh]">
                                        {leads.length === 0 ? (
                                            <p className="text-center text-[#A0AEC0]/40 text-xs py-6">Empty</p>
                                        ) : leads.map(lead => (
                                            <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} moving={moving === lead.id} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </main>
    );
}

function LeadCard({ lead, onStatusChange, moving }: { lead: CrmLeadRow; onStatusChange: (l: CrmLeadRow, s: CrmLeadStatus) => void; moving: boolean }) {
    const NEXT_STATUSES: Partial<Record<CrmLeadStatus, CrmLeadStatus>> = {
        new_lead:          "contacted",
        contacted:         "meeting_scheduled",
        meeting_scheduled: "due_diligence",
        due_diligence:     "negotiation",
        negotiation:       "investment_confirmed",
    };
    const next = NEXT_STATUSES[lead.status as CrmLeadStatus];

    return (
        <div className={`bg-[#0A0F1F]/60 border border-white/5 rounded-xl p-3 transition-all hover:border-[#4DA3FF]/20 ${moving ? "opacity-60 animate-pulse" : ""}`}>
            {/* Startup name */}
            <Link href={`/founder/crm/${lead.id}`} className="block">
                <p className="text-xs font-bold text-[#7CC4FF] truncate mb-1 hover:text-white transition-colors">{lead.startup_name || "Unknown Startup"}</p>
                <p className="text-xs text-white font-semibold truncate">{lead.investor_name || lead.investor_email}</p>
                {lead.interest_level && (
                    <p className={`text-[10px] font-bold capitalize mt-0.5 ${INTEREST_COLORS[lead.interest_level] || "text-[#A0AEC0]"}`}>
                        ● {lead.interest_level} interest
                    </p>
                )}
                {lead.estimated_value && (
                    <p className="text-[10px] text-[#A0AEC0] mt-1">💰 ${lead.estimated_value.toLocaleString()}</p>
                )}
                <p className="text-[10px] text-[#A0AEC0]/60 mt-1">{new Date(lead.created_at).toLocaleDateString()}</p>
            </Link>
            {/* Quick advance */}
            {next && !moving && (
                <button onClick={() => onStatusChange(lead, next)}
                    className="mt-2 w-full text-[10px] font-bold text-[#4DA3FF] hover:text-white bg-[#4DA3FF]/10 hover:bg-[#4DA3FF]/20 rounded-lg py-1.5 transition-all">
                    Move → {next.replace(/_/g, " ")}
                </button>
            )}
        </div>
    );
}
