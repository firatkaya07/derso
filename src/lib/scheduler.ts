import type {
  Subject,
  ClassGroup,
  ClassScheduleDay,
  TeacherSubject,
  Teacher,
} from "./types";
import { generateTimeSlots } from "./types";

export interface ClassSubjectInput {
  classId: string;
  subjectId: string;
  subjectName: string;
  weeklyHours: number;
  teacherId?: string | null;
}

export interface ScheduleRules {
  splitRules: Record<number, number[]>;
}

export const DEFAULT_RULES: ScheduleRules = {
  splitRules: {
    1: [1],
    2: [2],
    3: [2, 1],
    4: [2, 2],
    5: [2, 2, 1],
    6: [2, 2, 2],
  },
};

export interface GeneratedLesson {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleResult {
  lessons: GeneratedLesson[];
  errors: string[];
  warnings: string[];
}

function splitHours(hours: number, rules: Record<number, number[]>): number[] {
  if (rules[hours]) return [...rules[hours]];
  const result: number[] = [];
  let remaining = hours;
  while (remaining > 0) {
    if (remaining >= 2) {
      result.push(2);
      remaining -= 2;
    } else {
      result.push(1);
      remaining -= 1;
    }
  }
  return result;
}

interface LessonBlock {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  blockSize: number;
  preAssignedTeacherId?: string;
}

function slotKey(dayOfWeek: number, startTime: string): string {
  return `${dayOfWeek}:${startTime}`;
}

function csdKey(classId: string, subjectId: string, day: number): string {
  return `${classId}:${subjectId}:${day}`;
}

class ScheduleState {
  lessons: GeneratedLesson[] = [];
  classSlots = new Map<string, Set<string>>();
  subjectSlotCount = new Map<string, number>();
  classDaySubjectHours = new Map<string, number>();
  classDaySubjectSlots = new Map<string, string[]>();
  preAssignedTeacherSlots = new Map<string, Set<string>>();
  // Map from blockKey (classId:subjectId:blockIdx) to lesson indices
  blockLessons = new Map<string, number[]>();
  slotSubjectCounts = new Map<string, Map<string, number>>();

  isClassSlotFree(classId: string, day: number, time: string): boolean {
    const set = this.classSlots.get(classId);
    return !set || !set.has(slotKey(day, time));
  }

  occupyClassSlot(classId: string, day: number, time: string) {
    if (!this.classSlots.has(classId))
      this.classSlots.set(classId, new Set());
    this.classSlots.get(classId)!.add(slotKey(day, time));
  }

  freeClassSlot(classId: string, day: number, time: string) {
    this.classSlots.get(classId)?.delete(slotKey(day, time));
  }

  getSubjectSlotUsage(subjectId: string, day: number, time: string): number {
    return this.subjectSlotCount.get(`${subjectId}:${slotKey(day, time)}`) || 0;
  }

  addSubjectSlotUsage(subjectId: string, day: number, time: string) {
    const k = `${subjectId}:${slotKey(day, time)}`;
    this.subjectSlotCount.set(k, (this.subjectSlotCount.get(k) || 0) + 1);
    const sk = slotKey(day, time);
    if (!this.slotSubjectCounts.has(sk))
      this.slotSubjectCounts.set(sk, new Map());
    const m = this.slotSubjectCounts.get(sk)!;
    m.set(subjectId, (m.get(subjectId) || 0) + 1);
  }

  removeSubjectSlotUsage(subjectId: string, day: number, time: string) {
    const k = `${subjectId}:${slotKey(day, time)}`;
    const v = (this.subjectSlotCount.get(k) || 0) - 1;
    if (v <= 0) this.subjectSlotCount.delete(k);
    else this.subjectSlotCount.set(k, v);
    const sk = slotKey(day, time);
    const m = this.slotSubjectCounts.get(sk);
    if (m) {
      const sv = (m.get(subjectId) || 0) - 1;
      if (sv <= 0) m.delete(subjectId);
      else m.set(subjectId, sv);
      if (m.size === 0) this.slotSubjectCounts.delete(sk);
    }
  }

