import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-gray-800 transition-all">
            <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-5">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-wide flex flex-col">
                        <span className="text-[#C8A951]">BLACKSPIRE</span>
                        <span className="text-gray-300 text-xs tracking-[0.3em] font-medium -mt-1">REALITY</span>
                    </h1>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                    <Link href="/" className="hover:text-[#C8A951] transition">Home</Link>
                    <Link href="/plots" className="hover:text-[#C8A951] transition">Plots</Link>
                    <Link href="/houses" className="hover:text-[#C8A951] transition">Houses</Link>
                    <Link href="/investments" className="hover:text-[#C8A951] transition">Investments</Link>
                </div>

                {/* CTA */}
                <button className="bg-[#C8A951] text-black px-6 py-2.5 rounded-md font-semibold hover:bg-[#b09445] hover:shadow-[0_0_15px_rgba(200,169,81,0.4)] transition-all duration-300">
                    Call Now
                </button>
            </div>
        </nav>
    );
}
