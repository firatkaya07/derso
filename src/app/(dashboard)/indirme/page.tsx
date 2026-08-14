"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/components/Toast";
import { useSettings } from "@/components/SettingsProvider";
import { clientCacheKeys } from "@/lib/cache";
import { useOrganization } from "@/components/OrganizationProvider";
import { slotTimingOf } from "@/lib/settings";
import { throwIfDbError } from "@/lib/db-error";
import {
  prepareLessons,
  generateSinifCarsafPdf,
  generateOgretmenCarsafPdf,
  generateSinifDersProgramlariPdf,
  generateOgretmenProgramlariPdf,
  type RawLessonRow,
} from "@/lib/pdf-generator";
import {
  downloadOgretmenCarsafExcel,
  downloadSinifCarsafExcel,
} from "@/lib/carsaf-excel";
import type { ClassScheduleDay } from "@/lib/types";

type DownloadId =
  | "sinif-carsaf"
  | "ogretmen-carsaf"
  | "sinif-program"
  | "ogretmen-program";

type CarsafId = "sinif-carsaf" | "ogretmen-carsaf";

interface DownloadData {
  lessons: RawLessonRow[];
  scheduleDays: ClassScheduleDay[];
}

const DOWNLOADS: {
  id: DownloadId;
  title: string;
  description: string;
  icon: string;
  color: keyof typeof COLOR_STYLES;
  excel?: boolean;
}[] = [
  {
    id: "sinif-carsaf",
    title: "Sınıf Çarşaf Listesi",
    description:
      "Tüm sınıfların haftalık ders programı tek tabloda. Satırlar sınıflar, sütunlar gün ve ders saatleri. PDF veya Excel olarak indirebilirsiniz.",
    icon: "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
    color: "blue",
    excel: true,
  },
  {
    id: "ogretmen-carsaf",
    title: "Öğretmen Çarşaf Listesi",
    description:
      "Tüm öğretmenlerin haftalık programı tek tabloda. Hücrelerde sınıf ve ders kısa adı. PDF veya Excel olarak indirebilirsiniz.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    color: "orange",
    excel: true,
  },
  {
    id: "sinif-program",
    title: "Sınıf Ders Programları",
    description:
      "Her sınıf için ayrı sayfa. Haftalık program tablosu, ders-öğretmen bilgileri ve imza alanları.",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    color: "green",
  },
  {
    id: "ogretmen-program",
    title: "Öğretmen Programları",
    description:
      "Her öğretmen için resmî yazı formatında ayrı sayfa. Haftalık program, sınıf/ders/saat özeti, toplam ders saati ve onay alanları.",
    icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
    color: "purple",
  },
];

const COLOR_STYLES = {
  blue: {
    bg: "bg-indigo-50",
    icon: "text-indigo-600",
    border: "border-l-indigo-400",
    btn: "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
  },
  orange: {
    bg: "bg-indigo-50",
    icon: "text-indigo-500",
    border: "border-l-indigo-300",
    btn: "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
  },
  green: {
    bg: "bg-indigo-50",
    icon: "text-indigo-600",
    border: "border-l-indigo-400",
    btn: "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
  },
  purple: {
    bg: "bg-indigo-50",
    icon: "text-indigo-600",
    border: "border-l-indigo-500",
    btn: "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
  },
};

