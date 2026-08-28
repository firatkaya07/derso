"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPT_ATTR,
  formatBytes,
  isImageMime,
  MAX_DOC_BYTES,
  MAX_IMAGE_BYTES,
  publicUrlForAttachment,
  uploadSupportAttachment,
  validateSupportFile,
} from "@/lib/support-attachments";
import { isSendHotkey, SEND_HOTKEY_HINT } from "@/lib/keyboard";
import { trackSupportOpen, trackSupportMessage } from "@/lib/analytics";

const supabase = createClient();

type View = "list" | "chat" | "new";

type AuthInfo = {
  userId: string;
  email: string;
  organizationName: string | null;
};

type Conversation = {
  id: string;
  full_name: string;
  phone: string;
  status: string;
  last_message_at: string;
  created_at: string;
};

type SupportMessage = {
  id: string;
  conversation_id: string;
  sender: "user" | "support";
  body: string;
  created_at: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
};

const GUEST_TOKEN_KEY = "derso_support_guest_token";
const GUEST_CONV_KEY = "derso_support_conversation_id";

function readGuestSession(): { token: string | null; conversationId: string | null } {
  if (typeof window === "undefined") {
    return { token: null, conversationId: null };
  }
  return {
    token: localStorage.getItem(GUEST_TOKEN_KEY),
    conversationId: localStorage.getItem(GUEST_CONV_KEY),
  };
}

