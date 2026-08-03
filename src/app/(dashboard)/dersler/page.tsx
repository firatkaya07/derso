"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Modal from "@/components/Modal";
import { useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/components/Toast";
import { describeDbError, throwIfDbError } from "@/lib/db-error";
import type { Subject } from "@/lib/types";
import { SUBJECT_COLORS, LEVELS, LEVEL_PRESETS, SUBGROUPS } from "@/lib/types";

export default function SubjectsPage() {
  const supabase = createClient();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState({
    name: "",
    short_name: "",
    color: SUBJECT_COLORS[0],
    level: "",
    subgroups: "",
  });
  const [levelFilter, setLevelFilter] = useState<string>("Tümü");

  const loadSubjects = useCallback(async (): Promise<Subject[]> => {
    const result = await supabase.from("subjects").select("*").order("name");
    throwIfDbError(result, "Dersler okunamadı");
    return result.data ?? [];
  }, [supabase]);

  const {
    data,
    error,
    loading,
    reload: reloadSubjects,
  } = useAsyncData(loadSubjects);
  const subjects = useMemo(() => data ?? [], [data]);

  const openCreate = () => {
    setEditingSubject(null);
    const usedColors = subjects.map((s) => s.color);
    const nextColor =
      SUBJECT_COLORS.find((c) => !usedColors.includes(c)) || SUBJECT_COLORS[0];
    setForm({ name: "", short_name: "", color: nextColor, level: "", subgroups: "" });
    setModalOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      short_name: subject.short_name || "",
      color: subject.color,
      level: subject.level || "",
      subgroups: subject.subgroups || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const subjectLevels = form.level
      .split(",")
      .map((level) => level.trim())
      .filter(Boolean);
    const invalidLevels = subjectLevels.filter(
      (level) => !LEVELS.includes(level)
    );
    if (invalidLevels.length > 0) {
      toast.error(
        `Geçersiz seviye: ${invalidLevels.join(", ")}. Geçerli değerler: ${LEVELS.join(", ")}.`
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        short_name: form.short_name.trim() || null,
        color: form.color,
        level: subjectLevels.length > 0 ? subjectLevels.join(",") : null,
        subgroups: form.subgroups || null,
      };

      let subjectId: string;
      if (editingSubject) {
        const result = await supabase
          .from("subjects")
          .update(payload)
          .eq("id", editingSubject.id);
        throwIfDbError(result, "Ders güncellenemedi");
        subjectId = editingSubject.id;
      } else {
        const result = await supabase
          .from("subjects")
          .insert(payload)
          .select("id")
          .single();
        throwIfDbError(result, "Ders eklenemedi");
        subjectId = result.data!.id;
      }

      await syncClassSubjects(subjectId, subjectLevels);

      setModalOpen(false);
      reloadSubjects();
      toast.success(editingSubject ? "Ders güncellendi." : "Ders eklendi.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Dersi, seviyesi ve alanı uyan sınıfların müfredatına 0 saatle ekler.
   * Artık uymayan sınıflardan da kaldırır; ancak yalnızca saati 0 olan, yani
   * kullanıcının elle saat girmediği satırlar silinir.
   */
  const syncClassSubjects = async (
    subjectId: string,
    subjectLevels: string[]
  ) => {
    const subjectSubgroups = form.subgroups
      .split(",")
      .map((subgroup) => subgroup.trim())
      .filter(Boolean);

    const classResult = await supabase
      .from("classes")
      .select("id, level, subgroup");
    throwIfDbError(classResult, "Sınıflar okunamadı");

    const matchingIds = new Set(
      (classResult.data ?? [])
        .filter((cls) => {
          if (!cls.level || !subjectLevels.includes(cls.level)) return false;
          if (subjectSubgroups.length > 0 && cls.subgroup) {
            return subjectSubgroups.includes(cls.subgroup);
          }
          return true;
        })
        .map((cls) => cls.id)
    );

    const existingResult = await supabase
      .from("class_subjects")
      .select("id, class_id, weekly_hours")
      .eq("subject_id", subjectId);
    throwIfDbError(existingResult, "Sınıf dersleri okunamadı");

    const existing = existingResult.data ?? [];
    const existingClassIds = new Set(existing.map((cs) => cs.class_id));

    const toAdd = [...matchingIds]
      .filter((classId) => !existingClassIds.has(classId))
      .map((classId) => ({
        class_id: classId,
        subject_id: subjectId,
        weekly_hours: 0,
      }));

    if (toAdd.length > 0) {
      throwIfDbError(
        await supabase
          .from("class_subjects")
          .upsert(toAdd, {
            onConflict: "class_id,subject_id",
            ignoreDuplicates: true,
          }),
        "Ders sınıflara eklenemedi"
      );
    }

    const staleIds = existing
      .filter((cs) => !matchingIds.has(cs.class_id) && cs.weekly_hours === 0)
      .map((cs) => cs.id);

    if (staleIds.length > 0) {
      throwIfDbError(
        await supabase.from("class_subjects").delete().in("id", staleIds),
        "Eşleşmeyen sınıf dersleri kaldırılamadı"
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu dersi silmek istediğinize emin misiniz?")) return;
    const { error: deleteError } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id);
    if (deleteError) {
      toast.error(
        deleteError.code === "23503"
          ? "Bu ders programa yerleşmiş. Önce ilgili ders saatlerini kaldırın."
          : describeDbError(deleteError)
      );
      return;
    }
    reloadSubjects();
    toast.success("Ders silindi.");
  };

  const filteredSubjects =
    levelFilter === "Tümü"
      ? subjects
      : subjects.filter((s) => {
          if (!s.level) return false;
          const levels = s.level.split(",").map((l) => l.trim());
          return levels.includes(levelFilter);
        });

  const filterTabs = ["Tümü", ...LEVELS];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        {error.message}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Dersler</h1>
        </div>
        <button
          onClick={openCreate}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ders Ekle
        </button>
      </div>

      {/* Level Filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <span className="text-sm text-gray-500 shrink-0 flex items-center gap-1.5">
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
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Seviye Filtresi:
        </span>
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setLevelFilter(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              levelFilter === tab
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab === "Tümü"
              ? "Tümü"
              : tab === "Mezun"
                ? "Mezun"
                : `${tab}. Sınıf`}
          </button>
        ))}
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Henüz ders eklenmemiş.</p>
          <button
            onClick={openCreate}
            className="text-teal-600 hover:underline mt-2 text-sm"
          >
            İlk dersi ekleyin
          </button>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            Bu seviyede ders bulunamadı.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((subject) => (
            <div
              key={subject.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: subject.color }}
                  />
                  <div>
                    <span className="font-medium text-gray-900">
                      {subject.name}
                    </span>
                    {subject.short_name && (
                      <span className="ml-2 text-xs text-gray-400">
                        ({subject.short_name})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(subject)}
                    className="text-teal-600 hover:text-teal-800 text-sm"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Sil
                  </button>
                </div>
              </div>
              {(subject.level || subject.subgroups) && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {subject.level && subject.level.split(",").map((l) => (
                    <span
                      key={l}
                      className="inline-block bg-teal-50 text-teal-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      {l.trim() === "Mezun"
                        ? "Mezun"
                        : `${l.trim()}. Sınıf`}
                    </span>
                  ))}
                  {subject.subgroups && subject.subgroups.split(",").map((sg) => (
                    <span
                      key={sg}
                      className="inline-block bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      {sg.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubject ? "Ders Düzenle" : "Yeni Ders Ekle"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ders Adı *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-gray-900"
              placeholder="Örnek: Matematik"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kısa Adı
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.short_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    short_name: e.target.value.slice(0, 5),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-gray-900"
                placeholder="Örnek: Mat"
                maxLength={5}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {form.short_name.length}/5
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sınıf Seviyeleri
            </label>
            <input
              type="text"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-gray-900"
              placeholder="1,2,3,4,5,6,7,8,9,10,11,12"
            />
            <p className="text-xs text-gray-400 mt-1">
              Virgülle ayırarak girin (1-12 arası veya Mezun)
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {LEVEL_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setForm({ ...form, level: preset.levels })}
                  className="px-3 py-1 text-xs font-medium border border-teal-200 text-teal-600 rounded-full hover:bg-teal-50 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    level: form.level
                      ? form.level + ",Mezun"
                      : "Mezun",
                  })
                }
                className="px-3 py-1 text-xs font-medium border border-teal-200 text-teal-600 rounded-full hover:bg-teal-50 transition-colors"
              >
                + Mezun
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alt Gruplar
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBGROUPS.map((sg) => {
                const selected = form.subgroups.split(",").map((s) => s.trim()).filter(Boolean).includes(sg);
                return (
                  <button
                    key={sg}
                    type="button"
                    onClick={() => {
                      const current = form.subgroups.split(",").map((s) => s.trim()).filter(Boolean);
                      const next = selected ? current.filter((s) => s !== sg) : [...current, sg];
                      setForm({ ...form, subgroups: next.join(",") });
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      selected
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {sg}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Seçilmezse tüm alt gruplara atanır
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Renk
            </label>
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
              disabled={saving}
              className="flex-1 bg-teal-600 text-white py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Kaydediliyor..." : editingSubject ? "Kaydet" : "Ekle"}
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
    </div>
  );
}
