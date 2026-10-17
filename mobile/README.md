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

## Mağaza derlemeleri (yerel)

Derlemelerin hepsi bu bilgisayarda yapılır; EAS kullanılmaz. Supabase
değişkenleri derleme sırasında `.env.local` dosyasından pakete gömülür.

### 1. Sürüm numaralarını artırın

Play ve App Store aynı numarayla ikinci yüklemeyi kabul etmez:

```bash
npm run version:bump            # versionCode ve buildNumber +1
npm run version:bump -- 1.0.2   # ayrıca uygulama sürümünü değiştirir
```

Numaralar `app.json` içindedir (`version`, `android.versionCode`,
`ios.buildNumber`); değişikliği commit edin.

### 2. Android (.aab)

Gerekenler: Android Studio (JDK ve SDK onunla gelir), `~/.zshrc` içinde
`JAVA_HOME` ve `ANDROID_HOME`, ve imza bilgileri.

İmza: Play'e kayıtlı upload anahtarı `~/.android-keys/derso-upload.jks`
dosyasındadır; şifreleri `~/.gradle/gradle.properties` içindeki
`DERSO_UPLOAD_*` değişkenlerindedir (repoya girmez).
`plugins/with-release-signing.js` release derlemesini bu anahtarla imzalar.
Anahtarı ve şifreleri bir şifre yöneticisinde yedekleyin: kaybolursa Play
Console'dan upload anahtarı sıfırlama talep etmek gerekir.

```bash
npm run android:aab
```

Çıktı: `android/app/build/outputs/bundle/release/app-release.aab`. Play
Console → Test/Üretim → Yeni sürüm oluştur → dosyayı yükleyin.

Android Studio arayüzünden derlemek isterseniz Android Studio'yu terminalden
açın (Dock'tan açılınca `node` bulunamaz):

```bash
"/Applications/Android Studio.app/Contents/MacOS/studio" android > /dev/null 2>&1 &
```

### 3. iOS (App Store / TestFlight)

Gerekenler: Xcode, CocoaPods (`brew install cocoapods`), Xcode → Settings →
Accounts altında Apple geliştirici hesabı. Ekip kimliği `app.json` içinde
(`ios.appleTeamId`), imzalamayı Xcode otomatik yönetir.

```bash
npm run ios:prebuild
open ios/Derso.xcworkspace
```

Xcode'da cihaz olarak **Any iOS Device (arm64)** seçin → **Product → Archive**
→ Organizer'da **Distribute App → App Store Connect**. Paket birkaç dakika
sonra TestFlight'ta görünür.

`android/` ve `ios/` klasörleri `prebuild` ile üretilir ve gitignore'dadır;
elle düzenlemeyin, ayarları `app.json` ya da `plugins/` üzerinden yapın.

## Mağaza hesapları

Apple Developer (yıllık 99 USD) ve Google Play Console (tek seferlik 25 USD)
hesapları gerekir. Paket kimliği iOS ve Android için `com.dersomatik.app`;
mağazaya yüklendikten sonra değiştirilemez.
