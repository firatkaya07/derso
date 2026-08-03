"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/components/Toast";
import ScheduleGrid, { type GridCell } from "@/components/ScheduleGrid";
import { describeDbError, throwIfDbError } from "@/lib/db-error";
import {
  buildTimeSlots,
  checkPlacement,
  findLessonAt,
  isSlotWithinClassDay,
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
  TeacherSubject,
} from "@/lib/types";

interface SubjectCard {
  subjectId: string;
  teacherId: string;
  subjectName: string;
  subjectColor: string;
  teacherName: string;
  weeklyHours: number;
  placedCount: number;
}

interface ClassOverview {
  classes: ClassGroup[];
  totals: Map<string, { placed: number; total: number }>;
}

interface ClassDetail {
  scheduleDays: ClassScheduleDay[];
  lessons: Lesson[];
  classSubjects: ClassSubject[];
  teachers: Teacher[];
  teacherSubjects: TeacherSubject[];
  /** Karta atanabilecek öğretmenlerin diğer sınıflardaki dersleri dâhil tüm dersleri. */
  teacherLessons: Lesson[];
}

interface ProgramBoardProps {
  /** /program/[classId] adresinden gelen sınıf; liste yüklendiğinde seçilir. */
  initialClassId?: string;
}

export default function ProgramBoard({ initialClassId }: ProgramBoardProps) {
  const supabase = createClient();
  const toast = useToast();

  const [chosenClassId, setChosenClassId] = useState<string | null>(
    initialClassId ?? null
  );
  const [search, setSearch] = useState("");
  const [activeCard, setActiveCard] = useState<SubjectCard | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const loadOverview = useCallback(async (): Promise<ClassOverview> => {
    const [classResult, csResult, lessonResult] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("class_subjects").select("class_id, weekly_hours"),
      supabase.from("lessons").select("class_id"),
    ]);
    throwIfDbError(classResult, "Sınıflar okunamadı");
    throwIfDbError(csResult, "Sınıf dersleri okunamadı");
    throwIfDbError(lessonResult, "Program okunamadı");

    const totals = new Map<string, { placed: number; total: number }>();
    for (const cs of csResult.data ?? []) {
      const entry = totals.get(cs.class_id) ?? { placed: 0, total: 0 };
      entry.total += cs.weekly_hours;
      totals.set(cs.class_id, entry);
    }
    for (const lesson of lessonResult.data ?? []) {
      const entry = totals.get(lesson.class_id);
      if (entry) entry.placed += 1;
    }

    return { classes: classResult.data ?? [], totals };
  }, [supabase]);

  const overview = useAsyncData(loadOverview);
  const classes = useMemo(
    () => overview.data?.classes ?? [],
    [overview.data]
  );

  // Seçim yalnızca kullanıcı bir sınıfa tıkladığında saklanır; ilk sınıf
  // varsayılan olarak türetilir, böylece render sırasında state yazılmaz.
  const selectedClassId =
    chosenClassId && classes.some((c) => c.id === chosenClassId)
      ? chosenClassId
      : (classes[0]?.id ?? null);

  const loadClassDetail = useCallback(async (): Promise<ClassDetail | null> => {
    if (!selectedClassId) return null;

    const [daysResult, lessonsResult, csResult, teachersResult, tsResult] =
      await Promise.all([
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
        supabase.from("teacher_subjects").select("*, teacher:teachers(*)"),
      ]);

    throwIfDbError(daysResult, "Ders günleri okunamadı");
    throwIfDbError(lessonsResult, "Program okunamadı");
    throwIfDbError(csResult, "Sınıf dersleri okunamadı");
    throwIfDbError(teachersResult, "Öğretmenler okunamadı");
    throwIfDbError(tsResult, "Öğretmen dersleri okunamadı");

    const classSubjects = csResult.data ?? [];
    const teacherSubjects = tsResult.data ?? [];

    const subjectIds = new Set(classSubjects.map((cs) => cs.subject_id));
    const teacherIds = [
      ...new Set(
        [
          ...classSubjects.map((cs) => cs.teacher_id),
          ...teacherSubjects
            .filter((ts) => subjectIds.has(ts.subject_id))
            .map((ts) => ts.teacher_id),
        ].filter((id): id is string => Boolean(id))
      ),
    ];

    let teacherLessons: Lesson[] = [];
    if (teacherIds.length > 0) {
      const result = await supabase
        .from("lessons")
        .select("*")
        .in("teacher_id", teacherIds);
      throwIfDbError(result, "Öğretmen programları okunamadı");
      teacherLessons = result.data ?? [];
    }

    return {
      scheduleDays: daysResult.data ?? [],
      lessons: lessonsResult.data ?? [],
      classSubjects,
      teachers: teachersResult.data ?? [],
      teacherSubjects,
      teacherLessons,
    };
  }, [supabase, selectedClassId]);

  const detail = useAsyncData(loadClassDetail);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const scheduleDays = useMemo(
    () => detail.data?.scheduleDays ?? [],
    [detail.data]
  );
  const lessons = useMemo(() => detail.data?.lessons ?? [], [detail.data]);

  const filteredClasses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return classes;
    return classes.filter((c) => c.name.toLowerCase().includes(term));
  }, [classes, search]);

  const timeSlots = useMemo(() => buildTimeSlots(scheduleDays), [scheduleDays]);

  const cards = useMemo<SubjectCard[]>(() => {
    if (!detail.data) return [];
    const { classSubjects, teacherSubjects } = detail.data;

    return classSubjects
      .filter((cs) => cs.subject)
      .map((cs) => {
        const subject = cs.subject as Subject;
        const subjectLessons = lessons.filter(
          (lesson) => lesson.subject_id === cs.subject_id
        );

        let teacherId = cs.teacher_id ?? "";
        let teacherName = (cs.teacher as Teacher | undefined)?.name ?? "";

        // Sabit atama yoksa önce programa yerleşmiş dersin öğretmenine,
        // sonra bu dersi verebilen ilk öğretmene bak.
        if (!teacherId && subjectLessons.length > 0) {
          const lessonTeacher = subjectLessons[0].teacher as
            | Teacher
            | undefined;
          teacherId = lessonTeacher?.id ?? subjectLessons[0].teacher_id;
          teacherName = lessonTeacher?.name ?? "";
        }
        if (!teacherId) {
          const match = teacherSubjects.find(
            (ts) => ts.subject_id === cs.subject_id
          );
          if (match) {
            teacherId = match.teacher_id;
            teacherName = (match.teacher as Teacher | undefined)?.name ?? "";
          }
        }

        return {
          subjectId: cs.subject_id,
          teacherId,
          subjectName: subject.name,
          subjectColor: subject.color,
          teacherName: teacherName || "Atanmamış",
          weeklyHours: cs.weekly_hours,
          placedCount: subjectLessons.length,
        };
      })
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "tr"));
  }, [detail.data, lessons]);

  const activeCardState = activeCard
    ? (cards.find(
        (card) =>
          card.subjectId === activeCard.subjectId &&
          card.teacherId === activeCard.teacherId
      ) ?? null)
    : null;

  const totalPlaced = cards.reduce((sum, card) => sum + card.placedCount, 0);
  const totalWeekly = cards.reduce((sum, card) => sum + card.weeklyHours, 0);

  const blockerFor = (dayOfWeek: number, slot: TimeSlot) => {
    if (!activeCardState || !selectedClassId || !detail.data) return null;
    const teacher = detail.data.teachers.find(
      (t) => t.id === activeCardState.teacherId
    );
    return checkPlacement({
      dayOfWeek,
      startTime: slot.start,
      classId: selectedClassId,
      teacherId: activeCardState.teacherId,
      scheduleDays,
      classLessons: lessons,
      teacherLessons: detail.data.teacherLessons,
      teacherOffDays: teacher?.off_days ?? [],
      weeklyHours: activeCardState.weeklyHours,
      placedCount: activeCardState.placedCount,
    });
  };

  const refresh = () => {
    detail.reload();
    overview.reload();
  };

  const handlePlace = async (dayOfWeek: number, slot: TimeSlot) => {
    if (!activeCardState || !selectedClassId) return;
    const { error } = await supabase.from("lessons").insert({
      class_id: selectedClassId,
      subject_id: activeCardState.subjectId,
      teacher_id: activeCardState.teacherId,
      day_of_week: dayOfWeek,
      start_time: slot.start,
      end_time: slot.end,
    });
    if (error) {
      toast.error(describeDbError(error));
      refresh();
      return;
    }
    setHasChanges(true);
    refresh();
  };

  const handleRemove = async (lessonId: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (error) {
      toast.error(describeDbError(error));
      return;
    }
    setHasChanges(true);
    refresh();
  };

  const handleClassSwitch = (classId: string) => {
    if (classId === selectedClassId) return;
    if (
      hasChanges &&
      !window.confirm(
        "Bu sınıfta değişiklik yaptınız. Başka sınıfa geçmek istediğinize emin misiniz?"
      )
    ) {
      return;
    }
    setChosenClassId(classId);
    setActiveCard(null);
    setHasChanges(false);
  };

  const toggleCard = (card: SubjectCard) => {
    setActiveCard((current) =>
      current?.subjectId === card.subjectId &&
      current?.teacherId === card.teacherId
        ? null
        : card
    );
  };

  const getCell = (dayOfWeek: number, slot: TimeSlot): GridCell => {
    if (!isSlotWithinClassDay(scheduleDays, dayOfWeek, slot.start)) {
      return { kind: "unavailable" };
    }

    const lesson = findLessonAt(lessons, dayOfWeek, slot.start);
    if (lesson) {
      const subject = lesson.subject as Subject | undefined;
      const teacher = lesson.teacher as Teacher | undefined;
      return {
        kind: "lesson",
        color: subject?.color ?? "#3B82F6",
        primary:
          subject?.short_name ||
          subject?.name?.slice(0, 3).toUpperCase() ||
          "?",
        secondary: teacher?.name
          ? teacher.name
              .split(" ")
              .map((part) => part[0])
              .join("")
          : undefined,
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
        Sınıflar yüklenemedi: {overview.error.message}
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
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sınıf Ara..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-gray-900"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            {filteredClasses.map((cls, i) => {
              const isSelected = cls.id === selectedClassId;
              const totals = overview.data?.totals.get(cls.id);
              const incomplete = totals ? totals.placed < totals.total : false;
              return (
                <button
                  key={cls.id}
                  onClick={() => handleClassSwitch(cls.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all mb-0.5 ${
                    isSelected
                      ? "bg-teal-50 border border-teal-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold ${
                      isSelected
                        ? "bg-teal-500 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-sm font-medium truncate ${
                      isSelected ? "text-teal-700" : "text-gray-700"
                    }`}
                  >
                    {cls.name}
                  </span>
                  {incomplete && (
                    <span
                      className="text-red-500 text-sm ml-auto flex-shrink-0"
                      title="Haftalık ders saatleri tamamlanmadı"
                    >
                      *
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

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
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50 transition-colors"
                >
                  Saatleri Düzenle
                </Link>
              </div>

              {detail.error ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <p className="text-red-600 text-sm">
                    {detail.error.message}
                  </p>
                </div>
              ) : detail.loading && !detail.data ? (
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
                  <ScheduleGrid slots={timeSlots} getCell={getCell} />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
              Önce bir sınıf ekleyin.
            </div>
          )}
        </div>

        <div className="w-64 flex-shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 self-stretch max-h-[calc(100vh-160px)] sticky top-4">
          <div className="p-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-900">
              Sınıfın Dersleri
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5">
            {!detail.loading && cards.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Bu sınıfa ders atanmamış.
              </p>
            ) : (
              cards.map((card) => {
                const isActive =
                  activeCardState?.subjectId === card.subjectId &&
                  activeCardState?.teacherId === card.teacherId;
                const isComplete =
                  card.weeklyHours > 0 && card.placedCount >= card.weeklyHours;
                const percent =
                  card.weeklyHours > 0
                    ? Math.min(100, (card.placedCount / card.weeklyHours) * 100)
                    : 0;

                return (
                  <button
                    key={`${card.subjectId}-${card.teacherId}`}
                    onClick={() => toggleCard(card)}
                    className={`w-full text-left rounded-xl p-3 mb-2 border-2 transition-all ${
                      isActive
                        ? "border-teal-400 shadow-md bg-teal-50/50"
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
                        <h3 className="font-bold text-sm text-gray-900 truncate">
                          {card.subjectName}
                        </h3>
                        <p
                          className={`text-xs mt-0.5 ${
                            card.teacherId ? "text-gray-400" : "text-amber-600"
                          }`}
                        >
                          {card.teacherName}
                        </p>
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
