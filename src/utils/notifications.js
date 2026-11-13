import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { upcomingReminderDays } from './tracking';

const REMINDER_TIME_KEY = 'app_reminder_time'; // "HH:MM"
export const DEFAULT_REMINDER_TIME = '09:00';
const CHANNEL_ID = 'goal-reminders';

// iOS en fazla 64 bekleyen yerel bildirime izin verir; Android'de uygulama başına ~500 alarm sınırı vardır.
// En yakın tarihli hatırlatıcılar kurulur, kalanlar bir sonraki açılışta sıraya girer.
const MAX_PENDING = Platform.OS === 'ios' ? 60 : 400;

let _N = null;

async function getNotifications() {
    if (!_N) {
        try {
            _N = await import('expo-notifications');
        } catch {
            return null;
        }
    }
    return _N;
}

// Bildirim işlemleri sırayla çalışır: iptal/kurma çağrıları birbirinin arasına girip
// yeni kurulan bildirimi silmesin.
let queue = Promise.resolve();
function enqueue(task) {
    const run = queue.then(task);
    queue = run.catch(() => {});
    return run;
}

function dateTrigger(N, triggerDate) {
    const DateType = N.SchedulableTriggerInputTypes?.DATE;
    if (DateType) {
        return { type: DateType, date: triggerDate, channelId: CHANNEL_ID };
    }
    return { date: triggerDate, channelId: CHANNEL_ID };
}

// ── Hatırlatma saati ────────────────────────────────────────────
export async function getReminderTime() {
    try {
        const v = await AsyncStorage.getItem(REMINDER_TIME_KEY);
        return /^([01]\d|2[0-3]):[0-5]\d$/.test(v || '') ? v : DEFAULT_REMINDER_TIME;
    } catch {
        return DEFAULT_REMINDER_TIME;
    }
}

export async function setReminderTime(time) {
    await AsyncStorage.setItem(REMINDER_TIME_KEY, time);
}

// ── Kurulum ─────────────────────────────────────────────────────
export async function setupNotifications() {
    const N = await getNotifications();
    if (!N) return;
    try {
        N.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });

        const { status } = await N.requestPermissionsAsync();
        if (status !== 'granted') return;

        // Android requires a notification channel — HIGH importance shows heads-up alerts
        if (N.setNotificationChannelAsync) {
            await N.setNotificationChannelAsync(CHANNEL_ID, {
                name: 'Goal Reminders',
                importance: N.AndroidImportance?.HIGH ?? 4,
                vibrationPattern: [0, 250, 250, 250],
                sound: 'default',
            });
        }
    } catch (err) {
        console.warn('[notifications] setup error:', err);
    }
}

// ── Hedef hatırlatıcıları ───────────────────────────────────────
/** Bir hedef için gelecekteki hatırlatıcıları { date, content } listesi olarak üretir. */
function buildReminders(goal, t, time) {
    if (goal.completed) return [];
    const reminderDays = goal.reminderDays ?? [3, 1];
    const deadline = new Date(`${goal.deadline}T${time}:00`);
    if (isNaN(deadline.getTime())) return [];

    const now = Date.now();
    const out = [];

    // Günlük takip: önümüzdeki 7 günün işaretlenmemiş her günü için "bugünü işaretle" hatırlatması.
    // Her açılışta ve her işaretlemede yenilendiği için pencere kendiliğinden ilerler.
    for (const day of upcomingReminderDays(goal)) {
        const date = new Date(`${day}T${time}:00`);
        if (isNaN(date.getTime()) || date.getTime() <= now) continue;
        out.push({
            date,
            content: {
                title: t('notif.title'),
                body: t('notif.dailyReminder', { name: goal.name }),
                data: { goalId: goal.id },
            },
        });
    }

    for (const days of reminderDays) {
        const date = new Date(deadline);
        date.setDate(date.getDate() - days);
        if (date.getTime() <= now) continue;
        out.push({
            date,
            content: {
                title: t('notif.title'),
                body: days === 0
                    ? t('notif.reminderToday', { name: goal.name })
                    : t('notif.reminderDays', { name: goal.name, n: days }),
                data: { goalId: goal.id },
            },
        });
    }
    return out;
}

async function cancelForGoal(N, goalId) {
    const scheduled = await N.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
        if (n.content?.data?.goalId === goalId) {
            await N.cancelScheduledNotificationAsync(n.identifier);
        }
    }
    return scheduled.length;
}

