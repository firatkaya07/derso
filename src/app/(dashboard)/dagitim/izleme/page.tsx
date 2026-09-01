"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadPlanningData, type PlanningData } from "@/lib/planning-data";
import { saveGeneratedSchedule } from "@/lib/schedule-persistence";
import { useToast } from "@/components/Toast";
import { useSettings } from "@/components/SettingsProvider";
import { useOrganization } from "@/components/OrganizationProvider";
import { invalidateOrgClientCache } from "@/lib/cache";
import { slotTimingOf } from "@/lib/settings";
import type { ScheduleResult } from "@/lib/scheduler";
import {
  clearScheduleJob,
  ITERATIONS_PER_ROUND,
  isBetterSchedule,
  readScheduleJob,
  ROUND_TIME_LIMIT_MS,
  toClassSubjectInputs,
  type RoundLog,
  type ScheduleJobConfig,
} from "@/lib/schedule-job";
import {
  CoverageCard,
  ScheduleTable,
  SearchProgressPanel,
} from "@/components/ScheduleResultViews";
import { trackScheduleComplete } from "@/lib/analytics";
import { reportUsage } from "@/lib/usage-events";

type Phase = "loading" | "running" | "done" | "error" | "missing-job";

export default function DagitimIzlemePage() {
  const supabase = createClient();
  const router = useRouter();
  const toast = useToast();
  const settings = useSettings();
  const { organizationId } = useOrganization();

  const [job] = useState<ScheduleJobConfig | null>(() => readScheduleJob());
  const [phase, setPhase] = useState<Phase>(() =>
    readScheduleJob() ? "loading" : "missing-job"
  );
  const [roundLogs, setRoundLogs] = useState<RoundLog[]>([]);
  const [best, setBest] = useState<ScheduleResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!job) return;

    let cancelled = false;
    cancelledRef.current = false;

    const config = job;

    const run = async () => {
      let data: PlanningData;
      try {
        data = await loadPlanningData(supabase, organizationId);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage((error as Error).message);
        setPhase("error");
        return;
      }

      if (cancelled || cancelledRef.current) return;

      if (data.classSubjects.length === 0) {
        setErrorMessage(
          "Önce Excel içe aktarma yapın veya sınıflara ders tanımlayın."
        );
        setPhase("error");
        return;
      }

      setPhase("running");
      const csInputs = toClassSubjectInputs(data);
      let bestSoFar: ScheduleResult | null = null;
      const timing = slotTimingOf(settings);
      const { autoSchedule } = await import("@/lib/scheduler");

      const runRound = (round: number) => {
        if (cancelled || cancelledRef.current) return;

        window.setTimeout(() => {
          if (cancelled || cancelledRef.current) return;

          const result = autoSchedule(
            data.classes,
            data.scheduleDays,
            data.subjects,
            csInputs,
            config.rules,
            data.teacherSubjects,
            data.teachers,
            round + 1,
            {
              restarts: 1,
              maxIterations: ITERATIONS_PER_ROUND,
              timeLimitMs: ROUND_TIME_LIMIT_MS,
              timing,
            }
          );

          if (!bestSoFar || isBetterSchedule(result, bestSoFar)) {
            bestSoFar = result;
          }
          const currentBest = bestSoFar;

          setBest(currentBest);
          setRoundLogs((prev) => [
            ...prev,
            {
              round: round + 1,
              placedHours: result.stats.placedHours,
              bestHours: currentBest.stats.placedHours,
              warningCount: result.warnings.length,
            },
          ]);

          const reachedLimit =
            currentBest.stats.placedHours >=
              currentBest.stats.maxPlaceableHours &&
            currentBest.warnings.length === 0;

          if (reachedLimit || round + 1 >= config.rounds) {
            setBest(currentBest);
            setPhase("done");
            clearScheduleJob();

            const { placedHours, totalHours, maxPlaceableHours } =
              currentBest.stats;
            trackScheduleComplete({
              success: placedHours > 0,
              placed_hours: placedHours,
              total_hours: totalHours,
            });
            reportUsage({
              organizationId,
              eventType: "schedule_complete",
              edition: "v1",
              metadata: {
                success: placedHours > 0,
                placed_hours: placedHours,
                total_hours: totalHours,
              },
            });
            if (placedHours === totalHours) {
              toast.success("Tüm dersler yerleştirildi.");
            } else if (placedHours >= maxPlaceableHours) {
              toast.info(
                `${placedHours}/${totalHours} saat yerleştirildi. Kalan saatler mevcut öğretmen ve ders saatleriyle yerleştirilemez.`
              );
            } else {
              toast.info(
                `${placedHours}/${totalHours} saat yerleştirildi. Tur sayısını artırmayı deneyebilirsiniz.`
              );
            }
            return;
          }

          runRound(round + 1);
        }, 0);
      };

      runRound(0);
    };

    void run();

    return () => {
      cancelled = true;
      cancelledRef.current = true;
    };
    // Tek seferlik başlatma: ayarlar/oturum değişince yeniden koşmasın.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  const handleSave = async () => {
    if (!best) return;
    setSaving(true);
    try {
      const result = await saveGeneratedSchedule(
        supabase,
        best.lessons,
        organizationId
      );
      setSaved(true);
      invalidateOrgClientCache(organizationId);
      reportUsage({
        organizationId,
        eventType: "schedule_save",
        edition: "v1",
        metadata: {
          saved_lessons: result.savedLessons,
          skipped_lessons: result.skippedLessons,
        },
      });
      toast.success(
        result.skippedLessons > 0
          ? `${result.savedLessons} ders saati kaydedildi. Öğretmeni atanamayan ${result.skippedLessons} saat kaydedilmedi.`
          : `${result.savedLessons} ders saati kaydedildi.`
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleStop = () => {
    cancelledRef.current = true;
    if (best) {
      setPhase("done");
      clearScheduleJob();
      toast.info("Arama durduruldu. Şu ana kadarki en iyi sonuç gösteriliyor.");
    } else {
      setPhase("error");
      setErrorMessage("Arama iptal edildi.");
      clearScheduleJob();
    }
  };

  if (phase === "missing-job") {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <h1 className="text-lg font-bold text-gray-900 mb-2">
          Başlatılacak arama yok
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Önce kuralları ayarlayıp &quot;Programı Oluştur&quot; düğmesine basın.
        </p>
        <Link
          href="/dagitim"
          className="inline-flex px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)]"
        >
          Kurallara dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dagitim"
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
              Program Oluşturma
            </h1>
            <p className="text-xs text-gray-500">
              {job
                ? `${job.rounds} tur · arama denemelerini canlı izleyin`
                : "Arama hazırlanıyor"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {phase === "running" && (
            <button
              type="button"
              onClick={handleStop}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
            >
              Durdur
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/dagitim")}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Kurallara dön
          </button>
        </div>
      </div>

      {phase === "loading" && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500">
          Veriler yükleniyor…
        </div>
      )}

      {phase === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">
          {errorMessage || "Arama başlatılamadı."}
          <div className="mt-3">
            <Link href="/dagitim" className="underline font-medium">
              Kurallara dön
            </Link>
          </div>
        </div>
      )}

      {(phase === "running" || phase === "done") && job && (
        <SearchProgressPanel
          generating={phase === "running"}
          rounds={job.rounds}
          roundLogs={roundLogs}
          best={best}
        />
      )}

      {phase === "done" && best && (
        <>
          <CoverageCard result={best} />

          {best.errors.length > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <h3 className="text-sm font-semibold text-red-800 mb-2">
                Yerleştirilemeyen dersler ve nedenleri
              </h3>
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {best.errors.map((message, i) => (
                  <div key={i} className="text-xs text-red-700">
                    {message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {best.warnings.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">
                Uyarılar ({best.warnings.length})
              </h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {best.warnings.map((message, i) => (
                  <div key={i} className="text-xs text-amber-700">
                    {message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <ScheduleTable lessons={best.lessons} />

          {best.stats.teacherLoads.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Öğretmen Yükleri
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {best.stats.teacherLoads.map((load) => (
                  <div
                    key={load.teacherId}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {load.teacherName}
                    </span>
                    <span className="text-sm font-bold text-[var(--color-primary)]">
                      {load.totalHours} saat
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || saved || best.lessons.length === 0}
              className="px-6 py-2.5 bg-[var(--color-success)] text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? "Kaydediliyor..."
                : saved
                  ? "Kaydedildi"
                  : "Programı Kaydet"}
            </button>
            <Link
              href="/dagitim"
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Kuralları değiştir
            </Link>
            {saved && (
              <Link
                href="/program"
                className="px-6 py-2.5 text-[var(--color-primary)] font-medium text-sm hover:underline"
              >
                Program sayfasına git →
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
