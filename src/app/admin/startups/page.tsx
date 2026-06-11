"use client";

import { useCallback, useEffect, useState } from "react";
import {
    fetchAdminStartups,
    adminApproveStartup,
    adminRejectStartup,
    adminVerifyStartup,
    adminSuspendStartup,
    adminDeleteStartup,
    type StartupRow,
} from "@/lib/startupApi";
import { CheckCircle2, XCircle, Shield, PauseCircle, Trash2, RefreshCw } from "lucide-react";

export default function AdminStartupsPage() {
    const [rows, setRows] = useState<StartupRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [busyId, setBusyId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(0);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q), 350);
        return () => clearTimeout(t);
    }, [q]);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetchAdminStartups({
                q: debouncedQ || undefined,
                status: statusFilter || undefined,
                page,
                per_page: 20,
            });
            setRows(res.items);
            setPages(res.pages);
            setTotal(res.total);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load startups");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [debouncedQ, statusFilter, page]);

    useEffect(() => { load(); }, [load]);

    const act = async (id: number, fn: () => Promise<unknown>, msg: string) => {
        setBusyId(id);
        setError("");
        setSuccess("");
        try {
            await fn();
            setSuccess(msg);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Action failed");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white">Startups</h1>
                    <p className="text-[#A0AEC0] text-sm mt-1">Approve, verify, and moderate startup listings</p>
                </div>
                <button type="button" onClick={() => load()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#4DA3FF]/30 text-[#7CC4FF] font-bold">
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search startups…" className="flex-1 bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl px-4 py-2 text-sm text-white" />
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl px-4 py-2 text-sm text-white">
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="published">Published</option>
                    <option value="rejected">Rejected</option>
                    <option value="suspended">Suspended</option>
                </select>
            </div>

            {error && <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-400 text-sm">{error}</div>}
            {success && <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-400 text-sm">{success}</div>}

            <div className="bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#4DA3FF]/20 text-left text-[#A0AEC0] uppercase text-xs">
                                <th className="px-4 py-4">ID</th>
                                <th className="px-4 py-4">Name</th>
                                <th className="px-4 py-4">Founder</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4">Verified</th>
                                <th className="px-4 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={6} className="px-4 py-12 text-center text-[#A0AEC0]">Loading…</td></tr>}
                            {!loading && rows.map((s) => (
                                <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 font-mono text-white">{s.id}</td>
                                    <td className="px-4 py-3 text-white max-w-[180px] truncate">{s.name}</td>
                                    <td className="px-4 py-3 text-[#A0AEC0]">{s.founder_name || "—"}</td>
                                    <td className="px-4 py-3 capitalize text-amber-400 font-semibold">{s.status.replace("_", " ")}</td>
                                    <td className="px-4 py-3 capitalize">{s.verification_status}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {s.status === "pending_review" && (
                                                <>
                                                    <button type="button" disabled={busyId === s.id} onClick={() => act(s.id, () => adminApproveStartup(s.id), "Approved")} className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg" title="Approve"><CheckCircle2 size={16} /></button>
                                                    <button type="button" disabled={busyId === s.id} onClick={() => act(s.id, () => adminRejectStartup(s.id), "Rejected")} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg" title="Reject"><XCircle size={16} /></button>
                                                </>
                                            )}
                                            {s.verification_status !== "verified" && (
                                                <button type="button" disabled={busyId === s.id} onClick={() => act(s.id, () => adminVerifyStartup(s.id), "Verified")} className="p-1.5 text-[#4DA3FF] hover:bg-[#4DA3FF]/10 rounded-lg" title="Verify"><Shield size={16} /></button>
                                            )}
                                            {s.status === "published" && (
                                                <button type="button" disabled={busyId === s.id} onClick={() => act(s.id, () => adminSuspendStartup(s.id), "Suspended")} className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-lg" title="Suspend"><PauseCircle size={16} /></button>
                                            )}
                                            <button type="button" disabled={busyId === s.id} onClick={() => { if (confirm(`Delete ${s.name}?`)) act(s.id, () => adminDeleteStartup(s.id), "Deleted"); }} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg" title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-sm text-[#A0AEC0]">
                        <span>{total} startups</span>
                        <div className="flex gap-2">
                            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg border border-white/10 disabled:opacity-40">Prev</button>
                            <span>{page}/{pages}</span>
                            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-white/10 disabled:opacity-40">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
