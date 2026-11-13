import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography, Spacing, Radii } from '../constants/theme';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

/**
 * SelectionBar — toplu seçim modunda ControlsBar'ın yerini alır.
 * Seçili hedef sayısını ve toplu eylemleri (tamamla, favori, taşı, sil) gösterir.
 */
export default function SelectionBar({
    count, allSelected, onCancel, onSelectAll, onComplete, onPin, onMove, onDelete,
}) {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const disabled = count === 0;

    const Action = ({ icon, label, color, onPress }) => (
        <TouchableOpacity
            style={[styles.action, disabled && styles.disabled]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            <Feather name={icon} size={18} color={color} />
            <Text style={[styles.actionText, { color }]} numberOfLines={1}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.topRow}>
                <TouchableOpacity
                    onPress={onCancel}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('delete.cancel')}
                >
                    <Feather name="x" size={22} color={colors.textMuted} />
                </TouchableOpacity>
                <Text style={[styles.count, { color: colors.text }]}>{t('bulk.selected', { n: count })}</Text>
                <TouchableOpacity onPress={onSelectAll} activeOpacity={0.7}>
                    <Text style={[styles.selectAll, { color: colors.accentDark }]}>
                        {allSelected ? t('bulk.selectNone') : t('bulk.selectAll')}
                    </Text>
                </TouchableOpacity>
            </View>
            <View style={[styles.actions, { borderTopColor: colors.border }]}>
                <Action icon="check-circle" label={t('bulk.complete')} color={colors.success} onPress={onComplete} />
                <Action icon="star" label={t('bulk.pin')} color={colors.accentDark} onPress={onPin} />
                <Action icon="folder" label={t('bulk.move')} color={colors.textMuted} onPress={onMove} />
                <Action icon="trash-2" label={t('bulk.delete')} color={colors.danger} onPress={onDelete} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        marginHorizontal: Spacing.lg,
        marginVertical: Spacing.sm,
        borderWidth: 1,
        borderRadius: Radii.md,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
    },
    count: { flex: 1, fontSize: Typography.base, fontWeight: '700' },
    selectAll: { fontSize: Typography.sm, fontWeight: '700' },
    actions: {
        flexDirection: 'row',
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    action: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 2,
        paddingVertical: Spacing.sm + 2,
    },
    actionText: { flexShrink: 1, fontSize: Typography.xs, fontWeight: '600' },
    disabled: { opacity: 0.4 },
});
