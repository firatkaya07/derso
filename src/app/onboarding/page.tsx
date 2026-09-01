"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createOrganization } from "@/lib/org";
import { trackOnboardingComplete } from "@/lib/analytics";
import SkipToContent from "@/components/SkipToContent";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Kurum adını yazın.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createOrganization(supabase, trimmed);
      trackOnboardingComplete();
      router.replace("/home");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4 pb-[env(safe-area-inset-bottom)]">
      <SkipToContent />
      <main id="icerik" className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <ThemeSwitcher />
        </div>
        <p className="ios-section-label px-0 text-center text-[var(--color-primary)]">
          Derso
        </p>
        <h1 className="ios-large-title text-center">
          Kurumunuzu oluşturun
        </h1>
        <p className="ios-subhead mx-auto mt-2 mb-8 max-w-sm text-center">
          Her kurumun öğretmen, sınıf ve program verileri birbirinden ayrıdır.
          Logo ve kurum bilgilerini sonraki adımda Tanımlar’dan düzenleyebilirsiniz.
        </p>

        <form
          onSubmit={handleSubmit}
          className="ios-inset space-y-4 p-5"
        >
          <label className="block">
            <span className="ios-subhead mb-1.5 block text-[var(--color-text)]">Kurum adı</span>
            <input
              type="text"
              name="organization"
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Anadolu Kurs Merkezi"
              className="ios-field"
              autoFocus
              disabled={saving}
            />
          </label>

          {error && (
            <p className="rounded-[10px] bg-[var(--color-fill)] px-3 py-2 text-[15px] text-[var(--color-destructive)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="ios-btn ios-btn-primary w-full"
          >
            {saving ? "Oluşturuluyor…" : "Kurumu oluştur"}
          </button>
        </form>
      </main>
    </div>
  );
}
