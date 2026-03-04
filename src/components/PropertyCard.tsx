import Link from 'next/link';
import { Property } from '@/data/properties';

export default function PropertyCard({ property }: { property: Property }) {
    // Format price to Indian Rupee
    const formattedPrice = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(property.price);

    return (
        <Link
            href={`/property/${property.id}`}
            className="group flex flex-col bg-[#111111] rounded-lg overflow-hidden border border-gray-800 hover:border-[#C8A951] transition-colors duration-200"
        >
            {/* Image Container */}
            <div className="relative h-48 w-full overflow-hidden bg-[#1A1A1A]">
                <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                    <span className="bg-[#0B0B0B] text-white px-2 py-1 rounded text-xs font-semibold border border-gray-700 shadow-sm">
                        {property.approval} Approved
                    </span>
                </div>
                {property.status === 'Sold' && (
                    <div className="absolute top-3 right-3 flex items-start pointer-events-none">
                        <span className="bg-red-900/90 text-white px-2 py-1 rounded text-xs font-semibold shadow-sm">
                            SOLD
                        </span>
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div className="p-5 flex flex-col flex-1">
                <p className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                    <span className="text-[#C8A951]">📍</span> {property.location.city}
                </p>

                <h3 className="text-lg font-semibold text-white mb-2 leading-tight">
                    {property.size} {property.title}
                </h3>

                <p className="text-xl font-bold text-[#C8A951] mb-4">
                    {formattedPrice}
                </p>

                <div className="mb-5 space-y-1.5 flex-1">
                    <p className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-[#C8A951]">✔</span> {property.approval} Approved
                    </p>
                    {property.features.slice(0, 2).map((feature, idx) => (
                        <p key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-[#C8A951]">✔</span> {feature}
                        </p>
                    ))}
                </div>

                <div className="mt-auto pt-2 border-t border-gray-800">
                    <button className="w-full mt-2 bg-gradient-to-r from-[#C8A951] to-[#E5C76B] hover:from-[#E5C76B] hover:to-[#C8A951] transition-all duration-300 shadow-lg hover:shadow-[#C8A951]/30 hover:scale-105 py-2.5 rounded-md font-bold text-black text-sm">
                        View Details
                    </button>
                </div>
            </div>
        </Link>
    );
}
