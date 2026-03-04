import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-[#050505] border-t border-[#C8A951]/20 pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

                {/* Brand */}
                <div className="col-span-1 md:col-span-1">
                    <Link href="/" className="inline-block mb-4">
                        <h1 className="text-2xl font-semibold tracking-wide flex flex-col">
                            <span className="text-[#C8A951]">BLACKSPIRE</span>
                            <span className="text-gray-400 text-xs tracking-[0.3em] font-medium -mt-1">REALITY</span>
                        </h1>
                    </Link>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                        Discover premium real estate, verified plots, and luxury investment properties designed for growth and exquisite living.
                    </p>
                </div>

                {/* Links */}
                <div>
                    <h3 className="text-white font-semibold mb-5 text-lg">Platform</h3>
                    <ul className="space-y-3 text-sm text-gray-400 font-medium">
                        <li><Link href="/plots" className="hover:text-[#C8A951] transition">Plots</Link></li>
                        <li><Link href="/houses" className="hover:text-[#C8A951] transition">Houses</Link></li>
                        <li><Link href="/investments" className="hover:text-[#C8A951] transition">Investments</Link></li>
                    </ul>
                </div>

                {/* Contact */}
                <div>
                    <h3 className="text-white font-semibold mb-5 text-lg">Contact</h3>
                    <ul className="space-y-3 text-sm text-gray-400 font-medium">
                        <li className="flex items-center gap-2"><span className="text-[#C8A951] text-lg">📞</span> <a href="tel:+919876543210" className="hover:text-white transition">Phone</a></li>
                        <li className="flex items-center gap-2"><span className="text-[#C8A951] text-lg">💬</span> <a href="https://wa.me/919876543210" target="_blank" className="hover:text-white transition">WhatsApp</a></li>
                        <li className="flex items-center gap-2"><span className="text-[#C8A951] text-lg">✉️</span> <a href="mailto:contact@blackspirereality.com" className="hover:text-white transition">Email</a></li>
                    </ul>
                </div>

                {/* CTA Form */}
                <div>
                    <h3 className="text-white font-semibold mb-5 text-lg">Join Investor List</h3>
                    <p className="text-sm text-gray-400 mb-4">Get early access to exclusive high-growth properties.</p>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="Email address"
                            className="bg-[#111] text-white px-4 py-2 rounded-md outline-none border border-gray-800 focus:border-[#C8A951] transition w-full text-sm"
                        />
                        <button className="bg-gradient-to-r from-[#C8A951] to-[#E5C76B] hover:from-[#E5C76B] hover:to-[#C8A951] transition-all duration-300 shadow-lg hover:shadow-[#C8A951]/30 hover:scale-105 text-black px-4 py-2 rounded-md font-semibold text-sm">
                            Join
                        </button>
                    </div>
                </div>

            </div>

            {/* Copyright */}
            <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-gray-900 text-center flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 font-medium">
                <p>&copy; {new Date().getFullYear()} Blackspire Reality. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                    <Link href="/" className="hover:text-[#C8A951] transition">Privacy Policy</Link>
                    <Link href="/" className="hover:text-[#C8A951] transition">Terms of Service</Link>
                </div>
            </div>
        </footer>
    );
}
