"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createOrganization } from "@/lib/org";
import { trackOnboardingComplete } from "@/lib/analytics";

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <p className="text-center text-sm font-semibold tracking-wide text-[var(--color-primary)] mb-2">
          Derso
        </p>
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Kurumunuzu oluşturun
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          Her kurumun öğretmen, sınıf ve program verileri birbirinden ayrıdır.
          Logo ve kurum bilgilerini sonraki adımda Tanımlar’dan düzenleyebilirsiniz.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-[0_20px_60px_rgba(99,102,241,0.08)] space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Kurum adı</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Anadolu Kurs Merkezi"
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all duration-200"
              autoFocus
              disabled={saving}
            />
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition-all duration-200 shadow-[0_2px_8px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
          >
            {saving ? "Oluşturuluyor…" : "Kurumu oluştur"}
          </button>
        </form>
      </div>
    </div>
  );
}
