"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAuth, clearAuth } from "@/lib/auth";
import { getErrorDetail, authFetch, API_ORIGIN, readJsonSafely } from "@/lib/api";
import { Property } from "@/data/properties";

export default function EditProperty() {
    const router = useRouter();
    const { id } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    
    const [form, setForm] = useState({
        title: "",
        type: "plot",
        street: "",
        area: "",
        city: "",
        state: "",
        country: "India",
        price: "",
        size: "",
        description: "",
        approval: "Approved",
        status: "Available",
        mapUrl: "",
        images: "",
        seller_phone: "",
        latitude: "",
        longitude: ""
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const auth = getAuth();
        if (!auth?.loggedIn) {
            router.push("/login/seller");
            return;
        }

        // Load the property from Backend
        const loadProperty = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const response = await authFetch(`${API_ORIGIN}/properties/${id}`);
                if (!response.ok) {
                    throw new Error(await getErrorDetail(response, "Property not found on server."));
                }
                const prop = await readJsonSafely(response);
                
                setForm({
                    title: prop.title || "",
                    type: prop.type || "plot",
                    street: prop.street || "",
                    area: prop.area || "",
                    city: prop.city || "",
                    state: prop.state || "",
                    country: prop.country || "India",
                    price: prop.price?.toString() || "",
                    size: prop.size || "",
                    description: prop.description || "",
                    approval: prop.approval || "Approved",
                    status: prop.status || "Available",
                    mapUrl: prop.map_url || "",
                    images: prop.images?.join(", ") || "",
                    seller_phone: prop.seller_phone || "",
                    latitude: prop.latitude?.toString() || "",
                    longitude: prop.longitude?.toString() || ""
                });
            } catch (err: any) {
                setErrorMessage(err.message || "Failed to load property.");
            } finally {
                setIsLoading(false);
            }
        };

        loadProperty();
    }, [id, router]);

    const getCoordinates = async (address: string) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`, {
                headers: { "User-Agent": "Blackspire PropTech App (contact@blackspire.test)" }
            });
            const data = await res.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
            return null;
        } catch (err) {
            console.error("Geocoding error:", err);
            return null;
        }
    };

    useEffect(() => {
        const addrParts = [form.street, form.area, form.city, form.state, form.country].filter(Boolean);
        const query = addrParts.join(", ");
        if (query.trim().length < 5) return;
        
        const timeoutId = setTimeout(async () => {
            const coords = await getCoordinates(query);
            if (coords) {
                setForm(prev => ({ ...prev, latitude: coords.lat.toString(), longitude: coords.lng.toString() }));
            }
        }, 800);
        return () => clearTimeout(timeoutId);
    }, [form.street, form.area, form.city, form.state, form.country]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSuccessMessage("");
        setErrorMessage("");

        const auth = getAuth();
        if (!auth?.loggedIn || !auth?.token) {
            alert("Your session has expired. Please log in again.");
            clearAuth();
            router.push("/login/seller");
            setIsSubmitting(false);
            return;
        }
        
        try {
            const payload = {
                title: form.title,
                type: form.type,
                price: parseFloat(form.price),
                size: form.size || undefined,
                description: form.description,
                approval: form.approval,
                status: form.status,
                street: form.street || undefined,
                area: form.area || undefined,
                city: form.city || undefined,
                state: form.state || undefined,
                country: form.country || "India",
                map_url: form.mapUrl || undefined,
                images: form.images ? form.images.split(",").map(u => u.trim()).filter(Boolean) : undefined,
                seller_phone: form.seller_phone || undefined,
                latitude: form.latitude ? parseFloat(form.latitude) : undefined,
                longitude: form.longitude ? parseFloat(form.longitude) : undefined
            };

            const response = await authFetch(`${API_ORIGIN}/properties/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                clearAuth();
                router.push("/seller/login");
                throw new Error("Session expired. Please log in again.");
            }

            if (response.status === 403) {
                clearAuth();
                router.push("/seller/login");
                throw new Error("Session expired or not allowed. Please log in again.");
            }

            if (!response.ok) {
                throw new Error(await getErrorDetail(response, "Failed to update property."));
            }

            setSuccessMessage("Property successfully updated! Redirecting...");
            setTimeout(() => {
                router.push("/seller/my-properties");
            }, 1000);
        } catch (error: any) {
            setErrorMessage(error.message || "Error updating property.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="text-center py-20 text-[#A0AEC0] animate-pulse">Loading listing details...</div>;
    }

    return (
        <div className="max-w-3xl mx-auto px-6 py-12 relative z-10">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.back()} className="text-[#A0AEC0] hover:text-[#FFFFFF] transition-colors">&larr; Back</button>
                    <h1 className="text-3xl font-extrabold text-[#FFFFFF] drop-shadow-md">Edit <span className="text-[#4DA3FF] drop-shadow-[0_0_8px_rgba(77,163,255,0.4)]">Listing</span></h1>
                </div>

                {successMessage && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 font-semibold px-4 py-3 rounded-xl mb-6 animate-fade-in text-center shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                        {successMessage}
                    </div>
                )}
                
                {errorMessage && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 font-semibold px-4 py-3 rounded-xl mb-6 animate-fade-in text-center shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-[#121A2F]/80 backdrop-blur-xl border border-[#4DA3FF]/20 rounded-3xl p-8 shadow-[0_20px_60px_rgba(77,163,255,0.05)] flex flex-col gap-6 relative overflow-hidden group">
                    <div className="absolute -top-[100px] -right-[100px] w-64 h-64 bg-[#7CC4FF]/5 rounded-full blur-[80px] pointer-events-none"></div>

                    <div className="grid md:grid-cols-2 gap-6 relative z-10">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Property Title *</label>
                            <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" />
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Property Type *</label>
                            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 font-medium">
                                <option value="plot">Plot / Land</option>
                                <option value="house">Independent House</option>
                                <option value="villa">Luxury Villa</option>
                                <option value="investment">Commercial Investment</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Price (INR) *</label>
                            <input required type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Size / Area</label>
                            <input type="text" value={form.size} onChange={e => setForm({...form, size: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Street Address</label>
                            <input type="text" value={form.street} onChange={e => setForm({...form, street: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Locality / Neighborhood</label>
                            <input type="text" value={form.area} onChange={e => setForm({...form, area: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">City *</label>
                            <input required type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">State / Province *</label>
                            <input required type="text" value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" />
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Country *</label>
                            <input required type="text" value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Approval Type</label>
                            <select value={form.approval} onChange={e => setForm({...form, approval: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 font-medium">
                                <option value="Approved">Approved</option>
                                <option value="DTCP">DTCP</option>
                                <option value="CMDA">CMDA</option>
                                <option value="BMRDA">BMRDA</option>
                                <option value="Panchayat">Panchayat</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Status</label>
                            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 font-medium">
                                <option value="Available">Available</option>
                                <option value="Sold">Sold</option>
                                <option value="Ready to Move">Ready to Move</option>
                                <option value="Under Construction">Under Construction</option>
                                <option value="New Launch">New Launch</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Mobile Number *</label>
                            <input type="text" placeholder="Enter Mobile Number" value={form.seller_phone} onChange={(e) => setForm({...form, seller_phone: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Latitude</label>
                            <input type="number" step="any" placeholder="Auto-filled via Address" value={form.latitude} onChange={(e) => setForm({...form, latitude: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-green-400" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Longitude</label>
                            <input type="number" step="any" placeholder="Auto-filled via Address" value={form.longitude} onChange={(e) => setForm({...form, longitude: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium text-green-400" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 relative z-10">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Description</label>
                        <textarea rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium resize-y"></textarea>
                    </div>

                    <div className="flex flex-col gap-2 relative z-10">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Image URLs (comma separated)</label>
                        <input type="text" value={form.images} onChange={e => setForm({...form, images: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" />
                    </div>

                    <div className="flex flex-col gap-2 relative z-10">
                        <label className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider ml-1">Google Maps Embed URL</label>
                        <input type="text" value={form.mapUrl} onChange={e => setForm({...form, mapUrl: e.target.value})} className="bg-[#0A0F1F]/60 border border-[#A0AEC0]/20 p-3.5 rounded-xl w-full text-[#FFFFFF] outline-none focus:border-[#7CC4FF] transition-all duration-300 placeholder:text-[#A0AEC0]/40 font-medium" />
                    </div>

                    <div className="flex gap-4 relative z-10 mt-4">
                        <button disabled={isSubmitting} type="button" onClick={() => router.back()} className="flex-1 bg-transparent text-[#A0AEC0] border border-[#A0AEC0]/20 rounded-xl font-bold hover:text-white hover:bg-white/5 transition-all">
                            Cancel
                        </button>
                        <button disabled={isSubmitting} type="submit" className="flex-1 bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(77,163,255,0.3)] hover:shadow-[0_0_40px_rgba(77,163,255,0.6)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed">
                            {isSubmitting ? "Saving Updates..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
    );
}
