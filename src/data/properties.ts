import { authFetch, API_ORIGIN } from "@/lib/httpClient";

export type Property = {
    id: number;
    title: string;
    type: "plot" | "house" | "villa" | "investment";
    price: number;
    size: string;
    description: string;
    features: string[];
    images: string[];
    approval: "DTCP" | "CMDA" | "Approved" | "BMRDA" | "Panchayat";
    status: "Available" | "Sold" | "Ready to Move" | "Under Construction" | "New Launch";
    location: {
        city: string;
        area: string;
        state: string;
        street?: string;
        country?: string;
    };
    mapUrl: string;
    seller_phone?: string;
    latitude?: number;
    longitude?: number;
    sellerEmail?: string;
};

// 🚫 NO DUMMY PROPERTIES (Purged for production realism)
export const STATIC_PROPERTIES: Property[] = [];

/**
 * Loads properties from the FastAPI Backend.
 */
export async function getProperties(type?: string): Promise<Property[]> {
    try {
        const url = type
            ? `${API_ORIGIN}/properties?type=${encodeURIComponent(type)}`
            : `${API_ORIGIN}/properties`;
        const res = await authFetch(url);
        if (!res.ok) throw new Error("Failed to fetch properties from server");
        const backendData = await res.json();
        
        // Map backend response to frontend Property interface
        return backendData.map((p: any) => ({
            id: p.id,
            title: p.title,
            type: p.type || "house",
            price: p.price,
            size: p.size || "Unknown",
            description: p.description || "",
            features: p.features || [],
            images: p.images && p.images.length > 0 ? p.images : ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000"],
            approval: p.approval || "Approved",
            status: p.status || "Available",
            location: {
                city: p.city || "",
                area: p.area || "",
                state: p.state || "",
                street: p.street || "",
                country: p.country || "India",
            },
            mapUrl: p.map_url || "",
            seller_phone: p.seller_phone || "",
            latitude: p.latitude,
            longitude: p.longitude,
            sellerEmail: p.seller_email,
        }));
    } catch (e) {
        console.error("Error loading properties from backend:", e);
        return [];
    }
}

/**
 * Fetches a single property from Backend by ID.
 */
export async function getPropertyById(id: string | number): Promise<Property | null> {
    try {
        const res = await authFetch(`${API_ORIGIN}/properties/${id}`);
        if (!res.ok) return null;
        const p = await res.json();
        
        return {
            id: p.id,
            title: p.title,
            type: p.type || "house",
            price: p.price,
            size: p.size || "Unknown",
            description: p.description || "",
            features: p.features || [],
            images: p.images && p.images.length > 0 ? p.images : ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000"],
            approval: p.approval || "Approved",
            status: p.status || "Available",
            location: {
                city: p.city || "",
                area: p.area || "",
                state: p.state || "",
                street: p.street || "",
                country: p.country || "India",
            },
            mapUrl: p.map_url || "",
            seller_phone: p.seller_phone || "",
            latitude: p.latitude,
            longitude: p.longitude,
            sellerEmail: p.seller_email,
        };
    } catch (e) {
        console.error("Error fetching property by ID from backend:", e);
        return null;
    }
}
