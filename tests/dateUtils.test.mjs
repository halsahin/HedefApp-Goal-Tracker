import test from 'node:test';
import assert from 'node:assert/strict';
import {
    toDateStr, addMonthsClamped, calcRemainingDays, deadlineFromDays, getDayChipInfo, generateId,
} from '../src/utils/dateUtils.js';

test('toDateStr yerel tarihi YYYY-MM-DD biçimler', () => {
    assert.equal(toDateStr(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('addMonthsClamped ay sonunu kırpar', () => {
    assert.equal(addMonthsClamped('2026-01-31', 1), '2026-02-28');
    assert.equal(addMonthsClamped('2028-01-31', 1), '2028-02-29'); // artık yıl
    assert.equal(addMonthsClamped('2026-03-15', 1), '2026-04-15');
    assert.equal(addMonthsClamped('2026-12-10', 1), '2027-01-10'); // yıl geçişi
});

test('addMonthsClamped anchorDay ile orijinal güne döner', () => {
    assert.equal(addMonthsClamped('2026-02-28', 1, 31), '2026-03-31');
    assert.equal(addMonthsClamped('2026-03-31', 1, 31), '2026-04-30');
});

test('calcRemainingDays bugün/yarın/dün', () => {
    assert.equal(calcRemainingDays(deadlineFromDays(0)), 0);
    assert.equal(calcRemainingDays(deadlineFromDays(1)), 1);
    assert.equal(calcRemainingDays(deadlineFromDays(-1)), -1);
    assert.equal(calcRemainingDays(deadlineFromDays(45)), 45);
});

test('getDayChipInfo eşikleri', () => {
    assert.equal(getDayChipInfo(5, true).type, 'done');
    assert.deepEqual(getDayChipInfo(-2, false), { key: 'chip.daysAgo', params: { n: 2 }, type: 'urgent' });
    assert.equal(getDayChipInfo(0, false).key, 'chip.today');
    assert.equal(getDayChipInfo(3, false).key, 'chip.urgent');
    assert.equal(getDayChipInfo(7, false).key, 'chip.thisWeek');
    assert.equal(getDayChipInfo(8, false).key, 'chip.onTrack');
});

test('generateId benzersiz üretir', () => {
    const ids = new Set(Array.from({ length: 1000 }, generateId));
    assert.equal(ids.size, 1000);
});
