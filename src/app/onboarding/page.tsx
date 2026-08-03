"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createOrganization } from "@/lib/org";

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
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <p className="text-center text-sm font-semibold tracking-wide text-teal-700 mb-2">
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
          className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Kurum adı</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Anadolu Kurs Merkezi"
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
            className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 transition-colors"
          >
            {saving ? "Oluşturuluyor…" : "Kurumu oluştur"}
          </button>
        </form>
      </div>
    </div>
  );
}
