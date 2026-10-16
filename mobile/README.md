# Derso Mobil

Derso'nun iOS ve Android uygulaması. Expo (SDK 58), Expo Router ve TypeScript
ile yazılmıştır; web uygulamasıyla aynı Supabase projesini kullanır.

İlk sürüm salt okunurdur: kurum kullanıcısı giriş yapar, sınıfların ve
öğretmenlerin haftalık programını gün gün görür. Program hazırlama, Excel
aktarımı ve ayarlar web'de kalır.

## Kurulum

```bash
cd mobile
npm install
cp .env.example .env.local   # web'deki Supabase URL ve anon key
npx expo start
```

Telefona App Store / Play Store'dan **Expo Go** kurup terminaldeki QR kodu
okutun. Simülatörde açmak için Xcode (iOS) ya da Android Studio gerekir.

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npx expo start` | Geliştirme sunucusu |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run lint` | ESLint |
| `npx expo-doctor` | Bağımlılık ve yapılandırma kontrolü |
| `npx expo install <paket>` | SDK ile uyumlu sürümle paket ekleme (`npm install` yerine) |

## Web ile kod paylaşımı

Mobil uygulama ayrı bir npm projesidir (kendi `node_modules`'u var); web'in
React/Next sürümleriyle çakışmaz. Web'in `src/lib` klasörü doğrudan kullanılır:

- `tsconfig.json`: `@/*` → `../src/*` (web'deki alias ile aynı), mobilin
  kendi kodu için `~/*` → `./src/*`.
- `metro.config.js`: `../src/lib` klasörünü `watchFolders`'a ekler.

Çizelgeleme kuralları, tipler, kurum/ayar/V2 sorguları bu yolla tek yerden
gelir. Ortak koda paketler yalnızca `import type` ile alınmalıdır.

## Yapı

```
src/
  app/                 Expo Router ekranları
    _layout.tsx        Oturum durumuna göre giriş / uygulama yönlendirmesi
    login.tsx
    (app)/
      index.tsx        Sınıf / öğretmen listesi
      sinif/[id].tsx   Sınıfın haftalık programı
      ogretmen/[id].tsx Öğretmenin haftalık programı
  components/          WeekSchedule, durum görünümleri
  data/                Supabase istemcisi, oturum, program sorguları
  theme.ts             Web'deki renk değişkenleri
```

Oturum `expo-sqlite` tabanlı `localStorage` ile cihazda saklanır (Expo'nun
Supabase rehberindeki yöntem). V1/V2 seçimi kullanıcının web'deki tercihinden
(`user_preferences.schedule_edition`) okunur.

## Android derlemesi (Play Console için .aab)

Proje EAS'ta `@firatkaya/derso` olarak kayıtlı. İmza anahtarı (keystore) ve
`versionCode` sayacı EAS'ta tutulur; her derlemede sürüm numarası otomatik
artar. Supabase değişkenleri EAS ortam değişkeni olarak tanımlıdır.

**Bulutta** (bilgisayarda Android aracı gerekmez):

```bash
npm run build:android
```

**Bilgisayarda** (Android Studio gerekir; anahtarı ve sürüm numarasını yine
EAS'tan alır, şifreler diske yazılmaz):

```bash
npm run build:android:local    # çıktı: dist/derso.aab
```

Yerel derleme için Android Studio'yu kurup bir kez açın (SDK'yı ilk açılışta
indirir) ve kabukta şu değişkenleri tanımlayın:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

İlk `.aab` Play Console'a elle yüklenir (Test > Dahili test > Yeni sürüm;
Play App Signing açık kalsın). Sonrakiler `npx eas-cli@latest submit -p android`
ile gönderilebilir.

## Mağaza hesapları

Apple Developer (yıllık 99 USD) ve Google Play Console (tek seferlik 25 USD)
hesapları gerekir. Paket kimliği iOS ve Android için `com.dersomatik.app`;
mağazaya yüklendikten sonra değiştirilemez.
