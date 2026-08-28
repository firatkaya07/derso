"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { trackLogin, trackSignUp } from "@/lib/analytics";

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

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .638C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

const BENEFITS = [
  "Otomatik ders dağıtımı",
  "Çakışma kontrolü",
  "Excel ve PDF çıktı",
] as const;

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const passwordConfirmId = `${formId}-password-confirm`;
  const errorId = `${formId}-error`;

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setError("");
    setPasswordConfirm("");
    setShowPassword(false);
    setShowPasswordConfirm(false);
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

    trackLogin();
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

    if (data.session) {
      trackSignUp();
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

    trackSignUp();
    await finishAuth();
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

  const inputClass =
    "w-full min-h-11 px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none transition-all duration-200 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <div className="flex-1 grid lg:grid-cols-2">
        {/* Brand panel */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#071512] text-white p-10 xl:p-14">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 15% 20%, rgba(45,212,191,0.22), transparent 55%), radial-gradient(ellipse 60% 45% at 90% 80%, rgba(225,29,72,0.14), transparent 50%)",
            }}
          />
          <div className="relative">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              <Image
                src="/logo.webp"
                alt="Derso logosu"
                width={44}
                height={44}
                className="rounded-xl"
                priority
              />
              <span className="font-bold text-xl tracking-tight">Derso</span>
            </Link>
          </div>

          <div className="relative max-w-md">
            <p className="text-teal-300 text-xs font-bold tracking-[0.14em] uppercase mb-4">
              Ders programı hazırlama
            </p>
            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight text-balance">
              Haftalık programı dakikalar içinde kurun
            </h1>
            <p className="mt-4 text-white/70 leading-relaxed text-pretty">
              Okul ve kurs merkezleri için otomatik ders dağıtımı, çakışma
              kontrolü ve yazdırılabilir çıktılar tek yerde.
            </p>
            <ul className="mt-8 space-y-3">
              {BENEFITS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/85">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-400/20 text-teal-300 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-sm text-white/45">
            <Link href="/" className="hover:text-white/80 transition-colors underline-offset-2 hover:underline">
              Ana sayfaya dön
            </Link>
          </p>
        </aside>

        {/* Form panel */}
        <main className="flex flex-col justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md mx-auto">
            <div className="lg:hidden text-center mb-8">
              <Link
                href="/"
                className="inline-flex flex-col items-center rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                <Image
                  src="/logo.webp"
                  alt="Derso logosu"
                  width={72}
                  height={72}
                  className="rounded-2xl mb-3"
                  priority
                />
                <span className="text-2xl font-bold text-[var(--color-text)]">Derso</span>
              </Link>
              <p className="text-[var(--color-text-secondary)] mt-2 text-sm">
                Kurs ve okul ders programı yönetimi
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-[0_16px_48px_rgba(15,23,42,0.06)] p-6 sm:p-8">
              <div className="hidden lg:block mb-6">
                <h2 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">
                  {mode === "login" ? "Hesabınıza giriş yapın" : "Ücretsiz hesap oluşturun"}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">
                  {mode === "login"
                    ? "Devam etmek için e-posta ve şifrenizi girin."
                    : "Birkaç saniyede kaydolun; hemen program kurmaya başlayın."}
                </p>
              </div>

              <div
                role="tablist"
                aria-label="Giriş veya kayıt"
                className="grid grid-cols-2 gap-1 p-1 mb-6 bg-slate-100 rounded-xl"
              >
                <button
                  type="button"
                  role="tab"
                  id={`${formId}-tab-login`}
                  aria-selected={mode === "login"}
                  aria-controls={`${formId}-panel`}
                  onClick={() => switchMode("login")}
                  className={`min-h-11 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    mode === "login"
                      ? "bg-white text-[var(--color-text)] shadow-sm"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  }`}
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  role="tab"
                  id={`${formId}-tab-signup`}
                  aria-selected={mode === "signup"}
                  aria-controls={`${formId}-panel`}
                  onClick={() => switchMode("signup")}
                  className={`min-h-11 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    mode === "signup"
                      ? "bg-white text-[var(--color-text)] shadow-sm"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  }`}
                >
                  Kayıt Ol
                </button>
              </div>

              <form
                id={`${formId}-panel`}
                role="tabpanel"
                aria-labelledby={
                  mode === "login" ? `${formId}-tab-login` : `${formId}-tab-signup`
                }
                onSubmit={handleSubmit}
                className="space-y-4"
                noValidate={false}
              >
                <div>
                  <label
                    htmlFor={emailId}
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    E-posta
                  </label>
                  <input
                    ref={emailRef}
                    id={emailId}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="ornek@kursmerkezi.com"
                    required
                    autoComplete="email"
                    inputMode="email"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                  />
                </div>

                <div>
                  <label
                    htmlFor={passwordId}
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    Şifre
                  </label>
                  <div className="relative">
                    <input
                      id={passwordId}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} pr-12`}
                      placeholder={
                        mode === "signup" ? "En az 6 karakter" : "Şifrenizi girin"
                      }
                      required
                      minLength={6}
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      aria-invalid={error ? true : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-slate-50 transition-colors"
                      aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                      aria-pressed={showPassword}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                      En az 6 karakter kullanın.
                    </p>
                  )}
                </div>

                {mode === "signup" && (
                  <div className="login-field-enter">
                    <label
                      htmlFor={passwordConfirmId}
                      className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                    >
                      Şifre (tekrar)
                    </label>
                    <div className="relative">
                      <input
                        id={passwordConfirmId}
                        type={showPasswordConfirm ? "text" : "password"}
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        className={`${inputClass} pr-12`}
                        placeholder="Şifrenizi tekrar girin"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        aria-invalid={error ? true : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordConfirm((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-slate-50 transition-colors"
                        aria-label={
                          showPasswordConfirm
                            ? "Şifre tekrarını gizle"
                            : "Şifre tekrarını göster"
                        }
                        aria-pressed={showPasswordConfirm}
                      >
                        <EyeIcon open={showPasswordConfirm} />
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div
                    id={errorId}
                    role="alert"
                    aria-live="assertive"
                    className="flex gap-2.5 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200"
                  >
                    <svg
                      className="w-5 h-5 shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-11 inline-flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2.5 rounded-xl font-semibold hover:bg-[var(--color-primary-hover)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_16px_rgba(99,102,241,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                >
                  {loading && (
                    <svg
                      className="w-4 h-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="opacity-90"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
                      />
                    </svg>
                  )}
                  {loading
                    ? mode === "signup"
                      ? "Hesap oluşturuluyor..."
                      : "Giriş yapılıyor..."
                    : mode === "signup"
                      ? "Kayıt Ol"
                      : "Giriş Yap"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-[var(--color-text-secondary)]">
                {mode === "login" ? (
                  <>
                    Hesabınız yok mu?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="font-semibold text-[var(--color-primary)] hover:underline underline-offset-2"
                    >
                      Kayıt olun
                    </button>
                  </>
                ) : (
                  <>
                    Zaten hesabınız var mı?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="font-semibold text-[var(--color-primary)] hover:underline underline-offset-2"
                    >
                      Giriş yapın
                    </button>
                  </>
                )}
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-[var(--color-text-muted)] lg:hidden">
              <Link href="/" className="hover:text-[var(--color-text-secondary)] underline-offset-2 hover:underline">
                Ana sayfaya dön
              </Link>
            </p>
          </div>
        </main>
      </div>

      <footer className="py-4 text-center text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)] bg-white/70">
        © {new Date().getFullYear()} Derso. Tüm hakları saklıdır.
      </footer>

      <style jsx global>{`
        @keyframes loginFade {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .login-field-enter {
          animation: loginFade 180ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .login-field-enter {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