export function scheduleGoalNotifications(goal, t) {
    return enqueue(async () => {
        const N = await getNotifications();
        if (!N) return;
        try {
            await cancelForGoal(N, goal.id);
            const reminders = buildReminders(goal, t, await getReminderTime());
            if (!reminders.length) return;
            let pending = (await N.getAllScheduledNotificationsAsync()).length;
            for (const r of reminders.sort((a, b) => a.date - b.date)) {
                if (pending >= MAX_PENDING) break; // sınır doluysa bir sonraki açılıştaki yeniden kurulumda sıraya girer
                await N.scheduleNotificationAsync({ content: r.content, trigger: dateTrigger(N, r.date) });
                pending++;
            }
        } catch (err) {
            console.warn('[notifications] schedule error:', err);
        }
    });
}

export function cancelGoalNotifications(goalId) {
    return enqueue(async () => {
        const N = await getNotifications();
        if (!N) return;
        try {
            await cancelForGoal(N, goalId);
        } catch (err) {
            console.warn('[notifications] cancel error:', err);
        }
    });
}

/**
 * Tüm hedef bildirimlerini siler ve verilen listeye göre en yakın tarihliden başlayarak yeniden kurar.
 * Her açılışta, yedekten geri yüklemede ve hatırlatma saati değişince çağrılır: silinen hedeflerin
 * bildirimleri kalmaz ve platform sınırına takılan uzak tarihli hatırlatıcılar zamanı gelince kurulur.
 */
export function rescheduleAllNotifications(goals, t) {
    return enqueue(async () => {
        const N = await getNotifications();
        if (!N) return;
        try {
            const scheduled = await N.getAllScheduledNotificationsAsync();
            const others = scheduled.filter(n => !n.content?.data?.goalId);
            if (others.length === 0) {
                await N.cancelAllScheduledNotificationsAsync();
            } else {
                // Çalışan sayaç bildirimi gibi hedef dışı bildirimler korunur
                for (const n of scheduled) {
                    if (n.content?.data?.goalId) await N.cancelScheduledNotificationAsync(n.identifier);
                }
            }

            const time = await getReminderTime();
            const all = [];
            for (const goal of goals) all.push(...buildReminders(goal, t, time));
            all.sort((a, b) => a.date - b.date);

            for (const r of all.slice(0, Math.max(0, MAX_PENDING - others.length))) {
                await N.scheduleNotificationAsync({ content: r.content, trigger: dateTrigger(N, r.date) });
            }
        } catch (err) {
            console.warn('[notifications] reschedule error:', err);
        }
    });
}

// ── Bildirime dokunma ───────────────────────────────────────────
/**
 * Kullanıcı bir hedef bildirimine dokunduğunda `onGoal(goalId)` çağrılır.
 * Uygulama bildirime dokunularak açıldıysa (soğuk başlatma) o hedef de iletilir.
 * Aboneliği kaldıran fonksiyon döner.
 */
export function listenForGoalNotificationTaps(onGoal) {
    let sub = null;
    let cancelled = false;
    (async () => {
        const N = await getNotifications();
        if (!N || cancelled) return;
        try {
            sub = N.addNotificationResponseReceivedListener(response => {
                const goalId = response?.notification?.request?.content?.data?.goalId;
                if (goalId) onGoal(goalId);
            });
            const last = await N.getLastNotificationResponseAsync?.();
            const goalId = last?.notification?.request?.content?.data?.goalId;
            if (goalId && !cancelled) {
                onGoal(goalId);
                // Aynı bildirim sonraki açılışlarda tekrar işlenmesin
                await N.clearLastNotificationResponseAsync?.();
            }
        } catch (err) {
            console.warn('[notifications] tap listener error:', err);
        }
    })();
    return () => {
        cancelled = true;
        sub?.remove?.();
    };
}

// ── Sayaç (pomodoro / zamanlayıcı) bitiş bildirimi ──────────────
const counterId = (key) => `counter-${key}`;

/** Sayaç `seconds` saniye sonra bittiğinde gösterilecek bildirimi kurar (uygulama arka plandayken de çalışır). */
export function scheduleCounterNotification(key, seconds, title, body) {
    return enqueue(async () => {
        const N = await getNotifications();
        if (!N) return;
        try {
            await N.cancelScheduledNotificationAsync(counterId(key)).catch(() => {});
            if (!(seconds > 0)) return;
            const type = N.SchedulableTriggerInputTypes?.TIME_INTERVAL ?? 'timeInterval';
            await N.scheduleNotificationAsync({
                identifier: counterId(key),
                content: { title, body, data: { counter: key } },
                trigger: { type, seconds: Math.max(1, Math.round(seconds)), channelId: CHANNEL_ID },
            });
        } catch (err) {
            console.warn('[notifications] counter schedule error:', err);
        }
    });
}

export function cancelCounterNotification(key) {
    return enqueue(async () => {
        const N = await getNotifications();
        if (!N) return;
        try {
            await N.cancelScheduledNotificationAsync(counterId(key));
        } catch { /* kurulu değilse yoksay */ }
    });
}
