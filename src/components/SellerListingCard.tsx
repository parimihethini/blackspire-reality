"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Edit, Trash2, Users, ExternalLink, Activity } from "lucide-react";
import { authFetch, API_ORIGIN } from "@/lib/api";

export default function SellerListingCard({ property, onDelete }: { property: any, onDelete?: (id: number) => void }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    // Format price
    const formattedPrice = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(property.price);

    const placeholderImg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%230A0F1F' width='600' height='400'/%3E%3Ctext fill='%234DA3FF' font-family='sans-serif' font-size='20' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E`;

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s === "available" || s === "approved") return "bg-green-500/20 text-green-400 border-green-500/30";
        if (s === "sold") return "bg-red-500/20 text-red-400 border-red-500/30";
        if (s === "rejected") return "bg-red-500/20 text-red-500 border-red-500/50";
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"; // Pending
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(property.id);
            return;
        }
        
        if (confirm("Are you sure you want to delete this listing permanently?")) {
            try {
                const saved = localStorage.getItem("seller_properties");
                if (saved) {
                    const props = JSON.parse(saved).filter((p: any) => p.id !== property.id);
                    localStorage.setItem("seller_properties", JSON.stringify(props));
                    window.location.reload();
                }
            } catch (error) {
                alert("Error deleting property");
            }
        }
    };

    const [currentStatus, setCurrentStatus] = useState(property.status);

    const handleToggleStatus = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextStatus = currentStatus === "Available" ? "Sold" : "Available";
        if (!confirm(`Change property status to ${nextStatus}?`)) return;
        try {
            const res = await authFetch(`${API_ORIGIN}/properties/${property.id}`, {
                method: "PUT",
                body: JSON.stringify({ status: nextStatus }),
            });
            if (res.ok) {
                setCurrentStatus(nextStatus);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || "Failed to update status.");
            }
        } catch (_) {
            alert("Network error. Could not update status.");
        }
    };

    return (
        <div className="group flex flex-col bg-[#121A2F] rounded-2xl overflow-hidden border border-[#4DA3FF]/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_40px_rgba(77,163,255,0.15)] hover:border-[#4DA3FF]/40 transition-all duration-500">
            {/* Image & Status Area */}
            <div className="relative h-56 w-full overflow-hidden bg-[#0A0F1F]">
                <img
                    src={property.images?.[0] || placeholderImg}
                    alt={property.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                    onError={(e) => { (e.target as HTMLImageElement).src = placeholderImg; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121A2F] via-transparent to-transparent"></div>
                
                {/* Status Badge */}
                <div className="absolute top-4 left-4 flex items-start pointer-events-none">
                    <span className={`backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold shadow-sm border uppercase tracking-wider ${getStatusColor(currentStatus)}`}>
                        {currentStatus}
                    </span>
                </div>
                
                <div className="absolute top-4 right-4 flex items-start pointer-events-none">
                    <span className="bg-[#0A0F1F]/80 backdrop-blur-md text-[#A0AEC0] border border-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        ID: {property.id}
                    </span>
                </div>
            </div>

            {/* Content Container */}
            <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                    <p className="flex items-center gap-1.5 text-sm text-[#A0AEC0] font-medium">
                        <MapPin className="w-4 h-4 text-[#4DA3FF]" />
                        {property.location?.city || property.city || property.location?.area || ""}
                    </p>
                    <span className="text-xs font-bold text-[#4DA3FF] bg-[#4DA3FF]/10 px-2 py-1 rounded-md capitalize">
                        {property.type}
                    </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 leading-tight truncate">
                    {property.title}
                </h3>

                <p className="text-2xl font-black text-[#7CC4FF] mb-6 drop-shadow-[0_0_5px_rgba(124,196,255,0.3)]">
                    {formattedPrice}
                </p>

                {/* Primary Management Actions */}
                <div className="grid grid-cols-2 gap-3 mb-4 mt-auto">
                    <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/seller/edit-property/${property.id}`); }}
                        className="flex items-center justify-center gap-2 bg-[#4DA3FF]/10 text-[#4DA3FF] hover:bg-[#4DA3FF] hover:text-[#0A0F1F] border border-[#4DA3FF]/30 transition-all duration-300 py-2.5 rounded-xl font-bold text-sm shadow-sm"
                    >
                        <Edit className="w-4 h-4" /> Edit Listing
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 transition-all duration-300 py-2.5 rounded-xl font-bold text-sm shadow-sm disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" /> Delete Listing
                    </button>
                    <button
                        onClick={handleToggleStatus}
                        className="col-span-2 flex items-center justify-center gap-2 bg-transparent text-[#7CC4FF] hover:text-white border border-[#4DA3FF]/20 hover:border-[#4DA3FF]/50 transition-all duration-300 py-2.5 rounded-xl font-bold text-sm shadow-sm"
                    >
                        <Activity className="w-4 h-4" /> {currentStatus === "Available" ? "Mark as Sold" : "Mark as Available"}
                    </button>
                </div>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-white/5"></div>
                </div>

                {/* Secondary Actions */}
                <div className="flex flex-col gap-2 mt-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/seller/leads?property=${property.id}`); }}
                        className="flex items-center justify-between px-4 py-2.5 bg-[#0A0F1F] hover:bg-[#111627] border border-white/5 rounded-xl transition-all group/btn"
                    >
                        <span className="flex items-center gap-2 text-sm font-bold text-white group-hover/btn:text-[#4DA3FF] transition-colors"><Users className="w-4 h-4 text-[#A0AEC0] group-hover/btn:text-[#4DA3FF] transition-colors" /> View Leads</span>
                        <span className="bg-[#4DA3FF] text-[#0A0F1F] text-xs font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(77,163,255,0.4)]">New</span>
                    </button>
                    
                    <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/property/${property.id}?preview=owner`); }}
                        className="flex items-center justify-between px-4 py-2.5 bg-[#0A0F1F] hover:bg-[#111627] border border-white/5 rounded-xl transition-all group/btn"
                    >
                        <span className="flex items-center gap-2 text-sm font-bold text-[#A0AEC0] group-hover/btn:text-white transition-colors"><ExternalLink className="w-4 h-4" /> View Public Listing</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
