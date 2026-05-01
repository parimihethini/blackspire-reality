"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAuth, getAuthToken, clearAuth } from "@/lib/auth";
import { getErrorDetail, authFetch, API_ORIGIN } from "@/lib/api";
import { MapPin, UploadCloud, X } from "lucide-react";

export default function AddProperty() {
    const router = useRouter();
    const [sellerEmail, setSellerEmail] = useState("");

    useEffect(() => {
        const auth = getAuth();
        if (auth) {
            setSellerEmail(auth?.email || "");
        }
    }, []);

    const [form, setForm] = useState({
        title: "",
        type: "plot",
        street: "",
        area: "",
        city: "",
        state: "",
        country: "India",
        pincode: "",
        price: "",
        size: "",
        bedrooms: "",
        bathrooms: "",
        facing: "North",
        furnishing: "Unfurnished",
        ownership: "Freehold",
        posted_by: "Owner",
        description: "",
        approval_status: "Approved",
        approval_authority: "DTCP",
        status: "Available",
        mapUrl: "",
        images: "",
        seller_phone: "",
        latitude: "",
        longitude: ""
    });

    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getCoordinates = async (address: string) => {
        // Mock geocoding for standalone frontend
        return { lat: 12.9716 + (Math.random() - 0.5) * 0.1, lng: 77.5946 + (Math.random() - 0.5) * 0.1 };
    };

    useEffect(() => {
        const addrParts = [form.street, form.area, form.city, form.state, form.country].filter(Boolean);
        const query = addrParts.join(", ");
        if (query.trim().length < 4) return;

        const timeoutId = setTimeout(async () => {
            if (!form.latitude && !form.longitude) {
                const coords = await getCoordinates(query);
                if (coords) {
                    setForm((prev) => ({ ...prev, latitude: coords.lat.toString(), longitude: coords.lng.toString() }));
                }
            }
        }, 800);
        return () => clearTimeout(timeoutId);
    }, [form.street, form.area, form.city, form.state, form.country]);

    const handlePickFromMap = () => {
        setForm(prev => ({
            ...prev,
            latitude: (13.0827 + (Math.random() - 0.5) * 0.1).toFixed(6),
            longitude: (80.2707 + (Math.random() - 0.5) * 0.1).toFixed(6)
        }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setImageFiles(prev => [...prev, ...files]);

            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === "string") {
                        setImagePreviews(prev => [...prev, reader.result as string]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removePreview = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSuccessMessage("");

        const auth = getAuth();
        if (!auth || !auth.loggedIn) {
            alert("Please log in as a seller to add a property.");
            router.push("/seller/login");
            setIsSubmitting(false);
            return;
        }

        try {
            const token = getAuthToken();
            console.log("TOKEN:", localStorage.getItem("token"));
            if (!token) {
                clearAuth();
                alert("You are not logged in. Please sign in again.");
                router.push("/seller/login");
                setIsSubmitting(false);
                return;
            }

            if (!form.title || !form.price || !form.city || !form.state || !form.pincode) {
                throw new Error("Please fill in all required fields: Title, Price, City, State, and Pincode.");
            }

            const manualImages = form.images ? form.images.split(",").map(url => url.trim()).filter(Boolean) : [];
            const mockUploadHrefs = imageFiles.map(() => `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?random=${Math.random()}`);
            const finalImages = [...manualImages, ...mockUploadHrefs];

            const extraDetails = `**Features:** Bedrooms: ${form.bedrooms || 'N/A'}, Bathrooms: ${form.bathrooms || 'N/A'}, Facing: ${form.facing}, Furnished: ${form.furnishing}\n**Transaction:** Posted By: ${form.posted_by}, Ownership: ${form.ownership}\n\n`;

            const payload = {
                title: form.title,
                type: form.type,
                price: parseFloat(form.price),
                size: form.size || undefined,
                description: extraDetails + form.description,
                images: finalImages,
                approval: form.approval_authority || "Approved",
                status: form.status,
                street: form.street || undefined,
                area: form.area || undefined,
                city: form.city,
                state: form.state,
                country: form.country || "India",
                pincode: form.pincode,
                map_url: form.mapUrl || undefined,
                seller_phone: form.seller_phone || undefined,
                latitude: form.latitude ? parseFloat(form.latitude) : undefined,
                longitude: form.longitude ? parseFloat(form.longitude) : undefined,
                features: [],
            };

            const response = await authFetch(`${API_ORIGIN}/properties`, {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                clearAuth();
                router.push("/seller/login");
                throw new Error("Session expired. Please log in again.");
            }

            if (response.status === 403) {
                const detail = (await getErrorDetail(response, "")).toLowerCase();
                clearAuth();
                router.push("/seller/login");
                throw new Error(
                    detail.includes("access denied") || detail.includes("role")
                        ? "This action requires a seller account. Please log in with a seller account."
                        : "Authentication required. Please log in again."
                );
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data?.detail || `Server error (${response.status}).`);
            }

            setSuccessMessage("Property successfully listed! Redirecting...");
            setTimeout(() => {
                router.push("/seller/my-properties");
            }, 1500);

        } catch (error: any) {
            setSuccessMessage("");
            alert(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="text-[#A0AEC0] hover:text-[#FFFFFF] transition-colors">&larr; Back</button>
                <h1 className="text-3xl font-extrabold text-[#FFFFFF] drop-shadow-md">Add New <span className="text-[#4DA3FF] drop-shadow-[0_0_8px_rgba(77,163,255,0.4)]">Property</span></h1>
            </div>

            {successMessage && (
                <div className="bg-green-500/10 border border-green-500/50 text-green-400 font-semibold px-4 py-3 rounded-xl mb-8 animate-fade-in text-center shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                    {successMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-[#121A2F]/80 backdrop-blur-xl border border-[#4DA3FF]/20 rounded-3xl p-8 shadow-[0_20px_60px_rgba(77,163,255,0.05)] flex flex-col gap-6 relative overflow-hidden group">
                <div className="absolute -top-[100px] -right-[100px] w-64 h-64 bg-[#7CC4FF]/5 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="grid md:grid-cols-2 gap-6 relative z-10">
                    {/* 1. Basic Details */}
                    <div className="w-full col-span-1 md:col-span-2 mb-2">
                        <h3 className="text-[#4DA3FF] font-black text-sm uppercase tracking-widest border-b border-[#4DA3FF]/20 pb-2">Basic Details</h3>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Property Title *</label>
                        <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" placeholder="e.g. 1200 Sqft Corner Plot" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Property Type *</label>
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 font-medium appearance-none cursor-pointer custom-select">
                            <optgroup label="Residential" className="bg-[#121A2F] text-[#4DA3FF] font-bold">
                                <option value="apartment" className="text-white font-medium bg-[#0A0F1F]">Apartment / Flat</option>
                                <option value="house" className="text-white font-medium bg-[#0A0F1F]">Independent House</option>
                                <option value="villa" className="text-white font-medium bg-[#0A0F1F]">Villa</option>
                                <option value="studio" className="text-white font-medium bg-[#0A0F1F]">Studio Apartment</option>
                                <option value="penthouse" className="text-white font-medium bg-[#0A0F1F]">Penthouse</option>
                                <option value="duplex" className="text-white font-medium bg-[#0A0F1F]">Duplex / Triplex</option>
                            </optgroup>
                            <optgroup label="Land" className="bg-[#121A2F] text-[#4DA3FF] font-bold">
                                <option value="plot" className="text-white font-medium bg-[#0A0F1F]">Plot / Land</option>
                                <option value="agricultural" className="text-white font-medium bg-[#0A0F1F]">Agricultural Land</option>
                                <option value="farm" className="text-white font-medium bg-[#0A0F1F]">Farm Land</option>
                            </optgroup>
                            <optgroup label="Commercial" className="bg-[#121A2F] text-[#4DA3FF] font-bold">
                                <option value="office" className="text-white font-medium bg-[#0A0F1F]">Office Space</option>
                                <option value="shop" className="text-white font-medium bg-[#0A0F1F]">Shop / Showroom</option>
                                <option value="building" className="text-white font-medium bg-[#0A0F1F]">Commercial Building</option>
                                <option value="warehouse" className="text-white font-medium bg-[#0A0F1F]">Warehouse / Godown</option>
                                <option value="industrial" className="text-white font-medium bg-[#0A0F1F]">Industrial Land</option>
                            </optgroup>
                            <optgroup label="Investment / Special" className="bg-[#121A2F] text-[#4DA3FF] font-bold">
                                <option value="coworking" className="text-white font-medium bg-[#0A0F1F]">Co-working Space</option>
                                <option value="coliving" className="text-white font-medium bg-[#0A0F1F]">Co-living Space</option>
                                <option value="resort" className="text-white font-medium bg-[#0A0F1F]">Resort / Hotel Property</option>
                            </optgroup>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Price (INR) *</label>
                        <input required type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" placeholder="e.g. 5000000" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Size / Area</label>
                        <input type="text" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" placeholder="e.g. 2400 Sqft" />
                    </div>

                    {/* 2. Property Features */}
                    <div className="w-full col-span-1 md:col-span-2 mt-4 mb-2">
                        <h3 className="text-[#4DA3FF] font-black text-sm uppercase tracking-widest border-b border-[#4DA3FF]/20 pb-2">Property Features</h3>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Bedrooms</label>
                        <input type="number" min="0" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" placeholder="e.g. 3" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Bathrooms</label>
                        <input type="number" min="0" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" placeholder="e.g. 2" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Facing</label>
                        <select value={form.facing} onChange={e => setForm({ ...form, facing: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 font-medium cursor-pointer appearance-none custom-select">
                            <option value="North">North</option>
                            <option value="South">South</option>
                            <option value="East">East</option>
                            <option value="West">West</option>
                            <option value="North-East">North-East</option>
                            <option value="North-West">North-West</option>
                            <option value="South-East">South-East</option>
                            <option value="South-West">South-West</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Furnishing Status</label>
                        <select value={form.furnishing} onChange={e => setForm({ ...form, furnishing: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 font-medium cursor-pointer appearance-none custom-select">
                            <option value="Unfurnished">Unfurnished</option>
                            <option value="Semi-Furnished">Semi-Furnished</option>
                            <option value="Fully Furnished">Fully Furnished</option>
                        </select>
                    </div>

                    {/* 3. Location */}
                    <div className="w-full col-span-1 md:col-span-2 mt-4 mb-2">
                        <h3 className="text-[#4DA3FF] font-black text-sm uppercase tracking-widest border-b border-[#4DA3FF]/20 pb-2">Location</h3>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Street Address</label>
                        <input type="text" value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" placeholder="e.g. 123 Main St" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Locality / Neighborhood</label>
                        <input type="text" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" placeholder="e.g. OMR, Sholinganallur" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">City *</label>
                        <input required type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" placeholder="e.g. Chennai" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">State / Province *</label>
                        <input required type="text" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" placeholder="e.g. Tamil Nadu" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Country *</label>
                        <input required type="text" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" placeholder="e.g. India" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">PIN / Zip Code *</label>
                        <input required type="text" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" placeholder="e.g. 600097" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1 flex justify-between">
                            <span>Latitude</span>
                            <button type="button" onClick={handlePickFromMap} className="text-[#7CC4FF] hover:text-white flex items-center gap-1 text-[10px] bg-[#4DA3FF]/10 px-2 py-0.5 rounded cursor-pointer transition-colors shadow-sm font-black"><MapPin size={10} /> Pick from Map</button>
                        </label>
                        <input type="number" step="any" placeholder="Auto-filled via Address" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-green-400" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Longitude</label>
                        <input type="number" step="any" placeholder="Auto-filled via Address" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-green-400" />
                    </div>

                    {/* 4. Legal & Transaction */}
                    <div className="w-full col-span-1 md:col-span-2 mt-4 mb-2">
                        <h3 className="text-[#4DA3FF] font-black text-sm uppercase tracking-widest border-b border-[#4DA3FF]/20 pb-2">Legal & Transaction</h3>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Approval Status *</label>
                        <select value={(form as any).approval_status} onChange={e => {
                            const newStatus = e.target.value;
                            setForm({ ...form, approval_status: newStatus, approval_authority: newStatus === "Not Approved" ? "" : form.approval_authority });
                        }} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 font-medium cursor-pointer appearance-none custom-select">
                            <option value="Approved">Approved</option>
                            <option value="Not Approved">Not Approved</option>
                            <option value="Under Approval">Under Approval</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Approval Authority</label>
                        <select
                            value={(form as any).approval_authority}
                            onChange={e => setForm({ ...form, approval_authority: e.target.value })}
                            disabled={(form as any).approval_status === "Not Approved"}
                            className={`bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 font-medium cursor-pointer appearance-none custom-select disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                            <option value="">Select Authority</option>
                            <option value="DTCP">DTCP</option>
                            <option value="CMDA">CMDA</option>
                            <option value="BMRDA">BMRDA</option>
                            <option value="Panchayat">Panchayat</option>
                            <option value="Corporation">Corporation</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Ownership Type</label>
                        <select value={form.ownership} onChange={e => setForm({ ...form, ownership: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 font-medium cursor-pointer appearance-none custom-select">
                            <option value="Freehold">Freehold</option>
                            <option value="Leasehold">Leasehold</option>
                            <option value="Co-operative Society">Co-operative Society</option>
                            <option value="Power of Attorney">Power of Attorney</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Selling Status</label>
                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 font-medium cursor-pointer appearance-none custom-select">
                            <option value="Available">Available</option>
                            <option value="Sold">Sold</option>
                            <option value="Under Negotiation">Under Negotiation</option>
                        </select>
                    </div>

                    {/* 5. Contact Information */}
                    <div className="w-full col-span-1 md:col-span-2 mt-4 mb-2">
                        <h3 className="text-[#4DA3FF] font-black text-sm uppercase tracking-widest border-b border-[#4DA3FF]/20 pb-2">Owner / Contact Information</h3>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Posted By</label>
                        <select value={form.posted_by} onChange={e => setForm({ ...form, posted_by: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 font-medium cursor-pointer appearance-none custom-select">
                            <option value="Owner">Owner</option>
                            <option value="Agent">Agent / Broker</option>
                            <option value="Builder">Builder / Developer</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Mobile Number *</label>
                        <input required type="text" placeholder="Enter Mobile Number for inquiries" value={form.seller_phone} onChange={(e) => setForm({ ...form, seller_phone: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" />
                    </div>
                </div>

                <div className="w-full mt-6 mb-2 relative z-10">
                    <h3 className="text-[#4DA3FF] font-black text-sm uppercase tracking-widest border-b border-[#4DA3FF]/20 pb-2">Media & Details</h3>
                </div>

                <div className="flex flex-col gap-2 relative z-10">
                    <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Property Description</label>
                    <textarea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium resize-y" placeholder="Detail the amazing features of this property..."></textarea>
                </div>

                <div className="flex flex-col gap-2 relative z-10">
                    <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Upload Images (Gallery)</label>
                    <div
                        className="bg-[#0A0F1F]/60 border border-dashed border-[#A0AEC0]/40 p-8 rounded-xl hover:border-[#7CC4FF] hover:bg-[#0A0F1F]/80 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3 mt-1"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UploadCloud className="text-[#4DA3FF] w-10 h-10" />
                        <div className="flex flex-col gap-1">
                            <span className="text-sm text-white font-bold">Click to upload photos</span>
                            <span className="text-[10px] text-[#A0AEC0]/70 uppercase tracking-widest font-bold">JPG, PNG, WEBP (Max 5MB each)</span>
                        </div>
                        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </div>

                    {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6 p-4 bg-[#0A0F1F]/40 border border-[#A0AEC0]/10 rounded-xl">
                            {imagePreviews.map((preview, idx) => (
                                <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video border border-[#4DA3FF]/20 shadow-md">
                                    <img src={preview} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <button type="button" onClick={() => removePreview(idx)} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-95">
                                        <X size={16} strokeWidth={3} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 relative z-10 mt-2">
                    <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Image URLs (Optional - comma separated)</label>
                    <input type="text" value={form.images} onChange={e => setForm({ ...form, images: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-sm" placeholder="https://image1.jpg, https://image2.jpg" />
                </div>

                <div className="flex flex-col gap-2 relative z-10 mb-2">
                    <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Google Maps Embed URL (Optional)</label>
                    <input type="text" value={form.mapUrl} onChange={e => setForm({ ...form, mapUrl: e.target.value })} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-sm" placeholder="Paste embed iframe src url here..." />
                </div>

                <button disabled={isSubmitting} type="submit" className="w-full mt-6 bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] hover:shadow-[0_0_40px_rgba(77,163,255,0.6)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed relative z-10 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                        <>
                            <span className="w-5 h-5 border-2 border-[#0A0F1F]/30 border-t-[#0A0F1F] rounded-full animate-spin"></span>
                            Saving Listing...
                        </>
                    ) : "Publish Property"}
                </button>
            </form>
        </div>
    );
}
