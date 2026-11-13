# HedefApp — CLAUDE.md

> **Proje:** HedefApp — Minimalist Hedef Takip Uygulaması  
> **Platform:** React Native + Expo (iOS & Android)  
> **Versiyon:** 1.4.0 (versionCode EAS'ta tutulur ve her production build'de otomatik artar)  
> **Bundle ID:** `com.r1cha.hedefApp`

---

## Proje Özeti

HedefApp, kullanıcıların hedeflerini oluşturup takip edebildiği minimalist bir mobil uygulamadır. React Native / Expo ile yazılmış olup Google AdMob ile monetize edilmektedir. Veri AsyncStorage'da yerel olarak saklanır — backend veya bulut senkronizasyonu **yoktur**.

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Framework | React Native 0.81.5 + Expo ~54 |
| State | React `useState` / `useReducer` (hook tabanlı) |
| Depolama | `@react-native-async-storage/async-storage` |
| Bildirimler | `expo-notifications` |
| Takvim | `expo-calendar`, `react-native-calendars` |
| Yedekleme | `expo-file-system` + `expo-sharing` + `expo-document-picker` |
| Reklamlar | `react-native-google-mobile-ads` (AdMob Banner) |
| i18n | Özel context + `src/i18n/translations.js` |
| Derleme | EAS Build (eas.json) |
| Test | `npm test`: saf mantık için Node test koşucusu (`tests/*.test.mjs`) + ekran/hook testleri için Jest (`jest-expo`, `__tests__/*.test.js`) |

---

## Klasör Yapısı

```
hedefapp/
├── App.js                  # Uygulama giriş noktası; tüm provider'ları ve modal'ları barındırır
├── app.config.js           # Dinamik Expo konfigürasyonu (AdMob ID'leri buraya eklenir)
├── index.js                # Expo entry point
├── eas.json                # EAS Build profilleri
├── src/
│   ├── components/         # UI bileşenleri (15 adet)
│   ├── hooks/              # useGoals, useFolders, useCounterRecords
│   ├── contexts/           # ThemeContext
│   ├── i18n/               # LanguageContext + translations.js
│   ├── utils/              # notifications, backup, backupSchema, recurrence, tracking, googleDrive, consent, dateUtils, calendar
│   └── constants/          # categories, theme renk paletleri
├── tests/                  # Saf mantık birim testleri — Node ile (`npm run test:unit`)
├── __tests__/              # Bileşen ve hook testleri — Jest ile (`npm run test:ui`); ortak sahte modüller jest.setup.js'te
├── scripts/screenshots/    # README ekran görüntülerini üretir (`bash scripts/screenshots/run.sh`)
├── assets/                 # icon, splash, adaptive-icon, favicon, screenshots
└── src/config/ads.js       # GİTİGNORE — gerçek AdMob ID'leri burada tutulur
```

---

## Temel Mimari

### Veri Akışı

```
AsyncStorage (goaltracker_v2) → useGoals → AppContent → GoalCard / GoalDetailModal
AsyncStorage (goaltracker_folders_v1) → useFolders → SideDrawer / FolderPickerModal
```

- **`useGoals(activeFolderId)`** — merkezi hedef yönetimi: CRUD, sıralama, filtreleme, arama, alt görevler, notlar
- **`useFolders()`** — klasör yönetimi (add, rename, delete)
- **`useCounterRecords()`** — sayaç kaydı yönetimi (CounterModal için)
- **`ThemeContext`** — `light | dark | system` tema modu, AsyncStorage'da persist edilir
- **`LanguageContext`** — `tr | en | zh | ja | ko`, `t(key, params)` fonksiyonu ile çeviri

### Hedef Veri Modeli

```js
{
  id: string,           // UUID benzeri timestamp tabanlı ID
  name: string,
  category: string,     // constants/categories.js'teki anahtarlar
  deadline: string,     // "YYYY-MM-DD"
  startDate: string | null,
  description: string,
  completed: boolean,
  pinned: boolean,
  createdAt: string,    // ISO 8601
  progress: number,     // 0-100 (alt görevlerden otomatik hesaplanır)
  recurring: { type: 'daily'|'weekly'|'monthly'|'custom', interval?: number, anchorDay?: number } | null,
  streak: number,       // yinelenen hedefte art arda zamanında tamamlama sayısı
  spawnedFrom: string | null, // yinelenen hedefin hangi örnekten türediği (tamamlama geri alınınca kaldırmak için)
  tracking: boolean,    // günlük takip hedefi ("30 gün kitap oku"); recurring ile birlikte kullanılmaz
  trackingUnit: string, // isteğe bağlı günlük miktar birimi ("sayfa"); boşsa miktar sorulmaz
  dailyReminder: boolean, // takip hedefinde her gün "bugünü işaretle" bildirimi (varsayılan true)
  dayLog: { [date: "YYYY-MM-DD"]: { done: boolean, note: string, value?: number } }, // gün gün işaret + not + miktar
  subtasks: Array<{ id, text, completed }>,
  updates: Array<{ id, text, date }>,
  reminderDays: number[], // [3, 1] = 3 gün ve 1 gün önce bildirim
  folderId: string,     // varsayılan: 'default'
}
```