  getDaySubjectHours(classId: string, subjectId: string, day: number): number {
    return this.classDaySubjectHours.get(csdKey(classId, subjectId, day)) || 0;
  }

  addDaySubjectHours(
    classId: string,
    subjectId: string,
    day: number,
    hours: number
  ) {
    const k = csdKey(classId, subjectId, day);
    this.classDaySubjectHours.set(
      k,
      (this.classDaySubjectHours.get(k) || 0) + hours
    );
  }

  removeDaySubjectHours(
    classId: string,
    subjectId: string,
    day: number,
    hours: number
  ) {
    const k = csdKey(classId, subjectId, day);
    const v = (this.classDaySubjectHours.get(k) || 0) - hours;
    if (v <= 0) this.classDaySubjectHours.delete(k);
    else this.classDaySubjectHours.set(k, v);
  }

  getDaySubjectSlots(
    classId: string,
    subjectId: string,
    day: number
  ): string[] {
    return this.classDaySubjectSlots.get(csdKey(classId, subjectId, day)) || [];
  }

  addDaySubjectSlot(
    classId: string,
    subjectId: string,
    day: number,
    startTime: string
  ) {
    const k = csdKey(classId, subjectId, day);
    const arr = this.classDaySubjectSlots.get(k) || [];
    arr.push(startTime);
    this.classDaySubjectSlots.set(k, arr);
  }

  removeDaySubjectSlot(
    classId: string,
    subjectId: string,
    day: number,
    startTime: string
  ) {
    const k = csdKey(classId, subjectId, day);
    const arr = this.classDaySubjectSlots.get(k);
    if (arr) {
      const idx = arr.indexOf(startTime);
      if (idx >= 0) arr.splice(idx, 1);
    }
  }

  isPreAssignedTeacherFree(
    teacherId: string,
    day: number,
    time: string
  ): boolean {
    const set = this.preAssignedTeacherSlots.get(teacherId);
    return !set || !set.has(slotKey(day, time));
  }

  occupyPreAssignedTeacher(teacherId: string, day: number, time: string) {
    if (!this.preAssignedTeacherSlots.has(teacherId))
      this.preAssignedTeacherSlots.set(teacherId, new Set());
    this.preAssignedTeacherSlots.get(teacherId)!.add(slotKey(day, time));
  }

  freePreAssignedTeacher(teacherId: string, day: number, time: string) {
    this.preAssignedTeacherSlots.get(teacherId)?.delete(slotKey(day, time));
  }

  addLesson(lesson: GeneratedLesson, blockKey: string) {
    const idx = this.lessons.length;
    this.lessons.push(lesson);
    if (!this.blockLessons.has(blockKey))
      this.blockLessons.set(blockKey, []);
    this.blockLessons.get(blockKey)!.push(idx);
  }

  removeBlockLessons(blockKey: string): GeneratedLesson[] {
    const indices = this.blockLessons.get(blockKey);
    if (!indices) return [];
    const removed: GeneratedLesson[] = [];
    for (const idx of indices) {
      const l = this.lessons[idx];
      if (!l) continue;
      removed.push({ ...l });
      this.freeClassSlot(l.classId, l.dayOfWeek, l.startTime);
      this.removeSubjectSlotUsage(l.subjectId, l.dayOfWeek, l.startTime);
      this.removeDaySubjectSlot(
        l.classId,
        l.subjectId,
        l.dayOfWeek,
        l.startTime
      );
    }
    if (removed.length > 0) {
      const days = [...new Set(removed.map((l) => l.dayOfWeek))];
      for (const day of days) {
        const count = removed.filter((l) => l.dayOfWeek === day).length;
        this.removeDaySubjectHours(
          removed[0].classId,
          removed[0].subjectId,
          day,
          count
        );
      }
    }
    // Null out removed lessons (we'll filter later)
    for (const idx of indices) {
      (this.lessons as (GeneratedLesson | null)[])[idx] = null;
    }
    this.blockLessons.delete(blockKey);
    return removed;
  }