export default function IndirmePage() {
  const supabase = createClient();
  const toast = useToast();
  const settings = useSettings();
  const { organizationId } = useOrganization();
  const [generating, setGenerating] = useState<string | null>(null);

  const load = useCallback(async (): Promise<DownloadData> => {
    const [lessonResult, dayResult] = await Promise.all([
      supabase
        .from("lessons")
        .select("*, class:classes(*), subject:subjects(*), teacher:teachers(*)")
        .eq("organization_id", organizationId),
      supabase
        .from("class_schedule_days")
        .select("*")
        .eq("organization_id", organizationId),
    ]);
    throwIfDbError(lessonResult, "Program okunamadı");
    throwIfDbError(dayResult, "Ders günleri okunamadı");

    return {
      lessons: (lessonResult.data ?? []) as unknown as RawLessonRow[],
      scheduleDays: dayResult.data ?? [],
    };
  }, [supabase, organizationId]);

  const { data, error, loading } = useAsyncData(load, {
    cacheKey: clientCacheKeys.lessons(organizationId),
  });

  const stats = useMemo(() => {
    const lessons = data?.lessons ?? [];
    return {
      lessonCount: lessons.length,
      classCount: new Set(lessons.map((l) => l.class_id)).size,
      teacherCount: new Set(
        lessons.filter((l) => l.teacher_id).map((l) => l.teacher_id)
      ).size,
    };
  }, [data]);

  const prepare = () => {
    if (!data || data.lessons.length === 0) return null;
    const prepared = prepareLessons(
      data.lessons,
      data.scheduleDays,
      slotTimingOf(settings)
    );
    const pdfContext = {
      scheduleDays: data.scheduleDays,
      timing: slotTimingOf(settings),
    };
    return { prepared, pdfContext, raw: data.lessons };
  };

  const handleDownload = (id: DownloadId) => {
    const ready = prepare();
    if (!ready) return;
    setGenerating(id);
    try {
      const { prepared, pdfContext, raw } = ready;
      let result: ReturnType<typeof generateSinifCarsafPdf>;

      if (id === "ogretmen-program") {
        const teacherOffDays = new Map<string, number[]>();
        for (const row of raw) {
          if (
            row.teacher?.id &&
            row.teacher.off_days &&
            !teacherOffDays.has(row.teacher.id)
          ) {
            teacherOffDays.set(row.teacher.id, row.teacher.off_days);
          }
        }
        result = generateOgretmenProgramlariPdf(
          prepared,
          settings,
          pdfContext,
          teacherOffDays
        );
      } else {
        const generator = {
          "sinif-carsaf": generateSinifCarsafPdf,
          "ogretmen-carsaf": generateOgretmenCarsafPdf,
          "sinif-program": generateSinifDersProgramlariPdf,
        }[id];
        result = generator(prepared, settings, pdfContext);
      }

      if (result === "downloaded") {
        toast.info(
          "Açılır pencere engellendiği için belge HTML olarak indirildi. Dosyayı açıp tarayıcıdan yazdırabilirsiniz."
        );
      }
    } catch (err) {
      toast.error(`Belge oluşturulamadı: ${(err as Error).message}`);
    } finally {
      setGenerating(null);
    }
  };

  const handleExcelDownload = (id: CarsafId) => {
    const ready = prepare();
    if (!ready) return;
    setGenerating(`${id}-excel`);
    try {
      const { prepared, pdfContext } = ready;
      if (id === "sinif-carsaf") {
        downloadSinifCarsafExcel(prepared, pdfContext);
      } else {
        downloadOgretmenCarsafExcel(prepared, pdfContext);
      }
      toast.success("Excel dosyası indirildi.");
    } catch (err) {
      toast.error(`Excel oluşturulamadı: ${(err as Error).message}`);
    } finally {
      setGenerating(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
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
        <h1 className="text-lg font-bold text-gray-900">Program Çıktıları</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-7">
        PDF çıktıları yeni sekmede açılır; çarşaf listelerini Excel olarak da
        indirebilirsiniz.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
          {error.message}
        </div>
      )}

      {stats.lessonCount === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg font-medium">
            Henüz kaydedilmiş program yok
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Programı{" "}
            <Link href="/dagitim" className="text-blue-600 hover:underline">
              Otomatik Dağıtım
            </Link>{" "}
            sayfasından oluşturup kaydedebilir veya{" "}
            <Link href="/program" className="text-blue-600 hover:underline">
              Sınıf Programları
            </Link>{" "}
            sayfasından elle düzenleyebilirsiniz.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              ["Kayıtlı Ders", stats.lessonCount, "text-[var(--color-primary)]"],
              ["Sınıf", stats.classCount, "text-[var(--color-primary)]"],
              ["Öğretmen", stats.teacherCount, "text-[var(--color-primary)]"],
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {DOWNLOADS.map((item) => {
              const styles = COLOR_STYLES[item.color];
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${styles.border} p-6 flex flex-col`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`w-12 h-12 ${styles.bg} rounded-xl flex items-center justify-center shrink-0`}
                    >
                      <svg
                        className={`w-6 h-6 ${styles.icon}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d={item.icon}
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                    <button
                      onClick={() => handleDownload(item.id)}
                      disabled={generating !== null}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 ${styles.btn} text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                      {generating === item.id
                        ? "Hazırlanıyor..."
                        : "Yazdır / PDF Kaydet"}
                    </button>
                    {item.excel && (
                      <button
                        type="button"
                        onClick={() => handleExcelDownload(item.id as CarsafId)}
                        disabled={generating !== null}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        {generating === `${item.id}-excel`
                          ? "Hazırlanıyor..."
                          : "Excel İndir"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
