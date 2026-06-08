import { authFetch, API_ORIGIN, readJsonSafely, getErrorDetail } from "./api";

export type UserSummaryRow = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    profile_image: string | null;
};

export type InvestorProfileRow = {
    id: number;
    user_id: number;
    company_name: string | null;
    designation: string | null;
    investor_type: string | null;
    linkedin_url: string | null;
    website_url: string | null;
    ticket_size_min: number | null;
    ticket_size_max: number | null;
    preferred_countries: string[];
    preferred_cities: string[];
    notes: string | null;
    internal_comments: string | null;
    priority_score: number;
    industries: string[];
    stages: string[];
    is_deleted: boolean;
    created_at: string;
    updated_at: string | null;
    user: UserSummaryRow | null;
    created_by: number | null;
    updated_by: number | null;
};

export type InvestorCreateParams = {
    user_id?: number | null;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    password?: string | null;
    company_name?: string | null;
    designation?: string | null;
    investor_type?: string | null;
    linkedin_url?: string | null;
    website_url?: string | null;
    ticket_size_min?: number | null;
    ticket_size_max?: number | null;
    preferred_countries?: string[];
    preferred_cities?: string[];
    notes?: string | null;
    internal_comments?: string | null;
    priority_score?: number;
    industries?: string[];
    stages?: string[];
};

export type InvestorUpdateParams = Partial<Omit<InvestorCreateParams, "user_id" | "email" | "name" | "phone" | "password">>;

export async function fetchInvestors(params: {
    q?: string;
    investor_type?: string;
    stage?: string;
    industry?: string;
    city?: string;
    country?: string;
    ticket_size_min?: number;
    ticket_size_max?: number;
    priority_score?: number;
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_order?: string;
} = {}): Promise<InvestorProfileRow[]> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
            query.append(key, String(val));
        }
    });

    const res = await authFetch(`${API_ORIGIN}/admin/investors/?${query.toString()}`);
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to load investors"));
    return ((await readJsonSafely(res)) as InvestorProfileRow[]) || [];
}

export async function fetchInvestorById(id: number): Promise<InvestorProfileRow> {
    const res = await authFetch(`${API_ORIGIN}/admin/investors/${id}`);
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to load investor profile"));
    return (await readJsonSafely(res)) as InvestorProfileRow;
}

export async function createInvestor(body: InvestorCreateParams): Promise<InvestorProfileRow> {
    const res = await authFetch(`${API_ORIGIN}/admin/investors/`, {
        method: "POST",
        body: JSON.stringify(body),
    });
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to create investor"));
    return (await readJsonSafely(res)) as InvestorProfileRow;
}

export async function updateInvestor(id: number, body: InvestorUpdateParams): Promise<InvestorProfileRow> {
    const res = await authFetch(`${API_ORIGIN}/admin/investors/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
    });
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to update investor"));
    return (await readJsonSafely(res)) as InvestorProfileRow;
}

export async function deleteInvestor(id: number): Promise<void> {
    const res = await authFetch(`${API_ORIGIN}/admin/investors/${id}`, {
        method: "DELETE",
    });
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to delete investor"));
}

export async function importInvestorsCsv(file: File): Promise<{
    status: string;
    imported: number;
    skipped: number;
    errors: string[];
}> {
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token"); // or obtain standard auth token header
    const headers: Record<string, string> = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_ORIGIN}/admin/investors/import`, {
        method: "POST",
        headers,
        body: formData,
    });
    if (res.status === 401 || res.status === 403) {
        throw new Error("Admin session expired or access denied.");
    }
    if (!res.ok) throw new Error(await getErrorDetail(res, "Import failed"));
    return (await readJsonSafely(res)) as any;
}

export function getExportInvestorsUrl(): string {
    return `${API_ORIGIN}/admin/investors/export`;
}
