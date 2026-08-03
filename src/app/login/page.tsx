"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { signUpEnabled } from "@/lib/env";
import { useRouter } from "next/navigation";

/**
 * Supabase'in İngilizce hata mesajlarını kullanıcının anlayacağı karşılıklara
 * çevirir. Eşleşmeyen durumlarda genel bir mesaj gösterilir; kimlik doğrulama
 * hatalarında ayrıntı vermek hesap sızdırmaya yarayabilir.
 */
function describeAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı.";
  }
  if (normalized.includes("email not confirmed")) {
    return "E-posta adresiniz henüz doğrulanmamış. Gelen kutunuzu kontrol edin.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.";
  }
  if (normalized.includes("already registered")) {
    return "Bu e-posta ile kayıtlı bir hesap zaten var.";
  }
  if (normalized.includes("password")) {
    return "Şifre en az 6 karakter olmalı.";
  }
  return "Giriş yapılamadı. Lütfen tekrar deneyin.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(describeAuthError(signInError.message));
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleSignUp = async () => {
    setError("");
    setNotice("");
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(describeAuthError(signUpError.message));
      setLoading(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setNotice("Hesap oluşturuldu. Şimdi giriş yapabilirsiniz.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Derso" width={100} height={100} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Derso</h1>
          <p className="text-gray-500 mt-2">Kurs Merkezi Ders Programı Yönetimi</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
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
              placeholder="Şifrenizi girin"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {notice && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>

          {signUpEnabled && (
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Yeni Hesap Oluştur
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
