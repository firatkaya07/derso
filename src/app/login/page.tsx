"use client";

import { useState } from "react";
import Image from "next/image";
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
    router.push("/");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Derso"
            width={100}
            height={100}
            className="mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900">Derso</h1>
          <p className="text-gray-500 mt-2">
            Kurs Merkezi Ders Programı Yönetimi
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 mb-6 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "login"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "signup"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
              placeholder="ornek@kursmerkezi.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Şifre (tekrar)
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
                placeholder="Şifrenizi tekrar girin"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
