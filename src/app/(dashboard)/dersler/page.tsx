"use client";

import { useCallback, useMemo, useState } from "react";
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
import type { Subject } from "@/lib/types";
import { SUBJECT_COLORS, LEVELS, LEVEL_PRESETS, SUBGROUPS } from "@/lib/types";

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function levelChipLabel(level: string): string {
  return level === "Mezun" ? "Mezun" : `${level}. Sınıf`;
}

export default function SubjectsPage() {
  const supabase = createClient();
  const toast = useToast();
  const { organizationId } = useOrganization();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [form, setForm] = useState({
    name: "",
    short_name: "",
    color: SUBJECT_COLORS[0],
    levels: [] as string[],
    subgroups: [] as string[],
  });
  const [levelFilter, setLevelFilter] = useState("Tümü");
  const [search, setSearch] = useState("");

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

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { Tümü: subjects.length };
    for (const level of LEVELS) counts[level] = 0;
    for (const subject of subjects) {
      for (const level of parseCsv(subject.level ?? "")) {
        if (counts[level] !== undefined) counts[level] += 1;
      }
    }
    return counts;
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr");
    return subjects.filter((subject) => {
      if (levelFilter !== "Tümü") {
        const levels = parseCsv(subject.level ?? "");
        if (!levels.includes(levelFilter)) return false;
      }
      if (!query) return true;
      const haystack = `${subject.name} ${subject.short_name ?? ""}`.toLocaleLowerCase("tr");
      return haystack.includes(query);
    });
  }, [subjects, levelFilter, search]);

  const openCreate = () => {
    setEditingSubject(null);
    const usedColors = subjects.map((s) => s.color);
    const nextColor =
      SUBJECT_COLORS.find((c) => !usedColors.includes(c)) || SUBJECT_COLORS[0];
    setForm({
      name: "",
      short_name: "",
      color: nextColor,
      levels: [],
      subgroups: [],
    });
    setModalOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      short_name: subject.short_name || "",
      color: subject.color,
      levels: parseCsv(subject.level ?? ""),
      subgroups: parseCsv(subject.subgroups ?? ""),
    });
    setModalOpen(true);
  };

  const toggleLevel = (level: string) => {
    setForm((current) => ({
      ...current,
      levels: current.levels.includes(level)
        ? current.levels.filter((item) => item !== level)
        : [...current.levels, level],
    }));
  };

  const toggleSubgroup = (subgroup: string) => {
    setForm((current) => ({
      ...current,
      subgroups: current.subgroups.includes(subgroup)
        ? current.subgroups.filter((item) => item !== subgroup)
        : [...current.subgroups, subgroup],
    }));
  };

  const syncClassSubjects = async (
    subjectId: string,
    subjectLevels: string[]
  ) => {
    const classResult = await supabase
      .from("classes")
      .select("id, level, subgroup");
    throwIfDbError(classResult, "Sınıflar okunamadı");

    const matchingIds = new Set(
      (classResult.data ?? [])
        .filter((cls) => {
          if (!cls.level || !subjectLevels.includes(cls.level)) return false;
          if (form.subgroups.length > 0 && cls.subgroup) {
            return form.subgroups.includes(cls.subgroup);
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
        organization_id: organizationId,
        class_id: classId,
        subject_id: subjectId,
        weekly_hours: 0,
      }));

    if (toAdd.length > 0) {
      throwIfDbError(
        await supabase.from("class_subjects").upsert(toAdd, {
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

    return { added: toAdd.length, removed: staleIds.length };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        short_name: form.short_name.trim() || null,
        color: form.color,
        level: form.levels.length > 0 ? form.levels.join(",") : null,
        subgroups: form.subgroups.length > 0 ? form.subgroups.join(",") : null,
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
          .insert({ ...payload, organization_id: organizationId })
          .select("id")
          .single();
        throwIfDbError(result, "Ders eklenemedi");
        subjectId = result.data!.id;
      }

      const sync = await syncClassSubjects(subjectId, form.levels);
      setModalOpen(false);
      reloadSubjects();

      const syncNote =
        sync.added > 0
          ? ` ${sync.added} sınıfa bağlandı.`
          : sync.removed > 0
            ? ` ${sync.removed} eşleşmeyen bağlantı kaldırıldı.`
            : "";
      toast.success(
        (editingSubject ? "Ders güncellendi." : "Ders eklendi.") + syncNote
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
      .from("subjects")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (deleteError) {
      toast.error(
        deleteError.code === "23503"
          ? "Bu ders programa yerleşmiş. Önce ilgili ders saatlerini kaldırın."
          : describeDbError(deleteError)
      );
      return;
    }
    setDeleteTarget(null);
    reloadSubjects();
    toast.success("Ders silindi.");
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error.message} onRetry={reloadSubjects} />;
  }

  return (
    <div>
      <PageHeader
        title="Dersler"
        description="Müfredat derslerini, seviyelerini ve renklerini yönetin."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ders Ekle
          </button>
        }
      />

      <div className="flex flex-col gap-3 mb-5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Ders adı veya kısa ad ara..."
          className="max-w-sm"
        />
        <LevelFilter
          value={levelFilter}
          onChange={setLevelFilter}
          counts={levelCounts}
        />
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          title="Henüz ders eklenmemiş"
          description="Dağıtıma başlamadan önce müfredat derslerini tanımlayın."
          actionLabel="İlk dersi ekle"
          onAction={openCreate}
        />
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          title="Sonuç bulunamadı"
          description="Arama veya seviye filtresiyle eşleşen ders yok."
          secondaryLabel="Filtreleri temizle"
          onSecondary={() => {
            setSearch("");
            setLevelFilter("Tümü");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((subject) => (
            <div
              key={subject.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-teal-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-transparent"
                    style={{ backgroundColor: subject.color }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {subject.name}
                    </div>
                    {subject.short_name && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {subject.short_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(subject)}
                    className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(subject)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Sil
                  </button>
                </div>
              </div>
              {(subject.level || subject.subgroups) && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {parseCsv(subject.level ?? "").map((level) => (
                    <span
                      key={level}
                      className="inline-block bg-teal-50 text-teal-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      {levelChipLabel(level)}
                    </span>
                  ))}
                  {parseCsv(subject.subgroups ?? "").map((subgroup) => (
                    <span
                      key={subgroup}
                      className="inline-block bg-violet-50 text-violet-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      {subgroup}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sınıf Seviyeleri
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {LEVEL_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      levels: parseCsv(preset.levels),
                    })
                  }
                  className="px-3 py-1 text-xs font-medium border border-teal-200 text-teal-700 rounded-full hover:bg-teal-50 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LEVELS.map((level) => {
                const selected = form.levels.includes(level);
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => toggleLevel(level)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                      selected
                        ? "bg-teal-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {levelChipLabel(level)}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Seçilen seviyedeki sınıfların müfredatına otomatik eklenir.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alt Gruplar
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBGROUPS.map((subgroup) => {
                const selected = form.subgroups.includes(subgroup);
                return (
                  <button
                    key={subgroup}
                    type="button"
                    onClick={() => toggleSubgroup(subgroup)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      selected
                        ? "bg-violet-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {subgroup}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Seçilmezse tüm alt gruplara atanır.
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
                  aria-label={`Renk ${color}`}
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

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Dersi sil"
        message={`“${deleteTarget?.name ?? ""}” dersini silmek istediğinize emin misiniz?`}
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
