import { authFetch, API_ORIGIN, readJsonSafely, getErrorDetail } from "./api";

export type AdminStats = {
    total_users: number;
    customers: number;
    sellers: number;
    admins: number;
    total_properties: number;
    published_properties: number;
    pending_listings: number;
};

export type AdminUserRow = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
};

export type AdminPropertyRow = {
    id: number;
    seller_id: number;
    title: string;
    city: string;
    state: string;
    price: number;
    is_published: boolean;
    is_verified: boolean;
    type: string;
};

export async function fetchAdminStats(): Promise<AdminStats> {
    const res = await authFetch(`${API_ORIGIN}/admin/stats`);
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to load stats"));
    return (await readJsonSafely(res)) as AdminStats;
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
    const res = await authFetch(`${API_ORIGIN}/admin/users`);
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to load users"));
    return ((await readJsonSafely(res)) as AdminUserRow[]) || [];
}

export async function deleteAdminUser(id: number): Promise<void> {
    const res = await authFetch(`${API_ORIGIN}/admin/users/${id}`, { method: "DELETE" });
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Delete failed"));
}

export async function patchAdminUserRole(id: number, role: string): Promise<AdminUserRow> {
    const res = await authFetch(`${API_ORIGIN}/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
    });
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Role update failed"));
    return (await readJsonSafely(res)) as AdminUserRow;
}

export async function fetchAdminProperties(): Promise<AdminPropertyRow[]> {
    const res = await authFetch(`${API_ORIGIN}/admin/properties`);
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to load properties"));
    return ((await readJsonSafely(res)) as AdminPropertyRow[]) || [];
}

export async function deleteAdminProperty(id: number): Promise<void> {
    const res = await authFetch(`${API_ORIGIN}/admin/properties/${id}`, { method: "DELETE" });
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Delete failed"));
}

export async function approveAdminProperty(id: number, approved: boolean): Promise<AdminPropertyRow> {
    const res = await authFetch(`${API_ORIGIN}/admin/properties/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ approved }),
    });
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Update failed"));
    return (await readJsonSafely(res)) as AdminPropertyRow;
}
