import { useEffect, useState } from "react";

// 🚫 NO BACKEND — WebSocket replaced with simulated price stream
export function usePriceStream(propertyId: string | number | undefined) {
    const [price, setPrice] = useState<number | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);

    useEffect(() => {
        if (!propertyId) return;

        // Simulate a live price stream with minor fluctuations
        const BASE_PRICE = 5_000_000 + (parseInt(String(propertyId)) % 10) * 500_000;
        setPrice(BASE_PRICE);
        setIsStreaming(true);

        const interval = setInterval(() => {
            setPrice(prev => {
                if (prev === null) return BASE_PRICE;
                // ±0.5% random fluctuation
                const delta = prev * (Math.random() * 0.01 - 0.005);
                return Math.round(prev + delta);
            });
        }, 3000);

        return () => {
            clearInterval(interval);
            setIsStreaming(false);
        };
    }, [propertyId]);

    return { price, isStreaming };
}
