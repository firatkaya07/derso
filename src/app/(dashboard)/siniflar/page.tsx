"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import type { ClassGroup, ClassScheduleDay } from "@/lib/types";
import { DAY_NAMES } from "@/lib/types";

export default function ClassesPage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [scheduleDays, setScheduleDays] = useState<ClassScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [dayConfigs, setDayConfigs] = useState<
    { day: number; enabled: boolean; startTime: string; endTime: string }[]
  >([]);

  const fetchData = useCallback(async () => {
    const [{ data: classData }, { data: scheduleData }] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("class_schedule_days").select("*"),
    ]);
    setClasses(classData || []);
    setScheduleDays(scheduleData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditingClass(null);
    setForm({ name: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (cls: ClassGroup) => {
    setEditingClass(cls);
    setForm({ name: cls.name, description: cls.description || "" });
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
    };
    if (editingClass) {
      await supabase.from("classes").update(data).eq("id", editingClass.id);
    } else {
      await supabase.from("classes").insert(data);
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
    if (!confirm("Bu sinifi ve tum programini silmek istediginize emin misiniz?"))
      return;
    await supabase.from("classes").delete().eq("id", id);
    fetchData();
  };

  const getClassDays = (classId: string) => {
    return scheduleDays
      .filter((d) => d.class_id === classId)
      .sort((a, b) => a.day_of_week - b.day_of_week);
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
        <h1 className="text-2xl font-bold text-gray-900">Siniflar</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Sinif Ekle
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Henuz sinif eklenmemis.</p>
          <button onClick={openCreate} className="text-blue-600 hover:underline mt-2 text-sm">
            Ilk sinifi ekleyin
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {classes.map((cls) => {
            const days = getClassDays(cls.id);
            return (
              <div
                key={cls.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{cls.name}</h3>
                    {cls.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{cls.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(cls)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Duzenle
                    </button>
                    <button
                      onClick={() => handleDelete(cls.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Sil
                    </button>
                  </div>
                </div>

                {days.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Ders gunu belirlenmemis</p>
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
                  Ders Gunlerini Ayarla
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Sinif Ekleme/Duzenleme Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClass ? "Sinif Duzenle" : "Yeni Sinif"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sinif Adi *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              placeholder="Ornek: 5. Sinif A Grubu"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aciklama</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              placeholder="Ornek: Hafta ici sabah grubu"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {editingClass ? "Kaydet" : "Ekle"}
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

      {/* Ders Gunleri Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={`${selectedClass?.name} - Ders Gunleri`}
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
              Iptal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
