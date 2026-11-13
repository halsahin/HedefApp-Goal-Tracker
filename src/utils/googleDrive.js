import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { buildBackupPayload } from './backup';

const AUTOSYNC_KEY = 'drive_autosync';
const AUTOSYNC_DELAY_MS = 2500;
// Bu cihazın en son gördüğü (yüklediği/indirdiği) Drive yedeğinin değişiklik zamanı.
// Drive'daki değer bundan farklıysa yedeği başka bir cihaz güncellemiştir.
const REMOTE_REV_KEY = 'drive_remote_rev';
const SYNC_STATUS_KEY = 'drive_last_sync'; // { state: 'ok' | 'error' | 'conflict', at: ISO }

async function recordSyncStatus(state) {
    try {
        await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({ state, at: new Date().toISOString() }));
    } catch { /* yoksay */ }
}

/** Son senkron denemesinin sonucu: { state, at } ya da hiç denenmediyse null. */
export async function getDriveSyncStatus() {
    try {
        const raw = await AsyncStorage.getItem(SYNC_STATUS_KEY);
        const s = raw ? JSON.parse(raw) : null;
        return s && typeof s.state === 'string' ? s : null;
    } catch {
        return null;
    }
}

// Web Client ID gizli değildir (OAuth public identifier); istenirse EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ile geçersiz kılınır.
export function configureGoogleSignIn() {
    GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '830389547706-h21a0qappjac6rhi5hhnr65ror227ucg.apps.googleusercontent.com',
        scopes: ['https://www.googleapis.com/auth/drive.appdata'],
        offlineAccess: false,
    });
}

let tokenPromise = null;

// Access Token alır.
// interactive=false (otomatik senkron): yalnızca sessiz oturum açma denenir; kullanıcı daha önce
// giriş yapmadıysa veya iptal ettiyse her hedef değişikliğinde hesap seçici açılmaz.
// interactive=true (kullanıcı bir butona bastı): gerekirse Google giriş ekranı gösterilir.
export async function getGoogleAccessToken({ interactive = false } = {}) {
    if (tokenPromise) return tokenPromise;
    tokenPromise = (async () => {
        try {
            const hasPlayServices = await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: interactive });
            if (!hasPlayServices) throw new Error('Google Play Services yok.');

            if (!GoogleSignin.getCurrentUser()) {
                // Uygulama yeniden açıldığında getCurrentUser() null döner; önce kayıtlı oturumu geri yükle
                let signedIn = false;
                if (GoogleSignin.hasPreviousSignIn()) {
                    try {
                        signedIn = (await GoogleSignin.signInSilently()).type === 'success';
                    } catch { /* aşağıda etkileşimli girişe düş */ }
                }
                if (!signedIn) {
                    if (!interactive) return null;
                    const res = await GoogleSignin.signIn();
                    if (res.type !== 'success') return null;
                }
            }

            const tokens = await GoogleSignin.getTokens();
            return tokens.accessToken;
        } catch (error) {
            console.warn('Google Sign-In Error:', error);
            return null;
        } finally {
            tokenPromise = null;
        }
    })();
    return tokenPromise;
}

// Süresi dolmuş/iptal edilmiş token önbellekte kalmasın (Android 401 döngüsünü önler)
async function dropCachedToken(accessToken) {
    try { await GoogleSignin.clearCachedAccessToken(accessToken); } catch { /* yoksay */ }
}

// Kullanıcının Google Drive hesabından çıkış yapar
export async function signOutFromGoogle() {
    try {
        await GoogleSignin.signOut();
        await AsyncStorage.multiRemove([REMOTE_REV_KEY, SYNC_STATUS_KEY]);
    } catch (error) {
        console.error('Sign Out Error:', error);
    }
}

export async function getGoogleUserInfo() {
    try {
        const userInfo = await GoogleSignin.getCurrentUser();
        return userInfo ? userInfo.user : null;
    } catch (error) {
        return null;
    }
}

