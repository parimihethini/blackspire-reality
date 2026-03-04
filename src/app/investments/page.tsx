"use client";

import { properties } from "@/data/properties";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { useState } from "react";

export default function InvestmentsPage() {
    const defaultInvests = properties.filter(prop => prop.type === 'investment');
    const [locFilter, setLocFilter] = useState("All Locations");
    const [priceFilter, setPriceFilter] = useState("");

    const filteredInvests = defaultInvests.filter(prop => {
        return locFilter === "All Locations" || prop.location.area === locFilter;
    }).sort((a, b) => {
        if (priceFilter === "Low to High") return a.price - b.price;
        if (priceFilter === "High to Low") return b.price - a.price;
        return 0;
    });

    return (
        <main className="bg-primary-black min-h-screen text-white pt-24">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Commercial <span className="text-[#C8A951]">Investments</span></h1>
                    <p className="text-gray-400 text-lg max-w-2xl">High-yield commercial land and estate acquisitions poised for exceptional capital appreciation and ROI.</p>
                </div>

                <div className="flex gap-4 mb-10 overflow-x-auto pb-4 hide-scrollbar">
                    <select value={locFilter} onChange={e => setLocFilter(e.target.value)} className="bg-[#111] border border-gray-800 px-6 py-3 rounded-md text-sm outline-none focus:border-[#C8A951]">
                        <option value="All Locations">All Locations</option>
                        <option value="Devanahalli">Devanahalli</option>
                        <option value="Shamshabad">Shamshabad</option>
                    </select>
                    <select value={priceFilter} onChange={e => setPriceFilter(e.target.value)} className="bg-[#111] border border-gray-800 px-6 py-3 rounded-md text-sm outline-none focus:border-[#C8A951]">
                        <option value="">Sort by Price</option>
                        <option value="Low to High">Price: Low to High</option>
                        <option value="High to Low">Price: High to Low</option>
                    </select>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
                    {filteredInvests.length > 0 ? filteredInvests.map((prop) => (
                        <PropertyCard key={prop.id} property={prop} />
                    )) : (
                        <p className="text-gray-400">No investments found matching your criteria.</p>
                    )}
                </div>
            </div>

            <Footer />
        </main>
    );
}
