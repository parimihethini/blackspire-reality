"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuth, clearAuth } from "@/lib/auth";
import Link from "next/link";
import { LayoutDashboard, Users, Home, BarChart3, LogOut, Menu, X } from "lucide-react";

const NAV = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Properties", href: "/admin/properties", icon: Home },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const auth = getAuth();
        if (!auth || !auth.loggedIn || auth.role !== "admin") {
            router.replace("/login/admin");
            return;
        }
        setIsAuthorized(true);
    }, [router, pathname]);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center text-[#4DA3FF] font-semibold animate-pulse">
                Verifying admin access…
            </div>
        );
    }

    const handleLogout = () => {
        clearAuth();
        router.push("/");
    };

    const isActive = (href: string) =>
        pathname === href ||
        (href === "/admin/dashboard" && pathname === "/admin") ||
        (href !== "/admin/dashboard" && pathname.startsWith(href + "/"));

    return (
        <div className="min-h-screen bg-[#0A0F1F] text-[#FFFFFF] flex flex-col font-inter relative overflow-hidden">
            <header className="h-16 border-b border-[#4DA3FF]/20 bg-[#121A2F]/80 backdrop-blur-xl flex items-center justify-between px-6 z-50 sticky top-0 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        className="md:hidden text-[#A0AEC0] hover:text-[#FFFFFF] transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <Link href="/admin/dashboard" className="flex items-center gap-2 group">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#FFFFFF] flex flex-col drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all">
                            BLACKSPIRE
                            <span className="text-[#4DA3FF] text-[10px] tracking-[0.3em] font-bold -mt-1 uppercase drop-shadow-[0_0_8px_rgba(77,163,255,0.6)]">
                                ADMIN
                            </span>
                        </h1>
                    </Link>
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="text-sm font-bold text-red-400 hover:text-red-300 transition-all flex items-center gap-1"
                >
                    <LogOut size={16} /> Logout
                </button>
            </header>

            <div className="flex flex-1 overflow-hidden relative z-10">
                <aside
                    className={`absolute md:static top-0 left-0 h-full w-64 bg-[#121A2F]/80 backdrop-blur-xl border-r border-[#4DA3FF]/20 transform ${
                        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    } md:translate-x-0 transition-transform duration-300 z-40 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] md:shadow-none`}
                >
                    <nav className="flex-1 px-4 py-8 flex flex-col gap-2">
                        {NAV.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300
                                        ${
                                            active
                                                ? "bg-[#4DA3FF]/10 text-[#7CC4FF] border border-[#4DA3FF]/30 shadow-[0_0_15px_rgba(77,163,255,0.15)]"
                                                : "text-[#A0AEC0] hover:text-[#FFFFFF] hover:bg-[#0A0F1F]/60"
                                        }
                                    `}
                                >
                                    <Icon size={18} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <main className="flex-1 overflow-y-auto w-full custom-scrollbar p-6 md:p-12 relative z-10">{children}</main>
            </div>

            {isMobileMenuOpen && (
                <button
                    type="button"
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm border-0 cursor-default"
                    aria-label="Close menu"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}