### Depolama Anahtarları

| Anahtar | İçerik |
|---------|--------|
| `goaltracker_v1` | Eski format (migrasyon için okunur) |
| `goaltracker_v2` | Mevcut format (hedefler) |
| `goaltracker_folders_v1` | Klasörler |
| `@counter_records_v1` | Sayaç kayıtları |
| `goaltracker_pre_restore_v1` | Son geri yüklemeden önceki veri ("geri al" için) |
| `drive_autosync` | Google Drive otomatik senkron açık mı (`'true'`/`'false'`) |
| `drive_remote_rev` | Bu cihazın son gördüğü Drive yedeğinin `modifiedTime` değeri (çakışma denetimi) |
| `drive_last_sync` | Son senkron sonucu `{ state: 'ok'\|'error'\|'conflict', at }` |
| `app_reminder_time` | Hatırlatma saati `"HH:MM"` (varsayılan `09:00`) |
| `app_theme` | `'light' \| 'dark' \| 'system'` |
| `app_language` | `'tr' \| 'en' \| 'zh' \| 'ja' \| 'ko'` |

---

## Bileşenler (src/components/)

| Bileşen | Açıklama |
|---------|----------|
| `AppHeader` | Başlık, hedef sayısı, menü butonu |
| `ControlsBar` | Sıralama seçici + toplu seçim butonu + "Hedef Ekle" butonu |
| `SelectionBar` | Toplu seçim modunda ControlsBar'ın yerini alır (tamamla / favori / klasöre taşı / sil) |
| `FilterTabs` | all / active / overdue / completed / pinned filtreleri |
| `SearchBar` | İsim & açıklama arama |
| `GoalCard` | Hedef listesi satırı (tamamla, pinle, sil); uzun basınca toplu seçim; takip hedefinde kutucuk bugünü işaretler |
| `EmptyState` | Hedef yokken gösterilen ekran |
| `AddGoalModal` | Yeni hedef ekleme formu |
| `GoalDetailModal` | Hedef detay, düzenleme, alt görev, not ekleme |
| `TrackingSection` | Günlük takip hedefinin gün ızgarası + seçili günün işaret/not paneli (detay ekranında) |
| `StatsModal` | İstatistikler (kategori dağılımı vb.) |
| `CalendarModal` | Takvim görünümü |
| `SideDrawer` | Yan menü: stats, takvim, sayaç, yedekleme, ayarlar |
| `FolderPickerModal` | Klasör seçici ve yöneticisi |
| `CounterModal` | Sayaç kayıt takibi |
| `Toast` | Geçici bildirim mesajı; isteğe bağlı eylem butonu (silmede "Geri al") |
| `AdBannerComponent` | AdMob banner reklamı |

---

## AdMob Yapılandırması

- **Gerçek ID'ler:** `src/config/ads.js` içinde tutulur (`.gitignore`'da)
- **Fallback (test):** `app.config.js`'te sabit test ID'leri
- Banner `AdBannerComponent.js` içinde, `src/config/ads.js`'ten bağımsız çalışır
- Yeni banner/interstitial ID eklemek için `src/config/ads.js` düzenle

---

## Bildirimler

- `expo-notifications` üzerinden çalışır
- Her hedef için `reminderDays` (varsayılan `[3, 1]`) kadar önceden zamanlanmış bildirim oluşturulur
- Android'de `goal-reminders` kanalı kullanılır (HIGH importance)
- Hatırlatma saati kullanıcı ayarıdır (`app_reminder_time`, yan menüden değiştirilir)
- Her açılışta `rescheduleAllNotifications` tüm hatırlatıcıları en yakın tarihliden başlayarak yeniden kurar (iOS 64 / Android ~500 bekleyen bildirim sınırı için üst sınır uygulanır)
- Bildirime dokunulunca ilgili hedefin detayı açılır (`listenForGoalNotificationTaps`)
- Pomodoro/zamanlayıcı bitişi için `scheduleCounterNotification` kullanılır
- Tüm bildirim işlemleri `notifications.js` içindeki sıradan (queue) geçer

