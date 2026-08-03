import type { Model } from "./model";

export type FeasibilityKind =
  | "class-capacity"
  | "no-teacher"
  | "subject-capacity"
  | "indivisible-course"
  | "fixed-teacher-capacity";

export interface FeasibilityIssue {
  kind: FeasibilityKind;
  message: string;
  /** Bu kısıt yüzünden hiçbir algoritmanın yerleştiremeyeceği ders saati. */
  lostHours: number;
}

export interface FeasibilityReport {
  issues: FeasibilityIssue[];
  totalHours: number;
  /**
   * Ulaşılabilecek en yüksek ders saati tahmini.
   *
   * "Bir sınıfın bir dersinin bütün saatlerini tek öğretmen verir" kuralı da
   * hesaba katılır: bu kural yüzünden öğretmenin boş saati kâğıt üzerinde
   * yetse bile ders o öğretmene sığmayabilir.
   */
  maxPlaceableHours: number;
}

function slotKeysOfClass(model: Model, classIdx: number): number[] {
  const keys: number[] = [];
  for (const day of model.classDays[classIdx]) {
    for (const slot of model.classSlots[classIdx][day]) keys.push(slot.key);
  }
  return keys;
}

/** Öğretmenin, verilen slot kümesi içinde izinli olmadığı slot sayısı. */
function availableSlotCount(
  model: Model,
  teacherIdx: number,
  keys: Iterable<number>
): number {
  let count = 0;
  for (const key of keys) {
    const day = Math.floor(key / model.numTimes);
    if (!model.teacherOff[teacherIdx * 7 + day]) count++;
  }
  return count;
}

/**
 * Bölünemeyen dersleri öğretmen kapasitelerine yerleştirir ve kaç saatin
 * karşılanabileceğini hesaplar.
 *
 * Ders saatleri öğretmenler arasında serbestçe paylaştırılamaz: bir sınıfın
 * bir dersini tek öğretmen verir. Bu yüzden 16 saat müsait üç öğretmen,
 * 6'şar saatlik beş dersin ancak dördünü tam karşılayabilir; kalan ders için
 * boşta 4'er saat kalsa da o saatler tek bir derse tahsis edilmek zorundadır.
 *
 * Kalan kapasiteye en çok yer olan öğretmenden başlayarak yerleştiren açgözlü
 * bir yaklaşımdır; kesin en iyi çözüm (bin packing) NP-zordur ama bu tahmin
 * kullanıcıya kaç öğretmen eksik olduğunu söylemeye yeter.
 */
export function packCourses(
  courseHours: number[],
  capacities: number[]
): number {
  if (capacities.length === 0) return 0;

  const remaining = [...capacities];
  const sorted = [...courseHours].sort((a, b) => b - a);
  let placed = 0;

  for (const hours of sorted) {
    let bestIdx = -1;
    // Dersi tam karşılayabilecek en dolu öğretmene ver (best fit): büyük
    // boşlukları sonraki dersler için saklar.
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i] < hours) continue;
      if (bestIdx === -1 || remaining[i] < remaining[bestIdx]) bestIdx = i;
    }
    if (bestIdx === -1) {
      // Tam sığmıyor: en çok yeri olan öğretmene kısmen yerleşir.
      for (let i = 0; i < remaining.length; i++) {
        if (bestIdx === -1 || remaining[i] > remaining[bestIdx]) bestIdx = i;
      }
    }
    if (bestIdx === -1) break;

    const fitted = Math.min(hours, remaining[bestIdx]);
    remaining[bestIdx] -= fitted;
    placed += fitted;
  }

  return placed;
}

/** Tüm dersleri tam karşılamak için kaç öğretmen daha gerektiği. */
function extraTeachersNeeded(
  courseHours: number[],
  capacities: number[],
  typicalCapacity: number
): number {
  const demand = courseHours.reduce((sum, hours) => sum + hours, 0);
  const extended = [...capacities];
  for (let added = 0; added <= 30; added++) {
    if (packCourses(courseHours, extended) >= demand) return added;
    extended.push(typicalCapacity);
  }
  return 30;
}

/**
 * Programın matematiksel olarak eksiksiz çözülüp çözülemeyeceğini inceler.
 *
 * Amaç, kullanıcının "neden %100 olmadı?" sorusuna arama sonucuna bakmadan
 * cevap verebilmesidir: kapasite yetmiyorsa hiçbir algoritma bunu çözemez ve
 * neyin eksik olduğunu söylemek boşuna deneme yapmaktan yararlıdır.
 */
