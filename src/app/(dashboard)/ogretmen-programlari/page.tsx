"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type {
  Teacher,
  Lesson,
  Subject,
  ClassGroup,
  ClassSubject,
  ClassScheduleDay,
} from "@/lib/types";
import { DAY_NAMES, generateTimeSlots } from "@/lib/types";

interface TeacherCard {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectShortName: string | null;
  subjectColor: string;
  weeklyHours: number;
  placedCount: number;
}

export default function TeacherSchedulesPage() {
  const supabase = createClient();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [teacherLoading, setTeacherLoading] = useState(false);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [allScheduleDays, setAllScheduleDays] = useState<ClassScheduleDay[]>(
    []
  );
  const [classes, setClasses] = useState<ClassGroup[]>([]);

  const [teacherTotals, setTeacherTotals] = useState<
    Map<string, { placed: number; total: number }>
  >(new Map());

  useEffect(() => {
    (async () => {
      const [
        { data: teacherData },
        { data: csData },
        { data: lessonData },
        { data: classData },
        { data: daysData },
      ] = await Promise.all([
        supabase.from("teachers").select("*").order("name"),
        supabase
          .from("class_subjects")
          .select("teacher_id, weekly_hours"),
        supabase.from("lessons").select("teacher_id"),
        supabase.from("classes").select("*").order("name"),
        supabase.from("class_schedule_days").select("*"),
      ]);

      const list = teacherData || [];
      setTeachers(list);
      setClasses(classData || []);
      setAllScheduleDays(daysData || []);
      if (list.length > 0) setSelectedTeacherId(list[0].id);

      const totals = new Map<string, { placed: number; total: number }>();
      (csData || []).forEach((cs) => {
        if (!cs.teacher_id) return;
        const e = totals.get(cs.teacher_id) || { placed: 0, total: 0 };
        e.total += cs.weekly_hours;
        totals.set(cs.teacher_id, e);
      });
      (lessonData || []).forEach((l) => {
        if (!l.teacher_id) return;
        const e = totals.get(l.teacher_id);
        if (e) e.placed += 1;
      });
      setTeacherTotals(totals);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTeacherData = useCallback(async () => {
    if (!selectedTeacherId) return;
    setTeacherLoading(true);

    const [{ data: lessonsData }, { data: csData }] = await Promise.all([
      supabase
        .from("lessons")
        .select("*, subject:subjects(*), teacher:teachers(*)")
        .eq("teacher_id", selectedTeacherId),
      supabase
        .from("class_subjects")
        .select("*, subject:subjects(*)")
        .eq("teacher_id", selectedTeacherId),
    ]);

    setLessons(lessonsData || []);
    setClassSubjects(csData || []);

    setTeacherLoading(false);
  }, [supabase, selectedTeacherId]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const s = search.toLowerCase();
    return teachers.filter((t) => t.name.toLowerCase().includes(s));
  }, [teachers, search]);

  const timeSlots = useMemo(() => {
    const all = new Map<string, { start: string; end: string }>();
    allScheduleDays.forEach((day) => {
      generateTimeSlots(
        day.start_time.slice(0, 5),
        day.end_time.slice(0, 5)
      ).forEach((s) => all.set(s.start, s));
    });
    return Array.from(all.values()).sort((a, b) =>
      a.start.localeCompare(b.start)
    );
  }, [allScheduleDays]);

  const classMap = useMemo(() => {
    const m = new Map<string, ClassGroup>();
    classes.forEach((c) => m.set(c.id, c));
    return m;
  }, [classes]);

  const cards = useMemo<TeacherCard[]>(() => {
    return classSubjects
      .filter((cs) => cs.subject)
      .map((cs) => {
        const subject = cs.subject as Subject;
        const cls = classMap.get(cs.class_id);
        const placed = lessons.filter(
          (l) =>
            l.class_id === cs.class_id && l.subject_id === cs.subject_id
        ).length;
        return {
          classId: cs.class_id,
          className: cls?.name || "?",
          subjectId: cs.subject_id,
          subjectName: subject.name,
          subjectShortName: subject.short_name,
          subjectColor: subject.color,
          weeklyHours: cs.weekly_hours,
          placedCount: placed,
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className, "tr"));
  }, [classSubjects, lessons, classMap]);

  const totalPlaced = cards.reduce((s, c) => s + c.placedCount, 0);
  const totalWeekly = cards.reduce((s, c) => s + c.weeklyHours, 0);

  const getLessonAt = (day: number, start: string) =>
    lessons.find(
      (l) => l.day_of_week === day && l.start_time.slice(0, 5) === start
    );

  const isOffDay = (day: number) =>
    selectedTeacher?.off_days?.includes(day) || false;

  const getInitial = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        marginLeft: "calc(-50vw + 50%)",
        paddingLeft: "1.5rem",
        paddingRight: "1.5rem",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-gray-900">
          Öğretmen Programları
        </h1>
      </div>

      <div className="flex gap-3 items-start">
        {/* Left: Teacher List */}
        <div className="w-56 flex-shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 self-stretch max-h-[calc(100vh-160px)] sticky top-4">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2.5">
              <svg
                className="w-4 h-4 text-pink-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="font-semibold text-sm text-gray-900">
                Öğretmen Listesi
              </span>
            </div>
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Öğretmen Ara..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none text-gray-900"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            {filteredTeachers.map((teacher) => {
              const sel = teacher.id === selectedTeacherId;
              const tt = teacherTotals.get(teacher.id);
              const incomplete = tt ? tt.placed < tt.total : false;
              return (
                <button
                  key={teacher.id}
                  onClick={() => setSelectedTeacherId(teacher.id)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all mb-0.5 ${
                    sel
                      ? "bg-pink-50 border border-pink-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold flex-shrink-0 ${
                      sel
                        ? "bg-pink-500 text-white"
                        : "bg-orange-100 text-orange-600"
                    }`}
                  >
                    {getInitial(teacher.name)}
                  </span>
                  <span
                    className={`text-xs font-medium truncate flex-1 ${
                      sel ? "text-pink-700" : "text-gray-700"
                    }`}
                  >
                    {teacher.name}
                  </span>
                  {tt && (
                    <span
                      className={`text-[10px] font-semibold flex-shrink-0 ${
                        incomplete ? "text-red-500" : "text-green-500"
                      }`}
                    >
                      {tt.placed}/{tt.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Schedule */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 min-w-0">
          {selectedTeacher ? (
            <>
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-medium">
                    Haftalık Program
                  </p>
                  <h2 className="text-lg font-bold text-gray-900">
                    {selectedTeacher.name}
                  </h2>
                </div>
              </div>

              {teacherLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-gray-400 text-sm">Yükleniyor...</div>
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">
                      Henüz ders saati tanımlanmamış.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-auto p-3">
                  <table className="w-full border-collapse table-fixed">
                    <colgroup>
                      <col style={{ width: 48 }} />
                      {DAY_NAMES.map((_, i) => (
                        <col key={i} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="p-1" />
                        {DAY_NAMES.map((name, dayIdx) => (
                          <th
                            key={dayIdx}
                            className={`p-1 text-center text-xs font-semibold ${
                              isOffDay(dayIdx)
                                ? "text-red-400"
                                : "text-gray-500"
                            }`}
                          >
                            {name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, slotIdx) => (
                        <tr key={slot.start}>
                          <td className="p-1 text-center align-middle">
                            <div className="text-xs font-semibold text-gray-500">
                              {slotIdx + 1}
                            </div>
                            <div className="text-[9px] text-gray-300 leading-tight">
                              {slot.start}
                            </div>
                          </td>
                          {DAY_NAMES.map((_, dayIdx) => {
                            if (isOffDay(dayIdx)) {
                              return (
                                <td key={dayIdx} className="p-1">
                                  <div className="rounded-lg h-14 bg-red-50 flex items-center justify-center">
                                    <svg
                                      className="w-5 h-5 text-red-300"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                      />
                                    </svg>
                                  </div>
                                </td>
                              );
                            }

                            const lesson = getLessonAt(dayIdx, slot.start);

                            if (lesson) {
                              const subject =
                                lesson.subject as unknown as Subject;
                              const cls = classMap.get(lesson.class_id);
                              const abbr =
                                subject?.short_name ||
                                subject?.name?.slice(0, 3).toUpperCase() ||
                                "?";

                              return (
                                <td key={dayIdx} className="p-1">
                                  <div
                                    className="rounded-lg h-14 flex flex-col items-center justify-center border-2"
                                    style={{
                                      borderColor:
                                        subject?.color || "#3B82F6",
                                      backgroundColor: `${subject?.color || "#3B82F6"}15`,
                                    }}
                                  >
                                    <span
                                      className="text-[10px] font-semibold text-gray-600"
                                    >
                                      {cls?.name || "?"}
                                    </span>
                                    <span
                                      className="text-xs font-bold"
                                      style={{
                                        color:
                                          subject?.color || "#3B82F6",
                                      }}
                                    >
                                      {abbr}
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={dayIdx} className="p-1">
                                <div className="rounded-lg h-14 bg-gray-50 border border-gray-100" />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Bir öğretmen seçin
            </div>
          )}
        </div>

        {/* Right: Subject Cards */}
        <div className="w-64 flex-shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 self-stretch max-h-[calc(100vh-160px)] sticky top-4">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-pink-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <span className="font-semibold text-sm text-gray-900">
                  Dersler
                </span>
              </div>
              {totalWeekly > 0 && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    totalPlaced >= totalWeekly
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {totalPlaced} / {totalWeekly}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5">
            {selectedTeacherId && !teacherLoading && cards.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Bu öğretmene ders atanmamış.
              </p>
            ) : (
              cards.map((card) => {
                const isComplete =
                  card.placedCount >= card.weeklyHours &&
                  card.weeklyHours > 0;
                const pct =
                  card.weeklyHours > 0
                    ? Math.min(
                        100,
                        (card.placedCount / card.weeklyHours) * 100
                      )
                    : 0;

                return (
                  <div
                    key={`${card.classId}-${card.subjectId}`}
                    className={`rounded-xl p-3 mb-2 border-2 transition-all ${
                      isComplete
                        ? "border-green-200 bg-green-50/30"
                        : "border-gray-100"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-1 h-10 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: card.subjectColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500">
                              {card.className}
                            </p>
                            <h3 className="font-bold text-sm text-gray-900 truncate">
                              {card.subjectName}
                            </h3>
                          </div>
                          {isComplete && (
                            <svg
                              className="w-4 h-4 text-green-500 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 ml-3">
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isComplete
                              ? "#22c55e"
                              : card.subjectColor,
                          }}
                        />
                      </div>
                      <p
                        className={`text-xs font-medium ${isComplete ? "text-green-600" : "text-gray-500"}`}
                      >
                        {card.placedCount} / {card.weeklyHours} saat
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {cards.length > 0 && (
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>Toplam</span>
                <span className="font-semibold">
                  {totalPlaced} / {totalWeekly} saat
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-pink-500 transition-all"
                  style={{
                    width: `${totalWeekly > 0 ? Math.min(100, (totalPlaced / totalWeekly) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
