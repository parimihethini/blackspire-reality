"use client";

import { useState, useEffect } from "react";
import { getAuth } from "@/lib/auth";
import { Star, MessageSquare, Send, UserCircle2, ShieldCheck, Trash2, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReviewForm from "./ReviewForm";
import { getPropertyReviews } from "@/lib/api";

interface Review {
    id: number;
    user_id: number;
    user_name: string;
    user_role: string;
    property_id?: number;
    title?: string;
    message: string;
    rating: number;
    is_verified: boolean;
    created_at: string;
}

export default function Reviews({ propertyId }: { propertyId: number }) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [auth, setAuth] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setAuth(getAuth());
        fetchReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [propertyId]);

    const fetchReviews = async () => {
        setIsLoading(true);
        try {
            const data = await getPropertyReviews(propertyId);
            const mapped = data.map((r: any) => ({
                ...r,
                message: r.comment, // Map backend 'comment' to frontend 'message'
                is_verified: true,
                user_role: "customer"
            }));
            setReviews(mapped);
        } catch (_) {
            setReviews([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteReview = (id: number) => {
        if (!confirm("Are you sure you want to delete this review?")) return;
        const updated = reviews.filter(r => r.id !== id);
        setReviews(updated);
        localStorage.setItem(`reviews_${propertyId}`, JSON.stringify(updated));
    };

    const averageRating = reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : "0.0";

    return (
        <div className="mt-20 w-full space-y-16">
            <div className="max-w-4xl mx-auto text-center border-b border-white/5 pb-10">
                <h2 className="text-4xl font-black text-white mb-4 font-poppins flex items-center justify-center gap-4">
                    <MessageSquare className="w-10 h-10 text-brand-teal" /> Customer Feedback
                </h2>
                <div className="flex items-center justify-center gap-6">
                    <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-6 h-6 ${star <= Math.round(Number(averageRating)) ? "fill-[#FFD700] text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]" : "text-white/10"}`}
                            />
                        ))}
                    </div>
                    <p className="text-2xl font-black text-white tracking-widest">{averageRating} <span className="text-[#A0AEC0] text-sm font-bold uppercase tracking-widest ml-1">/ 5.0 Rating</span></p>
                    <p className="text-[#A0AEC0] font-bold text-sm border-l border-white/10 pl-6 uppercase tracking-wider">{reviews.length} Verified Reviews</p>
                </div>
            </div>

            {/* FORM AREA */}
            <div className="max-w-4xl mx-auto">
                <ReviewForm propertyId={propertyId} onSuccess={fetchReviews} />
            </div>

            {/* LIST AREA */}
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                {isLoading ? (
                    <div className="col-span-full py-20 text-center animate-pulse">
                        <p className="text-[#A0AEC0] font-black uppercase tracking-[4px]">Fetching Reviews...</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-[#121A2F]/40 border border-dashed border-white/10 rounded-[3rem]">
                        <p className="text-[#A0AEC0] text-lg font-medium">No reviews for this property yet. Be the first to share your experience!</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {reviews.map((review, idx) => (
                            <motion.div
                                key={review.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-[#121A2F]/60 backdrop-blur-md p-8 rounded-[2rem] border border-white/5 hover:border-[#4DA3FF]/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all group relative h-fit"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0A0F1F] to-[#1E293B] border border-[#4DA3FF]/30 flex items-center justify-center font-black text-white text-lg shadow-inner group-hover:scale-110 transition-transform">
                                            {review.user_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white flex items-center gap-2">
                                                {review.user_name}
                                                {review.is_verified && <ShieldCheck className="w-4 h-4 text-brand-teal" />}
                                            </h4>
                                            <p className="text-[10px] sm:text-xs font-bold text-[#A0AEC0] uppercase tracking-wider">
                                                {(() => {
                                                    const d = new Date(review.created_at);
                                                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                                    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex gap-1 bg-[#0A0F1F]/60 px-2 py-1 rounded-lg">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-3.5 h-3.5 ${star <= review.rating ? "fill-[#FFD700] text-[#FFD700]" : "text-white/10"}`}
                                                />
                                            ))}
                                        </div>
                                        {((auth?.user?.id === review.user_id) || auth?.role === 'admin') && (
                                            <button
                                                onClick={() => handleDeleteReview(review.id)}
                                                className="text-red-400/50 hover:text-red-400 transition-colors p-1"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {review.title && <h5 className="text-lg font-black text-[#4DA3FF] leading-tight">{review.title}</h5>}
                                    <p className="text-[#A0AEC0] leading-relaxed text-[15px] font-medium">{review.message}</p>
                                </div>
                                {review.is_verified && (
                                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-teal flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3" /> Verified Buyer
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A0AEC0]">Direct Feedback</span>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