---

## Yedekleme & Geri Yükleme

- `exportBackup()` → JSON dosyası oluşturur, `expo-sharing` ile paylaşır
- `importBackup()` → `expo-document-picker` ile JSON seçilir, AsyncStorage'a yazılır
- Yedek içeriği: `{ version, goals, folders, counters, settings }` (ayarlar: tema, dil, hatırlatma saati); eski formatlar (`{ version, goals, folders }`, düz array) da okunur
- Tüm içe aktarılan veri `backupSchema.js` → `parseBackupData` ile doğrulanır; yeni alan eklerken oraya da ekle
- `expo-file-system` için **`expo-file-system/legacy`** içe aktarılır (SDK 54'te ana paketteki eski API hata fırlatır)
- Google Drive: değişiklikler `scheduleDriveSync()` ile gecikmeli ve birleştirilerek yüklenir; otomatik senkron asla etkileşimli giriş açmaz
- Senkron açılırken Drive'da yedek varsa kullanıcıya hangisinin korunacağı sorulur
- Çakışma denetimi: Drive'daki yedeğin `modifiedTime` değeri `drive_remote_rev` ile uyuşmuyorsa (başka cihaz yazmış) otomatik yükleme yapılmaz; yan menüde "Çöz" ile kullanıcı seçer. Birleştirme (merge) **yoktur**

---

## Günlük Takip Hedefleri

- Hedef eklerken tür: Tek Seferlik / Günlük Takip / Tekrarlı
- Takip hedefi `startDate..deadline` (dahil) aralığındaki her gün için `dayLog` kaydı tutar; hesaplar `utils/tracking.js` içindedir
- `progress` yapılan gün oranından otomatik hesaplanır; tüm günler işaretlenince hedef tamamlanır
- Listede kartın kutucuğu bugünü işaretler (bugün aralıktaysa); hedefi bitirmek için sağa kaydırma kullanılır
- Günlük hatırlatma: önümüzdeki 7 günün işaretlenmemiş günleri için bildirim kurulur; her açılışta ve işaretlemede yenilenir

---

## Çeviri (i18n)

- `src/i18n/translations.js` içinde tüm dillerin düz anahtar-değer sözlüğü bulunur
- `t('key', { param: value })` ile kullanılır — parametreler `{param}` placeholder'ı ile yerleştirilir
- Yeni dil eklemek için `translations.js`'e yeni blok ve `LanguageContext.js`'e yeni entry ekle

---

## Geliştirme Komutları

```bash
# Geliştirme sunucusu
npx expo start

# Android emülatör
npx expo start --android

# iOS simülatör
npx expo start --ios

# Testler (ikisi birden; ayrı ayrı: npm run test:unit / npm run test:ui)
npm test

# Üretim build (EAS) — versionCode EAS'ta tutulur ve her production build'de otomatik artar
# (eas.json: appVersionSource "remote" + autoIncrement; app.config.js'teki versionCode kullanılmaz)
eas build --platform android --profile production
eas build --platform ios --profile production

# Play Store gönderimi
eas submit --platform android
```

---

## Önemli Kurallar

1. **`src/config/ads.js` asla commit edilmez** — `.gitignore`'a eklidir; CI/CD test ID'leriyle çalışır.
2. **AsyncStorage key'leri değiştirilmez** — veri kayıplarına yol açar; migrasyon gerekiyorsa yeni key kullan ve eski key'i oku.
3. **`t()` fonksiyonu kullan** — bileşenlere hiçbir zaman sabit Türkçe/İngilizce string yazılmaz.
4. **`useCallback` ve `useRef`** — `App.js` ve büyük hook'larda performans için bunları kullan.
5. **Yinelenen hedefler** — tamamlanınca `utils/recurrence.js` → `createNextInstance` ile bir sonraki örnekleri otomatik oluşturulur (aylık tekrar gerçek takvim ayıdır).
6. **Bildirimler** — hedef oluşturma/güncelleme/silme işlemlerinde `scheduleGoalNotifications` / `cancelGoalNotifications` çağrılır.
7. **Reklam ve analitik onayı** — reklam SDK'sı yalnızca `utils/consent.js` → `initAdsWithConsent` üzerinden başlatılır (Google UMP).
8. **Saf mantık modülleri** (`dateUtils`, `recurrence`, `tracking`, `backupSchema`) React/AsyncStorage içe aktarmaz ve kendi aralarında `.js` uzantısıyla import eder — Node ile test edilebilmeleri için. Değişiklikten sonra `npm test` çalıştır.
