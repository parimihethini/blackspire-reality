"use client";

import { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";
import Link from "next/link";
import { PlusCircle, List, Users, Calendar, User } from "lucide-react";

export default function SellerDashboard() {
    const [email, setEmail] = useState("");

    useEffect(() => {
        const auth = getAuth();
        if (auth) {
            setEmail(auth?.email || "");
        }
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 relative">
            <h1 className="text-4xl font-extrabold text-[#ffffff] mb-2 font-poppins drop-shadow-md">Seller Workspace</h1>
            <p className="text-[#A0AEC0] mb-10 font-medium">Logged in as <span className="text-[#4DA3FF] font-bold">{email}</span></p>

            <div className="grid md:grid-cols-3 gap-6 mb-12 relative z-10">
                <Link href="/seller/add-property" className="group bg-[#121A2F]/80 backdrop-blur-md border border-[#4DA3FF]/10 p-8 rounded-2xl hover:border-[#4DA3FF]/40 hover:shadow-[0_10px_30px_rgba(77,163,255,0.15)] transition-all duration-300 text-center flex flex-col items-center hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#4DA3FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <PlusCircle className="w-12 h-12 text-[#4DA3FF] mb-4 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(124,196,255,0.8)] transition-all z-10" />
                    <h2 className="text-lg font-bold text-white mb-2 z-10">Publish New Listing</h2>
                    <p className="text-[#A0AEC0] text-sm font-medium z-10">Add a new property to the market</p>
                </Link>

                <Link href="/seller/my-properties" className="group bg-[#121A2F]/80 backdrop-blur-md border border-[#4DA3FF]/10 p-8 rounded-2xl hover:border-[#4DA3FF]/40 hover:shadow-[0_10px_30px_rgba(77,163,255,0.15)] transition-all duration-300 text-center flex flex-col items-center hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#4DA3FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <List className="w-12 h-12 text-[#4DA3FF] mb-4 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(124,196,255,0.8)] transition-all z-10" />
                    <h2 className="text-lg font-bold text-white mb-2 z-10">Manage Listings</h2>
                    <p className="text-[#A0AEC0] text-sm font-medium z-10">Edit or remove your properties</p>
                </Link>

                <Link href="/seller/leads" className="group bg-[#121A2F]/80 backdrop-blur-md border border-[#4DA3FF]/10 p-8 rounded-2xl hover:border-[#4DA3FF]/40 hover:shadow-[0_10px_30px_rgba(77,163,255,0.15)] transition-all duration-300 text-center flex flex-col items-center hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#4DA3FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Users className="w-12 h-12 text-[#4DA3FF] mb-4 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(124,196,255,0.8)] transition-all z-10" />
                    <h2 className="text-lg font-bold text-white mb-2 z-10">View Buyer Leads</h2>
                    <p className="text-[#A0AEC0] text-sm font-medium z-10">Manage your active buyer inquiries</p>
                </Link>

                <Link href="/seller/visits" className="group bg-[#121A2F]/80 backdrop-blur-md border border-[#4DA3FF]/10 p-8 rounded-2xl hover:border-[#4DA3FF]/40 hover:shadow-[0_10px_30px_rgba(77,163,255,0.15)] transition-all duration-300 text-center flex flex-col items-center hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#4DA3FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Calendar className="w-12 h-12 text-[#4DA3FF] mb-4 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(124,196,255,0.8)] transition-all z-10" />
                    <h2 className="text-lg font-bold text-white mb-2 z-10">Site Visit Requests</h2>
                    <p className="text-[#A0AEC0] text-sm font-medium z-10">Approve or reschedule property visits</p>
                </Link>

                <Link href="/seller/profile" className="group bg-[#121A2F]/80 backdrop-blur-md border border-[#4DA3FF]/10 p-8 rounded-2xl hover:border-[#4DA3FF]/40 hover:shadow-[0_10px_30px_rgba(77,163,255,0.15)] transition-all duration-300 text-center flex flex-col items-center hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#4DA3FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <User className="w-12 h-12 text-[#4DA3FF] mb-4 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(124,196,255,0.8)] transition-all z-10" />
                    <h2 className="text-lg font-bold text-white mb-2 z-10">Seller Profile</h2>
                    <p className="text-[#A0AEC0] text-sm font-medium z-10">Manage your contact and business details</p>
                </Link>
            </div>
        </div>
    );
}
