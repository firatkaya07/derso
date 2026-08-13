"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/components/Toast";
import { useSettings } from "@/components/SettingsProvider";
import { clientCacheKeys } from "@/lib/cache";
import { useOrganization } from "@/components/OrganizationProvider";
import { slotTimingOf } from "@/lib/settings";
import ScheduleGrid, { type GridCell } from "@/components/ScheduleGrid";
import { describeDbError, throwIfDbError } from "@/lib/db-error";
import {
  buildTimeSlots,
  checkPlacement,
  findLessonAt,
  PLACEMENT_MESSAGES,
  type TimeSlot,
} from "@/lib/schedule-rules";
import type {
  ClassGroup,
  ClassScheduleDay,
  ClassSubject,
  Lesson,
  Subject,
  Teacher,
} from "@/lib/types";

interface TeacherCard {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  weeklyHours: number;
  placedCount: number;
}

interface TeacherOverview {
  teachers: Teacher[];
  totals: Map<string, { placed: number; total: number }>;
}

interface TeacherDetail {
  lessons: Lesson[];
  classSubjects: ClassSubject[];
  classes: ClassGroup[];
  scheduleDays: ClassScheduleDay[];
  /** Öğretmenin ders verdiği sınıfların tüm dersleri (başka öğretmenlerinki dâhil). */
  classLessons: Lesson[];
}

