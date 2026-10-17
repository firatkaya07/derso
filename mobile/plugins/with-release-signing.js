// Yerel `bundleRelease` derlemesini Play Console'a kayıtlı upload anahtarıyla
// imzalar. android/ klasörü prebuild ile üretildiği için elle düzenlenmez;
// imza ayarı bu eklentiyle eklenir.
//
// Anahtar bilgileri repoya girmez, ~/.gradle/gradle.properties içinde durur:
//   DERSO_UPLOAD_STORE_FILE=/Users/.../derso-upload.jks
//   DERSO_UPLOAD_STORE_PASSWORD=...
//   DERSO_UPLOAD_KEY_ALIAS=...
//   DERSO_UPLOAD_KEY_PASSWORD=...
// Tanımlı değilse release derlemesi debug anahtarıyla imzalanır (Play kabul etmez).
const { withAppBuildGradle } = require("expo/config-plugins");

const RELEASE_SIGNING = `
        release {
            if (findProperty('DERSO_UPLOAD_STORE_FILE')) {
                storeFile file(findProperty('DERSO_UPLOAD_STORE_FILE'))
                storePassword findProperty('DERSO_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('DERSO_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('DERSO_UPLOAD_KEY_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (gradle.includes("DERSO_UPLOAD_STORE_FILE")) return mod;

    const debugConfig = /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/;
    const releaseUsesDebug =
      /(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/;
    if (!debugConfig.test(gradle) || !releaseUsesDebug.test(gradle)) {
      throw new Error(
        "with-release-signing: build.gradle beklenen biçimde değil; eklentiyi güncelleyin."
      );
    }

    gradle = gradle.replace(debugConfig, `$1${RELEASE_SIGNING}`);
    gradle = gradle.replace(
      releaseUsesDebug,
      "$1signingConfig findProperty('DERSO_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug"
    );
    mod.modResults.contents = gradle;
    return mod;
  });
};
