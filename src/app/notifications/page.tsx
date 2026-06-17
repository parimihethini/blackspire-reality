"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import {
    fetchNotifications,
    fetchUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    type NotificationItem,
} from "@/lib/notificationApi";

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

const TYPE_LABELS: Record<string, string> = {
    startup_approved:            "Startup Approved",
    startup_rejected:            "Startup Rejected",
    investor_expressed_interest: "Investor Interest",
    deck_request_received:       "Deck Request",
    contact_request_received:    "Contact Request",
    admin_action_performed:      "Admin Action",
    role_changed:                "Role Changed",
    new_message_received:        "New Message",
};

export default function NotificationsPage() {
    const router = useRouter();
    const [items, setItems]         = useState<NotificationItem[]>([]);
    const [loading, setLoading]     = useState(true);
    const [unread, setUnread]       = useState(0);
    const [filter, setFilter]       = useState<"all" | "unread">("all");

    useEffect(() => {
        const auth = getAuth();
        if (!auth?.loggedIn) { router.replace("/login"); return; }
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [data, cnt] = await Promise.all([
                fetchNotifications({ limit: 100, unread_only: filter === "unread" }),
                fetchUnreadCount(),
            ]);
            setItems(data.items);
            setUnread(cnt);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [filter]);

    const handleRead = async (n: NotificationItem) => {
        if (!n.is_read) {
            await markNotificationRead(n.id);
            setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
            setUnread(u => Math.max(0, u - 1));
        }
    };

    const handleMarkAll = async () => {
        await markAllNotificationsRead();
        setItems(prev => prev.map(x => ({ ...x, is_read: true })));
        setUnread(0);
    };

    return (
        <main className="min-h-screen bg-[#0A0F1F] text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[#0A0F1F]/80 backdrop-blur-xl border-b border-[#4DA3FF]/15">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell size={20} className="text-[#4DA3FF]" />
                        <h1 className="text-lg font-extrabold tracking-tight">Notifications</h1>
                        {unread > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unread}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Filter tabs */}
                        <div className="flex bg-[#121A2F] rounded-lg p-0.5 text-xs font-semibold">
                            {(["all", "unread"] as const).map(f => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 rounded-md transition-all capitalize ${filter === f ? "bg-[#4DA3FF]/20 text-[#7CC4FF]" : "text-[#A0AEC0] hover:text-white"}`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                        {unread > 0 && (
                            <button onClick={handleMarkAll}
                                className="flex items-center gap-1.5 text-xs font-semibold text-[#4DA3FF] hover:text-white transition-colors px-3 py-1.5 border border-[#4DA3FF]/30 rounded-lg hover:bg-[#4DA3FF]/10">
                                <CheckCheck size={13} /> Mark all read
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="space-y-3">
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className="h-20 bg-[#121A2F] rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-[#A0AEC0]">
                        <Bell size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-bold text-white">No notifications</p>
                        <p className="text-sm mt-1">
                            {filter === "unread" ? "You've read everything!" : "You'll see activity here when it happens."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map(n => (
                            <NotifRow key={n.id} n={n} onRead={handleRead} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

function NotifRow({ n, onRead }: { n: NotificationItem; onRead: (n: NotificationItem) => void }) {
    const icon  = TYPE_ICONS[n.type] ?? "🔔";
    const label = TYPE_LABELS[n.type] ?? n.type;
    const inner = (
        <div onClick={() => onRead(n)}
            className={`flex gap-4 p-4 rounded-xl border transition-all cursor-pointer group
                ${n.is_read
                    ? "bg-[#121A2F]/50 border-[#4DA3FF]/5 hover:bg-[#121A2F]"
                    : "bg-[#121A2F] border-[#4DA3FF]/15 hover:border-[#4DA3FF]/30 shadow-[0_0_20px_rgba(77,163,255,0.04)]"
                }`}>
            <div className="text-2xl mt-0.5 flex-shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-[#4DA3FF]/70 uppercase tracking-wide">{label}</span>
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#4DA3FF] flex-shrink-0" />}
                </div>
                <p className={`text-sm font-semibold leading-snug ${n.is_read ? "text-[#A0AEC0]" : "text-white"}`}>{n.title}</p>
                {n.body && <p className="text-[#A0AEC0] text-xs mt-1 line-clamp-2">{n.body}</p>}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[10px] text-[#A0AEC0]/60 whitespace-nowrap">{new Date(n.created_at).toLocaleString()}</span>
            </div>
        </div>
    );
    return n.link ? <Link href={n.link}>{inner}</Link> : inner;
}
