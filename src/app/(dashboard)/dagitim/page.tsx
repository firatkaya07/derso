"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseExcelFile, type ParsedData } from "@/lib/excel-parser";
import {
  autoSchedule,
  DEFAULT_RULES,
  type ScheduleRules,
  type GeneratedLesson,
  type ClassSubjectInput,
} from "@/lib/scheduler";
import type {
  Teacher,
  Subject,
  ClassGroup,
  ClassScheduleDay,
  ClassSubject,
} from "@/lib/types";
import { DAY_NAMES, SUBJECT_COLORS } from "@/lib/types";

type Tab = "import" | "rules" | "schedule";

export default function DagitimPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("import");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  const [rules, setRules] = useState<ScheduleRules>(DEFAULT_RULES);
  const [scheduleResult, setScheduleResult] = useState<{
    lessons: GeneratedLesson[];
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [dbTeachers, setDbTeachers] = useState<Teacher[]>([]);
  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);
  const [dbClasses, setDbClasses] = useState<ClassGroup[]>([]);
  const [dbScheduleDays, setDbScheduleDays] = useState<ClassScheduleDay[]>([]);
  const [dbClassSubjects, setDbClassSubjects] = useState<ClassSubject[]>([]);

  const fetchDbData = useCallback(async () => {
    const [
      { data: teachers },
      { data: subjects },
      { data: classes },
      { data: scheduleDays },
      { data: classSubjects },
    ] = await Promise.all([
      supabase.from("teachers").select("*").order("name"),
      supabase.from("subjects").select("*").order("name"),
      supabase.from("classes").select("*").order("name"),
      supabase.from("class_schedule_days").select("*"),
      supabase
        .from("class_subjects")
        .select("*, subject:subjects(*), teacher:teachers(*)"),
    ]);
    setDbTeachers(teachers || []);
    setDbSubjects(subjects || []);
    setDbClasses(classes || []);
    setDbScheduleDays(scheduleDays || []);
    setDbClassSubjects(classSubjects || []);
  }, [supabase]);

  useEffect(() => {
    fetchDbData();
  }, [fetchDbData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    try {
      const data = parseExcelFile(buffer);
      setParsedData(data);
      setImported(false);
      setImportLog([]);
    } catch (err) {
      alert("Excel dosyası okunamadı: " + (err as Error).message);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;
    setImporting(true);
    const log: string[] = [];

    try {
      for (const t of parsedData.teachers) {
        const existing = dbTeachers.find(
          (dt) => dt.name.toLowerCase() === t.name.toLowerCase()
        );
        if (existing) {
          await supabase
            .from("teachers")
            .update({
              off_days: t.offDays,
              specialization: t.specialization,
            })
            .eq("id", existing.id);
          log.push(`Ogretmen guncellendi: ${t.name}`);
        } else {
          await supabase.from("teachers").insert({
            name: t.name,
            off_days: t.offDays,
            specialization: t.specialization,
          });
          log.push(`Ogretmen eklendi: ${t.name}`);
        }
      }

      for (let i = 0; i < parsedData.subjects.length; i++) {
        const subName = parsedData.subjects[i];
        const existing = dbSubjects.find(
          (ds) => ds.name.toLowerCase() === subName.toLowerCase()
        );
        if (!existing) {
          await supabase.from("subjects").insert({
            name: subName,
            color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
          });
          log.push(`Ders eklendi: ${subName}`);
        }
      }

      const { data: freshSubjects } = await supabase
        .from("subjects")
        .select("*");
      const subjectLookup = new Map<string, string>();
      for (const s of freshSubjects || []) {
        subjectLookup.set(s.name.toLowerCase(), s.id);
      }

      for (const cls of parsedData.classes) {
        const existing = dbClasses.find(
          (dc) => dc.name.toLowerCase() === cls.name.toLowerCase()
        );
        let classId: string;

        if (existing) {
          classId = existing.id;
          log.push(`Sinif mevcut: ${cls.name}`);
        } else {
          const { data: newClass } = await supabase
            .from("classes")
            .insert({ name: cls.name })
            .select()
            .single();
          if (!newClass) continue;
          classId = newClass.id;
          log.push(`Sinif eklendi: ${cls.name}`);
        }

        if (cls.days.length > 0) {
          await supabase
            .from("class_schedule_days")
            .delete()
            .eq("class_id", classId);

          for (const day of cls.days) {
            await supabase.from("class_schedule_days").insert({
              class_id: classId,
              day_of_week: day.dayOfWeek,
              start_time: day.startTime,
              end_time: day.endTime,
            });
          }
          log.push(
            `  ${cls.name} gunleri: ${cls.days.map((d) => DAY_NAMES[d.dayOfWeek]).join(", ")}`
          );
        }
      }

      const { data: freshClasses } = await supabase
        .from("classes")
        .select("*");
      const classLookup = new Map<string, string>();
      for (const c of freshClasses || []) {
        classLookup.set(c.name.toLowerCase(), c.id);
      }

      for (const sh of parsedData.subjectHours) {
        const classId = classLookup.get(sh.className.toLowerCase());
        const subjectId = subjectLookup.get(sh.subjectName.toLowerCase());
        if (!classId || !subjectId) continue;

        await supabase.from("class_subjects").upsert(
          {
            class_id: classId,
            subject_id: subjectId,
            weekly_hours: sh.weeklyHours,
          },
          { onConflict: "class_id,subject_id" }
        );
      }
      log.push(`${parsedData.subjectHours.length} ders-sinif iliskisi kaydedildi.`);

      setImported(true);
      setImportLog(log);
      await fetchDbData();
    } catch (err) {
      log.push(`Hata: ${(err as Error).message}`);
      setImportLog(log);
    } finally {
      setImporting(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setSaved(false);

    await fetchDbData();

    setTimeout(() => {
      const { data: freshTeachers } = { data: dbTeachers };
      const { data: freshSubjects } = { data: dbSubjects };
      const { data: freshClasses } = { data: dbClasses };
      const { data: freshScheduleDays } = { data: dbScheduleDays };
      const { data: freshClassSubjects } = { data: dbClassSubjects };

      const csInputs: ClassSubjectInput[] = (freshClassSubjects || []).map(
        (cs) => ({
          classId: cs.class_id,
          subjectId: cs.subject_id,
          subjectName:
            (cs.subject as unknown as Subject)?.name ||
            freshSubjects?.find((s) => s.id === cs.subject_id)?.name ||
            "",
          weeklyHours: cs.weekly_hours,
        })
      );

      const result = autoSchedule(
        freshClasses || [],
        freshScheduleDays || [],
        freshSubjects || [],
        freshTeachers || [],
        csInputs,
        rules
      );

      setScheduleResult(result);
      setGenerating(false);
      setTab("schedule");
    }, 100);
  };

  const handleSave = async () => {
    if (!scheduleResult) return;
    setSaving(true);

    try {
      const classIds = [
        ...new Set(scheduleResult.lessons.map((l) => l.classId)),
      ];
      for (const classId of classIds) {
        await supabase.from("lessons").delete().eq("class_id", classId);
      }

      const batchSize = 50;
      for (let i = 0; i < scheduleResult.lessons.length; i += batchSize) {
        const batch = scheduleResult.lessons.slice(i, i + batchSize).map((l) => ({
          class_id: l.classId,
          subject_id: l.subjectId,
          teacher_id: l.teacherId,
          day_of_week: l.dayOfWeek,
          start_time: l.startTime,
          end_time: l.endTime,
        }));
        await supabase.from("lessons").insert(batch);
      }

      setSaved(true);
    } catch (err) {
      alert("Kaydetme hatasi: " + (err as Error).message);
    } finally {
      setSaving(false);
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
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Otomatik Ders Dagitimi
      </h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(
          [
            ["import", "Ice Aktarma"],
            ["rules", "Kurallar"],
            ["schedule", "Program"],
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

      {tab === "import" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Excel Dosyasi Yukle
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Dosya Sec
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {parsedData && (
                <span className="text-sm text-green-600 font-medium">
                  Dosya basariyla okundu
                </span>
              )}
            </div>
          </div>

          {parsedData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="text-3xl font-bold text-blue-600">
                    {parsedData.teachers.length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Ogretmen</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="text-3xl font-bold text-green-600">
                    {parsedData.subjects.length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Ders</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="text-3xl font-bold text-purple-600">
                    {parsedData.classes.length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Sinif</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Ogretmenler
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500">
                          Ad Soyad
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Bransi
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Izin Gunleri
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.teachers.map((t, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-900">{t.name}</td>
                          <td className="py-2 px-3 text-gray-600">
                            {t.specialization}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex gap-1 flex-wrap">
                              {t.offDays.map((d) => (
                                <span
                                  key={d}
                                  className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded"
                                >
                                  {DAY_NAMES[d]}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Siniflar ve Ders Gunleri
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500">
                          Sinif
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Gunler
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Saatler
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.classes.map((c, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium text-gray-900">
                            {c.name}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex gap-1 flex-wrap">
                              {c.days.map((d, j) => (
                                <span
                                  key={j}
                                  className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded"
                                >
                                  {DAY_NAMES[d.dayOfWeek]}
                                </span>
                              ))}
                              {c.days.length === 0 && (
                                <span className="text-gray-400 text-xs italic">
                                  Belirlenmemis
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-gray-600 text-xs">
                            {c.days
                              .map(
                                (d) =>
                                  `${d.startTime}-${d.endTime}`
                              )
                              .filter((v, i, a) => a.indexOf(v) === i)
                              .join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Ders Dagilimlari ({parsedData.subjectHours.length} kayit)
                </h3>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500">
                          Ders
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Sinif
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Haftalik Saat
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.subjectHours.map((sh, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-1.5 px-3 text-gray-900">
                            {sh.subjectName}
                          </td>
                          <td className="py-1.5 px-3 text-gray-600">
                            {sh.className}
                          </td>
                          <td className="py-1.5 px-3 font-medium text-gray-900">
                            {sh.weeklyHours}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={importing || imported}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing
                    ? "Ice Aktariliyor..."
                    : imported
                      ? "Ice Aktarildi"
                      : "Veritabanina Aktar"}
                </button>
              </div>

              {importLog.length > 0 && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 max-h-64 overflow-y-auto">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Ice Aktarma Logu
                  </h4>
                  <div className="space-y-0.5">
                    {importLog.map((line, i) => (
                      <div key={i} className="text-xs text-gray-600 font-mono">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "rules" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Bolme Kurallari
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Haftalik ders saatine gore derslerin nasil bolunecegini belirleyin.
              &quot;+&quot; isaretiyle ayirin (ornek: 2+1)
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
              Kisitlamalar
            </h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.respectOffDays}
                  onChange={(e) =>
                    setRules((prev) => ({
                      ...prev,
                      respectOffDays: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Ogretmen izin gunu kontrolu
                  </div>
                  <div className="text-xs text-gray-500">
                    Ogretmenler izinli oldugu gun ders vermez
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.noDoubleBooking}
                  onChange={(e) =>
                    setRules((prev) => ({
                      ...prev,
                      noDoubleBooking: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Ogretmen cakisma kontrolu
                  </div>
                  <div className="text-xs text-gray-500">
                    Ayni ogretmen ayni saatte birden fazla sinifta ders vermez
                  </div>
                </div>
              </label>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || dbClassSubjects.length === 0}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Olusturuluyor..." : "Programi Olustur"}
          </button>
          {dbClassSubjects.length === 0 && (
            <p className="text-sm text-amber-600">
              Once Excel dosyasini ice aktarin.
            </p>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div className="space-y-6">
          {!scheduleResult && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                Henuz program olusturulmadi. Kurallar sekmesinden
                &quot;Programi Olustur&quot; tusuna basin.
              </p>
            </div>
          )}

          {scheduleResult && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="text-3xl font-bold text-green-600">
                    {scheduleResult.lessons.length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Yerlestirilen Ders
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="text-3xl font-bold text-red-600">
                    {scheduleResult.errors.length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Hata</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="text-3xl font-bold text-amber-600">
                    {scheduleResult.warnings.length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Uyari</div>
                </div>
              </div>

              {scheduleResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                  <h3 className="text-sm font-semibold text-red-800 mb-2">
                    Hatalar
                  </h3>
                  <div className="space-y-1">
                    {scheduleResult.errors.map((err, i) => (
                      <div key={i} className="text-xs text-red-700">
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Olusturulan Program
                </h3>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500">
                          Sinif
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Gun
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Saat
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Ders
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Ogretmen
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...scheduleResult.lessons]
                        .sort((a, b) => {
                          if (a.className !== b.className)
                            return a.className.localeCompare(b.className);
                          if (a.dayOfWeek !== b.dayOfWeek)
                            return a.dayOfWeek - b.dayOfWeek;
                          return a.startTime.localeCompare(b.startTime);
                        })
                        .map((l, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-1.5 px-3 font-medium text-gray-900">
                              {l.className}
                            </td>
                            <td className="py-1.5 px-3">
                              <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">
                                {DAY_NAMES[l.dayOfWeek]}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-gray-600 font-mono text-xs">
                              {l.startTime}-{l.endTime}
                            </td>
                            <td className="py-1.5 px-3 text-gray-900">
                              {l.subjectName}
                            </td>
                            <td className="py-1.5 px-3 text-gray-600">
                              {l.teacherName}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || saved || scheduleResult.lessons.length === 0}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving
                    ? "Kaydediliyor..."
                    : saved
                      ? "Kaydedildi"
                      : "Programi Kaydet"}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Yeniden Olustur
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
