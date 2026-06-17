"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Clock, StickyNote, Bell, MessageCircle, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import {
    fetchLead, fetchActivity, fetchReminders, addNote, createReminder,
    completeReminder, updateLeadStatus, updateLead,
    type CrmLeadRow, type CrmActivity, type CrmReminder, type CrmLeadStatus,
} from "@/lib/crmApi";

const STATUS_COLORS: Record<string, string> = {
    new_lead:             "bg-blue-500/10 text-blue-400 border-blue-500/20",
    contacted:            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    meeting_scheduled:    "bg-green-500/10 text-green-400 border-green-500/20",
    due_diligence:        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    negotiation:          "bg-orange-500/10 text-orange-400 border-orange-500/20",
    investment_confirmed: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    rejected:             "bg-red-500/10 text-red-400 border-red-500/20",
    archived:             "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const ACTION_ICONS: Record<string, string> = {
    lead_created:    "🌱",
    status_changed:  "🔄",
    note_added:      "📝",
    reminder_set:    "⏰",
    notes_updated:   "✏️",
    value_updated:   "💰",
    assigned:        "👤",
};

export default function LeadDetailPage() {
    const router = useRouter();
    const params = useParams();
    const leadId = Number(params.leadId);

    const [lead, setLead]         = useState<CrmLeadRow | null>(null);
    const [activities, setActs]   = useState<CrmActivity[]>([]);
    const [reminders, setRems]    = useState<CrmReminder[]>([]);
    const [loading, setLoading]   = useState(true);
    const [noteText, setNoteText] = useState("");
    const [addingNote, setAddNote] = useState(false);
    const [remTitle, setRemTitle] = useState("");
    const [remDue, setRemDue]     = useState("");
    const [addingRem, setAddRem]  = useState(false);
    const [tab, setTab]           = useState<"timeline" | "reminders">("timeline");

    useEffect(() => {
        const auth = getAuth();
        if (!auth?.loggedIn) { router.replace("/login"); return; }
        load();
    }, [leadId]);

    const load = async () => {
        setLoading(true);
        try {
            const [l, acts, rems] = await Promise.all([
                fetchLead(leadId),
                fetchActivity(leadId),
                fetchReminders(leadId),
            ]);
            setLead(l);
            setActs(acts);
            setRems(rems);
        } finally { setLoading(false); }
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        setAddNote(true);
        try {
            const act = await addNote(leadId, noteText.trim());
            setActs(prev => [...prev, act]);
            setNoteText("");
        } finally { setAddNote(false); }
    };

    const handleAddReminder = async () => {
        if (!remTitle.trim() || !remDue) return;
        setAddRem(true);
        try {
            const rem = await createReminder(leadId, remTitle.trim(), remDue);
            setRems(prev => [...prev, rem]);
            setRemTitle(""); setRemDue("");
        } finally { setAddRem(false); }
    };

    const handleCompleteReminder = async (remId: number) => {
        const rem = await completeReminder(leadId, remId);
        setRems(prev => prev.map(r => r.id === remId ? rem : r));
    };

    const handleStatusChange = async (newStatus: CrmLeadStatus) => {
        if (!lead) return;
        const updated = await updateLeadStatus(leadId, newStatus);
        setLead(updated);
        const acts = await fetchActivity(leadId);
        setActs(acts);
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center text-[#A0AEC0]">
            <Loader2 size={24} className="animate-spin mr-2" /> Loading lead…
        </div>
    );
    if (!lead) return null;

    const statusCls = STATUS_COLORS[lead.status] || "";

    return (
        <main className="min-h-screen bg-[#0A0F1F] text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[#0A0F1F]/80 backdrop-blur-xl border-b border-[#4DA3FF]/15">
                <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
                    <Link href="/founder/crm" className="p-1.5 text-[#A0AEC0] hover:text-white hover:bg-[#121A2F] rounded-lg transition-all">
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-sm truncate">{lead.startup_name}</p>
                        <p className="text-[10px] text-[#A0AEC0] truncate">{lead.investor_name} · {lead.investor_email}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusCls} capitalize`}>
                        {lead.status.replace(/_/g, " ")}
                    </span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ── Left: Stats + Actions ── */}
                <div className="space-y-4">
                    {/* Investor card */}
                    <div className="bg-[#121A2F] border border-[#4DA3FF]/10 rounded-2xl p-4">
                        <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide mb-2 font-bold">Investor</p>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4DA3FF]/30 to-[#7CC4FF]/20 flex items-center justify-center text-[#7CC4FF] font-bold text-sm border border-[#4DA3FF]/20 mb-2">
                            {(lead.investor_name?.[0] ?? lead.investor_email?.[0] ?? "?").toUpperCase()}
                        </div>
                        <p className="font-bold text-sm text-white">{lead.investor_name || "Unknown"}</p>
                        <p className="text-[#A0AEC0] text-xs">{lead.investor_email}</p>
                        {lead.interest_level && <p className="text-[10px] capitalize mt-1 text-[#4DA3FF]">● {lead.interest_level} interest</p>}
                        {lead.estimated_value && <p className="text-[10px] text-[#A0AEC0] mt-0.5">💰 Est. ${lead.estimated_value.toLocaleString()}</p>}
                        {lead.conversation_id && (
                            <Link href={`/messaging/${lead.conversation_id}`}
                                className="mt-3 flex items-center gap-1.5 text-xs text-[#4DA3FF] hover:text-white transition-colors">
                                <MessageCircle size={12} /> Open conversation
                            </Link>
                        )}
                    </div>

                    {/* Move Status */}
                    <div className="bg-[#121A2F] border border-[#4DA3FF]/10 rounded-2xl p-4">
                        <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide mb-2 font-bold">Move Stage</p>
                        <div className="space-y-1.5">
                            {(["new_lead","contacted","meeting_scheduled","due_diligence","negotiation","investment_confirmed","rejected","archived"] as CrmLeadStatus[]).map(s => (
                                <button key={s} onClick={() => handleStatusChange(s)}
                                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-all capitalize
                                        ${lead.status === s
                                            ? "bg-[#4DA3FF]/20 text-[#7CC4FF] font-bold"
                                            : "text-[#A0AEC0] hover:bg-[#4DA3FF]/10 hover:text-white"
                                        }`}>
                                    {s.replace(/_/g, " ")}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Right: Timeline + Reminders ── */}
                <div className="md:col-span-2 space-y-4">
                    {/* Tab bar */}
                    <div className="flex bg-[#121A2F] rounded-xl p-1 text-xs font-bold">
                        {([["timeline","Timeline"],["reminders","Reminders"]] as const).map(([key, label]) => (
                            <button key={key} onClick={() => setTab(key)}
                                className={`flex-1 py-2 rounded-lg transition-all ${tab === key ? "bg-[#4DA3FF]/20 text-[#7CC4FF]" : "text-[#A0AEC0] hover:text-white"}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {tab === "timeline" ? (
                        <>
                            {/* Add note */}
                            <div className="bg-[#121A2F] border border-[#4DA3FF]/10 rounded-2xl p-4">
                                <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide mb-2 font-bold">Add Note</p>
                                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
                                    placeholder="Write a note about this lead…"
                                    className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#A0AEC0]/50 focus:outline-none focus:border-[#4DA3FF]/40 resize-none transition-colors" />
                                <button onClick={handleAddNote} disabled={!noteText.trim() || addingNote}
                                    className="mt-2 px-4 py-2 bg-[#4DA3FF]/20 text-[#7CC4FF] hover:bg-[#4DA3FF]/30 hover:text-white text-xs font-bold rounded-lg transition-all disabled:opacity-40 flex items-center gap-1.5">
                                    {addingNote ? <Loader2 size={12} className="animate-spin" /> : <StickyNote size={12} />} Add Note
                                </button>
                            </div>
                            {/* Timeline */}
                            <div className="space-y-2">
                                {[...activities].reverse().map(a => (
                                    <div key={a.id} className="flex gap-3 bg-[#121A2F] border border-[#4DA3FF]/5 rounded-xl p-3">
                                        <span className="text-lg flex-shrink-0">{ACTION_ICONS[a.action] ?? "•"}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-white capitalize">{a.action.replace(/_/g, " ")}</p>
                                            {a.from_status && a.to_status && (
                                                <p className="text-[10px] text-[#A0AEC0]">{a.from_status.replace(/_/g," ")} → {a.to_status.replace(/_/g," ")}</p>
                                            )}
                                            {a.note && <p className="text-[10px] text-[#A0AEC0] mt-0.5 line-clamp-3">{a.note}</p>}
                                            <p className="text-[10px] text-[#A0AEC0]/50 mt-1">{new Date(a.created_at).toLocaleString()} · {a.actor_name || "System"}</p>
                                        </div>
                                    </div>
                                ))}
                                {activities.length === 0 && <p className="text-center text-[#A0AEC0] text-xs py-6">No activity yet</p>}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Add reminder */}
                            <div className="bg-[#121A2F] border border-[#4DA3FF]/10 rounded-2xl p-4">
                                <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide mb-2 font-bold">Set Reminder</p>
                                <div className="flex gap-2">
                                    <input type="text" value={remTitle} onChange={e => setRemTitle(e.target.value)} placeholder="Reminder title…"
                                        className="flex-1 bg-[#0A0F1F] border border-[#4DA3FF]/10 rounded-xl px-3 py-2 text-sm text-white placeholder-[#A0AEC0]/50 focus:outline-none focus:border-[#4DA3FF]/40 transition-colors" />
                                    <input type="datetime-local" value={remDue} onChange={e => setRemDue(e.target.value)}
                                        className="bg-[#0A0F1F] border border-[#4DA3FF]/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4DA3FF]/40 transition-colors" />
                                </div>
                                <button onClick={handleAddReminder} disabled={!remTitle.trim() || !remDue || addingRem}
                                    className="mt-2 px-4 py-2 bg-[#4DA3FF]/20 text-[#7CC4FF] hover:bg-[#4DA3FF]/30 hover:text-white text-xs font-bold rounded-lg transition-all disabled:opacity-40 flex items-center gap-1.5">
                                    {addingRem ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />} Add Reminder
                                </button>
                            </div>
                            {/* Reminder list */}
                            <div className="space-y-2">
                                {reminders.map(r => (
                                    <div key={r.id} className={`flex items-center gap-3 bg-[#121A2F] border rounded-xl p-3 ${r.is_done ? "border-[#4DA3FF]/5 opacity-60" : "border-[#4DA3FF]/10"}`}>
                                        <button onClick={() => !r.is_done && handleCompleteReminder(r.id)}
                                            className={`flex-shrink-0 ${r.is_done ? "text-green-400" : "text-[#A0AEC0] hover:text-green-400 transition-colors"}`}>
                                            <CheckCircle2 size={18} />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold ${r.is_done ? "line-through text-[#A0AEC0]" : "text-white"}`}>{r.title}</p>
                                            <p className="text-[10px] text-[#A0AEC0] flex items-center gap-1 mt-0.5">
                                                <Clock size={10} /> {new Date(r.due_at).toLocaleString()}
                                            </p>
                                        </div>
                                        {r.is_done && <span className="text-[10px] text-green-400 font-bold">Done</span>}
                                    </div>
                                ))}
                                {reminders.length === 0 && <p className="text-center text-[#A0AEC0] text-xs py-6">No reminders set</p>}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
