"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import type { Subject } from "@/lib/types";
import { SUBJECT_COLORS } from "@/lib/types";

export default function SubjectsPage() {
  const supabase = createClient();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: "", color: SUBJECT_COLORS[0] });

  const fetchSubjects = useCallback(async () => {
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .order("name");
    setSubjects(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const openCreate = () => {
    setEditingSubject(null);
    const usedColors = subjects.map((s) => s.color);
    const nextColor = SUBJECT_COLORS.find((c) => !usedColors.includes(c)) || SUBJECT_COLORS[0];
    setForm({ name: "", color: nextColor });
    setModalOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setForm({ name: subject.name, color: subject.color });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubject) {
      await supabase.from("subjects").update(form).eq("id", editingSubject.id);
    } else {
      await supabase.from("subjects").insert(form);
    }
    setModalOpen(false);
    fetchSubjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu dersi silmek istediginize emin misiniz?")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) {
      alert("Bu ders programa atanmis, once programdan kaldirin.");
      return;
    }
    fetchSubjects();
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dersler</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ders Ekle
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Henuz ders eklenmemis.</p>
          <button onClick={openCreate} className="text-blue-600 hover:underline mt-2 text-sm">
            Ilk dersi ekleyin
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: subject.color }}
                />
                <span className="font-medium text-gray-900">{subject.name}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(subject)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Duzenle
                </button>
                <button
                  onClick={() => handleDelete(subject.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubject ? "Ders Duzenle" : "Yeni Ders"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ders Adi *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              placeholder="Ornek: Matematik"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Renk</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    form.color === color
                      ? "border-gray-900 scale-110"
                      : "border-transparent hover:border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {editingSubject ? "Kaydet" : "Ekle"}
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
