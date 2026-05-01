"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuth, clearAuth } from "@/lib/auth";
import Link from "next/link";
import { LayoutDashboard, PlusCircle, List, Users, User, Calendar, LogOut, Menu, X } from "lucide-react";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const auth = getAuth();
        const isLoginPage = pathname === "/seller/login";

        if (isLoginPage) {
            if (auth?.loggedIn && auth.role === "seller") {
                router.push("/seller/dashboard");
                return;
            }
            setIsAuthorized(true);
            return;
        }

        if (!auth || !auth.loggedIn || auth.role !== "seller") {
            // Clear any stale non-seller auth before redirecting to login
            if (auth && auth.loggedIn && auth.role !== "seller") {
                clearAuth();
            }
            router.push("/seller/login");
            return;
        }
        setIsAuthorized(true);
    }, [router, pathname]);

    if (!isAuthorized) {
        return <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center text-[#4DA3FF] animate-pulse">Loading workspace...</div>;
    }

    // If it's the login page, we don't want the seller sidebar/header
    if (pathname === "/seller/login") {
        return <div className="min-h-screen bg-[#0A0F1F]">{children}</div>;
    }

    const handleLogout = () => {
        clearAuth();
        router.push("/");
    };

    const navItems = [
        { name: "Dashboard", href: "/seller/dashboard", icon: LayoutDashboard },
        { name: "Publish New Listing", href: "/seller/add-property", icon: PlusCircle },
        { name: "Manage Listings", href: "/seller/my-properties", icon: List },
        { name: "Buyer Leads", href: "/seller/leads", icon: Users },
        { name: "Visit Requests", href: "/seller/visits", icon: Calendar },
        { name: "Settings/Profile", href: "/seller/profile", icon: User },
    ];

    const isActive = (path: string) => pathname === path;

    return (
        <div className="min-h-screen bg-[#0A0F1F] text-white flex flex-col font-inter selection:bg-[#4DA3FF]/30 selection:text-white">
            {/* Top Bar */}
            <header className="h-16 border-b border-[#4DA3FF]/10 bg-[#121A2F]/80 backdrop-blur-xl flex items-center justify-between px-6 z-50 sticky top-0 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-4">
                    <button className="md:hidden text-[#A0AEC0] hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <Link href="/seller/dashboard" className="flex items-center gap-2 group">
                        <h1 className="text-xl font-extrabold tracking-tight text-white flex flex-col group-hover:text-[#7CC4FF] transition-colors duration-300 drop-shadow-md">
                            BLACKSPIRE
                            <span className="text-[#4DA3FF] text-[10px] tracking-[0.3em] font-semibold -mt-1 uppercase drop-shadow-[0_0_8px_rgba(77,163,255,0.5)]">SELLER</span>
                        </h1>
                    </Link>
                </div>

                <div className="hidden md:flex items-center gap-6">
                    <Link href="/seller/dashboard" className="text-sm font-bold text-[#A0AEC0] hover:text-[#7CC4FF] transition-colors">Dashboard</Link>
                    <Link href="/seller/add-property" className="text-sm font-bold text-[#A0AEC0] hover:text-[#7CC4FF] transition-colors">Add Property</Link>
                    <Link href="/seller/my-properties" className="text-sm font-bold text-[#A0AEC0] hover:text-[#7CC4FF] transition-colors">My Listings</Link>
                    <Link href="/seller/leads" className="text-sm font-bold text-[#A0AEC0] hover:text-[#7CC4FF] transition-colors">Buyer Leads</Link>
                    <Link href="/seller/visits" className="text-sm font-bold text-[#A0AEC0] hover:text-[#7CC4FF] transition-colors">Visits</Link>
                    <Link href="/seller/profile" className="text-sm font-bold text-[#A0AEC0] hover:text-[#7CC4FF] transition-colors">Profile</Link>
                    <button onClick={handleLogout} className="text-sm font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-md hover:bg-red-500/20">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar */}
                <aside className={`absolute md:static top-0 left-0 h-full w-64 bg-[#121A2F]/90 backdrop-blur-xl border-r border-[#4DA3FF]/10 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 z-40 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] md:shadow-none`}>
                    <nav className="flex-1 px-4 py-8 flex flex-col gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link 
                                    key={item.href} 
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300
                                        ${isActive(item.href) ? 'bg-[#4DA3FF]/10 text-[#7CC4FF] border border-[#4DA3FF]/30 shadow-[0_0_15px_rgba(77,163,255,0.15)]' : 'text-[#A0AEC0] hover:text-white hover:bg-[#0A0F1F]/60 border border-transparent'}
                                    `}
                                >
                                    <Icon size={18} className={isActive(item.href) ? "drop-shadow-[0_0_8px_rgba(124,196,255,0.6)]" : ""} />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>
                    <div className="p-4 mt-auto border-t border-[#4DA3FF]/10">
                        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full text-left">
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto w-full custom-scrollbar">
                    {children}
                </main>
            </div>
            
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}
