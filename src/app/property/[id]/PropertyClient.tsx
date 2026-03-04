"use client";

import { useState } from "react";

export default function PropertyClient({ property }: any) {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        message: ""
    });

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Lead Capture Form Submitted:", formData);
        alert("Thank you! Your inquiry has been submitted.");
        setFormData({ name: "", phone: "", message: "" });
    };

    return (
        <div className="min-h-screen bg-[#0B0B0B] text-white p-10">
            <h1 className="text-3xl font-bold">{property.title}</h1>

            <p className="text-gray-400 mt-1">
                {property.location.area}, {property.location.city}
            </p>

            <div className="flex items-center gap-4 mt-4">
                <span className="text-3xl font-bold text-[#C8A951]">
                    ₹{property.price.toLocaleString("en-IN")}
                </span>

                <span className="px-3 py-1 bg-green-600 text-xs rounded-full">
                    {property.status}
                </span>

                <span className="px-3 py-1 bg-blue-600 text-xs rounded-full">
                    {property.approval}
                </span>
            </div>

            <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-96 object-cover rounded-lg mt-6"
            />

            <div className="grid md:grid-cols-3 gap-10 mt-10">

                {/* LEFT SECTION */}
                <div className="md:col-span-2">
                    <h2 className="text-2xl font-bold mb-6 border-b border-gray-800 pb-2">Property Overview</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-gray-800">
                            <p className="text-sm text-gray-400 mb-1">Price</p>
                            <p className="text-lg font-bold text-[#C8A951]">₹{property.price.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-gray-800">
                            <p className="text-sm text-gray-400 mb-1">Size</p>
                            <p className="text-lg font-bold text-white">{property.size}</p>
                        </div>
                        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-gray-800">
                            <p className="text-sm text-gray-400 mb-1">Approval</p>
                            <p className="text-lg font-bold text-white">{property.approval}</p>
                        </div>
                        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-gray-800">
                            <p className="text-sm text-gray-400 mb-1">Status</p>
                            <p className="text-lg font-bold text-white">{property.status}</p>
                        </div>
                    </div>

                    <h2 className="text-xl font-semibold mb-3">Description</h2>
                    <p className="text-gray-300 mb-8 leading-relaxed">{property.description}</p>

                    <h2 className="text-xl font-semibold mb-3">Features</h2>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-300 mb-8">
                        {property.features.map((feature: string, i: number) => (
                            <li key={i} className="flex items-center gap-2">
                                <span className="text-[#C8A951]">✔</span> {feature}
                            </li>
                        ))}
                    </ul>

                    <h2 className="text-xl font-semibold mb-3">Location</h2>
                    <p className="text-gray-300 mb-4">{property.location.area}, {property.location.city}, {property.location.state}</p>
                    <iframe
                        src={property.mapUrl}
                        className="w-full h-80 rounded-lg border border-gray-800"
                        loading="lazy"
                    />
                </div>

                {/* RIGHT SECTION */}
                <div className="bg-[#141414] p-6 rounded-xl shadow-lg border border-gray-800 h-fit md:sticky md:top-24">
                    <h3 className="text-xl font-bold mb-6 text-white text-center">Interested in this property?</h3>

                    <a
                        href="tel:9876543210"
                        className="block w-full bg-gradient-to-r from-[#C8A951] to-[#E5C76B] hover:from-[#E5C76B] hover:to-[#C8A951] transition-all duration-300 shadow-lg hover:shadow-[#C8A951]/30 hover:scale-105 text-black py-3 rounded-md mb-4 text-center font-bold"
                    >
                        Call Now
                    </a>

                    <a
                        href={`https://wa.me/919876543210?text=I'm interested in ${property.title}`}
                        target="_blank"
                        className="block w-full bg-green-600 hover:bg-green-700 transition-colors text-white py-3 rounded-md mb-8 text-center font-bold"
                    >
                        WhatsApp Inquiry
                    </a>

                    <form onSubmit={handleFormSubmit} className="space-y-4 border-t border-gray-800 pt-6">
                        <h4 className="text-lg font-semibold text-white mb-2">Book Site Visit</h4>
                        <input
                            type="text"
                            required
                            placeholder="Your Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-[#111] text-white px-4 py-2.5 rounded-md outline-none border border-gray-800 focus:border-[#C8A951] transition text-sm"
                        />
                        <input
                            type="tel"
                            required
                            placeholder="Your Phone Number"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-[#111] text-white px-4 py-2.5 rounded-md outline-none border border-gray-800 focus:border-[#C8A951] transition text-sm"
                        />
                        <textarea
                            required
                            placeholder="Your Message"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            className="w-full bg-[#111] text-white px-4 py-2.5 rounded-md outline-none border border-gray-800 focus:border-[#C8A951] transition text-sm min-h-[80px]"
                        ></textarea>
                        <button type="submit" className="w-full bg-gradient-to-r from-[#C8A951] to-[#E5C76B] hover:from-[#E5C76B] hover:to-[#C8A951] transition-all duration-300 shadow-lg hover:shadow-[#C8A951]/30 hover:scale-105 py-3 rounded-md font-bold text-black mt-2">
                            Submit Inquiry
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}