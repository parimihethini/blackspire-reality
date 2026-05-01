import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["400", "600", "700", "800"],
});

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Blackspire Reality | Premium Real Estate India",
    description:
        "Discover verified plots, luxury houses, and premium real estate investments with Blackspire Reality. Your trusted platform for Indian real estate.",
    keywords: "real estate india, plots, houses, luxury villas, DTCP approved, CMDA approved",
};

import WhatsAppButton from "@/components/WhatsAppButton";
import SmartBackground from "@/components/SmartBackground";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="scroll-smooth">
            <body
                className={`${poppins.variable} ${inter.variable} antialiased min-h-screen text-[#FFFFFF] bg-transparent relative`}
            >
                <SmartBackground />
                {children}
                <WhatsAppButton />
            </body>
        </html>
    );
}
