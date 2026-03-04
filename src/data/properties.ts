export type Property = {
    id: number;
    title: string;
    type: "plot" | "house" | "villa" | "investment";
    price: number;
    size: string;
    description: string;
    features: string[];
    images: string[];
    approval: "DTCP" | "CMDA" | "Approved";
    status: "Available" | "Sold";
    location: {
        city: string;
        area: string;
        state: string;
    };
    mapUrl: string;
};

export const properties: Property[] = [
    {
        id: 1,
        title: "1200 Sqft Residential Plot",
        type: "plot",
        price: 850000,
        size: "1200 Sqft",
        description: "Premium residential plot located in a fast-growing corridor. Ideal for building your dream home or long-term investment.",
        features: ["40ft Road Access", "Clear Title", "Street Lights"],
        images: [
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
            "https://images.unsplash.com/photo-1518780664697-55e3ad937233"
        ],
        approval: "DTCP",
        status: "Available",
        location: {
            city: "Coimbatore",
            area: "Saravanampatti",
            state: "Tamil Nadu",
        },
        mapUrl: "https://www.google.com/maps/embed?pb="
    },
    {
        id: 2,
        title: "3BHK Ultra Luxury Villa",
        type: "villa",
        price: 14500000,
        size: "2400 Sqft",
        description: "Exquisite luxury villa offering a premium lifestyle with ultra-modern amenities and superior architectural design.",
        features: ["Gated Community", "Clubhouse", "24/7 Security"],
        images: [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
            "https://images.unsplash.com/photo-1613977257363-707ba9348227"
        ],
        approval: "CMDA",
        status: "Available",
        location: {
            city: "Chennai",
            area: "ECR, Uthandi",
            state: "Tamil Nadu",
        },
        mapUrl: "https://www.google.com/maps/embed?pb="
    },
    {
        id: 3,
        title: "2 Acres Commercial Land",
        type: "investment",
        price: 32000000,
        size: "2 Acres",
        description: "Prime commercial land located near upcoming large infrastructure projects. Perfect for significant capital appreciation.",
        features: ["Highway Facing", "High ROI Zone", "Commercial Zone"],
        images: [
            "https://images.unsplash.com/photo-1592595896551-12b371d546d5",
            "https://images.unsplash.com/photo-1524813686514-a57563d77965"
        ],
        approval: "Approved",
        status: "Available",
        location: {
            city: "Hyderabad",
            area: "Shamshabad",
            state: "Telangana",
        },
        mapUrl: "https://www.google.com/maps/embed?pb="
    },
    {
        id: 4,
        title: "Premium 3BHK Independent House",
        type: "house",
        price: 8500000,
        size: "1800 Sqft",
        description: "Spacious independent house located in a serene residential layout. Close to top schools and IT parks.",
        features: ["Covered Parking", "Water Facility", "Vaastu Compliant"],
        images: [
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
        ],
        approval: "Approved",
        status: "Sold",
        location: {
            city: "Bangalore",
            area: "Whitefield",
            state: "Karnataka",
        },
        mapUrl: "https://www.google.com/maps/embed?pb="
    },
    {
        id: 5,
        title: "1500 Sqft Corner Plot",
        type: "plot",
        price: 1250000,
        size: "1500 Sqft",
        description: "Corner plot in a developing residential hub. Ready to construct with all basic amenities already provisioned.",
        features: ["Corner Plot", "Water Pipeline", "Gated Security"],
        images: [
            "https://images.unsplash.com/photo-1518780664697-55e3ad937233",
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef"
        ],
        approval: "DTCP",
        status: "Available",
        location: {
            city: "Chennai",
            area: "OMR, Kelambakkam",
            state: "Tamil Nadu",
        },
        mapUrl: "https://www.google.com/maps/embed?pb="
    }
];
