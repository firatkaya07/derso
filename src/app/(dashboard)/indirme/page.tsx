"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateTimeSlots } from "@/lib/types";
import {
  prepareLessons,
  generateSinifCarsafPdf,
  generateOgretmenCarsafPdf,
  generateSinifDersProgramlariPdf,
  generateOgretmenProgramlariPdf,
} from "@/lib/pdf-generator";
import type { ClassScheduleDay } from "@/lib/types";

interface LessonRow {
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  class: { id: string; name: string };
  subject: { id: string; name: string; short_name: string | null };
  teacher: { id: string; name: string };
}

export default function IndirmePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [lessonCount, setLessonCount] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [generating, setGenerating] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [scheduleDays, setScheduleDays] = useState<ClassScheduleDay[]>([]);

  const fetchData = useCallback(async () => {
    const [{ data: lessonData }, { data: schedData }] = await Promise.all([
      supabase
        .from("lessons")
        .select("*, class:classes(*), subject:subjects(*), teacher:teachers(*)"),
      supabase.from("class_schedule_days").select("*"),
    ]);

    const rows = (lessonData || []) as unknown as LessonRow[];
    setLessons(rows);
    setScheduleDays(schedData || []);
    setLessonCount(rows.length);
    setClassCount(new Set(rows.map((l) => l.class_id)).size);
    setTeacherCount(
      new Set(rows.filter((l) => l.teacher_id).map((l) => l.teacher_id)).size
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const buildSlotMap = () => {
    const slotMap = new Map<string, { start: string; end: string }[]>();
    const classIds = [...new Set(lessons.map((l) => l.class_id))];
    for (const classId of classIds) {
      const days = scheduleDays.filter((d) => d.class_id === classId);
      if (days.length > 0) {
        const first = days.sort((a, b) => {
          if (a.start_time < b.start_time) return -1;
          if (a.start_time > b.start_time) return 1;
          return 0;
        })[0];
        const last = days.sort((a, b) => {
          if (a.end_time > b.end_time) return -1;
          if (a.end_time < b.end_time) return 1;
          return 0;
        })[0];
        slotMap.set(classId, generateTimeSlots(first.start_time, last.end_time));
      }
    }
    return slotMap;
  };

  const handleDownload = (type: string) => {
    if (lessons.length === 0) return;
    setGenerating(type);
    try {
      const slotMap = buildSlotMap();
      const prepared = prepareLessons(lessons, slotMap);

      switch (type) {
        case "sinif-carsaf":
          generateSinifCarsafPdf(prepared);
          break;
        case "ogretmen-carsaf":
          generateOgretmenCarsafPdf(prepared);
          break;
        case "sinif-program":
          generateSinifDersProgramlariPdf(prepared);
          break;
        case "ogretmen-program":
          generateOgretmenProgramlariPdf(prepared);
          break;
      }
    } catch (err) {
      alert("PDF oluşturulamadı: " + (err as Error).message);
    } finally {
      setGenerating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  const noData = lessonCount === 0;

  const downloads = [
    {
      id: "sinif-carsaf",
      title: "Sınıf Çarşaf Listesi",
      description:
        "Tüm sınıfların haftalık ders programı tek tabloda. Satırlar: sınıflar, Sütunlar: gün ve ders saatleri.",
      icon: "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
      color: "blue",
    },
    {
      id: "ogretmen-carsaf",
      title: "Öğretmen Çarşaf Listesi",
      description:
        "Tüm öğretmenlerin haftalık programı tek tabloda. Satırlar: öğretmenler, Sütunlar: gün ve ders saatleri.",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
      color: "orange",
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
        "Her öğretmen için resmi yazı formatında ayrı sayfa. Program tablosu, toplam ders saati ve onay alanları.",
      icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
      color: "purple",
    },
  ];

  const colorMap: Record<string, { bg: string; icon: string; border: string; btn: string; btnHover: string }> = {
    blue: {
      bg: "bg-blue-50",
      icon: "text-blue-600",
      border: "border-l-blue-400",
      btn: "bg-blue-600",
      btnHover: "hover:bg-blue-700",
    },
    orange: {
      bg: "bg-orange-50",
      icon: "text-orange-500",
      border: "border-l-orange-400",
      btn: "bg-orange-500",
      btnHover: "hover:bg-orange-600",
    },
    green: {
      bg: "bg-green-50",
      icon: "text-green-600",
      border: "border-l-green-400",
      btn: "bg-green-600",
      btnHover: "hover:bg-green-700",
    },
    purple: {
      bg: "bg-purple-50",
      icon: "text-purple-600",
      border: "border-l-purple-400",
      btn: "bg-purple-600",
      btnHover: "hover:bg-purple-700",
    },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Program İndirme
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Oluşturulan ders programını PDF formatında indirin.
      </p>

      {noData ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p className="text-gray-500 text-lg font-medium">
            Henüz kaydedilmiş program yok
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Önce Otomatik Ders Dağıtımı sayfasından program oluşturup kaydedin.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="text-3xl font-bold text-blue-600">
                {lessonCount}
              </div>
              <div className="text-sm text-gray-500 mt-1">Kayıtlı Ders</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="text-3xl font-bold text-green-600">
                {classCount}
              </div>
              <div className="text-sm text-gray-500 mt-1">Sınıf</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="text-3xl font-bold text-purple-600">
                {teacherCount}
              </div>
              <div className="text-sm text-gray-500 mt-1">Öğretmen</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {downloads.map((dl) => {
              const c = colorMap[dl.color];
              const isGen = generating === dl.id;
              return (
                <div
                  key={dl.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${c.border} p-6 flex flex-col`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center shrink-0`}
                    >
                      <svg
                        className={`w-6 h-6 ${c.icon}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d={dl.icon}
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {dl.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {dl.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <button
                      onClick={() => handleDownload(dl.id)}
                      disabled={isGen || generating !== null}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 ${c.btn} text-white rounded-lg font-medium ${c.btnHover} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isGen ? (
                        <>
                          <svg
                            className="animate-spin w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          PDF Oluşturuluyor...
                        </>
                      ) : (
                        <>
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
                          PDF İndir
                        </>
                      )}
                    </button>
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
