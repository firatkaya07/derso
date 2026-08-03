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

Şema `supabase/migrations` altındadır ve iki dosyadan oluşur:

| Dosya | İçerik |
| --- | --- |
| `0001_initial_schema.sql` | Tablolar, kısıtlar, indeksler |
| `0002_row_level_security.sql` | RLS politikaları |

Yeni bir Supabase projesinde dosyaları sırayla SQL Editor'e yapıştırıp
çalıştırmanız yeterlidir. Supabase CLI kullanıyorsanız `supabase db push`
komutu da aynı işi yapar.

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

## Uygulama akışı

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

Ders saati 40 dakika, teneffüs 10 dakikadır. Bir sınıfın günlük slotları,
o gün için girilen başlangıç saatinden itibaren otomatik hesaplanır.

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
| `lessons` | Yerleşmiş program; bir satır = bir 40 dakikalık ders saati |

`lessons` tablosundaki iki tekillik kısıtı çakışmayı veritabanı düzeyinde
engeller: bir sınıf aynı anda tek ders görebilir
(`lessons_class_slot_unique`), bir öğretmen aynı anda tek sınıfta olabilir
(`lessons_teacher_slot_unique`). Arayüz bu kuralları yerleştirmeden önce de
kontrol eder, ancak son söz veritabanınındır.

## Çizelgeleme algoritması

`src/lib/scheduler.ts` dersleri bloklara bölüp haftaya yerleştirir. Dikkate
aldığı kısıtlar:

- Sınıfın yalnızca kendi ders gün ve saatleri
- Sınıfın aynı anda tek ders görmesi
- Aynı gün aynı dersten en fazla 2 saat (gerekirse aşılır ve uyarı üretilir)
- Aynı dersin bloklarının gün içinde bitişik durması
- Sabit atanmış öğretmenin izin günleri ve doluluğu
- Bir zaman diliminde eş zamanlı okutulan derslerin gerçekten yeterli
  öğretmenle karşılanabilmesi (iki parçalı grafik eşleştirmesi ile denetlenir)

Yerleştirilemeyen bloklar için takas denemeleri ve ardından bir düzeltme
geçişi yapılır. `src/lib/teacher-assignment.ts` yerleşen derslere öğretmen
atar: az öğretmeni olan dersler önceliklidir, yük dengelenir, `MATEMATİK 1/2`
ve `TÜRKÇE/EDEBİYAT` gibi ders çiftleri aynı sınıfta farklı öğretmenlere
verilir.

Algoritma tarayıcıda çalışır ve rastgele tohumlarla birçok kez denenerek en az
hatalı sonuç seçilir. Deneme sayısı Kurallar sekmesinden ayarlanır;
varsayılan 500'dür.

## Proje yapısı

```
src/
  app/
    (dashboard)/        Uygulama sayfaları
    login/              Giriş
  components/           Ortak arayüz bileşenleri (Modal, Toast, ScheduleGrid)
  hooks/                useAsyncData
  lib/
    scheduler.ts        Otomatik çizelgeleme
    teacher-assignment.ts  Öğretmen atama
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
- **Çizelgeleme tarayıcıda çalışır.** Çok sayıda sınıf ve yüksek deneme
  sayısında arayüz yavaşlayabilir; işlem küçük gruplara bölünerek çalıştırılır.
- `npm audit`, Next.js'in kendi bağımlılıklarından gelen (`postcss`, `sharp`)
  uyarılar üretir. Bunlar ancak Next.js sürümüyle birlikte kapanır; `npm audit
  fix --force` Next.js'i eski bir sürüme düşüreceği için kullanılmamalıdır.
