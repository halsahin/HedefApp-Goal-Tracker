// Yinelenen hedef mantığı — saf fonksiyonlar (React/AsyncStorage bağımlılığı yok, Node ile test edilir)
import { generateId, toDateStr, addMonthsClamped, calcRemainingDays } from './dateUtils.js';

/** Bir yinelenen hedefin bitiş tarihinden sonraki bitiş tarihini döndürür. */
export function nextDeadline(deadline, recurring) {
    if (recurring.type === 'monthly') {
        return addMonthsClamped(deadline, 1, recurring.anchorDay);
    }
    const days =
        recurring.type === 'daily'  ? 1 :
        recurring.type === 'weekly' ? 7 :
        (Number(recurring.interval) || 7);
    const base = new Date(deadline + 'T12:00:00');
    base.setDate(base.getDate() + days);
    return toDateStr(base);
}

/** Yeni oluşturulan yinelenen hedefin ilk bitiş tarihi (bugünden bir periyot sonrası). */
export function firstDeadline(recurring, today = toDateStr(new Date())) {
    return nextDeadline(today, recurring);
}

/**
 * Tamamlanan yinelenen hedefin bir sonraki örneğini üretir.
 * Zamanında tamamlandıysa seri (streak) bir artar, geciktiyse sıfırlanır.
 */
export function createNextInstance(goal) {
    const onTime = calcRemainingDays(goal.deadline) >= 0;
    const recurring = goal.recurring.type === 'monthly'
        ? { ...goal.recurring, anchorDay: goal.recurring.anchorDay || new Date(goal.deadline + 'T12:00:00').getDate() }
        : goal.recurring;
    return {
        ...goal,
        id: generateId(),
        spawnedFrom: goal.id, // tamamlama geri alınırsa bu örnek kaldırılabilsin
        completed: false,
        pinned: false,
        createdAt: new Date().toISOString(),
        deadline: nextDeadline(goal.deadline, recurring),
        startDate: goal.deadline,
        progress: 0,
        recurring,
        streak: onTime ? (goal.streak || 0) + 1 : 0,
        subtasks: (goal.subtasks || []).map(s => ({ ...s, completed: false })),
        updates: [],
    };
}
