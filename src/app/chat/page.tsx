"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export default function ChatPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const auth = getAuth();
        
        // 1. Role-based access control
        // 3. Protect routes: redirect sellers if they try to access chat route
        if (!auth || !auth.loggedIn || auth.role !== "customer") {
            if (auth?.role === "seller") {
                router.replace("/seller/dashboard");
            } else {
                router.replace("/login/customer");
            }
            return;
        }
        setIsAuthorized(true);
    }, [router]);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center text-[#4DA3FF] animate-pulse">
                Authorizing secure connection...
            </div>
        );
    }

    return (
        <main className="bg-[#0A0F1F] min-h-screen text-white font-inter">
            <Navbar />
            
            <div className="pt-32 pb-16 px-6 max-w-5xl mx-auto relative z-10">
                <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 font-poppins drop-shadow-md">
                    Secure <span className="text-[#4DA3FF]">Chat</span>
                </h1>
                <p className="text-[#A0AEC0] text-sm mb-8 font-medium">Customer-only secure messaging portal.</p>
                
                <div className="bg-[#121A2F]/80 backdrop-blur-md border border-[#4DA3FF]/10 p-16 rounded-2xl text-center shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <h2 className="text-xl font-bold text-white mb-4">No Active Conversations</h2>
                    <p className="text-[#A0AEC0] max-w-md mx-auto mb-8">
                        You haven't started any chats with property agents yet. Browse our premium listings to find the perfect property and get in touch with sellers directly.
                    </p>
                    <button onClick={() => router.push('/plots')} className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold px-8 py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(124,196,255,0.4)] hover:-translate-y-0.5 transition-all duration-300">
                        Explore Properties
                    </button>
                </div>
            </div>
        </main>
    );
}
