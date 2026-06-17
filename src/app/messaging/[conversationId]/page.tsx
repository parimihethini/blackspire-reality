"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Paperclip, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import {
    fetchConversation, fetchMessages, sendMessage, markMessagesRead,
    type ConversationRow, type MessageRow,
} from "@/lib/messagingApi";

export default function ConversationPage() {
    const router = useRouter();
    const params = useParams();
    const conversationId = Number(params.conversationId);

    const [conv, setConv]       = useState<ConversationRow | null>(null);
    const [messages, setMsgs]   = useState<MessageRow[]>([]);
    const [body, setBody]       = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [myId, setMyId]       = useState<number | null>(null);
    const bottomRef             = useRef<HTMLDivElement>(null);
    const inputRef              = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const auth = getAuth();
        if (!auth?.loggedIn) { router.replace("/login"); return; }
        setMyId(auth.id ?? null);
        init();
    }, [conversationId]);

    const init = async () => {
        setLoading(true);
        try {
            const [c, msgs] = await Promise.all([
                fetchConversation(conversationId),
                fetchMessages(conversationId),
            ]);
            setConv(c);
            setMsgs(msgs.items);
            markMessagesRead(conversationId).catch(() => {});
        } finally {
            setLoading(false);
        }
    };

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Poll for new messages every 5s
    useEffect(() => {
        const interval = setInterval(async () => {
            const data = await fetchMessages(conversationId, 0, 100);
            setMsgs(data.items);
        }, 5000);
        return () => clearInterval(interval);
    }, [conversationId]);

    const handleSend = async () => {
        if (!body.trim() || sending) return;
        setSending(true);
        try {
            const msg = await sendMessage(conversationId, body.trim());
            setMsgs(prev => [...prev, msg]);
            setBody("");
            inputRef.current?.focus();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSending(false);
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const otherParty = conv && myId
        ? (conv.investor?.id === myId ? conv.founder : conv.investor)
        : null;

    return (
        <main className="flex flex-col min-h-screen bg-[#0A0F1F] text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[#0A0F1F]/90 backdrop-blur-xl border-b border-[#4DA3FF]/15">
                <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
                    <Link href="/messaging" className="p-1.5 text-[#A0AEC0] hover:text-white hover:bg-[#121A2F] rounded-lg transition-all">
                        <ArrowLeft size={18} />
                    </Link>
                    {conv ? (
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4DA3FF]/30 to-[#7CC4FF]/20 flex items-center justify-center text-[#7CC4FF] font-bold text-sm border border-[#4DA3FF]/20 flex-shrink-0">
                                {(otherParty?.name?.[0] ?? otherParty?.email?.[0] ?? "?").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-sm truncate">{otherParty?.name || otherParty?.email}</p>
                                {conv.startup_name && (
                                    <p className="text-[10px] text-[#4DA3FF] truncate">{conv.startup_name}</p>
                                )}
                            </div>
                        </div>
                    ) : <div className="flex-1 h-5 bg-[#121A2F] rounded animate-pulse" />}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto max-w-3xl w-full mx-auto px-6 py-6 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-[#A0AEC0]">
                        <Loader2 size={20} className="animate-spin mr-2" /> Loading messages…
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#A0AEC0]">
                        <p className="text-sm">No messages yet. Say hello! 👋</p>
                    </div>
                ) : messages.map(m => {
                    const isMe = m.sender_id === myId;
                    return (
                        <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm
                                ${isMe
                                    ? "bg-gradient-to-br from-[#4DA3FF] to-[#3B8FE8] text-white rounded-br-sm"
                                    : "bg-[#121A2F] text-white border border-[#4DA3FF]/10 rounded-bl-sm"
                                }`}>
                                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                                {m.attachment_url && (
                                    <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 mt-2 text-xs opacity-80 hover:opacity-100 underline">
                                        <Paperclip size={11} /> {m.attachment_name || "Attachment"}
                                    </a>
                                )}
                                <p className={`text-[10px] mt-1 ${isMe ? "text-white/60 text-right" : "text-[#A0AEC0]/60"}`}>
                                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    {isMe && <span className="ml-1">{m.is_read ? "✓✓" : "✓"}</span>}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="sticky bottom-0 bg-[#0A0F1F]/90 backdrop-blur-xl border-t border-[#4DA3FF]/15">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-end gap-3">
                    <textarea
                        ref={inputRef}
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                        rows={1}
                        className="flex-1 bg-[#121A2F] border border-[#4DA3FF]/15 rounded-xl px-4 py-3 text-sm text-white placeholder-[#A0AEC0]/60 focus:outline-none focus:border-[#4DA3FF]/40 resize-none transition-colors min-h-[44px] max-h-40 overflow-y-auto"
                        style={{ height: "auto" }}
                        onInput={e => {
                            const t = e.currentTarget;
                            t.style.height = "auto";
                            t.style.height = Math.min(t.scrollHeight, 160) + "px";
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!body.trim() || sending}
                        className="p-3 bg-gradient-to-r from-[#4DA3FF] to-[#3B8FE8] text-white rounded-xl hover:shadow-[0_0_15px_rgba(77,163,255,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </div>
        </main>
    );
}
