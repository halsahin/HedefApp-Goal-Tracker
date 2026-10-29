# HedefApp — Güvenlik Düzeltmeleri ve İyileştirme Önerileri

Tarih: 2026-10-27

## ✅ Yapılan Düzeltmeler

| # | Konu | Değişiklik |
|---|------|-----------|
| 1 | **Yedek içe aktarma doğrulaması yoktu** (yerel dosya + Drive) | `src/utils/backup.js` içine `parseBackupData` / `writeBackupData` eklendi. Hedef ve klasörlerin tipi/uzunluğu doğrulanıyor, bozuk kayıtlar atılıyor, 5000 hedef ve 20 MB dosya üst sınırı var. `SideDrawer.js` Drive geri yüklemesi de aynı fonksiyonu kullanıyor (önceden iki kopya kod vardı). Bozuk/kötü niyetli bir JSON artık uygulamayı çökertemez. |
| 2 | **Drive isteklerinde HTTP durumu kontrol edilmiyordu** | `googleDrive.js` içinde `response.ok` kontrolleri eklendi. Hata cevabı (401/403/5xx) artık "yedek" gibi işlenmiyor. |
| 3 | **`google-services.json` gitignore'da değildi** (untracked, yanlışlıkla commit edilebilirdi) | `.gitignore`'a `google-services.json`, `GoogleService-Info.plist` eklendi. |
| 4 | **`expo-log.txt` git'te takipteydi** | Takipten çıkarıldı (`git rm --cached`), `.gitignore`'a eklendi. Dosya diskte duruyor. |
| 5 | **npm bağımlılık açıkları** | `npm audit fix` ile 34 açık (1 kritik: `shell-quote`) → 13'e indi. `expo` 54.0.38, `expo-file-system` 19.0.24 ve uyumlu alt bağımlılıklar güncellendi; `expo install --check` temiz. |
| 6 | **Node sürümü belirsizdi** | `package.json`'a `engines: node >=20.19.4` (RN 0.81 alt sınırı) ve `.nvmrc` (Node 22 LTS) eklendi. Makinedeki Node v20.20.0 çalışıyor, ama 22 LTS önerilir. |
| 7 | Web Client ID koda gömülüydü | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` ile geçersiz kılınabilir hale getirildi (varsayılan değer korundu; bu ID gizli değildir). |

Doğrulama: `expo install --check` temiz. `expo export --no-bytecode` (Metro paketleme) başarılı. Cihazda/emülatörde **çalıştırıp denemedim**.

## ⚠️ Bilerek Yapılmayanlar

- **Expo SDK 54 → 57/58 ve React Native 0.81 → 0.86 yükseltmesi yapılmadı.** Bu büyük bir geçiş: `react-native-google-mobile-ads`, Firebase, Google Sign-In ve `newArchEnabled` birlikte etkileniyor. MEMORY.md'de SDK uyumsuzluğundan kaynaklı Play Store çökmesi geçmişi var. Kendi dalında (`git checkout -b sdk-upgrade`) `npx expo install expo@latest --fix` ve `npx expo-doctor` ile, emülatörde test ederek yapılmalı.
- **Kalan 13 npm uyarısı** (`@grpc/grpc-js`, `postcss`, `ws`, `zod`, `image-size`): çoğu geliştirme araçlarında (Metro/CLI), uygulamaya paketlenmiyor. `@grpc/grpc-js` Firebase'in `firebase` bağımlılığı üzerinden geliyor. `--force` önerilmez; Firebase 27 / Expo yükseltmesiyle çözülür.
- `@react-native-async-storage/async-storage` 3.x, `datetimepicker` 9.x gibi major sürümler Expo SDK'sı ile uyumlu sürüm olmadığı için bırakıldı.

## 💡 Önerilen İyileştirmeler (yapılmadı)

**Güvenlik / gizlilik**
1. `allowBackup: true` — hedefler Android otomatik yedeğine (Google hesabı) giriyor. Hassas veri tutuluyorsa `false` yapın ya da `fullBackupContent` kuralı yazın.
2. **Veriler şifresiz** (AsyncStorage) ve Drive yedeği düz JSON. İsteğe bağlı parola ile şifreleme düşünülebilir.
3. Firebase Analytics kullanılıyor: Play Store "Data safety" formu ve uygulama içi gizlilik politikası/kullanıcı onayı (özellikle AB/GDPR için) güncel mi kontrol edin.
4. Drive'dan geri yükleme mevcut verinin **üzerine yazıyor**. Geri yüklemeden önce mevcut veriyi otomatik yerel yedeğe almak veri kaybını önler.
5. `console.error` ile token/hata detayları loglanıyor; production'da kısıtlayın.

**Kod kalitesi**
6. `app.json` ile `app.config.js` aynı alanları tekrar ediyor ve eşitlenmemiş (`app.json` içinde `ADMOB_APP_ID_PLACEHOLDER` var). Tek kaynak bırakıp `app.json`'ı silin.
7. Sürüm numaraları CLAUDE.md'de (1.2.1 / versionCode 4) ile gerçekte (1.3.4 / 9) uyuşmuyor; CLAUDE.md'yi güncelleyin. `eas.json`'a `appVersionSource: "remote"` + `autoIncrement` eklenebilir.
8. Aynı depolama anahtarı sabitleri (`'goaltracker_v2'`) `SideDrawer.js`, `backup.js`, hook'larda dağınık; tek bir `constants/storage.js` yapın.
9. Drive senkronizasyonunda çakışma çözümü yok ("son yazan kazanır"); cihazlar arası veri kaybı olabilir. `updatedAt` alanıyla birleştirme eklenebilir.
10. Hata yönetimi sessiz (`catch {}`); en azından geliştirme modunda log, kullanıcıya Toast.
11. Test yok: `parseBackupData`, `createNextInstance`, `calcRemainingDays` için Jest birim testleri eklenmesi iyi olur.
12. `package.json` için `expo-doctor` ve `npm audit --omit=dev` komutlarını CI'a ekleyin (`npm run audit` scripti eklendi).
13. Yedek dosyası `cacheDirectory`'de paylaşıldıktan sonra silinmiyor; paylaşımdan sonra `deleteAsync` ile temizleyin.
14. Yedek dosya adı ve paylaşım başlığı (`'Yedeği Kaydet'`) sabit Türkçe — CLAUDE.md kuralı 3'e göre `t()` kullanmalı.
15. Yerel Hermes derlemesi (`expo export`) bu makinede `DOMRectReadOnly.js` "private properties" hatası veriyor; EAS bulut build'i ile test edin, gerekirse `expo-doctor` çıktısına bakın.

## ✅ 2. Tur (1.3.5 / versionCode 10)

- Sürüm 1.3.5, Android `versionCode` 10 (`app.config.js`, `app.json`, `package.json`, `CLAUDE.md` eşitlendi).
- Drive/dosya geri yüklemeden önce mevcut veri `goaltracker_pre_restore_v1` anahtarına güvenlik kopyası olarak alınıyor.
- Yedek dosyası paylaşımdan sonra cache'den siliniyor; paylaşım başlığı `t()` ile geliyor.

## 🔥 Firebase Durumu

- Kod tarafı bağlı: `@react-native-firebase/app` + `analytics` kurulu, plugin'ler `app.config.js`'te, `analytics.js` olayları `App.js`'ten gönderiyor. `google-services.json` paket adı (`com.r1cha.hedefApp`) ile eşleşiyor.
- **Yapılması gerekenler:**
  1. `google-services.json` artık `.gitignore`'da, bu yüzden EAS buluta yüklemez. Bir kez: `eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment production` (preview için de tekrarlayın). `app.config.js` bu değişkeni zaten okuyor.
  2. Firebase **yerel `expo start`/Expo Go ile çalışmaz**; yeni bir EAS/dev build gerekir (`eas build --profile production --platform android`).
  3. iOS için `GoogleService-Info.plist` ve `ios.googleServicesFile` yok; iOS build alacaksanız eklenmeli.
  4. `google-services.json` içinde `oauth_client` boş: Firebase konsolunda Android uygulamasına SHA-1 (`eas credentials` ile alın) ekleyip dosyayı yeniden indirin. Google Drive girişi için de gerekli olabilir.
  5. Google Sign-In `webClientId`'si (proje 830389547706) Firebase projesinden (817198178911) farklı; aynı projeye taşımanız daha sağlıklı.
  6. Analytics verisi konsolda ~24 saat içinde görünür; anında görmek için DebugView kullanın.
