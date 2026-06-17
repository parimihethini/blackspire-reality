"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { authFetch } from "@/lib/httpClient";

interface PipelineMetrics {
    total_leads: number;
    by_status: Record<string, number>;
    conversion_rate_pct: number;
    total_conversations?: number;
    total_messages?: number;
    avg_response_hours?: number;
}

const STATUS_LABELS: Record<string, string> = {
    new_lead:             "New Lead",
    contacted:            "Contacted",
    meeting_scheduled:    "Meeting Scheduled",
    due_diligence:        "Due Diligence",
    negotiation:          "Negotiation",
    investment_confirmed: "Investment Confirmed",
    rejected:             "Rejected",
    archived:             "Archived",
};

const STATUS_COLORS: Record<string, string> = {
    new_lead:             "bg-blue-500",
    contacted:            "bg-emerald-500",
    meeting_scheduled:    "bg-green-500",
    due_diligence:        "bg-yellow-500",
    negotiation:          "bg-orange-500",
    investment_confirmed: "bg-teal-500",
    rejected:             "bg-red-500",
    archived:             "bg-gray-500",
};

export default function AdminCrmPage() {
    const router = useRouter();
    const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth();
        if (!auth?.loggedIn || !["admin","super_admin","team_member"].includes(auth.role)) {
            router.replace("/admin");
            return;
        }
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [metricsRes, pipelineRes] = await Promise.all([
                authFetch("/admin/crm/metrics"),
                authFetch("/analytics/pipeline"),
            ]);
            const m = await metricsRes.json();
            const p = await pipelineRes.json();
            setMetrics({ ...m, ...p });
        } finally { setLoading(false); }
    };

    const max = metrics ? Math.max(...Object.values(metrics.by_status || {}), 1) : 1;

    return (
        <main className="min-h-screen bg-[#0A0F1F] text-white">
            <div className="sticky top-0 z-40 bg-[#0A0F1F]/80 backdrop-blur-xl border-b border-[#4DA3FF]/15">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <TrendingUp size={20} className="text-[#4DA3FF]" />
                        <h1 className="text-lg font-extrabold">CRM Pipeline Metrics</h1>
                    </div>
                    <button onClick={load} className="p-2 text-[#A0AEC0] hover:text-white hover:bg-[#121A2F] rounded-lg transition-all">
                        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex items-center justify-center py-32 text-[#A0AEC0]">
                        <Loader2 size={24} className="animate-spin mr-2" /> Loading metrics…
                    </div>
                ) : metrics ? (
                    <div className="space-y-6">
                        {/* KPI cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: "Total Leads", value: metrics.total_leads, suffix: "" },
                                { label: "Conversion Rate", value: metrics.conversion_rate_pct, suffix: "%" },
                                { label: "Conversations", value: metrics.total_conversations ?? "—", suffix: "" },
                                { label: "Avg Response", value: metrics.avg_response_hours !== undefined ? metrics.avg_response_hours : "—", suffix: "h" },
                            ].map(kpi => (
                                <div key={kpi.label} className="bg-[#121A2F] border border-[#4DA3FF]/10 rounded-2xl p-5 text-center">
                                    <p className="text-2xl font-extrabold text-white">{kpi.value}{kpi.suffix}</p>
                                    <p className="text-xs text-[#A0AEC0] mt-1 font-semibold">{kpi.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Funnel chart */}
                        <div className="bg-[#121A2F] border border-[#4DA3FF]/10 rounded-2xl p-6">
                            <h2 className="text-sm font-extrabold mb-4 text-white">Pipeline Funnel</h2>
                            <div className="space-y-3">
                                {Object.entries(STATUS_LABELS).map(([key, label]) => {
                                    const count = metrics.by_status?.[key] || 0;
                                    const pct = max > 0 ? Math.round((count / max) * 100) : 0;
                                    return (
                                        <div key={key} className="flex items-center gap-3">
                                            <span className="text-xs text-[#A0AEC0] w-36 flex-shrink-0 truncate">{label}</span>
                                            <div className="flex-1 bg-[#0A0F1F] rounded-full h-5 overflow-hidden relative">
                                                <div className={`h-full rounded-full transition-all duration-700 ${STATUS_COLORS[key] || "bg-[#4DA3FF]"}`}
                                                    style={{ width: `${pct}%`, opacity: 0.8 }} />
                                            </div>
                                            <span className="text-xs font-bold text-white w-8 text-right">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Messages stat */}
                        {metrics.total_messages !== undefined && (
                            <div className="bg-[#121A2F] border border-[#4DA3FF]/10 rounded-2xl p-5">
                                <p className="text-sm font-extrabold mb-1">Total Messages Exchanged</p>
                                <p className="text-3xl font-extrabold text-[#4DA3FF]">{metrics.total_messages}</p>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </main>
    );
}
