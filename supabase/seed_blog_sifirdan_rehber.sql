-- New-user onboarding guide: register → PDF
insert into public.blog_posts (
  slug, title, h1, excerpt, meta_title, meta_description, keywords, content_md, published_at, is_published
) values
(
  'derso-sifirdan-ders-programi-rehberi',
  'Derso''ya Yeni Kayıt: Sıfırdan Ders Programına Adım Adım',
  'Derso''ya Yeni Kayıt: Sıfırdan Ders Programına Adım Adım',
  'Platforma ilk kez girenler için mantık sırasıyla rehber: kurum kurulumu, tanımlar, ders-öğretmen-sınıf, otomatik dağıtım, ince ayar ve PDF çıktı. Nelere dikkat edilmeli?',
  'Derso''ya Yeni Kayıt: Sıfırdan Program Rehberi',
  'Derso''ya sıfırdan başlayanlar için adım adım rehber. Kayıt, kurum, tanımlar, Excel veya manuel veri, otomatik dağıtım, program düzenleme ve PDF indirme sırası.',
  array['Derso nasıl kullanılır','ders programı adım adım','otomatik ders programı başlangıç','ders programı PDF'],
  $md$
Derso’ya yeni kaydoldunuz. Ekranda birçok kart var; hangisinden başlanacağı net değilse dağıtım yarım kalır veya PDF boş çıkar. Bu yazı **mantık sırasını** verir: kayıtten kurum kurulumuna, tanımlardan otomatik dağıtıma, ince ayardan PDF’e kadar.

Kısa özet sıra:

1. Kayıt ol / giriş yap
2. Kurumu oluştur
3. Genel Tanımlar
4. Dersler → Öğretmenler → Sınıflar (veya Excel içe aktarma)
5. Otomatik dağıtım ve kaydet
6. Sınıf / öğretmen programında ince ayar
7. Program İndir → Yazdır / PDF Kaydet

## 1. Kayıt ve giriş

[Giriş](/login) sayfasından hesap oluşturun (e-posta + şifre). Oturum açılınca sistem sizi panele alır.

**Dikkat:** Henüz bir kurumunuz yoksa önce onboarding ekranı gelir; ana sayfadaki program kartlarına hemen geçemezsiniz.

## 2. Kurumu oluşturun

Kurum adını girip kaydedin. Bu adım sizi o kuruma bağlar; veriler kurum bazlı tutulur.

**Dikkat:**

- Kurum adı boş olamaz
- Logo, il/ilçe, müdür bilgileri sonra **Genel Tanımlar**’dan tamamlanır; PDF başlıkları için faydalıdır ama ilk günde zorunlu değildir

Kurum oluşunca ana sayfaya düşersiniz.

## 3. Genel Tanımlar (önce bunu yapın)

Ana sayfadan **Genel Tanımlar**’a gidin. Burada kurum kimliği ve ders saati dilimleri yaşar.

Yapılacaklar:

- İl, ilçe, kurum adı (çıktı başlığı)
- İsterseniz logo (PNG/JPEG/WEBP/SVG, makul boyutta)
- Müdür / müdür yardımcısı (imza satırları için)
- Eğitim yılı
- **Ders süresi** ve **teneffüs** (dakika) — sınıf gün pencereleri bu sürelerle slot üretir
- Alan listesi (TM, MF…); ihtiyaç yoksa dokunmayın

**Dikkat:**

- Süreleri sonradan değiştirmek, sınıf günlerinde üretilen saat dilimlerini etkiler
- Logo ve unvanlar boşsa program yine çalışır; PDF daha “resmî” görünmez
- Üst menüdeki **V1 / V2** seçici varsayılan olarak V1’dir. İlk kurulumda V1 ile ilerleyin; hafta içi–hafta sonu ayrı çizelge ihtiyacı netleşince V2’ye geçin. V2’de zaman çizelgesi **V2 Genel Tanımlar** altındadır ve V1 programına dokunmaz

## 4. Veriyi doldurun: ders → öğretmen → sınıf

Dağıtımın yakıtı bu üç tanımdır. Sıra önemlidir.

### 4a. Dersler

Her ders için ad zorunludur. Kısa ad (PDF hücreleri için), seviye, alan ve renk isteğe bağlıdır.

**Dikkat:** Seviye seçerseniz uygun sınıfların müfredatına otomatik eklenebilir. Alan seçmezseniz ders tüm alanlara açık sayılır.

### 4b. Öğretmenler

Ad soyad zorunlu. Branş bilgilendirmedir; asıl kritik olan **verdiği dersler** ve **izin günleri**dir.

**Dikkat:**

- Öğretmene ders bağlamazsanız otomatik dağıtım o kişiyi o derse yazamaz
- İzin gününü sonradan eklemek, “doğru görünen” programı bozar — uygunlukları dağıtımdan önce girin

### 4c. Sınıflar

Şube adı zorunlu. Sonra:

1. Seviye / alan
2. **Sınıf dersleri:** haftalık saat + mümkünse sabit öğretmen
3. **Ders günleri:** hangi günler, başlangıç–bitiş saati (pencere)

**Dikkat:**

- Ders günü tanımlı olmayan sınıfa program oturmaz
- “N derste öğretmen yok” uyarısını dağıtımdan önce kapatın; aksi halde saatler açıkta kalır
- Gün penceresini daraltırsanız pencere dışındaki yerleşmiş saatler silinebilir — onay penceresini okuyun

### 4d. Alternatif: Excel içe aktarma

Manuel tek tek girmek yerine **Excel İçe Aktarma** ile şablonu indirip doldurabilirsiniz. Sayfalar arası isimler birebir eşleşmeli; hatalar içe aktarmayı durdurur, bazı uyarılar (ör. günü olmayan sınıf) engellemez.

**Pratik tavsiye:** Küçük kurumda manuel; çok şube/öğretmende Excel.

## 5. Otomatik dağıtım

Tanımlar tamamsa **Otomatik Dağıtım**’a gidin.

1. Bölme kurallarını gözden geçirin (ör. 3 saat → 2+1)
2. Arama turu sayısını seçin
3. Programı oluştur → izleme sayfasında turları takip edin
4. Sonucu beğenince **Programı Kaydet**

**Dikkat:**

- Sınıf–ders kaydı yoksa dağıtım başlamaz; önce Excel veya sınıf derslerini tamamlayın
- Bir sınıfın bir dersinin tüm saatlerini tek öğretmen verir; öğretmen yetmezse ders bölünmez, açıkta kalır ve raporda görünür — bu bir hata değil sinyaldir
- Arama sırasında mevcut program silinmez; **kaydet** deyince yerine geçer
- V2 kullanıyorsanız V2 dağıtımını çalıştırın; V1 `lessons` tablosuna yazmaz

## 6. İnce ayar (sınıf ve öğretmen programı)

Kayıttan sonra:

- **Sınıf Programları:** kartlarla sürükle-bırak / tıkla yerleştirme
- **Öğretmen Programları:** yük ve izin günü kontrolü

**Dikkat:** Sadece sınıf ızgarasına bakmak yetmez. Aynı öğretmen iki sınıfta çakışabilir; öğretmen görünümünü de kontrol edin. Ayrıntılı kontrol listesi için [çakışma yazısına](/blog/ders-programi-cakisma-nasil-onlenir) bakabilirsiniz.

## 7. PDF (ve Excel) çıktı alın

**Program İndir** sayfasına gidin. Seçenekler:

- Sınıf / öğretmen çarşaf listesi (PDF veya Excel)
- Sınıf ders programları (sayfa sayfa, imza alanlı)
- Öğretmen programları (resmî yazı formatı)

**Yazdır / PDF Kaydet** yeni sekmede çıktıyı açar; tarayıcıdan “PDF olarak kaydet” deyin.

**Dikkat:**

- Program boşsa önce dağıtım veya manuel yerleşim yapın
- Açılır pencere engelliysa HTML indirilir; dosyayı açıp yazdırın
- Logo ve kurum bilgisi Tanımlar’dan gelir — çıktı almadan önce bir kez kontrol edin
- Paylaştıktan sonra düzeltme yaparsanız eski PDF’i değil güncel çıktıyı yeniden alın

V2’de hafta içi ve hafta sonu ayrı tablolar halinde gelir; [hafta sonu rehberi](/blog/hafta-sonu-ders-programi-hazirlama) planlama tarafını anlatır.

## Sık yapılan “erken başlama” hataları

- Tanımlar ve sınıf günleri boşken dağıtıma basmak
- Öğretmene ders bağlamadan “branş yeterli” sanmak
- İzin günlerini PDF’ten sonra girmek
- Sadece sınıf programını düzeltip öğretmen çakışmasını kontrol etmemek
- V1’de ürettiği programı V2’de aramak (veya tersi) — sürüm seçici üst menüdedir

## Kontrol listesi (PDF öncesi)

- [ ] Kurum oluşturuldu
- [ ] Ders süresi / teneffüs ayarlandı
- [ ] Dersler, öğretmenler (ders + izin), sınıflar (ders + gün) tamam
- [ ] Dağıtım çalıştı ve **kaydedildi**
- [ ] Sınıf + öğretmen görünümünde çakışma yok
- [ ] Tanımlar’da logo / unvanlar çıktı için yeterli
- [ ] Program İndir’den güncel PDF alındı

Bu sıra bozulmadan ilerlerseniz “neden boş PDF?” veya “neden dersler açıkta?” sorularının çoğu kendiliğinden kaybolur. Otomatik dağıtımın ne yaptığına dair kısa özet için [otomatik ders dağıtımı nedir?](/blog/otomatik-ders-dagitimi-nedir) yazısına, çıktı türleri için [PDF/Excel indirme](/blog/ders-programi-pdf-excel-nasil-indirilir) rehberine bakabilirsiniz.
$md$,
  '2026-04-26T09:00:00Z',
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