export function analyzeFeasibility(model: Model): FeasibilityReport {
  const issues: FeasibilityIssue[] = [];

  const totalHours = model.courses.reduce(
    (sum, course) => sum + course.hours,
    0
  );

  // --- Sınıf kapasitesi ---------------------------------------------------
  const demandByClass = new Map<number, number>();
  for (const course of model.courses) {
    demandByClass.set(
      course.classIdx,
      (demandByClass.get(course.classIdx) ?? 0) + course.hours
    );
  }

  let boundByClass = 0;
  for (const [classIdx, demand] of [...demandByClass].sort(
    (a, b) => a[0] - b[0]
  )) {
    const capacity = model.classCapacity[classIdx];
    boundByClass += Math.min(demand, capacity);
    if (demand > capacity) {
      const className = model.classes[classIdx]?.name ?? "?";
      issues.push({
        kind: "class-capacity",
        lostHours: demand - capacity,
        message:
          capacity === 0
            ? `${className}: ders günü tanımlanmamış, ${demand} saatin hiçbiri yerleştirilemez.`
            : `${className}: haftalık ${demand} saat ders var ama programda ${capacity} ders saati yeri var. ${demand - capacity} saat yerleştirilemez; ders günü ekleyin veya haftalık saatleri azaltın.`,
      });
    }
  }

  // --- Ders başına öğretmen kapasitesi ------------------------------------
  const coursesBySubject = new Map<number, number[]>();
  for (const course of model.courses) {
    const list = coursesBySubject.get(course.subjectIdx) ?? [];
    list.push(course.index);
    coursesBySubject.set(course.subjectIdx, list);
  }

  let boundBySubject = 0;
  for (const [subjectIdx, courseIndexes] of [...coursesBySubject].sort(
    (a, b) => a[0] - b[0]
  )) {
    const subjectName = model.subjects[subjectIdx]?.name ?? "?";
    const demand = courseIndexes.reduce(
      (sum, idx) => sum + model.courses[idx].hours,
      0
    );

    const teacherIds = new Set<number>();
    for (const idx of courseIndexes) {
      for (const teacher of model.courses[idx].candidates) teacherIds.add(teacher);
    }

    if (teacherIds.size === 0) {
      issues.push({
        kind: "no-teacher",
        lostHours: demand,
        message: `${subjectName}: bu dersi verebilecek öğretmen tanımlı değil, ${demand} saat yerleştirilemez. Öğretmenler sayfasından bu dersi bir öğretmene tanımlayın.`,
      });
      continue;
    }

    // Öğretmen ancak dersin okutulduğu sınıfların ders saatlerinde bu dersi
    // verebilir.
    const subjectSlots = new Set<number>();
    for (const idx of courseIndexes) {
      for (const key of slotKeysOfClass(model, model.courses[idx].classIdx)) {
        subjectSlots.add(key);
      }
    }

    const capacities = [...teacherIds].map((teacherIdx) =>
      availableSlotCount(model, teacherIdx, subjectSlots)
    );
    const totalCapacity = capacities.reduce((sum, value) => sum + value, 0);
    const courseHours = courseIndexes.map((idx) => model.courses[idx].hours);
    const packable = packCourses(courseHours, capacities);

    boundBySubject += packable;

    if (totalCapacity < demand) {
      const needed = extraTeachersNeeded(
        courseHours,
        capacities,
        Math.max(...capacities, 1)
      );
      issues.push({
        kind: "subject-capacity",
        lostHours: demand - packable,
        message: `${subjectName}: toplam ${demand} saat talep var, bu dersi verebilen ${teacherIds.size} öğretmenin müsait süresi ${totalCapacity} saat. ${demand - packable} saat yerleştirilemez; en az ${needed} öğretmen daha gerekli.`,
      });
    } else if (packable < demand) {
      // Toplam kapasite yeterli ama dersler bölünemediği için sığmıyor.
      const needed = extraTeachersNeeded(
        courseHours,
        capacities,
        Math.max(...capacities, 1)
      );
      const largest = Math.max(...courseHours);
      issues.push({
        kind: "indivisible-course",
        lostHours: demand - packable,
        message: `${subjectName}: öğretmenlerin toplam müsait süresi (${totalCapacity} saat) talebi (${demand} saat) karşılıyor ama bir sınıfın dersini tek öğretmen vermek zorunda. En büyük ders ${largest} saat olduğundan artan boşluklar kullanılamıyor ve ${demand - packable} saat açıkta kalıyor; ${needed} öğretmen daha ekleyin veya bu dersin haftalık saatini düşürün.`,
      });
    }
  }

  // --- Sabit atanmış öğretmenlerin yükü -----------------------------------
  const fixedCourses = new Map<number, number[]>();
  const fixedSlots = new Map<number, Set<number>>();
  for (const course of model.courses) {
    if (course.fixedTeacher < 0) continue;
    const list = fixedCourses.get(course.fixedTeacher) ?? [];
    list.push(course.hours);
    fixedCourses.set(course.fixedTeacher, list);

    const slots = fixedSlots.get(course.fixedTeacher) ?? new Set<number>();
    for (const key of slotKeysOfClass(model, course.classIdx)) slots.add(key);
    fixedSlots.set(course.fixedTeacher, slots);
  }

  for (const [teacherIdx, hoursList] of [...fixedCourses].sort(
    (a, b) => a[0] - b[0]
  )) {
    const hours = hoursList.reduce((sum, value) => sum + value, 0);
    const available = availableSlotCount(
      model,
      teacherIdx,
      fixedSlots.get(teacherIdx) ?? []
    );
    if (hours > available) {
      const teacherName = model.teachers[teacherIdx]?.name ?? "?";
      issues.push({
        kind: "fixed-teacher-capacity",
        lostHours: hours - available,
        message: `${teacherName}: sabit atandığı derslerin toplamı ${hours} saat ama izin günleri düşüldüğünde müsait süresi ${available} saat. ${hours - available} saat yerleştirilemez; sabit atamalardan bazılarını kaldırın.`,
      });
    }
  }

  return {
    issues,
    totalHours,
    maxPlaceableHours: Math.min(totalHours, boundByClass, boundBySubject),
  };
}
