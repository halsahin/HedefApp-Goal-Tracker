import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'goaltracker_v2';
const FOLDERS_KEY = 'goaltracker_folders_v1';
const PRE_RESTORE_KEY = 'goaltracker_pre_restore_v1';
const BACKUP_VERSION = 2;

const MAX_GOALS = 5000;
const MAX_TEXT = 5000;

const str = (v, fallback = '') => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : fallback);
const list = (v) => (Array.isArray(v) ? v : []);

function sanitizeGoal(g) {
    if (!g || typeof g !== 'object' || typeof g.id !== 'string' || typeof g.name !== 'string') return null;
    return {
        ...g,
        id: g.id.slice(0, 100),
        name: str(g.name),
        description: str(g.description),
        category: str(g.category, 'other'),
        deadline: str(g.deadline),
        completed: !!g.completed,
        pinned: !!g.pinned,
        folderId: str(g.folderId, 'default'),
        progress: Number.isFinite(g.progress) ? Math.min(100, Math.max(0, g.progress)) : 0,
        subtasks: list(g.subtasks).filter((x) => x && typeof x === 'object'),
        updates: list(g.updates).filter((x) => x && typeof x === 'object'),
        reminderDays: list(g.reminderDays).filter((n) => Number.isInteger(n) && n >= 0 && n <= 365),
    };
}

function sanitizeFolder(f) {
    if (!f || typeof f !== 'object' || typeof f.id !== 'string') return null;
    return { ...f, id: f.id.slice(0, 100), name: str(f.name) };
}

/**
 * Yedek verisini (yerel dosya veya Drive) doğrular ve temizler.
 * Geçersizse null döner; geçerliyse { goals, folders } döner.
 */
export function parseBackupData(data) {
    const rawGoals = Array.isArray(data) ? data : data?.goals;
    if (!Array.isArray(rawGoals) || rawGoals.length > MAX_GOALS) return null;
    const goals = rawGoals.map(sanitizeGoal).filter(Boolean);
    const folders = list(data?.folders).map(sanitizeFolder).filter(Boolean);
    return { goals, folders };
}

/** Doğrulanmış yedeği AsyncStorage'a yazar. */
export async function writeBackupData({ goals, folders }) {
    // Geri yüklemeden önce mevcut veriyi güvenlik kopyası olarak sakla (yeni anahtar; mevcutlar değişmez)
    try {
        const [g, f] = await Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(FOLDERS_KEY)]);
        if (g) await AsyncStorage.setItem(PRE_RESTORE_KEY, JSON.stringify({ at: new Date().toISOString(), goals: g, folders: f }));
    } catch { /* kopya alınamazsa geri yüklemeyi engelleme */ }
    const ops = [AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals))];
    if (folders.length > 0) ops.push(AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders)));
    await Promise.all(ops);
}

async function getFS() {
    try { return await import('expo-file-system'); } catch { return null; }
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

        const [goalsRaw, foldersRaw] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem(FOLDERS_KEY),
        ]);
        const goals = goalsRaw ? JSON.parse(goalsRaw) : [];
        const folders = foldersRaw ? JSON.parse(foldersRaw) : [];

        const payload = JSON.stringify({
            version: BACKUP_VERSION,
            exportedAt: new Date().toISOString(),
            goals,
            folders,
        }, null, 2);

        const fileName = `hedefapp-yedek-${new Date().toISOString().slice(0, 10)}.json`;
        const filePath = FS.cacheDirectory + fileName;

        await FS.writeAsStringAsync(filePath, payload, { encoding: FS.EncodingType.UTF8 });

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
        const raw = await FS.readAsStringAsync(fileUri, { encoding: FS.EncodingType.UTF8 });

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
