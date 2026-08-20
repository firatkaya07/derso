"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const authRequestId = useRef(0);

  const isLoggedIn = !!authInfo;

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const loadConversations = useCallback(async (token: string | null) => {
    setListLoading(true);
    setError("");
    try {
      const supabase = createClient();
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
        const supabase = createClient();
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
      const supabase = createClient();
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
        void loadAuthAndBootstrap();
      } else {
        authRequestId.current += 1;
        setAuthLoading(false);
        setAuthInfo(null);
        setActiveId(null);
        setMessages([]);
        setDraft("");
      }
      return next;
    });
  };

  // Dışarı tıklanınca kapat
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

  // Scroll to latest message
  useEffect(() => {
    if (view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view]);

  // Realtime: support replies
  useEffect(() => {
    if (!open || view !== "chat" || !activeId) return;

    const supabase = createClient();
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

  const startConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc(
        "support_start_conversation",
        {
          p_full_name: fullName.trim(),
          p_phone: phone.trim(),
          p_message: draft.trim(),
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

      if (!authInfo && result.guest_token) {
        saveGuestSession(result.guest_token, result.conversation_id);
        setGuestToken(result.guest_token);
      }

      setDraft("");
      await loadConversations(authInfo ? null : result.guest_token);
      await openConversation(
        result.conversation_id,
        authInfo ? null : result.guest_token
      );
    } catch {
      setError("Mesaj gönderilemedi, lütfen tekrar deneyin.");
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    setError("");
    setSending(true);

    const body = draft.trim();
    setDraft("");

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc(
        "support_send_message",
        {
          p_conversation_id: activeId,
          p_body: body,
          p_guest_token: authInfo ? null : guestToken,
        }
      );
      if (rpcError) throw rpcError;

      const row = data as SupportMessage;
      setMessages((prev) =>
        prev.some((m) => m.id === row.id) ? prev : [...prev, row]
      );
      void loadConversations(authInfo ? null : guestToken);
    } catch {
      setDraft(body);
      setError("Mesaj gönderilemedi, lütfen tekrar deneyin.");
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

  return (
    <div className="fixed bottom-5 right-5 z-50" ref={panelRef}>
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
                    Mesajınız <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    required
                    rows={4}
                    placeholder="Nasıl yardımcı olabiliriz?"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending}
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
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
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
                    className="border-t border-gray-100 p-3 flex gap-2 items-end shrink-0"
                  >
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={2}
                      placeholder="Yanıtınızı yazın…"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-gray-900 placeholder:text-gray-400"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendReply(e as unknown as React.FormEvent);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      className="min-h-10 min-w-10 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
                      aria-label="Gönder"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    </button>
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

      <style jsx global>{`
        @keyframes fabSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
