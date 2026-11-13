import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import AddGoalModal from '../src/components/AddGoalModal';
import { renderWithProviders, dayOffset } from './testUtils';

function setup() {
    const onSubmit = jest.fn();
    const onClose = jest.fn();
    const utils = renderWithProviders(<AddGoalModal visible onClose={onClose} onSubmit={onSubmit} />);
    return { ...utils, onSubmit, onClose };
}

describe('AddGoalModal', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
        act(() => { jest.runOnlyPendingTimers(); });
        jest.useRealTimers();
    });

    it('ad boşken kaydetmez ve hata gösterir', () => {
        const { getByText, onSubmit } = setup();
        fireEvent.press(getByText('✦ Hedef Ekle'));
        expect(onSubmit).not.toHaveBeenCalled();
        expect(getByText('Hedef adı boş bırakılamaz')).toBeTruthy();
    });

    it('tek seferlik hedefi gün sayısıyla ekler', () => {
        const { getByText, getByPlaceholderText, onSubmit } = setup();
        fireEvent.changeText(getByPlaceholderText('örn. IELTS sınavına hazırlan'), 'Sınav');
        fireEvent.press(getByText('Gün Say'));
        fireEvent.changeText(getByPlaceholderText('örn. 30'), '30');
        fireEvent.press(getByText('✦ Hedef Ekle'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
        const data = onSubmit.mock.calls[0][0];
        expect(data.name).toBe('Sınav');
        expect(data.deadline).toBe(dayOffset(30));
        expect(data.tracking).toBe(false);
        expect(data.recurring).toBeNull();
    });

    it('günlük takipte "30 gün" bugün dahil 30 gün eder ve birim/hatırlatma iletilir', () => {
        const { getByText, getByPlaceholderText, queryByText, onSubmit } = setup();
        fireEvent.changeText(getByPlaceholderText('örn. IELTS sınavına hazırlan'), 'Kitap oku');
        fireEvent.press(getByText('Günlük Takip'));
        expect(queryByText('Başlangıç İlerlemesi')).toBeNull(); // takipte ilerleme elle seçilmez
        fireEvent.press(getByText('Gün Say'));
        fireEvent.changeText(getByPlaceholderText('örn. 30'), '30');
        fireEvent.changeText(getByPlaceholderText('ör. sayfa, km, dakika'), 'sayfa');
        fireEvent.press(getByText('✦ Hedef Ekle'));
        const data = onSubmit.mock.calls[0][0];
        expect(data.tracking).toBe(true);
        expect(data.deadline).toBe(dayOffset(29));
        expect(data.trackingUnit).toBe('sayfa');
        expect(data.dailyReminder).toBe(true);
        expect(data.recurring).toBeNull();
    });

    it('tekrarlı hedefte bitiş tarihi tekrar tipinden hesaplanır', () => {
        const { getByText, getByPlaceholderText, onSubmit } = setup();
        fireEvent.changeText(getByPlaceholderText('örn. IELTS sınavına hazırlan'), 'Spor');
        fireEvent.press(getByText('Tekrarlı'));
        fireEvent.press(getByText('Günlük'));
        fireEvent.press(getByText('✦ Hedef Ekle'));
        const data = onSubmit.mock.calls[0][0];
        expect(data.recurring).toEqual({ type: 'daily', interval: 1 });
        expect(data.deadline).toBe(dayOffset(1));
        expect(data.tracking).toBe(false);
    });
});
