import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import SelectionBar from '../src/components/SelectionBar';
import { renderWithProviders } from './testUtils';

function setup(props = {}) {
    const handlers = {
        onCancel: jest.fn(), onSelectAll: jest.fn(), onComplete: jest.fn(),
        onPin: jest.fn(), onMove: jest.fn(), onDelete: jest.fn(),
    };
    const utils = renderWithProviders(<SelectionBar count={3} allSelected={false} {...handlers} {...props} />);
    return { ...utils, handlers };
}

describe('SelectionBar', () => {
    it('seçili sayısını ve eylemleri gösterir', () => {
        const { getByText } = setup();
        expect(getByText('3 seçildi')).toBeTruthy();
        expect(getByText('Tümünü seç')).toBeTruthy();
        for (const label of ['Tamamla', 'Favori', 'Taşı', 'Sil']) expect(getByText(label)).toBeTruthy();
    });

    it('eylemlere basınca ilgili fonksiyonu çağırır', () => {
        const { getByText, getByLabelText, handlers } = setup();
        fireEvent.press(getByText('Tamamla'));
        fireEvent.press(getByText('Favori'));
        fireEvent.press(getByText('Taşı'));
        fireEvent.press(getByText('Sil'));
        fireEvent.press(getByText('Tümünü seç'));
        fireEvent.press(getByLabelText('İptal'));
        expect(handlers.onComplete).toHaveBeenCalledTimes(1);
        expect(handlers.onPin).toHaveBeenCalledTimes(1);
        expect(handlers.onMove).toHaveBeenCalledTimes(1);
        expect(handlers.onDelete).toHaveBeenCalledTimes(1);
        expect(handlers.onSelectAll).toHaveBeenCalledTimes(1);
        expect(handlers.onCancel).toHaveBeenCalledTimes(1);
    });

    it('hiçbir şey seçili değilken eylemler çalışmaz', () => {
        const { getByText, handlers } = setup({ count: 0 });
        fireEvent.press(getByText('Sil'));
        fireEvent.press(getByText('Tamamla'));
        expect(handlers.onDelete).not.toHaveBeenCalled();
        expect(handlers.onComplete).not.toHaveBeenCalled();
    });

    it('hepsi seçiliyken "Seçimi kaldır" gösterir', () => {
        const { getByText } = setup({ allSelected: true });
        expect(getByText('Seçimi kaldır')).toBeTruthy();
    });
});
