"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, MapPin, Phone, MessageSquare, Building2, Ruler, ShieldCheck, Tag, Calendar, Clock, Compass, Navigation, Edit, Trash2, Users, Eye, Link as LinkIcon, Activity, Lock, ShieldAlert, BrainCircuit, AlertTriangle, Scale, TrendingUp, Sparkles, MessageCircleCode, ChevronRight } from "lucide-react";
import { predictPrice, detectFraud, checkLegalCompliance, getInvestmentScore, authFetch, API_ORIGIN, getErrorDetail } from "@/lib/api";

import Link from "next/link";
import { motion } from "framer-motion";
import Reviews from "@/components/Reviews";
import { getAuth, clearAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";


const businessNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "918148688987";

export default function PropertyClient({ property }: any) {
    const router = useRouter();
    const isValidMapUrl = property.mapUrl && property.mapUrl.startsWith("https://") && property.mapUrl.includes("maps.google");
    const [formType, setFormType] = useState<"visit" | "request">("visit");
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        date: "",
        time: "",
        message: ""
    });

    const [savedProps, setSavedProps] = useState<any[]>([]);
    const [contactHistory, setContactHistory] = useState<any[]>([]);
    const [siteVisits, setSiteVisits] = useState<any[]>([]);
    const [activeImage, setActiveImage] = useState(0);
    const [auth, setAuth] = useState<any>(undefined);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    // AI States
    const [aiStats, setAiStats] = useState<any>({
        pricePrediction: null,
        fraudStatus: null,
        legalCheck: null,
        investmentScore: null,
        loading: {
            price: false,
            fraud: false,
            legal: false,
            investment: false
        }
    });

    const [negotiationResult, setNegotiationResult] = useState<any>(null);

    const startNegotiation = async () => {
        setNegotiationResult({
            message: "Our AI analysis suggests a price range between ₹" + (property.price * 0.95).toLocaleString("en-IN") + " and ₹" + (property.price * 1.05).toLocaleString("en-IN") + " based on current market trends in " + (property.location?.city || "Blackspire Hub") + ".",
            suggested_price: Math.floor(property.price * 0.97),
            strategy: "Moderate Bargain"
        });
    };

    const runPricePrediction = async () => {
        setAiStats((prev: any) => ({ ...prev, loading: { ...prev.loading, price: true } }));
        try {
            const result = await predictPrice(property);
            setAiStats((prev: any) => ({ ...prev, pricePrediction: result }));
        } finally {
            setAiStats((prev: any) => ({ ...prev, loading: { ...prev.loading, price: false } }));
        }
    };

    const runFraudDetection = async () => {
        setAiStats((prev: any) => ({ ...prev, loading: { ...prev.loading, fraud: true } }));
        try {
            const result = await detectFraud(property);
            setAiStats((prev: any) => ({ ...prev, fraudStatus: result }));
        } finally {
            setAiStats((prev: any) => ({ ...prev, loading: { ...prev.loading, fraud: false } }));
        }
    };

    const runLegalCheck = async () => {
        setAiStats((prev: any) => ({ ...prev, loading: { ...prev.loading, legal: true } }));
        try {
            const result = await checkLegalCompliance(property.id);
            setAiStats((prev: any) => ({ ...prev, legalCheck: result }));
        } finally {
            setAiStats((prev: any) => ({ ...prev, loading: { ...prev.loading, legal: false } }));
        }
    };

    const runInvestmentScore = async () => {
        setAiStats((prev: any) => ({ ...prev, loading: { ...prev.loading, investment: true } }));
        try {
            const result = await getInvestmentScore(property.id);
            setAiStats((prev: any) => ({ ...prev, investmentScore: result }));
        } finally {
            setAiStats((prev: any) => ({ ...prev, loading: { ...prev.loading, investment: false } }));
        }
    };


    useEffect(() => {
        setAuth(getAuth() || null);
        setIsPreviewMode(new URLSearchParams(window.location.search).get("preview") === "owner");
    }, []);

    const currentUserId = auth?.user?.id || auth?.id || auth?.email || "guest";
    const isActuallyOwner = auth?.role === "seller";
    const showOwnerPreview = isActuallyOwner && isPreviewMode;

    // STEP 8 - DEBUG LOGGING
    useEffect(() => {
        if (auth !== undefined && property) {
            console.log("Standalone Mode Active");
        }
    }, [auth, property, currentUserId, isActuallyOwner, isPreviewMode]);

    if (!property || auth === undefined) {
        return (
            <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center text-[#A0AEC0] animate-pulse font-medium text-lg">
                Loading property details...
            </div>
        );
    }

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this listing permanently? This cannot be undone.")) {
            // Delete from localStorage
            try {
                const saved = localStorage.getItem("saved_properties");
                if (saved) setSavedProps(JSON.parse(saved));

                const contacts = localStorage.getItem("contact_history");
                if (contacts) setContactHistory(JSON.parse(contacts));

                const visits = localStorage.getItem("site_visits");
                if (visits) setSiteVisits(JSON.parse(visits));
            } catch (_) { };
            try {
                const saved = localStorage.getItem("seller_properties");
                if (saved) {
                    const props = JSON.parse(saved).filter((p: any) => p.id !== property.id);
                    localStorage.setItem("seller_properties", JSON.stringify(props));
                }
            } catch (_) { }
            router.push("/seller/my-properties");
        }
    };

    const saveContact = async (type: string) => {
        console.log(`Action Logged (Frontend): ${type} for Property ${property.id}`);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Only customers can submit visit requests
        if (auth?.role === "seller") {
            alert("Sellers cannot submit inquiries. Please log in as a customer.");
            return;
        }

        if (!auth?.loggedIn || !auth?.token) {
            alert("Please log in as a customer to submit an inquiry.");
            return;
        }

        if (formData.phone.replace(/\D/g, "").length < 10) {
            alert("Please enter a valid phone number (10 digits minimum).");
            return;
        }

        try {
            const payload = {
                property_id: property.id,
                requested_date: formData.date || new Date().toISOString().split('T')[0],
                message: formData.message || (formType === "visit" ? "Site visit request" : "Inquiry about property details"),
            };

            const response = await authFetch(`${API_ORIGIN}/properties/visit/request`, {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                clearAuth();
                router.push("/login/customer");
                throw new Error("Session expired. Please log in again.");
            }

            if (!response.ok) {
                throw new Error(await getErrorDetail(response, `Server error (${response.status})`));
            }
        } catch (error: any) {
            alert(error.message || "Error submitting request. Please try again.");
            return;
        }

        alert(`Thank you ${formData.name}! Your ${formType === "visit" ? "site visit" : "details"} request has been received. Our team will contact you on ${formData.phone} shortly.`);
        setFormData({ name: "", phone: "", date: "", time: "", message: "" });
    };

    return (
        <div className="bg-[#0A0F1F] text-white min-h-screen pb-20 font-inter">
            {showOwnerPreview && (
                <div className="fixed top-[72px] left-0 w-full z-40 bg-gradient-to-r from-purple-900/90 to-blue-900/90 backdrop-blur-md border-b border-white/10 py-2 sm:py-3 shadow-2xl">
                    <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-1.5 rounded-lg">
                                <ShieldAlert className="w-5 h-5 text-purple-300" />
                            </div>
                            <div>
                                <p className="text-white font-black text-sm uppercase tracking-tighter">Owner Preview Mode</p>
                                <p className="text-white/60 text-[10px] sm:text-xs font-bold leading-none hidden sm:block">This is exactly how potential customers see your listing on Blackspire Reality.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/seller/dashboard')}
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest border border-white/20 transition-all active:scale-95"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            )}
            {/* LARGE IMAGE GALLERY */}
            <div className="w-full bg-[#121A2F] mt-16 pb-8 border-b border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative z-10">
                <div className="w-full h-[45vh] md:h-[60vh] relative group max-w-7xl mx-auto">
                    <img
                        src={property.images[activeImage] || property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

                    {/* THUMBNAILS ROW */}
                    {property.images.length > 1 && (
                        <div className="absolute bottom-6 right-6 flex gap-2 z-20">
                            {property.images.map((img: string, i: number) => (
                                <button key={i} onClick={() => setActiveImage(i)} className={`w-16 h-12 rounded-md overflow-hidden border-2 transition-all shadow-md ${activeImage === i ? 'border-brand-teal scale-110' : 'border-white/30 opacity-70 hover:opacity-100'}`}>
                                    <img src={img} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="absolute bottom-0 left-0 w-full p-8 md:p-12 bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/80 to-transparent"
                    >
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide shadow-[0_0_15px_rgba(77,163,255,0.4)]">
                                {property.status}
                            </span>
                            <span className="bg-[#121A2F]/90 backdrop-blur border border-white/10 text-white px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide shadow-sm">
                                {property.type}
                            </span>
                            {showOwnerPreview && (
                                <span className="bg-purple-500/20 backdrop-blur border border-purple-500/50 text-purple-300 px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide shadow-sm">
                                    Owner Preview
                                </span>
                            )}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-2 drop-shadow-md font-poppins">{property.title}</h1>
                        <p className="text-gray-300 text-lg flex items-center gap-2 drop-shadow">
                            <MapPin className="w-5 h-5 text-brand-teal" />
                            {[property.location.area, property.location.city].filter(Boolean).join(", ")}
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12 mt-12">

                {/* LEFT SECTION */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="md:col-span-2 space-y-12"
                >

                    {/* KEY METRICS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: <Tag className="w-6 h-6 text-[#4DA3FF] mb-3 group-hover:drop-shadow-[0_0_8px_rgba(77,163,255,0.8)] transition-all" />, label: "Price", value: `₹${property.price.toLocaleString("en-IN")}` },
                            { icon: <Ruler className="w-6 h-6 text-[#4DA3FF] mb-3 group-hover:drop-shadow-[0_0_8px_rgba(77,163,255,0.8)] transition-all" />, label: "Size", value: property.size },
                            { icon: <ShieldCheck className="w-6 h-6 text-[#4DA3FF] mb-3 group-hover:drop-shadow-[0_0_8px_rgba(77,163,255,0.8)] transition-all" />, label: "Approval", value: property.approval },
                            { icon: <Building2 className="w-6 h-6 text-[#4DA3FF] mb-3 group-hover:drop-shadow-[0_0_8px_rgba(77,163,255,0.8)] transition-all" />, label: "Type", value: property.type, capitalize: true }
                        ].map((metric, i) => (
                            <div key={i} className="bg-[#121A2F]/80 backdrop-blur-md p-6 rounded-2xl border border-[#4DA3FF]/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#4DA3FF]/40 hover:shadow-[0_0_20px_rgba(77,163,255,0.15)] transition-all group hover:-translate-y-1">
                                {metric.icon}
                                <p className="text-sm text-[#A0AEC0] font-medium mb-1">{metric.label}</p>
                                <p className={`text-lg font-bold text-white ${metric.capitalize ? 'capitalize' : ''}`}>{metric.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* DESCRIPTION */}
                    <div className="bg-[#121A2F]/80 backdrop-blur-md p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/5 hover:border-[#4DA3FF]/20 transition-all">
                        <h2 className="text-2xl font-bold mb-4 font-poppins text-white">Property Overview</h2>
                        <p className="text-[#A0AEC0] leading-relaxed text-lg">{property.description}</p>
                    </div>

                    {/* PRICE BREAKDOWN */}
                    <div className="bg-[#121A2F]/80 backdrop-blur-md p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/5 hover:border-[#4DA3FF]/20 transition-all">
                        <h2 className="text-2xl font-bold mb-6 font-poppins text-white">Price Breakdown</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                <span className="text-[#A0AEC0] font-medium">Base Price</span>
                                <span className="font-bold text-white">₹{property.price.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                <span className="text-[#A0AEC0] font-medium">Registration & Stamp Duty</span>
                                <span className="font-bold text-white">Approx. 7-8%</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                <span className="text-[#A0AEC0] font-medium">Legal & Processing Fees</span>
                                <span className="font-bold text-white">₹25,000 (Estimated)</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 bg-[#0A0F1F] p-4 rounded-xl border border-[#4DA3FF]/20 mt-4 shadow-[0_0_20px_rgba(77,163,255,0.05)]">
                                <span className="text-white font-bold text-lg">Estimated Total</span>
                                <span className="font-bold text-[#7CC4FF] text-xl drop-shadow-[0_0_8px_rgba(124,196,255,0.5)]">₹{(property.price * 1.08 + 25000).toLocaleString("en-IN")}</span>
                            </div>
                        </div>
                    </div>

                    {/* FEATURES & SPECIFICATIONS */}
                    <div className="bg-[#121A2F]/80 backdrop-blur-md p-8 rounded-2xl shadow-[0_4px_20_rgba(0,0,0,0.3)] border border-white/5 hover:border-[#4DA3FF]/20 transition-all">
                        <h2 className="text-2xl font-bold mb-6 font-poppins text-white">Amenities & Specifications</h2>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {property.features.map((feature: string, i: number) => (
                                <li key={i} className="flex items-center gap-3 text-[#A0AEC0] font-medium bg-[#0A0F1F] hover:bg-[#111627] hover:border-[#4DA3FF]/30 transition-all p-3 rounded-lg border border-white/5 shadow-sm group">
                                    <CheckCircle2 className="w-5 h-5 text-[#4DA3FF] group-hover:text-[#7CC4FF] group-hover:drop-shadow-[0_0_5px_rgba(124,196,255,0.6)] flex-shrink-0 transition-all" /> {feature}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* AI INSIGHTS & ANALYSIS */}
                    <div className="bg-[#121A2F]/80 backdrop-blur-md p-8 rounded-[2rem] shadow-[0_4px_30px_rgba(0,0,0,0.4)] border border-[#4DA3FF]/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <BrainCircuit className="w-32 h-32 text-[#4DA3FF]" />
                        </div>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4DA3FF] to-[#7CC4FF] flex items-center justify-center text-[#0A0F1F]">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-black text-white font-poppins">AI Insights & Analysis</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                            {/* Price Prediction */}
                            <div className="bg-[#0A0F1F]/60 p-6 rounded-2xl border border-white/5 hover:border-[#4DA3FF]/30 transition-all flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-[#4DA3FF]" />
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Price Prediction</span>
                                    </div>
                                    {aiStats.loading.price && <div className="w-4 h-4 border-2 border-[#4DA3FF]/30 border-t-[#4DA3FF] rounded-full animate-spin" />}
                                </div>
                                {aiStats.pricePrediction ? (
                                    <div className="space-y-1">
                                        <p className="text-2xl font-black text-white">₹{aiStats.pricePrediction.predictedPrice.toLocaleString("en-IN")}</p>
                                        <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1">
                                            {aiStats.pricePrediction.marketTrend} Trend
                                        </p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={runPricePrediction}
                                        disabled={aiStats.loading.price}
                                        className="text-[#4DA3FF] text-sm font-black uppercase tracking-widest hover:text-white transition-colors text-left flex items-center gap-1"
                                    >
                                        Analyze Market Value <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Investment Scoring */}
                            <div className="bg-[#0A0F1F]/60 p-6 rounded-2xl border border-white/5 hover:border-[#4DA3FF]/30 transition-all flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Scale className="w-4 h-4 text-[#FFD700]" />
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Investment Score</span>
                                    </div>
                                    {aiStats.loading.investment && <div className="w-4 h-4 border-2 border-[#FFD700]/30 border-t-[#FFD700] rounded-full animate-spin" />}
                                </div>
                                {aiStats.investmentScore ? (
                                    <div className="flex items-end gap-3">
                                        <p className="text-4xl font-black text-[#FFD700]">{aiStats.investmentScore.score}/100</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Elite Rating</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={runInvestmentScore}
                                        disabled={aiStats.loading.investment}
                                        className="text-[#FFD700] text-sm font-black uppercase tracking-widest hover:text-white transition-colors text-left flex items-center gap-1"
                                    >
                                        Calculate Yield Potential <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Fraud Detection */}
                            <div className="bg-[#0A0F1F]/60 p-6 rounded-2xl border border-white/5 hover:border-red-500/30 transition-all">
                                <div className="flex items-center gap-2 mb-4">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fraud Guard</span>
                                </div>
                                {aiStats.fraudStatus ? (
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${aiStats.fraudStatus.isSafe ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
                                        <p className="text-sm font-bold text-white">{aiStats.fraudStatus.message}</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={runFraudDetection}
                                        disabled={aiStats.loading.fraud}
                                        className="text-red-400 text-sm font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        Security Audit {aiStats.loading.fraud ? '...' : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>

                            {/* Legal Compliance */}
                            <div className="bg-[#0A0F1F]/60 p-6 rounded-2xl border border-white/5 hover:border-brand-teal/30 transition-all">
                                <div className="flex items-center gap-2 mb-4">
                                    <ShieldCheck className="w-4 h-4 text-brand-teal" />
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Legal Verification</span>
                                </div>
                                {aiStats.legalCheck ? (
                                    <p className="text-sm font-bold text-white flex items-center gap-2">
                                        {aiStats.legalCheck.isVerified ? (
                                            <><CheckCircle2 className="w-4 h-4 text-brand-teal" /> 100% Compliant</>
                                        ) : (
                                            <><AlertTriangle className="w-4 h-4 text-yellow-500" /> Action Required</>
                                        )}
                                    </p>
                                ) : (
                                    <button
                                        onClick={runLegalCheck}
                                        disabled={aiStats.loading.legal}
                                        className="text-brand-teal text-sm font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        Verify Documentation {aiStats.loading.legal ? '...' : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* AI Negotiation Launcher */}
                        <div className="relative z-10 p-6 bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-2xl border border-[#4DA3FF]/20 shadow-lg group-hover:border-[#4DA3FF]/50 transition-all">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h4 className="text-lg font-black text-white mb-1 flex items-center gap-2">
                                        <MessageCircleCode className="w-5 h-5 text-[#4DA3FF]" />
                                        Blackspire AI Negotiation
                                    </h4>
                                    <p className="text-xs text-[#A0AEC0] font-medium">Chat with our AI to discuss price points, amenities, and closing terms instantly.</p>
                                </div>
                                <button
                                    onClick={startNegotiation}
                                    className="whitespace-nowrap bg-[#4DA3FF] hover:bg-[#7CC4FF] text-[#0A0F1F] font-black px-6 py-3 rounded-xl transition-all shadow-[0_4px_15px_rgba(77,163,255,0.4)] hover:shadow-[0_0_20px_rgba(77,163,255,0.6)] active:scale-95"
                                >
                                    Start Negotiation
                                </button>
                            </div>

                            {negotiationResult && (
                                <div className="mt-6 p-5 bg-[#0A0F1F]/80 backdrop-blur rounded-xl border border-[#4DA3FF]/30 shadow-inner">
                                    <h3 className="text-white/90 font-black mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#4DA3FF]" /> AI Negotiation Result</h3>
                                    <p className="text-[#A0AEC0] text-sm mb-3 font-medium bg-white/5 p-3 rounded-lg border border-white/5">{negotiationResult.message}</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[#A0AEC0] text-[10px] font-bold uppercase tracking-widest mb-1">Suggested Price</p>
                                            <p className="text-white text-xl font-black">₹{negotiationResult.suggested_price?.toLocaleString("en-IN")}</p>
                                        </div>
                                        <div>
                                            <p className="text-[#A0AEC0] text-[10px] font-bold uppercase tracking-widest mb-1">Strategy</p>
                                            <p className="text-[#4DA3FF] text-sm font-bold">{negotiationResult.strategy}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* LOCATION */}
                    <div className="bg-[#121A2F]/80 backdrop-blur-md p-8 rounded-2xl shadow-[0_4px_20_rgba(0,0,0,0.3)] border border-white/5 hover:border-[#4DA3FF]/20 transition-all">
                        <h2 className="text-2xl font-bold mb-2 font-poppins text-white">Location</h2>
                        <p className="text-[#A0AEC0] font-medium mb-6 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#4DA3FF]" /> {[property.location.street, property.location.area, property.location.city, property.location.state, property.location.country].filter(Boolean).join(", ")}
                        </p>
                        {property.latitude && property.longitude ? (
                            <div className="rounded-xl overflow-hidden border border-[#4DA3FF]/20 shadow-[0_0_20px_rgba(77,163,255,0.1)]">
                                <iframe
                                    width="100%"
                                    height="300"
                                    src={`https://maps.google.com/maps?q=${property.latitude},${property.longitude}&z=15&output=embed`}
                                    className="w-full grayscale hover:grayscale-0 transition-all duration-700"
                                    loading="lazy"
                                    title="Property Location"
                                ></iframe>
                            </div>
                        ) : (
                            <div className="bg-[#0A0F1F]/60 border border-red-500/20 rounded-xl p-8 text-center">
                                <MapPin className="w-8 h-8 text-red-500/50 mx-auto mb-2" />
                                <p className="text-red-400 font-bold text-sm">Location not found</p>
                            </div>
                        )}
                    </div>

                    {/* CUSTOMER REVIEWS */}
                    <div className="relative">
                        {auth?.role === 'seller' && (
                            <div className="absolute inset-0 z-10 bg-[#0A0F1F]/40 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-8 text-center border border-[#4DA3FF]/10">
                                <p className="text-white font-bold mb-2">Notice for Sellers</p>
                                <p className="text-[#A0AEC0] text-sm">You must be a customer to write a review. Sellers cannot review properties.</p>
                            </div>
                        )}
                        <Reviews propertyId={property.id} />
                    </div>
                </motion.div>

                {/* RIGHT SECTION - ROLE AWARE PANELS */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    {/* CASE 1: SELLER VIEWING THEIR OWN PROPERTY */}
                    {isActuallyOwner ? (
                        <div className="bg-[#121A2F]/90 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#4DA3FF]/30 md:sticky md:top-28 relative overflow-hidden group/form">
                            <div className="absolute -top-[100px] -right-[100px] w-48 h-48 bg-[#4DA3FF]/10 rounded-full blur-[60px] group-hover/form:bg-[#4DA3FF]/20 transition-all duration-700"></div>

                            <div className="flex items-center gap-3 mb-2 justify-center">
                                <Activity className="w-8 h-8 text-[#4DA3FF]" />
                                <h3 className="text-2xl font-bold text-white font-poppins">Seller Control</h3>
                            </div>

                            <p className="text-[#A0AEC0] text-sm text-center mb-6 font-medium">
                                {showOwnerPreview ? "OWNER PREVIEW — This is how customers see your listing" : "This is your listing."}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-[#0A0F1F]/60 border border-[#4DA3FF]/10 p-4 rounded-xl text-center">
                                    <p className="text-[#A0AEC0] text-xs font-bold uppercase tracking-wider mb-1">Status</p>
                                    <p className={`font-bold capitalize ${property.status === 'Available' ? 'text-green-400' : 'text-yellow-400'}`}>{property.status}</p>
                                </div>
                                <div className="bg-[#0A0F1F]/60 border border-[#4DA3FF]/10 p-4 rounded-xl text-center">
                                    <p className="text-[#A0AEC0] text-xs font-bold uppercase tracking-wider mb-1">Inquiries</p>
                                    <p className="text-[#4DA3FF] font-black text-xl">Active</p>
                                </div>
                            </div>

                            <button
                                onClick={() => router.push(`/seller/edit-property/${property.id}`)}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] hover:shadow-[0_0_20px_rgba(77,163,255,0.4)] text-[#0A0F1F] py-3.5 rounded-xl font-extrabold mb-3 transition-all hover:-translate-y-0.5"
                            >
                                <Edit className="w-5 h-5" /> Edit Listing
                            </button>

                            <button
                                onClick={() => router.push(`/seller/leads`)}
                                className="w-full flex items-center justify-center gap-2 bg-[#0A0F1F] hover:bg-[#121A2F] border border-[#4DA3FF]/20 hover:border-[#4DA3FF]/50 text-white py-3.5 rounded-xl font-bold mb-3 transition-all shadow-md group"
                            >
                                <Users className="w-5 h-5 text-[#4DA3FF] group-hover:text-[#7CC4FF]" /> View Property Leads
                            </button>

                            <button
                                onClick={() => alert("Closing listing... status will be updated.")}
                                className="w-full flex items-center justify-center gap-2 bg-transparent text-[#7CC4FF] hover:text-white border border-[#4DA3FF]/20 hover:border-[#4DA3FF]/50 py-3.5 rounded-xl font-bold mb-6 transition-all shadow-md"
                            >
                                <Activity className="w-5 h-5" /> Mark Sold / Activate
                            </button>

                            <div className="relative flex py-4 items-center">
                                <div className="flex-grow border-t border-red-500/10"></div>
                                <span className="flex-shrink-0 mx-4 text-red-500/50 text-xs font-bold tracking-wider uppercase">Danger Zone</span>
                                <div className="flex-grow border-t border-red-500/10"></div>
                            </div>

                            <button
                                onClick={handleDelete}
                                className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 py-3 rounded-xl font-bold transition-all shadow-sm group"
                            >
                                <Trash2 className="w-5 h-5" /> Delete Property
                            </button>
                        </div>
                    ) : !auth?.loggedIn ? (
                        /* CASE 2: PUBLIC USER (Not Logged In) */
                        <div className="bg-[#121A2F]/90 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#4DA3FF]/30 md:sticky md:top-28 relative overflow-hidden text-center">
                            <div className="bg-[#4DA3FF]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#4DA3FF]/20 shadow-[0_0_20px_rgba(77,163,255,0.2)]">
                                <Lock className="w-10 h-10 text-[#4DA3FF]" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2 text-white font-poppins">Listing Protected</h3>
                            <p className="text-[#A0AEC0] text-sm mb-8 font-medium leading-relaxed">To view seller contact information or book a site visit, you must have a registered account.</p>

                            <button
                                onClick={() => router.push("/login/customer")}
                                className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-black py-4 rounded-xl shadow-[0_4px_15px_rgba(77,163,255,0.4)] hover:shadow-[0_0_25px_rgba(77,163,255,0.6)] transition-all mb-4"
                            >
                                Login as Customer
                            </button>
                            <Link href="/register" className="text-[#7CC4FF] text-sm font-bold hover:text-white transition-colors">Don't have an account? Register Now</Link>
                        </div>
                    ) : (
                        /* CASE 3: CUSTOMER (OR OTHER SELLER) VIEWING PROJECT */
                        <div className="bg-[#121A2F]/90 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#4DA3FF]/30 md:sticky md:top-28 relative overflow-hidden group/form">
                            {/* Glow Effects */}
                            <div className="absolute -top-[100px] -right-[100px] w-48 h-48 bg-[#4DA3FF]/10 rounded-full blur-[60px] group-hover/form:bg-[#4DA3FF]/20 transition-all duration-700"></div>

                            <h3 className="text-2xl font-bold mb-2 text-white font-poppins text-center">Interested?</h3>
                            <p className="text-[#A0AEC0] text-sm text-center mb-6 font-medium">Contact us now to schedule a site visit or ask questions.</p>

                            <div className="flex flex-col gap-3 mb-8">
                                <a
                                    href={(property?.seller_phone || property?.phone || property?.mobile_number) ? `tel:${property?.seller_phone || property?.phone || property?.mobile_number}` : "#"}
                                    onClick={(e) => {
                                        if (!(property?.seller_phone || property?.phone || property?.mobile_number) || (property?.seller_phone === "HIDDEN" || property?.mobile_number === "HIDDEN")) {
                                            alert("Contact info is only visible to verified buyers.");
                                        } else {
                                            saveContact("call");
                                        }
                                    }}
                                    className="flex items-center justify-center gap-2 w-full bg-[#0A0F1F] hover:bg-gradient-to-r hover:from-[#0A0F1F] hover:to-[#121A2F] border border-[#4DA3FF]/20 transition-all text-white py-3.5 rounded-xl font-bold shadow-md hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(77,163,255,0.2)] hover:border-[#4DA3FF]/50 group"
                                >
                                    <Phone className="w-5 h-5 text-[#4DA3FF] group-hover:drop-shadow-[0_0_8px_rgba(124,196,255,0.8)] transition-all" />
                                    Call Owner: {property?.seller_phone || property?.phone || property?.mobile_number || "Not Available"}
                                </a>
                                <a
                                    href={`https://wa.me/${businessNumber}?text=${encodeURIComponent(`I'm interested in ${property.title} (Ref: #${property.id})`)}`}
                                    target="_blank"
                                    onClick={() => saveContact("whatsapp")}
                                    className="flex items-center justify-center gap-2 w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 transition-all text-[#25D366] py-3.5 rounded-xl font-bold shadow-md hover:-translate-y-0.5"
                                >
                                    <MessageSquare className="w-5 h-5" /> WhatsApp Info
                                </a>
                            </div>

                            <div className="relative flex py-4 items-center">
                                <div className="flex-grow border-t border-white/5"></div>
                                <span className="flex-shrink-0 mx-4 text-[#A0AEC0] text-sm font-bold tracking-wider">OR GET IN TOUCH</span>
                                <div className="flex-grow border-t border-white/5"></div>
                            </div>

                            {/* TABS */}
                            <div className="flex bg-[#0A0F1F] p-1.5 rounded-xl mb-6 border border-white/5 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setFormType("visit")}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formType === "visit" ? "bg-[#121A2F] text-[#7CC4FF] border border-[#4DA3FF]/30 shadow-[0_0_10px_rgba(77,163,255,0.2)]" : "text-[#A0AEC0] hover:text-white"}`}
                                >
                                    Book Site Visit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormType("request")}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formType === "request" ? "bg-[#121A2F] text-[#7CC4FF] border border-[#4DA3FF]/30 shadow-[0_0_10px_rgba(77,163,255,0.2)]" : "text-[#A0AEC0] hover:text-white"}`}
                                >
                                    Request Details
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit} className="space-y-4 relative z-10">
                                <div className="mb-2 bg-[#0A0F1F]/60 p-3 rounded-xl border border-[#4DA3FF]/20 text-sm font-medium text-[#A0AEC0] flex justify-between shadow-inner">
                                    <span>Ref: ID <span className="text-white font-bold">#{property.id.toString().toUpperCase()}</span></span>
                                    <span className="text-[#4DA3FF]">Direct Posting</span>
                                </div>

                                <div className="group/input relative">
                                    <input
                                        type="text"
                                        required
                                        placeholder="Your Full Name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-[#0A0F1F]/80 text-white px-5 py-4 rounded-xl outline-none border border-white/10 focus:border-[#7CC4FF] focus:bg-[#0A0F1F] focus:shadow-[0_0_15px_rgba(124,196,255,0.15)] transition-all text-[15px] font-medium placeholder:text-[#A0AEC0]/60"
                                    />
                                </div>
                                <div className="group/input relative">
                                    <input
                                        type="tel"
                                        required
                                        placeholder="e.g. 9876543210 or +1..."
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-[#0A0F1F]/80 text-white px-5 py-4 rounded-xl outline-none border border-white/10 focus:border-[#7CC4FF] focus:bg-[#0A0F1F] focus:shadow-[0_0_15px_rgba(124,196,255,0.15)] transition-all text-[15px] font-medium placeholder:text-[#A0AEC0]/60"
                                    />
                                    <span className="text-[10px] text-[#A0AEC0] ml-1 mt-1 block">Include country code if outside India (e.g. +1...)</span>
                                </div>

                                {formType === "visit" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative group/input">
                                            <Calendar className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#A0AEC0] group-focus-within/input:text-[#4DA3FF] transition-colors" />
                                            <input
                                                type="date"
                                                required
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                className="w-full bg-[#0A0F1F]/80 text-white pl-12 pr-4 py-4 rounded-xl outline-none border border-white/10 focus:border-[#7CC4FF] focus:bg-[#0A0F1F] focus:shadow-[0_0_15px_rgba(124,196,255,0.15)] transition-all text-[15px] font-medium [color-scheme:dark]"
                                            />
                                        </div>
                                        <div className="relative group/input">
                                            <Clock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#A0AEC0] group-focus-within/input:text-[#4DA3FF] transition-colors" />
                                            <input
                                                type="time"
                                                required
                                                value={formData.time}
                                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                                className="w-full bg-[#0A0F1F]/80 text-white pl-12 pr-4 py-4 rounded-xl outline-none border border-white/10 focus:border-[#7CC4FF] focus:bg-[#0A0F1F] focus:shadow-[0_0_15px_rgba(124,196,255,0.15)] transition-all text-[15px] font-medium [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="group/input relative">
                                    <textarea
                                        required={formType === "request"}
                                        placeholder={formType === "visit" ? "Preferred time / specific notes?" : "What details would you like to receive?"}
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full bg-[#0A0F1F]/80 text-white px-5 py-4 rounded-xl outline-none border border-white/10 focus:border-[#7CC4FF] focus:bg-[#0A0F1F] focus:shadow-[0_0_15px_rgba(124,196,255,0.15)] transition-all text-[15px] font-medium min-h-[100px] resize-none placeholder:text-[#A0AEC0]/60"
                                    ></textarea>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] hover:shadow-[0_0_25px_rgba(77,163,255,0.5)] transition-all duration-300 py-4 rounded-xl font-extrabold text-[#0A0F1F] mt-2 group/btn relative overflow-hidden"
                                >
                                    <span className="relative z-10">{formType === "visit" ? "Request Site Visit" : "Send Inquiry"}</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#7CC4FF] to-[#4DA3FF] opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                </motion.button>
                            </form>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
