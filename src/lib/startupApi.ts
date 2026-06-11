import { readJsonSafely, getErrorDetail } from "./api";
import { authFetch, API_ORIGIN } from "./httpClient";
import { getAuthToken } from "./auth";

export type StartupRow = {
    id: number;
    founder_id: number;
    name: string;
    logo_url: string | null;
    founder_name: string | null;
    co_founder_name: string | null;
    industry: string | null;
    stage: string | null;
    revenue: number | null;
    team_size: number | null;
    funding_requirement: number | null;
    funding_raised: number | null;
    valuation: number | null;
    website: string | null;
    linkedin_url: string | null;
    description: string | null;
    problem_statement: string | null;
    solution: string | null;
    target_market: string | null;
    business_model: string | null;
    location: string | null;
    country: string | null;
    pitch_deck_url: string | null;
    status: string;
    verification_status: string;
    views_count: number;
    profile_completion: number;
    is_deleted: boolean;
    is_saved?: boolean | null;
    created_at: string;
    updated_at: string | null;
};

export type PaginatedStartups = {
    items: StartupRow[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
};

export type FounderDashboard = {
    total_startups: number;
    published_startups: number;
    pending_review_startups: number;
    total_views: number;
    deck_requests: number;
    contact_requests: number;
    interest_expressions: number;
    saves_count: number;
    profile_completion: number;
    funding_raised: number;
    funding_requirement: number;
};

export type StartupFormData = {
    name: string;
    logo_url?: string | null;
    founder_name?: string | null;
    co_founder_name?: string | null;
    industry?: string | null;
    stage?: string | null;
    revenue?: number | null;
    team_size?: number | null;
    funding_requirement?: number | null;
    funding_raised?: number | null;
    valuation?: number | null;
    website?: string | null;
    linkedin_url?: string | null;
    description?: string | null;
    problem_statement?: string | null;
    solution?: string | null;
    target_market?: string | null;
    business_model?: string | null;
    location?: string | null;
    country?: string | null;
    pitch_deck_url?: string | null;
    status?: string | null;
    verification_status?: string | null;
};

function buildQuery(params: Record<string, string | number | undefined | null>): string {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") query.append(k, String(v));
    });
    return query.toString();
}

export async function fetchPublicStartups(params: {
    q?: string;
    industry?: string;
    stage?: string;
    country?: string;
    funding_min?: number;
    funding_max?: number;
    revenue_min?: number;
    revenue_max?: number;
    team_size_min?: number;
    team_size_max?: number;
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_order?: string;
} = {}): Promise<PaginatedStartups> {
    const res = await fetch(`${API_ORIGIN}/startups/?${buildQuery(params)}`);
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to load startups"));
    return (await readJsonSafely(res)) as PaginatedStartups;
}

export async function fetchStartupDetail(id: number): Promise<StartupRow> {
    const token = getAuthToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_ORIGIN}/startups/${id}`, { headers });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to load startup"));
    return (await readJsonSafely(res)) as StartupRow;
}

export async function fetchFounderDashboard(): Promise<FounderDashboard> {
    const res = await authFetch(`${API_ORIGIN}/founder/startups/dashboard`);
    if (res.status === 401 || res.status === 403) throw new Error("Founder session expired. Please log in again.");
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to load dashboard"));
    return (await readJsonSafely(res)) as FounderDashboard;
}

export async function fetchMyStartups(): Promise<StartupRow[]> {
    const res = await authFetch(`${API_ORIGIN}/founder/startups/me`);
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to load your startups"));
    return (await readJsonSafely(res)) as StartupRow[];
}

export async function createStartup(data: StartupFormData): Promise<StartupRow> {
    const res = await authFetch(`${API_ORIGIN}/founder/startups/`, {
        method: "POST",
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to create startup"));
    return (await readJsonSafely(res)) as StartupRow;
}

export async function updateStartup(id: number, data: Partial<StartupFormData>): Promise<StartupRow> {
    const res = await authFetch(`${API_ORIGIN}/founder/startups/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to update startup"));
    return (await readJsonSafely(res)) as StartupRow;
}

