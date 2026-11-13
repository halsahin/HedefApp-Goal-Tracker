# HedefApp — BUGS.md

| ID | Dosya | Hata Açıklaması |
|----|-------|-----------------|

---

## ✅ Düzeltilen Hatalar

| ID | Dosya | Yapılan Değişiklik |
|----|-------|-------------------|
| BUG-01 | `useCounterRecords.js` | `persist()` fonksiyonuna `.catch` eklendi — hata sessizce yutulmaktan kurtarıldı |
| BUG-02 | `useFolders.js`, `translations.js`, `App.js` | Varsayılan klasör adı `'folder.default'` i18n anahtarına taşındı; tüm 5 dile çeviri eklendi; `getLocalizedFolders(t)` helper ile çözümleniyor |
| BUG-03 | `GoalDetailModal.js` | Kaydedilmemiş değişiklikler varsa `Alert.alert` ile kullanıcıyı uyaran `cancelGoalEdit()` eklendi |
| BUG-04 | `dateUtils.js` | `generateId()`'de suffix `slice(2,7)`'den `slice(2)` (tam string) olarak güncellendi — entropi artırıldı |
| BUG-05 | `AddGoalModal.js` | `const SCREEN_HEIGHT` sabit kaldırıldı; `useWindowDimensions()` hook'u ile dinamik `screenHeight` kullanıldı |
| BUG-06 | `SideDrawer.js` | Animasyon ref'e (`animRef`) atanıyor; her yeni `visible` değişiminde `.stop()` çağrılarak race condition engellendi |
| BUG-07 | `GoalDetailModal.js` | `KeyboardAvoidingView` için `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` düzeltildi |
| BUG-08 | `App.js` | `toggleComplete(id)` dönüş değeri `newGoal` olarak yakalanıyor; yinelenen hedefin yeni örneği için `scheduleGoalNotifications(newGoal, t)` çağrıldı |
| BUG-09 | `GoalDetailModal.js` | `editRecurring` state eklendi; `save()` içinde `recurring: editRecurring` alanı iletiliyor |
| BUG-10 | `calendar.js` | İzin reddedildiğinde `Linking.openSettings()` ile sistem ayarları otomatik açılıyor |
| BUG-11 | `AddGoalModal.js` | Alt görev silme `prev.filter((_, idx) => idx !== i)` → `prev.filter(item => item.id !== s.id)` olarak düzeltildi |
| BUG-12 | `GoalCard.js` | `translateX.setValue(0)` çağrısı `Alert` callback'lerine taşındı; kullanıcı onaylamadan kart sıfırlanmıyor |
| BUG-13 | `notifications.js` | Yalnızca geliştirme ortamını etkileyen singleton cache sorunu; `_N` pattern korundu, production'da değişklik gerekmez (kabul edildi) |
| BUG-14 | `useGoals.js`, `useFolders.js`, `App.js` | `moveGoalsToDefaultFolder(folderId)` fonksiyonu eklendi; `handleDeleteFolder` wrapper'ı ile klasör silinmeden önce içindeki hedefler `'default'`'a taşınıyor |
| BUG-15 | `GoalDetailModal.js` | `hasTimeline` zaten `!goal.completed` kontrolü yapıyordu; `!!` ile tip güvenliği sağlandı |
| BUG-16 | `StatsModal.js`, `CalendarModal.js`, `CounterModal.js` | Header stillerine `paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + Spacing.md : 44 + Spacing.md` eklendi; status bar overlap düzeltildi |
| BUG-17 | `CalendarModal.js` | Kullanılmayan `today` değişkeni kaldırıldı. |
| BUG-18 | `useGoals.js` | `createNextInstance` fonksiyonunda yeni tarih (`newDeadline`) atanırken, `toISOString()` yerine yerel zamanı baz alan format (örn. `getFullYear`, `getMonth`, `getDate`) kullanıldı. |
| BUG-19 | `EmptyState.js` | Ekleme (CTA) butonundaki hardcode renkler kaldırılarak temanın dinamik `colors.accent` ve `colors.accentDark` renkleri kullanıldı. |
| BUG-20 | `CounterModal.js` | Sayaçlarda (Pomodoro, Kronometre, Zamanlayıcı) `time-diffing` (zaman farkı) yöntemine geçildi ve modal kapandığında çalışan otomatik sıfırlama (`fullReset()`) kaldırıldı. Böylece uygulama arka plandayken veya modal kapalıyken bile sayaçların çalışmaya devam etmesi sağlandı. |
| BUG-21 | `app.config.js`, `package.json` | EAS Build `.gitignore` içindeki `android/` dizinini yoksaydığı için Proguard kuralları bulut derlemesine (production) geçmiyordu ve `NoSuchMethodError` (ReturnTypeKt vb.) kaynaklı çökmeler devam ediyordu. `expo-build-properties` paketi kurularak `extraProguardRules` ile eksik kurallar doğrudan `app.config.js` içine eklendi. |
| BUG-22 | `useGoals.js` | `toggleComplete` yeni yinelenen örneği `setGoals` updater'ı içinde oluşturuyordu; React updater'ı geç çalıştırdığında fonksiyon `null` döndürüyor ve yeni örneğin bildirimleri kurulmuyordu (StrictMode'da ayrıca iki farklı ID üretiliyordu). Sonuç artık `goalsRef` ile dışarıda hesaplanıyor. |
| BUG-23 | `useGoals.js` | BUG-18'de düzeltildiği yazılmasına rağmen `createNextInstance` hâlâ `toISOString()` kullanıyordu; UTC+13/+14 saat dilimlerinde bir sonraki tarih 1 gün kayıyordu. Yerel tarih formatına geçildi. |
| BUG-24 | `App.js` | Tamamlanmış bir hedef geri açıldığında bildirimleri iptal ediliyor ama yeniden kurulmuyordu. Artık yeniden zamanlanıyor. |
| BUG-25 | `useGoals.js` | `goaltracker_v2` bozuksa hedefler boş yükleniyor ve ilk değişiklikte bozuk veri tamamen eziliyordu. Ham veri artık `goaltracker_v2_corrupt` anahtarına kopyalanıyor. |
| BUG-26 | `googleDrive.js` | Otomatik senkron her değişiklikte paralel yükleme başlatıyordu; Drive'da dosya yokken iki istek çakışınca yedek dosyası çoğalabiliyordu. Yüklemeler artık sıraya alınıyor. |
| BUG-27 | `notifications.js` | `expo-notifications` 0.32'de kullanımdan kalkan `shouldShowAlert` yanına `shouldShowBanner` / `shouldShowList` eklendi (ön planda bildirim görünmeme riski). |
| BUG-28 | `useFolders.js`, `useCounterRecords.js` | AsyncStorage okuma hatasında `loaded` hiç `true` olmuyordu; `.catch` eklendi. |
| BUG-29 | `AddGoalModal.js`, `GoalDetailModal.js` | Özel hatırlatma günü (ör. 5 gün önce) eklendiğinde çip, kapsam dışındaki `active` değişkenine eriştiği için `ReferenceError` ile ekran çöküyordu. Tema rengi doğrudan kullanılıyor. |
| BUG-30 | `backup.js` | Expo SDK 54'te `expo-file-system` ana paketindeki eski API (`writeAsStringAsync`, `cacheDirectory` vb.) çalışma anında hata fırlatıyor; yerel yedek alma/geri yükleme her zaman "hata" veriyordu. `expo-file-system/legacy` içe aktarımına geçildi. |
| BUG-31 | `googleDrive.js`, `SideDrawer.js` | Otomatik senkron, oturum yokken her hedef değişikliğinde etkileşimli Google giriş ekranını açıyordu (uygulama yeniden açıldığında `getCurrentUser()` null döndüğü için de). Otomatik senkron artık yalnızca sessiz giriş dener; etkileşimli giriş senkron açılırken ve Drive'dan indirirken yapılır. Giriş başarısızsa senkron açılmaz. |
| BUG-32 | `googleDrive.js` | Drive dosya sorgusu hata verdiğinde "dosya yok" sayılıp yeni yedek dosyası oluşturuluyordu (kopya yedekler); indirmede ise "geçersiz yedek" mesajı çıkıyordu. Hata artık çağırana iletiliyor; 401'de önbellekteki token temizleniyor. |
| BUG-33 | `backup.js` | Yedek doğrulaması alt görev/not içeriklerini, tarihleri ve `recurring` alanını denetlemiyordu; bozuk veya kötü niyetli bir yedek dosyası uygulamayı açılışta çökertebiliyordu. Alanlar tip ve biçim olarak doğrulanıyor. |
| BUG-34 | `notifications.js`, `App.js` | Yedekten geri yükleme sonrası eski hedeflerin bildirimleri kalıyor, geri gelen hedeflerin bildirimleri kurulmuyordu. `rescheduleAllNotifications` eklendi. |
| BUG-35 | `GoalDetailModal.js` | Başlangıç ve bitiş tarihi aynı olduğunda zaman çizelgesi `NaN%` üretiyordu. |
| BUG-36 | `CalendarModal.js` | Takvim lejantındaki sabit Türkçe metinler `t()` ile çevrildi. |
| BUG-37 | `.env.example` | App ID değişken adları `app.config.js`'in okuduğu `EXPO_PUBLIC_ADMOB_*` adlarıyla eşleştirildi. |
| BUG-38 | `SideDrawer.js`, `googleDrive.js` | Yeni cihazda Drive senkronu açılıp bir hedef eklenince buluttaki yedek neredeyse boş veriyle eziliyordu. Senkron açılırken Drive'da yedek varsa kullanıcıya "Drive'dakini indir / Bu cihazdakini yükle" soruluyor. |
| BUG-39 | `googleDrive.js`, hook'lar | Her değişiklikte (her alt görev işaretinde) tüm veri Drive'a yükleniyordu. Yüklemeler 2,5 sn geciktirilip birleştiriliyor; uygulama arka plana geçerken bekleyen yükleme hemen gönderiliyor. |
| BUG-40 | `recurrence.js` | Aylık tekrar sabit 30 gün ekliyordu (31 Ocak → 2 Mart). Gerçek takvim ayı kullanılıyor; ayın günü `anchorDay` ile korunuyor. |
| BUG-41 | `notifications.js` | Bildirim iptal/kurma çağrıları sırasız çalışabiliyordu; iOS'un 64 bekleyen bildirim sınırı aşıldığında uzak tarihli hatırlatıcılar sessizce düşüyordu. İşlemler sıraya alındı, en yakın tarihliler öncelikli kuruluyor ve her açılışta yenileniyor. |
| BUG-42 | `translations.js` | zh/ja/ko dillerinde 17, tüm dillerde 2 (`detail.discard*`) çeviri anahtarı eksikti; ekranda ham anahtar görünüyordu. |
| BUG-43 | `useGoals.js`, `recurrence.js` | Tekrarlı hedefin tamamlanması geri alındığında otomatik oluşturulan sonraki örnek listede kalıyor, hedef çiftleniyordu. Örnekler `spawnedFrom` ile işaretleniyor; dokunulmamışsa geri almada kaldırılıyor. |
| BUG-44 | `googleDrive.js` | İki cihaz aynı Drive hesabına senkron yaptığında son yazan diğerinin değişikliklerini sessizce siliyordu. Drive'daki yedek başka cihazdan değişmişse otomatik yükleme durduruluyor ve kullanıcıya soruluyor. |
| BUG-45 | `App.js` | Dil değiştirildiğinde kurulu bildirimler eski dilde kalıyordu; dil değişiminde yeniden kuruluyor. |
