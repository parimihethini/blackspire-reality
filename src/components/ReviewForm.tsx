"use client";

import { useState, useEffect } from "react";
import { getAuth } from "@/lib/auth";
import { Star, Send, UserCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createReview } from "@/lib/api";

interface ReviewFormProps {
    propertyId?: number;
    onSuccess?: () => void;
    autoFocus?: boolean;
}

export default function ReviewForm({ propertyId, onSuccess, autoFocus }: ReviewFormProps) {
    const [auth, setAuth] = useState<any>(null);
    const [formData, setFormData] = useState({
        title: "",
        message: "",
        rating: 5,
    });
    const [hoveredRating, setHoveredRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        setAuth(getAuth());
    }, []);

    const handleRatingClick = (r: number) => {
        setFormData(prev => ({ ...prev, rating: r }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (formData.message.length < 10) {
            setError("Review message must be at least 10 characters long.");
            return;
        }

        if (!auth?.loggedIn) {
            setError("Please log in as a customer to submit feedback.");
            return;
        }

        if (!auth?.token) {
            setError("Your session has expired. Please log out and log in again.");
            return;
        }

        if (auth?.role === "seller") {
            setError("Only customers can submit reviews. Sellers cannot review properties.");
            return;
        }

        setIsSubmitting(true);
        
        try {
            const payload = {
                property_id: propertyId,
                title: formData.title,
                comment: formData.message,
                rating: formData.rating
            };

            await createReview(payload);
            setSuccess(true);
            setFormData({ title: "", message: "", rating: 5 });
            if (onSuccess) onSuccess();
        } catch (err: any) {
            const msg = err?.message || "";
            if (msg.includes("Not authenticated") || msg.includes("401")) {
                setError("Session expired. Please log out and log in again to submit a review.");
            } else {
                setError(msg || "Failed to submit review. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };


    if (!auth) return null;

    if (!auth.loggedIn) {
        return (
            <div className="bg-[#121A2F]/80 backdrop-blur-md p-10 rounded-3xl border border-[#4DA3FF]/20 text-center">
                <div className="w-16 h-16 bg-[#4DA3FF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserCircle2 className="w-8 h-8 text-[#4DA3FF]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Member Feedback</h3>
                <p className="text-[#A0AEC0] mb-8 font-medium">To write a review, you must have a registered customer account.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                        onClick={() => window.location.href = '/login/customer'}
                        className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-black px-8 py-3 rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(77,163,255,0.4)] transition-all"
                    >
                        Login as Customer
                    </button>
                    <button 
                        onClick={() => window.location.href = '/register/customer'}
                        className="bg-white/5 border border-white/10 text-white font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition-all"
                    >
                        Create Account
                    </button>
                </div>
            </div>
        );
    }

    if (auth.role === "seller") {
        return (
            <div className="bg-[#121A2F]/80 backdrop-blur-md p-10 rounded-3xl border border-red-500/20 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Notice for Sellers</h3>
                <p className="text-[#A0AEC0] font-medium">Only customers can submit feedback. Sellers cannot act as buyers on their own or other listings.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-[#121A2F]/90 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#4DA3FF]/20 relative overflow-hidden group/form">
            {/* Success Overlay */}
            <AnimatePresence>
                {success && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 bg-[#121A2F] z-20 flex flex-col items-center justify-center text-center p-8"
                    >
                        <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(34,197,94,0.15)]">
                            <ShieldCheck className="w-10 h-10 text-green-400" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">Review Submitted!</h3>
                        <p className="text-[#A0AEC0] font-medium mb-8">Thank you for your valuable feedback. It helps build a trusted community.</p>
                        <button 
                            type="button"
                            onClick={() => setSuccess(false)}
                            className="bg-white/5 border border-[#4DA3FF]/30 text-white font-bold px-8 py-3 rounded-xl hover:bg-[#4DA3FF]/10 transition-all"
                        >
                            Write Another Review
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Form Content */}
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-[#4DA3FF]/10 p-3 rounded-2xl border border-[#4DA3FF]/20">
                    <Star className="w-6 h-6 text-[#4DA3FF] fill-[#4DA3FF]/20" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white font-poppins">Share Your Experience</h2>
                    <p className="text-[#A0AEC0] text-sm font-medium">Verified Customer Review</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Star Rating Selector */}
                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-[2px] text-[#A0AEC0] ml-1">Overall Rating</label>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                onClick={() => handleRatingClick(star)}
                                className="p-1 hover:scale-110 transition-transform"
                            >
                                <Star 
                                    className={`w-10 h-10 transition-all duration-300 ${
                                        (hoveredRating || formData.rating) >= star 
                                        ? "fill-[#FFD700] text-[#FFD700] drop-shadow-[0_0_12px_rgba(255,215,0,0.5)]" 
                                        : "text-white/10 hover:text-white/30"
                                    }`} 
                                    strokeWidth={1.5}
                                />
                            </button>
                        ))}
                        <span className="ml-4 text-brand-teal font-black text-lg">
                            {formData.rating}/5
                        </span>
                    </div>
                </div>

                {/* Review Title */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[2px] text-[#A0AEC0] ml-1">Review Title</label>
                    <input 
                        type="text"
                        placeholder="e.g. Excellent Property, Great Location"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-[#0A0F1F]/60 text-white px-6 py-4 rounded-2xl border border-white/5 focus:border-[#4DA3FF] outline-none transition-all font-medium placeholder:text-white/20"
                    />
                </div>

                {/* Review Message */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-xs font-bold uppercase tracking-[2px] text-[#A0AEC0]">Your Message</label>
                        <span className={`text-[10px] font-bold ${formData.message.length < 10 ? 'text-red-400' : 'text-green-500'}`}>
                            {formData.message.length} characters
                        </span>
                    </div>
                    <textarea 
                        required
                        placeholder="Share the details of your experience... What did you like or dislike?"
                        value={formData.message}
                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full bg-[#0A0F1F]/60 text-white px-6 py-5 rounded-3xl border border-white/5 focus:border-[#4DA3FF] outline-none transition-all font-medium min-h-[150px] resize-none placeholder:text-white/20"
                    />
                </div>

                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm font-bold flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </motion.div>
                )}

                <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(77,163,255,0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-4 border-[#0A0F1F] border-t-transparent rounded-full animate-spin"></div>
                            Publishing Review...
                        </>
                    ) : (
                        <>
                            Publish Verified Review <Send className="w-5 h-5" />
                        </>
                    )}
                </motion.button>

                <p className="text-center text-[10px] text-[#A0AEC0] uppercase tracking-[3px] font-bold opacity-40">
                    Secure Submission • SSL Encrypted
                </p>
            </div>
        </form>
    );
}