  getCleanLessons(): GeneratedLesson[] {
    return this.lessons.filter(
      (l): l is GeneratedLesson => l !== null
    );
  }
}

export function autoSchedule(
  classes: ClassGroup[],
  scheduleDays: ClassScheduleDay[],
  subjects: Subject[],
  classSubjects: ClassSubjectInput[],
  rules: ScheduleRules,
  teacherSubjects?: TeacherSubject[],
  teachers?: Teacher[],
  seed?: number,
  swapDepth?: number
): ScheduleResult {
  const warnings: string[] = [];

  const classDaysMap = new Map<string, ClassScheduleDay[]>();
  for (const sd of scheduleDays) {
    const arr = classDaysMap.get(sd.class_id) || [];
    arr.push(sd);
    classDaysMap.set(sd.class_id, arr);
  }

  const classMap = new Map<string, ClassGroup>();
  for (const c of classes) classMap.set(c.id, c);

  const subjectMap = new Map<string, Subject>();
  for (const s of subjects) subjectMap.set(s.id, s);

  const teacherMap = new Map<string, Teacher>();
  if (teachers) {
    for (const t of teachers) teacherMap.set(t.id, t);
  }

  const teacherCountBySubject = new Map<string, number>();
  const teacherCountBySubjectDay = new Map<string, number>();

  if (teacherSubjects) {
    const teacherSets = new Map<string, Set<string>>();
    for (const ts of teacherSubjects) {
      if (!teacherSets.has(ts.subject_id))
        teacherSets.set(ts.subject_id, new Set());
      teacherSets.get(ts.subject_id)!.add(ts.teacher_id);
    }
    for (const [subId, set] of teacherSets) {
      teacherCountBySubject.set(subId, set.size);
      if (teachers) {
        for (let day = 0; day < 7; day++) {
          let available = 0;
          for (const tid of set) {
            const teacher = teacherMap.get(tid);
            if (
              !teacher ||
              !teacher.off_days ||
              !teacher.off_days.includes(day)
            ) {
              available++;
            }
          }
          teacherCountBySubjectDay.set(`${subId}:${day}`, available);
        }
      }
    }
  }

  // Teacher-aware scheduling: per-subject-day available teacher sets
  const subjectDayTeacherSet = new Map<string, Set<string>>();
  if (teacherSubjects && teachers) {
    const subjectTeacherSet = new Map<string, Set<string>>();
    for (const ts of teacherSubjects) {
      if (!subjectTeacherSet.has(ts.subject_id))
        subjectTeacherSet.set(ts.subject_id, new Set());
      subjectTeacherSet.get(ts.subject_id)!.add(ts.teacher_id);
    }
    for (const [subId, tids] of subjectTeacherSet) {
      for (let day = 0; day < 7; day++) {
        const available = new Set<string>();
        for (const tid of tids) {
          const t = teacherMap.get(tid);
          if (!t || !t.off_days || !t.off_days.includes(day))
            available.add(tid);
        }
        if (available.size > 0)
          subjectDayTeacherSet.set(`${subId}:${day}`, available);
      }
    }
  }

  function maxBipartiteMatching(
    adj: number[][],
    leftCount: number,
    rightCount: number
  ): number {
    const matchR = new Array(rightCount).fill(-1);
    function tryAugment(u: number, visited: Uint8Array): boolean {
      for (const v of adj[u]) {
        if (visited[v]) continue;
        visited[v] = 1;
        if (matchR[v] === -1 || tryAugment(matchR[v], visited)) {
          matchR[v] = u;
          return true;
        }
      }
      return false;
    }
    let matched = 0;
    for (let u = 0; u < leftCount; u++) {
      const visited = new Uint8Array(rightCount);
      if (tryAugment(u, visited)) matched++;
    }
    return matched;
  }

  function isSlotTeacherFeasible(
    state: ScheduleState,
    day: number,
    time: string,
    extraSubjectId?: string
  ): boolean {
    if (subjectDayTeacherSet.size === 0) return true;
    const sk = slotKey(day, time);
    const subjectCounts = new Map<string, number>();
    const existing = state.slotSubjectCounts.get(sk);
    if (existing) {
      for (const [subId, cnt] of existing) subjectCounts.set(subId, cnt);
    }
    if (extraSubjectId) {
      subjectCounts.set(
        extraSubjectId,
        (subjectCounts.get(extraSubjectId) || 0) + 1
      );
    }
    if (subjectCounts.size === 0) return true;

    const allTeacherIds = new Set<string>();
    for (const [subId] of subjectCounts) {
      const ts = subjectDayTeacherSet.get(`${subId}:${day}`);
      if (ts) for (const t of ts) allTeacherIds.add(t);
    }
    const teacherArr = [...allTeacherIds];
    if (teacherArr.length === 0) return false;
    const teacherIdx = new Map<string, number>();
    teacherArr.forEach((id, i) => teacherIdx.set(id, i));

    let leftCount = 0;
    const adj: number[][] = [];
    for (const [subId, count] of subjectCounts) {
      const ts = subjectDayTeacherSet.get(`${subId}:${day}`);
      const rightIndices: number[] = [];
      if (ts) {
        for (const t of ts) {
          const idx = teacherIdx.get(t);
          if (idx !== undefined) rightIndices.push(idx);
        }
      }
      if (rightIndices.length === 0) return false;
      for (let i = 0; i < count; i++) {
        adj.push(rightIndices);
        leftCount++;
      }
    }
    if (leftCount === 0) return true;
    if (leftCount > teacherArr.length) return false;
    return maxBipartiteMatching(adj, leftCount, teacherArr.length) === leftCount;
  }

  function getMaxConcurrent(subjectId: string, day: number): number {
    if (teacherCountBySubjectDay.size > 0) {
      const dayCount = teacherCountBySubjectDay.get(`${subjectId}:${day}`);
      if (dayCount !== undefined) return dayCount;
    }
    const total = teacherCountBySubject.get(subjectId);
    if (total !== undefined) return total;
    return Infinity;
  }

  // Build all blocks
  const allBlocks: LessonBlock[] = [];
  let blockIdx = 0;
  for (const cs of classSubjects) {
    const cls = classMap.get(cs.classId);
    const sub = subjectMap.get(cs.subjectId);
    if (!cls || !sub) continue;

    const splits = splitHours(cs.weeklyHours, rules.splitRules);
    for (const blockSize of splits) {
      allBlocks.push({
        classId: cs.classId,
        className: cls.name,
        subjectId: cs.subjectId,
        subjectName: sub.name,
        blockSize,
        preAssignedTeacherId: cs.teacherId || undefined,
      });
      blockIdx++;
    }
  }

  function makeBlockKey(block: LessonBlock, idx: number): string {
    return `${block.classId}:${block.subjectId}:${idx}`;
  }

  function canPlaceBlock(
    state: ScheduleState,
    block: LessonBlock,
    day: number,
    slots: { start: string; end: string }[],
    startIdx: number
  ): boolean {
    const maxConcurrent = getMaxConcurrent(block.subjectId, day);
    for (let i = 0; i < block.blockSize; i++) {
      if (!state.isClassSlotFree(block.classId, day, slots[startIdx + i].start))
        return false;

      if (maxConcurrent !== Infinity) {
        const usage = state.getSubjectSlotUsage(
          block.subjectId,
          day,
          slots[startIdx + i].start
        );
        if (usage >= maxConcurrent) return false;
      }

      if (block.preAssignedTeacherId) {
        if (
          !state.isPreAssignedTeacherFree(
            block.preAssignedTeacherId,
            day,
            slots[startIdx + i].start
          )
        )
          return false;
      }

      if (
        !isSlotTeacherFeasible(
          state,
          day,
          slots[startIdx + i].start,
          block.subjectId
        )
      )
        return false;
    }
    return true;
  }

  function isAdjacentToExisting(
    state: ScheduleState,
    block: LessonBlock,
    day: number,
    slots: { start: string; end: string }[],
    startIdx: number
  ): boolean {
    const existing = state.getDaySubjectSlots(
      block.classId,
      block.subjectId,
      day
    );
    if (existing.length === 0) return true;

    const blockStart = slots[startIdx].start;
    const blockEnd = slots[startIdx + block.blockSize - 1].end;

    const existingSorted = [...existing].sort();
    const lastExistingStart = existingSorted[existingSorted.length - 1];
    const lastSlotIdx = slots.findIndex((s) => s.start === lastExistingStart);
    if (lastSlotIdx >= 0 && blockStart === slots[lastSlotIdx].end) return true;

    const firstExistingStart = existingSorted[0];
    if (blockEnd === firstExistingStart) return true;

    return false;
  }

  function placeBlock(
    state: ScheduleState,
    block: LessonBlock,
    blockKey: string,
    day: number,
    slots: { start: string; end: string }[],
    startIdx: number
  ) {
    for (let i = 0; i < block.blockSize; i++) {
      const slot = slots[startIdx + i];
      state.occupyClassSlot(block.classId, day, slot.start);
      state.addSubjectSlotUsage(block.subjectId, day, slot.start);
      state.addDaySubjectSlot(block.classId, block.subjectId, day, slot.start);
      if (block.preAssignedTeacherId) {
        state.occupyPreAssignedTeacher(
          block.preAssignedTeacherId,
          day,
          slot.start
        );
      }
      state.addLesson(
        {
          classId: block.classId,
          className: block.className,
          subjectId: block.subjectId,
          subjectName: block.subjectName,
          teacherId: "",
          teacherName: "",
          dayOfWeek: day,
          startTime: slot.start,
          endTime: slot.end,
        },
        blockKey
      );
    }
    state.addDaySubjectHours(block.classId, block.subjectId, day, block.blockSize);
  }

  function tryPlaceBlock(
    state: ScheduleState,
    block: LessonBlock,
    blockKey: string,
    classDays: ClassScheduleDay[],
    allowExceedDayLimit: boolean
  ): boolean {
    let availableDays = classDays;
    if (block.preAssignedTeacherId) {
      const teacher = teacherMap.get(block.preAssignedTeacherId);
      if (teacher?.off_days && teacher.off_days.length > 0) {
        const filtered = classDays.filter(
          (d) => !teacher.off_days.includes(d.day_of_week)
        );
        if (filtered.length > 0) availableDays = filtered;
      }
    }

    const dayOrder = [...availableDays].sort((a, b) => {
      const aHours = state.getDaySubjectHours(
        block.classId,
        block.subjectId,
        a.day_of_week
      );
      const bHours = state.getDaySubjectHours(
        block.classId,
        block.subjectId,
        b.day_of_week
      );
      if (aHours !== bHours) return aHours - bHours;

      const aSet = state.classSlots.get(block.classId);
      const aCount = aSet
        ? [...aSet].filter((k) => k.startsWith(`${a.day_of_week}:`)).length
        : 0;
      const bCount = aSet
        ? [...aSet].filter((k) => k.startsWith(`${b.day_of_week}:`)).length
        : 0;
      return aCount - bCount;
    });

    for (const day of dayOrder) {
      const currentHours = state.getDaySubjectHours(
        block.classId,
        block.subjectId,
        day.day_of_week
      );
      if (!allowExceedDayLimit && currentHours + block.blockSize > 2) continue;

      const slots = generateTimeSlots(
        day.start_time.slice(0, 5),
        day.end_time.slice(0, 5)
      );

      for (
        let startIdx = 0;
        startIdx <= slots.length - block.blockSize;
        startIdx++
      ) {
        if (!canPlaceBlock(state, block, day.day_of_week, slots, startIdx))
          continue;
        if (
          currentHours > 0 &&
          !isAdjacentToExisting(state, block, day.day_of_week, slots, startIdx)
        )
          continue;

        placeBlock(state, block, blockKey, day.day_of_week, slots, startIdx);
        return true;
      }
    }
    return false;
  }

  // --- Main scheduling ---
  const state = new ScheduleState();

  // Shuffle with seed
  const blocks = [...allBlocks];
  if (seed !== undefined && seed > 0) {
    let s = seed;
    for (let i = blocks.length - 1; i > 0; i--) {
      s = ((s * 1103515245 + 12345) & 0x7fffffff) >>> 0;
      const j = s % (i + 1);
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    }
  }

  // Compute risk score: demand (total weekly hours for subject) / capacity (teacher count)
  const subjectDemand = new Map<string, number>();
  for (const cs of classSubjects) {
    subjectDemand.set(
      cs.subjectId,
      (subjectDemand.get(cs.subjectId) || 0) + cs.weeklyHours
    );
  }

  function getRiskScore(block: LessonBlock): number {
    const demand = subjectDemand.get(block.subjectId) || 0;
    const capacity = teacherCountBySubject.get(block.subjectId) || 999;
    return demand / capacity;
  }

  // Pre-assigned first, then by risk (highest demand/capacity ratio first)
  blocks.sort((a, b) => {
    const aPre = a.preAssignedTeacherId ? 1 : 0;
    const bPre = b.preAssignedTeacherId ? 1 : 0;
    if (aPre !== bPre) return bPre - aPre;
    const aRisk = getRiskScore(a);
    const bRisk = getRiskScore(b);
    if (aRisk !== bRisk) return bRisk - aRisk;
    const aT = teacherCountBySubject.get(a.subjectId) || 999;
    const bT = teacherCountBySubject.get(b.subjectId) || 999;
    if (aT !== bT) return aT - bT;
    return b.blockSize - a.blockSize;
  });

  // Keep block index mapping for blockKeys
  const blockKeyMap = new Map<LessonBlock, string>();
  blocks.forEach((b, i) => blockKeyMap.set(b, makeBlockKey(b, i)));

  const failedBlocks: { block: LessonBlock; key: string }[] = [];
  const errors: string[] = [];

  for (const block of blocks) {
    const classDays = classDaysMap.get(block.classId) || [];
    if (classDays.length === 0) {
      errors.push(
        `${block.className}: Ders günü tanımlanmamış, ${block.subjectName} yerleştirilemedi.`
      );
      continue;
    }

    const key = blockKeyMap.get(block)!;
    let placed = tryPlaceBlock(state, block, key, classDays, false);
    if (!placed) {
      placed = tryPlaceBlock(state, block, key, classDays, true);
      if (placed) {
        warnings.push(
          `${block.className} - ${block.subjectName}: Aynı gün 2 saatten fazla verildi.`
        );
      }
    }
    if (!placed) {
      failedBlocks.push({ block, key });
    }
  }

  // --- Swap optimization ---
  const depth = swapDepth ?? 30;

  function restoreBlock(
    blockerBlock: LessonBlock,
    blockerKey: string,
    removedLessons: GeneratedLesson[]
  ) {
    for (const rl of removedLessons) {
      state.occupyClassSlot(rl.classId, rl.dayOfWeek, rl.startTime);
      state.addSubjectSlotUsage(rl.subjectId, rl.dayOfWeek, rl.startTime);
      state.addDaySubjectSlot(
        rl.classId,
        rl.subjectId,
        rl.dayOfWeek,
        rl.startTime
      );
      if (blockerBlock.preAssignedTeacherId) {
        state.occupyPreAssignedTeacher(
          blockerBlock.preAssignedTeacherId,
          rl.dayOfWeek,
          rl.startTime
        );
      }
      state.addLesson(rl, blockerKey);
    }
    const daySet = new Set(removedLessons.map((l) => l.dayOfWeek));
    for (const d of daySet) {
      const cnt = removedLessons.filter((l) => l.dayOfWeek === d).length;
      state.addDaySubjectHours(
        blockerBlock.classId,
        blockerBlock.subjectId,
        d,
        cnt
      );
    }
  }

  function trySwap(
    failedBlock: LessonBlock,
    failedKey: string,
    blockerKey: string
  ): boolean {
    const blockerBlock = blocks.find(
      (b) => blockKeyMap.get(b) === blockerKey
    );
    if (!blockerBlock) return false;

    const removedLessons = state.removeBlockLessons(blockerKey);
    if (removedLessons.length === 0) return false;

    if (blockerBlock.preAssignedTeacherId) {
      for (const rl of removedLessons) {
        state.freePreAssignedTeacher(
          blockerBlock.preAssignedTeacherId,
          rl.dayOfWeek,
          rl.startTime
        );
      }
    }

    const fClassDays = classDaysMap.get(failedBlock.classId) || [];
    const failedPlaced = tryPlaceBlock(
      state,
      failedBlock,
      failedKey,
      fClassDays,
      false
    );

    if (failedPlaced) {
      const blockerDays = classDaysMap.get(blockerBlock.classId) || [];
      const blockerPlaced = tryPlaceBlock(
        state,
        blockerBlock,
        blockerKey,
        blockerDays,
        false
      );

      if (blockerPlaced) return true;

      // Blocker couldn't be re-placed: undo
      state.removeBlockLessons(failedKey);
      const bDays = classDaysMap.get(blockerBlock.classId) || [];
      if (!tryPlaceBlock(state, blockerBlock, blockerKey, bDays, true)) {
        restoreBlock(blockerBlock, blockerKey, removedLessons);
      }
    } else {
      restoreBlock(blockerBlock, blockerKey, removedLessons);
    }
    return false;
  }

  function findBlockerKeys(
    failedBlock: LessonBlock,
    dayOfWeek: number,
    slots: { start: string; end: string }[],
    startIdx: number,
    mode: "class" | "capacity"
  ): Set<string> {
    const result = new Set<string>();
    for (const [bk, indices] of state.blockLessons) {
      for (const idx of indices) {
        const l = state.lessons[idx];
        if (!l) continue;
        if (mode === "class" && l.classId !== failedBlock.classId) continue;
        if (
          mode === "capacity" &&
          (l.subjectId !== failedBlock.subjectId ||
            l.classId === failedBlock.classId)
        )
          continue;
        for (let i = 0; i < failedBlock.blockSize; i++) {
          if (
            l.dayOfWeek === dayOfWeek &&
            l.startTime === slots[startIdx + i].start
          ) {
            result.add(bk);
          }
        }
      }
    }
    return result;
  }

  if (failedBlocks.length > 0 && depth > 0) {
    for (let iter = 0; iter < depth && failedBlocks.length > 0; iter++) {
      let anyResolved = false;

      for (let fi = failedBlocks.length - 1; fi >= 0; fi--) {
        const { block: failedBlock, key: failedKey } = failedBlocks[fi];
        const fClassDays = classDaysMap.get(failedBlock.classId) || [];
        if (fClassDays.length === 0) continue;

        let resolved = false;

        for (const day of fClassDays) {
          if (resolved) break;
          const slots = generateTimeSlots(
            day.start_time.slice(0, 5),
            day.end_time.slice(0, 5)
          );

          for (
            let startIdx = 0;
            startIdx <= slots.length - failedBlock.blockSize;
            startIdx++
          ) {
            if (resolved) break;

            let capacityBlocked = false;
            let classBlocked = false;
            let preTeacherBlocked = false;

            for (let i = 0; i < failedBlock.blockSize; i++) {
              const s = slots[startIdx + i].start;
              if (
                !state.isClassSlotFree(
                  failedBlock.classId,
                  day.day_of_week,
                  s
                )
              )
                classBlocked = true;
              const maxC = getMaxConcurrent(
                failedBlock.subjectId,
                day.day_of_week
              );
              if (
                maxC !== Infinity &&
                state.getSubjectSlotUsage(
                  failedBlock.subjectId,
                  day.day_of_week,
                  s
                ) >= maxC
              )
                capacityBlocked = true;
              if (
                failedBlock.preAssignedTeacherId &&
                !state.isPreAssignedTeacherFree(
                  failedBlock.preAssignedTeacherId,
                  day.day_of_week,
                  s
                )
              )
                preTeacherBlocked = true;
            }

            if (!classBlocked && !capacityBlocked && !preTeacherBlocked)
              continue;
            if (preTeacherBlocked) continue;

            // Try class-slot swap
            if (classBlocked) {
              const blockerKeys = findBlockerKeys(
                failedBlock,
                day.day_of_week,
                slots,
                startIdx,
                "class"
              );
              for (const bk of blockerKeys) {
                if (trySwap(failedBlock, failedKey, bk)) {
                  resolved = true;
                  break;
                }
              }
            }

            // Try capacity swap (move same-subject block from another class)
            if (!resolved && capacityBlocked) {
              const blockerKeys = findBlockerKeys(
                failedBlock,
                day.day_of_week,
                slots,
                startIdx,
                "capacity"
              );
              for (const bk of blockerKeys) {
                if (trySwap(failedBlock, failedKey, bk)) {
                  resolved = true;
                  break;
                }
              }
            }
          }
        }

        if (resolved) {
          failedBlocks.splice(fi, 1);
          anyResolved = true;
        }
      }

      if (!anyResolved) break;
    }
  }

  // Post-placement: verify teacher feasibility and re-place infeasible blocks
  if (subjectDayTeacherSet.size > 0) {
    for (let repass = 0; repass < 3; repass++) {
      const infeasibleBks = new Set<string>();
      const checkedSlots = new Set<string>();

      for (const [bk, indices] of state.blockLessons) {
        for (const idx of indices) {
          const l = state.lessons[idx];
          if (!l) continue;
          const sk = slotKey(l.dayOfWeek, l.startTime);
          if (checkedSlots.has(sk)) continue;
          checkedSlots.add(sk);
          if (!isSlotTeacherFeasible(state, l.dayOfWeek, l.startTime)) {
            for (const [bk2, indices2] of state.blockLessons) {
              for (const idx2 of indices2) {
                const l2 = state.lessons[idx2];
                if (
                  l2 &&
                  l2.dayOfWeek === l.dayOfWeek &&
                  l2.startTime === l.startTime
                )
                  infeasibleBks.add(bk2);
              }
            }
          }
        }
      }
      if (infeasibleBks.size === 0) break;

      let anyFixed = false;
      for (const bk of infeasibleBks) {
        const block = blocks.find((b) => blockKeyMap.get(b) === bk);
        if (!block) continue;

        const blockIndices = state.blockLessons.get(bk);
        if (!blockIndices) continue;
        let stillBad = false;
        for (const idx of blockIndices) {
          const l = state.lessons[idx];
          if (l && !isSlotTeacherFeasible(state, l.dayOfWeek, l.startTime)) {
            stillBad = true;
            break;
          }
        }
        if (!stillBad) continue;

        const removed = state.removeBlockLessons(bk);
        if (removed.length === 0) continue;
        if (block.preAssignedTeacherId) {
          for (const rl of removed)
            state.freePreAssignedTeacher(
              block.preAssignedTeacherId,
              rl.dayOfWeek,
              rl.startTime
            );
        }

        const cDays = classDaysMap.get(block.classId) || [];
        let rePlaced = tryPlaceBlock(state, block, bk, cDays, false);
        if (!rePlaced)
          rePlaced = tryPlaceBlock(state, block, bk, cDays, true);

        if (rePlaced) {
          const newIndices = state.blockLessons.get(bk);
          let newOk = true;
          if (newIndices) {
            for (const idx of newIndices) {
              const l = state.lessons[idx];
              if (
                l &&
                !isSlotTeacherFeasible(state, l.dayOfWeek, l.startTime)
              ) {
                newOk = false;
                break;
              }
            }
          }
          if (newOk) {
            anyFixed = true;
          } else {
            state.removeBlockLessons(bk);
            restoreBlock(block, bk, removed);
          }
        } else {
          restoreBlock(block, bk, removed);
        }
      }
      if (!anyFixed) break;
    }
  }

  // Build final errors for remaining failed blocks
  for (const { block } of failedBlocks) {
    errors.push(
      `${block.className} - ${block.subjectName} (${block.blockSize} ders): Uygun slot bulunamadı.`
    );
  }

  return { lessons: state.getCleanLessons(), errors, warnings };
}
