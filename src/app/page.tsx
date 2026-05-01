"use client";

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PropertyCard from '@/components/PropertyCard';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Property, STATIC_PROPERTIES } from '@/data/properties';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Search, Map, ShieldCheck, MapPin, Building, Star, LayoutGrid, CheckCircle, MoveRight, ChevronRight, CheckCircle2, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuth } from "@/lib/auth";
import HomeReviews from "@/components/HomeReviews";

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authRole, setAuthRole] = useState<string | null>(null);

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [mapView, setMapView] = useState(false);
  const [selectedMapProperty, setSelectedMapProperty] = useState<Property | null>(null);

  useEffect(() => {
    const auth = getAuth();
    if (auth) setAuthRole(auth.role || null);
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { getProperties } = await import("@/data/properties");
        const data = await getProperties();
        console.log("[Home] Property data loaded:", data);
        setProperties(data);
      } catch (err) {
        console.error("[Home] Failed to load properties:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);


  // Apply local filters
  const applyFilters = (all: Property[]) => {
    return all.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesQ = !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.location.city.toLowerCase().includes(q) ||
        p.location.area.toLowerCase().includes(q) ||
        p.features.some(f => f.toLowerCase().includes(q));
      const matchesType = !filterType || p.type === filterType;
      const matchesCity = !filterCity || p.location.city === filterCity;
      const matchesMin = !minPrice || p.price >= Number(minPrice);
      const matchesMax = !maxPrice || p.price <= Number(maxPrice);
      return matchesQ && matchesType && matchesCity && matchesMin && matchesMax;
    });
  };

  const handleSearch = () => {
    setHasSearched(true);
    setTimeout(() => {
      const el = document.getElementById("search-results");
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const clearSearch = () => {
    setHasSearched(false);
    setSearchQuery("");
    setFilterType("");
    setFilterCity("");
    setMinPrice("");
    setMaxPrice("");
  };

  const filteredProperties = applyFilters(properties);

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (sortBy === "price_asc") return a.price - b.price;
    if (sortBy === "price_desc") return b.price - a.price;
    return b.id - a.id; // Newest
  });

  const featuredProperties = properties.slice(0, 3);

  return (
    <main className="bg-brand-blue min-h-screen text-white pt-16 font-inter flex flex-col overflow-x-hidden">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative min-h-[75vh] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000')" }}
          ></div>
          <div className="absolute inset-0 bg-[#0A0F1F]/80 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1F] via-[#0A0F1F]/70 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F1F]/60 to-[#0A0F1F]/10"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative z-10 max-w-6xl mx-auto px-6 w-full pt-32 pb-20 flex flex-col lg:flex-row justify-between items-start gap-12"
        >
          {/* Left Column */}
          <div className="flex-1 w-full max-w-2xl text-left font-inter">
            <h1 className="text-[2.75rem] sm:text-5xl lg:text-[4rem] font-black uppercase text-[#E2C792] tracking-wider mb-14 leading-[1.1] font-poppins drop-shadow-lg">
              FIND YOUR PERFECT <span className="text-white block mt-1">PLOT OR HOME</span>
            </h1>

            <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
              <div className="flex-1 w-full sm:w-[450px] bg-transparent rounded-full flex items-center p-1.5 border border-gray-400 bg-black/10">
                <input
                  type="text"
                  placeholder="Search by Keyword (e.g. Garden, Villa)"
                  className="bg-transparent text-white outline-none w-full px-6 placeholder:text-gray-400 font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <motion.button
                  onClick={handleSearch}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-[#4DA3FF] text-[#0A0F1F] px-10 py-3 rounded-full font-bold uppercase text-xs tracking-widest shadow-lg shadow-brand-teal/20"
                >
                  SEARCH
                </motion.button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-white font-bold uppercase tracking-widest text-sm drop-shadow bg-transparent w-fit">
              <CheckCircle2 className="w-6 h-6 text-white stroke-[2]" /> VERIFIED PROPERTIES
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col items-end gap-5 text-right w-full lg:w-auto mt-6 lg:mt-0 pt-2 lg:min-w-[200px]">
            <Link href="tel:+910000000000" className="border-[1.5px] border-[#E2C792] text-[#E2C792] px-9 py-2 rounded-full font-bold text-[11px] uppercase tracking-widest hover:bg-[#E2C792]/10 transition inline-block mb-12 shadow-sm bg-black/30 w-fit">CALL US</Link>

            <div className="flex flex-col gap-6 w-full items-end text-white font-medium uppercase tracking-widest text-xs">
              <Link href="/plots" className="flex items-center justify-end gap-4 hover:text-brand-teal transition tracking-[0.15em] hover:translate-x-[-4px]">PLOTS & LANDS <ChevronRight className="w-4 h-4 ml-1"/></Link>
              <Link href="/houses" className="flex items-center justify-end gap-4 hover:text-brand-teal transition tracking-[0.15em] hover:translate-x-[-4px]">HOUSES & VILLAS <ChevronRight className="w-4 h-4 ml-1"/></Link>
              <Link href="/investments" className="flex items-center justify-end gap-4 hover:text-brand-teal transition tracking-[0.15em] hover:translate-x-[-4px]">INVESTMENT LANDS <ChevronRight className="w-4 h-4 ml-1"/></Link>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href="tel:+910000000000"}
              className="bg-[#4DA3FF] text-[#0A0F1F] px-12 py-3 rounded-full font-extrabold text-[13px] uppercase tracking-wider mt-12 shadow-[0_0_20px_rgba(77,163,255,0.4)] hover:shadow-[0_0_30px_rgba(77,163,255,0.6)] transition w-fit"
            >
              CALL NOW
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* FILTER BAR */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="sticky top-[72px] z-40 bg-[#0A0F1F]/80 backdrop-blur-xl border-b border-white/5 shadow-sm py-3 px-4 md:px-6 w-full flex-shrink-0 hide-scrollbar overflow-x-auto"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="flex-shrink-0 bg-[#0A0F1F] border border-white/10 px-4 py-2 rounded-lg text-sm font-medium text-white outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal">
            <option value="">All Cities</option>
            {Array.from(new Set(properties.map(p => p.location.city))).filter(Boolean).map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="flex-shrink-0 bg-[#0A0F1F] border border-white/10 px-4 py-2 rounded-lg text-sm font-medium text-white outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal">
            <option value="">Property Type</option>
            {Array.from(new Set(properties.map(p => p.type))).filter(Boolean).map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}s</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              placeholder="Min Price" 
              value={minPrice} 
              onChange={e => setMinPrice(e.target.value)}
              className="w-28 bg-[#0A0F1F] border border-white/10 px-4 py-2 rounded-lg text-sm font-medium text-white outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
            />
            <input 
              type="number" 
              placeholder="Max Price" 
              value={maxPrice} 
              onChange={e => setMaxPrice(e.target.value)}
              className="w-28 bg-[#0A0F1F] border border-white/10 px-4 py-2 rounded-lg text-sm font-medium text-white outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSearch} 
            className="ml-auto flex-shrink-0 bg-brand-teal hover:bg-brand-accent text-[#0A0F1F] px-8 py-2 rounded-lg text-sm font-extrabold shadow-sm transition-colors uppercase tracking-wider"
          >
            Apply Filters
          </motion.button>
        </div>
      </motion.div>

      {/* SEARCH RESULTS AREA */}
      {(hasSearched || filterCity || searchQuery) && (
        <section id="search-results" className="flex-1 bg-[#0A0F1F] flex flex-col relative w-full h-full min-h-[70vh]">

          <div className="border-b border-white/10 bg-[#161920] w-full sticky top-[138px] z-30">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-4 justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold font-poppins text-white">
                  {`Showing ${sortedProperties.length} ${sortedProperties.length === 1 ? 'property' : 'properties'}`}
                </h2>
              </div>

              <div className="flex gap-4 items-center">
                <div className="flex bg-[#0A0F1F] p-1 rounded-lg border border-white/10">
                  <button
                    onClick={() => setMapView(false)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${!mapView ? 'bg-[#161920] text-brand-teal font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    <LayoutGrid className="w-4 h-4" /> Layout
                  </button>
                  <button
                    onClick={() => setMapView(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${mapView ? 'bg-[#161920] text-brand-teal font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    👉 View on Map
                  </button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 font-medium">Sort By:</span>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-[#0A0F1F] border border-white/10 px-3 py-1.5 rounded-md text-sm font-medium text-white outline-none focus:border-brand-teal">
                        <option value="newest">Newest</option>
                        <option value="price_asc">Price Low → High</option>
                        <option value="price_desc">Price High → Low</option>
                    </select>
                </div>

                <button
                  onClick={clearSearch}
                  className="text-sm font-semibold text-gray-500 hover:text-red-400 transition-colors"
                >
                  Reset &times;
                </button>
              </div>
            </div>
          </div>

          {!mapView ? (
            <div className="max-w-7xl mx-auto px-6 py-10 w-full">
              {isLoading ? (
                  <div className="py-20 text-center w-full flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-teal mb-4"></div>
                    <p className="text-gray-400 font-medium">Loading properties...</p>
                  </div>
              ) : featuredProperties.length === 0 ? (
                  <div className="py-20 text-center bg-[#161920] rounded-2xl border border-white/10 shadow-sm max-w-2xl mx-auto flex flex-col items-center mt-10">
                        <p className="text-2xl font-bold text-white mb-2">No properties available yet</p>
                        <p className="text-gray-400 font-medium mb-8 text-center px-4">New premium listings from our verified community will appear here shortly.</p>
                        {authRole === 'seller' ? (
                            <Link href="/seller/add-property" className="bg-brand-teal text-[#0A0F1F] font-bold px-8 py-3.5 rounded-xl hover:bg-brand-accent transition-all shadow-md flex items-center gap-2">
                                <PlusCircle size={18} /> Add Your First Property
                            </Link>
                        ) : (
                            <Link href="/plots" className="bg-brand-teal text-[#0A0F1F] font-bold px-8 py-3.5 rounded-xl hover:bg-brand-accent transition-all shadow-md flex items-center gap-2">
                                <Search size={18} /> Explore Market
                            </Link>
                        )}
                  </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20"
                >
                  {sortedProperties.map((prop) => (
                    <PropertyCard key={prop.id} property={prop} />
                  ))}
                </motion.div>
              )}
            </div>
          ) : (
            <div className="flex flex-col md:flex-row w-full flex-1 min-h-[70vh]">
              <div className="hidden md:block w-full md:w-[45%] lg:w-[40%] h-[50vh] md:h-[calc(100vh-210px)] overflow-y-auto px-4 md:px-6 py-6 border-r border-white/10 custom-scrollbar">
                {sortedProperties.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    {sortedProperties.map((prop) => (
                      <div key={`split-${prop.id}`} onMouseEnter={() => setSelectedMapProperty(prop)}>
                        <PropertyCard property={prop} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 px-4">
                    <p className="text-gray-500 font-medium">No results found for Map view.</p>
                  </div>
                )}
              </div>

              <div className="w-full md:w-[55%] lg:w-[60%] h-[60vh] md:h-[calc(100vh-210px)] bg-[#121A2F] relative p-0 overflow-hidden border-l border-white/10 bg-[#0A0F1F]">
                <div className="absolute inset-0 z-0">
                  <iframe
                  src={selectedMapProperty?.mapUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.6022802062547!2d80.20901!3d13.0560967!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a5266b7bfa9c33f%3A0xe57788a10129219e!2sReal%20Estate!5e0!3m2!1sen!2sin!4v1690000000000!5m2!1sen!2sin"}
                    className="w-full h-full border-0 absolute inset-0 opacity-60"
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
                <div className="absolute inset-0 pointer-events-none z-10 p-10 flex flex-wrap gap-10 items-center justify-center">
                    {sortedProperties.map(p => (
                        <div key={`marker-${p.id}`} className={`pointer-events-auto cursor-pointer transition-all duration-300 ${selectedMapProperty?.id === p.id ? 'scale-125 z-20' : 'scale-100 opacity-80 z-10'}`} 
                          onClick={() => setSelectedMapProperty(p)}
                        >
                            <div className="h-10 w-10 bg-brand-teal text-[#0A0F1F] rounded-full flex items-center justify-center font-bold shadow-lg shadow-brand-teal/20 border-2 border-[#0A0F1F]">
                                <span>₹{(p.price / 100000).toFixed(0)}L</span>
                            </div>
                            {selectedMapProperty?.id === p.id && (
                                <div className="absolute top-12 left-1/2 -translate-x-1/2 w-48 bg-[#161920] border border-brand-teal/30 p-2 rounded-xl text-xs text-white shadow-2xl">
                                    <div className="font-bold flex gap-1"><span className="text-brand-teal">📍</span> {p.location.area}</div>
                                    <div className="mt-1">{p.title}</div>
                                    <Link href={`/property/${p.id || (p as any)._id || (p as any).property_id}`} className="text-brand-teal underline mt-1 block">View details</Link>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
              </div>
            </div>
          )}

        </section>
      )}

      {/* RENDER NORMAL HOMEPAGE SECs WHEN NOT SEARCHING */}
      {!hasSearched && (
        <div className="flex flex-col">
          {/* LATEST LISTINGS */}
          <section className="py-20 bg-transparent w-full border-t border-white/5">
            <div className="max-w-6xl mx-auto px-6">
              <div className="flex items-center gap-6 mb-12">
                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                  <h2 className="text-xl md:text-2xl font-semibold font-inter text-gray-200 uppercase tracking-[0.15em] whitespace-nowrap">Featured Properties</h2>
                </motion.div>
                <div className="h-px bg-gradient-to-r from-brand-teal/50 to-transparent flex-1" />
              </div>
              
              {isLoading ? (
                  <div className="flex gap-8 pb-8 overflow-x-hidden">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="min-w-[320px] md:min-w-[400px] h-[400px] animate-pulse bg-[#121A2F] rounded-2xl border border-white/5"></div>
                    ))}
                  </div>
              ) : featuredProperties.length === 0 ? (
                  <div className="py-20 text-center bg-[#161920] rounded-2xl border border-white/10 shadow-sm max-w-2xl mx-auto flex flex-col items-center">
                        <p className="text-2xl font-bold text-white mb-2">No properties available</p>
                        <p className="text-gray-400 font-medium mb-6 text-center px-4">Approved properties from our verified sellers will appear here automatically.</p>
                        {authRole === 'seller' ? (
                            <Link href="/seller/add-property" className="bg-brand-teal text-[#0A0F1F] font-bold px-8 py-3 rounded-lg hover:bg-brand-accent transition-all shadow-md">
                                List Your Property
                            </Link>
                        ) : !authRole ? (
                            <Link href="/register/seller" className="bg-brand-teal text-[#0A0F1F] font-bold px-8 py-3 rounded-lg hover:bg-brand-accent transition-all shadow-md">
                                Become a Seller
                            </Link>
                        ) : null}
                  </div>
              ) : (
                  <div className="flex overflow-x-auto gap-8 pb-8 snap-x hide-scrollbar">
                    {featuredProperties.map((prop, index) => (
                      <motion.div 
                        key={prop.id} 
                        initial={{ opacity: 0, x: 50 }} 
                        whileInView={{ opacity: 1, x: 0 }} 
                        transition={{ delay: index * 0.1 }} 
                        viewport={{ once: true }} 
                        className="min-w-[320px] md:min-w-[400px] snap-center flex-shrink-0"
                      >
                        <PropertyCard property={prop} />
                      </motion.div>
                    ))}
                  </div>
              )}
            </div>
          </section>

          {/* CATEGORIES SECTION */}
          <section className="py-16 relative z-20 max-w-7xl mx-auto px-6 w-full">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: "Plots & Lands", path: "/plots", icon: <MapPin className="w-8 h-8 text-brand-teal" />, desc: "Clear Title Layouts" },
                { title: "Houses & Villas", path: "/houses", icon: <Building className="w-8 h-8 text-brand-teal" />, desc: "Ready to Move" },
                { title: "Investment Lands", path: "/investments", icon: <Map className="w-8 h-8 text-brand-teal" />, desc: "High Growth Zones" },
              ].map((cat, i) => (
                <Link href={cat.path} key={i}>
                  <motion.div 
                    whileHover={{ scale: 1.02, translateY: -5 }}
                    className="bg-[#121A2F] rounded-2xl p-8 flex flex-col items-center text-center shadow-lg border border-white/5 transition-all duration-300 group"
                  >
                    <div className="bg-[#121A2F] border border-white/10 p-4 rounded-full mb-5 group-hover:scale-110 transition-transform duration-300 shadow-md shadow-brand-teal/5">{cat.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{cat.title}</h3>
                    <p className="text-sm text-gray-400 font-medium">{cat.desc}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>

          {/* WHY CHOOSE US */}
          <section className="py-24 bg-brand-blue relative border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6 text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-4 text-white">
                  Why Trust <span className="text-brand-teal">Blackspire Reality</span>
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto mb-16 font-medium">We ensure every property transaction is seamless, transparent, and secure from start to finish.</p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { title: "Verified Documents", desc: "Strict 12-point legal vetting before any property is listed.", icon: <ShieldCheck className="w-8 h-8 text-brand-teal" /> },
                  { title: "Transparent Deals", desc: "No hidden charges, clear titles, and upfront pricing.", icon: <CheckCircle className="w-8 h-8 text-brand-teal" /> },
                  { title: "Direct Owners", desc: "Connecting you directly with vetted property owners.", icon: <Star className="w-8 h-8 text-brand-teal" /> },
                  { title: "Trusted Brand", desc: "Dedicated assistance till successful registration.", icon: <MapPin className="w-8 h-8 text-brand-teal" /> }
                ].map((feature, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="flex flex-col items-center p-8 rounded-2xl hover:bg-[#121A2F] transition-colors border border-transparent hover:border-white/5 hover:shadow-lg">
                    <div className="w-16 h-16 bg-[#121A2F] rounded-full flex items-center justify-center mb-6 shadow-md shadow-brand-teal/5 border border-white/10">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-3 text-white">{feature.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* TESTIMONIALS — static customer feedback */}
          <section className="py-24 bg-brand-light border-y border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[1px] bg-gradient-to-r from-transparent via-[#4DA3FF]/20 to-transparent pointer-events-none" />
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] bg-[#4DA3FF]/4 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-20"
              >
                <p className="text-xs font-black tracking-[0.4em] text-[#4DA3FF] uppercase mb-4">Customer Trust</p>
                <h2 className="text-4xl md:text-5xl font-black font-poppins text-white leading-tight">
                    Voice of our <span className="text-[#4DA3FF]">Customers</span>
                </h2>
                <div className="w-24 h-1.5 bg-[#4DA3FF] rounded-full mt-6 mx-auto shadow-[0_0_15px_rgba(77,163,255,0.4)]" />
              </motion.div>

              <HomeReviews />

              <div className="mt-20">
                <Link
                    href="/houses"
                    className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#060B18] font-black text-base shadow-[0_0_30px_rgba(77,163,255,0.3)] transition-all duration-300 group hover:shadow-[0_0_50px_rgba(77,163,255,0.5)] hover:-translate-y-1"
                >
                    Explore Verified Listings <MoveRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </Link>
              </div>
            </div>
          </section>

          {/* INVESTOR SECTION */}
          <section className="py-20 relative w-full px-6 bg-transparent">
            <div className="max-w-6xl mx-auto relative z-10 w-full bg-[#121A2F]/30 backdrop-blur-sm border border-white/5 rounded-[2rem] p-10 md:p-16 overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 top-1/2 bg-brand-teal/5 blur-[120px] pointer-events-none"></div>

              <div className="w-full text-left mb-16 relative z-20">
                 <p className="text-white font-bold tracking-[0.1em] mb-4 text-[13px] drop-shadow">INVESTOR SECTION</p>
                 <h2 className="text-[2rem] sm:text-4xl lg:text-[2.75rem] font-black font-poppins text-[#E2C792] uppercase tracking-wide drop-shadow-md leading-tight">HIGH GROWTH INVESTMENT LANDS</h2>
              </div>

              <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-12 relative z-20">
                 <div className="flex items-center gap-4 text-white lg:w-1/3 justify-start rounded-full bg-[#0A0F1F]/50 px-6 py-3 border border-white/10 shrink-0 w-fit lg:w-auto">
                     <ShieldCheck className="w-5 h-5 text-[#4DA3FF]" />
                     <span className="font-bold uppercase tracking-widest text-[11px]">EXCLUSIVE INVESTMENTS</span>
                 </div>

                 <div className="relative group lg:w-1/3 flex justify-center shrink-0 py-10">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-teal/30 blur-[70px] rounded-full pointer-events-none"></div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-[2px] border-brand-teal/20 rounded-full flex flex-col items-center justify-center bg-[#0A0F1F]/60 shadow-[inset_0_0_80px_rgba(77,163,255,0.4)] pointer-events-none overflow-hidden">
                         <div className="absolute inset-0 bg-[linear-gradient(rgba(77,163,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(77,163,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] mix-blend-screen rounded-full" style={{ transform: 'perspective(500px) rotateX(60deg) scale(2)' }}></div>
                     </div>

                     <motion.button 
                        whileHover={{ scale: 1.05 }} 
                        whileTap={{ scale: 0.95 }} 
                        onClick={() => alert("Thank you! Our team will contact you regarding investment opportunities.")}
                        className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] px-8 py-3.5 rounded-full font-extrabold text-[13px] uppercase shadow-[0_0_30px_rgba(77,163,255,0.5)] whitespace-nowrap z-20 relative hover:shadow-[0_0_40px_rgba(77,163,255,0.8)] transition-all tracking-wider"
                     >
                        JOIN INVESTOR LIST
                     </motion.button>
                 </div>

                 <div className="flex flex-row lg:flex-row gap-12 lg:gap-16 text-white lg:w-1/3 justify-center lg:justify-end items-center lg:items-end w-full lg:w-auto">
                     <div className="flex flex-col items-center gap-3">
                         <div className="w-16 h-16 border border-[#4DA3FF]/20 rounded-xl flex items-center justify-center bg-transparent backdrop-blur-sm bg-black/20"><Building className="w-6 h-6 text-[#4DA3FF]" strokeWidth={1.5} /></div>
                         <span className="font-medium text-gray-300 text-center text-[13px] tracking-wide mt-2">Early Access</span>
                     </div>
                     <div className="flex flex-col items-center gap-3">
                         <div className="w-16 h-16 border border-gray-600 rounded-xl flex items-center justify-center bg-transparent backdrop-blur-sm bg-black/20"><Star className="w-6 h-6 text-gray-400" strokeWidth={1.5} /></div>
                         <span className="font-medium text-gray-400 text-center text-[13px] tracking-wide mt-2">Portfolio Growth</span>
                     </div>
                 </div>
              </div>
            </div>
          </section>
        </div>
      )}

      <Footer />
      <WhatsAppButton />
    </main>
  );
}
