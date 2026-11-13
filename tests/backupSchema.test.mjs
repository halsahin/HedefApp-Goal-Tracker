import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBackupData } from '../src/utils/backupSchema.js';

test('geçersiz kök veri reddedilir', () => {
    assert.equal(parseBackupData(null), null);
    assert.equal(parseBackupData({ goals: 'x' }), null);
    assert.equal(parseBackupData({}), null);
    assert.equal(parseBackupData({ goals: new Array(5001).fill({ id: 'a', name: 'b' }) }), null);
});

test('eski düz dizi formatı desteklenir', () => {
    const r = parseBackupData([{ id: 'a', name: 'Hedef', deadline: '2026-12-01' }]);
    assert.equal(r.goals.length, 1);
    assert.deepEqual(r.folders, []);
    assert.equal(r.counters, null);
    assert.deepEqual(r.settings, {});
    assert.deepEqual(r.goals[0].reminderDays, [3, 1]); // alan yoksa varsayılan
});

test('bozuk hedefler atılır, alanlar temizlenir', () => {
    const r = parseBackupData({
        goals: [
            {
                id: 'a', name: 'n', deadline: 'bad', startDate: {}, createdAt: 5, progress: 500, streak: -3,
                subtasks: [{ text: { x: 1 } }, { text: 'ok', completed: 1 }, null],
                updates: [{ id: 5, text: 'u', date: 'zzz' }, 'x'],
                recurring: { type: 'evil' }, reminderDays: [1, '2', 400, -1],
            },
            { id: 1, name: 'x' },
            { name: 'kimliksiz' },
            null,
        ],
    });
    assert.equal(r.goals.length, 1);
    const g = r.goals[0];
    assert.match(g.deadline, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(g.startDate, null);
    assert.equal(g.progress, 100);
    assert.equal(g.streak, 0);
    assert.equal(g.recurring, null);
    assert.deepEqual(g.reminderDays, [1]);
    assert.equal(g.subtasks.length, 1);
    assert.equal(g.subtasks[0].text, 'ok');
    assert.equal(g.subtasks[0].completed, true);
    assert.equal(typeof g.subtasks[0].id, 'string');
    assert.equal(g.updates.length, 1);
    assert.equal(typeof g.updates[0].id, 'string');
    assert.ok(!isNaN(new Date(g.updates[0].date).getTime()));
    assert.ok(!isNaN(new Date(g.createdAt).getTime()));
});

test('geçerli tekrar ayarı korunur', () => {
    const r = parseBackupData({ goals: [{ id: 'a', name: 'n', recurring: { type: 'monthly', interval: '30', anchorDay: 31, x: 1 } }] });
    assert.deepEqual(r.goals[0].recurring, { type: 'monthly', interval: 30, anchorDay: 31 });
});

test('uzun metinler kırpılır', () => {
    const r = parseBackupData({ goals: [{ id: 'a'.repeat(300), name: 'n'.repeat(9000) }] });
    assert.equal(r.goals[0].id.length, 100);
    assert.equal(r.goals[0].name.length, 5000);
});

test('klasörler ve sayaç kayıtları temizlenir', () => {
    const r = parseBackupData({
        goals: [],
        folders: [{ id: 'f', name: 'F', extra: 1 }, { name: 'kimliksiz' }],
        counters: [
            { id: 'c1', type: 'pomodoro', label: 'L', startTime: '2026-01-01T10:00:00.000Z', duration: 1500, notes: [{ id: 'n', text: 't', createdAt: 'x' }, { text: 5 }] },
            { id: 'c2', type: 'hack' },
            { type: 'timer', duration: -5 },
        ],
    });
    assert.deepEqual(r.folders, [{ id: 'f', name: 'F' }]);
    assert.equal(r.counters.length, 2);
    assert.equal(r.counters[0].notes.length, 1);
    assert.equal(r.counters[1].duration, 0);
    assert.equal(typeof r.counters[1].id, 'string');
});

test('ayarlar: yalnızca bilinen anahtar ve geçerli değerler', () => {
    const r = parseBackupData({
        goals: [],
        settings: {
            app_theme: 'dark', app_language: 'xx', app_theme_custom: '#12ab9F', app_theme_custom_bg: '',
            app_theme_custom_text: 'red', app_reminder_time: '25:00', drive_autosync: 'true', evil: 'x',
        },
    });
    assert.deepEqual(r.settings, { app_theme: 'dark', app_theme_custom: '#12ab9F', app_theme_custom_bg: '' });
    assert.deepEqual(parseBackupData({ goals: [], settings: { app_reminder_time: '07:30' } }).settings, { app_reminder_time: '07:30' });
});

test('günlük takip alanları temizlenir', () => {
    const r = parseBackupData({ goals: [{
        id: 'a', name: 'Kitap', tracking: true, recurring: { type: 'daily' }, spawnedFrom: 5,
        dayLog: {
            '2026-10-20': { done: 1, note: '39 sayfa', value: 39 },
            '2026-10-24': { value: -5, done: true },
            '2026-10-21': { done: false, note: '' },
            'bozuk': { done: true },
            '2026-10-22': 'x',
            '2026-10-23': { note: { a: 1 } },
        },
    }, { id: 'b', name: 'Normal', dayLog: [1, 2], tracking: 'yes' }] });
    const g = r.goals[0];
    assert.equal(g.tracking, true);
    assert.equal(g.recurring, null); // takip hedefi tekrarlı olamaz
    assert.equal(g.spawnedFrom, null);
    assert.deepEqual(g.dayLog, {
        '2026-10-20': { done: true, note: '39 sayfa', value: 39 },
        '2026-10-24': { done: true, note: '' }, // geçersiz miktar atılır
    });
    assert.equal(g.trackingUnit, '');
    assert.equal(g.dailyReminder, true);
    assert.equal(r.goals[1].tracking, false);
    assert.deepEqual(r.goals[1].dayLog, {});
});
