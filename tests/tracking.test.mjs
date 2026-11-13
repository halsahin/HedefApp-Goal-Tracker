import test from 'node:test';
import assert from 'node:assert/strict';
import {
    trackingDays, trackingStats, trackingProgress, setDayEntry, parseDayValue, upcomingReminderDays,
} from '../src/utils/tracking.js';

const goal = (over = {}) => ({ tracking: true, startDate: '2026-10-19', deadline: '2026-11-17', dayLog: {}, ...over });

test('trackingDays başlangıç ve bitişi dahil eder', () => {
    const days = trackingDays(goal());
    assert.equal(days.length, 30);
    assert.equal(days[0], '2026-10-19');
    assert.equal(days[1], '2026-10-20');
    assert.equal(days[29], '2026-11-17');
});

test('trackingDays: başlangıç yoksa veya bitişten sonraysa tek gün', () => {
    assert.deepEqual(trackingDays(goal({ startDate: null })), ['2026-11-17']);
    assert.deepEqual(trackingDays(goal({ startDate: '2026-12-01' })), ['2026-11-17']);
});

test('trackingDays üst sınırı aşmaz', () => {
    assert.equal(trackingDays(goal({ startDate: '2000-01-01' })).length, 1000);
});

test('trackingStats: yapılan, kaçırılan, bugün', () => {
    const g = goal({ dayLog: {
        '2026-10-19': { done: true, note: '' },
        '2026-10-20': { done: true, note: '39 sayfa' },
        '2026-10-21': { done: false, note: 'hastaydım' },
        '2026-10-22': { done: true, note: '' },
        '2026-01-01': { done: true, note: 'aralık dışı' },
    } });
    const s = trackingStats(g, '2026-10-23');
    assert.equal(s.total, 30);
    assert.equal(s.done, 3);       // aralık dışı kayıt sayılmaz
    assert.equal(s.missed, 1);     // 21 Ekim
    assert.equal(s.todayInRange, true);
    assert.equal(s.todayDone, false);
    assert.equal(s.streak, 1);     // dün (22) yapıldı, 21 kırıyor
});

test('trackingStats seri: bugün yapıldıysa bugünü de sayar', () => {
    const g = goal({ dayLog: {
        '2026-10-21': { done: true }, '2026-10-22': { done: true }, '2026-10-23': { done: true },
    } });
    assert.equal(trackingStats(g, '2026-10-23').streak, 3);
    assert.equal(trackingStats(g, '2026-10-24').streak, 3); // bugün henüz işaretlenmedi, seri bozulmaz
    assert.equal(trackingStats(g, '2026-10-25').streak, 0); // dün kaçırıldı
});

test('trackingStats: aralık dışındaki bugün', () => {
    assert.equal(trackingStats(goal(), '2026-10-01').todayInRange, false);
    const after = trackingStats(goal({ dayLog: { '2026-11-17': { done: true } } }), '2026-12-01');
    assert.equal(after.todayInRange, false);
    assert.equal(after.missed, 29);
    assert.equal(after.streak, 1);
});

test('trackingProgress yüzde hesaplar', () => {
    assert.equal(trackingProgress(goal()), 0);
    const log = {};
    for (let d = 19; d <= 31; d++) log[`2026-10-${d}`] = { done: true };
    assert.equal(trackingProgress(goal({ dayLog: log })), Math.round(13 / 30 * 100));
});

test('setDayEntry kaynak nesneyi değiştirmez, boş kaydı siler', () => {
    const log = { '2026-10-19': { done: true, note: '' } };
    const withNote = setDayEntry(log, '2026-10-20', { note: '39 sayfa' });
    assert.deepEqual(withNote['2026-10-20'], { done: false, note: '39 sayfa' });
    assert.equal(log['2026-10-20'], undefined);

    const ticked = setDayEntry(withNote, '2026-10-20', { done: true });
    assert.deepEqual(ticked['2026-10-20'], { done: true, note: '39 sayfa' });

    const cleared = setDayEntry(log, '2026-10-19', { done: false });
    assert.equal('2026-10-19' in cleared, false);
    assert.deepEqual(setDayEntry(undefined, '2026-10-19', { done: true }), { '2026-10-19': { done: true, note: '' } });
});

test('trackingStats: en uzun seri ve miktar toplamı/ortalaması', () => {
    const g = goal({ dayLog: {
        '2026-10-19': { done: true, value: 30 },
        '2026-10-20': { done: true, value: 39 },
        '2026-10-21': { done: true },
        '2026-10-23': { done: true, value: 12.5 },
        '2026-10-24': { done: false, note: 'x', value: 'bozuk' },
    } });
    const s = trackingStats(g, '2026-10-25');
    assert.equal(s.longest, 3);
    assert.equal(s.streak, 0);
    assert.equal(s.valueTotal, 81.5);
    assert.equal(s.valueDays, 3);
    assert.equal(s.valueAvg, 27.2);
    assert.equal(trackingStats(goal(), '2026-10-25').valueAvg, 0);
});

test('setDayEntry miktarı saklar ve null ile temizler', () => {
    const a = setDayEntry({}, '2026-10-20', { value: 39 });
    assert.deepEqual(a['2026-10-20'], { done: false, note: '', value: 39 });
    const b = setDayEntry(a, '2026-10-20', { done: true });
    assert.deepEqual(b['2026-10-20'], { done: true, note: '', value: 39 });
    const c = setDayEntry(a, '2026-10-20', { value: null });
    assert.equal('2026-10-20' in c, false);
});

test('parseDayValue', () => {
    assert.equal(parseDayValue('39'), 39);
    assert.equal(parseDayValue(' 2,5 '), 2.5);
    assert.equal(parseDayValue(''), null);
    assert.equal(parseDayValue('abc'), null);
    assert.equal(parseDayValue('-3'), null);
});

test('upcomingReminderDays: aralık içi, işaretlenmemiş günler', () => {
    const g = goal({ dayLog: { '2026-10-20': { done: true } } });
    assert.deepEqual(upcomingReminderDays(g, '2026-10-19', 3), ['2026-10-19', '2026-10-21']);
    assert.deepEqual(upcomingReminderDays(g, '2026-11-16', 7), ['2026-11-16', '2026-11-17']); // bitişten sonrası yok
    assert.deepEqual(upcomingReminderDays(g, '2026-10-17', 3), ['2026-10-19']);                // başlamadan öncesi yok
    assert.deepEqual(upcomingReminderDays({ ...g, completed: true }, '2026-10-19'), []);
    assert.deepEqual(upcomingReminderDays({ ...g, dailyReminder: false }, '2026-10-19'), []);
    assert.deepEqual(upcomingReminderDays({ ...g, tracking: false }, '2026-10-19'), []);
});
