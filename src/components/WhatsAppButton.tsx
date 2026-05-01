"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";

export default function WhatsAppButton() {
    const [role, setRole] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const auth = getAuth();
        if (auth) {
            setRole(auth.role || null);
        }
        
        // Listen to storage changes to update role dynamically
        const handleStorage = () => {
            const currentAuth = getAuth();
            setRole(currentAuth?.role || null);
        };
        window.addEventListener('auth-change', handleStorage);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('auth-change', handleStorage);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    // Return null during SSR to avoid hydration mismatch
    if (!isMounted) return null;

    // 2. Hide Chat for sellers completely
    if (role === "seller") return null;

    const businessNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "918148688987";
    const message = encodeURIComponent("Hello I am interested in a property");
    const waUrl = `https://wa.me/${businessNumber}?text=${message}`;

    return (
        <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 bg-gradient-to-tr from-[#25D366] to-[#40E0D0] text-[#0A0F1F] p-4 rounded-full shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:shadow-[0_0_30px_rgba(37,211,102,0.6)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite] group"
            aria-label="Chat on WhatsApp"
        >
            <MessageCircle className="w-7 h-7 drop-shadow-sm" />

            <span className="absolute right-16 bg-[#121A2F]/90 backdrop-blur-md text-white text-sm font-bold px-4 py-2 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.3)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap border border-white/10 hidden md:block">
                Chat on WhatsApp
            </span>
        </a>
    );
}
