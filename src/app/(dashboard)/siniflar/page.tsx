"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import LevelFilter from "@/components/LevelFilter";
import SearchInput from "@/components/SearchInput";
import ErrorBanner from "@/components/ErrorBanner";
import { useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/components/Toast";
import { useOrganization } from "@/components/OrganizationProvider";
import { describeDbError, throwIfDbError } from "@/lib/db-error";
import type { ClassGroup, ClassScheduleDay, ClassSubject, Subject, Teacher, TeacherSubject } from "@/lib/types";
import { DAY_NAMES, LEVELS, SUBGROUPS } from "@/lib/types";

interface ClassesData {
  classes: ClassGroup[];
  scheduleDays: ClassScheduleDay[];
  classSubjects: ClassSubject[];
  subjects: Subject[];
  teachers: Teacher[];
  teacherSubjects: TeacherSubject[];
}

interface ClassSubjectEdit {
  id: string;
  subject_id: string;
  weekly_hours: number;
  teacher_id: string | null;
  subject?: Subject;
}

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900";

export default function ClassesPage() {
  const supabase = createClient();
  const toast = useToast();
  const { organizationId } = useOrganization();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassGroup | null>(null);
  const [form, setForm] = useState({ name: "", description: "", level: "", subgroup: "" });
  const [levelFilter, setLevelFilter] = useState<string>("Tümü");
  const [search, setSearch] = useState("");
  const [classSubjectEdits, setClassSubjectEdits] = useState<ClassSubjectEdit[]>(
    []
  );
  const [dayConfigs, setDayConfigs] = useState<
    { day: number; enabled: boolean; startTime: string; endTime: string }[]
  >([]);

  const load = useCallback(async (): Promise<ClassesData> => {
    const [
      classResult,
      dayResult,
      csResult,
      subjectResult,
      teacherResult,
      tsResult,
    ] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("class_schedule_days").select("*"),
      supabase
        .from("class_subjects")
        .select("*, subject:subjects(*), teacher:teachers(*)"),
      supabase.from("subjects").select("*").order("name"),
      supabase.from("teachers").select("*").order("name"),
      supabase.from("teacher_subjects").select("*"),
    ]);
    throwIfDbError(classResult, "Sınıflar okunamadı");
    throwIfDbError(dayResult, "Ders günleri okunamadı");
    throwIfDbError(csResult, "Sınıf dersleri okunamadı");
    throwIfDbError(subjectResult, "Dersler okunamadı");
    throwIfDbError(teacherResult, "Öğretmenler okunamadı");
    throwIfDbError(tsResult, "Öğretmen dersleri okunamadı");

    return {
      classes: classResult.data ?? [],
      scheduleDays: dayResult.data ?? [],
      classSubjects: csResult.data ?? [],
      subjects: subjectResult.data ?? [],
      teachers: teacherResult.data ?? [],
      teacherSubjects: tsResult.data ?? [],
    };
  }, [supabase]);

  const { data, error, loading, reload } = useAsyncData(load);
  const classes = useMemo(() => data?.classes ?? [], [data]);
  const scheduleDays = useMemo(() => data?.scheduleDays ?? [], [data]);
  const allClassSubjects = useMemo(() => data?.classSubjects ?? [], [data]);
  const subjects = useMemo(() => data?.subjects ?? [], [data]);
  const teachers = useMemo(() => data?.teachers ?? [], [data]);
  const teacherSubjects = useMemo(() => data?.teacherSubjects ?? [], [data]);

  const openCreate = () => {
    setEditingClass(null);
    setForm({ name: "", description: "", level: "", subgroup: "" });
    setClassSubjectEdits([]);
    setModalOpen(true);
  };

  const getMatchingSubjects = (level: string, subgroup: string) => {
    if (!level) return [];
    return subjects.filter((s) => {
      if (!s.level) return false;
      const subjectLevels = s.level.split(",").map((l) => l.trim());
      if (!subjectLevels.includes(level)) return false;
      if (subgroup && s.subgroups) {
        const subjectSubgroups = s.subgroups.split(",").map((sg) => sg.trim());
        return subjectSubgroups.includes(subgroup);
      }
      return true;
    });
  };

  const buildClassSubjectEdits = (classId: string | null, level: string, subgroup: string) => {
    const matching = getMatchingSubjects(level, subgroup);
    const existingCS = classId ? allClassSubjects.filter((cs) => cs.class_id === classId) : [];
    const edits = matching.map((sub) => {
      const existing = existingCS.find((cs) => cs.subject_id === sub.id);
      return {
        id: existing?.id || "",
        subject_id: sub.id,
        weekly_hours: existing?.weekly_hours || 0,
        teacher_id: existing?.teacher_id || null,
        subject: sub,
      };
    });
    edits.sort((a, b) => (a.subject?.name || "").localeCompare(b.subject?.name || ""));
    return edits;
  };

  const openEdit = (cls: ClassGroup) => {
    setEditingClass(cls);
    setForm({ name: cls.name, description: cls.description || "", level: cls.level || "", subgroup: cls.subgroup || "" });
    setClassSubjectEdits(buildClassSubjectEdits(cls.id, cls.level || "", cls.subgroup || ""));
    setModalOpen(true);
  };

  const openSchedule = (cls: ClassGroup) => {
    setSelectedClass(cls);
    const classDays = scheduleDays.filter((d) => d.class_id === cls.id);
    const configs = Array.from({ length: 7 }, (_, i) => {
      const existing = classDays.find((d) => d.day_of_week === i);
      return {
        day: i,
        enabled: !!existing,
        startTime: existing?.start_time?.slice(0, 5) || "09:00",
        endTime: existing?.end_time?.slice(0, 5) || "13:00",
      };
    });
    setDayConfigs(configs);
    setScheduleModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        level: form.level || null,
        subgroup: form.subgroup || null,
      };

      let classId: string;
      if (editingClass) {
        throwIfDbError(
          await supabase
            .from("classes")
            .update(payload)
            .eq("id", editingClass.id),
          "Sınıf güncellenemedi"
        );
        classId = editingClass.id;
      } else {
        const result = await supabase
          .from("classes")
          .insert({ ...payload, organization_id: organizationId })
          .select("id")
          .single();
        throwIfDbError(result, "Sınıf eklenemedi");
        classId = result.data!.id;
      }

      if (classSubjectEdits.length > 0) {
        throwIfDbError(
          await supabase.from("class_subjects").upsert(
            classSubjectEdits.map((cs) => ({
              organization_id: organizationId,
              class_id: classId,
              subject_id: cs.subject_id,
              weekly_hours: cs.weekly_hours,
              teacher_id: cs.teacher_id,
            })),
            { onConflict: "class_id,subject_id" }
          ),
          "Sınıf dersleri kaydedilemedi"
        );
      }

      // Seviye/alan değişince listeden düşen dersleri temizle. Saati girilmiş
      // dersler korunur; kullanıcı emeğini sessizce silmemek gerekir.
      const keptSubjectIds = new Set(
        classSubjectEdits.map((cs) => cs.subject_id)
      );
      const staleIds = allClassSubjects
        .filter(
          (cs) =>
            cs.class_id === classId &&
            !keptSubjectIds.has(cs.subject_id) &&
            cs.weekly_hours === 0
        )
        .map((cs) => cs.id);

      if (staleIds.length > 0) {
        throwIfDbError(
          await supabase.from("class_subjects").delete().in("id", staleIds),
          "Eşleşmeyen dersler kaldırılamadı"
        );
      }

      setModalOpen(false);
      reload();
      toast.success(editingClass ? "Sınıf güncellendi." : "Sınıf eklendi.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!selectedClass) return;

    const enabledDays = dayConfigs.filter((day) => day.enabled);
    const invalid = enabledDays.find((day) => day.endTime <= day.startTime);
    if (invalid) {
      toast.error(
        `${DAY_NAMES[invalid.day]}: bitiş saati başlangıç saatinden sonra olmalı.`
      );
      return;
    }

    setSaving(true);
    try {
      throwIfDbError(
        await supabase
          .from("class_schedule_days")
          .delete()
          .eq("class_id", selectedClass.id),
        "Mevcut ders günleri temizlenemedi"
      );

      if (enabledDays.length > 0) {
        throwIfDbError(
          await supabase.from("class_schedule_days").insert(
            enabledDays.map((day) => ({
              organization_id: organizationId,
              class_id: selectedClass.id,
              day_of_week: day.day,
              start_time: day.startTime,
              end_time: day.endTime,
            }))
          ),
          "Ders günleri kaydedilemedi"
        );
      }

      setScheduleModalOpen(false);
      reload();
      toast.success("Ders günleri kaydedildi.");
    } catch (err) {
      toast.error((err as Error).message);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: deleteError } = await supabase
      .from("classes")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (deleteError) {
      toast.error(describeDbError(deleteError));
      return;
    }
    setDeleteTarget(null);
    reload();
    toast.success("Sınıf silindi.");
  };

  const getTeachersForSubject = (subjectId: string) => {
    const teacherIds = teacherSubjects
      .filter((ts) => ts.subject_id === subjectId)
      .map((ts) => ts.teacher_id);
    return teachers.filter((t) => teacherIds.includes(t.id));
  };

  const updateClassSubject = (index: number, field: "weekly_hours" | "teacher_id", value: number | string | null) => {
    setClassSubjectEdits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const getClassDays = (classId: string) => {
    return scheduleDays
      .filter((d) => d.class_id === classId)
      .sort((a, b) => a.day_of_week - b.day_of_week);
  };

  const getClassSubjectSummary = (classId: string) => {
    const cs = allClassSubjects.filter((c) => c.class_id === classId);
    const withHours = cs.filter((c) => c.weekly_hours > 0);
    const totalHours = cs.reduce((sum, c) => sum + c.weekly_hours, 0);
    const assignedTeachers = withHours.filter((c) => c.teacher_id).length;
    return {
      count: withHours.length,
      totalHours,
      assignedTeachers,
      missingTeachers: withHours.length - assignedTeachers,
    };
  };

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { Tümü: classes.length };
    for (const level of LEVELS) counts[level] = 0;
    for (const cls of classes) {
      if (cls.level && counts[cls.level] !== undefined) counts[cls.level] += 1;
    }
    return counts;
  }, [classes]);

  const filteredClasses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr");
    return classes.filter((cls) => {
      if (levelFilter !== "Tümü" && cls.level !== levelFilter) return false;
      if (!query) return true;
      const haystack =
        `${cls.name} ${cls.description ?? ""} ${cls.subgroup ?? ""}`.toLocaleLowerCase(
          "tr"
        );
      return haystack.includes(query);
    });
  }, [classes, levelFilter, search]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error.message} onRetry={reload} />;
  }

  const totalEditHours = classSubjectEdits.reduce((sum, cs) => sum + cs.weekly_hours, 0);

  const groupedByLevelSubgroup = filteredClasses.reduce<Record<string, ClassGroup[]>>((acc, cls) => {
    const levelKey = cls.level || "Belirsiz";
    const subgroupKey = cls.subgroup || "";
    const key = subgroupKey ? `${levelKey}::${subgroupKey}` : levelKey;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cls);
    return acc;
  }, {});

  const levelOrder = [...LEVELS, "Belirsiz"];
  const sortedGroups: { level: string; subgroup: string; classes: ClassGroup[] }[] = [];
  for (const level of levelOrder) {
    const keys = Object.keys(groupedByLevelSubgroup)
      .filter((k) => k === level || k.startsWith(level + "::"))
      .sort((a, b) => {
        const sgA = a.includes("::") ? a.split("::")[1] : "";
        const sgB = b.includes("::") ? b.split("::")[1] : "";
        if (!sgA && sgB) return -1;
        if (sgA && !sgB) return 1;
        return SUBGROUPS.indexOf(sgA) - SUBGROUPS.indexOf(sgB);
      });
    for (const key of keys) {
      const subgroup = key.includes("::") ? key.split("::")[1] : "";
      sortedGroups.push({ level, subgroup, classes: groupedByLevelSubgroup[key] });
    }
  }

  const renderClassCard = (cls: ClassGroup) => {
    const days = getClassDays(cls.id);
    const summary = getClassSubjectSummary(cls.id);
    return (
      <div
        key={cls.id}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-green-200 transition-colors"
      >
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-base truncate">{cls.name}</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              {cls.subgroup && (
                <span className="inline-block bg-violet-50 text-violet-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {cls.subgroup}
                </span>
              )}
            </div>
            {cls.description && (
              <p className="text-sm text-gray-500 mt-1">{cls.description}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openEdit(cls)}
              className="text-green-700 hover:text-green-900 text-sm font-medium"
            >
              Düzenle
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(cls)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Sil
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-gray-500">
          <span className="bg-gray-50 px-2 py-0.5 rounded-full">
            {summary.count} ders · {summary.totalHours} saat/hafta
          </span>
          {summary.missingTeachers > 0 && (
            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
              {summary.missingTeachers} derste öğretmen yok
            </span>
          )}
        </div>

        {days.length === 0 ? (
          <button
            type="button"
            onClick={() => openSchedule(cls)}
            className="w-full text-left text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors"
          >
            Ders günü belirlenmemiş — ayarlamak için tıklayın
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <span
                key={d.id}
                className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {DAY_NAMES[d.day_of_week]}
                <span className="text-green-600/80">
                  {d.start_time.slice(0, 5)}-{d.end_time.slice(0, 5)}
                </span>
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => openSchedule(cls)}
          className="mt-3 text-sm text-green-700 hover:text-green-900 font-medium"
        >
          Ders günlerini ayarla
        </button>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Sınıflar"
        description="Şubeleri, ders saatlerini ve öğretmen atamalarını yönetin."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Sınıf Ekle
          </button>
        }
      />

      <div className="flex flex-col gap-3 mb-5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Şube adı veya açıklama ara..."
          className="max-w-sm"
        />
        <LevelFilter
          value={levelFilter}
          onChange={setLevelFilter}
          counts={levelCounts}
          activeClassName="bg-green-600 text-white"
        />
      </div>

      {classes.length === 0 ? (
        <EmptyState
          title="Henüz sınıf eklenmemiş"
          description="Şubeleri oluşturup ders günlerini ve öğretmen atamalarını tanımlayın."
          actionLabel="İlk sınıfı ekle"
          onAction={openCreate}
          accentClassName="text-green-700"
        />
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          title="Sonuç bulunamadı"
          description="Arama veya seviye filtresiyle eşleşen sınıf yok."
          secondaryLabel="Filtreleri temizle"
          onSecondary={() => {
            setSearch("");
            setLevelFilter("Tümü");
          }}
          accentClassName="text-green-700"
        />
      ) : (
        <div className="space-y-8">
          {sortedGroups.map(({ level, subgroup, classes: groupClasses }) => (
            <div key={`${level}::${subgroup}`}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-semibold text-gray-800">
                  {level === "Belirsiz" ? "Seviye belirlenmemiş" : level === "Mezun" ? "Mezun" : `${level}. Sınıf`}
                  {subgroup && <span className="text-violet-600 ml-1">({subgroup})</span>}
                </h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {groupClasses.length} şube
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {groupClasses.map(renderClassCard)}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClass ? "Sınıf Düzenle" : "Yeni Sınıf"}
        size={classSubjectEdits.length > 0 ? "xl" : "md"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seviye</label>
              <select
                value={form.level}
                onChange={(e) => {
                  const newLevel = e.target.value;
                  setForm((f) => ({ ...f, level: newLevel }));
                  setClassSubjectEdits(buildClassSubjectEdits(editingClass?.id || null, newLevel, form.subgroup));
                }}
                className={inputClass}
              >
                <option value="">Seçilmedi</option>
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level === "Mezun" ? "Mezun" : `${level}. Sınıf`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alt Grup</label>
              <select
                value={form.subgroup}
                onChange={(e) => {
                  const newSubgroup = e.target.value;
                  setForm((f) => ({ ...f, subgroup: newSubgroup }));
                  setClassSubjectEdits(buildClassSubjectEdits(editingClass?.id || null, form.level, newSubgroup));
                }}
                className={inputClass}
              >
                <option value="">Seçilmedi</option>
                {SUBGROUPS.map((sg) => (
                  <option key={sg} value={sg}>{sg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şube Adı *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="Örnek: 12-A"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputClass}
                placeholder="Sabah grubu"
              />
            </div>
          </div>

          {classSubjectEdits.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-white z-[1] py-1">
                <h3 className="text-sm font-semibold text-gray-900">Sınıf Dersleri</h3>
                <span className="text-xs font-medium bg-green-50 text-green-700 px-3 py-1 rounded-full">
                  Toplam: {totalEditHours} saat
                </span>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Ders</th>
                      <th className="text-center px-4 py-2.5 font-medium text-gray-600 w-28">Saat</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Öğretmen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classSubjectEdits.map((cs, idx) => {
                      const subject = cs.subject;
                      return (
                        <tr
                          key={cs.subject_id}
                          className="border-b border-gray-100 last:border-b-0"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-1 h-8 rounded-full shrink-0"
                                style={{ backgroundColor: subject?.color || "#3B82F6" }}
                              />
                              <div>
                                <div className="font-medium text-gray-900">{subject?.name}</div>
                                {subject?.short_name && (
                                  <div className="text-xs text-gray-400">{subject.short_name}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateClassSubject(idx, "weekly_hours", Math.max(0, cs.weekly_hours - 1))
                                }
                                className="w-7 h-7 rounded-full border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                              <span className="w-8 text-center font-semibold text-gray-900">{cs.weekly_hours}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateClassSubject(idx, "weekly_hours", cs.weekly_hours + 1)
                                }
                                className="w-7 h-7 rounded-full border border-green-200 text-green-600 hover:bg-green-50 flex items-center justify-center transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={cs.teacher_id || ""}
                              onChange={(e) =>
                                updateClassSubject(idx, "teacher_id", e.target.value || null)
                              }
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                            >
                              <option value="">Atanmamış</option>
                              {getTeachersForSubject(cs.subject_id).map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {classSubjectEdits.length === 0 && form.level && (
            <p className="text-sm text-gray-500">
              Bu seviyede tanımlı ders yok.{" "}
              <Link href="/dersler" className="text-green-700 hover:underline">
                Dersler sayfasından
              </Link>{" "}
              seviye atayın.
            </p>
          )}
          {classSubjectEdits.length === 0 && !form.level && (
            <p className="text-sm text-gray-500">
              Seviye seçerek eşleşen dersleri görebilirsiniz.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Kaydediliyor..." : editingClass ? "Kaydet" : "Ekle"}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={`${selectedClass?.name ?? ""} — Ders Günleri`}
      >
        <div className="space-y-3">
          {dayConfigs.map((config, idx) => (
            <div
              key={config.day}
              className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border transition-colors ${
                config.enabled
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => {
                  const updated = [...dayConfigs];
                  updated[idx] = { ...config, enabled: e.target.checked };
                  setDayConfigs(updated);
                }}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="w-24 text-sm font-medium text-gray-700">
                {DAY_NAMES[config.day]}
              </span>
              {config.enabled && (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    value={config.startTime}
                    onChange={(e) => {
                      const updated = [...dayConfigs];
                      updated[idx] = { ...config, startTime: e.target.value };
                      setDayConfigs(updated);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-gray-900"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="time"
                    value={config.endTime}
                    onChange={(e) => {
                      const updated = [...dayConfigs];
                      updated[idx] = { ...config, endTime: e.target.value };
                      setDayConfigs(updated);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-gray-900"
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={() => void handleSaveSchedule()}
              disabled={saving}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={() => setScheduleModalOpen(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Sınıfı sil"
        message={`“${deleteTarget?.name ?? ""}” sınıfını ve programını silmek istediğinize emin misiniz?`}
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
