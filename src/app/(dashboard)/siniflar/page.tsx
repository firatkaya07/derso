"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import type { ClassGroup, ClassScheduleDay, ClassSubject, Subject, Teacher, TeacherSubject } from "@/lib/types";
import { DAY_NAMES, LEVELS, SUBGROUPS } from "@/lib/types";

export default function ClassesPage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [scheduleDays, setScheduleDays] = useState<ClassScheduleDay[]>([]);
  const [allClassSubjects, setAllClassSubjects] = useState<ClassSubject[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [form, setForm] = useState({ name: "", description: "", level: "", subgroup: "" });
  const [levelFilter, setLevelFilter] = useState<string>("Tümü");
  const [classSubjectEdits, setClassSubjectEdits] = useState<
    { id: string; subject_id: string; weekly_hours: number; teacher_id: string | null; subject?: Subject }[]
  >([]);
  const [dayConfigs, setDayConfigs] = useState<
    { day: number; enabled: boolean; startTime: string; endTime: string }[]
  >([]);

  const fetchData = useCallback(async () => {
    const [{ data: classData }, { data: scheduleData }, { data: csData }, { data: subjectData }, { data: teacherData }, { data: tsData }] =
      await Promise.all([
        supabase.from("classes").select("*").order("name"),
        supabase.from("class_schedule_days").select("*"),
        supabase.from("class_subjects").select("*, subject:subjects(*), teacher:teachers(*)"),
        supabase.from("subjects").select("*").order("name"),
        supabase.from("teachers").select("*").order("name"),
        supabase.from("teacher_subjects").select("*"),
      ]);
    setClasses(classData || []);
    setScheduleDays(scheduleData || []);
    setAllClassSubjects(csData || []);
    setSubjects(subjectData || []);
    setTeachers(teacherData || []);
    setTeacherSubjects(tsData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditingClass(null);
    setForm({ name: "", description: "", level: "", subgroup: "" });
    setClassSubjectEdits([]);
    setModalOpen(true);
  };

  const openEdit = (cls: ClassGroup) => {
    setEditingClass(cls);
    setForm({ name: cls.name, description: cls.description || "", level: cls.level || "", subgroup: cls.subgroup || "" });
    const csForClass = allClassSubjects
      .filter((cs) => cs.class_id === cls.id)
      .map((cs) => ({
        id: cs.id,
        subject_id: cs.subject_id,
        weekly_hours: cs.weekly_hours,
        teacher_id: cs.teacher_id,
        subject: cs.subject as Subject | undefined,
      }));
    csForClass.sort((a, b) => (a.subject?.name || "").localeCompare(b.subject?.name || ""));
    setClassSubjectEdits(csForClass);
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
    const data = {
      name: form.name,
      description: form.description || null,
      level: form.level || null,
      subgroup: form.subgroup || null,
    };

    let classId: string;

    if (editingClass) {
      await supabase.from("classes").update(data).eq("id", editingClass.id);
      classId = editingClass.id;

      for (const cs of classSubjectEdits) {
        await supabase
          .from("class_subjects")
          .update({ weekly_hours: cs.weekly_hours, teacher_id: cs.teacher_id })
          .eq("id", cs.id);
      }
    } else {
      const { data: inserted } = await supabase
        .from("classes")
        .insert(data)
        .select("id")
        .single();
      if (!inserted) return;
      classId = inserted.id;
    }

    if (form.level) {
      const matchingSubjects = subjects.filter((s) => {
        if (!s.level) return false;
        const subjectLevels = s.level.split(",").map((l) => l.trim());
        if (!subjectLevels.includes(form.level)) return false;
        if (form.subgroup && s.subgroups) {
          const subjectSubgroups = s.subgroups.split(",").map((sg) => sg.trim());
          return subjectSubgroups.includes(form.subgroup);
        }
        return true;
      });
      for (const sub of matchingSubjects) {
        await supabase
          .from("class_subjects")
          .upsert(
            { class_id: classId, subject_id: sub.id, weekly_hours: 0 },
            { onConflict: "class_id,subject_id", ignoreDuplicates: true }
          );
      }
    }

    setModalOpen(false);
    fetchData();
  };

  const handleSaveSchedule = async () => {
    if (!selectedClass) return;

    await supabase
      .from("class_schedule_days")
      .delete()
      .eq("class_id", selectedClass.id);

    const enabledDays = dayConfigs.filter((d) => d.enabled);
    if (enabledDays.length > 0) {
      await supabase.from("class_schedule_days").insert(
        enabledDays.map((d) => ({
          class_id: selectedClass.id,
          day_of_week: d.day,
          start_time: d.startTime,
          end_time: d.endTime,
        }))
      );
    }

    setScheduleModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu sınıfı ve tüm programını silmek istediğinize emin misiniz?"))
      return;
    await supabase.from("classes").delete().eq("id", id);
    fetchData();
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
    const totalHours = cs.reduce((sum, c) => sum + c.weekly_hours, 0);
    return { count: cs.length, totalHours };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  const totalEditHours = classSubjectEdits.reduce((sum, cs) => sum + cs.weekly_hours, 0);

  const filterTabs = ["Tümü", ...LEVELS];

  const filteredClasses =
    levelFilter === "Tümü"
      ? classes
      : classes.filter((c) => c.level === levelFilter);

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
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{cls.name}</h3>
            {cls.subgroup && (
              <span className="inline-block bg-purple-50 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full mt-1">
                {cls.subgroup}
              </span>
            )}
            {cls.description && (
              <p className="text-sm text-gray-500 mt-0.5">{cls.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openEdit(cls)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Düzenle
            </button>
            <button
              onClick={() => handleDelete(cls.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Sil
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-gray-500">
            {summary.count} ders · {summary.totalHours} saat/hafta
          </span>
        </div>

        {days.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Ders günü belirlenmemiş</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <span
                key={d.id}
                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {DAY_NAMES[d.day_of_week]}
                <span className="text-blue-500">
                  {d.start_time.slice(0, 5)}-{d.end_time.slice(0, 5)}
                </span>
              </span>
            ))}
          </div>
        )}

        <button
          onClick={() => openSchedule(cls)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Ders Günlerini Ayarla
        </button>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Sınıflar</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Sınıf Ekle
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <span className="text-sm text-gray-500 shrink-0 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Düzey:
        </span>
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setLevelFilter(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              levelFilter === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab === "Tümü" ? `Tümü (${classes.length})` : tab === "Mezun" ? "Mezun" : `${tab}. Sınıf`}
          </button>
        ))}
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Henüz sınıf eklenmemiş.</p>
          <button onClick={openCreate} className="text-blue-600 hover:underline mt-2 text-sm">
            İlk sınıfı ekleyin
          </button>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Bu düzeyde sınıf bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedGroups.map(({ level, subgroup, classes: groupClasses }) => (
            <div key={`${level}::${subgroup}`}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  {level === "Belirsiz" ? "Düzey Belirlenmemiş" : level === "Mezun" ? "Mezun" : `${level}. Sınıf`}
                  {subgroup && <span className="text-purple-600 ml-1">({subgroup})</span>}
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
        size={editingClass && classSubjectEdits.length > 0 ? "lg" : "md"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Düzey</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
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
                onChange={(e) => setForm({ ...form, subgroup: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                placeholder="Sabah grubu"
              />
            </div>
          </div>

          {editingClass && classSubjectEdits.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Sınıf Dersleri</h3>
                <span className="text-xs font-medium bg-green-50 text-green-700 px-3 py-1 rounded-full">
                  Toplam: {totalEditHours} saat
                </span>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Ders</th>
                      <th className="text-center px-4 py-2.5 font-medium text-gray-600 w-28">Saat</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Öğretmen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classSubjectEdits.map((cs, idx) => {
                      const subject = cs.subject;
                      return (
                        <tr key={cs.id} className="border-b border-gray-100 last:border-b-0">
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
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                              <option value="">- Yok -</option>
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

          {editingClass && classSubjectEdits.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              Bu sınıfa henüz ders atanmamış. Düzey seçerek otomatik atama yapabilirsiniz.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {editingClass ? "Güncelle" : "Ekle"}
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
        title={`${selectedClass?.name} - Ders Günleri`}
      >
        <div className="space-y-3">
          {dayConfigs.map((config, idx) => (
            <div
              key={config.day}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                config.enabled
                  ? "bg-blue-50 border-blue-200"
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
                className="w-4 h-4 text-blue-600 rounded"
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
              onClick={handleSaveSchedule}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Kaydet
            </button>
            <button
              onClick={() => setScheduleModalOpen(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
