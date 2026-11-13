import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { toDateStr } from '../src/utils/dateUtils';

/** Bileşeni tema ve dil (varsayılan: Türkçe) sağlayıcılarıyla render eder. */
export function renderWithProviders(ui) {
    return render(
        <ThemeProvider>
            <LanguageProvider>{ui}</LanguageProvider>
        </ThemeProvider>
    );
}

/** Bugünden `n` gün sonrasının (negatifse öncesinin) YYYY-MM-DD karşılığı. */
export function dayOffset(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return toDateStr(d);
}

export function makeGoal(over = {}) {
    return {
        id: 'g1', name: 'Kitap oku', category: 'education', deadline: dayOffset(10), startDate: null,
        description: '', completed: false, pinned: false, createdAt: new Date().toISOString(), progress: 0,
        recurring: null, subtasks: [], updates: [], reminderDays: [3, 1], folderId: 'default',
        tracking: false, trackingUnit: '', dailyReminder: true, dayLog: {}, streak: 0,
        ...over,
    };
}
