import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGoals } from '../src/hooks/useGoals';
import { dayOffset } from './testUtils';

async function setup(stored) {
    await AsyncStorage.clear();
    if (stored) await AsyncStorage.setItem('goaltracker_v2', JSON.stringify(stored));
    const hook = renderHook(() => useGoals(null));
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));
    return hook;
}

const base = { name: 'Hedef', category: 'personal', deadline: dayOffset(5), description: '' };

describe('useGoals', () => {
    it('hedef ekler ve AsyncStorage\'a kaydeder', async () => {
        const { result } = await setup();
        act(() => { result.current.addGoal({ ...base, name: '  Spor  ' }); });
        expect(result.current.rawGoals).toHaveLength(1);
        expect(result.current.rawGoals[0].name).toBe('Spor');
        await waitFor(async () => {
            const saved = JSON.parse(await AsyncStorage.getItem('goaltracker_v2'));
            expect(saved).toHaveLength(1);
        });
    });

    it('eski kayıtlara yeni alanların varsayılanlarını ekler', async () => {
        const { result } = await setup([{ id: 'old', name: 'Eski', category: 'Sağlık', deadline: dayOffset(3), completed: false, pinned: false }]);
        const g = result.current.rawGoals[0];
        expect(g.category).toBe('health');          // Türkçe etiket → anahtar
        expect(g.tracking).toBe(false);
        expect(g.dayLog).toEqual({});
        expect(g.reminderDays).toEqual([3, 1]);
        expect(g.subtasks).toEqual([]);
    });

    it('silinen hedef eski sırasına geri konur', async () => {
        const { result } = await setup();
        act(() => { result.current.addGoal({ ...base, name: 'A' }); });
        act(() => { result.current.addGoal({ ...base, name: 'B' }); });
        act(() => { result.current.addGoal({ ...base, name: 'C' }); });
        const middle = result.current.rawGoals[1];
        act(() => { result.current.deleteGoal(middle.id); });
        expect(result.current.rawGoals.map(g => g.name)).toEqual(['C', 'A']);
        act(() => { result.current.restoreGoal(middle, 1); });
        expect(result.current.rawGoals.map(g => g.name)).toEqual(['C', 'B', 'A']);
    });

    it('tekrarlı hedef tamamlanınca sonraki örnek oluşur, geri alınınca kaldırılır', async () => {
        const { result } = await setup();
        let goal;
        act(() => { goal = result.current.addGoal({ ...base, recurring: { type: 'weekly', interval: 7 } }); });

        let res;
        act(() => { res = result.current.toggleComplete(goal.id); });
        expect(res.created).toBeTruthy();
        expect(result.current.rawGoals).toHaveLength(2);
        expect(res.created.streak).toBe(1);
        const createdId = res.created.id;

        act(() => { res = result.current.toggleComplete(goal.id); });
        expect(res.removedId).toBe(createdId);
        expect(result.current.rawGoals).toHaveLength(1);
        expect(result.current.rawGoals[0].completed).toBe(false);
    });

    it('kullanıcının dokunduğu sonraki örnek geri almada silinmez', async () => {
        const { result } = await setup();
        let goal, res;
        act(() => { goal = result.current.addGoal({ ...base, recurring: { type: 'daily', interval: 1 } }); });
        act(() => { res = result.current.toggleComplete(goal.id); });
        act(() => { result.current.addUpdate(res.created.id, 'not'); });
        act(() => { res = result.current.toggleComplete(goal.id); });
        expect(res.removedId).toBeNull();
        expect(result.current.rawGoals).toHaveLength(2);
    });

    describe('günlük takip', () => {
        it('bugünden başlar, işaretleme ilerlemeyi günceller', async () => {
            const { result } = await setup();
            let goal;
            act(() => { goal = result.current.addGoal({ ...base, tracking: true, deadline: dayOffset(3), trackingUnit: ' sayfa ' }); });
            expect(goal.startDate).toBe(dayOffset(0));
            expect(goal.trackingUnit).toBe('sayfa');
            expect(goal.recurring).toBeNull();

            let res;
            act(() => { res = result.current.toggleDay(goal.id, dayOffset(0)); });
            expect(res).toEqual({ done: true, autoCompleted: false });
            expect(result.current.rawGoals[0].progress).toBe(25); // 4 günün 1'i
            expect(result.current.rawGoals[0].completed).toBe(false);

            act(() => { res = result.current.toggleDay(goal.id, dayOffset(0)); });
            expect(res.done).toBe(false);
            expect(result.current.rawGoals[0].progress).toBe(0);
        });

        it('tüm günler işaretlenince hedef kendiliğinden tamamlanır', async () => {
            const { result } = await setup();
            let goal, res;
            act(() => { goal = result.current.addGoal({ ...base, tracking: true, startDate: dayOffset(-1), deadline: dayOffset(0) }); });
            act(() => { res = result.current.toggleDay(goal.id, dayOffset(-1)); });
            expect(res.autoCompleted).toBe(false);
            act(() => { res = result.current.toggleDay(goal.id, dayOffset(0)); });
            expect(res.autoCompleted).toBe(true);
            expect(result.current.rawGoals[0].completed).toBe(true);
            expect(result.current.rawGoals[0].progress).toBe(100);
        });

        it('güne not ve miktar kaydedilir, alt görev ilerlemeyi bozmaz', async () => {
            const { result } = await setup();
            let goal;
            act(() => { goal = result.current.addGoal({ ...base, tracking: true, deadline: dayOffset(1) }); });
            act(() => { result.current.toggleDay(goal.id, dayOffset(0)); });
            act(() => { result.current.setDayDetails(goal.id, dayOffset(0), { note: ' 39 sayfa ', value: 39 }); });
            expect(result.current.rawGoals[0].dayLog[dayOffset(0)]).toEqual({ done: true, note: '39 sayfa', value: 39 });
            act(() => { result.current.addSubtask(goal.id, 'alt görev'); });
            expect(result.current.rawGoals[0].progress).toBe(50);
        });

        it('normal hedefte gün işaretlenemez', async () => {
            const { result } = await setup();
            let goal, res;
            act(() => { goal = result.current.addGoal(base); });
            act(() => { res = result.current.toggleDay(goal.id, dayOffset(0)); });
            expect(res).toBeNull();
        });
    });

    it('toplu taşıma ve "geciken" filtresi', async () => {
        const { result } = await setup();
        let a, b;
        act(() => { a = result.current.addGoal({ ...base, name: 'Geciken', deadline: dayOffset(-2) }); });
        act(() => { b = result.current.addGoal({ ...base, name: 'Zamanında' }); });
        act(() => { result.current.moveGoalsToFolder([a.id, b.id], 'f1'); });
        expect(result.current.rawGoals.every(g => g.folderId === 'f1')).toBe(true);

        act(() => { result.current.setFilterBy('overdue'); });
        expect(result.current.goals.map(g => g.name)).toEqual(['Geciken']);
        act(() => { result.current.toggleComplete(a.id); });
        expect(result.current.goals).toHaveLength(0);
    });

    it('arama ve sıralama', async () => {
        const { result } = await setup();
        act(() => { result.current.addGoal({ ...base, name: 'Zeytin', deadline: dayOffset(1) }); });
        act(() => { result.current.addGoal({ ...base, name: 'Armut', deadline: dayOffset(9), description: 'meyve' }); });
        act(() => { result.current.setFilterBy('all'); });
        expect(result.current.goals.map(g => g.name)).toEqual(['Zeytin', 'Armut']); // kalan güne göre
        act(() => { result.current.setSortBy('name'); });
        expect(result.current.goals.map(g => g.name)).toEqual(['Armut', 'Zeytin']);
        act(() => { result.current.setSearchQuery('MEYVE'); });
        expect(result.current.goals.map(g => g.name)).toEqual(['Armut']);
    });
});
