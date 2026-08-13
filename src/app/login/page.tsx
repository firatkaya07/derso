"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

/**
 * Supabase'in İngilizce hata mesajlarını kullanıcının anlayacağı karşılıklara
 * çevirir. Eşleşmeyen durumlarda genel bir mesaj gösterilir; kimlik doğrulama
 * hatalarında ayrıntı vermek hesap sızdırmaya yarayabilir.
 */
function describeAuthError(message: string, mode: Mode): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.";
  }
  if (
    normalized.includes("already registered") ||
    normalized.includes("user already")
  ) {
    return "Bu e-posta ile kayıtlı bir hesap zaten var.";
  }
  if (normalized.includes("password")) {
    return "Şifre en az 6 karakter olmalı.";
  }
  return mode === "signup"
    ? "Kayıt olunamadı. Lütfen tekrar deneyin."
    : "Giriş yapılamadı. Lütfen tekrar deneyin.";
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setPasswordConfirm("");
  };

  const finishAuth = () => {
    router.push("/home");
    router.refresh();
  };

  const handleLogin = async () => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(describeAuthError(signInError.message, "login"));
      setLoading(false);
      return;
    }

    finishAuth();
  };

  const handleSignUp = async () => {
    if (password !== passwordConfirm) {
      setError("Şifreler eşleşmiyor.");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(describeAuthError(signUpError.message, "signup"));
      setLoading(false);
      return;
    }

    // E-posta onayı kapalı / otomatik onaylı: oturum hemen veya ardından gelir.
    if (data.session) {
      finishAuth();
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(describeAuthError(loginError.message, "signup"));
      setLoading(false);
      return;
    }

    finishAuth();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "signup") {
      await handleSignUp();
    } else {
      await handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
      <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(99,102,241,0.08)] border border-[var(--color-border)] p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.png"
              alt="Derso"
              width={80}
              height={80}
              className="mx-auto mb-4 rounded-2xl"
            />
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Derso</h1>
          </Link>
          <p className="text-[var(--color-text-secondary)] mt-2">
            Kurs Merkezi Ders Programı Yönetimi
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 mb-6 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              mode === "login"
                ? "bg-white text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              mode === "signup"
                ? "bg-white text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none transition-all duration-200 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
              placeholder="ornek@kursmerkezi.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none transition-all duration-200 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
              placeholder={
                mode === "signup" ? "En az 6 karakter" : "Şifrenizi girin"
              }
              required
              minLength={6}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                Şifre (tekrar)
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none transition-all duration-200 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                placeholder="Şifrenizi tekrar girin"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-primary)] text-white py-2.5 rounded-xl font-semibold hover:bg-[var(--color-primary-hover)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
          >
            {loading
              ? mode === "signup"
                ? "Hesap oluşturuluyor..."
                : "Giriş yapılıyor..."
              : mode === "signup"
                ? "Kayıt Ol"
                : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
