"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import type { Teacher, Subject, TeacherSubject } from "@/lib/types";

export default function TeachersPage() {
  const supabase = createClient();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    const [{ data: teacherData }, { data: subjectData }, { data: tsData }] =
      await Promise.all([
        supabase.from("teachers").select("*").order("name"),
        supabase.from("subjects").select("*").order("name"),
        supabase
          .from("teacher_subjects")
          .select("*, subject:subjects(*)"),
      ]);
    setTeachers(teacherData || []);
    setSubjects(subjectData || []);
    setTeacherSubjects(tsData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTeacherSubjects = (teacherId: string) => {
    return teacherSubjects
      .filter((ts) => ts.teacher_id === teacherId)
      .map((ts) => ts.subject as Subject)
      .filter(Boolean);
  };

  const openCreate = () => {
    setEditingTeacher(null);
    setForm({ name: "", phone: "", email: "" });
    setSelectedSubjectIds([]);
    setModalOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setForm({
      name: teacher.name,
      phone: teacher.phone || "",
      email: teacher.email || "",
    });
    const currentSubjectIds = teacherSubjects
      .filter((ts) => ts.teacher_id === teacher.id)
      .map((ts) => ts.subject_id);
    setSelectedSubjectIds(currentSubjectIds);
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
    const data = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
    };

    let teacherId: string;

    if (editingTeacher) {
      await supabase
        .from("teachers")
        .update(data)
        .eq("id", editingTeacher.id);
      teacherId = editingTeacher.id;

      await supabase
        .from("teacher_subjects")
        .delete()
        .eq("teacher_id", teacherId);
    } else {
      const { data: inserted } = await supabase
        .from("teachers")
        .insert(data)
        .select("id")
        .single();
      if (!inserted) return;
      teacherId = inserted.id;
    }

    if (selectedSubjectIds.length > 0) {
      await supabase.from("teacher_subjects").insert(
        selectedSubjectIds.map((sid) => ({
          teacher_id: teacherId,
          subject_id: sid,
        }))
      );
    }

    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu ogretmeni silmek istediginize emin misiniz?")) return;
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) {
      alert("Bu ogretmenin atandigi dersler var, once dersleri kaldirin.");
      return;
    }
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ogretmenler</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Ogretmen Ekle
        </button>
      </div>

      {teachers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Henuz ogretmen eklenmemis.</p>
          <button
            onClick={openCreate}
            className="text-blue-600 hover:underline mt-2 text-sm"
          >
            Ilk ogretmeni ekleyin
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Ad Soyad
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Verdigi Dersler
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Telefon
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  E-posta
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Islemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {teachers.map((teacher) => {
                const tSubjects = getTeacherSubjects(teacher.id);
                return (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {teacher.name}
                    </td>
                    <td className="px-6 py-4">
                      {tSubjects.length === 0 ? (
                        <span className="text-sm text-gray-400">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {tSubjects.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: s.color }}
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {teacher.phone || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {teacher.email || "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEdit(teacher)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-4"
                      >
                        Duzenle
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id)}
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
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTeacher ? "Ogretmen Duzenle" : "Yeni Ogretmen"}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verdigi Dersler
            </label>
            {subjects.length === 0 ? (
              <p className="text-sm text-gray-400">
                Henuz ders tanimlanmamis.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
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
                          ? { backgroundColor: subject.color, borderColor: subject.color }
                          : undefined
                      }
                    >
                      {!isSelected && (
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                      )}
                      {isSelected && (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      {subject.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {editingTeacher ? "Kaydet" : "Ekle"}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Iptal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
