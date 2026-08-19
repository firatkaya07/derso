-- Seed SEO blog posts (upsert by slug)
insert into public.blog_posts (
  slug, title, h1, excerpt, meta_title, meta_description, keywords, content_md, published_at, is_published
) values
(
  'ders-programi-nasil-hazirlanir',
  'Ders Programı Nasıl Hazırlanır? Adım Adım Rehber',
  'Ders Programı Nasıl Hazırlanır? Adım Adım Rehber',
  'Okul ve kurslarda ders programı hazırlama sürecini adım adım anlatan 2026 rehberi: veriler, uygunluklar, dağıtım ve çakışma kontrolü.',
  'Ders Programı Nasıl Hazırlanır? | 2026 Rehberi',
  'Ders programı nasıl hazırlanır? Öğretmen uygunlukları, haftalık ders saatleri, sınıf planı, çakışma kontrolü ve otomatik dağıtım için adım adım rehber.',
  array['ders programı nasıl hazırlanır','ders programı hazırlama','otomatik ders programı','haftalık ders programı'],
  $md$
Ders programı hazırlamak; öğretmen yükleri, sınıf ihtiyaçları ve müfredat saatlerini aynı anda dengelemeyi gerektirir. Bu rehberde süreci parçalara ayırarak ilerliyoruz.

## 1. Ders programı hazırlamadan önce gereken bilgiler

Başlamadan önce elinizde şunlar olmalı:

- Ders listesi ve her dersin haftalık saati
- Öğretmen listesi ve her öğretmenin verebileceği dersler
- Sınıf / şube listesi
- Günlük ders dilimleri (ör. 08:30–09:10)
- Kurumun çalışma günleri (hafta içi, gerekirse Cumartesi–Pazar)

Bu veriler eksikse dağıtım ister istemez yarım kalır. Derso gibi bir [otomatik ders programı](/otomatik-ders-programi) aracında da önce tanımlar tamamlanır.

## 2. Öğretmenlerin müsaitliklerinin belirlenmesi

Her öğretmen için uygun olmadığı gün ve saatleri netleştirin. Part-time öğretmenler, idari görevler veya başka kurumdaki dersler sık kısıt üretir.

Müsaitlik tanımlı değilse program kağıt üzerinde doğru görünse bile uygulamada bozulur. [Öğretmen ders programı](/ogretmen-ders-programi) görünümü, yükleri kontrol etmeyi kolaylaştırır.

## 3. Haftalık ders saatlerinin hesaplanması

Her sınıf için ders bazında haftalık toplam saati yazın. Toplam, o sınıfın haftalık kapasitesini aşmamalıdır.

Örnek: 9-A için Matematik 6 saat, Türkçe 5 saat… gibi. Bu hedefler otomatik dağıtımın “ne kadar yerleştirilmeli?” sorusunun cevabıdır.

## 4. Sınıfların oluşturulması

Sınıf veya grupları tanımlayın. Kurslarda seviye / şube ayrımı; okullarda alan ve şube yapısı önemlidir.

Her sınıfın hangi günlerde ders gördüğünü de netleştirin. [Esnek ders programı](/esnek-ders-programi) ihtiyacı olan kurumlar hafta sonunu da bu aşamada ekler.

## 5. Ders dağılımının yapılması

Dağıtımda hedef: her sınıfın ders saatlerini, öğretmen uygunluklarını ve sınıf boşluklarını bozmadan yerleştirmek.

Manuel Excel ile bu adım en çok zaman alan kısımdır. Otomatik dağıtım, aday yerleştirmeleri üretir; siz ince ayar yaparsınız.

## 6. Çakışmaların kontrol edilmesi

Kontrol listesi:

- Aynı öğretmen aynı saatte iki yerde mi?
- Aynı sınıf aynı saatte iki derste mi?
- Öğretmen uygun olmadığı saate mi yazıldı?
- Günlük ders limiti aşıldı mı?

Çakışma kontrolü yapılmadan paylaşılan programlar gün içinde bozulur.

## 7. Otomatik ders programı oluşturmanın avantajları

Otomatik oluşturma:

- Tekrarlayan deneme-yanılma süresini kısaltır
- Çakışmaları baştan azaltır
- Açıkta kalan dersleri görünür kılar
- Manuel düzenlemeye temiz bir taslak sunar

Detaylar için [otomatik ders programı oluşturma](/otomatik-ders-programi) sayfasına bakabilirsiniz.

## 8. Excel ile ders programı hazırlama

Birçok kurum hâlâ Excel şablonlarıyla ilerler. Excel başlangıç için uygundur; ancak çakışma kontrolü, uygunluk ve versiyon yönetimi zorlaşır.

Excel odaklı süreçleri [Excel'de ders programı nasıl hazırlanır?](/blog/excel-ders-programi-hazirlama) yazısında ayrıca ele aldık. İdeal akış: programı sistemde oluşturup [Excel ve PDF](/ders-programi-excel-pdf) olarak dışa aktarmak.

## 9. Ders programı hazırlarken yapılan hatalar

- Öğretmen uygunluklarını sonradan eklemek
- Sınıf kapasitesini aşan saat tanımlamak
- Hafta sonu derslerini ayrı “kopya” dosyada tutmak
- Çıktıyı paylaştıktan sonra tek yerden güncellememek
- Sadece sınıf programına bakıp öğretmen yükünü ihmal etmek

Bu hataların çoğu, tanımları tek merkezde tutup otomatik dağıtım + manuel ince ayar ile azaltılır.
$md$,
  '2026-03-01T09:00:00Z',
  true
),
(
  'excel-ders-programi-hazirlama',
  'Excel''de Ders Programı Nasıl Hazırlanır?',
  'Excel''de Ders Programı Nasıl Hazırlanır?',
  'Excel ile haftalık ders programı hazırlama adımları, şablon mantığı ve manuel Excel yönetiminin sınırları.',
  'Excel''de Ders Programı Nasıl Hazırlanır? | Derso',
  'Excel ders programı hazırlama rehberi: haftalık şablon, öğretmen-sınıf yerleşimi ve Excel''in manuel yönetimde yarattığı sorunlar. Alternatif olarak otomatik dağıtım.',
  array['Excel ders programı hazırlama','Excel haftalık ders programı','ders programı Excel','ders programı şablonu'],
  $md$
Excel, birçok okul ve kurs merkezinde ilk tercih edilen ders programı şablonudur. Bu yazıda Excel'de ders programı nasıl kurulur, hangi adımlar gerekir ve nerede tıkanır sorularını netleştiriyoruz.

## Excel haftalık ders programı şablonu nasıl kurulur?

Tipik bir şablon:

1. Satırlarda ders saatleri (1. ders, 2. ders…)
2. Sütunlarda günler (Pazartesi–Cuma veya 7 gün)
3. Hücrelerde ders adı + öğretmen kısaltması

Her sınıf için ayrı bir sayfa açmak yaygındır. Öğretmen programı için ikinci bir sayfa seti gerekir.

## Adım adım Excel ders programı hazırlama

### 1) Verileri toplayın

Dersler, haftalık saatler, öğretmenler ve sınıflar listelenir. Bunlar olmadan şablon boş bir ızgaradan ibarettir.

### 2) Saat dilimlerini yazın

Kurumun zil saatlerine göre satır başlıklarını sabitleyin. Kurslarda farklı başlangıç saatleri varsa şablon hızla karmaşıklaşır.

### 3) Sınıf sayfalarını doldurun

Her hücreye ders ve öğretmen yazılır. Aynı öğretmenin başka sınıf sayfasında aynı saatte olup olmadığını elle kontrol etmeniz gerekir.

### 4) Öğretmen sayfalarını üretin

Sınıf sayfalarından öğretmen bazlı görünüm çıkarmak çoğu ekipte kopyala-yapıştır ile yapılır. Bir değişiklik tüm sayfaları bozabilir.

### 5) Çakışma kontrolü yapın

Excel'de koşullu biçimlendirme veya ek formüller ile kısmi kontrol mümkün olsa da kapsamlı çakışma denetimi zordur.

## Excel ile yönetmenin dezavantajları

- **Çakışma riski:** Aynı öğretmen iki sınıfta aynı anda görünebilir.
- **Versiyon karmaşası:** “program_final_v7.xlsx” dosyaları çoğalır.
- **Öğretmen uygunluğu:** Müsait olmayan saatler kolay unutulur.
- **Hafta sonu / esnek saatler:** 7 günlük ve kayan saatli kurumlarda şablon şişer.
- **Paylaşım:** PDF almak için ekstra biçimlendirme gerekir.

Bu nedenle birçok kurum Excel'i **çıktı formatı** olarak kullanmaya devam eder; asıl planlamayı [otomatik ders programı](/otomatik-ders-programi) sisteminde yapar. Derso'da programı oluşturduktan sonra [Excel ve PDF olarak dışa aktarabilirsiniz](/ders-programi-excel-pdf).

## Ne zaman Excel yeterli olur?

Çok az sınıfı ve az öğretmeni olan, haftada nadiren değişen küçük yapılar için Excel hâlâ işe yarayabilir. Büyüyen [okul](/okul-ders-programi) veya [kurs](/kurs-ders-programi) operasyonlarında ise tek merkezli dağıtım daha az hata üretir.
$md$,
  '2026-03-08T09:00:00Z',
  true
),
(
  'kurs-ders-programi-nasil-hazirlanir',
  'Kurs Ders Programı Nasıl Hazırlanır?',
  'Kurs Ders Programı Nasıl Hazırlanır?',
  'Özel öğretim kursları, etüt merkezleri ve sınava hazırlık kurumları için esnek ve hafta sonunu kapsayan ders programı hazırlama rehberi.',
  'Kurs Ders Programı Nasıl Hazırlanır? | Derso',
  'Kurs ders programı nasıl hazırlanır? Esnek saatler, hafta sonu dersleri, öğretmen uygunlukları ve grup planlaması için pratik rehber.',
  array['kurs ders programı','kurs programı hazırlama','etüt merkezi ders programı','hafta sonu ders programı'],
  $md$
Kurs, etüt ve sınava hazırlık kurumlarında ders programı okullardan farklıdır. Saatler daha esnek, Cumartesi–Pazar dersleri yaygındır ve öğretmen müsaitlikleri sık değişir. Bu rehber kurs ders programını adım adım ele alır.

## Kurs ders programını okul programından ayıran nedir?

- Standart zil düzeni her zaman yoktur
- Gruplar seviye / deneme / branşa göre bölünebilir
- Hafta sonu yoğunluğu yüksektir
- Öğretmenler birden fazla kurumda çalışabilir

Bu yüzden [esnek ders programı](/esnek-ders-programi) ve 7 günlük planlama kurslar için kritik hale gelir.

## 1. Grupları ve ders paketlerini netleştirin

Her grubun hangi dersleri, haftada kaç saat alacağını yazın. “TYT Matematik 6 saat” gibi net hedefler olmadan dağıtım spekülasyona döner.

## 2. Çalışma günlerini ve saat dilimlerini tanımlayın

Cumartesi ve Pazar dahil edilecek mi? Akşam dilimleri var mı? Bunları baştan sabitleyin. Derso ile [kurs ders programı](/kurs-ders-programi) sayfasında anlattığımız gibi 7 gün tek çizelgede yönetilebilir.

## 3. Öğretmen uygunluklarını toplayın

Kurs öğretmenlerinde uygunluk değişkenliği yüksektir. Uygun olmayan saatler tanımlanmadan yapılan program, ilk hafta bozulur.

## 4. Otomatik taslak + manuel ince ayar

Önce [otomatik ders programı](/otomatik-ders-programi) ile çakışmasız bir iskelet alın. Sonra kurum özel önceliklere göre hücreleri kaydırın.

## 5. Öğretmen ve grup çıktılarını paylaşın

Öğretmenler kendi programını, danışmanlar grup programını görmek ister. [Excel ve PDF dışa aktarım](/ders-programi-excel-pdf) bu paylaşımı hızlandırır.

## Sık yapılan kurs programı hataları

- Hafta sonunu ayrı Excel'de tutmak
- Deneme sınavı günlerini programa işlememek
- Öğretmen yükünü sadece “toplam saat” ile takip etmek
- Grup birleşmelerini sonradan eklemek

Tek merkezde tutulan, hafta sonunu da kapsayan bir program bu hataları azaltır.
$md$,
  '2026-03-15T09:00:00Z',
  true
)
on conflict (slug) do update set
  title = excluded.title,
  h1 = excluded.h1,
  excerpt = excluded.excerpt,
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  keywords = excluded.keywords,
  content_md = excluded.content_md,
  published_at = excluded.published_at,
  is_published = excluded.is_published,
  updated_at = now();
