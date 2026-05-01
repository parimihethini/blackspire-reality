"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, clearAuth, setAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Heart, Calendar, MessageSquare, User, LogOut, MapPin, Search, PlusCircle, Star } from "lucide-react";
import ProfilePhoto from "@/components/ProfilePhoto";
import { getUserReviews, getMyProfile, getFavoriteProperties, toggleFavorite } from "@/lib/api";

export default function BuyerProfile() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateMsg, setUpdateMsg] = useState("");
    const [authData, setAuthData] = useState<any>(null);
    
    // Dynamic Activity States
    const [savedProps, setSavedProps] = useState<any[]>([]);
    const [contactHistory, setContactHistory] = useState<any[]>([]);
    const [siteVisits, setSiteVisits] = useState<any[]>([]);
    const [userReviews, setUserReviews] = useState<any[]>([]);
    const [profileImg, setProfileImg] = useState<string | null>(null);
    const [token, setToken] = useState("");

    useEffect(() => {
        const auth = getAuth();
        if (!auth || !auth.loggedIn) {
            router.push("/login/customer");
            return;
        }

        setEmail(auth.email || "");
        setName(auth.name || "Valued User");
        setPhone((auth as any).phone || "");
        setRole(auth.role || "Customer");
        setAuthData(auth);
        setToken(auth.token || "");
        setIsAuthorized(true);

        const hydrateFromBackend = async () => {
            try {
                const user = await getMyProfile();
                setName(user?.name || auth.name || "Valued User");
                setEmail(user?.email || auth.email || "");
                setPhone(user?.phone || "");
                setProfileImg(user?.profile_image || null);
                setAuth({
                    ...auth,
                    user: {
                        ...auth,
                        ...user,
                    },
                });
            } catch (e) {
                console.error("Failed to hydrate profile from backend:", e);
            }
        };

        const loadSavedProperties = async () => {
            try {
                const favorites = await getFavoriteProperties();
                setSavedProps(favorites);
            } catch (e) {
                console.error("Failed to load saved properties:", e);
            }
        };

        const fetchReviews = async () => {
            try {
                const data = await getUserReviews(auth.email);
                setUserReviews(data.map((r: any) => ({ ...r, message: r.comment })));
            } catch (e) {
                console.error("Failed to load user reviews:", e);
            }
        };

        hydrateFromBackend();
        loadSavedProperties();
        fetchReviews();

        try {
            const contacts = localStorage.getItem("contact_history");
            if (contacts) setContactHistory(JSON.parse(contacts));

            const visits = localStorage.getItem("site_visits");
            if (visits) setSiteVisits(JSON.parse(visits));
        } catch (_) {}
    }, [router]);

    const handleRemoveSaved = async (id: any) => {
        try {
            await toggleFavorite(id, true);
            const filtered = savedProps.filter((p) => p.id !== id);
            setSavedProps(filtered);
        } catch (e) {
            console.error("Failed to remove saved property:", e);
        }
    };

    const handleLogout = () => {
        clearAuth();
        router.push("/");
    };

    const handleSave = async () => {
        setIsUpdating(true);
        setUpdateMsg("");
        
        try {
            const auth = getAuth();
            if (!auth?.token) {
                throw new Error("Session token missing. Please log in again.");
            }
            setAuth({
                token: auth.token,
                id: auth.id,
                email: auth.email,
                role: auth.role,
                name: editName,
                phone: editPhone,
            });
            const newAuth = { ...auth, name: editName, phone: editPhone };
            setName(editName);
            setPhone(editPhone);
            setAuthData(newAuth);
            
            // Notify other components (Navbar, etc)
            window.dispatchEvent(new Event("storage"));
            
            setIsEditing(false);
            setUpdateMsg("Profile updated successfully (Offline)");
            setTimeout(() => setUpdateMsg(""), 3000);
        } catch (err: any) {
            setUpdateMsg("Error: " + err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    if (!isAuthorized) {
        return <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-white">Loading profile...</div>;
    }

    return (
        <main className="bg-[#0A0F1F] min-h-screen text-white font-inter">
            <Navbar />
            
            <div className="pt-32 pb-16 bg-gradient-to-b from-[#121A2F]/80 to-[#0A0F1F] border-b border-[#4DA3FF]/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#4DA3FF]/10 rounded-full blur-[100px]"></div>

                <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-8 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="relative group/avatar">
                            <ProfilePhoto
                                token={token}
                                existingImage={profileImg}
                                onUploadSuccess={(url) => {
                                    setProfileImg(url);
                                    const auth = getAuth();
                                    if (auth) setAuth({ ...auth, profile_image: url });
                                }}
                                initials={(name || email).substring(0, 2)}
                            />
                        </div>
                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 font-poppins drop-shadow-md">{name}</h1>
                            <p className="text-[#4DA3FF] text-sm bg-[#4DA3FF]/10 px-4 py-1.5 rounded-full border border-[#4DA3FF]/30 inline-block font-bold tracking-wide shadow-sm capitalize">{role} Account</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 hover:-translate-y-0.5 border border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] px-6 py-3 rounded-xl font-bold transition-all duration-300">
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-12 gap-12">
                
                <div className="md:col-span-4 space-y-6">
                    <div className="bg-[#121A2F]/80 backdrop-blur-md border border-[#4DA3FF]/10 hover:border-[#4DA3FF]/30 transition-all rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group/card">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <User className="text-[#4DA3FF] group-hover/card:drop-shadow-[0_0_8px_rgba(124,196,255,0.8)] transition-all" size={20} />
                            Personal Information
                        </h2>
                        
                        {updateMsg && (
                            <div className={`text-sm font-bold p-3 rounded-lg mb-4 ${updateMsg.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-[#4DA3FF]/10 text-[#7CC4FF] border border-[#4DA3FF]/20'}`}>
                                {updateMsg}
                            </div>
                        )}

                        {isEditing ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-[#A0AEC0] uppercase tracking-wider font-bold block mb-1">Full Name</label>
                                        <input type="text" value={editName} onChange={(e)=>setEditName(e.target.value)} className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/30 rounded-xl px-4 py-3 text-white outline-none focus:border-[#7CC4FF] transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[#A0AEC0] uppercase tracking-wider font-bold block mb-1">Mobile Number</label>
                                        <input type="text" value={editPhone} onChange={(e)=>setEditPhone(e.target.value)} className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/30 rounded-xl px-4 py-3 text-white outline-none focus:border-[#7CC4FF] transition-all" placeholder="9876543210" />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button onClick={handleSave} disabled={isUpdating} className="flex-1 bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-3 rounded-xl hover:shadow-[0_0_20px_rgba(77,163,255,0.4)] disabled:opacity-50 transition-all font-bold">
                                            Save
                                        </button>
                                        <button onClick={()=>setIsEditing(false)} disabled={isUpdating} className="flex-1 bg-transparent border border-white/20 text-white font-bold py-3 rounded-xl transition-all">Cancel</button>
                                    </div>
                                </div>
                        ) : (
                            <>
                                <div className="space-y-5">
                                    <div>
                                        <label className="text-xs text-[#A0AEC0] uppercase tracking-wider font-bold block mb-1">Full Name</label>
                                        <p className="text-white font-medium">{name}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-[#A0AEC0] uppercase tracking-wider font-bold block mb-1">Email Address</label>
                                        <p className="text-white font-medium">{email}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-[#A0AEC0] uppercase tracking-wider font-bold block mb-1">Mobile Number</label>
                                        <p className="text-white font-medium">{phone || <span className="text-[#A0AEC0] italic text-sm">Not provided</span>}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setEditName(name);
                                        setEditEmail(email);
                                        setEditPhone(phone);
                                        setIsEditing(true);
                                    }} 
                                    className="w-full mt-8 bg-[#0A0F1F] border border-[#4DA3FF]/30 hover:border-[#4DA3FF]/60 text-white hover:text-[#7CC4FF] font-bold py-3.5 rounded-xl transition-all duration-300"
                                >
                                    Edit Profile
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="md:col-span-8 space-y-12">
                    
                    <section id="saved">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-[#4DA3FF] flex items-center gap-3 drop-shadow-[0_0_8px_rgba(77,163,255,0.4)] font-poppins">
                                <Heart size={24} />
                                Saved Properties
                            </h2>
                            <span className="text-xs font-bold bg-[#4DA3FF]/10 border border-[#4DA3FF]/30 px-4 py-1.5 rounded-full text-[#7CC4FF]">{savedProps.length} Items</span>
                        </div>
                        {savedProps.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {savedProps.map((p: any, idx: number) => (
                                    <div key={idx} className="bg-[#121A2F]/80 backdrop-blur-md border border-[#4DA3FF]/20 rounded-2xl flex flex-col overflow-hidden transition-all group shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                                        <div className="h-44 w-full overflow-hidden relative">
                                            <div onClick={()=>router.push(`/property/${p.id}`)} className="cursor-pointer h-full w-full">
                                                <img src={p.images?.[0] || p.image || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={p.title} />
                                            </div>
                                            <button onClick={()=>handleRemoveSaved(p.id)} className="absolute top-3 right-3 bg-red-500/90 text-white p-2 rounded-full border border-white/20 shadow-md">
                                                <Heart size={14} className="fill-white" />
                                            </button>
                                        </div>
                                        <div className="p-5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-extrabold text-white text-[14px] mb-1 line-clamp-1">{p.title}</h3>
                                                <p className="text-[#A0AEC0] text-[10px] flex items-center gap-1"><MapPin size={10} className="text-[#4DA3FF]"/> {p.location?.area || p.area}{(p.location?.area || p.area) ? ", " : ""}{p.location?.city || p.city}</p>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                                <p className="text-[#7CC4FF] font-black text-sm">₹{p.price?.toLocaleString("en-IN")}</p>
                                                <button onClick={()=>router.push(`/property/${p.id}`)} className="text-[10px] font-bold text-white uppercase hover:text-[#4DA3FF] transition-colors">Details →</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[#121A2F]/80 backdrop-blur-md border border-[#4DA3FF]/10 rounded-2xl p-12 text-center">
                                <Heart className="w-14 h-14 text-[#4DA3FF]/20 mx-auto mb-4" />
                                <p className="text-white font-bold mb-2 text-xl font-poppins">No saved properties</p>
                                <p className="text-[#A0AEC0] text-sm mb-8 mx-auto max-w-sm">Find properties you love and save them here for quick access later.</p>
                                <button onClick={()=>router.push('/')} className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold px-8 py-3.5 rounded-xl flex items-center gap-2 mx-auto">
                                    <Search size={18} /> Explore Properties
                                </button>
                            </div>
                        )}
                    </section>

                    <section id="visits">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3 font-poppins">
                                <Calendar className="text-[#4DA3FF]" size={24} />
                                Site Visits
                            </h2>
                            <span className="text-xs font-bold bg-[#4DA3FF]/10 border border-[#4DA3FF]/30 px-4 py-1.5 rounded-full text-[#7CC4FF]">{siteVisits.length} Requests</span>
                        </div>
                        {siteVisits.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {siteVisits.map((p: any, idx: number) => (
                                    <div key={idx} className="bg-[#121A2F]/80 backdrop-blur-md border border-[#4DA3FF]/20 rounded-2xl flex flex-col overflow-hidden transition-all group shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                                        <div className="h-44 w-full overflow-hidden relative">
                                            <img src={p.image || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={p.title} />
                                            <div className="absolute top-3 left-3 bg-[#4DA3FF] text-[#0A0F1F] px-2 py-1 rounded text-[10px] font-black">{new Date(p.date).toLocaleDateString()}</div>
                                        </div>
                                        <div className="p-5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-extrabold text-white text-[14px] mb-1 line-clamp-1">{p.title}</h3>
                                                <p className="text-[#A0AEC0] text-[10px] flex items-center gap-1 font-medium"><MapPin size={10} className="text-[#4DA3FF]"/> {p.location?.city}</p>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <p className="text-green-400 font-black text-[10px] uppercase tracking-tighter">Scheduled / Pending Contact</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[#121A2F]/80 backdrop-blur-md border border-[#4DA3FF]/10 rounded-2xl p-12 text-center text-white">
                                <Calendar className="w-14 h-14 text-[#4DA3FF]/20 mx-auto mb-4" />
                                <p className="font-bold text-xl mb-2 font-poppins">No site visits scheduled</p>
                                <p className="text-[#A0AEC0] text-sm mb-0">Tour your favorite properties in person.</p>
                            </div>
                        )}
                    </section>

                    <section id="contacts">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3 font-poppins">
                                <MessageSquare className="text-[#4DA3FF]" size={24} />
                                Contact History
                            </h2>
                            <span className="text-xs font-bold bg-[#4DA3FF]/10 border border-[#4DA3FF]/30 px-4 py-1.5 rounded-full text-[#7CC4FF]">{contactHistory.length} Contacts</span>
                        </div>
                        {contactHistory.length > 0 ? (
                            <div className="grid md:grid-cols-2 gap-4">
                                {contactHistory.map((c: any, idx: number) => (
                                    <div key={idx} className="bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-xl p-5 flex flex-col justify-between">
                                        <div className="mb-4">
                                            <p className="text-[#A0AEC0] text-[10px] font-bold uppercase tracking-widest mb-1">Property Ref: #{c.property_id}</p>
                                            <p className="text-white font-black text-sm">{c.seller_phone}</p>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-[#A0AEC0] font-bold">
                                            <span>{new Date(c.timestamp).toLocaleDateString()}</span>
                                            <span className="text-[#4DA3FF] uppercase">{c.action_type}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[#121A2F]/80 border border-[#4DA3FF]/10 rounded-2xl p-12 text-center">
                                <p className="text-[#A0AEC0] text-sm">No contact history available.</p>
                            </div>
                        )}
                    </section>
                    <section id="reviews" className="pb-10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3 font-poppins">
                                <MessageSquare className="text-[#4DA3FF]" size={24} />
                                Your Reviews
                            </h2>
                            <span className="text-xs font-bold bg-[#4DA3FF]/10 border border-[#4DA3FF]/30 px-4 py-1.5 rounded-full text-[#7CC4FF]">{userReviews.length} Reviews</span>
                        </div>
                        {userReviews.length > 0 ? (
                            <div className="grid md:grid-cols-2 gap-6">
                                {userReviews.map((review, idx) => (
                                    <div key={review.id} className="bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-6 flex flex-col justify-between shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star key={star} size={14} className={star <= review.rating ? "fill-[#FFD700] text-[#FFD700]" : "text-white/10"} />
                                                    ))}
                                                </div>
                                                <span className="text-[10px] font-black text-[#A0AEC0] uppercase tracking-widest">{new Date(review.created_at).toLocaleDateString()}</span>
                                            </div>
                                            {review.title && <h4 className="text-white font-black text-sm mb-2">{review.title}</h4>}
                                            <p className="text-gray-400 text-xs italic leading-relaxed line-clamp-3">"{review.message}"</p>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-[#4DA3FF] uppercase tracking-wider">Property ID: #{review.property_id}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[#121A2F]/80 border border-white/10 rounded-2xl p-12 text-center">
                                <p className="text-[#A0AEC0] text-sm">You haven't shared any feedback yet.</p>
                            </div>
                        )}
                    </section>

                    {role === 'seller' && (
                        <div className="bg-gradient-to-br from-[#4DA3FF]/20 to-[#0A0F1F] border border-[#4DA3FF]/30 p-8 rounded-3xl text-center">
                            <h3 className="text-2xl font-bold text-white mb-4 font-poppins">You are a Registered Seller</h3>
                            <p className="text-[#A0AEC0] text-sm mb-6">Manage your listed properties, view leads, and update your listings from your seller dashboard.</p>
                            <button onClick={()=>router.push('/seller/dashboard')} className="bg-[#4DA3FF] text-[#0A0F1F] font-black px-8 py-4 rounded-2xl flex items-center gap-2 mx-auto hover:shadow-[0_0_20px_rgba(77,163,255,0.4)] transition-all">
                                <PlusCircle size={20} /> Seller Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
