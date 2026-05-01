"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getPropertyById } from "@/data/properties";
import PropertyClient from "./PropertyClient";
import Navbar from "@/components/Navbar";

export default function PropertyDetails() {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params?.id as string;
    const preview = searchParams?.get("preview") ?? undefined;
    const [property, setProperty] = useState<any>(undefined);

    useEffect(() => {
        console.log("[PropertyPage] id from params:", id);

        // Guard: id is literally the string "undefined", missing, or not a number
        if (!id || id === "undefined" || isNaN(Number(id))) {
            console.warn("[PropertyPage] Invalid property ID handled:", id);
            setProperty(null);
            return;
        }

        getPropertyById(id)
            .then(found => {
                console.log("[PropertyPage] Property loaded:", found);
                setProperty(found ?? null);
            })
            .catch(() => {
                setProperty(null);
            });
    }, [id, preview]);

    // Still loading
    if (property === undefined) {
        return (
            <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center text-[#4DA3FF] animate-pulse">
                <Navbar />
                <p className="text-lg font-bold mt-24">Loading property...</p>
            </div>
        );
    }

    // Not found
    if (property === null) {
        return (
            <div className="min-h-screen bg-[#0A0F1F] flex flex-col items-center justify-center text-white">
                <Navbar />
                <div className="text-center mt-24 px-6">
                    <p className="text-6xl mb-4">🏚</p>
                    <h1 className="text-3xl font-extrabold mb-3">Property Not Found</h1>
                    <p className="text-[#A0AEC0] mb-8">This listing may have been removed or is unavailable.</p>
                    <a href="/plots" className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold px-8 py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(77,163,255,0.4)] transition-all">
                        Browse Listings
                    </a>
                </div>
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <PropertyClient property={property} />
        </>
    );
}