// Drive'da appDataFolder içindeki yedek dosyasını bulur: { id, modifiedTime } ya da yoksa null.
// Sorgu başarısızsa hata fırlatır — "dosya yok" sanılıp kopya yedek oluşturulmasın.
async function findBackupFile(accessToken) {
    const query = encodeURIComponent("name='hedefapp_backup.json' and 'appDataFolder' in parents and trashed=false");
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`;

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) await dropCachedToken(accessToken);
    if (!response.ok) throw new Error(`drive_list_http_${response.status}`);
    const data = await response.json();
    const file = data.files?.[0];
    return file ? { id: file.id, modifiedTime: file.modifiedTime ?? null } : null;
}

// JSON verisini Drive'a yükler (Varsa günceller, yoksa yeni oluşturur)
// Eşzamanlı yüklemeler (otomatik senkron) yedek dosyasının çoğalmasına yol açmasın diye sıraya alınır
let syncQueue = Promise.resolve();
export function syncToDrive(payload, options = {}) {
    const run = syncQueue.then(async () => {
        const result = await doSyncToDrive(payload, options);
        await recordSyncStatus(result.success ? 'ok' : result.error === 'conflict' ? 'conflict' : 'error');
        return result;
    });
    syncQueue = run.catch(() => {});
    return run;
}

// options.force: Drive'daki yedek başka cihazdan güncellenmiş olsa bile üzerine yaz (kullanıcı seçti)
async function doSyncToDrive(payload, options) {
    const accessToken = await getGoogleAccessToken(options);
    if (!accessToken) return { success: false, error: 'auth_failed' };

    try {
        const fileContent = JSON.stringify(payload);
        const existing = await findBackupFile(accessToken);

        // Çakışma denetimi: Drive'daki yedek bu cihazın son gördüğünden farklıysa başka bir cihaz
        // yazmıştır. Üzerine yazmak o cihazın değişikliklerini sileceği için kullanıcıya bırakılır.
        if (existing && !options.force) {
            const known = await AsyncStorage.getItem(REMOTE_REV_KEY);
            if (known && existing.modifiedTime && known !== existing.modifiedTime) {
                return { success: false, error: 'conflict' };
            }
        }

        const fileMetadata = {
            name: 'hedefapp_backup.json',
        };
        // Yalnızca yeni dosya oluştururken parents belirtilmeli
        if (!existing) {
            fileMetadata.parents = ['appDataFolder'];
        }

        // React Native Android'de Blob + FormData kullanımı "Network request failed" hatasına yol açar.
        // Bu yüzden multipart body'yi kendimiz manuel olarak string formatında oluşturuyoruz.
        const boundary = 'foo_bar_baz_hedefapp';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(fileMetadata) +
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            fileContent +
            close_delim;

        const base = 'https://www.googleapis.com/upload/drive/v3/files';
        const params = 'uploadType=multipart&fields=id,modifiedTime';
        const url = existing ? `${base}/${existing.id}?${params}` : `${base}?${params}`;

        const response = await fetch(url, {
            method: existing ? 'PATCH' : 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartRequestBody,
        });

        if (response.status === 401) await dropCachedToken(accessToken);
        if (!response.ok) return { success: false, error: `http_${response.status}` };
        const data = await response.json();
        if (data.modifiedTime) await AsyncStorage.setItem(REMOTE_REV_KEY, data.modifiedTime);
        return { success: !!data.id };
    } catch (error) {
        console.warn('Drive Upload Error:', error);
        return { success: false, error: error.message };
    }
}

// Drive'dan mevcut JSON verisini indirir
export async function downloadFromDrive() {
    // Kullanıcı butona basarak başlattığı için etkileşimli girişe izin ver
    const accessToken = await getGoogleAccessToken({ interactive: true });
    if (!accessToken) return { success: false, data: null };

    try {
        const file = await findBackupFile(accessToken);
        if (!file) return { success: true, data: null }; // Dosya yoksa null dön (yeni kullanıcı)

        // Dosyayı indirirken cache'e takılmamak için zaman damgası ekliyoruz
        const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&_t=${Date.now()}`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status === 401) await dropCachedToken(accessToken);
        if (!response.ok) return { success: false, data: null };
        const textData = await response.text();
        const data = JSON.parse(textData);
        // Bu cihaz artık Drive'daki sürümle aynı noktada: sonraki yüklemeler çakışma sayılmaz
        if (file.modifiedTime) await AsyncStorage.setItem(REMOTE_REV_KEY, file.modifiedTime);
        await recordSyncStatus('ok');
        return { success: true, data };
    } catch (error) {
        console.warn('Drive Download Error:', error);
        return { success: false, data: null };
    }
}

// ── Otomatik senkron ─────────────────────────────────────────────
// Her değişiklikte yükleme yapmak yerine son değişiklikten kısa süre sonra tek yükleme yapılır.
let autoSyncTimer = null;

async function runAutoSync() {
    if ((await AsyncStorage.getItem(AUTOSYNC_KEY)) !== 'true') return;
    // Değişiklikler AsyncStorage'a yazıldıktan sonra okunur: hedef, klasör, sayaç ve ayarlar tek yedekte
    const payload = await buildBackupPayload();
    return syncToDrive(payload);
}

/** Veri değiştiğinde çağrılır; art arda değişiklikleri tek yüklemede birleştirir. */
export function scheduleDriveSync() {
    clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(() => {
        autoSyncTimer = null;
        runAutoSync().catch(err => console.log('Auto-sync error:', err));
    }, AUTOSYNC_DELAY_MS);
}

/** Bekleyen senkron varsa hemen çalıştırır (uygulama arka plana geçerken). */
export function flushDriveSync() {
    if (!autoSyncTimer) return;
    clearTimeout(autoSyncTimer);
    autoSyncTimer = null;
    runAutoSync().catch(err => console.log('Auto-sync error:', err));
}

/** Bekleyen senkronu iptal eder (geri yükleme öncesi eski verinin yüklenmesini önler). */
export function cancelPendingDriveSync() {
    clearTimeout(autoSyncTimer);
    autoSyncTimer = null;
}

/** Bu cihazdaki veriyi hemen Drive'a yükler (kullanıcı başlattı). */
export async function uploadToDriveNow() {
    try {
        const payload = await buildBackupPayload();
        return await syncToDrive(payload, { interactive: true, force: true });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Drive'da daha önce alınmış bir yedek var mı?
 * 'exists' | 'none' | 'error' döner. Senkron açılırken buluttaki yedeğin yanlışlıkla ezilmesini önlemek için kullanılır.
 */
export async function checkDriveBackup() {
    const accessToken = await getGoogleAccessToken({ interactive: true });
    if (!accessToken) return 'error';
    try {
        return (await findBackupFile(accessToken)) ? 'exists' : 'none';
    } catch {
        return 'error';
    }
}
