import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import TrackingSection from '../src/components/TrackingSection';
import { renderWithProviders, makeGoal, dayOffset } from './testUtils';

// 30 günlük takip: 2 gün önce başladı (bugün 3. gün)
const tracking = (over = {}) => makeGoal({
    tracking: true, startDate: dayOffset(-2), deadline: dayOffset(27),
    dayLog: { [dayOffset(-2)]: { done: true, note: 'ilk gün' } },
    ...over,
});

function setup(goal) {
    const onToggleDay = jest.fn();
    const onSetDayDetails = jest.fn();
    const utils = renderWithProviders(
        <TrackingSection goal={goal} onToggleDay={onToggleDay} onSetDayDetails={onSetDayDetails} />
    );
    return { ...utils, onToggleDay, onSetDayDetails };
}

describe('TrackingSection', () => {
    it('her gün için bir hücre ve özet gösterir', () => {
        const { getAllByRole, getByText } = setup(tracking());
        expect(getAllByRole('button').length).toBe(30);
        expect(getByText('1/30')).toBeTruthy();   // yapılan
        expect(getByText('gün yapıldı')).toBeTruthy();
        expect(getByText('kaçırıldı')).toBeTruthy();
    });

    it('varsayılan olarak bugünü seçer ve işaretletir', () => {
        const { getByText, getByRole, onToggleDay } = setup(tracking());
        expect(getByText('3. gün · Bugün')).toBeTruthy();
        fireEvent.press(getByRole('checkbox'));
        expect(onToggleDay).toHaveBeenCalledWith('g1', dayOffset(0));
    });

    it('başka bir güne basınca o gün seçilir ve notu görünür', () => {
        const { getAllByRole, getByText, getByDisplayValue, getByRole, onToggleDay } = setup(tracking());
        fireEvent.press(getAllByRole('button')[0]);
        expect(getByText('1. gün')).toBeTruthy();
        expect(getByDisplayValue('ilk gün')).toBeTruthy();
        expect(getByText('Yapıldı')).toBeTruthy();
        fireEvent.press(getByRole('checkbox'));
        expect(onToggleDay).toHaveBeenCalledWith('g1', dayOffset(-2));
    });

    it('gelecek gün işaretlenemez ve not alanı çıkmaz', () => {
        const { getAllByRole, getByText, getByRole, queryByPlaceholderText, onToggleDay } = setup(tracking());
        fireEvent.press(getAllByRole('button')[10]);
        expect(getByText('Bu gün henüz gelmedi.')).toBeTruthy();
        expect(queryByPlaceholderText('Bu güne not ekle (ör. 39 sayfa)')).toBeNull();
        fireEvent.press(getByRole('checkbox'));
        expect(onToggleDay).not.toHaveBeenCalled();
    });

    it('yazılan not kaydedilir', () => {
        const { getByPlaceholderText, getByLabelText, onSetDayDetails } = setup(tracking());
        fireEvent.changeText(getByPlaceholderText('Bu güne not ekle (ör. 39 sayfa)'), '39 sayfa');
        fireEvent.press(getByLabelText('Kaydet'));
        expect(onSetDayDetails).toHaveBeenCalledWith('g1', dayOffset(0), { note: '39 sayfa' });
    });

    it('not değişmediyse kaydet butonu görünmez', () => {
        const { queryByLabelText } = setup(tracking());
        expect(queryByLabelText('Kaydet')).toBeNull();
    });

    it('birim tanımlıysa miktar alanı çıkar ve sayı olarak kaydedilir', () => {
        const goal = tracking({
            trackingUnit: 'sayfa',
            dayLog: { [dayOffset(-2)]: { done: true, note: '', value: 30 }, [dayOffset(-1)]: { done: true, note: '', value: 40 } },
        });
        const { getByLabelText, getByText, onSetDayDetails } = setup(goal);
        expect(getByText('Toplam 70 sayfa · günlük ortalama 35')).toBeTruthy();
        fireEvent.changeText(getByLabelText('sayfa'), '39,5');
        fireEvent.press(getByLabelText('Kaydet'));
        expect(onSetDayDetails).toHaveBeenCalledWith('g1', dayOffset(0), { note: '', value: 39.5 });
    });

    it('birim yoksa miktar alanı çıkmaz', () => {
        const { queryByLabelText } = setup(tracking());
        expect(queryByLabelText('sayfa')).toBeNull();
    });
});
