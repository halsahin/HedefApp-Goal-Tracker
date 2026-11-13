import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import Toast from '../src/components/Toast';
import FilterTabs from '../src/components/FilterTabs';
import { renderWithProviders } from './testUtils';

describe('Toast', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('mesaj yokken hiçbir şey çizmez', () => {
        const { toJSON } = renderWithProviders(<Toast toast={null} onHide={jest.fn()} />);
        expect(toJSON()).toBeNull();
    });

    it('mesajı gösterir ve süre dolunca gizlenir', () => {
        const onHide = jest.fn();
        const { getByText } = renderWithProviders(<Toast toast={{ id: '1', message: 'Hedef eklendi' }} onHide={onHide} />);
        expect(getByText('Hedef eklendi')).toBeTruthy();
        act(() => { jest.advanceTimersByTime(2700); });
        expect(onHide).not.toHaveBeenCalled();
        act(() => { jest.advanceTimersByTime(1000); });
        expect(onHide).toHaveBeenCalledTimes(1);
    });

    it('"Geri al" butonu eylemi çağırır ve toast daha uzun kalır', () => {
        const onAction = jest.fn();
        const onHide = jest.fn();
        const { getByText } = renderWithProviders(
            <Toast toast={{ id: '2', message: 'Hedef silindi', actionLabel: 'Geri al', onAction }} onHide={onHide} />
        );
        act(() => { jest.advanceTimersByTime(4000); });
        expect(onHide).not.toHaveBeenCalled(); // eylemsiz toast bu sürede kapanmış olurdu
        fireEvent.press(getByText('Geri al'));
        expect(onAction).toHaveBeenCalledTimes(1);
    });
});

describe('FilterTabs', () => {
    it('beş filtreyi gösterir ve seçimi bildirir', () => {
        const onFilterChange = jest.fn();
        const { getByText } = renderWithProviders(<FilterTabs filterBy="active" onFilterChange={onFilterChange} />);
        for (const label of ['Tümü', 'Aktif', 'Geciken', 'Tamamlanan', 'Favori']) expect(getByText(label)).toBeTruthy();
        fireEvent.press(getByText('Geciken'));
        expect(onFilterChange).toHaveBeenCalledWith('overdue');
    });
});
