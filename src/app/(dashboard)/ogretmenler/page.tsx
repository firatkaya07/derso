"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import SearchInput from "@/components/SearchInput";
import ErrorBanner from "@/components/ErrorBanner";
import { useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/components/Toast";
import { useOrganization } from "@/components/OrganizationProvider";
import { describeDbError, throwIfDbError } from "@/lib/db-error";
import type { Teacher, Subject, TeacherSubject } from "@/lib/types";
import { DAY_NAMES } from "@/lib/types";

interface ClassAssignment {
  class_id: string;
  subject_id: string;
  weekly_hours: number;
  teacher_id: string | null;
  class: { id: string; name: string } | null;
  subject: { id: string; name: string; short_name: string | null; color: string } | null;
}

interface TeachersData {
  teachers: Teacher[];
  subjects: Subject[];
  teacherSubjects: TeacherSubject[];
  classAssignments: ClassAssignment[];
}

const EMPTY_FORM = {
  name: "",
  specialization: "",
  phone: "",
  email: "",
  off_days: [] as number[],
};

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-gray-900";

export default function TeachersPage() {
  const supabase = createClient();
  const toast = useToast();
  const { organizationId } = useOrganization();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [assignmentDetail, setAssignmentDetail] = useState<Teacher | null>(null);

  const load = useCallback(async (): Promise<TeachersData> => {
    const [teacherResult, subjectResult, tsResult, csResult] = await Promise.all([
      supabase.from("teachers").select("*").order("name"),
      supabase.from("subjects").select("*").order("name"),
      supabase.from("teacher_subjects").select("*, subject:subjects(*)"),
      supabase
        .from("class_subjects")
        .select("class_id, subject_id, weekly_hours, teacher_id, class:classes(id, name), subject:subjects(id, name, short_name, color)")
        .not("teacher_id", "is", null),
    ]);
    throwIfDbError(teacherResult, "Öğretmenler okunamadı");
    throwIfDbError(subjectResult, "Dersler okunamadı");
    throwIfDbError(tsResult, "Öğretmen dersleri okunamadı");
    throwIfDbError(csResult, "Sınıf atamaları okunamadı");

    return {
      teachers: teacherResult.data ?? [],
      subjects: subjectResult.data ?? [],
      teacherSubjects: tsResult.data ?? [],
      classAssignments: (csResult.data ?? []) as unknown as ClassAssignment[],
    };
  }, [supabase]);

  const { data, error, loading, reload } = useAsyncData(load);
  const teachers = useMemo(() => data?.teachers ?? [], [data]);
  const subjects = useMemo(() => data?.subjects ?? [], [data]);
  const teacherSubjects = useMemo(() => data?.teacherSubjects ?? [], [data]);
  const classAssignments = useMemo(() => data?.classAssignments ?? [], [data]);

  const getTeacherSubjects = (teacherId: string) =>
    teacherSubjects
      .filter((ts) => ts.teacher_id === teacherId)
      .map((ts) => ts.subject as Subject)
      .filter(Boolean);

  const getTeacherAssignments = (teacherId: string) =>
    classAssignments
      .filter((ca) => ca.teacher_id === teacherId && ca.class && ca.subject)
      .sort((a, b) => (a.class!.name).localeCompare(b.class!.name, "tr"));

  const getTeacherTotalHours = (teacherId: string) =>
    classAssignments
      .filter((ca) => ca.teacher_id === teacherId)
      .reduce((sum, ca) => sum + ca.weekly_hours, 0);

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr");
    if (!query) return teachers;
    return teachers.filter((teacher) => {
      const subjectNames = getTeacherSubjects(teacher.id)
        .map((s) => s.name)
        .join(" ");
      const classNames = getTeacherAssignments(teacher.id)
        .map((ca) => ca.class!.name)
        .join(" ");
      const haystack =
        `${teacher.name} ${teacher.specialization ?? ""} ${teacher.phone ?? ""} ${teacher.email ?? ""} ${subjectNames} ${classNames}`.toLocaleLowerCase(
          "tr"
        );
      return haystack.includes(query);
    });
  }, [teachers, search, teacherSubjects, classAssignments]);

  const openCreate = () => {
    setEditingTeacher(null);
    setForm(EMPTY_FORM);
    setSelectedSubjectIds([]);
    setModalOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setForm({
      name: teacher.name,
      specialization: teacher.specialization || "",
      phone: teacher.phone || "",
      email: teacher.email || "",
      off_days: teacher.off_days || [],
    });
    setSelectedSubjectIds(
      teacherSubjects
        .filter((ts) => ts.teacher_id === teacher.id)
        .map((ts) => ts.subject_id)
    );
    setModalOpen(true);
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        specialization: form.specialization.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        off_days: form.off_days,
      };

      let teacherId: string;
      if (editingTeacher) {
        throwIfDbError(
          await supabase
            .from("teachers")
            .update(payload)
            .eq("id", editingTeacher.id),
          "Öğretmen güncellenemedi"
        );
        teacherId = editingTeacher.id;
      } else {
        const result = await supabase
          .from("teachers")
          .insert({ ...payload, organization_id: organizationId })
          .select("id")
          .single();
        throwIfDbError(result, "Öğretmen eklenemedi");
        teacherId = result.data!.id;
      }

      const current = teacherSubjects
        .filter((ts) => ts.teacher_id === teacherId)
        .map((ts) => ts.subject_id);
      const removed = current.filter((id) => !selectedSubjectIds.includes(id));
      const added = selectedSubjectIds.filter((id) => !current.includes(id));

      if (removed.length > 0) {
        throwIfDbError(
          await supabase
            .from("teacher_subjects")
            .delete()
            .eq("teacher_id", teacherId)
            .in("subject_id", removed),
          "Ders eşleşmeleri kaldırılamadı"
        );
      }
      if (added.length > 0) {
        throwIfDbError(
          await supabase.from("teacher_subjects").insert(
            added.map((subjectId) => ({
              organization_id: organizationId,
              teacher_id: teacherId,
              subject_id: subjectId,
            }))
          ),
          "Ders eşleşmeleri kaydedilemedi"
        );
      }

      setModalOpen(false);
      reload();
      toast.success(
        editingTeacher ? "Öğretmen güncellendi." : "Öğretmen eklendi."
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: deleteError } = await supabase
      .from("teachers")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (deleteError) {
      toast.error(
        deleteError.code === "23503"
          ? "Bu öğretmenin programa yerleşmiş dersleri var. Önce ilgili ders saatlerini kaldırın."
          : describeDbError(deleteError)
      );
      return;
    }
    setDeleteTarget(null);
    reload();
    toast.success("Öğretmen silindi.");
  };

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

  return (
    <div>
      <PageHeader
        title="Öğretmenler"
        description="Branş, verdiği dersler ve izin günlerini yönetin."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="bg-[var(--color-primary)] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-all duration-200 flex items-center gap-2 shadow-[0_2px_8px_rgba(99,102,241,0.2)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Öğretmen Ekle
          </button>
        }
      />

      {teachers.length > 0 && (
        <div className="mb-5 max-w-sm">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Ad, branş veya ders ara..."
          />
        </div>
      )}

      {teachers.length === 0 ? (
        <EmptyState
          title="Henüz öğretmen eklenmemiş"
          description="Dağıtım için öğretmenleri ve verdikleri dersleri tanımlayın."
          actionLabel="İlk öğretmeni ekle"
          onAction={openCreate}
          accentClassName="text-orange-600"
        />
      ) : filteredTeachers.length === 0 ? (
        <EmptyState
          title="Sonuç bulunamadı"
          description="Aramayla eşleşen öğretmen yok."
          secondaryLabel="Aramayı temizle"
          onSecondary={() => setSearch("")}
          accentClassName="text-orange-600"
        />
      ) : (
        <>
          {/* Mobil: kart listesi */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredTeachers.map((teacher) => {
              const tSubjects = getTeacherSubjects(teacher.id);
              return (
                <div
                  key={teacher.id}
                  className="bg-white rounded-2xl border border-[var(--color-border)] p-4 hover:border-[var(--color-primary-muted)] transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {teacher.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {teacher.specialization || "Branş belirtilmemiş"}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(teacher)}
                        className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] text-sm font-medium transition-colors duration-200"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(teacher)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {tSubjects.length === 0 ? (
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        Ders atanmamış
                      </span>
                    ) : (
                      tSubjects.map((subject) => (
                        <span
                          key={subject.id}
                          className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: subject.color }}
                        >
                          {subject.short_name || subject.name}
                        </span>
                      ))
                    )}
                  </div>
                  {teacher.off_days && teacher.off_days.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {teacher.off_days
                        .slice()
                        .sort((a, b) => a - b)
                        .map((day) => (
                          <span
                            key={day}
                            className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600"
                          >
                            {DAY_NAMES[day]}
                          </span>
                        ))}
                    </div>
                  )}
                  {(() => {
                    const assignments = getTeacherAssignments(teacher.id);
                    const totalHours = getTeacherTotalHours(teacher.id);
                    if (assignments.length === 0) return null;
                    const visible = assignments.slice(0, 4);
                    const rest = assignments.length - visible.length;
                    return (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-xs font-medium text-gray-500">Atandığı Sınıflar</div>
                          <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            Toplam {totalHours} saat
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {visible.map((ca) => (
                            <span
                              key={`${ca.class_id}-${ca.subject_id}`}
                              className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700"
                            >
                              {ca.class!.name} · {ca.subject!.short_name || ca.subject!.name} ({ca.weekly_hours}s)
                            </span>
                          ))}
                          {rest > 0 && (
                            <button
                              type="button"
                              onClick={() => setAssignmentDetail(teacher)}
                              className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              +{rest}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {(teacher.phone || teacher.email) && (
                    <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                      {teacher.phone && <div>{teacher.phone}</div>}
                      {teacher.email && <div>{teacher.email}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Masaüstü: tablo */}
          <div className="hidden md:block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ad Soyad
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Branş
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Verdiği Dersler
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Atandığı Sınıflar
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      İzin
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      İletişim
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTeachers.map((teacher) => {
                    const tSubjects = getTeacherSubjects(teacher.id);
                    const visibleSubjects = tSubjects.slice(0, 4);
                    const hiddenCount = tSubjects.length - visibleSubjects.length;
                    return (
                      <tr key={teacher.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">
                          {teacher.name}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {teacher.specialization || "—"}
                        </td>
                        <td className="px-5 py-4">
                          {tSubjects.length === 0 ? (
                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                              Ders atanmamış
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {visibleSubjects.map((subject) => (
                                <span
                                  key={subject.id}
                                  className="inline-flex text-xs px-2 py-0.5 rounded-full text-white"
                                  style={{ backgroundColor: subject.color }}
                                  title={subject.name}
                                >
                                  {subject.short_name || subject.name}
                                </span>
                              ))}
                              {hiddenCount > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  +{hiddenCount}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {(() => {
                            const assignments = getTeacherAssignments(teacher.id);
                            const totalHours = getTeacherTotalHours(teacher.id);
                            if (assignments.length === 0) {
                              return <span className="text-sm text-gray-400">—</span>;
                            }
                            const visible = assignments.slice(0, 4);
                            const rest = assignments.length - visible.length;
                            return (
                              <div>
                                <div className="flex flex-wrap gap-1">
                                  {visible.map((ca) => (
                                    <span
                                      key={`${ca.class_id}-${ca.subject_id}`}
                                      className="inline-flex text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700"
                                      title={`${ca.class!.name} - ${ca.subject!.name} (${ca.weekly_hours} saat)`}
                                    >
                                      {ca.class!.name} · {ca.subject!.short_name || ca.subject!.name} ({ca.weekly_hours}s)
                                    </span>
                                  ))}
                                  {rest > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setAssignmentDetail(teacher)}
                                      className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                                    >
                                      +{rest}
                                    </button>
                                  )}
                                </div>
                                <div className="text-xs font-medium text-gray-500 mt-1">
                                  Toplam {totalHours} saat
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-4">
                          {teacher.off_days && teacher.off_days.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {teacher.off_days
                                .slice()
                                .sort((a, b) => a - b)
                                .map((day) => (
                                  <span
                                    key={day}
                                    className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600"
                                  >
                                    {DAY_NAMES[day].slice(0, 3)}
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          <div className="space-y-0.5">
                            <div>{teacher.phone || "—"}</div>
                            {teacher.email && (
                              <div className="text-xs text-gray-400 truncate max-w-[180px]">
                                {teacher.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEdit(teacher)}
                            className="text-orange-600 hover:text-orange-800 text-sm font-medium mr-3"
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(teacher)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTeacher ? "Öğretmen Düzenle" : "Yeni Öğretmen"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Soyad *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branş
            </label>
            <input
              type="text"
              value={form.specialization}
              onChange={(e) =>
                setForm({ ...form, specialization: e.target.value })
              }
              className={inputClass}
              placeholder="Örnek: Matematik"
            />
            <p className="text-xs text-gray-400 mt-1">
              Bilgi amaçlıdır; dağıtımda aşağıda seçilen dersler kullanılır.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verdiği Dersler
            </label>
            {subjects.length === 0 ? (
              <p className="text-sm text-gray-500">
                Henüz ders tanımlanmamış.{" "}
                <Link href="/dersler" className="text-orange-600 hover:underline">
                  Dersler sayfasına gidin
                </Link>
                .
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-0.5">
                {subjects.map((subject) => {
                  const isSelected = selectedSubjectIds.includes(subject.id);
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => toggleSubject(subject.id)}
                      className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border-2 transition-all ${
                        isSelected
                          ? "text-white border-transparent"
                          : "text-gray-600 border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: subject.color,
                              borderColor: subject.color,
                            }
                          : undefined
                      }
                    >
                      {isSelected ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                      )}
                      {subject.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İzin Günleri
            </label>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((day, idx) => {
                const isOff = form.off_days.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        off_days: isOff
                          ? form.off_days.filter((d) => d !== idx)
                          : [...form.off_days, idx],
                      })
                    }
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      isOff
                        ? "bg-red-100 text-red-700 border-2 border-red-300"
                        : "bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Öğretmenin ders veremeyeceği günleri seçin.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-posta
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[var(--color-primary)] text-white py-2.5 rounded-xl font-semibold hover:bg-[var(--color-primary-hover)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Kaydediliyor..." : editingTeacher ? "Kaydet" : "Ekle"}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 bg-gray-100 text-[var(--color-text)] py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
            >
              İptal
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Öğretmeni sil"
        message={`"${deleteTarget?.name ?? ""}" öğretmenini silmek istediğinize emin misiniz?`}
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      {assignmentDetail && (() => {
        const assignments = getTeacherAssignments(assignmentDetail.id);
        const totalHours = getTeacherTotalHours(assignmentDetail.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAssignmentDetail(null)}>
            <div
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {assignmentDetail.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Atandığı Sınıflar · <span className="font-medium text-blue-700">{totalHours} saat</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignmentDetail(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto -mx-6 px-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Sınıf</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Ders</th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Saat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assignments.map((ca) => (
                      <tr key={`${ca.class_id}-${ca.subject_id}`}>
                        <td className="py-2.5 text-sm font-medium text-gray-900">{ca.class!.name}</td>
                        <td className="py-2.5">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: ca.subject!.color }}
                          >
                            {ca.subject!.name}
                          </span>
                        </td>
                        <td className="py-2.5 text-sm text-gray-700 text-right">{ca.weekly_hours}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={2} className="py-2.5 text-sm font-semibold text-gray-900">Toplam</td>
                      <td className="py-2.5 text-sm font-semibold text-blue-700 text-right">{totalHours} saat</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAssignmentDetail(null)}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
