import { authFetch, readApiError } from "./httpClient";

export type CrmLeadStatus =
    | "new_lead"
    | "contacted"
    | "meeting_scheduled"
    | "due_diligence"
    | "negotiation"
    | "investment_confirmed"
    | "rejected"
    | "archived";

export interface CrmLeadRow {
    id: number;
    startup_id: number;
    startup_name: string | null;
    startup_logo: string | null;
    investor_id: number;
    investor_name: string | null;
    investor_email: string | null;
    investor_profile_image: string | null;
    founder_id: number;
    status: CrmLeadStatus;
    interest_level: string | null;
    estimated_value: number | null;
    notes: string | null;
    conversation_id: number | null;
    source: string;
    assigned_to: number | null;
    created_at: string;
    updated_at: string | null;
}

export interface CrmActivity {
    id: number;
    lead_id: number;
    actor_id: number | null;
    actor_name: string | null;
    action: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
}

export interface CrmReminder {
    id: number;
    lead_id: number;
    owner_id: number;
    title: string;
    due_at: string;
    is_done: boolean;
    created_at: string;
}

export type KanbanBoard = Record<CrmLeadStatus, CrmLeadRow[]>;

export async function fetchLeads(params: { status?: string; startup_id?: number } = {}): Promise<CrmLeadRow[]> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.startup_id) qs.set("startup_id", String(params.startup_id));
    const res = await authFetch(`/crm/leads?${qs}`);
    if (!res.ok) throw new Error(await readApiError(res, "Failed to load leads"));
    return res.json();
}

export async function fetchKanban(): Promise<KanbanBoard> {
    const res = await authFetch("/crm/leads/kanban");
    if (!res.ok) throw new Error(await readApiError(res, "Failed to load kanban"));
    return res.json();
}

export async function fetchLead(id: number): Promise<CrmLeadRow> {
    const res = await authFetch(`/crm/leads/${id}`);
    if (!res.ok) throw new Error(await readApiError(res, "Lead not found"));
    return res.json();
}

export async function updateLeadStatus(id: number, status: CrmLeadStatus, note?: string): Promise<CrmLeadRow> {
    const res = await authFetch(`/crm/leads/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, note: note ?? null }),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to update status"));
    return res.json();
}

export async function updateLead(id: number, data: { notes?: string; estimated_value?: number; assigned_to?: number }): Promise<CrmLeadRow> {
    const res = await authFetch(`/crm/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to update lead"));
    return res.json();
}

export async function addNote(leadId: number, note: string): Promise<CrmActivity> {
    const res = await authFetch(`/crm/leads/${leadId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note }),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to add note"));
    return res.json();
}

export async function fetchActivity(leadId: number): Promise<CrmActivity[]> {
    const res = await authFetch(`/crm/leads/${leadId}/activity`);
    if (!res.ok) throw new Error(await readApiError(res, "Failed to load activity"));
    return res.json();
}

export async function fetchReminders(leadId: number): Promise<CrmReminder[]> {
    const res = await authFetch(`/crm/leads/${leadId}/reminders`);
    if (!res.ok) throw new Error(await readApiError(res, "Failed to load reminders"));
    return res.json();
}

export async function createReminder(leadId: number, title: string, due_at: string): Promise<CrmReminder> {
    const res = await authFetch(`/crm/leads/${leadId}/reminders`, {
        method: "POST",
        body: JSON.stringify({ title, due_at }),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to create reminder"));
    return res.json();
}

export async function completeReminder(leadId: number, reminderId: number): Promise<CrmReminder> {
    const res = await authFetch(`/crm/leads/${leadId}/reminders/${reminderId}`, { method: "PATCH" });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to complete reminder"));
    return res.json();
}

export async function fetchCrmMetrics(): Promise<{ total_leads: number; by_status: Record<string, number>; conversion_rate_pct: number }> {
    const res = await authFetch("/crm/metrics");
    if (!res.ok) throw new Error(await readApiError(res, "Failed to load CRM metrics"));
    return res.json();
}