export async function submitStartup(id: number): Promise<StartupRow> {
    const res = await authFetch(`${API_ORIGIN}/founder/startups/${id}/submit`, { method: "POST" });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to submit startup"));
    return (await readJsonSafely(res)) as StartupRow;
}

export async function deleteStartup(id: number): Promise<void> {
    const res = await authFetch(`${API_ORIGIN}/founder/startups/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to delete startup"));
}

export async function uploadStartupLogo(id: number, file: File): Promise<StartupRow> {
    const form = new FormData();
    form.append("file", file);
    const token = getAuthToken();
    const res = await fetch(`${API_ORIGIN}/founder/startups/${id}/logo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
    });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to upload logo"));
    return (await readJsonSafely(res)) as StartupRow;
}

export async function uploadPitchDeck(id: number, file: File): Promise<StartupRow> {
    const form = new FormData();
    form.append("file", file);
    const token = getAuthToken();
    const res = await fetch(`${API_ORIGIN}/founder/startups/${id}/pitch-deck`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
    });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to upload pitch deck"));
    return (await readJsonSafely(res)) as StartupRow;
}

export async function saveStartup(id: number): Promise<void> {
    const res = await authFetch(`${API_ORIGIN}/investor/startups/${id}/save`, { method: "POST" });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to save startup"));
}

export async function unsaveStartup(id: number): Promise<void> {
    const res = await authFetch(`${API_ORIGIN}/investor/startups/${id}/save`, { method: "DELETE" });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to unsave startup"));
}

export async function requestPitchDeck(id: number, message?: string): Promise<void> {
    const res = await authFetch(`${API_ORIGIN}/investor/startups/${id}/request-deck`, {
        method: "POST",
        body: JSON.stringify({ message: message || null }),
    });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to request pitch deck"));
}

export async function contactFounder(id: number, subject: string, message: string): Promise<void> {
    const res = await authFetch(`${API_ORIGIN}/investor/startups/${id}/contact`, {
        method: "POST",
        body: JSON.stringify({ subject, message }),
    });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to contact founder"));
}

export async function expressInterest(id: number, interestLevel = "medium", notes?: string): Promise<void> {
    const res = await authFetch(`${API_ORIGIN}/investor/startups/${id}/express-interest`, {
        method: "POST",
        body: JSON.stringify({ interest_level: interestLevel, notes: notes || null }),
    });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to express interest"));
}

export async function fetchSavedStartups(): Promise<StartupRow[]> {
    const res = await authFetch(`${API_ORIGIN}/investor/startups/saved`);
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to load saved startups"));
    return (await readJsonSafely(res)) as StartupRow[];
}

export async function fetchAdminStartups(params: Record<string, string | number | undefined> = {}): Promise<PaginatedStartups> {
    const res = await authFetch(`${API_ORIGIN}/admin/startups/?${buildQuery(params)}`);
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to load admin startups"));
    return (await readJsonSafely(res)) as PaginatedStartups;
}

export async function adminApproveStartup(id: number): Promise<StartupRow> {
    const res = await authFetch(`${API_ORIGIN}/admin/startups/${id}/approve`, { method: "POST" });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to approve startup"));
    return (await readJsonSafely(res)) as StartupRow;
}

export async function adminRejectStartup(id: number, reason?: string): Promise<StartupRow> {
    const res = await authFetch(`${API_ORIGIN}/admin/startups/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason || null }),
    });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to reject startup"));
    return (await readJsonSafely(res)) as StartupRow;
}

export async function adminVerifyStartup(id: number): Promise<StartupRow> {
    const res = await authFetch(`${API_ORIGIN}/admin/startups/${id}/verify`, { method: "POST" });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to verify startup"));
    return (await readJsonSafely(res)) as StartupRow;
}

export async function adminSuspendStartup(id: number, reason?: string): Promise<StartupRow> {
    const res = await authFetch(`${API_ORIGIN}/admin/startups/${id}/suspend`, {
        method: "POST",
        body: JSON.stringify({ reason: reason || null }),
    });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to suspend startup"));
    return (await readJsonSafely(res)) as StartupRow;
}

export async function adminDeleteStartup(id: number): Promise<void> {
    const res = await authFetch(`${API_ORIGIN}/admin/startups/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await getErrorDetail(res, "Failed to delete startup"));
}