export default function TeacherSchedulesPage() {
  const supabase = createClient();
  const toast = useToast();
  const settings = useSettings();
  const { organizationId } = useOrganization();
  const timing = useMemo(() => slotTimingOf(settings), [settings]);

  const [chosenTeacherId, setChosenTeacherId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCard, setActiveCard] = useState<TeacherCard | null>(null);

  const loadOverview = useCallback(async (): Promise<TeacherOverview> => {
    const [teacherResult, csResult, lessonResult] = await Promise.all([
      supabase
        .from("teachers")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name"),
      supabase
        .from("class_subjects")
        .select("class_id, subject_id, teacher_id, weekly_hours")
        .eq("organization_id", organizationId),
      supabase
        .from("lessons")
        .select("teacher_id, class_id, subject_id")
        .eq("organization_id", organizationId),
    ]);
    throwIfDbError(teacherResult, "Öğretmenler okunamadı");
    throwIfDbError(csResult, "Sınıf dersleri okunamadı");
    throwIfDbError(lessonResult, "Program okunamadı");

    const weeklyHoursByPair = new Map<string, number>();
    for (const cs of csResult.data ?? []) {
      weeklyHoursByPair.set(`${cs.class_id}:${cs.subject_id}`, cs.weekly_hours);
    }

    const totals = new Map<string, { placed: number; total: number }>();
    const pairsByTeacher = new Map<string, Set<string>>();

    for (const lesson of lessonResult.data ?? []) {
      if (!lesson.teacher_id) continue;
      const entry = totals.get(lesson.teacher_id) ?? { placed: 0, total: 0 };
      entry.placed += 1;
      totals.set(lesson.teacher_id, entry);

      const pairs = pairsByTeacher.get(lesson.teacher_id) ?? new Set<string>();
      pairs.add(`${lesson.class_id}:${lesson.subject_id}`);
      pairsByTeacher.set(lesson.teacher_id, pairs);
    }

    for (const cs of csResult.data ?? []) {
      if (!cs.teacher_id) continue;
      const pairs = pairsByTeacher.get(cs.teacher_id) ?? new Set<string>();
      pairs.add(`${cs.class_id}:${cs.subject_id}`);
      pairsByTeacher.set(cs.teacher_id, pairs);
    }

    for (const [teacherId, pairs] of pairsByTeacher) {
      const entry = totals.get(teacherId) ?? { placed: 0, total: 0 };
      entry.total = [...pairs].reduce(
        (sum, pair) => sum + (weeklyHoursByPair.get(pair) ?? 0),
        0
      );
      totals.set(teacherId, entry);
    }

    return { teachers: teacherResult.data ?? [], totals };
  }, [supabase, organizationId]);

  const overview = useAsyncData(loadOverview, {
    cacheKey: clientCacheKeys.teacherOverview(organizationId),
  });
  const teachers = useMemo(
    () => overview.data?.teachers ?? [],
    [overview.data]
  );

  const selectedTeacherId =
    chosenTeacherId && teachers.some((t) => t.id === chosenTeacherId)
      ? chosenTeacherId
      : (teachers[0]?.id ?? null);

  const loadDetail = useCallback(async (): Promise<TeacherDetail | null> => {
    if (!selectedTeacherId) return null;

    const [lessonsResult, classesResult, daysResult] = await Promise.all([
      supabase
        .from("lessons")
        .select("*, subject:subjects(*), teacher:teachers(*)")
        .eq("organization_id", organizationId)
        .eq("teacher_id", selectedTeacherId),
      supabase
        .from("classes")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name"),
      supabase
        .from("class_schedule_days")
        .select("*")
        .eq("organization_id", organizationId),
    ]);
    throwIfDbError(lessonsResult, "Program okunamadı");
    throwIfDbError(classesResult, "Sınıflar okunamadı");
    throwIfDbError(daysResult, "Ders günleri okunamadı");

    const lessons = lessonsResult.data ?? [];
    const classIdsFromLessons = [
      ...new Set(lessons.map((lesson) => lesson.class_id)),
    ];

    // Öğretmene sabit atanmış dersler + programa daha önce yerleşmiş dersler.
    const csResult =
      classIdsFromLessons.length > 0
        ? await supabase
            .from("class_subjects")
            .select("*, subject:subjects(*)")
            .eq("organization_id", organizationId)
            .or(
              `teacher_id.eq.${selectedTeacherId},class_id.in.(${classIdsFromLessons.join(",")})`
            )
        : await supabase
            .from("class_subjects")
            .select("*, subject:subjects(*)")
            .eq("organization_id", organizationId)
            .eq("teacher_id", selectedTeacherId);
    throwIfDbError(csResult, "Sınıf dersleri okunamadı");

    const lessonPairs = new Set(
      lessons.map((lesson) => `${lesson.class_id}:${lesson.subject_id}`)
    );
    const classSubjects = (csResult.data ?? []).filter(
      (cs) =>
        cs.teacher_id === selectedTeacherId ||
        lessonPairs.has(`${cs.class_id}:${cs.subject_id}`)
    );

    // Kartların ait olduğu sınıfların tüm dersleri; slot doluluk denetimi için.
    const cardClassIds = [...new Set(classSubjects.map((cs) => cs.class_id))];
    let classLessons: Lesson[] = [];
    if (cardClassIds.length > 0) {
      const result = await supabase
        .from("lessons")
        .select("*")
        .in("class_id", cardClassIds);
      throwIfDbError(result, "Sınıf programları okunamadı");
      classLessons = result.data ?? [];
    }

    return {
      lessons,
      classSubjects,
      classes: classesResult.data ?? [],
      scheduleDays: daysResult.data ?? [],
      classLessons,
    };
  }, [supabase, selectedTeacherId, organizationId]);

  const detail = useAsyncData(loadDetail);

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);
  const lessons = useMemo(() => detail.data?.lessons ?? [], [detail.data]);
  const scheduleDays = useMemo(
    () => detail.data?.scheduleDays ?? [],
    [detail.data]
  );

  const classMap = useMemo(() => {
    const map = new Map<string, ClassGroup>();
    for (const cls of detail.data?.classes ?? []) map.set(cls.id, cls);
    return map;
  }, [detail.data]);

  const filteredTeachers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return teachers;
    return teachers.filter((t) => t.name.toLowerCase().includes(term));
  }, [teachers, search]);

  const timeSlots = useMemo(
    () => buildTimeSlots(scheduleDays, timing),
    [scheduleDays, timing]
  );

  const cards = useMemo<TeacherCard[]>(() => {
    if (!detail.data) return [];
    return detail.data.classSubjects
      .filter((cs) => cs.subject)
      .map((cs) => {
        const subject = cs.subject as Subject;
        return {
          classId: cs.class_id,
          className: classMap.get(cs.class_id)?.name ?? "?",
          subjectId: cs.subject_id,
          subjectName: subject.name,
          subjectColor: subject.color,
          weeklyHours: cs.weekly_hours,
          placedCount: lessons.filter(
            (lesson) =>
              lesson.class_id === cs.class_id &&
              lesson.subject_id === cs.subject_id
          ).length,
        };
      })
      .sort(
        (a, b) =>
          a.className.localeCompare(b.className, "tr") ||
          a.subjectName.localeCompare(b.subjectName, "tr")
      );
  }, [detail.data, classMap, lessons]);

  const activeCardState = activeCard
    ? (cards.find(
        (card) =>
          card.classId === activeCard.classId &&
          card.subjectId === activeCard.subjectId
      ) ?? null)
    : null;

  const totalPlaced = cards.reduce((sum, card) => sum + card.placedCount, 0);
  const totalWeekly = cards.reduce((sum, card) => sum + card.weeklyHours, 0);

  const isOffDay = (dayOfWeek: number) =>
    selectedTeacher?.off_days?.includes(dayOfWeek) ?? false;

  const refresh = () => {
    detail.reload();
    overview.reload();
  };

  const blockerFor = (dayOfWeek: number, slot: TimeSlot) => {
    if (!activeCardState || !selectedTeacherId || !detail.data) return null;
    return checkPlacement({
      dayOfWeek,
      startTime: slot.start,
      classId: activeCardState.classId,
      teacherId: selectedTeacherId,
      scheduleDays: scheduleDays.filter(
        (day) => day.class_id === activeCardState.classId
      ),
      classLessons: detail.data.classLessons.filter(
        (lesson) => lesson.class_id === activeCardState.classId
      ),
      teacherLessons: lessons,
      teacherOffDays: selectedTeacher?.off_days ?? [],
      weeklyHours: activeCardState.weeklyHours,
      placedCount: activeCardState.placedCount,
      timing,
    });
  };

  const handlePlace = async (dayOfWeek: number, slot: TimeSlot) => {
    if (!activeCardState || !selectedTeacherId) return;
    const { error } = await supabase.from("lessons").insert({
      organization_id: organizationId,
      class_id: activeCardState.classId,
      subject_id: activeCardState.subjectId,
      teacher_id: selectedTeacherId,
      day_of_week: dayOfWeek,
      start_time: slot.start,
      end_time: slot.end,
    });
    if (error) {
      toast.error(describeDbError(error));
    }
    refresh();
  };

  const handleRemove = async (lessonId: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (error) {
      toast.error(describeDbError(error));
      return;
    }
    refresh();
  };

  const toggleCard = (card: TeacherCard) => {
    setActiveCard((current) =>
      current?.classId === card.classId && current?.subjectId === card.subjectId
        ? null
        : card
    );
  };

  const getCell = (dayOfWeek: number, slot: TimeSlot): GridCell => {
    if (isOffDay(dayOfWeek)) return { kind: "off-day" };

    const lesson = findLessonAt(lessons, dayOfWeek, slot.start);
    if (lesson) {
      const subject = lesson.subject as Subject | undefined;
      return {
        kind: "lesson",
        color: subject?.color ?? "#3B82F6",
        primary:
          subject?.short_name ||
          subject?.name?.slice(0, 3).toUpperCase() ||
          "?",
        secondary: classMap.get(lesson.class_id)?.name ?? "?",
        onRemove: () => handleRemove(lesson.id),
      };
    }

    if (!activeCardState) return { kind: "empty" };

    const blocker = blockerFor(dayOfWeek, slot);
    if (blocker) {
      return { kind: "blocked", reason: PLACEMENT_MESSAGES[blocker] };
    }
    return {
      kind: "placeable",
      color: activeCardState.subjectColor,
      onPlace: () => handlePlace(dayOfWeek, slot),
    };
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  if (overview.loading && !overview.data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  if (overview.error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        Öğretmenler yüklenemedi: {overview.error.message}
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
          href="/home"
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
        <h1 className="text-lg font-bold text-gray-900">Öğretmen Programları</h1>
      </div>

      <div className="flex gap-3 items-start">
        <div className="w-56 flex-shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 self-stretch max-h-[calc(100vh-160px)] sticky top-4">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2.5">
              <svg
                className="w-4 h-4 text-[var(--color-primary)]"
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
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Öğretmen Ara..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            {filteredTeachers.map((teacher) => {
              const isSelected = teacher.id === selectedTeacherId;
              const totals = overview.data?.totals.get(teacher.id);
              const incomplete = totals ? totals.placed < totals.total : false;
              return (
                <button
                  key={teacher.id}
                  onClick={() => {
                    setChosenTeacherId(teacher.id);
                    setActiveCard(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all mb-0.5 ${
                    isSelected
                      ? "bg-indigo-50 border border-indigo-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold flex-shrink-0 ${
                      isSelected
                        ? "bg-indigo-500 text-white"
                        : "bg-indigo-100 text-indigo-600"
                    }`}
                  >
                    {getInitials(teacher.name)}
                  </span>
                  <span
                    className={`text-xs font-medium truncate flex-1 ${
                      isSelected ? "text-indigo-700" : "text-gray-700"
                    }`}
                  >
                    {teacher.name}
                  </span>
                  {totals && (
                    <span
                      className={`text-[10px] font-semibold flex-shrink-0 ${
                        incomplete ? "text-red-500" : "text-green-500"
                      }`}
                    >
                      {totals.placed}/{totals.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

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

              {detail.error ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <p className="text-red-600 text-sm">{detail.error.message}</p>
                </div>
              ) : detail.loading && !detail.data ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-gray-400 text-sm">Yükleniyor...</div>
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-400 text-sm">
                    Henüz ders saati tanımlanmamış.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto p-3">
                  <ScheduleGrid
                    slots={timeSlots}
                    getCell={getCell}
                    isDayHighlighted={isOffDay}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
              Önce bir öğretmen ekleyin.
            </div>
          )}
        </div>

        <div className="w-64 flex-shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 self-stretch max-h-[calc(100vh-160px)] sticky top-4">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-900">Dersler</span>
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
          <div className="flex-1 overflow-y-auto p-2.5">
            {!detail.loading && cards.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Bu öğretmene ders atanmamış.
              </p>
            ) : (
              cards.map((card) => {
                const isActive =
                  activeCardState?.classId === card.classId &&
                  activeCardState?.subjectId === card.subjectId;
                const isComplete =
                  card.weeklyHours > 0 && card.placedCount >= card.weeklyHours;
                const percent =
                  card.weeklyHours > 0
                    ? Math.min(100, (card.placedCount / card.weeklyHours) * 100)
                    : 0;

                return (
                  <button
                    key={`${card.classId}-${card.subjectId}`}
                    onClick={() => toggleCard(card)}
                    className={`w-full text-left rounded-xl p-3 mb-2 border-2 transition-all ${
                      isActive
                        ? "border-indigo-400 shadow-md bg-indigo-50/50"
                        : isComplete
                          ? "border-green-200 bg-green-50/30 hover:shadow-sm"
                          : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-1 h-10 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: card.subjectColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-gray-500">
                          {card.className}
                        </p>
                        <h3 className="font-bold text-sm text-gray-900 truncate">
                          {card.subjectName}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-2 ml-3">
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${percent}%`,
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
                  className="h-1.5 rounded-full bg-indigo-500 transition-all"
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
