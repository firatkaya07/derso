/**
 * Aynı sınıfta farklı öğretmenlere verilmesi gereken ders çiftleri.
 *
 * Kurs merkezlerinde ayrı ders olarak okutulan bu çiftler pratikte tek bir
 * alanın iki parçasıdır; ikisini de aynı öğretmene vermek hem yükü dengesiz
 * dağıtır hem de öğrencinin farklı bir anlatım görmesini engeller.
 */
const PAIRS: [string, string][] = [
  ["MATEMATİK 1", "MATEMATİK 2"],
  ["MAT 1", "MAT 2"],
  ["TÜRKÇE", "EDEBİYAT"],
];

function normalize(name: string): string {
  return name.trim().toLocaleUpperCase("tr").replace(/\s+/g, " ");
}

const PAIR_LOOKUP = new Map<string, string>();
for (const [first, second] of PAIRS) {
  PAIR_LOOKUP.set(normalize(first), normalize(second));
  PAIR_LOOKUP.set(normalize(second), normalize(first));
}

/** Dersin eşi varsa normalleştirilmiş adını döndürür. */
export function pairedSubjectOf(subjectName: string): string | null {
  return PAIR_LOOKUP.get(normalize(subjectName)) ?? null;
}

/** İki dersin eşli olup olmadığını söyler. */
export function arePairedSubjects(first: string, second: string): boolean {
  return PAIR_LOOKUP.get(normalize(first)) === normalize(second);
}

export function normalizeSubjectName(name: string): string {
  return normalize(name);
}
