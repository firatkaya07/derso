"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { loadPlanningData, type PlanningData } from "@/lib/planning-data";
import { saveGeneratedSchedule } from "@/lib/schedule-persistence";
import { useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/components/Toast";
import { useSettings } from "@/components/SettingsProvider";
import { useOrganization } from "@/components/OrganizationProvider";
import { slotTimingOf } from "@/lib/settings";
import {
  autoSchedule,
  DEFAULT_RULES,
  type ScheduleResult,
  type ScheduleRules,
  type GeneratedLesson,
  type ClassSubjectInput,
} from "@/lib/scheduler";
import type { Subject } from "@/lib/types";
import { DAY_NAMES } from "@/lib/types";

type Tab = "rules" | "schedule" | "atama";

interface RoundLog {
  round: number;
  placedHours: number;
  bestHours: number;
}

/** Bir turdaki onarım adımı üst sınırı. */
const ITERATIONS_PER_ROUND = 40000;
/** Bir turun süre sınırı; arayüzün donmaması için kısa tutulur. */
const ROUND_TIME_LIMIT_MS = 1200;

/** Daha çok saat yerleştiren, eşitlikte daha az uyarı üreten sonuç iyidir. */
function isBetterSchedule(
  candidate: ScheduleResult,
  current: ScheduleResult
): boolean {
  if (candidate.stats.placedHours !== current.stats.placedHours) {
    return candidate.stats.placedHours > current.stats.placedHours;
  }
  return candidate.warnings.length < current.warnings.length;
}

function toClassSubjectInputs(data: PlanningData): ClassSubjectInput[] {
  return data.classSubjects.map((cs) => ({
    classId: cs.class_id,
    subjectId: cs.subject_id,
    subjectName:
      (cs.subject as unknown as Subject)?.name ||
      data.subjects.find((s) => s.id === cs.subject_id)?.name ||
      "",
    weeklyHours: cs.weekly_hours,
    teacherId: cs.teacher_id,
  }));
}

export default function DagitimPage() {
  const supabase = createClient();
  const toast = useToast();
  const settings = useSettings();
  const { organizationId } = useOrganization();

  const [tab, setTab] = useState<Tab>("rules");

  const [rules, setRules] = useState<ScheduleRules>(DEFAULT_RULES);
  const [rounds, setRounds] = useState(10);
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(
    null
  );
  const [generating, setGenerating] = useState(false);
  const [roundLogs, setRoundLogs] = useState<RoundLog[]>([]);

  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  const loadDbData = useCallback(() => loadPlanningData(supabase), [supabase]);
  const { data: dbData, error: dbError, reload } = useAsyncData(loadDbData);

  const plannedHours = dbData?.classSubjects.length ?? 0;

  const handleGenerate = async () => {
    setGenerating(true);
    setScheduleResult(null);
    setScheduleSaved(false);
    setRoundLogs([]);

    let data: PlanningData;
    try {
      // Veri doğrudan burada okunur; React state üzerinden okunsaydı bu render
      // için hazırlanan (bir tur eski) değerler kullanılırdı.
      data = await loadPlanningData(supabase);
    } catch (error) {
      toast.error((error as Error).message);
      setGenerating(false);
      return;
    }

    if (data.classSubjects.length === 0) {
      toast.error("Önce Excel içe aktarma yapın veya sınıflara ders tanımlayın.");
      setGenerating(false);
      return;
    }

    const csInputs = toClassSubjectInputs(data);
    let best: ScheduleResult | null = null;

    // Turlar setTimeout ile ayrılır: hesaplama tek iş parçacığında koştuğu
    // için aralık verilmezse arayüz kilitlenir.
    const runRound = (round: number) => {
      setTimeout(() => {
        const result = autoSchedule(
          data.classes,
          data.scheduleDays,
          data.subjects,
          csInputs,
          rules,
          data.teacherSubjects,
          data.teachers,
          round + 1,
          {
            restarts: 1,
            maxIterations: ITERATIONS_PER_ROUND,
            timeLimitMs: ROUND_TIME_LIMIT_MS,
            timing: slotTimingOf(settings),
          }
        );

        if (!best || isBetterSchedule(result, best)) best = result;
        const bestSoFar = best as ScheduleResult;

        setRoundLogs((prev) => [
          ...prev,
          {
            round: round + 1,
            placedHours: result.stats.placedHours,
            bestHours: bestSoFar.stats.placedHours,
          },
        ]);

        const reachedLimit =
          bestSoFar.stats.placedHours >= bestSoFar.stats.maxPlaceableHours &&
          bestSoFar.warnings.length === 0;

        if (reachedLimit || round + 1 >= rounds) {
          setScheduleResult(bestSoFar);
          setGenerating(false);
          setTab("schedule");

          const { placedHours, totalHours, maxPlaceableHours } =
            bestSoFar.stats;
          if (placedHours === totalHours) {
            toast.success("Tüm dersler yerleştirildi.");
          } else if (placedHours >= maxPlaceableHours) {
            toast.info(
              `${placedHours}/${totalHours} saat yerleştirildi. Kalan saatler mevcut öğretmen ve ders saatleriyle yerleştirilemez; nedenleri aşağıda.`
            );
          } else {
            toast.info(
              `${placedHours}/${totalHours} saat yerleştirildi. Tur sayısını artırmayı deneyebilirsiniz.`
            );
          }
        } else {
          runRound(round + 1);
        }
      }, 0);
    };

    runRound(0);
  };

  const handleSaveAll = async () => {
    if (!scheduleResult) return;
    setSavingSchedule(true);
    try {
      const result = await saveGeneratedSchedule(
        supabase,
        scheduleResult.lessons,
        organizationId
      );
      setScheduleSaved(true);
      reload();
      toast.success(
        result.skippedLessons > 0
          ? `${result.savedLessons} ders saati kaydedildi. Öğretmeni atanamayan ${result.skippedLessons} saat kaydedilmedi.`
          : `${result.savedLessons} ders saati kaydedildi.`
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSavingSchedule(false);
    }
  };

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


  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
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
        <h1 className="text-lg font-bold text-gray-900">
          Otomatik Ders Dağıtımı
        </h1>
      </div>

      {dbError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
          Veriler yüklenemedi: {dbError.message}
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(
          [
            ["rules", "Kurallar"],
            ["schedule", "Ders Programı"],
            ["atama", "Öğretmen Yükleri"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {(generating || roundLogs.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              {generating ? "Program aranıyor..." : "Arama Sonuçları"}
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500">
                Tur: {roundLogs.length}/{rounds}
              </span>
              {roundLogs.length > 0 && (
                <span className="font-semibold text-green-600">
                  En iyi: {roundLogs[roundLogs.length - 1].bestHours} saat
                </span>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (roundLogs.length / rounds) * 100)}%`,
              }}
            />
          </div>
          <div className="max-h-40 overflow-y-auto text-xs font-mono space-y-0.5">
            {[...roundLogs].reverse().map((log) => (
              <div
                key={log.round}
                className={`flex items-center gap-3 px-2 py-0.5 rounded ${
                  log.placedHours === log.bestHours
                    ? "bg-green-50 text-green-700"
                    : "text-gray-500"
                }`}
              >
                <span className="w-12">#{log.round}</span>
                <span className="w-32">Yerleşen: {log.placedHours} saat</span>
                {log.placedHours === log.bestHours && (
                  <span className="text-green-600 font-semibold">★ En iyi</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "rules" && (
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
              varılırsa arama erken biter, bu yüzden turu artırmanın bedeli
              yalnızca zor programlarda hissedilir.
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

          <button
            onClick={handleGenerate}
            disabled={generating || plannedHours === 0}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Oluşturuluyor..." : "Programı Oluştur"}
          </button>
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
      )}

      {tab === "schedule" && (
        <div className="space-y-6">
          {!scheduleResult ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                Henüz program oluşturulmadı. Kurallar sekmesinden &quot;Programı
                Oluştur&quot; tuşuna basın.
              </p>
            </div>
          ) : (
            <>
              <CoverageCard result={scheduleResult} />

              {scheduleResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                  <h3 className="text-sm font-semibold text-red-800 mb-2">
                    Yerleştirilemeyen dersler ve nedenleri
                  </h3>
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {scheduleResult.errors.map((message, i) => (
                      <div key={i} className="text-xs text-red-700">
                        {message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scheduleResult.warnings.length > 0 && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2">
                    Uyarılar ({scheduleResult.warnings.length})
                  </h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {scheduleResult.warnings.map((message, i) => (
                      <div key={i} className="text-xs text-amber-700">
                        {message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ScheduleTable lessons={scheduleResult.lessons} />

              <div className="flex gap-3 items-center">
                <button
                  onClick={handleSaveAll}
                  disabled={
                    savingSchedule ||
                    scheduleSaved ||
                    scheduleResult.lessons.length === 0
                  }
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingSchedule
                    ? "Kaydediliyor..."
                    : scheduleSaved
                      ? "Kaydedildi"
                      : "Programı Kaydet"}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Yeniden Oluştur
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "atama" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Öğretmen Yükleri
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Öğretmenler program oluşturulurken atanır: bir sınıfın bir dersini
              baştan sona tek öğretmen verir, kimse izin gününde veya aynı saatte
              iki sınıfta görünmez. Sınıflar sayfasında sabit öğretmen
              belirlediyseniz o atama korunur.
            </p>
            {!scheduleResult && (
              <p className="text-sm text-amber-600 mt-3">
                Önce Kurallar sekmesinden programı oluşturun.
              </p>
            )}
          </div>

          {scheduleResult && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  [
                    "Aktif Öğretmen",
                    scheduleResult.stats.teacherLoads.length,
                    "text-purple-600",
                  ],
                  [
                    "En yüksek yük",
                    scheduleResult.stats.teacherLoads[0]?.totalHours ?? 0,
                    "text-blue-600",
                  ],
                  [
                    "En düşük yük",
                    scheduleResult.stats.teacherLoads[
                      scheduleResult.stats.teacherLoads.length - 1
                    ]?.totalHours ?? 0,
                    "text-green-600",
                  ],
                  [
                    "Bölünmüş ders",
                    0,
                    "text-gray-400",
                  ],
                ].map(([label, value, color]) => (
                  <div
                    key={label as string}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
                  >
                    <div className={`text-3xl font-bold ${color}`}>{value}</div>
                    <div className="text-sm text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Haftalık Ders Saati Dağılımı
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {scheduleResult.stats.teacherLoads.map((load) => (
                    <div
                      key={load.teacherId}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {load.teacherName}
                      </span>
                      <span className="text-sm font-bold text-purple-600">
                        {load.totalHours} saat
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CoverageCard({ result }: { result: ScheduleResult }) {
  const { placedHours, totalHours, maxPlaceableHours, elapsedMs } = result.stats;
  const percent = totalHours > 0 ? (placedHours / totalHours) * 100 : 100;
  const atLimit = placedHours >= maxPlaceableHours;
  const complete = placedHours === totalHours;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-end justify-between mb-3 gap-4">
        <div>
          <div className="text-4xl font-bold text-gray-900">
            %{percent.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {placedHours} / {totalHours} ders saati yerleştirildi
          </div>
        </div>
        <div className="text-right text-xs text-gray-400">
          <div>{result.unplaced.length} ders eksik</div>
          <div>{(elapsedMs / 1000).toFixed(1)} sn</div>
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${complete ? "bg-green-500" : atLimit ? "bg-blue-500" : "bg-amber-500"}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      {complete ? (
        <p className="text-sm text-green-700">
          Bütün dersler yerleştirildi.
        </p>
      ) : atLimit ? (
        <p className="text-sm text-blue-700">
          Bu, mevcut ders saatleri ve öğretmen kadrosuyla ulaşılabilecek en
          yüksek orandır ({maxPlaceableHours} saat). Daha fazlası için aşağıdaki
          nedenleri giderin.
        </p>
      ) : (
        <p className="text-sm text-amber-700">
          Kısıtlara göre {maxPlaceableHours} saate kadar çıkılabilir. Arama turu
          sayısını artırıp tekrar deneyebilirsiniz.
        </p>
      )}
    </div>
  );
}

function ScheduleTable({ lessons }: { lessons: GeneratedLesson[] }) {
  const sorted = [...lessons].sort((a, b) => {
    if (a.className !== b.className)
      return a.className.localeCompare(b.className, "tr");
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-3">Program Ayrıntısı</h3>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-500">Sınıf</th>
              <th className="text-left py-2 px-3 text-gray-500">Gün</th>
              <th className="text-left py-2 px-3 text-gray-500">Saat</th>
              <th className="text-left py-2 px-3 text-gray-500">Ders</th>
              <th className="text-left py-2 px-3 text-gray-500">Öğretmen</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((lesson, i) => (
              <tr
                key={`${lesson.classId}-${lesson.dayOfWeek}-${lesson.startTime}-${i}`}
                className="border-b border-gray-100"
              >
                <td className="py-1.5 px-3 font-medium text-gray-900">
                  {lesson.className}
                </td>
                <td className="py-1.5 px-3">
                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">
                    {DAY_NAMES[lesson.dayOfWeek]}
                  </span>
                </td>
                <td className="py-1.5 px-3 text-gray-600 font-mono text-xs">
                  {lesson.startTime}-{lesson.endTime}
                </td>
                <td className="py-1.5 px-3 text-gray-900">
                  {lesson.subjectName}
                </td>
                <td className="py-1.5 px-3 text-gray-600">
                  {lesson.teacherName || (
                    <span className="text-red-400 italic">Atanamadı</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
