import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import GoalCard from '../src/components/GoalCard';
import { renderWithProviders, makeGoal, dayOffset } from './testUtils';

function setup(goal, props = {}) {
    const handlers = {
        onToggleComplete: jest.fn(), onTogglePin: jest.fn(), onDelete: jest.fn(), onPress: jest.fn(),
        onToggleToday: jest.fn(), onSelect: jest.fn(), onLongPress: jest.fn(),
    };
    const utils = renderWithProviders(<GoalCard goal={goal} {...handlers} {...props} />);
    return { ...utils, handlers };
}

describe('GoalCard', () => {
    it('hedef adını ve kalan günü gösterir', () => {
        const { getByText } = setup(makeGoal({ deadline: dayOffset(10) }));
        expect(getByText('Kitap oku')).toBeTruthy();
        expect(getByText('10')).toBeTruthy();
        expect(getByText('gün kaldı')).toBeTruthy();
    });

    it('normal hedefte kutucuk hedefi tamamlar', () => {
        const { getByRole, handlers } = setup(makeGoal());
        fireEvent.press(getByRole('checkbox'));
        expect(handlers.onToggleComplete).toHaveBeenCalledWith('g1');
        expect(handlers.onToggleToday).not.toHaveBeenCalled();
    });

    it('karta basınca detayı açar, uzun basınca seçim başlatır', () => {
        const { getByText, handlers } = setup(makeGoal());
        fireEvent.press(getByText('Kitap oku'));
        expect(handlers.onPress).toHaveBeenCalledTimes(1);
        fireEvent(getByText('Kitap oku'), 'longPress');
        expect(handlers.onLongPress).toHaveBeenCalledWith('g1');
    });

    describe('günlük takip hedefi', () => {
        const tracking = (over = {}) => makeGoal({
            tracking: true, startDate: dayOffset(-2), deadline: dayOffset(27),
            dayLog: { [dayOffset(-2)]: { done: true, note: '' }, [dayOffset(-1)]: { done: true, note: '' } },
            ...over,
        });

        it('yapılan gün özetini ve bugünün durumunu gösterir', () => {
            const { getByText } = setup(tracking());
            expect(getByText('2/30 gün yapıldı · bugün bekliyor')).toBeTruthy();
        });

        it('kutucuk hedefi değil bugünü işaretler', () => {
            const { getByRole, handlers } = setup(tracking());
            const box = getByRole('checkbox');
            expect(box.props.accessibilityState.checked).toBe(false);
            fireEvent.press(box);
            expect(handlers.onToggleToday).toHaveBeenCalledWith('g1');
            expect(handlers.onToggleComplete).not.toHaveBeenCalled();
        });

        it('bugün işaretliyse kutucuk dolu görünür', () => {
            const { getByRole, getByText } = setup(tracking({ dayLog: { [dayOffset(0)]: { done: true, note: '' } } }));
            expect(getByRole('checkbox').props.accessibilityState.checked).toBe(true);
            expect(getByText('1/30 gün yapıldı · bugün tamam')).toBeTruthy();
        });

        it('henüz başlamamış takipte kutucuk normal tamamlamaya döner', () => {
            const { getByRole, handlers } = setup(tracking({ startDate: dayOffset(3), dayLog: {} }));
            fireEvent.press(getByRole('checkbox'));
            expect(handlers.onToggleComplete).toHaveBeenCalledWith('g1');
        });
    });

    describe('seçim modu', () => {
        it('karta ve kutucuğa basmak yalnızca seçimi değiştirir', () => {
            const { getByText, getByRole, handlers } = setup(makeGoal(), { selectionMode: true });
            fireEvent.press(getByText('Kitap oku'));
            fireEvent.press(getByRole('checkbox'));
            expect(handlers.onSelect).toHaveBeenCalledTimes(2);
            expect(handlers.onPress).not.toHaveBeenCalled();
            expect(handlers.onToggleComplete).not.toHaveBeenCalled();
        });

        it('seçili kart işaretli görünür ve sil/favori butonları gizlenir', () => {
            const { getByRole, queryByText, queryAllByText } = setup(makeGoal(), { selectionMode: true, selected: true });
            expect(getByRole('checkbox').props.accessibilityState.checked).toBe(true);
            expect(queryByText('icon:star')).toBeNull();
            // Geriye yalnızca kaydırma arka planındaki çöp kutusu ikonu kalır
            expect(queryAllByText('icon:trash-2')).toHaveLength(1);
        });
    });

    it('tekrarlı hedefte seri rozetini gösterir', () => {
        const { getByLabelText } = setup(makeGoal({ recurring: { type: 'weekly', interval: 7 }, streak: 4 }));
        expect(getByLabelText('4 seri')).toBeTruthy();
    });
});
