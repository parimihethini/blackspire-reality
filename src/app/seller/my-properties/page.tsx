"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getErrorDetail, authFetch, API_ORIGIN, readJsonSafely } from "@/lib/api";
import { clearAuth } from "@/lib/auth";
import { Property } from "@/data/properties";
import SellerListingCard from "@/components/SellerListingCard";
import Link from "next/link";

export default function MyProperties() {
    const router = useRouter();
    const [myProps, setMyProps] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadMyProps = async () => {
        setIsLoading(true);
        const auth = getAuth();
        if (!auth?.loggedIn) {
            setIsLoading(false);
            return;
        }

        try {
            // Load from Backend API
            const response = await authFetch(`${API_ORIGIN}/properties/seller/my`);

            if (!response.ok) {
                if (response.status === 401) {
                    clearAuth();
                    router.push("/seller/login");
                    return;
                }
                throw new Error("Failed to fetch seller properties");
            }
            
            const myFilteredProps: Property[] = (await readJsonSafely(response)) || [];
            
            console.log("Seller Dashboard Debug:", {
                count: myFilteredProps.length,
                sellerEmail: auth.email
            });

            setMyProps(myFilteredProps);
        } catch (err) {
            console.error("Failed to load seller properties:", err);
            setMyProps([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const auth = getAuth();
        if (!auth?.loggedIn) {
            router.push("/login/seller");
            return;
        }
        loadMyProps();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this listing permanently?")) return;
        
        try {
            const response = await authFetch(`${API_ORIGIN}/properties/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error(await getErrorDetail(response, "Error deleting property"));
            }
            
            // Immediately update local state
            setMyProps(prev => prev.filter(p => p.id !== id));
            console.log(`Property ${id} deleted from backend.`);
        } catch (err: any) {
            console.error("Error deleting property:", err);
            alert(err.message || "Error deleting property.");
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <button onClick={() => router.back()} className="text-[#A0AEC0] hover:text-[#FFFFFF] transition-colors">&larr; Dashboard</button>
                            <h1 className="text-3xl font-extrabold text-[#FFFFFF] drop-shadow-md">My <span className="text-[#4DA3FF] drop-shadow-[0_0_8px_rgba(77,163,255,0.4)]">Listings</span></h1>
                        </div>
                        <p className="text-[#A0AEC0] font-medium">Manage your active and sold properties on Blackspire Reality.</p>
                    </div>
                    <Link href="/seller/add-property" className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-extrabold px-6 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(77,163,255,0.4)] transition-all hover:-translate-y-0.5">
                        + New Property
                    </Link>
                </div>

                {isLoading ? (
                    <div className="text-center py-20 text-[#A0AEC0] animate-pulse">Loading your properties...</div>
                ) : myProps.length === 0 ? (
                    <div className="bg-[#121A2F]/80 backdrop-blur-xl border border-[#4DA3FF]/10 rounded-3xl p-12 text-center flex flex-col items-center shadow-[0_20px_60px_rgba(77,163,255,0.05)]">
                        <p className="text-2xl font-bold text-white mb-2">You haven't listed any properties yet.</p>
                        <p className="text-[#A0AEC0] mb-8 font-medium">Create your first listing to start reaching thousands of potential buyers.</p>
                        <Link href="/seller/add-property" className="bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] hover:shadow-[0_0_20px_rgba(77,163,255,0.4)] text-[#0A0F1F] font-extrabold px-8 py-3.5 rounded-xl hover:-translate-y-0.5 transition-all duration-300">
                            Post First Property
                        </Link>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {myProps.map((prop) => (
                            <div key={prop.id} className="relative group">
                                <SellerListingCard property={prop} onDelete={handleDelete} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
    );
}
