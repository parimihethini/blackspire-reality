"use client";

import { useState } from "react";
import { X, Send, TrendingUp, DollarSign, MapPin, Building } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


interface InvestorModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
    userName?: string;
}

export default function InvestorModal({ isOpen, onClose, userEmail, userName }: InvestorModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: userName || "",
        email: userEmail || "",
        phone: "",
        budget_range: "1Cr - 5Cr",
        preferred_locations: "",
        property_type: "Plots",
        investment_goals: "Long-term growth"
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.phone && formData.phone.replace(/\D/g, "").length < 10) {
            alert("Please enter a valid phone number (10 digits minimum).");
            return;
        }
        
        setIsSubmitting(true);
        setTimeout(() => {
            // Save expression of interest to localStorage
            const key = "investor_interests";
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            existing.push({ ...formData, submittedAt: new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(existing));

            alert("Welcome to the Investor Circle! Our senior consultant will contact you shortly with exclusive opportunities.");
            setIsSubmitting(false);
            onClose();
        }, 800);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#0A0F1F]/90 backdrop-blur-xl"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#121A2F] border border-[#4DA3FF]/20 rounded-[2.5rem] shadow-[0_30px_100px_rgba(77,163,255,0.15)] overflow-hidden"
                    >
                        {/* Header Decoration */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#4DA3FF] via-[#7CC4FF] to-[#4DA3FF]"></div>
                        
                        <div className="p-8 md:p-12">
                            <button 
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="bg-[#4DA3FF]/10 p-3 rounded-2xl border border-[#4DA3FF]/20">
                                    <TrendingUp className="w-8 h-8 text-[#4DA3FF]" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white font-poppins">Investor <span className="text-[#4DA3FF]">Circle</span></h2>
                                    <p className="text-[#A0AEC0] font-medium">Exclusive access to high-yield real estate assets.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0] ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-[#0A0F1F] text-white px-5 py-4 rounded-2xl outline-none border border-white/5 focus:border-[#4DA3FF] transition-all font-medium"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0] ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full bg-[#0A0F1F] text-white px-5 py-4 rounded-2xl outline-none border border-white/5 focus:border-[#4DA3FF] transition-all font-medium"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0] ml-1">👉 Mobile Number / WhatsApp Number</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="w-full bg-[#0A0F1F] text-white px-5 py-4 rounded-2xl outline-none border border-white/5 focus:border-[#4DA3FF] transition-all font-medium"
                                        placeholder="e.g. 9876543210 or +1..."
                                    />
                                    <p className="text-[10px] text-[#A0AEC0] ml-1">Include country code if outside India (e.g. +1...)</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0] ml-1">Budget Range</label>
                                    <select
                                        value={formData.budget_range}
                                        onChange={(e) => setFormData({...formData, budget_range: e.target.value})}
                                        className="w-full bg-[#0A0F1F] text-white px-5 py-4 rounded-2xl outline-none border border-white/5 focus:border-[#4DA3FF] transition-all font-medium appearance-none"
                                    >
                                        <option>50L - 1Cr</option>
                                        <option>1Cr - 5Cr</option>
                                        <option>5Cr - 10Cr</option>
                                        <option>10Cr+</option>
                                    </select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0] ml-1">Preferred Locations</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Hyderabad, Bangalore, Goa"
                                        value={formData.preferred_locations}
                                        onChange={(e) => setFormData({...formData, preferred_locations: e.target.value})}
                                        className="w-full bg-[#0A0F1F] text-white px-5 py-4 rounded-2xl outline-none border border-white/5 focus:border-[#4DA3FF] transition-all font-medium"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <button
                                        disabled={isSubmitting}
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-black py-4 rounded-2xl shadow-[0_10px_25px_rgba(77,163,255,0.3)] hover:shadow-[0_15px_35px_rgba(77,163,255,0.5)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {isSubmitting ? "Processing..." : (
                                            <>
                                                Join Premium Investor List <Send className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                    <p className="text-center text-[10px] text-[#A0AEC0] mt-4 font-medium uppercase tracking-widest opacity-50">Secure & Confidential • Private Equity Access</p>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
