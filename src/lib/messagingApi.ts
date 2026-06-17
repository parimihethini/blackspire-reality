import { authFetch, API_ORIGIN, readApiError } from "./httpClient";

export interface ConversationUser {
    id: number;
    name: string | null;
    email: string;
    profile_image: string | null;
}

export interface ConversationRow {
    id: number;
    startup_id: number | null;
    startup_name: string | null;
    startup_logo: string | null;
    investor: ConversationUser;
    founder: ConversationUser;
    subject: string | null;
    last_message_at: string | null;
    created_at: string;
    created?: boolean;
}

export interface MessageRow {
    id: number;
    conversation_id: number;
    sender_id: number;
    sender: ConversationUser | null;
    body: string;
    attachment_url: string | null;
    attachment_name: string | null;
    is_read: boolean;
    created_at: string;
}

export interface MessageListResponse {
    items: MessageRow[];
    total: number;
    skip: number;
    limit: number;
}

export async function fetchConversations(): Promise<ConversationRow[]> {
    const res = await authFetch("/messaging/conversations");
    if (!res.ok) throw new Error(await readApiError(res, "Failed to load conversations"));
    return res.json();
}

export async function startConversation(startup_id: number): Promise<ConversationRow> {
    const res = await authFetch("/messaging/conversations", {
        method: "POST",
        body: JSON.stringify({ startup_id }),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to start conversation"));
    return res.json();
}

export async function fetchConversation(id: number): Promise<ConversationRow> {
    const res = await authFetch(`/messaging/conversations/${id}`);
    if (!res.ok) throw new Error(await readApiError(res, "Conversation not found"));
    return res.json();
}

export async function fetchMessages(conversationId: number, skip = 0, limit = 50): Promise<MessageListResponse> {
    const res = await authFetch(`/messaging/conversations/${conversationId}/messages?skip=${skip}&limit=${limit}`);
    if (!res.ok) throw new Error(await readApiError(res, "Failed to load messages"));
    return res.json();
}

export async function sendMessage(conversationId: number, body: string, attachmentUrl?: string, attachmentName?: string): Promise<MessageRow> {
    const res = await authFetch(`/messaging/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body, attachment_url: attachmentUrl ?? null, attachment_name: attachmentName ?? null }),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to send message"));
    return res.json();
}

export async function markMessagesRead(conversationId: number): Promise<void> {
    await authFetch(`/messaging/conversations/${conversationId}/read`, { method: "POST" });
}

export async function deleteConversation(conversationId: number): Promise<void> {
    await authFetch(`/messaging/conversations/${conversationId}`, { method: "DELETE" });
}
