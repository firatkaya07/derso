// Mağazaya yeni paket göndermeden önce sürüm numaralarını artırır.
//
//   npm run version:bump            -> Android versionCode ve iOS buildNumber +1
//   npm run version:bump -- 1.0.2   -> ayrıca uygulama sürümünü 1.0.2 yapar
//
// Play ve App Store aynı numarayla ikinci yüklemeyi kabul etmez; bu yüzden
// her yüklemede iki derleme numarası da artar.
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "app.json");
const app = JSON.parse(fs.readFileSync(file, "utf8"));
const expo = app.expo;

const nextVersion = process.argv[2];
if (nextVersion) {
  if (!/^\d+\.\d+\.\d+$/.test(nextVersion)) {
    console.error(`Geçersiz sürüm: "${nextVersion}". Örnek: 1.0.2`);
    process.exit(1);
  }
  expo.version = nextVersion;
}

expo.android.versionCode = (expo.android.versionCode ?? 0) + 1;
expo.ios.buildNumber = String(Number(expo.ios.buildNumber ?? 0) + 1);

fs.writeFileSync(file, JSON.stringify(app, null, 2) + "\n");
console.log(
  `Sürüm ${expo.version} · Android versionCode ${expo.android.versionCode} · iOS buildNumber ${expo.ios.buildNumber}`
);
