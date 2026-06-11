"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuth, clearAuth } from "@/lib/auth";
import Link from "next/link";
import { LayoutDashboard, Rocket, Edit3, LogOut, Menu, X } from "lucide-react";

const NAV = [
    { name: "Dashboard", href: "/founder/dashboard", icon: LayoutDashboard },
    { name: "Edit Startup", href: "/founder/startups/edit", icon: Edit3 },
];

const FOUNDER_ROLES = ["startup_founder", "seller"];

export default function FounderLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const auth = getAuth();
        const role = (auth?.role || "").toLowerCase();
        if (!auth?.loggedIn || !FOUNDER_ROLES.includes(role)) {
            router.replace("/login/seller");
            return;
        }
        setIsAuthorized(true);
    }, [router, pathname]);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center text-[#4DA3FF] font-semibold animate-pulse">
                Verifying founder access…
            </div>
        );
    }

    const handleLogout = () => {
        clearAuth();
        router.push("/");
    };

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

    return (
        <div className="min-h-screen bg-[#0A0F1F] text-white flex flex-col">
            <header className="h-16 border-b border-[#4DA3FF]/20 bg-[#121A2F]/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button type="button" className="md:hidden text-[#A0AEC0]" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <Link href="/founder/dashboard" className="text-xl font-extrabold">
                        BLACKSPIRE <span className="text-[#4DA3FF] text-[10px] tracking-[0.3em] block -mt-1">FOUNDER</span>
                    </Link>
                </div>
                <button type="button" onClick={handleLogout} className="flex items-center gap-2 text-[#A0AEC0] hover:text-white text-sm font-semibold">
                    <LogOut size={18} /> Logout
                </button>
            </header>
            <div className="flex flex-1">
                <aside className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#121A2F]/90 border-r border-[#4DA3FF]/20 p-6 transition-transform`}>
                    <nav className="space-y-2 mt-16 md:mt-4">
                        {NAV.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                                    isActive(item.href) ? "bg-[#4DA3FF]/20 text-[#7CC4FF]" : "text-[#A0AEC0] hover:bg-white/5 hover:text-white"
                                }`}
                            >
                                <item.icon size={18} />
                                {item.name}
                            </Link>
                        ))}
                        <Link href="/startups" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#A0AEC0] hover:bg-white/5 hover:text-white">
                            <Rocket size={18} /> Marketplace
                        </Link>
                    </nav>
                </aside>
                <main className="flex-1 overflow-y-auto p-6 md:p-12">{children}</main>
            </div>
        </div>
    );
}
