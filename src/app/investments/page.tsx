"use client";

import { getProperties, Property } from "@/data/properties";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getAuth } from "@/lib/auth";

export default function InvestmentsPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [authRole, setAuthRole] = useState<string | null>(null);

    useEffect(() => {
        const auth = getAuth();
        if (auth) setAuthRole(auth.role || null);

        getProperties('investment').then((data) => {
            setProperties(data);
            setIsLoading(false);
        });
    }, []);

    const defaultInvests = properties.filter(prop => prop.type === 'investment');
    const [locFilter, setLocFilter] = useState("All Locations");
    const [priceFilter, setPriceFilter] = useState("");

    const filteredInvests = defaultInvests.filter(prop => {
        return locFilter === "All Locations" || prop.location.city === locFilter;
    }).sort((a, b) => {
        if (priceFilter === "Low to High") return a.price - b.price;
        if (priceFilter === "High to Low") return b.price - a.price;
        return 0;
    });

    return (
        <main className="bg-[#0A0F1F] min-h-screen text-white pt-24 animate-fade-in relative">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 font-poppins text-white drop-shadow-md">Commercial <span className="text-[#4DA3FF] drop-shadow-[0_0_8px_rgba(77,163,255,0.4)]">Investments</span></h1>
                    <p className="text-[#A0AEC0] font-medium text-lg max-w-2xl">High-yield commercial land and estate acquisitions poised for exceptional capital appreciation and ROI.</p>
                </div>

                <div className="flex gap-4 mb-10 overflow-x-auto pb-4 hide-scrollbar">
                    <select value={locFilter} onChange={e => setLocFilter(e.target.value)} className="bg-[#121A2F] border border-white/10 px-6 py-3 rounded-xl text-sm text-white font-medium shadow-sm outline-none focus:border-[#4DA3FF] focus:bg-[#0A0F1F] focus:shadow-[0_0_15px_rgba(77,163,255,0.15)] transition-all">
                        <option value="All Locations">All Locations</option>
                        {Array.from(new Set(properties.map(p => p.location.city))).filter(Boolean).map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </select>
                    <select value={priceFilter} onChange={e => setPriceFilter(e.target.value)} className="bg-[#121A2F] border border-white/10 px-6 py-3 rounded-xl text-sm text-white font-medium shadow-sm outline-none focus:border-[#4DA3FF] focus:bg-[#0A0F1F] focus:shadow-[0_0_15px_rgba(77,163,255,0.15)] transition-all">
                        <option value="">Sort by Price</option>
                        <option value="Low to High">Price: Low to High</option>
                        <option value="High to Low">Price: High to Low</option>
                    </select>
                </div>

                {isLoading ? (
                    <div className="py-20 text-center"><p className="text-[#A0AEC0] animate-pulse">Loading investments...</p></div>
                ) : defaultInvests.length === 0 ? (
                    <div className="py-20 text-center bg-[#121A2F]/80 backdrop-blur-md rounded-2xl border border-[#4DA3FF]/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-w-2xl mx-auto flex flex-col items-center">
                        {authRole === 'seller' ? (
                            <>
                                <p className="text-2xl font-bold text-white mb-2">You haven't listed any properties yet.</p>
                                <p className="text-[#A0AEC0] font-medium mb-8">Start selling by adding your first property.</p>
                                <Link href="/seller/add-property" className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] hover:shadow-[0_0_20px_rgba(77,163,255,0.4)] text-[#0A0F1F] font-extrabold px-8 py-3.5 rounded-xl hover:-translate-y-0.5 transition-all duration-300">
                                    List Your Property
                                </Link>
                            </>
                        ) : authRole === 'customer' ? (
                            <>
                                <p className="text-2xl font-bold text-white mb-2">No investments available yet</p>
                                <p className="text-[#A0AEC0] font-medium mb-8">New commercial investments will appear soon.</p>
                                <div className="flex gap-4">
                                    <Link href="/plots" className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] hover:shadow-[0_0_20px_rgba(77,163,255,0.4)] text-[#0A0F1F] font-extrabold px-8 py-3.5 rounded-xl hover:-translate-y-0.5 transition-all duration-300">
                                        Browse Plots
                                    </Link>
                                    <Link href="/houses" className="bg-[#0A0F1F] border border-[#4DA3FF]/30 hover:border-[#4DA3FF]/60 text-[#4DA3FF] hover:text-[#7CC4FF] hover:shadow-[0_0_15px_rgba(77,163,255,0.2)] font-bold px-8 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5">
                                        Explore Houses
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-2xl font-bold text-white mb-2">Want to sell your property?</p>
                                <p className="text-[#A0AEC0] font-medium mb-8">Join Blackspire to list and sell to premium buyers.</p>
                                <Link href="/register" className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] hover:shadow-[0_0_20px_rgba(77,163,255,0.4)] text-[#0A0F1F] font-extrabold px-8 py-3.5 rounded-xl hover:-translate-y-0.5 transition-all duration-300">
                                    Become a Seller
                                </Link>
                            </>
                        )}
                    </div>
                ) : filteredInvests.length === 0 ? (
                    <div className="py-20 text-center bg-[#121A2F]/80 backdrop-blur-md rounded-2xl border border-[#4DA3FF]/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-w-2xl mx-auto flex flex-col items-center">
                        <p className="text-2xl font-bold text-white mb-2">No investments match your filters.</p>
                        <p className="text-[#A0AEC0] font-medium mb-8">Try changing your location or price filters.</p>
                        <button onClick={() => { setLocFilter("All Locations"); setPriceFilter(""); }} className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold px-8 py-3.5 rounded-xl hover:-translate-y-0.5 transition-all">
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <motion.div 
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                        }}
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24"
                    >
                        {filteredInvests.map((prop) => (
                            <motion.div 
                                key={prop.id} 
                                variants={{
                                    hidden: { opacity: 0, y: 30 },
                                    visible: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.5 } }
                                }}
                            >
                                <PropertyCard property={prop} />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            <Footer />
        </main>
    );
}
