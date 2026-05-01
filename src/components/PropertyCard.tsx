"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { toggleFavorite, checkIsFavorite, createSiteVisit } from "@/lib/api";
import { MapPin, CheckCircle2, Heart } from "lucide-react";

export default function PropertyCard({ property }: { property: any }) {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(undefined);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [showQuickView, setShowQuickView] = useState(false);

    const propertyId = property.id || property._id || property.property_id;

    if (!propertyId) {
        console.error("[PropertyCard] Missing property ID - skip rendering:", property);
        return null;
    }

    useEffect(() => {
        setAuth(getAuth());
        // Check if property is in favorites
        const checkStatus = async () => {
            if (propertyId) {
                const favStatus = await checkIsFavorite(propertyId);
                setIsFavorite(favStatus);
            }
        };
        checkStatus();
    }, [propertyId]);

    if (auth === undefined) {
        return <div className="animate-pulse bg-[#121A2F] rounded-2xl h-[400px] w-full border border-white/5"></div>;
    }

    const formattedPrice = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(property.price);

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLiking) return;

        try {
            setIsLiking(true);
            // Optimistic update
            const newStatus = !isFavorite;
            setIsFavorite(newStatus);
            
            await toggleFavorite(propertyId, isFavorite);
        } catch (error: any) {
            // Revert on error
            setIsFavorite(isFavorite);
            alert(error.message || "Something went wrong. Please try again.");
        } finally {
            setIsLiking(false);
        }
    };

    const handleContact = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await createSiteVisit(propertyId);
            alert(`Site visit request sent! You can reach the seller at: ${property.seller_phone || "918148688987"}`);
        } catch (error: any) {
            alert(error.message || "Failed to request site visit. Please try again later.");
        }
    };

    const handleMapClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (property.mapUrl) {
            window.open(property.mapUrl, "_blank", "noopener,noreferrer");
        } else if (property.latitude && property.longitude) {
            window.open(`https://www.google.com/maps?q=${property.latitude},${property.longitude}`, "_blank", "noopener,noreferrer");
        } else {
            const city = property.location?.city || property.city || "";
            window.open(`https://www.google.com/maps/search/${encodeURIComponent(property.title + " " + city)}`, "_blank", "noopener,noreferrer");
        }
    };

    const hasMap = true; // Always show map button

    const placeholderImg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%230A0F1F' width='600' height='400'/%3E%3Ctext fill='%234DA3FF' font-family='sans-serif' font-size='20' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ENo Image Available%3C/text%3E%3C/svg%3E`;

    const handleOpenProperty = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!propertyId || propertyId === "undefined") {
            console.error("[PropertyCard] Invalid property ID:", propertyId);
            return;
        }
        router.push(`/property/${propertyId}`);
    };

    return (
        <div
            onClick={() => handleOpenProperty()}
            className="group flex flex-col bg-[#121A2F] rounded-2xl overflow-hidden border border-white/5 shadow-md hover:shadow-[0_10px_40px_rgba(77,163,255,0.1)] hover:border-[#4DA3FF]/30 transition-all duration-500 hover:-translate-y-2 cursor-pointer"
        >
            {/* Image Container */}
            <div className="relative h-60 w-full overflow-hidden bg-[#0A0F1F]">
                <img
                    src={property.images?.[0] || placeholderImg}
                    alt={property.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                    onError={(e) => { (e.target as HTMLImageElement).src = placeholderImg; }}
                />

                {/* Badges */}
                <div className="absolute top-4 left-4 flex items-start pointer-events-none">
                    <span className="bg-[#0A0F1F]/90 backdrop-blur-sm text-[#4DA3FF] px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-[#4DA3FF]/30 capitalize">
                        {property.type}
                    </span>
                    <span className="bg-[#0A0F1F]/90 backdrop-blur-sm text-[#E2C792] px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-[#E2C792]/30 ml-2">
                        {property.approval}
                    </span>
                </div>
                {property.status === "Sold" && (
                    <div className="absolute top-4 right-4 flex items-start pointer-events-none">
                        <span className="bg-red-500/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm border border-red-500/50">
                            SOLD
                        </span>
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div className="p-6 flex flex-col flex-1">
                <div className="text-sm text-gray-400 mb-2 flex flex-col gap-1 font-medium">
                    <p className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#4DA3FF] flex-shrink-0" />
                        {property.location?.area || property.area}{(property.location?.area || property.area) && ", "}{property.location?.city || property.city}
                    </p>
                    {property.location?.landmark && (
                        <p className="flex items-center gap-1.5 text-xs">
                            <span className="text-[#4DA3FF]">🏛</span> Landmark: {property.location?.landmark}
                        </p>
                    )}
                    {hasMap && (
                        <button
                            onClick={handleMapClick}
                            className="flex items-center gap-1.5 text-xs text-[#4DA3FF] hover:underline mt-1 text-left w-fit"
                        >
                            <span>🗺</span> View on Google Maps
                        </button>
                    )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-[#4DA3FF] transition-colors">
                    {property.size} {property.title}
                </h3>

                <p className="text-2xl font-black text-white mb-5 drop-shadow-sm">
                    {formattedPrice}
                </p>

                <div className="mb-6 space-y-2 flex-1">
                    <p className="text-sm text-gray-400 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#4DA3FF] flex-shrink-0 mt-0.5" /> {property.approval}
                    </p>
                    {property.features?.slice(0, 2).map((feature: string, idx: number) => (
                        <p key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#4DA3FF] flex-shrink-0 mt-0.5" /> {feature}
                        </p>
                    ))}
                </div>

                <div className="mt-auto pt-6 border-t border-white/5 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={handleContact}
                        className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] hover:shadow-[0_0_20px_rgba(77,163,255,0.4)] transition-all duration-300 py-2.5 rounded-xl font-bold text-sm shadow-md mb-1"
                    >
                        Contact Seller
                    </button>
                    <div className="flex gap-2 w-full">
                        <button
                            onClick={handleOpenProperty}
                            className="flex-1 bg-transparent text-[#7CC4FF] hover:text-[#0A0F1F] hover:bg-[#7CC4FF] border border-[#4DA3FF]/50 transition-all duration-300 py-2.5 rounded-xl font-bold text-sm shadow-sm"
                        >
                            View Property →
                        </button>
                        <button
                            onClick={handleToggleFavorite}
                            disabled={isLiking}
                            className={`flex items-center justify-center px-4 bg-[#0A0F1F] border transition-all duration-300 rounded-xl shadow-sm hover:scale-110 active:scale-95 ${
                                isFavorite 
                                ? "text-red-500 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                                : "text-gray-400 border-[#4DA3FF]/30 hover:border-red-400/60 hover:text-red-400"
                            }`}
                            title={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
                        >
                            <Heart className={`w-4 h-4 transition-colors duration-300 ${isFavorite ? "fill-red-500" : ""}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick View Modal */}
            {showQuickView && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0F1F]/80 backdrop-blur-md" onClick={() => setShowQuickView(false)}>
                    <div className="bg-[#121A2F] border border-[#4DA3FF]/30 rounded-3xl max-w-lg w-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
                        <div className="relative h-64">
                            <img src={property.images?.[0] || placeholderImg} className="w-full h-full object-cover" />
                            <button onClick={() => setShowQuickView(false)} className="absolute top-4 right-4 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black transition-colors font-bold">×</button>
                        </div>
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{property.title}</h2>
                                    <p className="text-[#4DA3FF] text-sm flex items-center gap-1"><MapPin size={14} /> {property.location?.city || property.city}</p>
                                </div>
                                <p className="text-2xl font-black text-[#7CC4FF]">{formattedPrice}</p>
                            </div>
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                {property.description || "No description available for this property. Please contact the seller for full details."}
                            </p>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-[#0A0F1F] p-4 rounded-2xl border border-white/5">
                                    <p className="text-[10px] text-[#A0AEC0] uppercase font-black mb-1">Type</p>
                                    <p className="text-white font-bold">{property.type}</p>
                                </div>
                                <div className="bg-[#0A0F1F] p-4 rounded-2xl border border-white/5">
                                    <p className="text-[10px] text-[#A0AEC0] uppercase font-black mb-1">Size</p>
                                    <p className="text-white font-bold">{property.size}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handleContact} className="flex-1 bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(77,163,255,0.3)] hover:scale-[1.02] transition-all">
                                    Contact Seller
                                </button>
                                <button onClick={handleToggleFavorite} className="px-6 bg-[#0A0F1F] border border-[#4DA3FF]/30 rounded-2xl text-[#4DA3FF] hover:bg-[#4DA3FF]/10 transition-all flex items-center justify-center">
                                    <Heart className={isFavorite ? "fill-[#4DA3FF]" : ""} size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
