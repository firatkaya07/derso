"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPT_ATTR,
  formatBytes,
  isImageMime,
  publicUrlForAttachment,
  uploadSupportAttachment,
  validateSupportFile,
} from "@/lib/support-attachments";

type Conversation = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  organization_name: string | null;
  status: string;
  page: string | null;
  last_message_at: string;
};

type Message = {
  id: string;
  sender: "user" | "support";
  body: string;
  created_at: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
};

export default function AdminSupportThreadPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const [convRes, msgRes] = await Promise.all([
        supabase.rpc("admin_list_conversations", {
          p_status: null,
          p_limit: 500,
        }),
        supabase.rpc("admin_list_messages", {
          p_conversation_id: conversationId,
        }),
      ]);
      if (convRes.error) throw convRes.error;
      if (msgRes.error) throw msgRes.error;

      const found =
        ((convRes.data ?? []) as Conversation[]).find(
          (c) => c.id === conversationId
        ) ?? null;
      setConversation(found);
      setMessages((msgRes.data ?? []) as Message[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    // İlk yükleme + conversation değişiminde mesajları çek
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client thread bootstrap
    void load();
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`admin-support-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row]
          );
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text && !pendingFile) return;
    setSending(true);
    setError("");
    try {
      let attachment: Awaited<ReturnType<typeof uploadSupportAttachment>> | null =
        null;
      if (pendingFile) {
        attachment = await uploadSupportAttachment(conversationId, pendingFile);
      }
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("admin_reply_message", {
        p_conversation_id: conversationId,
        p_body: text || "",
        p_attachment_path: attachment?.path ?? null,
        p_attachment_name: attachment?.name ?? null,
        p_attachment_mime: attachment?.mime ?? null,
        p_attachment_size: attachment?.size ?? null,
      });
      if (rpcError) throw rpcError;
      const row = data as Message;
      setMessages((prev) =>
        prev.some((m) => m.id === row.id) ? prev : [...prev, row]
      );
      setDraft("");
      setPendingFile(null);
      setConversation((c) => (c ? { ...c, status: "open" } : c));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!conversation) return;
    const next = conversation.status === "open" ? "closed" : "open";
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "admin_set_conversation_status",
      {
        p_conversation_id: conversationId,
        p_status: next,
      }
    );
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setConversation(data as Conversation);
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  }

  if (!conversation) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">Konuşma bulunamadı.</p>
        <Link href="/admin/destek" className="text-indigo-600 text-sm hover:underline">
          Listeye dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/destek"
            className="text-sm text-indigo-600 hover:underline"
          >
            ← Destek listesi
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-2">
            {conversation.full_name}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {conversation.phone}
            {conversation.email ? ` · ${conversation.email}` : ""}
            {conversation.organization_name
              ? ` · ${conversation.organization_name}`
              : ""}
          </p>
          {conversation.page ? (
            <p className="text-xs text-slate-400 mt-1">Sayfa: {conversation.page}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void toggleStatus()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          {conversation.status === "open" ? "Konuşmayı kapat" : "Yeniden aç"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col min-h-[28rem] max-h-[70vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => {
            const mine = m.sender === "support";
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-indigo-600 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-800 rounded-bl-md"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-70 mb-0.5">
                    {mine ? "Destek" : "Kullanıcı"}
                  </p>
                  {m.body ? (
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  ) : null}
                  {m.attachment_path ? (
                    isImageMime(m.attachment_mime) ? (
                      <a
                        href={publicUrlForAttachment(m.attachment_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-1.5"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={publicUrlForAttachment(m.attachment_path)}
                          alt={m.attachment_name ?? "Görsel"}
                          className="max-h-40 rounded-lg"
                        />
                      </a>
                    ) : (
                      <a
                        href={publicUrlForAttachment(m.attachment_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex text-xs underline"
                      >
                        {m.attachment_name}
                        {m.attachment_size
                          ? ` (${formatBytes(m.attachment_size)})`
                          : ""}
                      </a>
                    )
                  ) : null}
                  <p className="text-[10px] mt-1 opacity-60">
                    {new Date(m.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {error ? (
          <p className="mx-4 mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}

        <form
          onSubmit={sendReply}
          className="border-t border-slate-100 p-3 space-y-2"
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const result = validateSupportFile(file);
              if ("error" in result) {
                setError(result.error);
                return;
              }
              setPendingFile(result.file);
              setError("");
            }}
          />
          {pendingFile ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
              <span className="truncate">
                {pendingFile.name} ({formatBytes(pendingFile.size)})
              </span>
              <button type="button" onClick={() => setPendingFile(null)}>
                Kaldır
              </button>
            </div>
          ) : null}
          <div className="flex gap-2 items-end">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-10 min-w-10 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 inline-flex items-center justify-center"
              aria-label="Dosya ekle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Destek yanıtı yazın…"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={sending || (!draft.trim() && !pendingFile)}
              className="min-h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {sending ? "…" : "Gönder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
