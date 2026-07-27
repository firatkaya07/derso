"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import type {
  ClassGroup,
  ClassScheduleDay,
  Lesson,
  Subject,
  Teacher,
} from "@/lib/types";
import { DAY_NAMES, generateTimeSlots } from "@/lib/types";

export default function ClassSchedulePage() {
  const params = useParams();
  const classId = params.classId as string;
  const supabase = createClient();

  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [scheduleDays, setScheduleDays] = useState<ClassScheduleDay[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    day: number;
    start: string;
    end: string;
  } | null>(null);
  const [form, setForm] = useState({ subjectId: "", teacherId: "" });

  const fetchData = useCallback(async () => {
    const [
      { data: classData },
      { data: daysData },
      { data: lessonsData },
      { data: subjectsData },
      { data: teachersData },
    ] = await Promise.all([
      supabase.from("classes").select("*").eq("id", classId).single(),
      supabase
        .from("class_schedule_days")
        .select("*")
        .eq("class_id", classId)
        .order("day_of_week"),
      supabase
        .from("lessons")
        .select("*, subject:subjects(*), teacher:teachers(*)")
        .eq("class_id", classId),
      supabase.from("subjects").select("*").order("name"),
      supabase.from("teachers").select("*").order("name"),
    ]);

    setClassGroup(classData);
    setScheduleDays(daysData || []);
    setLessons(lessonsData || []);
    setSubjects(subjectsData || []);
    setTeachers(teachersData || []);
    setLoading(false);
  }, [supabase, classId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddLesson = (day: number, start: string, end: string) => {
    setEditingLesson(null);
    setSelectedSlot({ day, start, end });
    setForm({ subjectId: subjects[0]?.id || "", teacherId: teachers[0]?.id || "" });
    setModalOpen(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setSelectedSlot({
      day: lesson.day_of_week,
      start: lesson.start_time.slice(0, 5),
      end: lesson.end_time.slice(0, 5),
    });
    setForm({
      subjectId: lesson.subject_id,
      teacherId: lesson.teacher_id,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const data = {
      class_id: classId,
      subject_id: form.subjectId,
      teacher_id: form.teacherId,
      day_of_week: selectedSlot.day,
      start_time: selectedSlot.start,
      end_time: selectedSlot.end,
    };

    if (editingLesson) {
      await supabase.from("lessons").update(data).eq("id", editingLesson.id);
    } else {
      await supabase.from("lessons").insert(data);
    }

    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!editingLesson) return;
    await supabase.from("lessons").delete().eq("id", editingLesson.id);
    setModalOpen(false);
    fetchData();
  };

  const getLessonForSlot = (day: number, startTime: string) => {
    return lessons.find(
      (l) => l.day_of_week === day && l.start_time.slice(0, 5) === startTime
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Yukleniyor...</div>
      </div>
    );
  }

  if (!classGroup) {
    return (
      <div>
        <p className="text-gray-500">Sinif bulunamadi.</p>
        <Link href="/program" className="text-blue-600 hover:underline text-sm">
          Geri don
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/program"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{classGroup.name}</h1>
          <p className="text-sm text-gray-500">Haftalik Ders Programi</p>
        </div>
      </div>

      {scheduleDays.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Bu sinif icin ders gunu belirlenmemis.</p>
          <Link href="/siniflar" className="text-blue-600 hover:underline mt-2 text-sm inline-block">
            Sinif ayarlarindan ders gunlerini belirleyin
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="bg-gray-50 border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-20">
                  Saat
                </th>
                {scheduleDays.map((day) => (
                  <th
                    key={day.id}
                    className="bg-gray-50 border-b border-r border-gray-200 px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase"
                  >
                    {DAY_NAMES[day.day_of_week]}
                    <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                      {day.start_time.slice(0, 5)} - {day.end_time.slice(0, 5)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const allSlots = new Map<
                  string,
                  { start: string; end: string }
                >();
                scheduleDays.forEach((day) => {
                  const slots = generateTimeSlots(
                    day.start_time.slice(0, 5),
                    day.end_time.slice(0, 5)
                  );
                  slots.forEach((s) => {
                    allSlots.set(s.start, s);
                  });
                });
                const sortedSlots = Array.from(allSlots.values()).sort(
                  (a, b) => a.start.localeCompare(b.start)
                );

                return sortedSlots.map((slot) => (
                  <tr key={slot.start} className="hover:bg-gray-50/50">
                    <td className="border-b border-r border-gray-200 px-4 py-1 text-xs text-gray-500 font-mono whitespace-nowrap">
                      {slot.start}
                      <br />
                      {slot.end}
                    </td>
                    {scheduleDays.map((day) => {
                      const daySlots = generateTimeSlots(
                        day.start_time.slice(0, 5),
                        day.end_time.slice(0, 5)
                      );
                      const isValidSlot = daySlots.some(
                        (s) => s.start === slot.start
                      );

                      if (!isValidSlot) {
                        return (
                          <td
                            key={day.id}
                            className="border-b border-r border-gray-200 bg-gray-100"
                          />
                        );
                      }

                      const lesson = getLessonForSlot(
                        day.day_of_week,
                        slot.start
                      );

                      if (lesson) {
                        const subject = lesson.subject as unknown as Subject;
                        const teacher = lesson.teacher as unknown as Teacher;
                        return (
                          <td
                            key={day.id}
                            className="border-b border-r border-gray-200 p-1"
                          >
                            <button
                              onClick={() => openEditLesson(lesson)}
                              className="w-full rounded-lg p-2 text-left text-white text-xs transition-all hover:opacity-90 hover:shadow-md"
                              style={{
                                backgroundColor: subject?.color || "#3B82F6",
                              }}
                            >
                              <div className="font-semibold truncate">
                                {subject?.name}
                              </div>
                              <div className="opacity-80 truncate text-[10px] mt-0.5">
                                {teacher?.name}
                              </div>
                            </button>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={day.id}
                          className="border-b border-r border-gray-200 p-1"
                        >
                          <button
                            onClick={() =>
                              openAddLesson(
                                day.day_of_week,
                                slot.start,
                                slot.end
                              )
                            }
                            className="w-full h-full min-h-[48px] rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center"
                          >
                            <svg
                              className="w-4 h-4 text-gray-300"
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
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingLesson
            ? "Ders Duzenle"
            : `Ders Ekle - ${selectedSlot ? DAY_NAMES[selectedSlot.day] : ""} ${selectedSlot?.start || ""}`
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saat
            </label>
            <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              {selectedSlot
                ? `${DAY_NAMES[selectedSlot.day]} ${selectedSlot.start} - ${selectedSlot.end}`
                : ""}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ders *
            </label>
            {subjects.length === 0 ? (
              <p className="text-sm text-red-500">
                Henuz ders tanimlanmamis.{" "}
                <Link href="/dersler" className="underline">
                  Ders ekleyin
                </Link>
              </p>
            ) : (
              <select
                value={form.subjectId}
                onChange={(e) =>
                  setForm({ ...form, subjectId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                required
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ogretmen *
            </label>
            {teachers.length === 0 ? (
              <p className="text-sm text-red-500">
                Henuz ogretmen eklenmemis.{" "}
                <Link href="/ogretmenler" className="underline">
                  Ogretmen ekleyin
                </Link>
              </p>
            ) : (
              <select
                value={form.teacherId}
                onChange={(e) =>
                  setForm({ ...form, teacherId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                required
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={subjects.length === 0 || teachers.length === 0}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingLesson ? "Kaydet" : "Ekle"}
            </button>
            {editingLesson && (
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-200 transition-colors"
              >
                Sil
              </button>
            )}
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
