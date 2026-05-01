"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getErrorDetail, authFetch, API_ORIGIN, readJsonSafely } from "@/lib/api";
import { Calendar, Clock, MapPin, CheckCircle, XCircle } from "lucide-react";

export default function SiteVisitsPage() {
    const router = useRouter();
    const [visits, setVisits] = useState<any[]>([]);

    const fetchVisits = async () => {
        const auth = getAuth();
        if (!auth?.loggedIn) {
            router.push("/login/seller");
            return;
        }
        
        try {
            const response = await authFetch(`${API_ORIGIN}/properties/visit/seller`);
            if (!response.ok) throw new Error(await getErrorDetail(response, "Failed to fetch visits"));
            const data = (await readJsonSafely(response)) || [];
            setVisits(data);
        } catch (err) {
            console.error("Error loading visits:", err);
            setVisits([]);
        }
    };

    useEffect(() => {
        fetchVisits();
    }, [router]);

    const handleAction = async (id: number, action: "approve" | "decline") => {
        try {
            const nextStatus = action === "approve" ? "approved" : "declined";
            const response = await authFetch(`${API_ORIGIN}/properties/visit/${id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: nextStatus }),
            });
            if (!response.ok) {
                throw new Error(await getErrorDetail(response, "Failed to update visit status"));
            }
            const updated = await readJsonSafely(response);
            setVisits((prev) =>
                prev.map((v) => (v.id === id ? { ...v, status: updated?.status || nextStatus } : v))
            );
        } catch (err) {
            console.error("Failed to update visit status:", err);
            alert(err instanceof Error ? err.message : "Failed to update visit status.");
            fetchVisits();
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-12 relative z-10 font-inter text-[#FFFFFF]">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="text-[#A0AEC0] hover:text-[#FFFFFF] transition-colors">&larr; Dashboard</button>
                <h1 className="text-3xl font-extrabold text-[#FFFFFF] drop-shadow-md">
                    Site <span className="text-[#4DA3FF] drop-shadow-[0_0_8px_rgba(77,163,255,0.4)]">Visit Requests</span>
                </h1>
            </div>

            {visits.length === 0 ? (
                <div className="bg-[#121A2F]/80 backdrop-blur-xl border border-[#4DA3FF]/10 rounded-3xl p-12 text-center shadow-[0_20px_60px_rgba(77,163,255,0.05)]">
                    <p className="text-xl font-bold text-[#FFFFFF] mb-2">No visit requests yet.</p>
                    <p className="text-[#A0AEC0] font-medium">When buyers request to tour your properties, they will appear here.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {visits.map((visit) => (
                        <div key={visit.id} className="bg-[#121A2F]/80 backdrop-blur-xl border border-[#4DA3FF]/20 p-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:border-[#4DA3FF]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                            
                            {/* Visit Info */}
                            <div className="flex flex-col gap-2">
                                 <h3 className="text-2xl font-extrabold text-white">Property Visit ID: {visit.property_id}</h3>
                                <div className="flex items-center gap-6 mt-2 text-[#A0AEC0] text-sm font-medium">
                                    <span className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-[#4DA3FF]" /> {visit.requested_date}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-[#4DA3FF]" /> {visit.requested_time || "Time not specified"}
                                    </span>
                                </div>
                                <p className="mt-2 text-[#4DA3FF] font-semibold text-sm">Requested by Customer ID: <span className="text-white">{visit.customer_id}</span></p>
                                <p className="text-[#A0AEC0] text-[13px] italic mt-1">"{visit.message || 'No message provided'}"</p>
                            </div>

                            {/* Actions / Status */}
                            <div className="flex flex-col md:items-end gap-4 min-w-[200px]">
                                <div className="flex gap-3">
                                    {visit.status === "pending" ? (
                                        <>
                                            <button onClick={() => handleAction(visit.id, "approve")} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#4DA3FF]/10 hover:bg-[#4DA3FF]/20 text-[#4DA3FF] border border-[#4DA3FF]/30 px-6 py-2.5 rounded-xl font-bold transition-all hover:shadow-[0_0_15px_rgba(77,163,255,0.2)]">
                                                <CheckCircle className="w-4 h-4" /> Approve
                                            </button>
                                            <button onClick={() => handleAction(visit.id, "decline")} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-2.5 rounded-xl font-bold transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                                <XCircle className="w-4 h-4" /> Decline
                                            </button>
                                        </>
                                    ) : visit.status === "approved" ? (
                                        <span className="flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/30 px-6 py-2.5 rounded-xl font-bold">
                                            <CheckCircle className="w-5 h-5" /> Approved
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 px-6 py-2.5 rounded-xl font-bold">
                                            <XCircle className="w-5 h-5" /> Declined
                                        </span>
                                    )}
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
