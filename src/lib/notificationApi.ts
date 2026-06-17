import { authFetch, API_ORIGIN, readApiError } from "./httpClient";

export interface NotificationItem {
    id: number;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    entity_type: string | null;
    entity_id: number | null;
    is_read: boolean;
    actor_id: number | null;
    created_at: string;
}

export interface NotificationListResponse {
    items: NotificationItem[];
    total: number;
    skip: number;
    limit: number;
}

export async function fetchNotifications(params: { skip?: number; limit?: number; unread_only?: boolean } = {}): Promise<NotificationListResponse> {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set("skip", String(params.skip));
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    if (params.unread_only) qs.set("unread_only", "true");
    const res = await authFetch(`/notifications/?${qs}`);
    if (!res.ok) throw new Error(await readApiError(res, "Failed to load notifications"));
    return res.json();
}

export async function fetchUnreadCount(): Promise<number> {
    const res = await authFetch("/notifications/unread-count");
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? 0;
}

export async function markNotificationRead(id: number): Promise<void> {
    await authFetch(`/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<void> {
    await authFetch("/notifications/read-all", { method: "POST" });
}
