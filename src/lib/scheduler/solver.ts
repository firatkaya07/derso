import type { Model, Position } from "./model";
import { MAX_HOURS_PER_SUBJECT_PER_DAY } from "./model";

export interface SolveOptions {
  seed?: number;
  /** Sıfırdan kurulup onarılacak çözüm sayısı. */
  restarts?: number;
  /** Bir onarım turundaki en fazla adım sayısı. */
  maxIterations?: number;
  /** Toplam süre sınırı; aşılınca eldeki en iyi çözüm döner. */
  timeLimitMs?: number;
  /** Her yeniden başlatma sonrası çağrılır; ilerleme göstermek için. */
  onProgress?: (progress: SolveProgress) => void;
}

export interface SolveProgress {
  restart: number;
  restarts: number;
  placedHours: number;
  totalHours: number;
}

export interface Solution {
  /** blockId -> yerleştiği konum; yerleşmediyse null. */
  placements: (Position | null)[];
  /** courseIdx -> öğretmen indeksi; atanmadıysa -1. */
  courseTeachers: Int32Array;
  unplacedBlocks: number[];
  placedHours: number;
  totalHours: number;
  /** Yumuşak kısıt ihlali sayısı (dağınıklık vb.). */
  softViolations: number;
  restartsUsed: number;
  iterationsUsed: number;
}

const EVICTION_COST = 1000;
/** Büyük blokları söktürmek pahalıdır; yeniden yer bulmaları zordur. */
const EVICTION_SIZE_COST = 60;
const NON_ADJACENT_PENALTY = 10;
/** Hiçbir bloğa yetmeyecek kadar kısa boşluk bırakmanın slot başına bedeli. */
const FRAGMENT_PENALTY = 45;
const TABU_PENALTY = 5000;
const TABU_TENURE = 12;
/** Bu kadar denemeden sonra bloğun dersine başka öğretmen aranır. */
const TEACHER_ROTATION_THRESHOLD = 3;
/** İyileşme olmadan geçen bu kadar adımdan sonra çözüm sarsılır. */
const STAGNATION_LIMIT = 400;
const KICK_MIN_BLOCKS = 2;
const KICK_MAX_BLOCKS = 7;

