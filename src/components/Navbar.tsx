"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuth, clearAuth } from '@/lib/auth';
import { authFetch, API_ORIGIN } from '@/lib/api';
import { ensurePushSubscribed } from '@/lib/push';
import NotificationBell from '@/components/NotificationBell';

export default function Navbar() {
    const [auth, setAuth] = useState<{ role: string; loggedIn: boolean; email?: string; profile_image?: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = () => setAuth(getAuth());
        checkAuth();
        window.addEventListener('storage', checkAuth);
        return () => window.removeEventListener('storage', checkAuth);
    }, []);


    useEffect(() => {
        if (auth?.loggedIn) {
            ensurePushSubscribed().catch((e) => console.warn("Push subscribe failed:", e));
        }
    }, [auth?.loggedIn]);

    // Legacy property notifications removed — handled by NotificationBell component

    // Legacy mark-read removed — handled by NotificationBell component

    const handleLogout = () => {
        clearAuth();
        router.push('/');
    };
    const [isScrolled, setIsScrolled] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const getNavLinks = () => {
        const baseLinks = [
            { name: 'Home', path: '/' },
            { name: 'Startups', path: '/startups' },
            { name: 'Plots', path: '/plots' },
            { name: 'Houses', path: '/houses' },
            { name: 'AI Verification', path: '/ai-tools/documents' },
        ];

        if (!auth?.loggedIn) {
            return baseLinks;
        }

        if (auth.role === 'startup_founder') {
            return [
                { name: 'Dashboard', path: '/founder/dashboard' },
                { name: 'Edit Startup', path: '/founder/startups/edit' },
                { name: 'Marketplace', path: '/startups' },
            ];
        }

        if (auth.role === 'seller') {
            return [
                { name: 'Dashboard', path: '/seller/dashboard' },
                { name: 'Add Property', path: '/seller/add-property' },
                { name: 'My Listings', path: '/seller/my-properties' },
                { name: 'Buyer Leads', path: '/seller/leads' },
                { name: 'Visits', path: '/seller/visits' },
                { name: 'Profile', path: '/seller/profile' },
            ];
        }

        if (auth.role === 'investor') {
            return [
                ...baseLinks,
                { name: 'Portfolio', path: '/investor/dashboard' },
                { name: 'Messages', path: '/messaging' },
                { name: 'Saved Startups', path: '/startups' },
            ];
        }

        if (auth.role === 'startup_founder') {
            return [
                { name: 'Dashboard', path: '/founder/dashboard' },
                { name: 'Edit Startup', path: '/founder/startups/edit' },
                { name: 'CRM', path: '/founder/crm' },
                { name: 'Messages', path: '/messaging' },
                { name: 'Marketplace', path: '/startups' },
            ];
        }

        // Customer or Admin
        return baseLinks;
    };


    const navLinks = getNavLinks();
    const profileImageSrc = auth?.profile_image
        ? auth.profile_image.startsWith("http://") || auth.profile_image.startsWith("https://")
            ? auth.profile_image
            : `${API_ORIGIN}/${auth.profile_image}`
        : null;

    return (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-[#0A0F1F]/70 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : 'bg-transparent'}`}>
            <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <h1 className="text-xl font-extrabold tracking-tight text-white flex flex-col group-hover:text-[#7CC4FF] transition-colors duration-300 drop-shadow-md">
                        BLACKSPIRE
                        <span className="text-[#4DA3FF] text-[10px] tracking-[0.3em] font-semibold -mt-1 uppercase drop-shadow-[0_0_8px_rgba(77,163,255,0.5)]">REALITY</span>
                    </h1>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-white/90">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.path;
                        return (
                            <Link key={link.name} href={link.path} className="relative group/link py-2">
                                <span className={`transition-all duration-300 hover:text-[#7CC4FF] hover:drop-shadow-[0_0_8px_rgba(77,163,255,0.4)] ${isActive ? 'text-[#7CC4FF]' : 'text-white'}`}>
                                    {link.name}
                                </span>
                                <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] rounded-full transform origin-left transition-transform duration-300 ${isActive ? 'scale-x-100 shadow-[0_0_8px_rgba(77,163,255,0.8)]' : 'scale-x-0 group-hover/link:scale-x-100'}`}></span>
                            </Link>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-4 text-sm font-semibold">
                        {!auth?.loggedIn ? (
                            <>
                                <Link href="/login" className="text-white hover:text-[#7CC4FF] transition-colors py-2 drop-shadow-sm font-bold">Customer Login</Link>
                                <span className="text-white/20">|</span>
                                <Link 
                                    href="/register" 
                                    className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] px-5 py-2.5 rounded-full hover:shadow-[0_0_20px_rgba(77,163,255,0.5)] hover:-translate-y-0.5 transition-all duration-300 font-bold"
                                >
                                    Register
                                </Link>
                                <span className="text-white/20 ml-2">|</span>
                                <Link href="/seller/login" className="text-[#A0AEC0] hover:text-[#7CC4FF] transition-colors italic font-bold">Seller Portal</Link>
                            </>
                        ) : auth.role === 'customer' ? (
                            <>
                                <NotificationBell />
                                <Link href="/profile" className="flex items-center gap-2 group/prof">
                                    {profileImageSrc ? (
                                        <img src={profileImageSrc} className="w-8 h-8 rounded-full border border-[#4DA3FF]/30 object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-[#4DA3FF]/20 flex items-center justify-center text-[#4DA3FF] text-[10px] font-bold">U</div>
                                    )}
                                    <span className="text-[#4DA3FF] group-hover/prof:text-[#7CC4FF] transition-colors">My Profile</span>
                                </Link>
                                <span className="text-white/20">|</span>
                                <button onClick={handleLogout} className="text-red-400 hover:text-red-300 transition-colors">Logout</button>
                            </>
                        ) : auth.role === 'seller' ? (
                            <>
                                <NotificationBell />
                                <Link href="/seller/profile" className="flex items-center gap-2 group/prof">
                                    {profileImageSrc ? (
                                        <img src={profileImageSrc} className="w-8 h-8 rounded-full border border-[#4DA3FF]/30 object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-[#4DA3FF]/20 flex items-center justify-center text-[#4DA3FF] text-[10px] font-bold">S</div>
                                    )}
                                    <span className="text-[#A0AEC0] italic hidden lg:inline group-hover/prof:text-white transition-colors">Seller Workspace</span>
                                </Link>
                                <span className="text-white/20 hidden lg:inline">|</span>
                                <button onClick={handleLogout} className="text-red-400 hover:text-red-300 transition-colors font-bold">Logout</button>
                            </>
                        ) : auth.role === 'investor' || auth.role === 'startup_founder' ? (
                            <>
                                <NotificationBell />
                                <Link href="/profile" className="flex items-center gap-2 group/prof">
                                    {profileImageSrc ? (
                                        <img src={profileImageSrc} className="w-8 h-8 rounded-full border border-[#4DA3FF]/30 object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-[#4DA3FF]/20 flex items-center justify-center text-[#4DA3FF] text-[10px] font-bold">I</div>
                                    )}
                                    <span className="text-[#4DA3FF] group-hover/prof:text-[#7CC4FF] transition-colors">Profile</span>
                                </Link>
                                <span className="text-white/20">|</span>
                                <button onClick={handleLogout} className="text-red-400 hover:text-red-300 transition-colors">Logout</button>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </nav>
    );
}
