"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/components/Toast";
import { useSettings } from "@/components/SettingsProvider";
import { clientCacheKeys } from "@/lib/cache";
import { useOrganization } from "@/components/OrganizationProvider";
import { throwIfDbError } from "@/lib/db-error";
import type { RawLessonRow } from "@/lib/pdf-generator";
import type { ClassScheduleDay } from "@/lib/types";
import { trackFileDownload } from "@/lib/analytics";
import { reportUsage } from "@/lib/usage-events";
import { useV2Schedule } from "@/lib/v2/ScheduleProvider";
import {
  downloadOgretmenCarsafExcelV2,
  downloadSinifCarsafExcelV2,
  generateOgretmenCarsafPdfV2,
  generateOgretmenProgramlariPdfV2,
  generateSinifCarsafPdfV2,
  generateSinifDersProgramlariPdfV2,
  prepareLessonsV2,
} from "@/lib/v2/exports";

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
  excel?: boolean;
}[] = [
  {
    id: "sinif-carsaf",
    title: "Sınıf Çarşaf Listesi (V2)",
    description:
      "Hafta içi ve hafta sonu ayrı tablolar. PDF veya Excel (iki sayfa).",
    icon: "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
    excel: true,
  },
  {
    id: "ogretmen-carsaf",
    title: "Öğretmen Çarşaf Listesi (V2)",
    description:
      "Hafta içi ve hafta sonu ayrı tablolar. PDF veya Excel (iki sayfa).",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    excel: true,
  },
  {
    id: "sinif-program",
    title: "Sınıf Ders Programları (V2)",
    description:
      "Her sınıf için hafta içi ve (varsa) hafta sonu ayrı program tabloları.",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    id: "ogretmen-program",
    title: "Öğretmen Programları (V2)",
    description:
      "Her öğretmen için hafta içi / hafta sonu ayrı tablolar ve özet.",
    icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  },
];

export default function V2IndirmePage() {
  const supabase = createClient();
  const toast = useToast();
  const settings = useSettings();
  const { organizationId } = useOrganization();
  const v2 = useV2Schedule();
  const [generating, setGenerating] = useState<string | null>(null);

  const load = useCallback(async (): Promise<DownloadData> => {
    const [lessonResult, dayResult] = await Promise.all([
      supabase
        .from("lessons_v2")
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
    cacheKey: clientCacheKeys.lessonsV2(organizationId),
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
    return {
      prepared: prepareLessonsV2(data.lessons, v2.profiles),
      scheduleDays: data.scheduleDays,
      raw: data.lessons,
    };
  };

  const handleDownload = async (id: DownloadId) => {
    setGenerating(id);
    try {
      const ready = prepare();
      if (!ready) return;
      const { prepared, scheduleDays, raw } = ready;
      let result: "downloaded" | "printed";

      if (id === "sinif-carsaf") {
        result = generateSinifCarsafPdfV2(prepared, v2.profiles, settings);
      } else if (id === "ogretmen-carsaf") {
        result = generateOgretmenCarsafPdfV2(prepared, v2.profiles, settings);
      } else if (id === "sinif-program") {
        result = generateSinifDersProgramlariPdfV2(
          prepared,
          v2.profiles,
          scheduleDays,
          settings
        );
      } else {
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
        result = generateOgretmenProgramlariPdfV2(
          prepared,
          v2.profiles,
          scheduleDays,
          settings,
          teacherOffDays
        );
      }

      trackFileDownload({
        file_name: `v2-${id}`,
        file_extension: "pdf",
        link_text: `v2-${id}`,
      });
      reportUsage({
        organizationId,
        eventType: "download",
        edition: "v2",
        artifact: id,
        format: "pdf",
      });
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

  const handleExcelDownload = async (id: CarsafId) => {
    setGenerating(`${id}-excel`);
    try {
      const ready = prepare();
      if (!ready) return;
      if (id === "sinif-carsaf") {
        await downloadSinifCarsafExcelV2(ready.prepared, v2.profiles);
      } else {
        await downloadOgretmenCarsafExcelV2(ready.prepared, v2.profiles);
      }
      trackFileDownload({
        file_name: `v2-${id}`,
        file_extension: "xlsx",
        link_text: `v2-${id}-excel`,
      });
      reportUsage({
        organizationId,
        eventType: "download",
        edition: "v2",
        artifact: id,
        format: "xlsx",
      });
      toast.success("Excel dosyası indirildi (hafta içi / hafta sonu sayfaları).");
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
      <div className="mb-1 flex items-center gap-2">
        <Link
          href="/v2"
          className="text-gray-400 transition-colors hover:text-gray-600"
        >
          <svg
            className="h-5 w-5"
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
        <h1 className="text-lg font-bold text-gray-900">Program İndir (V2)</h1>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        V2 zaman çizelgesine göre çıktı. Hafta içi ve hafta sonu ayrı tablolardır.
        {error ? (
          <span className="ml-2 text-red-600">{error.message}</span>
        ) : (
          <span className="ml-2 text-gray-400">
            {stats.lessonCount} ders · {stats.classCount} sınıf ·{" "}
            {stats.teacherCount} öğretmen
          </span>
        )}
      </p>

      {stats.lessonCount === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          V2 programında ders yok. Önce{" "}
          <Link href="/v2/tanimlar" className="font-medium underline">
            V1 derslerini aktarın
          </Link>{" "}
          veya{" "}
          <Link href="/v2/dagitim" className="font-medium underline">
            otomatik dağıtım
          </Link>{" "}
          çalıştırın.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {DOWNLOADS.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <svg
                  className="h-5 w-5"
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
              <h2 className="font-semibold text-gray-900">{item.title}</h2>
              <p className="mt-1.5 text-sm text-gray-500">{item.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={generating !== null}
                  onClick={() => void handleDownload(item.id)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {generating === item.id ? "Hazırlanıyor…" : "Yazdır / PDF"}
                </button>
                {item.excel && (
                  <button
                    type="button"
                    disabled={generating !== null}
                    onClick={() => void handleExcelDownload(item.id as CarsafId)}
                    className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    {generating === `${item.id}-excel`
                      ? "Hazırlanıyor…"
                      : "Excel"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
