"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface AuthInfo {
  email: string;
  organizationName: string | null;
}

export default function ContactFab() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fetched = useRef(false);

  const supabase = createClient();

  // Oturum ve kurum bilgisini al
  const loadAuthInfo = useCallback(async () => {
    if (fetched.current) return;
    fetched.current = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("organization_members")
        .select("organization:organizations(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const org = data?.organization as { name: string } | { name: string }[] | null;
      const resolved = Array.isArray(org) ? org[0] : org;

      setAuthInfo({
        email: user.email ?? "",
        organizationName: resolved?.name ?? null,
      });
    } catch {
      // Anonim kullanıcı — sorun değil
    }
  }, [supabase]);

  // Panel açıldığında auth bilgisini çek
  useEffect(() => {
    if (open) loadAuthInfo();
  }, [open, loadAuthInfo]);

  // Dışarı tıklanınca kapat
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);

    try {
      const { error: dbError } = await supabase
        .from("contact_messages")
        .insert({
          full_name: fullName.trim(),
          phone: phone.trim(),
          message: message.trim() || null,
          page: window.location.pathname,
          user_email: authInfo?.email || null,
          organization_name: authInfo?.organizationName || null,
        });

      if (dbError) throw dbError;

      setSent(true);
      setFullName("");
      setPhone("");
      setMessage("");
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 2500);
    } catch {
      setError("Gönderilemedi, lütfen tekrar deneyin.");
    } finally {
      setSending(false);
    }
  };

  const isLoggedIn = !!authInfo;

  return (
    <div className="fixed bottom-5 right-5 z-50" ref={panelRef}>
      {/* Panel */}
      {open && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-gray-200 overflow-hidden animate-[fabSlideUp_200ms_ease-out]">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 text-white">
            <h3 className="font-bold text-sm">Bize Ulaşın</h3>
            <p className="text-indigo-100 text-xs mt-0.5">Size en kısa sürede dönüş yapacağız.</p>
          </div>

          {sent ? (
            <div className="px-5 py-8 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900 text-sm">Mesajınız alındı!</p>
              <p className="text-gray-500 text-xs mt-1">Teşekkür ederiz.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {/* Oturum açıksa kurum ve e-posta bilgisi */}
              {isLoggedIn && (
                <div className="bg-indigo-50 rounded-lg px-3 py-2.5 space-y-1">
                  {authInfo.organizationName && (
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-xs font-medium text-indigo-700 truncate">{authInfo.organizationName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <span className="text-xs text-indigo-600 truncate">{authInfo.email}</span>
                  </div>
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
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 placeholder:text-gray-400"
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
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Mesaj
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Mesajınızı yazın (isteğe bağlı)"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {error && (
                <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Gönderiliyor..." : "Gönder"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => { setOpen((v) => !v); setSent(false); }}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
        aria-label={open ? "İletişim formunu kapat" : "Bize ulaşın"}
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
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
