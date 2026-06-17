"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import Link from "next/link";
import { fetchUnreadCount, fetchNotifications, markNotificationRead, markAllNotificationsRead, type NotificationItem } from "@/lib/notificationApi";
import { getAuth, getAuthToken } from "@/lib/auth";
import { API_ORIGIN } from "@/lib/httpClient";

const TYPE_ICONS: Record<string, string> = {
    startup_approved:            "🎉",
    startup_rejected:            "❌",
    investor_expressed_interest: "💡",
    deck_request_received:       "📄",
    contact_request_received:    "✉️",
    admin_action_performed:      "⚙️",
    role_changed:                "🔄",
    new_message_received:        "💬",
};

export default function NotificationBell() {
    const [open, setOpen]           = useState(false);
    const [count, setCount]         = useState(0);
    const [items, setItems]         = useState<NotificationItem[]>([]);
    const [loading, setLoading]     = useState(false);
    const panelRef                  = useRef<HTMLDivElement>(null);
    const wsRef                     = useRef<WebSocket | null>(null);

    const auth = typeof window !== "undefined" ? getAuth() : null;
    if (!auth?.loggedIn) return null;

    // ── Poll unread count every 30s ──────────────────────────────────────────
    const refreshCount = useCallback(async () => {
        try { setCount(await fetchUnreadCount()); } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        refreshCount();
        const interval = setInterval(refreshCount, 30_000);
        return () => clearInterval(interval);
    }, [refreshCount]);

    // ── WebSocket real-time push ─────────────────────────────────────────────
    useEffect(() => {
        if (!auth?.id) return;
        const token = getAuthToken();
        if (!token) return;

        const wsBase = API_ORIGIN.replace(/^https/, "wss").replace(/^http/, "ws");
        const ws = new WebSocket(`${wsBase}/ws/notifications/${auth.id}?token=${token}`);
        wsRef.current = ws;

        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === "notification") {
                    setCount((c) => c + 1);
                    setItems((prev) => [data as unknown as NotificationItem, ...prev]);
                }
            } catch { /* ignore */ }
        };
        ws.onerror = () => {};
        return () => { ws.close(); };
    }, [auth?.id]);

    // ── Close panel on outside click ─────────────────────────────────────────
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── Open panel ────────────────────────────────────────────────────────────
    const handleOpen = async () => {
        setOpen((o) => !o);
        if (!open) {
            setLoading(true);
            try {
                const data = await fetchNotifications({ limit: 20 });
                setItems(data.items);
            } catch { /* ignore */ } finally {
                setLoading(false);
            }
        }
    };

    // ── Mark single read ──────────────────────────────────────────────────────
    const handleRead = async (n: NotificationItem) => {
        if (!n.is_read) {
            await markNotificationRead(n.id);
            setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
            setCount((c) => Math.max(0, c - 1));
        }
    };

    // ── Mark all read ─────────────────────────────────────────────────────────
    const handleMarkAll = async () => {
        await markAllNotificationsRead();
        setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
        setCount(0);
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell button */}
            <button
                id="notification-bell-btn"
                onClick={handleOpen}
                className="relative p-2 rounded-xl text-[#A0AEC0] hover:text-white hover:bg-[#4DA3FF]/10 transition-all duration-200"
                aria-label="Notifications"
            >
                <Bell size={20} />
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                        {count > 99 ? "99+" : count}
                    </span>
                )}
            </button>

            {/* Panel */}
            {open && (
                <div className="absolute right-0 top-12 w-80 md:w-96 bg-[#121A2F] border border-[#4DA3FF]/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#4DA3FF]/10">
                        <span className="text-white font-bold text-sm">Notifications</span>
                        <div className="flex items-center gap-2">
                            {count > 0 && (
                                <button onClick={handleMarkAll} className="text-[#4DA3FF] hover:text-white text-xs flex items-center gap-1 transition-colors">
                                    <CheckCheck size={12} /> Mark all read
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="text-[#A0AEC0] hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center py-8 text-[#A0AEC0] text-sm">Loading...</div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-[#A0AEC0]">
                                <Bell size={28} className="mb-2 opacity-40" />
                                <p className="text-sm">You're all caught up!</p>
                            </div>
                        ) : (
                            items.map((n) => (
                                <NotificationRow key={n.id} n={n} onRead={handleRead} />
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-[#4DA3FF]/10 text-center">
                        <Link href="/notifications" onClick={() => setOpen(false)} className="text-[#4DA3FF] hover:text-white text-xs font-semibold transition-colors">
                            View all notifications →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

function NotificationRow({ n, onRead }: { n: NotificationItem; onRead: (n: NotificationItem) => void }) {
    const icon = TYPE_ICONS[n.type] ?? "🔔";
    const content = (
        <div
            onClick={() => onRead(n)}
            className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 border-b border-[#4DA3FF]/5 last:border-0
                ${n.is_read ? "hover:bg-[#0A0F1F]/40 opacity-70" : "hover:bg-[#4DA3FF]/5 bg-[#4DA3FF]/[0.03]"}`}
        >
            <span className="text-xl mt-0.5 flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug truncate ${n.is_read ? "text-[#A0AEC0]" : "text-white font-semibold"}`}>{n.title}</p>
                {n.body && <p className="text-[#A0AEC0] text-xs mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-[#4DA3FF]/60 text-[10px] mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#4DA3FF] self-start mt-1.5 flex-shrink-0" />}
        </div>
    );

    return n.link ? <Link href={n.link}>{content}</Link> : content;
}