function saveGuestSession(token: string, conversationId: string) {
  localStorage.setItem(GUEST_TOKEN_KEY, token);
  localStorage.setItem(GUEST_CONV_KEY, conversationId);
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function AttachmentPreview({
  file,
  onClear,
}: {
  file: File;
  onClear: () => void;
}) {
  const isImage = file.type.startsWith("image/");
  const previewUrl = useMemo(
    () => (isImage ? URL.createObjectURL(file) : null),
    [file, isImage]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-2">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="h-10 w-10 rounded object-cover shrink-0"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-white border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-indigo-900 truncate">{file.name}</p>
        <p className="text-[10px] text-indigo-600">{formatBytes(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="min-h-8 min-w-8 inline-flex items-center justify-center rounded-md text-indigo-500 hover:bg-indigo-100"
        aria-label="Dosyayı kaldır"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function MessageAttachment({ message }: { message: SupportMessage }) {
  if (!message.attachment_path) return null;
  const url = publicUrlForAttachment(message.attachment_path);
  const image = isImageMime(message.attachment_mime);

  if (image) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-1.5 overflow-hidden rounded-lg"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={message.attachment_name ?? "Görsel"}
          className="max-h-40 w-full object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${
        message.sender === "user"
          ? "bg-indigo-500/40 text-white hover:bg-indigo-500/55"
          : "bg-white border border-gray-200 text-indigo-700 hover:bg-indigo-50"
      }`}
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <span className="truncate flex-1">{message.attachment_name ?? "Dosya"}</span>
      {message.attachment_size ? (
        <span className="opacity-70 shrink-0">{formatBytes(message.attachment_size)}</span>
      ) : null}
    </a>
  );
}

export default function ContactFab() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("list");
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [guestToken, setGuestToken] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const authRequestId = useRef(0);

  const isLoggedIn = !!authInfo;

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const pickFile = (file: File | null | undefined) => {
    if (!file) return;
    const result = validateSupportFile(file);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError("");
    setPendingFile(result.file);
  };

  const loadConversations = useCallback(async (token: string | null) => {
    setListLoading(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "support_list_conversations",
        { p_guest_token: token }
      );
      if (rpcError) throw rpcError;
      setConversations((data as Conversation[]) ?? []);
    } catch {
      setConversations([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (conversationId: string, token: string | null) => {
      setMessagesLoading(true);
      setError("");
      try {
        const { data, error: rpcError } = await supabase.rpc(
          "support_list_messages",
          {
            p_conversation_id: conversationId,
            p_guest_token: token,
          }
        );
        if (rpcError) throw rpcError;
        setMessages((data as SupportMessage[]) ?? []);
      } catch {
        setError("Mesajlar yüklenemedi.");
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    []
  );

  const openConversation = useCallback(
    async (conversationId: string, token: string | null) => {
      setActiveId(conversationId);
      setView("chat");
      setDraft("");
      setPendingFile(null);
      await loadMessages(conversationId, token);
    },
    [loadMessages]
  );

  const loadAuthAndBootstrap = useCallback(async () => {
    const requestId = ++authRequestId.current;
    setAuthLoading(true);
    setAuthInfo(null);
    setError("");

    const guest = readGuestSession();
    let token = guest.token;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (requestId !== authRequestId.current) return;

      if (user) {
        const { data } = await supabase
          .from("organization_members")
          .select("organization:organizations(name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (requestId !== authRequestId.current) return;

        const org = data?.organization as
          | { name: string }
          | { name: string }[]
          | null;
        const resolved = Array.isArray(org) ? org[0] : org;

        setAuthInfo({
          userId: user.id,
          email: user.email ?? "",
          organizationName: resolved?.name ?? null,
        });
        token = null;
        setGuestToken(null);
      } else {
        setAuthInfo(null);
        setGuestToken(token);
      }

      const { data: list, error: listError } = await supabase.rpc(
        "support_list_conversations",
        { p_guest_token: token }
      );
      if (requestId !== authRequestId.current) return;
      if (listError) throw listError;

      const rows = (list as Conversation[]) ?? [];
      setConversations(rows);

      if (rows.length === 0) {
        setView("new");
        setActiveId(null);
        return;
      }

      if (!user && guest.conversationId) {
        const match = rows.find((r) => r.id === guest.conversationId);
        if (match) {
          await openConversation(match.id, token);
          return;
        }
      }

      setView("list");
      setActiveId(null);
    } catch {
      if (requestId !== authRequestId.current) return;
      setAuthInfo(null);
      setView("new");
    } finally {
      if (requestId === authRequestId.current) {
        setAuthLoading(false);
      }
    }
  }, [openConversation]);

  const handleFabClick = () => {
    setError("");
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next) {
        trackSupportOpen();
        void loadAuthAndBootstrap();
      } else {
        authRequestId.current += 1;
        setAuthLoading(false);
        setAuthInfo(null);
        setActiveId(null);
        setMessages([]);
        setDraft("");
        setPendingFile(null);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        authRequestId.current += 1;
        setOpen(false);
        setAuthLoading(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view]);

  useEffect(() => {
    if (!open || view !== "chat" || !activeId) return;

    const channel = supabase
      .channel(`support-messages-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const row = payload.new as SupportMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
          void loadConversations(guestToken);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, view, activeId, guestToken, loadConversations]);

  const sendMessageRpc = async (
    conversationId: string,
    body: string,
    token: string | null,
    file: File | null
  ) => {
    let attachment:
      | {
          path: string;
          name: string;
          mime: string;
          size: number;
        }
      | null = null;

    if (file) {
      attachment = await uploadSupportAttachment(conversationId, file);
    }

    const { data, error: rpcError } = await supabase.rpc("support_send_message", {
      p_conversation_id: conversationId,
      p_body: body || null,
      p_guest_token: token,
      p_attachment_path: attachment?.path ?? null,
      p_attachment_name: attachment?.name ?? null,
      p_attachment_mime: attachment?.mime ?? null,
      p_attachment_size: attachment?.size ?? null,
    });
    if (rpcError) throw rpcError;
    return data as SupportMessage;
  };

  const startConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const text = draft.trim();
    if (!text && !pendingFile) {
      setError("Mesaj yazın veya bir dosya ekleyin.");
      return;
    }

    setSending(true);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "support_start_conversation",
        {
          p_full_name: fullName.trim(),
          p_phone: phone.trim(),
          p_message: text || "Dosya gönderildi",
          p_page: window.location.pathname,
          p_email: authInfo?.email ?? null,
          p_organization_name: authInfo?.organizationName ?? null,
          p_guest_token: authInfo ? null : guestToken,
        }
      );

      if (rpcError) throw rpcError;

      const result = data as {
        conversation_id: string;
        guest_token: string | null;
      };

      const token = authInfo ? null : result.guest_token;
      if (!authInfo && result.guest_token) {
        saveGuestSession(result.guest_token, result.conversation_id);
        setGuestToken(result.guest_token);
      }

      if (pendingFile) {
        await sendMessageRpc(
          result.conversation_id,
          text ? "" : "",
          token,
          pendingFile
        );
      }

      setDraft("");
      setPendingFile(null);
      await loadConversations(token);
      await openConversation(result.conversation_id, token);
      trackSupportMessage({ type: "new" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Mesaj gönderilemedi, lütfen tekrar deneyin."
      );
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId) return;
    const text = draft.trim();
    if (!text && !pendingFile) return;

    setError("");
    setSending(true);

    const body = text;
    const file = pendingFile;
    setDraft("");
    setPendingFile(null);

    try {
      const row = await sendMessageRpc(
        activeId,
        body,
        authInfo ? null : guestToken,
        file
      );
      setMessages((prev) =>
        prev.some((m) => m.id === row.id) ? prev : [...prev, row]
      );
      void loadConversations(authInfo ? null : guestToken);
      trackSupportMessage({ type: "reply" });
    } catch (err) {
      setDraft(body);
      setPendingFile(file);
      setError(
        err instanceof Error
          ? err.message
          : "Mesaj gönderilemedi, lütfen tekrar deneyin."
      );
    } finally {
      setSending(false);
    }
  };

  const headerTitle =
    view === "chat"
      ? "Konuşma"
      : view === "new"
        ? "Yeni mesaj"
        : "Bize Ulaşın";

  const canSend =
    Boolean(draft.trim()) || Boolean(pendingFile);

  const fileHint = `Görsel max ${formatBytes(MAX_IMAGE_BYTES)}, belge max ${formatBytes(MAX_DOC_BYTES)}`;

  return (
    <div className="fixed bottom-5 right-5 z-50" ref={panelRef}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {open && (
        <div className="absolute bottom-16 right-0 w-[22rem] sm:w-96 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-gray-200 overflow-hidden flex flex-col max-h-[min(70vh,560px)] animate-[fabSlideUp_200ms_ease-out]">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3 text-white shrink-0">
            <div className="flex items-center gap-2">
              {(view === "chat" || view === "new") && conversations.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setView("list");
                    setActiveId(null);
                    setMessages([]);
                    setError("");
                    setDraft("");
                    setPendingFile(null);
                  }}
                  className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Konuşma listesine dön"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm truncate">{headerTitle}</h3>
                <p className="text-indigo-100 text-xs mt-0.5 truncate">
                  {authLoading
                    ? "Oturum kontrol ediliyor…"
                    : isLoggedIn
                      ? authInfo.organizationName || authInfo.email
                      : "Karşılıklı destek sohbeti"}
                </p>
              </div>
              {view === "list" ? (
                <button
                  type="button"
                  onClick={() => {
                    setView("new");
                    setDraft("");
                    setPendingFile(null);
                    setError("");
                  }}
                  className="text-xs font-semibold bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  Yeni
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {authLoading ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">
                Oturum kontrol ediliyor…
              </div>
            ) : view === "list" ? (
              <div className="p-2">
                {listLoading ? (
                  <p className="px-3 py-8 text-center text-sm text-gray-500">
                    Konuşmalar yükleniyor…
                  </p>
                ) : conversations.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-600 mb-3">
                      Henüz konuşmanız yok.
                    </p>
                    <button
                      type="button"
                      onClick={() => setView("new")}
                      className="text-sm font-semibold text-indigo-600 hover:underline"
                    >
                      İlk mesajı gönderin
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {conversations.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() =>
                            void openConversation(
                              c.id,
                              authInfo ? null : guestToken
                            )
                          }
                          className="w-full text-left px-3 py-3 rounded-xl hover:bg-indigo-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {c.full_name}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                c.status === "open"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {c.status === "open" ? "Açık" : "Kapalı"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatTime(c.last_message_at)}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : view === "new" ? (
              <form onSubmit={startConversation} className="p-4 space-y-3">
                {isLoggedIn && (
                  <div className="bg-indigo-50 rounded-lg px-3 py-2.5 space-y-1">
                    {authInfo.organizationName && (
                      <p className="text-xs font-medium text-indigo-700 truncate">
                        {authInfo.organizationName}
                      </p>
                    )}
                    <p className="text-xs text-indigo-600 truncate">
                      {authInfo.email}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ad Soyad <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Adınız Soyadınız"
                    className="w-full min-h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Telefon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="05XX XXX XX XX"
                    className="w-full min-h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mesajınız {!pendingFile && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    required={!pendingFile}
                    rows={3}
                    placeholder="Nasıl yardımcı olabiliriz?"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-gray-900 placeholder:text-gray-400"
                    onKeyDown={(e) => {
                      if (isSendHotkey(e)) {
                        e.preventDefault();
                        void startConversation(e as unknown as React.FormEvent);
                      }
                    }}
                  />
                </div>

                {pendingFile ? (
                  <AttachmentPreview
                    file={pendingFile}
                    onClear={() => setPendingFile(null)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full min-h-10 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    Görsel veya belge ekle
                  </button>
                )}
                <p className="text-[10px] text-gray-400">
                  {fileHint} · {SEND_HOTKEY_HINT}
                </p>

                {error && (
                  <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending || !canSend}
                  className="w-full min-h-10 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? "Gönderiliyor..." : "Konuşmayı başlat"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col h-full min-h-[280px]">
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                  {messagesLoading ? (
                    <p className="text-center text-sm text-gray-500 py-8">
                      Mesajlar yükleniyor…
                    </p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 py-8">
                      Henüz mesaj yok.
                    </p>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${
                          m.sender === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                            m.sender === "user"
                              ? "bg-indigo-600 text-white rounded-br-md"
                              : "bg-gray-100 text-gray-800 rounded-bl-md"
                          }`}
                        >
                          {m.sender === "support" && (
                            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 mb-0.5">
                              Destek
                            </p>
                          )}
                          {m.body ? (
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          ) : null}
                          <MessageAttachment message={m} />
                          <p
                            className={`text-[10px] mt-1 ${
                              m.sender === "user"
                                ? "text-indigo-200"
                                : "text-gray-400"
                            }`}
                          >
                            {formatTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {error && (
                  <p className="mx-3 mb-2 text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg" role="alert">
                    {error}
                  </p>
                )}

                {activeConversation?.status === "closed" ? (
                  <p className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100">
                    Bu konuşma kapatıldı. Yeni bir mesaj başlatabilirsiniz.
                  </p>
                ) : (
                  <form
                    onSubmit={sendReply}
                    className="border-t border-gray-100 p-3 space-y-2 shrink-0"
                  >
                    {pendingFile ? (
                      <AttachmentPreview
                        file={pendingFile}
                        onClear={() => setPendingFile(null)}
                      />
                    ) : null}
                    <div className="flex gap-2 items-end">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                        aria-label="Dosya ekle"
                        title={fileHint}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                        </svg>
                      </button>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={2}
                        placeholder="Yanıtınızı yazın…"
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-gray-900 placeholder:text-gray-400"
                        onKeyDown={(e) => {
                          if (isSendHotkey(e)) {
                            e.preventDefault();
                            void sendReply(e as unknown as React.FormEvent);
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={sending || !canSend}
                        className="min-h-10 min-w-10 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
                        aria-label="Gönder"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 px-1">
                      {fileHint} · {SEND_HOTKEY_HINT}
                    </p>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleFabClick}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
        aria-label={open ? "İletişim panelini kapat" : "Bize ulaşın"}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
    </div>
  );
}
