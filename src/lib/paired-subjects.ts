/**
 * Aynı sınıfta farklı öğretmenlere verilmesi gereken ders çiftleri.
 *
 * Kurs merkezlerinde ayrı ders olarak okutulan bu çiftler pratikte tek bir
 * alanın iki parçasıdır; ikisini de aynı öğretmene vermek hem yükü dengesiz
 * dağıtır hem de öğrencinin farklı bir anlatım görmesini engeller.
 */
export const DEFAULT_PAIRS: [string, string][] = [
  ["MATEMATİK 1", "MATEMATİK 2"],
  ["MAT 1", "MAT 2"],
  ["TÜRKÇE", "EDEBİYAT"],
];

function normalize(name: string): string {
  return name.trim().toLocaleUpperCase("tr").replace(/\s+/g, " ");
}

export function buildPairLookup(
  pairs: [string, string][]
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [first, second] of pairs) {
    lookup.set(normalize(first), normalize(second));
    lookup.set(normalize(second), normalize(first));
  }
  return lookup;
}

let pairLookup = buildPairLookup(DEFAULT_PAIRS);

/** Ayarlar yüklendiğinde veya kaydedildiğinde çağrılır; null → varsayılanlar. */
export function configurePairedSubjects(
  pairs: [string, string][] | null
): void {
  pairLookup = buildPairLookup(pairs ?? DEFAULT_PAIRS);
}

/** Dersin eşi varsa normalleştirilmiş adını döndürür. */
export function pairedSubjectOf(subjectName: string): string | null {
  return pairLookup.get(normalize(subjectName)) ?? null;
}

/** İki dersin eşli olup olmadığını söyler. */
export function arePairedSubjects(first: string, second: string): boolean {
  return pairLookup.get(normalize(first)) === normalize(second);
}

export function normalizeSubjectName(name: string): string {
  return normalize(name);
}

/** UI metin alanı için çiftleri satırlara çevirir. */
export function formatPairedSubjectLines(
  pairs: [string, string][] | null
): string {
  const source = pairs ?? DEFAULT_PAIRS;
  return source.map(([first, second]) => `${first} | ${second}`).join("\n");
}

/** "A | B" satırlarından çift listesi üretir; boş metin null döner. */
export function parsePairedSubjectLines(text: string): [string, string][] | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const pairs: [string, string][] = [];
  for (const line of lines) {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      pairs.push([parts[0], parts[1]]);
    }
  }
  return pairs.length > 0 ? pairs : null;
}
