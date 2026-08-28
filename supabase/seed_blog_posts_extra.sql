-- Additional SEO blog posts (upsert by slug)
insert into public.blog_posts (
  slug, title, h1, excerpt, meta_title, meta_description, keywords, content_md, published_at, is_published
) values
(
  'ogretmen-ders-programi-nasil-yonetilir',
  'Öğretmen Ders Programı Nasıl Yönetilir?',
  'Öğretmen Ders Programı Nasıl Yönetilir?',
  'Öğretmen yükü, izin günleri ve branş atamalarını bozmadan haftalık öğretmen ders programını yönetme rehberi.',
  'Öğretmen Ders Programı Nasıl Yönetilir? | Derso',
  'Öğretmen ders programı yönetimi: uygunluklar, haftalık yük, çakışma kontrolü ve sınıf-öğretmen görünümü. Okul ve kurslar için pratik rehber.',
  array['öğretmen ders programı','öğretmen programı yönetimi','öğretmen ders dağılımı','öğretmen yükü'],
  $md$
Öğretmen ders programı yalnızca “kim hangi sınıfta?” sorusu değildir. Branş uygunluğu, izin günleri, haftalık yük dengesi ve çakışmalar birlikte yönetilmelidir. Bu yazıda öğretmen programını sürdürülebilir şekilde nasıl kuracağınızı anlatıyoruz.

## Öğretmen programı neden ayrı takip edilmeli?

Sadece sınıf programına bakmak yanıltıcıdır. Aynı öğretmen farklı sınıflarda peş peşe ders alır; yük bir günde şişer, başka günde boş kalır. [Öğretmen ders programı](/ogretmen-ders-programi) görünümü bu dengesizliği erken yakalar.

## 1. Branş ve ders yetkinliklerini netleştirin

Her öğretmenin verebileceği dersleri baştan tanımlayın. Otomatik dağıtım bu bilgiye dayanır; eksik yetkinlik tanımı yanlış atamalara yol açar.

## 2. İzin ve müsait olmayan günleri girin

Part-time öğretmenler, idari görevler veya başka kurumdaki dersler sık kısıt üretir. Uygunluk tanımlanmadan üretilen program ilk hafta bozulur.

## 3. Haftalık yük hedefini görünür tutun

Toplam saat tek başına yetmez. Günlere yayılım, peş peşe ders sayısı ve boşluklar da önemlidir. Dağıtımdan sonra öğretmen bazında kontrol edin.

## 4. Çakışmaları öğretmen perspektifinden doğrulayın

Kontrol listesi:

- Aynı saatte iki sınıf
- İzin gününe yazılmış ders
- Yetkin olmadığı ders ataması
- Aşırı yüklü günler

## 5. Paylaşımı tek kaynaktan yapın

Öğretmenlere PDF veya Excel çıktı verirken kaynağın güncel olduğundan emin olun. [Excel ve PDF dışa aktarım](/ders-programi-excel-pdf) ile aynı programdan hem sınıf hem öğretmen çıktısı alınabilir.

## Sık yapılan hatalar

- Öğretmen uygunluklarını sonradan eklemek
- Yalnızca “toplam saat”e bakmak
- Sınıf programını düzeltip öğretmen görünümünü yenilememek
- Branş atamasını Excel notlarıyla yönetmek

Tanımlar tek merkezde tutulduğunda [otomatik ders programı](/otomatik-ders-programi) daha temiz bir öğretmen dağılımı üretir.
$md$,
  '2026-03-22T09:00:00Z',
  true
),
(
  'ders-programi-cakisma-nasil-onlenir',
  'Ders Programı Çakışması Nasıl Önlenir?',
  'Ders Programı Çakışması Nasıl Önlenir?',
  'Öğretmen ve sınıf çakışmalarını önlemek için kontrol listesi, yaygın hata kaynakları ve otomatik denetimin rolü.',
  'Ders Programı Çakışması Nasıl Önlenir? | Derso',
  'Ders programı çakışması nasıl önlenir? Öğretmen-sınıf çakışma kontrolü, uygunluk kuralları ve otomatik dağıtımla hata azaltma rehberi.',
  array['ders programı çakışması','çakışma kontrolü','öğretmen çakışması','sınıf çakışması'],
  $md$
Ders programı çakışması; aynı öğretmenin veya aynı sınıfın aynı saatte iki yerde görünmesidir. Küçük kurumlarda bile hızlı büyür ve gün içinde programı bozar. Bu rehber çakışmayı baştan nasıl keseceğinizi özetler.

## Çakışma türleri

- **Öğretmen çakışması:** Aynı öğretmen, aynı saatte iki sınıf
- **Sınıf çakışması:** Aynı sınıf, aynı saatte iki ders
- **Uygunluk ihlali:** Öğretmenin izinli olduğu güne ders yazılması
- **Kapasite aşımı:** Günün veya haftanın slot sınırını aşmak

## 1. Veriyi tek yerde tutun

Çakışmanın en sık nedeni farklı Excel dosyalarıdır. Sınıf programı bir dosyada, öğretmen programı başka dosyada güncellenir; ikisi birbirini tutmaz. Tek kaynak şarttır.

## 2. Uygunlukları dağıtımdan önce girin

Uygunluk sonradan eklenirse “doğru görünen” program uygulamada patlar. [Ders programı nasıl hazırlanır?](/blog/ders-programi-nasil-hazirlanir) rehberindeki sıra burada da geçerlidir: önce tanımlar, sonra dağıtım.

## 3. Otomatik yerleştirmeyi çakışma motoruyla kullanın

[Otomatik ders programı](/otomatik-ders-programi) üretimi sırasında öğretmen ve sınıf doluluğunu birlikte değerlendirir. Manuel ızgarada unutulan kontroller otomatik aday üretiminde peşinen elenir.

## 4. Sonuçları iki görünümde doğrulayın

- Sınıf programı: o şubenin günü dolu mu, boşluklar mantıklı mı?
- Öğretmen programı: yük dengeli mi, peş peşe dersler aşırı mı?

İki görünüm birlikte bakılmadan program “temiz” sayılmamalıdır.

## 5. Paylaşımdan sonra tek yerden güncelleyin

Programı PDF/Excel ile paylaştıktan sonra değişiklikleri dosya kopyalarında değil sistemde yapın. Aksi halde yeni çakışmalar sessizce birikir.

## Pratik kontrol listesi

- Aynı öğretmen aynı saatte iki yerde mi?
- Aynı sınıf aynı saatte iki derste mi?
- İzin gününe ders yazıldı mı?
- Haftalık hedef saat aşıldı mı / açıkta kaldı mı?
- Hafta sonu ayrı dosyada mı tutuluyor?

Bu maddeler yeşil olmadan programı duyurmayın.
$md$,
  '2026-03-29T09:00:00Z',
  true
),
(
  'hafta-sonu-ders-programi-hazirlama',
  'Hafta Sonu Ders Programı Nasıl Hazırlanır?',
  'Hafta Sonu Ders Programı Nasıl Hazırlanır?',
  'Cumartesi–Pazar derslerini hafta içinden ayırarak planlama: farklı saat dilimleri, öğretmen uygunlukları ve çıktı düzeni.',
  'Hafta Sonu Ders Programı Nasıl Hazırlanır? | Derso',
  'Hafta sonu ders programı hazırlama rehberi: Cumartesi–Pazar saatleri, esnek çizelge, öğretmen uygunlukları ve hafta içi ile birlikte yönetim.',
  array['hafta sonu ders programı','Cumartesi ders programı','Pazar ders programı','esnek ders programı'],
  $md$
Kurs ve etüt merkezlerinde Cumartesi–Pazar dersleri sık görülür. Hafta sonunu ayrı bir Excel’de tutmak kısa sürede versiyon karmaşası yaratır. Bu yazıda hafta sonu programını hafta içiyle birlikte nasıl kuracağınızı anlatıyoruz.

## Hafta sonunu ayrı tutmak neden sorun yaratır?

- Öğretmen uygunluğu iki dosyada güncellenir
- Aynı öğretmen hafta içi + hafta sonu yükü görünmez
- Çıktılar tutarsızlaşır
- Deneme / özel günler unutulur

[Esnek ders programı](/esnek-ders-programi) ihtiyacı olan kurumlar 7 günü tek modelde yönetmelidir.

## 1. Hafta sonu günlerini ve saat dilimlerini tanımlayın

Cumartesi ve Pazar için ayrı başlangıç saati veya farklı ders süresi olabilir. Hafta içi 08:00 başlayan kurum, hafta sonu 09:00–13:00 aralığında çalışabilir.

## 2. Hangi sınıfların hafta sonu dersi olduğunu işaretleyin

Her sınıfın penceresi farklıdır. Hafta sonu dersi olmayan sınıflarda Cumartesi–Pazar kolonlarını göstermemek okunabilirliği artırır.

## 3. Öğretmen uygunluklarını hafta sonuna özel toplayın

Birçok öğretmen hafta sonunu kısmi çalışır. Uygunluk girilmeden yapılan dağıtım, ilk hafta bozulur.

## 4. Dağıtım ve çıktıyı iki blok halinde düşünün

Pratik akış:

1. Hafta içi (Pazartesi–Cuma) yerleşimi
2. Hafta sonu (Cumartesi–Pazar) yerleşimi
3. Öğretmen toplam yükünün birlikte kontrolü

PDF/Excel çıktılarında da hafta içi ve hafta sonunu ayrı tablolar halinde sunmak okumayı kolaylaştırır. Detaylar için [Excel ve PDF](/ders-programi-excel-pdf) sayfasına bakın.

## 5. Kurs özel senaryoları

[Kurs ders programı](/kurs-ders-programi) süreçlerinde deneme sınavı, branş kampı veya seviye birleşmeleri hafta sonuna yığılır. Bunları “not” olarak değil programa işleyin.

## Özet

Hafta sonu ders programı; ayrı bir dosya değil, aynı programın ikinci zaman çizelgesidir. Tanımlar, uygunluklar ve çıktılar tek yerde tutulduğunda hem çakışma azalır hem paylaşım sadeleşir.
$md$,
  '2026-04-05T09:00:00Z',
  true
),
(
  'ders-programi-pdf-excel-nasil-indirilir',
  'Ders Programı PDF ve Excel Olarak Nasıl İndirilir?',
  'Ders Programı PDF ve Excel Olarak Nasıl İndirilir?',
  'Sınıf ve öğretmen programlarını PDF/Excel olarak paylaşma: çarşaf listeler, resmi çıktılar ve güncel dosya disiplinı.',
  'Ders Programı PDF ve Excel İndirme | Derso',
  'Ders programını PDF ve Excel olarak indirme rehberi: sınıf çarşafı, öğretmen programı, resmi yazdırma ve paylaşım ipuçları.',
  array['ders programı PDF','ders programı Excel indirme','çarşaf listesi','öğretmen programı PDF'],
  $md$
Program hazır olduktan sonra asıl iş paylaşımıdır. Müdür yardımcısı, öğretmenler ve danışmanlar farklı format ister: kimisi çarşaf liste, kimisi sınıf sayfası, kimisi öğretmen yazısı. Bu rehber PDF ve Excel çıktılarını doğru kullanmayı anlatır.

## Hangi çıktı ne işe yarar?

- **Sınıf çarşaf listesi:** Tüm sınıfların haftalık özeti; panoya asmak için
- **Öğretmen çarşaf listesi:** Öğretmen bazında yoğunluk ve boşluk kontrolü
- **Sınıf ders programı:** Her sınıf için ayrı sayfa + imza alanları
- **Öğretmen programı:** Resmî yazı formatında öğretmen çıktısı

Detaylı ürün anlatımı için [ders programı Excel/PDF](/ders-programi-excel-pdf) sayfasına bakabilirsiniz.

## 1. Önce programı kilitleyin

Çıktı almadan önce çakışma ve açıkta kalan saatleri gözden geçirin. Yarım programın PDF’i, yarım bilgi yayar.

## 2. Doğru görünümü seçin

Kurum içi kontrol için çarşaf listeler; öğretmenlere tebliğ için öğretmen programı sayfaları daha uygundur. Sınıf panoları için sınıf programı çıktısı tercih edilir.

## 3. Excel’i düzenleme, PDF’i arşiv için kullanın

Excel, hızlı filtre ve not için işe yarar. Nihai paylaşım ve arşiv için PDF daha güvenlidir; yanlışlıkla hücre kaydırma riski düşer.

## 4. Versiyon disiplinini koruyun

- Dosya adında tarih kullanın
- Eski çıktıları “güncel” diye iletmeyin
- Değişiklikleri sistemde yapıp çıktıyı yenileyin

## 5. Hafta sonu varsa ayrı tablo düşünün

Cumartesi–Pazar dersi olan kurumlarda hafta içi ve hafta sonunu ayrı tablolar halinde indirmek okunabilirliği artırır. [Hafta sonu ders programı](/blog/hafta-sonu-ders-programi-hazirlama) yazısında planlama tarafını anlattık.

## Sık yapılan paylaşım hataları

- WhatsApp’a eski Excel göndermek
- Sadece sınıf çıktısı verip öğretmen yükünü paylaşmamak
- İmza alanlı çıktıyı taslak programdan üretmek
- Logo / kurum bilgisini eksik bırakmak

Tanımlar ve program tek yerde tutulduğunda çıktı üretmek dakikalar sürer; asıl kazanç, herkesin aynı versiyonu görmesidir.
$md$,
  '2026-04-12T09:00:00Z',
  true
),
(
  'otomatik-ders-dagitimi-nedir',
  'Otomatik Ders Dağıtımı Nedir? Ne İşe Yarar?',
  'Otomatik Ders Dağıtımı Nedir? Ne İşe Yarar?',
  'Otomatik ders dağıtımının ne yaptığı, hangi verilerle çalıştığı ve manuel Excel sürecinden farkı — okul ve kurslar için sade anlatım.',
  'Otomatik Ders Dağıtımı Nedir? | Derso',
  'Otomatik ders dağıtımı nedir? Öğretmen-sınıf-ders verileriyle çakışmasız program taslağı üretme, kurallar ve ince ayar süreci hakkında rehber.',
  array['otomatik ders dağıtımı','otomatik ders programı nedir','ders dağıtımı programı','ders programı otomatik'],
  $md$
Otomatik ders dağıtımı; sınıf ihtiyaçları, öğretmen uygunlukları ve haftalık ders saatlerini kurallara göre yerleştiren bir üretim adımıdır. Amacı “nihai mükemmel program” değil, çakışması düşük, düzenlenebilir bir taslak sunmaktır.

## Otomatik dağıtım neyi çözer?

Manuel Excel’de her hücreyi tek tek doldurmak:

- Zaman alır
- Çakışmayı sonradan fark ettirir
- Versiyon kargaşası yaratır

Otomatik dağıtım aday yerleştirmeleri üretir; siz kurum önceliklerine göre ince ayar yaparsınız. Ürün odaklı anlatım için [otomatik ders programı](/otomatik-ders-programi) sayfasına bakın.

## Hangi veriler gerekir?

1. Dersler ve haftalık saatler
2. Öğretmenler, branşlar, izin günleri
3. Sınıflar / gruplar ve çalışma günleri
4. Ders saat dilimleri (zil düzeni)
5. Bölme kuralları (ör. 3 saat → 2+1)

Veri eksikse sonuç da eksik olur. Excel’den toplu aktarım bu adımı hızlandırır; [Excel rehberi](/blog/excel-ders-programi-hazirlama) veri hazırlığını anlatır.

## Süreç nasıl işler?

1. Tanımları tamamlayın
2. Dağıtım kurallarını seçin
3. Otomatik arama ile en iyi taslağı üretin
4. Sınıf ve öğretmen görünümünde ince ayar yapın
5. PDF/Excel ile paylaşın

## Otomatik dağıtımın sınırları

- Kurum kültürü ve “şu öğretmen şu sınıfta olsun” gibi yumuşak tercihler her zaman modele yazılmaz
- Eksik öğretmen kapasitesi olan dersler açıkta kalabilir; bu bir hata değil görünürlüktür
- Nihai onay hâlâ insanındır

## Kimler için uygundur?

- Okullar (şube ve müfredat saati yoğun)
- Kurs / etüt merkezleri (esnek saat, hafta sonu)
- Birden fazla öğretmenin aynı dersi verdiği kurumlar

[Okul ders programı](/okul-ders-programi) ve [kurs ders programı](/kurs-ders-programi) ihtiyaçları farklıdır; otomatik dağıtım her iki senaryoda da taslak süresini kısaltır.

## Özet

Otomatik ders dağıtımı, programı sizin yerinize “bitirmez”; doğru veriyle çakışmayı azaltılmış bir iskelet verir. Asıl kazanç, deneme-yanılma döngüsünü dakikalara indirmesidir.
$md$,
  '2026-04-19T09:00:00Z',
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
