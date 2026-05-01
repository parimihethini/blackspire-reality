"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import InvestorModal from './InvestorModal';
import { Send, TrendingUp, Mail, ShieldCheck } from 'lucide-react';

export default function Footer() {
    const router = useRouter();
    const [isInvestorModalOpen, setIsInvestorModalOpen] = useState(false);
    const [auth, setAuth] = useState<any>(null);

    useEffect(() => {
        setAuth(getAuth());
    }, []);

    const handleJoinInvestorList = () => {
        const currentAuth = getAuth();
        if (!currentAuth?.loggedIn) {
            router.push('/login/customer');
            return;
        }
        setIsInvestorModalOpen(true);
    };

    return (
        <footer className="bg-[#0A0F1F] border-t border-[#4DA3FF]/10 pt-20 pb-10 shadow-[0_-10px_40px_rgba(77,163,255,0.05)] relative overflow-hidden">
            <InvestorModal 
                isOpen={isInvestorModalOpen} 
                onClose={() => setIsInvestorModalOpen(false)} 
                userEmail={auth?.user?.email || auth?.email}
                userName={auth?.user?.name || auth?.name}
            />

            {/* Subtle glow behind footer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#4DA3FF]/30 to-transparent"></div>

            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 relative z-10">

                {/* Brand */}
                <div className="col-span-1 md:col-span-1">
                    <Link href="/" className="inline-block mb-4 group">
                        <h1 className="text-2xl font-extrabold tracking-tight text-white flex flex-col group-hover:text-[#7CC4FF] transition-colors duration-300">
                            BLACKSPIRE
                            <span className="text-[#4DA3FF] text-[10px] tracking-[0.3em] font-semibold -mt-1 uppercase drop-shadow-[0_0_8px_rgba(77,163,255,0.4)]">REALITY</span>
                        </h1>
                    </Link>
                    <p className="text-[#A0AEC0] text-sm leading-relaxed max-w-sm font-medium">
                        Discover premium real estate, verified plots, and luxury investment properties designed for growth and exquisite living.
                    </p>
                </div>

                {/* Links */}
                <div>
                    <h3 className="text-white font-bold mb-5 text-lg">Platform</h3>
                    <ul className="space-y-3 text-sm text-[#A0AEC0] font-medium">
                        <li><Link href="/plots" className="hover:text-[#7CC4FF] hover:translate-x-1 inline-block transition-all">Plots</Link></li>
                        <li><Link href="/houses" className="hover:text-[#7CC4FF] hover:translate-x-1 inline-block transition-all">Houses</Link></li>
                        <li><Link href="/investments" className="hover:text-[#7CC4FF] hover:translate-x-1 inline-block transition-all">Investments</Link></li>
                    </ul>
                </div>

                {/* Contact */}
                <div>
                    <h3 className="text-white font-bold mb-5 text-lg">Contact</h3>
                    <ul className="space-y-3 text-sm text-[#A0AEC0] font-medium">
                        <li>
                            <a href="tel:+918148688987" className="flex items-center gap-3 cursor-pointer hover:text-white transition">
                                <span className="text-[#4DA3FF] text-lg bg-[#4DA3FF]/10 p-1.5 rounded-md">📞</span>
                                <span>Phone</span>
                            </a>
                        </li>
                        <li>
                            <a href="https://wa.me/918148688987" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 cursor-pointer hover:text-white transition">
                                <span className="text-[#4DA3FF] text-lg bg-[#4DA3FF]/10 p-1.5 rounded-md">💬</span>
                                <span>WhatsApp</span>
                            </a>
                        </li>
                        <li>
                            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=blackspirereality@gmail.com&su=Property Inquiry&body=Hi, I am interested in your property" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 cursor-pointer hover:text-white transition">
                                <span className="text-[#4DA3FF] text-lg bg-[#4DA3FF]/10 p-1.5 rounded-md">✉️</span>
                                <span>Email</span>
                            </a>
                        </li>
                    </ul>
                </div>

                {/* CTA Form */}
                <div className="bg-[#121A2F]/50 p-7 rounded-[2rem] border border-[#4DA3FF]/10 backdrop-blur-md relative overflow-hidden group/cta shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover/cta:opacity-40 transition-opacity">
                        <TrendingUp className="w-12 h-12 text-[#4DA3FF]" />
                    </div>
                    
                    <h3 className="text-white font-black mb-2 text-xl font-poppins">Investor Circle</h3>
                    <p className="text-sm text-[#A0AEC0] mb-6 font-medium leading-relaxed">Unlock off-market luxury assets and high-growth commercial opportunities.</p>
                    
                    <button 
                        onClick={handleJoinInvestorList}
                        className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] hover:from-[#7CC4FF] hover:to-[#4DA3FF] transition-all duration-300 shadow-[0_0_20px_rgba(77,163,255,0.3)] hover:shadow-[0_0_35px_rgba(77,163,255,0.6)] text-[#0A0F1F] py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:-translate-y-1 active:scale-95"
                    >
                        Join Private List <Send className="w-4 h-4" />
                    </button>
                    
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-white/40 uppercase font-black tracking-widest">
                        <ShieldCheck className="w-3 h-3" /> Secure • Verified • Exclusive
                    </div>
                </div>

            </div>

            {/* Copyright */}
            <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/5 text-center flex flex-col md:flex-row justify-between items-center text-xs text-[#A0AEC0] font-medium relative z-10">
                <p>&copy; {new Date().getFullYear()} Blackspire Reality. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0 font-bold uppercase tracking-wider text-[10px]">
                    <Link href="/" className="hover:text-[#7CC4FF] transition">Privacy Policy</Link>
                    <Link href="/" className="hover:text-[#7CC4FF] transition-all hover:tracking-widest">Terms of Service</Link>
                </div>
            </div>
        </footer>
    );
}
