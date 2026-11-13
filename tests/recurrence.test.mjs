import test from 'node:test';
import assert from 'node:assert/strict';
import { nextDeadline, firstDeadline, createNextInstance } from '../src/utils/recurrence.js';
import { deadlineFromDays } from '../src/utils/dateUtils.js';

test('nextDeadline: günlük, haftalık, özel', () => {
    assert.equal(nextDeadline('2026-12-31', { type: 'daily' }), '2027-01-01');
    assert.equal(nextDeadline('2026-11-13', { type: 'weekly' }), '2026-11-20');
    assert.equal(nextDeadline('2026-11-13', { type: 'custom', interval: 10 }), '2026-11-23');
    assert.equal(nextDeadline('2026-11-13', { type: 'custom', interval: 'x' }), '2026-11-20'); // geçersiz → 7
});

test('nextDeadline: aylık gerçek takvim ayı kullanır', () => {
    assert.equal(nextDeadline('2026-01-31', { type: 'monthly' }), '2026-02-28');
    assert.equal(nextDeadline('2026-02-28', { type: 'monthly', anchorDay: 31 }), '2026-03-31');
    assert.equal(nextDeadline('2026-05-15', { type: 'monthly' }), '2026-06-15');
});

test('firstDeadline bugünden bir periyot sonrasıdır', () => {
    assert.equal(firstDeadline({ type: 'weekly' }, '2026-11-13'), '2026-11-20');
    assert.equal(firstDeadline({ type: 'monthly' }, '2026-01-31'), '2026-02-28');
});

function makeGoal(over = {}) {
    return {
        id: 'g1', name: 'Spor', category: 'health', deadline: deadlineFromDays(2), startDate: null,
        description: '', completed: false, pinned: true, createdAt: '2026-01-01T00:00:00.000Z', progress: 50,
        recurring: { type: 'weekly', interval: 7 },
        subtasks: [{ id: 's1', text: 'a', completed: true }],
        updates: [{ id: 'u1', text: 'n', date: '2026-01-01T00:00:00.000Z' }],
        reminderDays: [1], folderId: 'f1', ...over,
    };
}

test('createNextInstance yeni örneği sıfırlar ve özellikleri taşır', () => {
    const goal = makeGoal();
    const next = createNextInstance(goal);
    assert.notEqual(next.id, goal.id);
    assert.equal(next.spawnedFrom, goal.id);
    assert.equal(next.completed, false);
    assert.equal(next.pinned, false);
    assert.equal(next.progress, 0);
    assert.equal(next.startDate, goal.deadline);
    assert.equal(next.deadline, nextDeadline(goal.deadline, goal.recurring));
    assert.deepEqual(next.subtasks, [{ id: 's1', text: 'a', completed: false }]);
    assert.deepEqual(next.updates, []);
    assert.equal(next.folderId, 'f1');
    assert.deepEqual(next.reminderDays, [1]);
    // kaynak hedef değişmemeli
    assert.equal(goal.subtasks[0].completed, true);
});

test('createNextInstance seri: zamanında +1, gecikince sıfır', () => {
    assert.equal(createNextInstance(makeGoal()).streak, 1);
    assert.equal(createNextInstance(makeGoal({ streak: 4, deadline: deadlineFromDays(0) })).streak, 5);
    assert.equal(createNextInstance(makeGoal({ streak: 4, deadline: deadlineFromDays(-1) })).streak, 0);
});

test('createNextInstance aylık seride anchorDay saklar', () => {
    const next = createNextInstance(makeGoal({ deadline: '2099-01-31', recurring: { type: 'monthly', interval: 30 } }));
    assert.equal(next.deadline, '2099-02-28');
    assert.equal(next.recurring.anchorDay, 31);
    assert.equal(createNextInstance(next).deadline, '2099-03-31');
});
