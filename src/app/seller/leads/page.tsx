"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getErrorDetail, authFetch, API_ORIGIN, readJsonSafely } from "@/lib/api";

export default function SellerLeads() {
    const router = useRouter();
    const [leads, setLeads] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth();
        if (!auth?.loggedIn) {
            router.push("/login/seller");
            return;
        }
        
        const fetchLeads = async () => {
            setIsLoading(true);
            try {
                // In this schema, leads come from SiteVisit requests
                const response = await authFetch(`${API_ORIGIN}/properties/visit/seller`);
                if (!response.ok) throw new Error(await getErrorDetail(response, "Failed to fetch leads"));
                const data = (await readJsonSafely(response)) || [];
                
                // Map SiteVisit back to a "Lead" format for the UI
                const mappedLeads = data.map((v: any) => ({
                    id: v.id,
                    customerName: `User #${v.customer_id}`, // In real app, you'd fetch user details
                    customerEmail: "Contact for details",
                    customerPhone: "",
                    propertyId: v.property_id,
                    message: v.message || "I am interested in this property.",
                    date: v.created_at,
                    type: "request"
                }));
                setLeads(mappedLeads);
            } catch (err: any) {
                setError(err.message || "Error loading leads.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeads();
    }, [router]);

    return (
        <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.back()} className="text-[#A0AEC0] hover:text-[#FFFFFF] transition-colors">&larr; Dashboard</button>
                    <h1 className="text-3xl font-extrabold text-[#FFFFFF] drop-shadow-md">Buyer <span className="text-[#4DA3FF] drop-shadow-[0_0_8px_rgba(77,163,255,0.4)]">Leads</span></h1>
                </div>

                {error ? (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 font-semibold px-6 py-4 rounded-xl mb-6 text-center">
                        {error}
                    </div>
                ) : isLoading ? (
                    <div className="text-center py-20 text-[#A0AEC0] animate-pulse font-medium">Loading leads...</div>
                ) : leads.length === 0 ? (
                    <div className="bg-[#121A2F]/80 backdrop-blur-xl border border-[#4DA3FF]/10 rounded-3xl p-12 text-center shadow-[0_20px_60px_rgba(77,163,255,0.05)]">
                        <p className="text-xl font-bold text-[#FFFFFF] mb-2">No leads yet.</p>
                        <p className="text-[#A0AEC0] font-medium">Buyer inquiries and site visit requests will appear here.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {leads.map((lead, i) => (
                            <div key={i} className="bg-[#121A2F]/80 backdrop-blur-xl border border-[#4DA3FF]/20 p-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:border-[#4DA3FF]/40 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-extrabold text-[#FFFFFF]">{lead.customerName}</h3>
                                        <p className="text-[#4DA3FF] text-sm font-semibold mt-1">Lead for Property ID: {lead.propertyId}</p>
                                    </div>
                                    <span className="text-[#A0AEC0] font-medium text-xs bg-[#0A0F1F]/60 px-3 py-1.5 rounded-full border border-white/5">
                                        {(() => {
                                            const d = new Date(lead.date);
                                            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                            return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
                                        })()}
                                    </span>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4 text-sm text-[#A0AEC0]">
                                    <div><span className="text-[#A0AEC0]/70 font-bold uppercase tracking-wider text-[10px] block mb-1">Email</span> <span className="text-white font-medium">{lead.customerEmail}</span></div>
                                    <div><span className="text-[#A0AEC0]/70 font-bold uppercase tracking-wider text-[10px] block mb-1">Phone</span> <span className="text-white font-medium">{lead.customerPhone || 'Not provided'}</span></div>
                                    <div className="md:col-span-2 mt-2">
                                        <span className="text-[#A0AEC0]/70 font-bold uppercase tracking-wider text-[10px] block mb-1">Message</span>
                                        <p className="bg-[#0A0F1F]/60 p-4 rounded-xl border border-white/5 mt-1 text-white font-medium leading-relaxed">{lead.message}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
    );
}
