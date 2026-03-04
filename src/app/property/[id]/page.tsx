import { properties } from "@/data/properties";
import { notFound } from "next/navigation";
import PropertyClient from "./PropertyClient";

export default async function PropertyDetails({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const property = properties.find((p) => p.id === Number(id));

    if (!property) return notFound();

    return <PropertyClient property={property} />;
}