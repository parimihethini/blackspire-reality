type Property = {
    location: string;
    type: string;
    price: string;
    image: string;
};

export default function PropertyCard({ location, type, price, image }: Property) {
    return (
        <div className="bg-[#141414] rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition">
            <img src={image} className="w-full h-56 object-cover" />

            <div className="p-6 space-y-3">
                <p className="text-sm text-gray-400">📍 {location}</p>

                <h3 className="text-lg font-semibold">{type}</h3>

                <p className="text-[#C8A951] font-bold text-xl">{price}</p>

                {/* Details disabled */}
            </div>
        </div>
    );
}