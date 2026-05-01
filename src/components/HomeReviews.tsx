"use client";

import { useState, useEffect } from "react";
import { Star, ShieldCheck, Quote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getReviews } from "@/lib/api";

interface Review {
    id: number;
    user_name: string;
    title?: string;
    message: string;
    rating: number;
    is_verified: boolean;
    created_at: string;
}

export default function HomeReviews() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAllReviews = async () => {
            try {
                const data = await getReviews();
                const mapped = data.map((r: any) => ({
                    ...r,
                    message: r.comment,
                    is_verified: true
                }));
                setReviews(mapped);
            } catch (e) {
                console.error("Failed to load reviews:", e);
                setReviews([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllReviews();
    }, []);

    return (
        <div className="w-full">
            {isLoading ? (
                <div className="py-20 text-center animate-pulse">
                     <p className="text-[#A0AEC0] font-black uppercase tracking-[4px]">Loading Feedback...</p>
                </div>
            ) : reviews.length === 0 ? (
                <div className="bg-[#121A2F]/40 border border-dashed border-white/10 rounded-[2.5rem] p-12 text-center">
                    <p className="text-gray-400 font-medium">No verified reviews yet. Our team is working with recent buyers to gather their feedback.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                    <AnimatePresence>
                        {reviews.slice(0, 6).map((review, idx) => (
                            <motion.div
                                key={review.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-[#121A2F]/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 hover:border-[#4DA3FF]/30 transition-all group relative h-full flex flex-col"
                            >
                                <Quote className="absolute top-6 right-8 w-12 h-12 text-[#4DA3FF]/10 group-hover:text-[#4DA3FF]/20 transition-colors" />
                                
                                <div className="flex gap-1 mb-6">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star 
                                            key={star} 
                                            className={`w-4 h-4 ${star <= review.rating ? "fill-[#FFD700] text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]" : "text-white/10"}`} 
                                        />
                                    ))}
                                </div>

                                <div className="flex-grow space-y-3 mb-8">
                                    {review.title && <h4 className="text-xl font-black text-white leading-tight">{review.title}</h4>}
                                    <p className="text-gray-400 font-medium leading-relaxed italic">"{review.message}"</p>
                                </div>

                                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0A0F1F] to-[#1E293B] border border-[#4DA3FF]/30 flex items-center justify-center font-black text-white text-sm">
                                            {review.user_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm flex items-center gap-1.5">
                                                {review.user_name}
                                                {review.is_verified && <ShieldCheck className="w-3 h-3 text-brand-teal" />}
                                            </p>
                                            <p className="text-[10px] font-bold text-[#A0AEC0] uppercase tracking-wider italic">Verified Customer</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-[#A0AEC0] uppercase tracking-widest">
                                            {(() => {
                                                const d = new Date(review.created_at);
                                                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                                return `${months[d.getMonth()]} ${d.getFullYear()}`;
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
