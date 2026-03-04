"use client";

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PropertyCard from '@/components/PropertyCard';
import { properties, Property } from '@/data/properties';
import Link from 'next/link';
import { useState } from 'react';
import { Search } from 'lucide-react';

export default function Home() {
  const [searchLocation, setSearchLocation] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchResults, setSearchResults] = useState<Property[] | null>(null);

  // Simple slice to show only top 3 featured
  const featuredProperties = properties.slice(0, 3);

  // Handle Search 
  const handleSearch = () => {
    // Basic frontend search filtering logic matching properties.ts location structure
    const results = properties.filter((p) => {
      const matchLoc = searchLocation ? p.location.city.toLowerCase().includes(searchLocation.toLowerCase()) || p.location.area.toLowerCase().includes(searchLocation.toLowerCase()) : true;
      const matchType = searchType ? p.type === searchType : true;
      return matchLoc && matchType;
    });
    setSearchResults(results);
  };

  const clearSearch = () => {
    setSearchResults(null);
    setSearchLocation("");
    setSearchType("");
  };

  return (
    <main className="bg-primary-black min-h-screen text-white pt-16 font-inter">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative min-h-[500px] flex items-center justify-center text-center border-b border-gray-900">
        <div className="absolute inset-0 w-full h-full">
          <img
            src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c"
            alt="Luxury Real Estate"
            className="w-full h-full object-cover opacity-80 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#0B0B0B]/90"></div>
        </div>

        <div className="relative z-10 max-w-4xl px-6 w-full py-24">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight font-poppins mb-6">
            Find Your Perfect <span className="text-[#C8A951]">Property</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12">
            Verified properties, direct owner deals, and high-growth investment lands curated for you.
          </p>

          <div className="bg-[#111111] p-4 rounded-lg border border-gray-800 flex flex-col md:flex-row gap-4 max-w-3xl mx-auto shadow-xl">
            <div className="flex-1 bg-black border border-gray-700 rounded-md flex items-center px-4 py-1.5 focus-within:border-[#C8A951] transition-colors">
              <Search className="text-gray-500 w-5 h-5 mr-2" />
              <input
                placeholder="Search City or Area (e.g., Chennai)"
                className="w-full py-2.5 text-white bg-transparent outline-none text-sm"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-3 rounded-md bg-black text-white text-sm border border-gray-700 outline-none focus:border-[#C8A951] transition-colors md:w-[160px]"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="plot">Plot</option>
              <option value="house">House</option>
              <option value="villa">Villa</option>
              <option value="investment">Investment Land</option>
            </select>
            <button
              onClick={handleSearch}
              className="bg-gradient-to-r from-[#C8A951] to-[#E5C76B] hover:from-[#E5C76B] hover:to-[#C8A951] text-black px-8 py-3 rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-[#C8A951]/30 hover:scale-105 text-sm"
            >
              Search
            </button>
          </div>

          <div className="mt-10 flex gap-6 justify-center text-xs font-semibold uppercase tracking-widest text-[#C8A951]">
            <span>✔ Verified Listings</span>
            <span>✔ Direct Deals</span>
            <span>✔ High ROI Zones</span>
          </div>
        </div>
      </section>

      {/* SEARCH RESULTS OR FEATURED PROPERTIES */}
      {searchResults !== null ? (
        <section className="py-24 bg-[#0B0B0B] border-b border-gray-900 min-h-[50vh]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-bold font-poppins text-[#C8A951]">Search Results</h2>
                <p className="text-gray-400 mt-2">Found {searchResults.length} {searchResults.length === 1 ? 'property' : 'properties'} based on your criteria.</p>
              </div>
              <button
                onClick={clearSearch}
                className="text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Clear Search &times;
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {searchResults.map((prop) => (
                  <PropertyCard key={prop.id} property={prop} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#111] border border-gray-800 rounded-lg">
                <p className="text-xl font-semibold mb-2">No properties found</p>
                <p className="text-gray-400 text-sm">Try adjusting your location or property type filters.</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="py-24 bg-[#0B0B0B] border-b border-gray-900">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-bold font-poppins">Featured Properties</h2>
              </div>
              <Link href="/plots" className="text-sm font-semibold text-[#C8A951] hover:text-white transition-colors">
                View All &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.map((prop) => (
                <PropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CATEGORIES SECTION */}
      <section className="py-24 bg-[#111111] border-b border-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold font-poppins mb-12 text-center">Browse by Category</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Plots", path: "/plots", icon: "📐", desc: "Clear Title Layouts" },
              { title: "Houses & Villas", path: "/houses", icon: "🏡", desc: "Ready to Move" },
              { title: "Investment Lands", path: "/investments", icon: "📈", desc: "High Growth Zones" },
            ].map((cat, i) => (
              <Link href={cat.path} key={i} className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-8 flex flex-col items-center text-center hover:border-[#C8A951] transition-colors">
                <div className="text-4xl mb-4">{cat.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{cat.title}</h3>
                <p className="text-sm text-gray-400">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="py-24 bg-[#0B0B0B] border-b border-gray-900">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold font-poppins mb-16 divide-x text-white">
            Why Choose Blackspire Reality
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {[
              { title: "Verified Documents", desc: "Strict legal vetting before any property is listed.", icon: "✔" },
              { title: "Direct Owners", desc: "Zero middlemen. Direct connection with verified owners.", icon: "✔" },
              { title: "Transparent Deals", desc: "Clear Title and transparent process.", icon: "✔" },
              { title: "Trusted Brand", desc: "Guided assistance from search to secure registration.", icon: "✔" }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 bg-[#111111] rounded-full flex items-center justify-center text-xl mb-4 text-[#C8A951] border border-gray-800">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LATEST LISTINGS */}
      <section className="py-24 bg-[#111111] border-b border-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold font-poppins mb-12 text-center text-white">Latest Listings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...properties].reverse().slice(0, 3).map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        </div>
      </section>

      {/* INVESTOR SECTION */}
      <section className="py-24 bg-[#111111] border-b border-gray-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold font-poppins mb-6 text-white">Property Investment Opportunities</h2>

          <div className="flex flex-col md:flex-row justify-center gap-6 mb-10 text-[#C8A951] font-semibold">
            <span className="bg-[#1A1A1A] px-6 py-3 rounded-lg border border-gray-800">High Growth Locations</span>
            <span className="bg-[#1A1A1A] px-6 py-3 rounded-lg border border-gray-800">Early Deals</span>
            <span className="bg-[#1A1A1A] px-6 py-3 rounded-lg border border-gray-800">Exclusive Plots</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Thank you! You have been added to the Inner Circle.");
            }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <input required type="email" placeholder="Your Work Email" className="px-6 py-3 rounded-md bg-black border border-gray-700 w-full sm:w-80 outline-none focus:border-[#C8A951] text-sm text-white" />
            <button type="submit" className="bg-gradient-to-r from-[#C8A951] to-[#E5C76B] hover:from-[#E5C76B] hover:to-[#C8A951] text-black px-8 py-3 rounded-md font-bold transition-all duration-300 shadow-lg hover:shadow-[#C8A951]/30 hover:scale-105 text-sm">Join Investor List</button>
          </form>
        </div>
      </section>

      <Footer />
    </main>
  );
}