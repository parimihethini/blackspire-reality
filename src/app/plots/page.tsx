"use client";

import { properties } from "@/data/properties";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { useState } from "react";

export default function PlotsPage() {
    const defaultPlots = properties.filter(prop => prop.type === 'plot');
    const [cityFilter, setCityFilter] = useState("All Cities");
    const [priceFilter, setPriceFilter] = useState("");

    const filteredPlots = defaultPlots.filter(prop => {
        const matchCity = cityFilter === "All Cities" || prop.location.city === cityFilter;
        return matchCity;
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
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Premium <span className="text-[#C8A951]">Plots</span></h1>
                    <p className="text-gray-400 text-lg max-w-2xl">Browse our curated collection of verified, high-value land investments perfectly suited for your dream construction.</p>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-10 overflow-x-auto pb-4 hide-scrollbar">
                    <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="bg-[#111] border border-gray-800 px-6 py-3 rounded-md text-sm outline-none focus:border-[#C8A951]">
                        <option value="All Cities">All Cities</option>
                        <option value="Chennai">Chennai</option>
                        <option value="Bangalore">Bangalore</option>
                        <option value="Coimbatore">Coimbatore</option>
                    </select>
                    <select value={priceFilter} onChange={e => setPriceFilter(e.target.value)} className="bg-[#111] border border-gray-800 px-6 py-3 rounded-md text-sm outline-none focus:border-[#C8A951]">
                        <option value="">Sort by Price</option>
                        <option value="Low to High">Price: Low to High</option>
                        <option value="High to Low">Price: High to Low</option>
                    </select>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
                    {filteredPlots.length > 0 ? filteredPlots.map((prop) => (
                        <PropertyCard key={prop.id} property={prop} />
                    )) : (
                        <p className="text-gray-400">No plots found matching your criteria.</p>
                    )}
                </div>
            </div>

            <Footer />
        </main>
    );
}
