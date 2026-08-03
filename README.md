# Derso

Kurs merkezleri ve okullar için haftalık ders programı hazırlama uygulaması.
Sınıfları, öğretmenleri ve dersleri yönetir; programı elle (tıkla-yerleştir) ya
da otomatik çizelgeleme algoritmasıyla oluşturur ve resmî formatta çıktı verir.

Teknoloji: Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript,
Supabase (PostgreSQL + Auth).

## İçindekiler

- [Kurulum](#kurulum)
- [Veritabanı](#veritabanı)
- [Komutlar](#komutlar)
- [Uygulama akışı](#uygulama-akışı)
- [Excel şablonu](#excel-şablonu)
- [Veri modeli](#veri-modeli)
- [Çizelgeleme algoritması](#çizelgeleme-algoritması)
- [Proje yapısı](#proje-yapısı)
- [Bilinen kısıtlar](#bilinen-kısıtlar)

## Kurulum

Node.js 20 veya üzeri gerekir.

```bash
npm install
cp .env.example .env.local   # Supabase bilgilerinizi girin
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışır.

### Ortam değişkenleri

| Değişken | Zorunlu | Açıklama |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Evet | Supabase proje adresi (Project Settings > API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Evet | Supabase `anon public` anahtarı |
| `NEXT_PUBLIC_ALLOW_SIGNUP` | Hayır | `true` ise giriş sayfasında hesap oluşturma düğmesi görünür. Varsayılan kapalı. |

Değişkenlerden biri eksikse uygulama, ne yapılması gerektiğini söyleyen bir
hatayla durur.

## Veritabanı

Şema `supabase/migrations` altındadır:

| Dosya | İçerik |
| --- | --- |
| `0001_initial_schema.sql` | Tablolar, kısıtlar, indeksler |
| `0002_row_level_security.sql` | RLS politikaları |
| `0003_settings.sql` | Kurum geneli tanımlar (tek satırlı `settings` tablosu) |

Yeni bir Supabase projesinde dosyaları sırayla SQL Editor'e yapıştırıp
çalıştırmanız yeterlidir. Supabase CLI kullanıyorsanız `supabase db push`
komutu da aynı işi yapar.

**Genel Tanımlar** sayfası `0003_settings.sql` olmadan kaydedilemez. Daha önce
yalnızca `0001` / `0002` çalıştırdıysanız, Supabase SQL Editor'de
`0003_settings.sql` içeriğini bir kez daha çalıştırmanız gerekir. Tablo yokken
görülen tipik hata: `Could not find the table 'public.settings' in the schema cache`.

Ardından uygulamayı kullanacak kişiler için Supabase panelinden
(Authentication > Users) hesap açın; alternatif olarak
`NEXT_PUBLIC_ALLOW_SIGNUP=true` ile ilk hesabı uygulamadan oluşturup değişkeni
tekrar kapatabilirsiniz.

### Güvenlik notu

`NEXT_PUBLIC_SUPABASE_ANON_KEY` tanımı gereği herkese açıktır; tarayıcıya
gönderilir. Verinin tek gerçek koruması RLS politikalarıdır. Tabloların
herhangi birinde RLS kapatılırsa o tablo anahtarı bilen herkese açılır.
`0002_row_level_security.sql` giriş yapmış (`authenticated`) kullanıcılara tam
yetki verir; `anon` rolü için hiçbir politika tanımlı olmadığından oturumsuz
erişim reddedilir.

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run start` | Derlenmiş uygulamayı çalıştırır |
| `npm run lint` | ESLint |
| `npm test` | Birim testleri (Vitest) |
| `npm run test:watch` | Testleri izleme kipinde çalıştırır |
| `npm run benchmark` | Çizelgeleme algoritmasını örnek senaryolarda ölçer |

## Uygulama akışı

0. **Genel Tanımlar** — Kurum bilgileri (il, ilçe, kurum adı, kurum müdürü,
   müdür yardımcısı), kurum logosu, eğitim-öğretim yılı ile ders ve teneffüs
   süreleri. Kurum bilgileri çıktıların başlığında ve imza alanlarında,
   süreler ise ders saati ızgarasının hesabında kullanılır.
1. **Dersler** — Ders tanımları: ad, kısaltma, renk, hangi sınıf seviyelerinde
   ve hangi alanlarda (TM, MF, SAY...) okutulduğu.
2. **Öğretmenler** — Öğretmenler, verebildikleri dersler ve izin günleri.
   Bir öğretmenin ders verebilmesi için o dersin bu sayfada işaretlenmiş olması
   gerekir; "Branş" alanı yalnızca bilgi amaçlıdır.
3. **Sınıflar** — Şubeler, her şubenin hangi gün hangi saatler arasında ders
   gördüğü ve haftalık ders dağılımı.
4. **Otomatik Dağıtım** — Yukarıdaki üç adımı Excel ile toplu doldurma ve
   programı otomatik oluşturma.
5. **Sınıf / Öğretmen Programları** — Oluşan programı elle düzenleme.
6. **Program Çıktıları** — Yazdırılabilir çarşaf listeleri ve resmî formatta
   sınıf/öğretmen programları.

Ders saati varsayılan olarak 40 dakika, teneffüs 10 dakikadır; ikisi de Genel
Tanımlar sayfasından değiştirilebilir. Bir sınıfın günlük slotları, o gün için
girilen başlangıç saatinden itibaren bu sürelere göre otomatik hesaplanır.

## Excel şablonu

Otomatik Dağıtım sayfasındaki **Şablonu İndir** düğmesi, örnek satırlarla
doldurulmuş bir `.xlsx` üretir. Her sayfa bir veri kümesine karşılık gelir:

| Sayfa | Beslediği veri | Zorunlu sütunlar |
| --- | --- | --- |
| `Öğretmenler` | Öğretmenler ve verebildikleri dersler | Ad Soyad |
| `Dersler` | Ders tanımları | Ders Adı |
| `Sınıflar` | Şubeler | Sınıf Adı |
| `Sınıf Saatleri` | Sınıfın ders gün ve saatleri | Sınıf Adı, Günler, Başlangıç, Bitiş |
| `Ders Dağılımı` | Haftalık ders saatleri (satır = ders, sütun = sınıf) | 1. satır sınıf adları, A sütunu ders adları |
| `Ders Öğretmenleri` | Sabit öğretmen ataması (isteğe bağlı) | Sınıf Adı, Ders Adı, Öğretmen |

Kurallar:

- Başlık satırını (1. satır) koruyun; **sütunların sırasını değiştirebilirsiniz**.
- Sayfa ve sütun adları büyük/küçük harf ve Türkçe karakter farkını yok sayar.
- Aynı hücrede birden çok değer virgülle ayrılır: `Cumartesi, Pazar`.
- Saatler `SS:DD` biçiminde yazılır; Excel'in saat biçimindeki hücreler de okunur.
- Sınıf, ders ve öğretmen adları sayfalar arasında aynı olmalıdır. Tanımlı
  olmayan bir ada atıf yapılırsa aktarım engellenir.

Dosya yüklendiğinde önce doğrulanır. Bulunan sorunlar sayfa ve satır
numarasıyla listelenir; **hata varsa aktarım yapılamaz**, uyarılar ise
bilgilendirmedir (örneğin ders günü girilmemiş bir sınıf). Aktarım ada göre
eşleştirme yapar: aynı isimli kayıt varsa güncellenir, yoksa oluşturulur, yani
aynı dosya birden çok kez aktarılabilir.

## Veri modeli

Gün numaralandırması her yerde aynıdır: `0` Pazartesi, `6` Pazar.

| Tablo | İçerik |
| --- | --- |
| `teachers` | Öğretmen bilgileri ve `off_days` (izin günleri) |
| `subjects` | Ders tanımları, `level` ve `subgroups` virgülle ayrılmış metin |
| `classes` | Şubeler, `level` ve `subgroup` |
| `class_schedule_days` | Sınıfın hangi gün hangi saat aralığında ders gördüğü |
| `class_subjects` | Sınıf müfredatı: haftalık saat ve varsa sabit öğretmen |
| `teacher_subjects` | Öğretmenin verebildiği dersler |
| `lessons` | Yerleşmiş program; bir satır = bir ders saati |
| `settings` | Kurum bilgileri, logo, eğitim-öğretim yılı, ders/teneffüs süresi (tek satır) |

`lessons` tablosundaki iki tekillik kısıtı çakışmayı veritabanı düzeyinde
engeller: bir sınıf aynı anda tek ders görebilir
(`lessons_class_slot_unique`), bir öğretmen aynı anda tek sınıfta olabilir
(`lessons_teacher_slot_unique`). Arayüz bu kuralları yerleştirmeden önce de
kontrol eder, ancak son söz veritabanınındır.

## Çizelgeleme algoritması

`src/lib/scheduler/` altındaki çözücü, ders saatlerini haftaya yerleştirirken
öğretmenlerini de aynı geçişte atar. Sonuç her zaman tutarlıdır: dönen
programda sınıf çakışması, öğretmen çakışması veya izin gününde ders bulunmaz.

### Kurallar

Çiğnenemeyen kısıtlar:

- Ders yalnızca sınıfın kendi gün ve saatlerine yerleşir.
- Bir sınıf aynı anda tek ders görür.
- Bir öğretmen aynı anda tek sınıfta olur ve izin gününde ders vermez.
- **Bir sınıfın bir dersini baştan sona tek öğretmen verir.** Öğretmen
  yetmediğinde ders iki öğretmene bölünmez; yerleştirilemeyen saat açıkta
  bırakılır ve nedeni raporlanır.
- Sınıflar sayfasında bir derse sabit öğretmen belirlendiyse o atama korunur.

Esnetilebilen, ihlal edilirse uyarı üretilen tercihler:

- Aynı dersten günde en fazla 2 saat.
- Aynı dersin saatleri gün içinde arka arkaya.
- `MATEMATİK 1/2`, `TÜRKÇE/EDEBİYAT` gibi ders çiftleri aynı sınıfta farklı
  öğretmenlere verilir.
- Öğretmen yükleri dengeli dağıtılır.

### Arama

Önce açgözlü bir kurulum yapılır: dersler kısıtlılığa göre sıralanır (az
öğretmeni olan ve çok saatli olanlar önce), her derse en uygun öğretmen seçilir
ve blokları boş yerlere konur. Ardından yerleşemeyen bloklar için onarım
döngüsü çalışır ve üç hamle kullanılır:

1. **Yerleştirme:** blok, en az sayıda bloğu söktüren konuma konur; sökülenler
   kuyruğa geri döner (ejection chain).
2. **Öğretmen değiştirme:** dersin bütün saatlerini üstlenebilecek başka bir
   öğretmen aranır.
3. **Öğretmen takası:** iki ders öğretmenlerini karşılıklı değiştirir.

İyileşme durduğunda çözüm rastgele sarsılır ve en iyi bilinen duruma dönülür.
Program kapasitesinin tamamını kullandığında belirleyici olan gün içi
parçalanma da cezalandırılır: dört slotluk bir güne iki saatlik blok ortadan
konursa iki tekil boşluk kalır ve o gün bir daha doldurulamaz.

Arama tarayıcıda çalışır. Kurallar sekmesindeki tur sayısı kaç kez sıfırdan
denenmesi gerektiğini belirler; ulaşılabilir en yüksek saate varılırsa arama
erken biter.

### Neden %100 olmadığını anlamak

Her program eksiksiz çözülemez ve bu çoğu zaman algoritmanın değil verinin
sonucudur. Çözücü aramaya başlamadan önce bir olurluk incelemesi yapar ve
ulaşılabilecek en yüksek saati hesaplar:

- Sınıfın haftalık ders saati, programındaki yerden fazla mı?
- Bir dersi verebilecek öğretmen tanımlı mı?
- O dersi verebilen öğretmenlerin sınıf saatleriyle örtüşen müsait süresi
  talebi karşılıyor mu?
- Karşılıyor olsa bile dersler bölünemediği için artan boşluklar kullanılabilir
  mi? Örneğin 16'şar saati boş dört öğretmen, 6'şar saatlik on dersin ancak
  sekizini tam karşılayabilir; kalan iki ders için öğretmen başına 4'er saat
  boş kalsa da bu boşluklar tek bir derse tahsis edilmek zorundadır.

Sonuç ekranı bu nedenleri "3 öğretmen daha gerekli", "S07 için ders günü
ekleyin" gibi uygulanabilir cümlelerle listeler.

### Başarımı ölçmek

`npm run benchmark`, `tests/helpers/scenarios.ts` içindeki senaryolarda
çözücüyü çalıştırır ve her senaryo için yerleşen saat oranını, hesaplanan üst
sınırı ve kısıt ihlallerini raporlar. İhlal sayısı her zaman sıfır olmalıdır.
Aynı senaryolar `tests/scheduler-scenarios.test.ts` içinde regresyon testi
olarak da koşar.

## Proje yapısı

```
src/
  app/
    (dashboard)/        Uygulama sayfaları
    login/              Giriş
  components/           Ortak arayüz bileşenleri (Modal, Toast, ScheduleGrid)
  hooks/                useAsyncData
  lib/
    settings.ts         Kurum geneli tanımlar
    image.ts            Logoyu 100x100 piksele ölçekleme
    scheduler/
      model.ts          Girdiyi çözücünün dizi tabanlı modeline çevirir
      feasibility.ts    Ulaşılabilir en yüksek saati ve engelleri hesaplar
      solver.ts         Yerleştirme + öğretmen atama araması
      index.ts          autoSchedule ve sonuç raporu
    schedule-rules.ts   Elle yerleştirmenin kuralları
    excel-template.ts   Şablon tanımı ve üretimi
    excel-parser.ts     Şablon okuma ve doğrulama
    excel-import.ts     Veritabanına toplu aktarım
    pdf-generator.ts    Yazdırılabilir çıktılar
    supabase/           İstemci kurulumları
  proxy.ts              Oturum yenileme ve yetkisiz erişim yönlendirmesi
supabase/migrations/    Şema ve RLS
tests/                  Vitest birim testleri
```

## Bilinen kısıtlar

- **Çıktılar PDF değil, yazdırılabilir HTML'dir.** Belge yeni sekmede açılır ve
  yazdırma penceresi çıkar; oradan "PDF olarak kaydet" seçilir. Bu tercih
  Türkçe karakterler ve tablo düzeni için bilinçlidir. Açılır pencere
  engelliyse dosya HTML olarak iner.
- **Tek kurumludur.** Giriş yapabilen her kullanıcı tüm veriyi görüp
  düzenleyebilir. Rol ayrımı gerekiyorsa RLS politikalarını daraltmak gerekir.
- **Çizelgeleme tarayıcıda çalışır.** Arama turları küçük parçalara bölünerek
  koşar; 24 sınıf ve 8 dersten oluşan bir program bir turda yaklaşık 0,1
  saniye sürer.
- **Ulaşılabilir en yüksek saat bir tahmindir.** Ders başına hesaplanır ve iki
  ders veren öğretmenlerin kapasitesini paylaştırmaz; birden çok branşa giren
  kadrolarda gerçek sınır biraz daha düşük olabilir.
- `npm audit`, Next.js'in kendi bağımlılıklarından gelen (`postcss`, `sharp`)
  uyarılar üretir. Bunlar ancak Next.js sürümüyle birlikte kapanır; `npm audit
  fix --force` Next.js'i eski bir sürüme düşüreceği için kullanılmamalıdır.
