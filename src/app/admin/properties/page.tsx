"use client";

import { useCallback, useEffect, useState } from "react";
import {
    fetchAdminProperties,
    deleteAdminProperty,
    approveAdminProperty,
    type AdminPropertyRow,
} from "@/lib/adminApi";
import { Trash2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export default function AdminPropertiesPage() {
    const [rows, setRows] = useState<AdminPropertyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setError("");
        setLoading(true);
        try {
            setRows(await fetchAdminProperties());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load properties");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onApprove = async (p: AdminPropertyRow, approved: boolean) => {
        setBusyId(p.id);
        setError("");
        try {
            await approveAdminProperty(p.id, approved);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Update failed");
        } finally {
            setBusyId(null);
        }
    };

    const onDelete = async (p: AdminPropertyRow) => {
        if (!confirm(`Delete listing “${p.title}”?`)) return;
        setBusyId(p.id);
        setError("");
        try {
            await deleteAdminProperty(p.id);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Delete failed");
        } finally {
            setBusyId(null);
        }
    };

    return (
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">Properties</h1>
                        <p className="text-[#A0AEC0] text-sm mt-1">Approve, reject, or remove listings</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => load()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#4DA3FF]/30 text-[#7CC4FF] font-bold hover:bg-[#4DA3FF]/10 transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-400 text-sm font-semibold">
                        {error}
                    </div>
                )}

                <div className="bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl overflow-hidden backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#4DA3FF]/20 text-left text-[#A0AEC0] uppercase text-xs tracking-wider">
                                    <th className="px-4 py-4 font-bold">ID</th>
                                    <th className="px-4 py-4 font-bold">Title</th>
                                    <th className="px-4 py-4 font-bold">Location</th>
                                    <th className="px-4 py-4 font-bold">Price</th>
                                    <th className="px-4 py-4 font-bold">Status</th>
                                    <th className="px-4 py-4 font-bold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-[#A0AEC0]">
                                            Loading…
                                        </td>
                                    </tr>
                                )}
                                {!loading &&
                                    rows.map((p) => (
                                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                            <td className="px-4 py-3 text-white font-mono">{p.id}</td>
                                            <td className="px-4 py-3 text-white max-w-[200px] truncate">{p.title}</td>
                                            <td className="px-4 py-3 text-[#A0AEC0]">
                                                {p.city}, {p.state}
                                            </td>
                                            <td className="px-4 py-3 text-white">
                                                ₹{p.price?.toLocaleString?.("en-IN") ?? p.price}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={p.is_published && p.is_verified ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                                                    {p.is_published && p.is_verified ? "Live" : "Held"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => onApprove(p, true)}
                                                        disabled={busyId === p.id}
                                                        className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onApprove(p, false)}
                                                        disabled={busyId === p.id}
                                                        className="p-2 rounded-lg text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
                                                        title="Reject / unpublish"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onDelete(p)}
                                                        disabled={busyId === p.id}
                                                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
    );
}
