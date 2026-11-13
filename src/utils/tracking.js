// Günlük takip hedefleri ("30 gün kitap oku") — saf fonksiyonlar (Node ile test edilir)
//
// Model: goal.tracking === true, goal.startDate..goal.deadline (dahil) aralığındaki her gün için
// goal.dayLog['YYYY-MM-DD'] = { done: boolean, note: string, value?: number } tutulur. Kayıt yoksa gün
// yapılmamış sayılır. `value` isteğe bağlı günlük miktardır (ör. okunan sayfa); birimi goal.trackingUnit'tir.
import { toDateStr } from './dateUtils.js';

export const MAX_TRACKING_DAYS = 1000;

function addDays(isoDate, n) {
    const d = new Date(isoDate + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return toDateStr(d);
}

/** Takip aralığındaki günleri sırayla döndürür (başlangıç ve bitiş dahil). */
export function trackingDays(goal) {
    const end = goal.deadline;
    const start = goal.startDate && goal.startDate <= end ? goal.startDate : end;
    const days = [];
    let cur = start;
    while (cur <= end && days.length < MAX_TRACKING_DAYS) {
        days.push(cur);
        cur = addDays(cur, 1);
    }
    return days;
}

/**
 * Özet: toplam gün, yapılan gün, kaçırılan (geçmişte işaretlenmemiş) gün, güncel seri,
 * bugünün aralıkta olup olmadığı ve bugünün yapılıp yapılmadığı.
 */
export function trackingStats(goal, today = toDateStr(new Date())) {
    const days = trackingDays(goal);
    const log = goal.dayLog || {};
    const isDone = (d) => !!log[d]?.done;

    let done = 0;
    let missed = 0;
    let longest = 0;
    let run = 0;
    let valueTotal = 0;
    let valueDays = 0;
    for (const d of days) {
        if (isDone(d)) {
            done++;
            run++;
            if (run > longest) longest = run;
        } else {
            run = 0;
            if (d < today) missed++;
        }
        const v = log[d]?.value;
        if (Number.isFinite(v)) {
            valueTotal += v;
            valueDays++;
        }
    }

    // Seri: bugün yapıldıysa bugünden, değilse dünden geriye doğru kesintisiz yapılan günler
    let streak = 0;
    const first = days[0];
    const last = days[days.length - 1];
    let cur = today > last ? last : today;
    if (cur === today && !isDone(cur)) cur = addDays(cur, -1);
    while (cur >= first && isDone(cur)) {
        streak++;
        cur = addDays(cur, -1);
    }

    const todayInRange = days.length > 0 && today >= first && today <= last;
    return {
        total: days.length,
        done,
        missed,
        streak,
        longest,
        // Günlük miktar girilen günlerin toplamı ve ortalaması (ondalık hataları yuvarlanır)
        valueTotal: Math.round(valueTotal * 100) / 100,
        valueAvg: valueDays > 0 ? Math.round(valueTotal / valueDays * 10) / 10 : 0,
        valueDays,
        todayInRange,
        todayDone: todayInRange && isDone(today),
    };
}

/** Yapılan gün oranı (0-100). */
export function trackingProgress(goal) {
    const { total, done } = trackingStats(goal);
    return total > 0 ? Math.round(done / total * 100) : 0;
}

/**
 * Bir günün kaydını günceller ve yeni dayLog döndürür (kaynak değişmez).
 * İşaret, not ve miktar boşsa kayıt silinir. `value: null` miktarı temizler.
 */
export function setDayEntry(dayLog, date, patch) {
    const prev = (dayLog || {})[date] || { done: false, note: '' };
    const next = { ...prev, ...patch };
    const entry = { done: !!next.done, note: next.note || '' };
    if (Number.isFinite(next.value)) entry.value = next.value;
    const out = { ...(dayLog || {}) };
    if (!entry.done && !entry.note && entry.value === undefined) delete out[date];
    else out[date] = entry;
    return out;
}

/** Kullanıcının yazdığı miktarı sayıya çevirir ("39", "2,5"); boş ya da geçersizse null. */
export function parseDayValue(text) {
    const s = String(text ?? '').trim().replace(',', '.');
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 && n <= 1e9 ? n : null;
}

/**
 * Takip hedefi için önümüzdeki günlerde "bugünü işaretle" hatırlatması gereken tarihleri döndürür.
 * Aralık dışındaki ve zaten işaretlenmiş günler atlanır.
 */
export function upcomingReminderDays(goal, today = toDateStr(new Date()), count = 7) {
    if (!goal.tracking || goal.completed || goal.dailyReminder === false) return [];
    const days = new Set(trackingDays(goal));
    const out = [];
    for (let i = 0; i < count; i++) {
        const d = addDays(today, i);
        if (days.has(d) && !goal.dayLog?.[d]?.done) out.push(d);
    }
    return out;
}