function makeRandom(seed: number) {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

/** Onarım sırasında geri dönülebilmesi için tutulan tam durum kopyası. */
interface StateSnapshot {
  classOcc: Int32Array;
  teacherOcc: Int32Array;
  blockPos: Int32Array;
  courseTeacher: Int32Array;
  courseDayHours: Int32Array;
  teacherHours: Int32Array;
  placedHours: number;
}

/**
 * Zaman çizelgesi çözücüsü.
 *
 * Öğretmen ataması yerleştirmeyle birlikte yapılır. Önceki sürümde dersler
 * önce öğretmensiz yerleştirilip sonra öğretmen atanıyordu; bir slotta yeterli
 * öğretmen bulunması tek tek denetlense de bir sınıfın aynı dersinin tüm
 * saatlerini aynı öğretmenin verebilmesi garanti edilmiyordu, dolayısıyla
 * yerleştirme başarılı görünse bile atama aşaması tıkanabiliyordu.
 *
 * Arama üç hamle üzerine kuruludur:
 *   1. Yerleştirme: blok, en az sayıda bloğu söktüren konuma konur; sökülenler
 *      kuyruğa geri döner (ejection chain).
 *   2. Öğretmen değiştirme: dersin tüm saatlerini üstlenebilecek başka bir
 *      öğretmen aranır.
 *   3. Öğretmen takası: iki ders öğretmenlerini karşılıklı değiştirir.
 * İyileşme durduğunda çözüm rastgele sarsılır ve en iyi bilinen duruma
 * geri dönülür (iterated local search).
 */
export class Solver {
  private readonly model: Model;
  private readonly random: () => number;

  private readonly classOcc: Int32Array;
  private readonly teacherOcc: Int32Array;
  private readonly blockPos: Int32Array;
  private readonly courseTeacher: Int32Array;
  private readonly courseDayHours: Int32Array;
  private readonly teacherHours: Int32Array;

  private readonly tabuOffset: Int32Array;
  private readonly tabuUntil: Int32Array;
  private readonly attempts: Int32Array;
  private readonly blockClass: Int32Array;

  private readonly conflictScratch: number[] = [];
  private readonly candidateScratch: number[] = [];

  private placedHours = 0;
  private iterations = 0;

  constructor(model: Model, seed: number) {
    this.model = model;
    this.random = makeRandom(seed);

    const numClasses = model.classes.length;
    const numTeachers = Math.max(1, model.teachers.length);
    this.classOcc = new Int32Array(numClasses * model.numDayTime);
    this.teacherOcc = new Int32Array(numTeachers * model.numDayTime);
    this.blockPos = new Int32Array(model.blocks.length).fill(-1);
    this.courseTeacher = new Int32Array(model.courses.length).fill(-1);
    this.courseDayHours = new Int32Array(model.courses.length * 7);
    this.teacherHours = new Int32Array(numTeachers);
    this.attempts = new Int32Array(model.blocks.length);
    this.blockClass = new Int32Array(model.blocks.length);

    const offsets = new Int32Array(model.blocks.length + 1);
    model.blocks.forEach((block, i) => {
      const classIdx = model.courses[block.courseIdx].classIdx;
      this.blockClass[i] = classIdx;
      offsets[i + 1] =
        offsets[i] + (model.positions[classIdx][block.size]?.length ?? 0);
    });
    this.tabuOffset = offsets;
    this.tabuUntil = new Int32Array(offsets[model.blocks.length]);
  }

  // --- Temel erişimciler ---------------------------------------------------

  private positionsOf(blockId: number): Position[] {
    const block = this.model.blocks[blockId];
    return this.model.positions[this.blockClass[blockId]][block.size] ?? [];
  }

  private isTeacherOff(teacherIdx: number, day: number): boolean {
    return teacherIdx >= 0 && this.model.teacherOff[teacherIdx * 7 + day] === 1;
  }

  private teacherOf(blockId: number): number {
    return this.courseTeacher[this.model.blocks[blockId].courseIdx];
  }

  // --- Çakışma ve ceza hesabı ---------------------------------------------

  /** Konumda çakışan blokların kimlikleri; boşsa yerleştirme serbesttir. */
  private collectConflicts(
    blockId: number,
    position: Position,
    teacherIdx: number
  ): number[] {
    const out = this.conflictScratch;
    out.length = 0;
    const classBase = this.blockClass[blockId] * this.model.numDayTime;
    const teacherBase = teacherIdx * this.model.numDayTime;

    for (const key of position.keys) {
      const occupant = this.classOcc[classBase + key];
      if (occupant > 0 && occupant - 1 !== blockId && !out.includes(occupant - 1)) {
        out.push(occupant - 1);
      }
      if (teacherIdx >= 0) {
        const other = this.teacherOcc[teacherBase + key];
        if (other > 0 && other - 1 !== blockId && !out.includes(other - 1)) {
          out.push(other - 1);
        }
      }
    }

    // Sert kural: aynı sınıfta aynı dersten günde en fazla N saat.
    // Limit aşılacaksa o gündeki aynı ders blokları sökülmeden yerleşme yok.
    const block = this.model.blocks[blockId];
    const dayHours = this.courseDayHours[block.courseIdx * 7 + position.day];
    if (dayHours + block.size > MAX_HOURS_PER_SUBJECT_PER_DAY) {
      for (const otherId of this.model.courses[block.courseIdx].blockIds) {
        if (otherId === blockId) continue;
        const posIndex = this.blockPos[otherId];
        if (posIndex < 0) continue;
        if (this.positionsOf(otherId)[posIndex].day !== position.day) continue;
        if (!out.includes(otherId)) out.push(otherId);
      }
    }

    return out;
  }

  /**
   * Yumuşak kısıt cezası: aynı dersin gün içinde dağınık durması ve
   * parçalanmış boşluk bırakmak istenmez ama yerleşme uğruna kabul edilebilir.
   * Günde aynı dersten N saatten fazla vermek artık sert kısıttır.
   */
  private softPenalty(blockId: number, position: Position): number {
    const block = this.model.blocks[blockId];
    const dayHours = this.courseDayHours[block.courseIdx * 7 + position.day];

    let penalty = 0;
    if (dayHours > 0 && !this.isAdjacent(blockId, position)) {
      penalty += NON_ADJACENT_PENALTY;
    }
    penalty += this.fragmentationPenalty(blockId, position);
    return penalty;
  }

  /**
   * Gün içinde, kalan hiçbir bloğa yetmeyecek kadar kısa boşluk bırakan
   * yerleşimleri cezalandırır.
   *
   * Program kapasitesinin tamamını kullandığında belirleyici olan kısıt budur:
   * dört slotluk bir güne iki saatlik blok ortadan konursa iki tekil boşluk
   * kalır ve o gün bir daha doldurulamaz.
   */
  private fragmentationPenalty(blockId: number, position: Position): number {
    const classIdx = this.blockClass[blockId];
    const minBlock = this.model.classMinBlockSize[classIdx];
    if (minBlock <= 1) return 0;

    const slots = this.model.classSlots[classIdx][position.day];
    const classBase = classIdx * this.model.numDayTime;
    const size = this.model.blocks[blockId].size;
    const blockEnd = position.startIdx + size;

    let penalty = 0;
    let run = 0;
    for (let i = 0; i < slots.length; i++) {
      const occupied =
        (i >= position.startIdx && i < blockEnd) ||
        this.classOcc[classBase + slots[i].key] > 0;
      if (occupied) {
        if (run > 0 && run < minBlock) penalty += run * FRAGMENT_PENALTY;
        run = 0;
      } else {
        run++;
      }
    }
    if (run > 0 && run < minBlock) penalty += run * FRAGMENT_PENALTY;
    return penalty;
  }

  /** Bloğun, aynı dersin o günkü mevcut saatlerinin hemen yanına düşmesi. */
  private isAdjacent(blockId: number, position: Position): boolean {
    const block = this.model.blocks[blockId];
    const classIdx = this.blockClass[blockId];
    const slots = this.model.classSlots[classIdx][position.day];
    const classBase = classIdx * this.model.numDayTime;

    let first = -1;
    let last = -1;
    for (let i = 0; i < slots.length; i++) {
      const occupant = this.classOcc[classBase + slots[i].key];
      if (occupant === 0) continue;
      const other = occupant - 1;
      if (other === blockId) continue;
      if (this.model.blocks[other].courseIdx !== block.courseIdx) continue;
      if (first === -1) first = i;
      last = i;
    }
    if (first === -1) return true;

    const start = position.startIdx;
    const end = position.startIdx + block.size - 1;
    return end + 1 === first || start === last + 1;
  }

  // --- Yerleştirme ---------------------------------------------------------

  private place(blockId: number, posIndex: number) {
    const block = this.model.blocks[blockId];
    const position = this.positionsOf(blockId)[posIndex];
    const classBase = this.blockClass[blockId] * this.model.numDayTime;
    const teacherIdx = this.courseTeacher[block.courseIdx];
    const teacherBase = teacherIdx * this.model.numDayTime;

    for (const key of position.keys) {
      this.classOcc[classBase + key] = blockId + 1;
      if (teacherIdx >= 0) this.teacherOcc[teacherBase + key] = blockId + 1;
    }
    this.blockPos[blockId] = posIndex;
    this.courseDayHours[block.courseIdx * 7 + position.day] += block.size;
    if (teacherIdx >= 0) this.teacherHours[teacherIdx] += block.size;
    this.placedHours += block.size;
  }

  private unplace(blockId: number) {
    const posIndex = this.blockPos[blockId];
    if (posIndex < 0) return;
    const block = this.model.blocks[blockId];
    const position = this.positionsOf(blockId)[posIndex];
    const classBase = this.blockClass[blockId] * this.model.numDayTime;
    const teacherIdx = this.courseTeacher[block.courseIdx];
    const teacherBase = teacherIdx * this.model.numDayTime;

    for (const key of position.keys) {
      if (this.classOcc[classBase + key] === blockId + 1) {
        this.classOcc[classBase + key] = 0;
      }
      if (teacherIdx >= 0 && this.teacherOcc[teacherBase + key] === blockId + 1) {
        this.teacherOcc[teacherBase + key] = 0;
      }
    }
    this.blockPos[blockId] = -1;
    this.courseDayHours[block.courseIdx * 7 + position.day] -= block.size;
    if (teacherIdx >= 0) this.teacherHours[teacherIdx] -= block.size;
    this.placedHours -= block.size;
  }

  // --- Öğretmen atama hamleleri -------------------------------------------

  private removeTeacherOccupancy(courseIdx: number) {
    const teacherIdx = this.courseTeacher[courseIdx];
    if (teacherIdx < 0) return;
    const base = teacherIdx * this.model.numDayTime;
    for (const id of this.model.courses[courseIdx].blockIds) {
      const posIndex = this.blockPos[id];
      if (posIndex < 0) continue;
      for (const key of this.positionsOf(id)[posIndex].keys) {
        if (this.teacherOcc[base + key] === id + 1) this.teacherOcc[base + key] = 0;
      }
      this.teacherHours[teacherIdx] -= this.model.blocks[id].size;
    }
  }

  private addTeacherOccupancy(courseIdx: number) {
    const teacherIdx = this.courseTeacher[courseIdx];
    if (teacherIdx < 0) return;
    const base = teacherIdx * this.model.numDayTime;
    for (const id of this.model.courses[courseIdx].blockIds) {
      const posIndex = this.blockPos[id];
      if (posIndex < 0) continue;
      for (const key of this.positionsOf(id)[posIndex].keys) {
        this.teacherOcc[base + key] = id + 1;
      }
      this.teacherHours[teacherIdx] += this.model.blocks[id].size;
    }
  }

  private setCourseTeacher(courseIdx: number, teacherIdx: number) {
    if (this.courseTeacher[courseIdx] === teacherIdx) return;
    this.removeTeacherOccupancy(courseIdx);
    this.courseTeacher[courseIdx] = teacherIdx;
    this.addTeacherOccupancy(courseIdx);
  }

  /**
   * Öğretmen, dersin yerleşmiş bloklarını çakışmasız üstlenebilir mi.
   * Dersin kendi izi hesaba katılmaz; çağrılmadan önce silinmiş olmalıdır.
   */
  private teacherFitsPlacedBlocks(
    courseIdx: number,
    teacherIdx: number
  ): boolean {
    const base = teacherIdx * this.model.numDayTime;
    for (const id of this.model.courses[courseIdx].blockIds) {
      const posIndex = this.blockPos[id];
      if (posIndex < 0) continue;
      const position = this.positionsOf(id)[posIndex];
      if (this.isTeacherOff(teacherIdx, position.day)) return false;
      for (const key of position.keys) {
        if (this.teacherOcc[base + key] > 0) return false;
      }
    }
    return true;
  }

  /** Yükü en az olan, eşli ders kısıtını bozmayan uygun öğretmen. */
  private pickTeacher(courseIdx: number): number {
    const course = this.model.courses[courseIdx];
    const pairedTeacher =
      course.pairedCourse >= 0 ? this.courseTeacher[course.pairedCourse] : -1;

    let best = -1;
    let bestScore = Infinity;
    for (const teacherIdx of course.candidates) {
      let availableDays = 0;
      for (const day of this.model.classDays[course.classIdx]) {
        if (!this.isTeacherOff(teacherIdx, day)) availableDays++;
      }
      if (availableDays === 0) continue;

      let score = this.teacherHours[teacherIdx] - availableDays * 0.5;
      if (teacherIdx === pairedTeacher) score += 100;
      score += this.random() * 0.01;

      if (score < bestScore) {
        bestScore = score;
        best = teacherIdx;
      }
    }
    return best;
  }

  /**
   * Bloğun dersine, yerleşmiş bloklarını da üstlenebilecek ve bu bloğa yer
   * açabilecek başka bir öğretmen arar; bulamazsa iki dersin öğretmenlerini
   * karşılıklı takas etmeyi dener.
   */
  private tryReassignTeacher(blockId: number): boolean {
    const courseIdx = this.model.blocks[blockId].courseIdx;
    const course = this.model.courses[courseIdx];
    if (course.fixedTeacher >= 0 || course.candidates.length < 2) return false;

    const current = this.courseTeacher[courseIdx];
    const pairedTeacher =
      course.pairedCourse >= 0 ? this.courseTeacher[course.pairedCourse] : -1;

    const order = course.candidates.filter(
      (teacherIdx) => teacherIdx !== current && teacherIdx !== pairedTeacher
    );
    this.shuffle(order);

    this.removeTeacherOccupancy(courseIdx);
    for (const teacherIdx of order) {
      if (!this.teacherFitsPlacedBlocks(courseIdx, teacherIdx)) continue;
      const previous = this.courseTeacher[courseIdx];
      this.courseTeacher[courseIdx] = teacherIdx;
      this.addTeacherOccupancy(courseIdx);
      if (this.findFreePosition(blockId) >= 0) return true;
      this.removeTeacherOccupancy(courseIdx);
      this.courseTeacher[courseIdx] = previous;
    }
    this.addTeacherOccupancy(courseIdx);

    return this.trySwapTeachers(blockId);
  }

  /** İki dersin öğretmenlerini karşılıklı değiştirir. */
  private trySwapTeachers(blockId: number): boolean {
    const courseIdx = this.model.blocks[blockId].courseIdx;
    const course = this.model.courses[courseIdx];
    const current = this.courseTeacher[courseIdx];
    if (current < 0) return false;

    const partners: number[] = [];
    for (const other of this.model.courses) {
      if (other.index === courseIdx) continue;
      if (other.fixedTeacher >= 0) continue;
      const otherTeacher = this.courseTeacher[other.index];
      if (otherTeacher < 0 || otherTeacher === current) continue;
      if (!course.candidates.includes(otherTeacher)) continue;
      if (!other.candidates.includes(current)) continue;
      partners.push(other.index);
    }
    this.shuffle(partners);

    for (const partnerIdx of partners.slice(0, 24)) {
      const partnerTeacher = this.courseTeacher[partnerIdx];

      this.removeTeacherOccupancy(courseIdx);
      this.removeTeacherOccupancy(partnerIdx);

      const fits =
        this.teacherFitsPlacedBlocks(courseIdx, partnerTeacher) &&
        this.teacherFitsPlacedBlocks(partnerIdx, current);

      if (fits) {
        this.courseTeacher[courseIdx] = partnerTeacher;
        this.courseTeacher[partnerIdx] = current;
        this.addTeacherOccupancy(courseIdx);
        this.addTeacherOccupancy(partnerIdx);
        if (this.findFreePosition(blockId) >= 0) return true;

        this.removeTeacherOccupancy(courseIdx);
        this.removeTeacherOccupancy(partnerIdx);
        this.courseTeacher[courseIdx] = current;
        this.courseTeacher[partnerIdx] = partnerTeacher;
      }

      this.addTeacherOccupancy(courseIdx);
      this.addTeacherOccupancy(partnerIdx);
    }
    return false;
  }

  // --- Konum seçimi --------------------------------------------------------

  /** Hiç çakışmayan, yumuşak cezası en düşük konum. */
  private findFreePosition(blockId: number): number {
    const block = this.model.blocks[blockId];
    if (block.size > MAX_HOURS_PER_SUBJECT_PER_DAY) return -1;

    const teacherIdx = this.teacherOf(blockId);
    const positions = this.positionsOf(blockId);
    const best = this.candidateScratch;
    best.length = 0;
    let bestPenalty = Infinity;

    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      if (this.isTeacherOff(teacherIdx, position.day)) continue;
      if (this.collectConflicts(blockId, position, teacherIdx).length > 0) continue;

      const penalty = this.softPenalty(blockId, position);
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        best.length = 0;
        best.push(i);
      } else if (penalty === bestPenalty) {
        best.push(i);
      }
    }

    if (best.length === 0) return -1;
    return best[Math.floor(this.random() * best.length)];
  }

  private chooseRepairPosition(blockId: number, iteration: number): number {
    const block = this.model.blocks[blockId];
    if (block.size > MAX_HOURS_PER_SUBJECT_PER_DAY) return -1;

    const teacherIdx = this.teacherOf(blockId);
    const positions = this.positionsOf(blockId);
    const best = this.candidateScratch;
    best.length = 0;
    let bestCost = Infinity;

    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      if (this.isTeacherOff(teacherIdx, position.day)) continue;

      const conflicts = this.collectConflicts(blockId, position, teacherIdx);
      // Günlük limit: çakışan aynı-ders blokları sökülse bile sığmıyorsa konum geçersiz.
      if (!this.fitsDailyLimitAfterEviction(blockId, position, conflicts)) {
        continue;
      }

      let cost = this.softPenalty(blockId, position);
      for (const other of conflicts) {
        cost += EVICTION_COST + this.model.blocks[other].size * EVICTION_SIZE_COST;
      }

      // Yasak listesi, aynı bloğun aynı konuma sürekli geri dönmesini önler;
      // çakışmasız bir konum bulunduysa yasak dikkate alınmaz.
      if (
        conflicts.length > 0 &&
        this.tabuUntil[this.tabuOffset[blockId] + i] > iteration
      ) {
        cost += TABU_PENALTY;
      }

      if (cost < bestCost) {
        bestCost = cost;
        best.length = 0;
        best.push(i);
      } else if (cost === bestCost) {
        best.push(i);
      }
    }

    if (best.length === 0) return -1;
    return best[Math.floor(this.random() * best.length)];
  }

  /**
   * Belirtilen bloklar söküldükten sonra aynı dersin o günkü saati
   * MAX_HOURS_PER_SUBJECT_PER_DAY sınırına sığıyor mu.
   */
  private fitsDailyLimitAfterEviction(
    blockId: number,
    position: Position,
    conflicts: number[]
  ): boolean {
    const block = this.model.blocks[blockId];
    let dayHours = this.courseDayHours[block.courseIdx * 7 + position.day];
    for (const otherId of conflicts) {
      const other = this.model.blocks[otherId];
      if (other.courseIdx !== block.courseIdx) continue;
      const posIndex = this.blockPos[otherId];
      if (posIndex < 0) continue;
      if (this.positionsOf(otherId)[posIndex].day !== position.day) continue;
      dayHours -= other.size;
    }
    return dayHours + block.size <= MAX_HOURS_PER_SUBJECT_PER_DAY;
  }

  // --- Kurulum -------------------------------------------------------------

  private construct() {
    const positionCount = (courseIdx: number) =>
      this.model.courses[courseIdx].blockIds.reduce(
        (sum, id) => sum + this.positionsOf(id).length,
        0
      );

    const order = this.model.courses.map((course) => course.index);
    order.sort((a, b) => {
      const ca = this.model.courses[a];
      const cb = this.model.courses[b];
      const fixedA = ca.fixedTeacher >= 0 ? 0 : 1;
      const fixedB = cb.fixedTeacher >= 0 ? 0 : 1;
      if (fixedA !== fixedB) return fixedA - fixedB;
      if (ca.candidates.length !== cb.candidates.length) {
        return ca.candidates.length - cb.candidates.length;
      }
      if (ca.hours !== cb.hours) return cb.hours - ca.hours;
      return positionCount(a) - positionCount(b);
    });

    for (const courseIdx of order) {
      const course = this.model.courses[courseIdx];
      if (course.candidates.length === 0) continue;

      const teacher =
        course.fixedTeacher >= 0 ? course.fixedTeacher : this.pickTeacher(courseIdx);
      if (teacher < 0) continue;
      this.setCourseTeacher(courseIdx, teacher);

      // Büyük bloklar önce: yer bulmaları daha zordur.
      const blockIds = [...course.blockIds].sort(
        (a, b) => this.model.blocks[b].size - this.model.blocks[a].size
      );
      for (const blockId of blockIds) {
        const posIndex = this.findFreePosition(blockId);
        if (posIndex >= 0) this.place(blockId, posIndex);
      }
    }
  }

  // --- Onarım --------------------------------------------------------------

  private saveState(): StateSnapshot {
    return {
      classOcc: Int32Array.from(this.classOcc),
      teacherOcc: Int32Array.from(this.teacherOcc),
      blockPos: Int32Array.from(this.blockPos),
      courseTeacher: Int32Array.from(this.courseTeacher),
      courseDayHours: Int32Array.from(this.courseDayHours),
      teacherHours: Int32Array.from(this.teacherHours),
      placedHours: this.placedHours,
    };
  }

  private restoreState(snapshot: StateSnapshot) {
    this.classOcc.set(snapshot.classOcc);
    this.teacherOcc.set(snapshot.teacherOcc);
    this.blockPos.set(snapshot.blockPos);
    this.courseTeacher.set(snapshot.courseTeacher);
    this.courseDayHours.set(snapshot.courseDayHours);
    this.teacherHours.set(snapshot.teacherHours);
    this.placedHours = snapshot.placedHours;
  }

  private unplacedQueue(): number[] {
    const queue: number[] = [];
    for (const block of this.model.blocks) {
      if (this.blockPos[block.id] < 0 && this.teacherOf(block.id) >= 0) {
        queue.push(block.id);
      }
    }
    this.shuffle(queue);
    return queue;
  }

  /**
   * Yerel en iyiden çıkmak için rastgele blokları söker. Tamamen yeniden
   * başlamaktan çok daha ucuzdur ve çözümün iyi kısmını korur.
   */
  private kick(queue: number[]) {
    const placed: number[] = [];
    for (const block of this.model.blocks) {
      if (this.blockPos[block.id] >= 0) placed.push(block.id);
    }
    if (placed.length === 0) return;

    const count =
      KICK_MIN_BLOCKS +
      Math.floor(this.random() * (KICK_MAX_BLOCKS - KICK_MIN_BLOCKS + 1));
    for (let i = 0; i < count; i++) {
      const blockId = placed[Math.floor(this.random() * placed.length)];
      if (this.blockPos[blockId] < 0) continue;
      this.unplace(blockId);
      queue.push(blockId);
    }

    // Sarsmayı öğretmen boyutuna da taşı: rastgele bir dersin öğretmenini
    // değiştirmek, tıkanan atamaları açabiliyor.
    const courseIdx = Math.floor(this.random() * this.model.courses.length);
    const course = this.model.courses[courseIdx];
    if (course.fixedTeacher < 0 && course.candidates.length > 1) {
      const teacher =
        course.candidates[Math.floor(this.random() * course.candidates.length)];
      this.removeTeacherOccupancy(courseIdx);
      if (this.teacherFitsPlacedBlocks(courseIdx, teacher)) {
        this.courseTeacher[courseIdx] = teacher;
      }
      this.addTeacherOccupancy(courseIdx);
    }
  }

  private repair(maxIterations: number, deadline: number): void {
    let queue = this.unplacedQueue();
    this.attempts.fill(0);

    let best = this.saveState();
    let stagnation = 0;

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      if (queue.length === 0) break;
      if ((iteration & 255) === 0 && Date.now() > deadline) break;
      this.iterations++;

      const blockId = queue.shift()!;
      if (this.blockPos[blockId] >= 0) continue;

      this.attempts[blockId]++;
      if (this.attempts[blockId] % TEACHER_ROTATION_THRESHOLD === 0) {
        this.tryReassignTeacher(blockId);
      }

      const chosen = this.chooseRepairPosition(blockId, iteration);
      if (chosen < 0) {
        if (this.tryReassignTeacher(blockId)) queue.push(blockId);
        continue;
      }

      const teacherIdx = this.teacherOf(blockId);
      const position = this.positionsOf(blockId)[chosen];
      const evicted = [...this.collectConflicts(blockId, position, teacherIdx)];
      for (const other of evicted) {
        this.unplace(other);
        queue.push(other);
      }
      this.place(blockId, chosen);
      this.tabuUntil[this.tabuOffset[blockId] + chosen] = iteration + TABU_TENURE;

      if (this.placedHours > best.placedHours) {
        best = this.saveState();
        stagnation = 0;
      } else {
        stagnation++;
      }

      if (stagnation >= STAGNATION_LIMIT) {
        this.restoreState(best);
        queue = this.unplacedQueue();
        this.kick(queue);
        this.tabuUntil.fill(0);
        this.attempts.fill(0);
        stagnation = 0;
      }
    }

    if (best.placedHours > this.placedHours) this.restoreState(best);
  }

  private shuffle(items: number[]) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  }

  // --- Sonuç ---------------------------------------------------------------

  private snapshot(): Solution {
    const placements: (Position | null)[] = this.model.blocks.map((block) => {
      const posIndex = this.blockPos[block.id];
      return posIndex >= 0 ? this.positionsOf(block.id)[posIndex] : null;
    });

    const unplacedBlocks: number[] = [];
    let placedHours = 0;
    let totalHours = 0;
    for (const block of this.model.blocks) {
      totalHours += block.size;
      if (placements[block.id]) placedHours += block.size;
      else unplacedBlocks.push(block.id);
    }

    let softViolations = 0;
    for (const course of this.model.courses) {
      for (let day = 0; day < 7; day++) {
        if (
          this.courseDayHours[course.index * 7 + day] >
          MAX_HOURS_PER_SUBJECT_PER_DAY
        ) {
          softViolations++;
        }
      }
    }

    return {
      placements,
      courseTeachers: Int32Array.from(this.courseTeacher),
      unplacedBlocks,
      placedHours,
      totalHours,
      softViolations,
      restartsUsed: 0,
      iterationsUsed: this.iterations,
    };
  }

  private reset() {
    this.classOcc.fill(0);
    this.teacherOcc.fill(0);
    this.blockPos.fill(-1);
    this.courseTeacher.fill(-1);
    this.courseDayHours.fill(0);
    this.teacherHours.fill(0);
    this.tabuUntil.fill(0);
    this.attempts.fill(0);
    this.placedHours = 0;
  }

  run(maxIterations: number, deadline: number): Solution {
    this.reset();
    this.construct();
    this.repair(maxIterations, deadline);
    return this.snapshot();
  }
}

function isBetter(candidate: Solution, current: Solution | null): boolean {
  if (!current) return true;
  if (candidate.placedHours !== current.placedHours) {
    return candidate.placedHours > current.placedHours;
  }
  return candidate.softViolations < current.softViolations;
}

export function solve(model: Model, options: SolveOptions = {}): Solution {
  const restarts = Math.max(1, options.restarts ?? 8);
  const maxIterations = Math.max(200, options.maxIterations ?? 40000);
  const deadline = Date.now() + (options.timeLimitMs ?? 15000);
  const baseSeed = options.seed ?? 1;

  let best: Solution | null = null;

  for (let restart = 0; restart < restarts; restart++) {
    const solver = new Solver(model, baseSeed * 7919 + restart * 104729 + 1);
    const solution = solver.run(maxIterations, deadline);
    solution.restartsUsed = restart + 1;
    if (isBetter(solution, best)) best = solution;

    options.onProgress?.({
      restart: restart + 1,
      restarts,
      placedHours: best!.placedHours,
      totalHours: best!.totalHours,
    });

    if (best!.unplacedBlocks.length === 0 && best!.softViolations === 0) break;
    if (Date.now() > deadline) break;
  }

  return best!;
}
