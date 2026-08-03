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

  const handleStart = () => {
    if (plannedHours === 0) {
      toast.error("Önce Excel içe aktarma yapın veya sınıflara ders tanımlayın.");
      return;
    }
    setStarting(true);
    writeScheduleJob({
      rules,
      rounds,
      createdAt: Date.now(),
    });
    router.push("/dagitim/izleme");
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/"
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
                  className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
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
              className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
            />
            <span className="text-xs text-gray-400">1 – 2000 arası</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          Bir sınıfın bir dersinin bütün saatlerini tek öğretmen verir; program
          bu dersi iki öğretmene bölerek doldurmaz. Öğretmen sayısı yetmediğinde
          ders bölünmek yerine açıkta bırakılır ve nedeni raporlanır.
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleStart}
            disabled={starting || plannedHours === 0}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
