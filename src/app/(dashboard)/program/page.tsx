"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type {
  ClassGroup,
  ClassScheduleDay,
  Lesson,
  Subject,
  Teacher,
  ClassSubject,
} from "@/lib/types";
import { DAY_NAMES, DAY_NAMES_SHORT, generateTimeSlots } from "@/lib/types";

interface SubjectCard {
  subjectId: string;
  teacherId: string;
  subjectName: string;
  subjectShortName: string | null;
  subjectColor: string;
  teacherName: string;
  weeklyHours: number;
  placedCount: number;
}

export default function ProgramPage() {
  const supabase = createClient();

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(false);

  const [scheduleDays, setScheduleDays] = useState<ClassScheduleDay[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherAllLessons, setTeacherAllLessons] = useState<Lesson[]>([]);

  const [activeCard, setActiveCard] = useState<SubjectCard | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("classes")
        .select("*")
        .order("name");
      const list = data || [];
      setClasses(list);
      if (list.length > 0) setSelectedClassId(list[0].id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClassData = useCallback(async () => {
    if (!selectedClassId) return;
    setClassLoading(true);
    setActiveCard(null);

    const [
      { data: daysData },
      { data: lessonsData },
      { data: csData },
      { data: teachersData },
    ] = await Promise.all([
      supabase
        .from("class_schedule_days")
        .select("*")
        .eq("class_id", selectedClassId)
        .order("day_of_week"),
      supabase
        .from("lessons")
        .select("*, subject:subjects(*), teacher:teachers(*)")
        .eq("class_id", selectedClassId),
      supabase
        .from("class_subjects")
        .select("*, subject:subjects(*), teacher:teachers(*)")
        .eq("class_id", selectedClassId),
      supabase.from("teachers").select("*"),
    ]);

    setScheduleDays(daysData || []);
    setLessons(lessonsData || []);
    setClassSubjects(csData || []);
    setTeachers(teachersData || []);

    const teacherIds = [
      ...new Set(
        (csData || []).map((cs) => cs.teacher_id).filter(Boolean)
      ),
    ] as string[];
    if (teacherIds.length > 0) {
      const { data: tLessons } = await supabase
        .from("lessons")
        .select("*")
        .in("teacher_id", teacherIds);
      setTeacherAllLessons(tLessons || []);
    } else {
      setTeacherAllLessons([]);
    }

    setClassLoading(false);
  }, [supabase, selectedClassId]);

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const filteredClasses = useMemo(() => {
    if (!search.trim()) return classes;
    const s = search.toLowerCase();
    return classes.filter((c) => c.name.toLowerCase().includes(s));
  }, [classes, search]);

  const timeSlots = useMemo(() => {
    const all = new Map<string, { start: string; end: string }>();
    scheduleDays.forEach((day) => {
      generateTimeSlots(
        day.start_time.slice(0, 5),
        day.end_time.slice(0, 5)
      ).forEach((s) => all.set(s.start, s));
    });
    return Array.from(all.values()).sort((a, b) =>
      a.start.localeCompare(b.start)
    );
  }, [scheduleDays]);

  const scheduleDayMap = useMemo(() => {
    const m = new Map<number, ClassScheduleDay>();
    scheduleDays.forEach((d) => m.set(d.day_of_week, d));
    return m;
  }, [scheduleDays]);

  const cards = useMemo<SubjectCard[]>(() => {
    return classSubjects
      .filter((cs) => cs.subject)
      .map((cs) => {
        const subject = cs.subject as Subject;
        const teacher = cs.teacher as Teacher | undefined;
        const placed = lessons.filter(
          (l) =>
            l.subject_id === cs.subject_id && l.teacher_id === cs.teacher_id
        ).length;
        return {
          subjectId: cs.subject_id,
          teacherId: cs.teacher_id || "",
          subjectName: subject.name,
          subjectShortName: subject.short_name,
          subjectColor: subject.color,
          teacherName: teacher?.name || "Atanmamış",
          weeklyHours: cs.weekly_hours,
          placedCount: placed,
        };
      })
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "tr"));
  }, [classSubjects, lessons]);

  const totalPlaced = cards.reduce((s, c) => s + c.placedCount, 0);
  const totalWeekly = cards.reduce((s, c) => s + c.weeklyHours, 0);

  const getLessonAt = (day: number, start: string) =>
    lessons.find(
      (l) => l.day_of_week === day && l.start_time.slice(0, 5) === start
    );

  const isSlotValidForDay = (day: number, startTime: string) => {
    const sched = scheduleDayMap.get(day);
    if (!sched) return false;
    return generateTimeSlots(
      sched.start_time.slice(0, 5),
      sched.end_time.slice(0, 5)
    ).some((s) => s.start === startTime);
  };

  const isSlotEligible = (day: number, startTime: string) => {
    if (!activeCard || !activeCard.teacherId) return false;
    if (!isSlotValidForDay(day, startTime)) return false;
    if (getLessonAt(day, startTime)) return false;

    const teacher = teachers.find((t) => t.id === activeCard.teacherId);
    if (teacher?.off_days?.includes(day)) return false;

    const conflict = teacherAllLessons.some(
      (l) =>
        l.teacher_id === activeCard.teacherId &&
        l.day_of_week === day &&
        l.start_time.slice(0, 5) === startTime &&
        l.class_id !== selectedClassId
    );
    return !conflict;
  };

  const handlePlace = async (day: number, start: string, end: string) => {
    if (!activeCard || !selectedClassId) return;
    await supabase.from("lessons").insert({
      class_id: selectedClassId,
      subject_id: activeCard.subjectId,
      teacher_id: activeCard.teacherId,
      day_of_week: day,
      start_time: start,
      end_time: end,
    });
    fetchClassData();
  };

  const handleRemove = async (lessonId: string) => {
    await supabase.from("lessons").delete().eq("id", lessonId);
    fetchClassData();
  };

  const toggleCard = (card: SubjectCard) => {
    if (
      activeCard?.subjectId === card.subjectId &&
      activeCard?.teacherId === card.teacherId
    ) {
      setActiveCard(null);
    } else {
      setActiveCard(card);
    }
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
        <h1 className="text-lg font-bold text-gray-900">Sınıf Programları</h1>
      </div>

      <div className="flex gap-3 items-start">
        {/* Left: Class List */}
        <div className="w-52 flex-shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 self-stretch max-h-[calc(100vh-160px)] sticky top-4">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2.5">
              <svg
                className="w-4 h-4 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span className="font-semibold text-sm text-gray-900">
                Sınıf Listesi
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
                placeholder="Sınıf Ara..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-gray-900"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            {filteredClasses.map((cls, i) => {
              const sel = cls.id === selectedClassId;
              return (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all mb-0.5 ${
                    sel
                      ? "bg-teal-50 border border-teal-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold ${
                      sel
                        ? "bg-teal-500 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-sm font-medium truncate ${
                      sel ? "text-teal-700" : "text-gray-700"
                    }`}
                  >
                    {cls.name}
                  </span>
                  {sel && (
                    <svg
                      className="w-3.5 h-3.5 text-teal-500 ml-auto flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Schedule */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 min-w-0">
          {selectedClass ? (
            <>
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-medium">
                    Haftalık Program
                  </p>
                  <h2 className="text-lg font-bold text-gray-900">
                    {selectedClass.name}
                  </h2>
                </div>
                <Link
                  href="/siniflar"
                  className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  Saatleri Düzenle
                </Link>
              </div>

              {classLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-gray-400 text-sm">Yükleniyor...</div>
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">
                      Bu sınıf için ders saati belirlenmemiş.
                    </p>
                    <Link
                      href="/siniflar"
                      className="text-teal-600 hover:underline text-xs mt-2 inline-block"
                    >
                      Sınıf ayarlarına git
                    </Link>
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
                            className="p-1 text-center text-xs font-semibold text-gray-500"
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
                            const hasSchedule = scheduleDayMap.has(dayIdx);
                            const validSlot = isSlotValidForDay(
                              dayIdx,
                              slot.start
                            );

                            if (!hasSchedule || !validSlot) {
                              return (
                                <td key={dayIdx} className="p-1">
                                  <div
                                    className="rounded-lg h-14"
                                    style={{
                                      background:
                                        "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)",
                                      backgroundColor: "#f3f4f6",
                                    }}
                                  />
                                </td>
                              );
                            }

                            const lesson = getLessonAt(dayIdx, slot.start);

                            if (lesson) {
                              const subject =
                                lesson.subject as unknown as Subject;
                              const teacher =
                                lesson.teacher as unknown as Teacher;
                              const abbr =
                                subject?.short_name ||
                                subject?.name?.slice(0, 3).toUpperCase() ||
                                "?";
                              const initials = teacher?.name
                                ? teacher.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                : "?";

                              return (
                                <td key={dayIdx} className="p-1">
                                  <div
                                    className="relative group rounded-lg h-14 flex flex-col items-center justify-center border-2 transition-all cursor-pointer hover:shadow-md"
                                    style={{
                                      borderColor:
                                        subject?.color || "#3B82F6",
                                      backgroundColor: `${subject?.color || "#3B82F6"}15`,
                                    }}
                                    onClick={() =>
                                      handleRemove(lesson.id)
                                    }
                                  >
                                    <span
                                      className="text-xs font-bold group-hover:hidden"
                                      style={{
                                        color:
                                          subject?.color || "#3B82F6",
                                      }}
                                    >
                                      {abbr}
                                    </span>
                                    <span className="text-[10px] text-gray-400 mt-0.5 group-hover:hidden">
                                      {initials}
                                    </span>
                                    <span className="hidden group-hover:flex items-center gap-1 text-red-500 text-[10px] font-bold">
                                      <svg
                                        className="w-3.5 h-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                      </svg>
                                      Kaldır
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            if (activeCard) {
                              const eligible = isSlotEligible(
                                dayIdx,
                                slot.start
                              );
                              if (eligible) {
                                return (
                                  <td key={dayIdx} className="p-1">
                                    <button
                                      className="w-full rounded-lg h-14 border-2 border-dashed transition-all hover:shadow-sm cursor-pointer"
                                      style={{
                                        borderColor:
                                          activeCard.subjectColor,
                                        backgroundColor: `${activeCard.subjectColor}10`,
                                      }}
                                      onClick={() =>
                                        handlePlace(
                                          dayIdx,
                                          slot.start,
                                          slot.end
                                        )
                                      }
                                    >
                                      <svg
                                        className="w-4 h-4 mx-auto"
                                        fill="none"
                                        stroke={activeCard.subjectColor}
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
                              }
                              return (
                                <td key={dayIdx} className="p-1">
                                  <div className="rounded-lg h-14 bg-gray-50 opacity-40" />
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
              Bir sınıf seçin
            </div>
          )}
        </div>

        {/* Right: Class Subjects */}
        <div className="w-64 flex-shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-teal-600"
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
                Sınıfın Dersleri
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5">
            {selectedClassId && !classLoading && cards.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Bu sınıfa ders atanmamış.
              </p>
            ) : (
              cards.map((card) => {
                const isActive =
                  activeCard?.subjectId === card.subjectId &&
                  activeCard?.teacherId === card.teacherId;
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
                  <button
                    key={`${card.subjectId}-${card.teacherId}`}
                    onClick={() => toggleCard(card)}
                    disabled={!card.teacherId}
                    className={`w-full text-left rounded-xl p-3 mb-2 border-2 transition-all ${
                      isActive
                        ? "border-teal-400 shadow-md bg-teal-50/50"
                        : isComplete
                          ? "border-green-200 bg-green-50/30 hover:shadow-sm"
                          : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                    } ${!card.teacherId ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-1 h-10 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: card.subjectColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-bold text-sm text-gray-900 truncate">
                            {card.subjectName}
                          </h3>
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
                        <p className="text-xs text-gray-400 mt-0.5">
                          {card.teacherName}
                        </p>
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
                  </button>
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
                  className="h-1.5 rounded-full bg-teal-500 transition-all"
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
