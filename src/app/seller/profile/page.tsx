"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, setAuth } from "@/lib/auth";
import { API_ORIGIN, authFetch } from "@/lib/api";
import { User, Mail, Phone, Building, Save, ArrowLeft, Camera, Loader2, CheckCircle2 } from "lucide-react";
import ProfilePhoto from "@/components/ProfilePhoto";

export default function SellerProfile() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [countryCode, setCountryCode] = useState("+91");
    const [company, setCompany] = useState("");
    
    // UI states
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [token, setToken] = useState("");

    useEffect(() => {
        const auth = getAuth();
        if (!auth) return;
        
        setEmail(auth.email || "");
        setName(auth.name || "");
        setCompany((auth as any).company || "");
        setToken(auth.token || "");
        if ((auth as any).profile_image) {
            setProfilePic(auth.profile_image);
        }
        
        // Simple logic to extract country code if phone exists
        let p = (auth as any).phone || (auth as any).mobile_number || "";
        if (p.startsWith("+")) {
            const codeMatch = p.match(/^(\+\d{1,3})\s?(.*)/);
            if (codeMatch) {
                setCountryCode(codeMatch[1]);
                setPhone(codeMatch[2]);
            } else {
                setPhone(p);
            }
        } else {
            setPhone(p);
        }
        const syncProfileFromBackend = async () => {
            try {
                const response = await authFetch(`${API_ORIGIN}/users/me`);
                if (!response.ok) return;
                const user = await response.json();
                setEmail(user?.email || auth.email || "");
                setName(user?.name || auth.name || "");
                setPhone(user?.phone || "");
                setProfilePic(user?.profile_image || null);
                setAuth({
                    ...auth,
                    id: user?.id,
                    email: user?.email || auth.email,
                    role: user?.role || auth.role,
                    name: user?.name || auth.name,
                    phone: user?.phone || auth.phone,
                    profile_image: user?.profile_image || undefined,
                });
            } catch (err) {
                console.error("Failed to fetch profile", err);
            }
        };
        syncProfileFromBackend();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate phone
        const rawPhone = phone.replace(/\s+/g, "");
        if (rawPhone && rawPhone.length < 5) {
            alert("Please enter a valid phone number.");
            return;
        }

        setIsSaving(true);
        const auth = getAuth();
        if (!auth) return;
        
        const fullPhone = rawPhone ? `${countryCode}${rawPhone}` : "";

        try {
            // Update Auth State (Offline persistence)
            const updatedAuth = { ...auth, name, phone: fullPhone, company };
            setAuth(updatedAuth);
            
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            console.error(e);
            alert("Error updating profile.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-6 py-12 relative z-10 w-full">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="text-[#A0AEC0] hover:text-white transition-colors flex items-center gap-1"
                >
                    <ArrowLeft size={16} /> Dashboard
                </button>
                <h1 className="text-3xl font-extrabold text-white drop-shadow-md">
                    My <span className="text-[#4DA3FF] drop-shadow-[0_0_8px_rgba(77,163,255,0.4)]">Profile</span>
                </h1>
            </div>

            {/* Profile Header & Avatar */}
            <div className="bg-[#121A2F]/80 backdrop-blur-xl border border-[#4DA3FF]/20 rounded-3xl p-10 shadow-[0_20px_60px_rgba(77,163,255,0.05)] mb-8 flex flex-col md:flex-row items-center gap-10 group">
                <ProfilePhoto 
                    token={token} 
                    existingImage={profilePic} 
                    onUploadSuccess={(url) => {
                        setProfilePic(url);
                        const auth = getAuth();
                        if (auth) setAuth({ ...auth, profile_image: url });
                    }}
                    initials={name ? name.substring(0, 2) : email.substring(0, 2)}
                />
                
                <div className="text-center md:text-left flex-1">
                    <h2 className="text-2xl font-extrabold text-white mb-2">{name || "Seller Account"}</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <span className="text-xs font-bold text-[#4DA3FF] bg-[#4DA3FF]/10 border border-[#4DA3FF]/30 px-3 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={12} /> Verified Seller
                        </span>
                        <span className="text-xs font-bold text-[#A0AEC0] bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 px-3 py-1 rounded-full">
                            ID: {email.split('@')[0]}
                        </span>
                    </div>
                </div>
            </div>

            {saved && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 font-semibold px-4 py-3 rounded-xl mb-6 text-center shadow-[0_0_15px_rgba(34,197,94,0.15)] animate-fade-in flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> Profile safely updated!
                </div>
            )}

            <form onSubmit={handleSave} className="bg-[#121A2F]/80 backdrop-blur-xl border border-[#4DA3FF]/20 rounded-3xl p-8 shadow-[0_20px_60px_rgba(77,163,255,0.05)] flex flex-col gap-8">
                
                {/* --- Personal Information --- */}
                <div>
                    <h3 className="text-[#4DA3FF] font-black text-sm uppercase tracking-widest border-b border-[#4DA3FF]/20 pb-2 mb-4">
                        Personal Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2 md:col-span-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider flex items-center gap-2 ml-1">
                                <User size={14} /> Full Name *
                            </label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="E.g. John Doe"
                                className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-white outline-none focus:border-[#7CC4FF] focus:bg-[#0A0F1F]/90 focus:shadow-[0_0_15px_rgba(124,196,255,0.15)] transition-all font-medium placeholder:text-[#A0AEC0]/40"
                            />
                        </div>
                    </div>
                </div>

                {/* --- Contact Details --- */}
                <div>
                    <h3 className="text-[#4DA3FF] font-black text-sm uppercase tracking-widest border-b border-[#4DA3FF]/20 pb-2 mb-4">
                        Contact Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider flex items-center gap-2 ml-1 opacity-80">
                                <Mail size={14} /> Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                readOnly
                                disabled
                                className="bg-[#0A0F1F]/40 border border-[#A0AEC0]/10 p-3.5 rounded-xl w-full text-[#A0AEC0]/70 outline-none font-medium cursor-not-allowed select-none"
                            />
                            <p className="text-[10px] uppercase font-bold text-[#A0AEC0]/50 ml-1">🔒 Email cannot be changed</p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider flex items-center gap-2 ml-1">
                                <Phone size={14} /> Mobile Number *
                            </label>
                            <div className="flex gap-2">
                                <select 
                                    value={countryCode} 
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl text-white outline-none focus:border-[#7CC4FF] transition-all font-medium custom-select appearance-none cursor-pointer w-24 text-center"
                                >
                                    <option value="+91">+91 (IN)</option>
                                    <option value="+1">+1 (US)</option>
                                    <option value="+44">+44 (UK)</option>
                                    <option value="+971">+971 (UAE)</option>
                                    <option value="+61">+61 (AU)</option>
                                    <option value="+65">+65 (SG)</option>
                                </select>
                                <input
                                    required
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} // Only allow numbers visually
                                    placeholder="9876543210"
                                    className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-white outline-none focus:border-[#7CC4FF] focus:bg-[#0A0F1F]/90 focus:shadow-[0_0_15px_rgba(124,196,255,0.15)] transition-all font-medium placeholder:text-[#A0AEC0]/40 flex-1"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Professional Details --- */}
                <div>
                    <h3 className="text-[#4DA3FF] font-black text-sm uppercase tracking-widest border-b border-[#4DA3FF]/20 pb-2 mb-4">
                        Professional Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2 md:col-span-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider flex items-center gap-2 ml-1">
                                <Building size={14} /> Company / Agency Name (Optional)
                            </label>
                            <input
                                type="text"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                placeholder="E.g. Blackspire Reality"
                                className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-white outline-none focus:border-[#7CC4FF] focus:bg-[#0A0F1F]/90 focus:shadow-[0_0_15px_rgba(124,196,255,0.15)] transition-all font-medium placeholder:text-[#A0AEC0]/40"
                            />
                            <p className="text-[10px] font-bold text-[#A0AEC0]/60 ml-1">💡 Only needed if you are an agent, broker, or builder.</p>
                        </div>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="pt-4 border-t border-[#4DA3FF]/10">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] hover:shadow-[0_0_40px_rgba(77,163,255,0.6)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Saving Changes...
                            </>
                        ) : (
                            <>
                                <Save size={18} /> Update Profile
                            </>
                        )}
                    </button>
                    <p className="text-center text-[#A0AEC0] text-xs mt-4 font-medium">Keep your profile updated to build trust with buyers.</p>
                </div>
            </form>
        </div>
    );
}
