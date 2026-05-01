"use client";

import { useCallback, useEffect, useState } from "react";
import {
    fetchAdminUsers,
    deleteAdminUser,
    patchAdminUserRole,
    type AdminUserRow,
} from "@/lib/adminApi";
import { Trash2, RefreshCw } from "lucide-react";

const ROLES = ["customer", "seller", "admin"] as const;

export default function AdminUsersPage() {
    const [rows, setRows] = useState<AdminUserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setError("");
        setLoading(true);
        try {
            setRows(await fetchAdminUsers());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load users");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onRoleChange = async (user: AdminUserRow, role: string) => {
        setBusyId(user.id);
        setError("");
        try {
            await patchAdminUserRole(user.id, role);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Update failed");
        } finally {
            setBusyId(null);
        }
    };

    const onDelete = async (user: AdminUserRow) => {
        if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) return;
        setBusyId(user.id);
        setError("");
        try {
            await deleteAdminUser(user.id);
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
                        <h1 className="text-3xl font-extrabold text-white">Users</h1>
                        <p className="text-[#A0AEC0] text-sm mt-1">Roles, verification, and access</p>
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
                                    <th className="px-4 py-4 font-bold">Name</th>
                                    <th className="px-4 py-4 font-bold">Email</th>
                                    <th className="px-4 py-4 font-bold">Role</th>
                                    <th className="px-4 py-4 font-bold">Verified</th>
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
                                    rows.map((u) => (
                                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                            <td className="px-4 py-3 text-white font-mono">{u.id}</td>
                                            <td className="px-4 py-3 text-white">{u.name}</td>
                                            <td className="px-4 py-3 text-[#A0AEC0]">{u.email}</td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={u.role}
                                                    disabled={busyId === u.id}
                                                    onChange={(e) => onRoleChange(u, e.target.value)}
                                                    className="bg-[#0A0F1F] border border-[#4DA3FF]/30 rounded-lg px-2 py-1.5 text-white text-xs font-semibold"
                                                >
                                                    {ROLES.map((r) => (
                                                        <option key={r} value={r}>
                                                            {r}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={
                                                        u.is_verified
                                                            ? "text-emerald-400 font-semibold"
                                                            : "text-amber-400 font-semibold"
                                                    }
                                                >
                                                    {u.is_verified ? "Yes" : "No"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(u)}
                                                    disabled={busyId === u.id}
                                                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                                                    title="Delete user"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
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
