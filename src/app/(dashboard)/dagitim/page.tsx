"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadPlanningData } from "@/lib/planning-data";
import { useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/components/Toast";
import { DEFAULT_RULES, type ScheduleRules } from "@/lib/scheduler";
import { writeScheduleJob } from "@/lib/schedule-job";

export default function DagitimPage() {
  const supabase = createClient();
  const router = useRouter();
  const toast = useToast();

  const [rules, setRules] = useState<ScheduleRules>(DEFAULT_RULES);
  const [rounds, setRounds] = useState(10);
  const [starting, setStarting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [existingLessonCount, setExistingLessonCount] = useState(0);

  const loadDbData = useCallback(() => loadPlanningData(supabase), [supabase]);
  const { data: dbData, error: dbError } = useAsyncData(loadDbData);

  const plannedHours = dbData?.classSubjects.length ?? 0;

  const updateSplitRule = (hours: number, value: string) => {
    const splits = value
      .split("+")
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);
    if (splits.length > 0) {
      setRules((prev) => ({
        ...prev,
        splitRules: { ...prev.splitRules, [hours]: splits },
      }));
    }
  };

  const proceedWithGeneration = async () => {
    setShowDeleteConfirm(false);

    // Mevcut dersleri sil
    if (existingLessonCount > 0) {
      await supabase.from("lessons").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    setStarting(true);
    writeScheduleJob({
      rules,
      rounds,
      createdAt: Date.now(),
    });
    router.push("/dagitim/izleme");
  };

  const handleStart = async () => {
    if (plannedHours === 0) {
      toast.error("Önce Excel içe aktarma yapın veya sınıflara ders tanımlayın.");
      return;
    }

    // Mevcut ders sayısını kontrol et
    const { count } = await supabase
      .from("lessons")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      setExistingLessonCount(count);
      setShowDeleteConfirm(true);
    } else {
      setExistingLessonCount(0);
      proceedWithGeneration();
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/home"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            Otomatik Ders Dağıtımı
          </h1>
          <p className="text-xs text-gray-500">
            Kuralları ayarlayın; oluşturma sırasında arama turlarını izleyin.
          </p>
        </div>
      </div>

      {dbError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
          Veriler yüklenemedi: {dbError.message}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Bölme Kuralları
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Haftalık ders saatine göre derslerin nasıl bölüneceğini belirleyin.
            &quot;+&quot; işaretiyle ayırın (örnek: 2+1). Aynı dersten bir günde
            en fazla 2 saat verilir; 2&apos;den büyük parçalar otomatik olarak
            2&apos;ye bölünür.
          </p>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((hours) => (
              <div key={hours} className="flex items-center gap-4">
                <label className="w-32 text-sm font-medium text-gray-700">
                  {hours} saat:
                </label>
                <input
                  type="text"
                  value={(rules.splitRules[hours] || []).join("+")}
                  onChange={(e) => updateSplitRule(hours, e.target.value)}
                  className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                />
                <span className="text-xs text-gray-400">
                  {(rules.splitRules[hours] || [])
                    .map((n) => `${n} ders arka arkaya`)
                    .join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Arama Turu Sayısı
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Her tur, programı sıfırdan kurup boşta kalan dersleri yerleştirmeye
            çalışır ve en iyi sonuç saklanır. Ulaşılabilir en yüksek saate
            varılırsa arama erken biter.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min={1}
              max={2000}
              value={rounds}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 1 && value <= 2000) {
                  setRounds(value);
                }
              }}
              className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            />
            <span className="text-xs text-gray-400">1 – 2000 arası</span>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          Bir sınıfın bir dersinin bütün saatlerini tek öğretmen verir; program
          bu dersi iki öğretmene bölerek doldurmaz. Öğretmen sayısı yetmediğinde
          ders bölünmek yerine açıkta bırakılır ve nedeni raporlanır.
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleStart}
            disabled={starting || plannedHours === 0}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {starting ? "Açılıyor..." : "Programı Oluştur"}
          </button>
          {plannedHours > 0 && (
            <span className="text-xs text-gray-400">
              {plannedHours} sınıf-ders kaydı · izleme sayfasında turları canlı
              takip edersiniz
            </span>
          )}
        </div>
        {plannedHours === 0 && (
          <p className="text-sm text-amber-600">
            Önce{" "}
            <Link href="/aktarim" className="underline font-medium">
              Excel içe aktarma
            </Link>{" "}
            yapın veya{" "}
            <Link href="/siniflar" className="underline font-medium">
              sınıflara ders
            </Link>{" "}
            tanımlayın.
          </p>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Mevcut Program Silinecek
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Veritabanında <span className="font-bold text-red-600">{existingLessonCount}</span> adet ders kaydı bulunuyor.
                  Yeni program oluşturmak için mevcut dersler silinecektir.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={proceedWithGeneration}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Sil ve Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
