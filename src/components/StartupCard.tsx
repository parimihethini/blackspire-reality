"use client";

import Link from "next/link";
import { Building2, MapPin, Users, DollarSign } from "lucide-react";
import type { StartupRow } from "@/lib/startupApi";

function formatMoney(value: number | null | undefined): string {
    if (value == null) return "—";
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
}

export default function StartupCard({ startup }: { startup: StartupRow }) {
    return (
        <Link
            href={`/startups/${startup.id}`}
            className="group bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl overflow-hidden hover:border-[#4DA3FF]/50 hover:shadow-[0_0_30px_rgba(77,163,255,0.15)] transition-all"
        >
            <div className="h-40 bg-[#0A0F1F] flex items-center justify-center border-b border-white/5">
                {startup.logo_url ? (
                    <img src={startup.logo_url} alt={startup.name} className="h-20 w-20 object-contain rounded-xl" />
                ) : (
                    <Building2 className="w-16 h-16 text-[#4DA3FF]/40" />
                )}
            </div>
            <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#7CC4FF] transition-colors line-clamp-1">
                        {startup.name}
                    </h3>
                    {startup.verification_status === "verified" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full shrink-0">
                            Verified
                        </span>
                    )}
                </div>
                <p className="text-sm text-[#A0AEC0] mb-3 line-clamp-2">{startup.description || "No description yet."}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                    {startup.industry && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#4DA3FF] bg-[#4DA3FF]/10 px-2 py-1 rounded-lg">
                            {startup.industry}
                        </span>
                    )}
                    {startup.stage && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7CC4FF] bg-[#7CC4FF]/10 px-2 py-1 rounded-lg">
                            {startup.stage}
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#A0AEC0]">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {startup.country || startup.location || "—"}</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {startup.team_size ?? "—"} team</span>
                    <span className="flex items-center gap-1 col-span-2"><DollarSign size={12} /> Seeking {formatMoney(startup.funding_requirement)}</span>
                </div>
            </div>
        </Link>
    );
}
