// Yedek verisi doğrulama/temizleme — saf fonksiyonlar (Node ile test edilir)
import { generateId, toDateStr } from './dateUtils.js';

const MAX_GOALS = 5000;
const MAX_TEXT = 5000;
const MAX_ITEMS = 500;
const MAX_COUNTERS = 5000;
const MAX_DAY_ENTRIES = 1000;

const str = (v, fallback = '') => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : fallback);
const list = (v) => (Array.isArray(v) ? v : []);
const id = (v) => (typeof v === 'string' && v ? v.slice(0, 100) : generateId());
const isIso = (v) => typeof v === 'string' && !isNaN(new Date(v).getTime());

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (v) => typeof v === 'string' && DATE_RE.test(v) && !isNaN(new Date(v + 'T12:00:00').getTime());
const RECURRING_TYPES = ['daily', 'weekly', 'monthly', 'custom'];
const COUNTER_TYPES = ['pomodoro', 'stopwatch', 'timer'];
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// İç içe öğeler ekranda doğrudan <Text> içinde gösterildiği için tipleri garanti altına alınır
function sanitizeSubtask(s) {
    if (!s || typeof s !== 'object' || typeof s.text !== 'string') return null;
    return { id: id(s.id), text: str(s.text), completed: !!s.completed };
}

function sanitizeUpdate(u) {
    if (!u || typeof u !== 'object' || typeof u.text !== 'string') return null;
    return { id: id(u.id), text: str(u.text), date: isIso(u.date) ? u.date : new Date().toISOString() };
}

function sanitizeRecurring(r) {
    if (!r || typeof r !== 'object' || !RECURRING_TYPES.includes(r.type)) return null;
    const interval = Number(r.interval);
    const out = { type: r.type, interval: Number.isFinite(interval) && interval >= 1 && interval <= 3650 ? Math.round(interval) : 7 };
    if (Number.isInteger(r.anchorDay) && r.anchorDay >= 1 && r.anchorDay <= 31) out.anchorDay = r.anchorDay;
    return out;
}

function sanitizeDayLog(log) {
    const out = {};
    if (!log || typeof log !== 'object' || Array.isArray(log)) return out;
    let count = 0;
    for (const [date, entry] of Object.entries(log)) {
        if (count >= MAX_DAY_ENTRIES) break;
        if (!isDate(date) || !entry || typeof entry !== 'object') continue;
        const done = !!entry.done;
        const note = str(entry.note).slice(0, 1000);
        const hasValue = Number.isFinite(entry.value) && entry.value >= 0 && entry.value <= 1e9;
        if (!done && !note && !hasValue) continue;
        out[date] = hasValue ? { done, note, value: entry.value } : { done, note };
        count++;
    }
    return out;
}

function sanitizeGoal(g) {
    if (!g || typeof g !== 'object' || typeof g.id !== 'string' || typeof g.name !== 'string') return null;
    return {
        ...g,
        id: g.id.slice(0, 100),
        name: str(g.name),
        description: str(g.description),
        category: str(g.category, 'other'),
        deadline: isDate(g.deadline) ? g.deadline : toDateStr(new Date()),
        startDate: isDate(g.startDate) ? g.startDate : null,
        createdAt: isIso(g.createdAt) ? g.createdAt : new Date().toISOString(),
        completed: !!g.completed,
        pinned: !!g.pinned,
        folderId: str(g.folderId, 'default'),
        progress: Number.isFinite(g.progress) ? Math.min(100, Math.max(0, g.progress)) : 0,
        streak: Number.isInteger(g.streak) && g.streak >= 0 ? g.streak : 0,
        recurring: g.tracking === true ? null : sanitizeRecurring(g.recurring),
        tracking: g.tracking === true,
        trackingUnit: str(g.trackingUnit).slice(0, 20),
        dailyReminder: g.dailyReminder !== false,
        dayLog: sanitizeDayLog(g.dayLog),
        spawnedFrom: typeof g.spawnedFrom === 'string' ? g.spawnedFrom.slice(0, 100) : null,
        subtasks: list(g.subtasks).slice(0, MAX_ITEMS).map(sanitizeSubtask).filter(Boolean),
        updates: list(g.updates).slice(0, MAX_ITEMS).map(sanitizeUpdate).filter(Boolean),
        // Alan hiç yoksa (eski yedekler) varsayılan hatırlatıcılar korunur
        reminderDays: Array.isArray(g.reminderDays)
            ? g.reminderDays.filter((n) => Number.isInteger(n) && n >= 0 && n <= 365)
            : [3, 1],
    };
}

function sanitizeFolder(f) {
    if (!f || typeof f !== 'object' || typeof f.id !== 'string') return null;
    return { id: f.id.slice(0, 100), name: str(f.name) };
}

function sanitizeCounterNote(n) {
    if (!n || typeof n !== 'object' || typeof n.text !== 'string') return null;
    return { id: id(n.id), text: str(n.text), createdAt: isIso(n.createdAt) ? n.createdAt : new Date().toISOString() };
}

function sanitizeCounter(r) {
    if (!r || typeof r !== 'object' || !COUNTER_TYPES.includes(r.type)) return null;
    return {
        id: id(r.id),
        type: r.type,
        label: str(r.label),
        startTime: isIso(r.startTime) ? r.startTime : new Date().toISOString(),
        duration: Number.isFinite(r.duration) && r.duration >= 0 ? Math.round(r.duration) : 0,
        notes: list(r.notes).slice(0, MAX_ITEMS).map(sanitizeCounterNote).filter(Boolean),
    };
}

// Yalnızca bilinen ayar anahtarları ve geçerli değerleri kabul edilir
const SETTING_RULES = {
    app_theme: (v) => ['light', 'dark', 'system'].includes(v),
    app_theme_preset: (v) => typeof v === 'string' && v.length > 0 && v.length <= 40,
    app_theme_custom: (v) => HEX_RE.test(v),
    app_theme_custom_bg: (v) => v === '' || HEX_RE.test(v),
    app_theme_custom_surface: (v) => v === '' || HEX_RE.test(v),
    app_theme_custom_text: (v) => v === '' || HEX_RE.test(v),
    app_language: (v) => ['tr', 'en', 'zh', 'ja', 'ko'].includes(v),
    app_reminder_time: (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
};
export const SETTING_KEYS = Object.keys(SETTING_RULES);

function sanitizeSettings(s) {
    const out = {};
    if (!s || typeof s !== 'object') return out;
    for (const key of SETTING_KEYS) {
        const v = s[key];
        if (typeof v === 'string' && SETTING_RULES[key](v)) out[key] = v;
    }
    return out;
}

/**
 * Yedek verisini (yerel dosya veya Drive) doğrular ve temizler.
 * Geçersizse null döner; geçerliyse { goals, folders, counters, settings } döner.
 * `counters` yedekte hiç yoksa (eski sürüm yedekleri) null'dır — mevcut kayıtlara dokunulmaz.
 */
export function parseBackupData(data) {
    const rawGoals = Array.isArray(data) ? data : data?.goals;
    if (!Array.isArray(rawGoals) || rawGoals.length > MAX_GOALS) return null;
    const goals = rawGoals.map(sanitizeGoal).filter(Boolean);
    const folders = list(data?.folders).map(sanitizeFolder).filter(Boolean);
    const counters = Array.isArray(data?.counters)
        ? data.counters.slice(0, MAX_COUNTERS).map(sanitizeCounter).filter(Boolean)
        : null;
    const settings = sanitizeSettings(data?.settings);
    return { goals, folders, counters, settings };
}
