import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseBackupData, SETTING_KEYS } from './backupSchema.js';

export { parseBackupData };

const STORAGE_KEY = 'goaltracker_v2';
const FOLDERS_KEY = 'goaltracker_folders_v1';
const COUNTERS_KEY = '@counter_records_v1';
const PRE_RESTORE_KEY = 'goaltracker_pre_restore_v1';
const BACKUP_VERSION = 3;

/**
 * Yerel dosya ve Drive için ortak yedek içeriğini oluşturur:
 * hedefler, klasörler, sayaç kayıtları ve ayarlar (tema, dil, hatırlatma saati).
 * Hedef verisi okunamıyorsa hata fırlatır — bozuk veriyle mevcut yedeğin ezilmesini önler.
 */
export async function buildBackupPayload() {
    const [goalsRaw, foldersRaw, countersRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(FOLDERS_KEY),
        AsyncStorage.getItem(COUNTERS_KEY),
    ]);
    const goals = goalsRaw ? JSON.parse(goalsRaw) : [];
    let folders = [];
    let counters = [];
    try { folders = foldersRaw ? JSON.parse(foldersRaw) : []; } catch { /* yoksay */ }
    try { counters = countersRaw ? JSON.parse(countersRaw) : []; } catch { /* yoksay */ }

    const settings = {};
    const pairs = await AsyncStorage.multiGet(SETTING_KEYS);
    for (const [key, value] of pairs) {
        if (value !== null) settings[key] = value;
    }

    return {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        goals,
        folders,
        counters,
        settings,
    };
}

/** Doğrulanmış yedeği AsyncStorage'a yazar. */
export async function writeBackupData({ goals, folders, counters = null, settings = {} }) {
    // Geri yüklemeden önce mevcut veriyi güvenlik kopyası olarak sakla (yeni anahtar; mevcutlar değişmez)
    try {
        const [g, f, c] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem(FOLDERS_KEY),
            AsyncStorage.getItem(COUNTERS_KEY),
        ]);
        if (g) await AsyncStorage.setItem(PRE_RESTORE_KEY, JSON.stringify({ at: new Date().toISOString(), goals: g, folders: f, counters: c }));
    } catch { /* kopya alınamazsa geri yüklemeyi engelleme */ }
    const ops = [AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals))];
    if (folders.length > 0) ops.push(AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders)));
    if (counters) ops.push(AsyncStorage.setItem(COUNTERS_KEY, JSON.stringify(counters)));
    const settingPairs = Object.entries(settings);
    if (settingPairs.length > 0) ops.push(AsyncStorage.multiSet(settingPairs));
    await Promise.all(ops);
}

/** Son geri yüklemeden önce alınmış güvenlik kopyası var mı? Varsa alındığı zamanı (ISO) döner. */
export async function getRestoreSnapshotDate() {
    try {
        const raw = await AsyncStorage.getItem(PRE_RESTORE_KEY);
        if (!raw) return null;
        const snap = JSON.parse(raw);
        return typeof snap?.goals === 'string' ? (snap.at || new Date().toISOString()) : null;
    } catch {
        return null;
    }
}

/** Son geri yüklemeyi geri alır: güvenlik kopyasındaki veriyi yerine koyar. Başarılıysa true döner. */
export async function undoRestore() {
    const raw = await AsyncStorage.getItem(PRE_RESTORE_KEY);
    if (!raw) return false;
    const snap = JSON.parse(raw);
    if (typeof snap?.goals !== 'string') return false;
    JSON.parse(snap.goals); // bozuksa yazmadan önce hata ver
    const ops = [AsyncStorage.setItem(STORAGE_KEY, snap.goals)];
    if (typeof snap.folders === 'string') ops.push(AsyncStorage.setItem(FOLDERS_KEY, snap.folders));
    if (typeof snap.counters === 'string') ops.push(AsyncStorage.setItem(COUNTERS_KEY, snap.counters));
    await Promise.all(ops);
    await AsyncStorage.removeItem(PRE_RESTORE_KEY);
    return true;
}

async function getFS() {
    // SDK 54: eski (writeAsStringAsync vb.) API yalnızca 'expo-file-system/legacy' altında çalışır;
    // ana paketten çağrılırsa çalışma anında hata fırlatır.
    try { return await import('expo-file-system/legacy'); } catch { return null; }
}
async function getSharing() {
    try { return await import('expo-sharing'); } catch { return null; }
}
async function getPicker() {
    try { return await import('expo-document-picker'); } catch { return null; }
}

export async function exportBackup(dialogTitle = 'Backup') {
    try {
        const [FS, Sharing] = await Promise.all([getFS(), getSharing()]);
        if (!FS || !Sharing) return 'unavailable';

        const payload = JSON.stringify(await buildBackupPayload(), null, 2);

        const fileName = `hedefapp-yedek-${new Date().toISOString().slice(0, 10)}.json`;
        const filePath = FS.cacheDirectory + fileName;

        await FS.writeAsStringAsync(filePath, payload, { encoding: 'utf8' });

        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) return 'share_unavailable';

        await Sharing.shareAsync(filePath, {
            mimeType: 'application/json',
            dialogTitle,
            UTI: 'public.json',
        });

        FS.deleteAsync(filePath, { idempotent: true }).catch(() => {});
        return 'ok';
    } catch (err) {
        console.warn('[backup] export error:', err);
        return 'error';
    }
}

export async function importBackup() {
    try {
        const [FS, Picker] = await Promise.all([getFS(), getPicker()]);
        if (!FS || !Picker) return { status: 'unavailable' };

        const result = await Picker.getDocumentAsync({
            type: ['application/json', 'text/plain', '*/*'],
            copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets?.[0]) return { status: 'cancelled' };

        const fileUri = result.assets[0].uri;
        if (result.assets[0].size > 20 * 1024 * 1024) return { status: 'invalid' };
        const raw = await FS.readAsStringAsync(fileUri, { encoding: 'utf8' });

        let data;
        try { data = JSON.parse(raw); } catch {
            return { status: 'invalid' };
        }

        // Hem yeni format (version+goals) hem de eski düz array'i destekle
        const parsed = parseBackupData(data);
        if (!parsed) return { status: 'invalid' };

        await writeBackupData(parsed);
        return { status: 'ok', count: parsed.goals.length };
    } catch (err) {
        console.warn('[backup] import error:', err);
        return { status: 'error' };
    }
}
