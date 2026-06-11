"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getAuth } from "@/lib/auth";
import {
    fetchStartupDetail,
    saveStartup,
    unsaveStartup,
    requestPitchDeck,
    contactFounder,
    expressInterest,
    type StartupRow,
} from "@/lib/startupApi";
import { Building2, Heart, FileText, Mail, TrendingUp, ExternalLink } from "lucide-react";

export default function StartupDetailPage() {
    const params = useParams();
    const id = Number(params.id);
    const [startup, setStartup] = useState<StartupRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionMsg, setActionMsg] = useState("");
    const [contactOpen, setContactOpen] = useState(false);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const auth = getAuth();
    const isInvestor = auth?.loggedIn && ["investor", "customer"].includes((auth.role || "").toLowerCase());

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setStartup(await fetchStartupDetail(id));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load startup");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const runAction = async (fn: () => Promise<void>, msg: string) => {
        if (!isInvestor) { setActionMsg("Please log in as an investor to perform this action."); return; }
        setActionMsg("");
        try {
            await fn();
            setActionMsg(msg);
            await load();
        } catch (e) {
            setActionMsg(e instanceof Error ? e.message : "Action failed");
        }
    };

    if (loading) return <main className="bg-[#0A0F1F] min-h-screen pt-24 text-[#A0AEC0] text-center">Loading…</main>;
    if (error || !startup) return <main className="bg-[#0A0F1F] min-h-screen pt-24 text-red-400 text-center">{error || "Not found"}</main>;

    return (
        <main className="bg-[#0A0F1F] min-h-screen text-white pt-24">
            <Navbar />
            <div className="max-w-5xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row gap-8 mb-10">
                    <div className="w-32 h-32 bg-[#121A2F] rounded-2xl flex items-center justify-center border border-[#4DA3FF]/20 shrink-0">
                        {startup.logo_url ? <img src={startup.logo_url} alt="" className="w-20 h-20 object-contain" /> : <Building2 className="w-16 h-16 text-[#4DA3FF]/40" />}
                    </div>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h1 className="text-3xl font-extrabold">{startup.name}</h1>
                            {startup.verification_status === "verified" && (
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">Verified</span>
                            )}
                        </div>
                        <p className="text-[#A0AEC0] mb-2">{startup.founder_name}{startup.co_founder_name ? ` & ${startup.co_founder_name}` : ""}</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {startup.industry && <span className="text-xs font-bold text-[#4DA3FF] bg-[#4DA3FF]/10 px-2 py-1 rounded-lg">{startup.industry}</span>}
                            {startup.stage && <span className="text-xs font-bold text-[#7CC4FF] bg-[#7CC4FF]/10 px-2 py-1 rounded-lg">{startup.stage}</span>}
                            {startup.country && <span className="text-xs text-[#A0AEC0]">{startup.country}</span>}
                        </div>
                        {startup.website && (
                            <a href={startup.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-[#4DA3FF] font-semibold">
                                Website <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                </div>

                {actionMsg && <div className="mb-4 rounded-xl border border-[#4DA3FF]/30 bg-[#4DA3FF]/10 px-4 py-3 text-sm text-[#7CC4FF]">{actionMsg}</div>}

                {isInvestor && (
                    <div className="flex flex-wrap gap-3 mb-10">
                        <button type="button" onClick={() => runAction(() => startup.is_saved ? unsaveStartup(id) : saveStartup(id), startup.is_saved ? "Removed from saved" : "Saved!")} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#4DA3FF]/30 text-sm font-semibold">
                            <Heart size={16} className={startup.is_saved ? "fill-pink-400 text-pink-400" : ""} /> {startup.is_saved ? "Saved" : "Save"}
                        </button>
                        <button type="button" onClick={() => runAction(() => requestPitchDeck(id), "Pitch deck requested!")} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#4DA3FF]/30 text-sm font-semibold">
                            <FileText size={16} /> Request Deck
                        </button>
                        <button type="button" onClick={() => setContactOpen(!contactOpen)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#4DA3FF]/30 text-sm font-semibold">
                            <Mail size={16} /> Contact Founder
                        </button>
                        <button type="button" onClick={() => runAction(() => expressInterest(id, "high"), "Interest expressed!")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4DA3FF] text-[#0A0F1F] text-sm font-extrabold">
                            <TrendingUp size={16} /> Express Interest
                        </button>
                    </div>
                )}

                {contactOpen && (
                    <div className="mb-10 bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-6">
                        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full mb-3 bg-[#0A0F1F] border border-white/10 rounded-xl px-4 py-2 text-sm" />
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your message (min 10 chars)" className="w-full mb-3 bg-[#0A0F1F] border border-white/10 rounded-xl px-4 py-2 text-sm min-h-[100px]" />
                        <button type="button" onClick={() => runAction(() => contactFounder(id, subject, message), "Message sent!")} className="px-4 py-2 rounded-xl bg-[#4DA3FF] text-[#0A0F1F] font-bold text-sm">Send</button>
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-4 mb-10">
                    <div className="bg-[#121A2F]/80 border border-white/5 rounded-xl p-4"><p className="text-xs text-[#A0AEC0] uppercase font-bold">Seeking</p><p className="text-xl font-bold">${(startup.funding_requirement || 0).toLocaleString()}</p></div>
                    <div className="bg-[#121A2F]/80 border border-white/5 rounded-xl p-4"><p className="text-xs text-[#A0AEC0] uppercase font-bold">Raised</p><p className="text-xl font-bold">${(startup.funding_raised || 0).toLocaleString()}</p></div>
                    <div className="bg-[#121A2F]/80 border border-white/5 rounded-xl p-4"><p className="text-xs text-[#A0AEC0] uppercase font-bold">Team</p><p className="text-xl font-bold">{startup.team_size ?? "—"}</p></div>
                </div>

                {[
                    ["Description", startup.description],
                    ["Problem", startup.problem_statement],
                    ["Solution", startup.solution],
                    ["Target Market", startup.target_market],
                    ["Business Model", startup.business_model],
                ].map(([title, content]) => content && (
                    <section key={title as string} className="mb-8">
                        <h2 className="text-lg font-bold text-[#7CC4FF] mb-2">{title}</h2>
                        <p className="text-[#A0AEC0] leading-relaxed whitespace-pre-wrap">{content}</p>
                    </section>
                ))}
            </div>
            <Footer />
        </main>
    );
}
