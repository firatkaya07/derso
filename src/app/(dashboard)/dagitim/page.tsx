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
import {
  assignTeachersToSchedule,
  type AssignmentResult,
} from "@/lib/teacher-assignment";
import type {
  Teacher,
  Subject,
  ClassGroup,
  ClassScheduleDay,
  ClassSubject,
  TeacherSubject,
} from "@/lib/types";
import { DAY_NAMES, SUBJECT_COLORS } from "@/lib/types";

type Tab = "import" | "rules" | "schedule" | "atama";

export default function DagitimPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("import");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  const [rules, setRules] = useState<ScheduleRules>(DEFAULT_RULES);
  const [maxRetries, setMaxRetries] = useState(500);
  const [scheduleResult, setScheduleResult] = useState<{
    lessons: GeneratedLesson[];
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [attemptLogs, setAttemptLogs] = useState<
    { attempt: number; schedErrors: number; assignFailed: number; total: number; best: number }[]
  >([]);

  const [assignmentResult, setAssignmentResult] =
    useState<AssignmentResult | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentSaved, setAssignmentSaved] = useState(false);

  const [dbTeachers, setDbTeachers] = useState<Teacher[]>([]);
  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);
  const [dbClasses, setDbClasses] = useState<ClassGroup[]>([]);
  const [dbScheduleDays, setDbScheduleDays] = useState<ClassScheduleDay[]>([]);
  const [dbClassSubjects, setDbClassSubjects] = useState<ClassSubject[]>([]);
  const [dbTeacherSubjects, setDbTeacherSubjects] = useState<TeacherSubject[]>(
    []
  );

  const fetchDbData = useCallback(async () => {
    const [
      { data: teachers },
      { data: subjects },
      { data: classes },
      { data: scheduleDays },
      { data: classSubjects },
      { data: teacherSubjectsData },
    ] = await Promise.all([
      supabase.from("teachers").select("*").order("name"),
      supabase.from("subjects").select("*").order("name"),
      supabase.from("classes").select("*").order("name"),
      supabase.from("class_schedule_days").select("*"),
      supabase
        .from("class_subjects")
        .select("*, subject:subjects(*), teacher:teachers(*)"),
      supabase
        .from("teacher_subjects")
        .select("*, subject:subjects(*), teacher:teachers(*)"),
    ]);
    setDbTeachers(teachers || []);
    setDbSubjects(subjects || []);
    setDbClasses(classes || []);
    setDbScheduleDays(scheduleDays || []);
    setDbClassSubjects(classSubjects || []);
    setDbTeacherSubjects(teacherSubjectsData || []);
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
          log.push(`Öğretmen güncellendi: ${t.name}`);
        } else {
          await supabase.from("teachers").insert({
            name: t.name,
            off_days: t.offDays,
            specialization: t.specialization,
          });
          log.push(`Öğretmen eklendi: ${t.name}`);
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
          log.push(`Sınıf mevcut: ${cls.name}`);
        } else {
          const { data: newClass } = await supabase
            .from("classes")
            .insert({ name: cls.name })
            .select()
            .single();
          if (!newClass) continue;
          classId = newClass.id;
          log.push(`Sınıf eklendi: ${cls.name}`);
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
            `  ${cls.name} günleri: ${cls.days.map((d) => DAY_NAMES[d.dayOfWeek]).join(", ")}`
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
      log.push(`${parsedData.subjectHours.length} ders-sınıf ilişkisi kaydedildi.`);

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
    setAssignmentResult(null);
    setAttemptLogs([]);

    await fetchDbData();

    const csInputs: ClassSubjectInput[] = dbClassSubjects.map((cs) => ({
      classId: cs.class_id,
      subjectId: cs.subject_id,
      subjectName:
        (cs.subject as unknown as Subject)?.name ||
        dbSubjects.find((s) => s.id === cs.subject_id)?.name ||
        "",
      weeklyHours: cs.weekly_hours,
      teacherId: cs.teacher_id,
    }));

    const MAX_RETRIES = maxRetries;
    const SWAP_DEPTH = 30;
    let bestResult: {
      schedule: typeof scheduleResult;
      assignment: AssignmentResult;
      totalFailed: number;
    } | null = null;

    const BATCH_SIZE = 2;

    const runBatch = (startAttempt: number) => {
      setTimeout(() => {
        const batchLogs: typeof attemptLogs = [];
        const end = Math.min(startAttempt + BATCH_SIZE, MAX_RETRIES);
        let done = false;

        for (let attempt = startAttempt; attempt < end; attempt++) {
          const schedResult = autoSchedule(
            dbClasses,
            dbScheduleDays,
            dbSubjects,
            csInputs,
            rules,
            dbTeacherSubjects,
            dbTeachers,
            attempt,
            SWAP_DEPTH
          );

          const assignResult = assignTeachersToSchedule(
            schedResult.lessons,
            dbTeachers,
            dbTeacherSubjects,
            dbSubjects,
            dbClassSubjects
          );

          const totalFailed =
            schedResult.errors.length + assignResult.stats.failed;

          if (!bestResult || totalFailed < bestResult.totalFailed) {
            bestResult = {
              schedule: schedResult,
              assignment: assignResult,
              totalFailed,
            };
          }

          batchLogs.push({
            attempt: attempt + 1,
            schedErrors: schedResult.errors.length,
            assignFailed: assignResult.stats.failed,
            total: totalFailed,
            best: bestResult!.totalFailed,
          });

          if (totalFailed === 0) {
            done = true;
            break;
          }
        }

        setAttemptLogs((prev) => [...prev, ...batchLogs]);

        if (done || end >= MAX_RETRIES) {
          if (bestResult) {
            setScheduleResult({
              ...bestResult.schedule!,
              lessons: bestResult.assignment.lessons,
            });
            setAssignmentResult(bestResult.assignment);
          }
          setGenerating(false);
          setTab("schedule");
        } else {
          runBatch(end);
        }
      }, 50);
    };

    runBatch(0);
  };

  const handleAssign = async () => {
    if (!scheduleResult) return;
    setAssigning(true);
    setAssignmentSaved(false);
    await fetchDbData();

    setTimeout(() => {
      const result = assignTeachersToSchedule(
        scheduleResult.lessons,
        dbTeachers,
        dbTeacherSubjects,
        dbSubjects,
        dbClassSubjects
      );
      setAssignmentResult(result);
      setScheduleResult({
        ...scheduleResult,
        lessons: result.lessons,
      });
      setAssigning(false);
    }, 50);
  };

  const handleSaveAll = async () => {
    if (!assignmentResult) return;
    setSavingAssignment(true);

    try {
      const classIds = [
        ...new Set(assignmentResult.lessons.map((l) => l.classId)),
      ];
      for (const classId of classIds) {
        await supabase.from("lessons").delete().eq("class_id", classId);
      }

      const lessonsWithTeachers = assignmentResult.lessons.filter(
        (l) => l.teacherId
      );
      const batchSize = 50;
      for (let i = 0; i < lessonsWithTeachers.length; i += batchSize) {
        const batch = lessonsWithTeachers.slice(i, i + batchSize).map((l) => ({
          class_id: l.classId,
          subject_id: l.subjectId,
          teacher_id: l.teacherId,
          day_of_week: l.dayOfWeek,
          start_time: l.startTime,
          end_time: l.endTime,
        }));
        await supabase.from("lessons").insert(batch);
      }

      setAssignmentSaved(true);
    } catch (err) {
      alert("Kaydetme hatası: " + (err as Error).message);
    } finally {
      setSavingAssignment(false);
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Otomatik Ders Dağıtımı
      </h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(
          [
            ["import", "İçe Aktarma"],
            ["rules", "Kurallar"],
            ["schedule", "Ders Programı"],
            ["atama", "Öğretmen Atama"],
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

      {(generating || attemptLogs.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              {generating ? "Deneniyor..." : "Deneme Sonuçları"}
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500">
                Deneme: {attemptLogs.length}/{maxRetries}
              </span>
              {attemptLogs.length > 0 && (
                <span className="font-semibold text-green-600">
                  En iyi: {attemptLogs[attemptLogs.length - 1].best} hata
                </span>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${attemptLogs.length}%` }}
            />
          </div>
          <div className="max-h-48 overflow-y-auto text-xs font-mono space-y-0.5">
            {[...attemptLogs].reverse().map((log) => (
              <div
                key={log.attempt}
                className={`flex items-center gap-2 px-2 py-0.5 rounded ${
                  log.total === log.best
                    ? "bg-green-50 text-green-700"
                    : "text-gray-500"
                }`}
              >
                <span className="w-12">#{log.attempt}</span>
                <span className="w-28">Yerleştirme: {log.schedErrors}</span>
                <span className="w-24">Atama: {log.assignFailed}</span>
                <span className="w-20">Toplam: {log.total}</span>
                {log.total === log.best && (
                  <span className="text-green-600 font-semibold">★ En iyi</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "import" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Excel Dosyası Yükle
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
                Dosya Seç
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {parsedData && (
                <span className="text-sm text-green-600 font-medium">
                  Dosya başarıyla okundu
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
                  <div className="text-sm text-gray-500 mt-1">Öğretmen</div>
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
                  <div className="text-sm text-gray-500 mt-1">Sınıf</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Öğretmenler
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500">
                          Ad Soyad
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Branşı
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          İzin Günleri
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
                  Sınıflar ve Ders Günleri
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500">
                          Sınıf
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Günler
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
                                  Belirlenmemiş
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
                  Ders Dağılımları ({parsedData.subjectHours.length} kayıt)
                </h3>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500">
                          Ders
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Sınıf
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Haftalık Saat
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
                    ? "İçe Aktarılıyor..."
                    : imported
                      ? "İçe Aktarıldı"
                      : "Veritabanına Aktar"}
                </button>
              </div>

              {importLog.length > 0 && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 max-h-64 overflow-y-auto">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    İçe Aktarma Logu
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

      {tab === "atama" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Öğretmen Atama
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Oluşturulan ders programına göre öğretmen atar. İzin günlerini,
                  saat çakışmalarını ve eşli ders kurallarını (MATEMATİK 1/2,
                  TÜRKÇE/EDEBİYAT) kontrol eder.
                </p>
              </div>
              <button
                onClick={handleAssign}
                disabled={assigning || !scheduleResult}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {assigning ? "Atanıyor..." : "Otomatik Ata"}
              </button>
            </div>
            {!scheduleResult && (
              <p className="text-sm text-amber-600">
                Önce &quot;Ders Programı&quot; sekmesinden programı oluşturun.
              </p>
            )}
          </div>

          {assignmentResult && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="text-3xl font-bold text-blue-600">
                    {assignmentResult.stats.totalGroups}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Ders-Sınıf Grubu
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="text-3xl font-bold text-green-600">
                    {assignmentResult.stats.assigned}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Atanan</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="text-3xl font-bold text-red-600">
                    {assignmentResult.stats.failed}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Atanamayan</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="text-3xl font-bold text-purple-600">
                    {assignmentResult.stats.teacherLoads.length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Aktif Öğretmen
                  </div>
                </div>
              </div>

              {assignmentResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                  <h3 className="text-sm font-semibold text-red-800 mb-2">
                    Hatalar ({assignmentResult.errors.length})
                  </h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {assignmentResult.errors.map((err, i) => (
                      <div key={i} className="text-xs text-red-700">
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {assignmentResult.warnings.length > 0 && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2">
                    Uyarılar ({assignmentResult.warnings.length})
                  </h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {assignmentResult.warnings.map((w, i) => (
                      <div key={i} className="text-xs text-amber-700">
                        {w}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Öğretmen Yük Dağılımı
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {assignmentResult.stats.teacherLoads.map((tl) => (
                    <div
                      key={tl.teacherId}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {tl.teacherName}
                      </span>
                      <span className="text-sm font-bold text-purple-600">
                        {tl.totalHours} saat
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Atama Sonuçları
                </h3>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500">
                          Sınıf
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Gün
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Saat
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Ders
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Öğretmen
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...assignmentResult.lessons]
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
                              {l.teacherName || (
                                <span className="text-red-400 italic">
                                  Atanamadı
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveAll}
                  disabled={
                    savingAssignment ||
                    assignmentSaved ||
                    assignmentResult.stats.assigned === 0
                  }
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingAssignment
                    ? "Kaydediliyor..."
                    : assignmentSaved
                      ? "Kaydedildi"
                      : "Programı Kaydet"}
                </button>
                <button
                  onClick={handleAssign}
                  disabled={assigning}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Yeniden Ata
                </button>
              </div>
            </>
          )}
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
              &quot;+&quot; işaretiyle ayırın (örnek: 2+1)
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
              Deneme Sayısı
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Algoritma kaç farklı kombinasyon deneyecek. Daha fazla deneme daha
              iyi sonuç verebilir ancak daha uzun sürer.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min={1}
                max={2000}
                value={maxRetries}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1 && v <= 2000) setMaxRetries(v);
                }}
                className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              />
              <span className="text-xs text-gray-400">1 – 2000 arası</span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || dbClassSubjects.length === 0}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Oluşturuluyor..." : "Programı Oluştur"}
          </button>
          {dbClassSubjects.length === 0 && (
            <p className="text-sm text-amber-600">
              Önce Excel dosyasını içe aktarın.
            </p>
          )}

        </div>
      )}

      {tab === "schedule" && (
        <div className="space-y-6">
          {!scheduleResult && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                Henüz program oluşturulmadı. Kurallar sekmesinden
                &quot;Programı Oluştur&quot; tuşuna basın.
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
                    Yerleştirilen Ders
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
                  <div className="text-sm text-gray-500 mt-1">Uyarı</div>
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
                  Oluşturulan Program
                </h3>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500">
                          Sınıf
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Gün
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Saat
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Ders
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500">
                          Öğretmen
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
                              {l.teacherName || (
                                <span className="text-gray-300 italic">
                                  Henüz atanmadı
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <button
                  onClick={() => setTab("atama")}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
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
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  Öğretmen Ata
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Yeniden Oluştur
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
