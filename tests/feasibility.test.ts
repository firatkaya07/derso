import { describe, expect, it } from "vitest";
import { packCourses } from "@/lib/scheduler/feasibility";

/**
 * packCourses, "bir sınıfın bir dersini tek öğretmen verir" kuralının
 * kapasiteye etkisini hesaplar. Saatler öğretmenler arasında serbestçe
 * paylaştırılabilseydi bu hesabın hiçbir anlamı olmazdı.
 */
describe("packCourses", () => {
  it("kapasite bolsa tüm saatleri yerleştirir", () => {
    expect(packCourses([4, 4, 3], [20, 20])).toBe(11);
  });

  it("dersler bölünemediği için artan boşlukları kullanamaz", () => {
    // 4 öğretmenin 16'şar saati var (toplam 64) ve talep 60 saat; ama her ders
    // 6 saat ve tek öğretmene ait olmak zorunda, bu yüzden bir öğretmen en çok
    // iki dersi tam alabilir: 8 tam ders (48) + iki kısmi ders (4+4) = 56.
    expect(packCourses(Array(10).fill(6), [16, 16, 16, 16])).toBe(56);
  });

  it("toplam kapasite yeterli olsa da bölünmezlik kayba yol açabilir", () => {
    // Toplam kapasite 10, talep 10; ama 6 saatlik ders 5'lik iki kapasiteye
    // sığmaz, ancak birine kısmen girer.
    expect(packCourses([6, 4], [5, 5])).toBe(9);
  });

  it("öğretmen yoksa hiçbir saat yerleşmez", () => {
    expect(packCourses([4, 4], [])).toBe(0);
  });

  it("tek saatlik dersler kapasiteyi tam kullanır", () => {
    expect(packCourses(Array(10).fill(1), [5, 5])).toBe(10);
  });
});
