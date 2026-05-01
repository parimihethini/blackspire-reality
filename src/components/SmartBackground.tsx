"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type BackgroundStyle = "homepage" | "login" | "property" | "dashboard" | "default";

function getBackgroundStyle(pathname: string): BackgroundStyle {
    if (pathname === "/") return "homepage";
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) return "login";
    if (pathname.startsWith("/property")) return "property";
    if (
        pathname.startsWith("/seller") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/customer")
    )
        return "dashboard";
    return "default";
}

export default function SmartBackground() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const style = getBackgroundStyle(pathname);

    /* ─────────────────────────── HOMEPAGE ─────────────────────────── */
    if (style === "homepage") {
        return (
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#060B18]">
                {/* Deep navy base */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#080E1E] via-[#0A1024] to-[#060B18]" />

                {/* Large primary blue orb — top left */}
                <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.28, 0.15], x: [0, 80, 0], y: [0, 50, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-[20%] -left-[10%] w-[65rem] h-[65rem] bg-[#1A5FAA] rounded-full blur-[180px]"
                />

                {/* Accent teal orb — bottom right */}
                <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.08, 0.18, 0.08], x: [0, -60, 0], y: [0, -70, 0] }}
                    transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
                    className="absolute -bottom-[20%] -right-[12%] w-[55rem] h-[55rem] bg-[#1E7BC4] rounded-full blur-[180px]"
                />

                {/* Center indigo orb — floating mid section */}
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.13, 0.05], y: [0, -50, 0] }}
                    transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                    className="absolute top-[30%] left-[20%] w-[45rem] h-[45rem] bg-[#2D3FA6] rounded-full blur-[160px]"
                />

                {/* Top-right highlight sparkle orb */}
                <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [0.04, 0.1, 0.04] }}
                    transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute top-[5%] right-[8%] w-[20rem] h-[20rem] bg-[#4DA3FF] rounded-full blur-[100px]"
                />

                {/* Fine cross-hatched grid for depth */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(77,163,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(77,163,255,0.022)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_90%_80%_at_50%_40%,black_5%,transparent_100%)]" />

                {/* Bottom vignette — smooth fade into dark for below-hero sections */}
                <div className="absolute bottom-0 left-0 right-0 h-[40vh] bg-gradient-to-t from-[#060B18] to-transparent" />
            </div>
        );
    }

    /* ───────────────────────────── LOGIN ───────────────────────────── */
    if (style === "login") {
        return (
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#070B17]">
                {/* Base gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#090E1C] via-[#0C1432] to-[#070B17]" />

                {/* Slow rotating conic beam */}
                <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vw] h-[140vh] opacity-[0.12]"
                    style={{
                        background:
                            "conic-gradient(from 0deg, transparent 0deg, #4DA3FF 55deg, transparent 110deg, #7CC4FF 170deg, transparent 230deg, #4DA3FF 290deg, transparent 360deg)",
                    }}
                />

                {/* Breathing blue orb — top left */}
                <motion.div
                    animate={{ scale: [1, 1.25, 1], opacity: [0.1, 0.22, 0.1] }}
                    transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-[25%] -left-[15%] w-[45rem] h-[45rem] bg-[#2A6FC4] rounded-full blur-[130px]"
                />

                {/* Breathing accent — bottom right */}
                <motion.div
                    animate={{ scale: [1, 1.35, 1], opacity: [0.06, 0.16, 0.06] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                    className="absolute -bottom-[25%] -right-[15%] w-[40rem] h-[40rem] bg-[#1E85CC] rounded-full blur-[110px]"
                />

                {/* Dot grid overlay */}
                <div className="absolute inset-0 [background-image:radial-gradient(rgba(77,163,255,0.09)_1px,transparent_1px)] [background-size:28px_28px]" />

                {/* Center subtle radial highlight */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(77,163,255,0.06)_0%,transparent_100%)]" />
            </div>
        );
    }

    /* ─────────────────────────── PROPERTY ─────────────────────────── */
    if (style === "property") {
        return (
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#0A0F1F]">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A1120] via-[#0A0F1F] to-[#080D1A]" />
                {/* Soft top-right ambient */}
                <div className="absolute -top-10 right-0 w-[28rem] h-[28rem] bg-[#1A5FAA]/8 rounded-full blur-[120px]" />
                {/* Bottom-left ambient */}
                <div className="absolute -bottom-10 -left-10 w-[22rem] h-[22rem] bg-[#4DA3FF]/5 rounded-full blur-[100px]" />
            </div>
        );
    }

    /* ─────────────────────────── DASHBOARD ─────────────────────────── */
    if (style === "dashboard") {
        return (
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#0A0F1F]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1F] via-[#0B1224] to-[#080D1A]" />

                {/* Blueprint / corporate grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(77,163,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(77,163,255,0.028)_1px,transparent_1px)] bg-[size:64px_64px]" />

                {/* Corner accent orbs */}
                <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#4DA3FF]/7 rounded-full blur-[100px]" />
                <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#7CC4FF]/5 rounded-full blur-[80px]" />
            </div>
        );
    }

    /* ─────────────────────────── DEFAULT ─────────────────────────── */
    // Plots, houses, investments, etc.
    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#0A0F1F]">
            <div className="absolute inset-0 bg-[#0A0F1F]" />
            <motion.div
                animate={{ opacity: [0.07, 0.14, 0.07], scale: [1, 1.12, 1] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[12%] -right-[6%] w-[38rem] h-[38rem] bg-[#1A6AC4] rounded-full blur-[150px]"
            />
            <motion.div
                animate={{ opacity: [0.04, 0.11, 0.04], scale: [1, 1.18, 1] }}
                transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 3 }}
                className="absolute -bottom-[12%] -left-[6%] w-[32rem] h-[32rem] bg-[#1E79B4] rounded-full blur-[130px]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.016)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]" />
        </div>
    );
}
