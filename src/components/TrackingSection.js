import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography, Spacing, Radii } from '../constants/theme';
import { formatDate, toDateStr } from '../utils/dateUtils';
import { trackingDays, trackingStats, parseDayValue } from '../utils/tracking';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const NOTE_MAX = 300;

/**
 * TrackingSection — günlük takip hedefinin gün ızgarası ve seçili günün işaret/not paneli.
 * Bir güne dokununca o gün seçilir; panelden "Yapıldı" işaretlenir ve o güne özel not yazılır.
 */
export default function TrackingSection({ goal, onToggleDay, onSetDayDetails }) {
    const { t, locale } = useLanguage();
    const { colors, isDark } = useTheme();

    const today = toDateStr(new Date());
    const days = useMemo(() => trackingDays(goal), [goal.startDate, goal.deadline]);
    const stats = trackingStats(goal, today);
    const log = goal.dayLog || {};

    // Varsayılan seçim: aralıktaysa bugün; başlamadıysa ilk gün, bittiyse son gün
    const defaultDay = days.includes(today) ? today : (today < days[0] ? days[0] : days[days.length - 1]);
    const [selected, setSelected] = useState(defaultDay);
    const selectedDay = days.includes(selected) ? selected : defaultDay;

    const entry = log[selectedDay] || { done: false, note: '' };
    const [noteDraft, setNoteDraft] = useState(entry.note || '');
    useEffect(() => { setNoteDraft(entry.note || ''); }, [goal.id, selectedDay, entry.note]);

    // Günlük miktar yalnızca hedefe birim tanımlandıysa sorulur (ör. "sayfa")
    const unit = goal.trackingUnit || '';
    const storedValue = Number.isFinite(entry.value) ? String(entry.value) : '';
    const [valueDraft, setValueDraft] = useState(storedValue);
    useEffect(() => { setValueDraft(storedValue); }, [goal.id, selectedDay, storedValue]);

    const isFuture = selectedDay > today;
    const noteChanged = noteDraft.trim() !== (entry.note || '');
    const valueChanged = !!unit && (parseDayValue(valueDraft) ?? null) !== (Number.isFinite(entry.value) ? entry.value : null);
    const changed = noteChanged || valueChanged;
    const accentText = isDark ? colors.accent : colors.accentDark;

    function saveNote() {
        if (!changed) return;
        const details = { note: noteDraft };
        if (unit) details.value = parseDayValue(valueDraft);
        onSetDayDetails(goal.id, selectedDay, details);
    }

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{t('tracking.title')}</Text>

            {/* Özet */}
            <View style={styles.summaryRow}>
                <Summary value={`${stats.done}/${stats.total}`} label={t('tracking.doneLabel')} color={colors.success} colors={colors} />
                <Summary value={stats.streak} label={t('tracking.streakLabel')} color={accentText} colors={colors} />
                <Summary value={stats.missed} label={t('tracking.missedLabel')} color={stats.missed > 0 ? colors.danger : colors.textMuted} colors={colors} />
            </View>
            <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                <View style={[styles.barFill, { width: `${stats.total > 0 ? Math.round(stats.done / stats.total * 100) : 0}%`, backgroundColor: colors.success }]} />
            </View>

            {!!unit && stats.valueDays > 0 && (
                <Text style={[styles.valueSummary, { color: colors.textMuted }]}>
                    {t('tracking.valueSummary', { total: stats.valueTotal, unit, avg: stats.valueAvg })}
                </Text>
            )}

            {/* Gün ızgarası */}
            <View style={styles.grid}>
                {days.map((d, i) => {
                    const done = !!log[d]?.done;
                    const hasNote = !!log[d]?.note;
                    const future = d > today;
                    const missed = !done && d < today;
                    const isSelected = d === selectedDay;
                    return (
                        <View key={d} style={styles.cellWrap}>
                            <TouchableOpacity
                                style={[
                                    styles.cell,
                                    { borderColor: colors.border, backgroundColor: colors.bg },
                                    missed && { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
                                    done && { backgroundColor: colors.success, borderColor: colors.success },
                                    d === today && !done && { borderColor: colors.accentDark, borderWidth: 2 },
                                    isSelected && { borderColor: colors.text, borderWidth: 2 },
                                    future && { opacity: 0.45 },
                                ]}
                                onPress={() => { saveNote(); setSelected(d); }}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                accessibilityLabel={`${t('tracking.dayN', { n: i + 1 })}, ${formatDate(d, locale)}${done ? `, ${t('tracking.done')}` : ''}`}
                            >
                                {done
                                    ? <Feather name="check" size={14} color="#FFFFFF" />
                                    : <Text style={[styles.cellText, { color: missed ? colors.danger : colors.textMuted }]}>{i + 1}</Text>}
                                {hasNote && <View style={[styles.noteDot, { backgroundColor: done ? '#FFFFFF' : colors.accentDark }]} />}
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>

            {/* Seçili gün */}
            <View style={[styles.panel, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <View style={styles.panelHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.panelTitle, { color: colors.text }]}>
                            {t('tracking.dayN', { n: days.indexOf(selectedDay) + 1 })}
                            {selectedDay === today ? ` · ${t('tracking.today')}` : ''}
                        </Text>
                        <Text style={[styles.panelDate, { color: colors.textMuted }]}>{formatDate(selectedDay, locale)}</Text>
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.doneBtn,
                            { borderColor: colors.border, backgroundColor: colors.surface },
                            entry.done && { backgroundColor: colors.success, borderColor: colors.success },
                            isFuture && { opacity: 0.4 },
                        ]}
                        onPress={() => onToggleDay(goal.id, selectedDay)}
                        disabled={isFuture}
                        activeOpacity={0.75}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: !!entry.done, disabled: isFuture }}
                    >
                        <Feather name={entry.done ? 'check-circle' : 'circle'} size={16} color={entry.done ? '#FFFFFF' : colors.textMuted} />
                        <Text style={[styles.doneBtnText, { color: entry.done ? '#FFFFFF' : colors.textMuted }]}>
                            {entry.done ? t('tracking.done') : t('tracking.markDone')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {isFuture ? (
                    <Text style={[styles.futureHint, { color: colors.textLight }]}>{t('tracking.future')}</Text>
                ) : (
                    <>
                    {!!unit && (
                        <View style={styles.valueRow}>
                            <TextInput
                                style={[styles.valueInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
                                value={valueDraft}
                                onChangeText={setValueDraft}
                                onBlur={saveNote}
                                placeholder="0"
                                placeholderTextColor={colors.textLight}
                                keyboardType="decimal-pad"
                                maxLength={10}
                                accessibilityLabel={unit}
                            />
                            <Text style={[styles.valueUnit, { color: colors.textMuted }]}>{unit}</Text>
                        </View>
                    )}
                    <View style={styles.noteRow}>
                        <TextInput
                            style={[styles.noteInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
                            value={noteDraft}
                            onChangeText={setNoteDraft}
                            onBlur={saveNote}
                            placeholder={t('tracking.notePlaceholder')}
                            placeholderTextColor={colors.textLight}
                            maxLength={NOTE_MAX}
                            multiline
                        />
                        {changed && (
                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: colors.accentBg, borderColor: colors.accentDark }]}
                                onPress={() => { saveNote(); Keyboard.dismiss(); }}
                                activeOpacity={0.75}
                                accessibilityRole="button"
                                accessibilityLabel={t('detail.save')}
                            >
                                <Feather name="check" size={18} color={accentText} />
                            </TouchableOpacity>
                        )}
                    </View>
                    </>
                )}
            </View>
        </View>
    );
}

function Summary({ value, label, color, colors }) {
    return (
        <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color }]}>{value}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { borderRadius: Radii.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md },
    title: { fontSize: Typography.base, fontWeight: '700', marginBottom: Spacing.md },

    summaryRow: { flexDirection: 'row', marginBottom: Spacing.sm },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryValue: { fontSize: Typography.lg ?? 18, fontWeight: '800' },
    summaryLabel: { fontSize: Typography.xs, marginTop: 2 },
    barBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.md },
    barFill: { height: '100%', borderRadius: 3 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
    cellWrap: { width: `${100 / 7}%`, padding: 3 },
    cell: {
        aspectRatio: 1,
        borderRadius: Radii.sm,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cellText: { fontSize: Typography.sm, fontWeight: '600' },
    noteDot: { position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: 3 },

    panel: { marginTop: Spacing.md, borderWidth: 1, borderRadius: Radii.sm, padding: Spacing.md },
    panelHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    panelTitle: { fontSize: Typography.base, fontWeight: '700' },
    panelDate: { fontSize: Typography.xs, marginTop: 2 },
    doneBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: Radii.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    doneBtnText: { fontSize: Typography.sm, fontWeight: '700' },
    futureHint: { fontSize: Typography.sm, marginTop: Spacing.sm },
    valueSummary: { fontSize: Typography.xs, marginBottom: Spacing.md, textAlign: 'center' },
    valueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
    valueInput: {
        width: 96,
        borderWidth: 1,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        fontSize: Typography.base,
        fontWeight: '700',
    },
    valueUnit: { fontSize: Typography.sm, fontWeight: '500' },
    noteRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginTop: Spacing.sm },
    noteInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        fontSize: Typography.sm,
        minHeight: 40,
        maxHeight: 110,
        textAlignVertical: 'top',
    },
    saveBtn: { borderWidth: 1, borderRadius: Radii.sm, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
