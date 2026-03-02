import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/theme';
import { CATEGORY_MAP, getCategoryLabel } from '../constants/categories';
import {
    calcRemainingDays,
    formatDate,
    getDayChipInfo,
} from '../utils/dateUtils';
import { useLanguage } from '../i18n/LanguageContext';

export default function GoalCard({ goal, onToggleComplete, onTogglePin, onDelete, onPress }) {
    const { t, locale } = useLanguage();
    const days = calcRemainingDays(goal.deadline);
    const overdue = !goal.completed && days < 0;
    const icon = CATEGORY_MAP[goal.category] || '📌';
    const chipInfo = getDayChipInfo(days, goal.completed);

    const dayDisplay = goal.completed ? '✓' : (days < 0 ? `${Math.abs(days)}` : `${days}`);
    const dayTextLabel = goal.completed
        ? t('goalCard.done')
        : (days < 0 ? t('goalCard.daysAgo') : t('goalCard.daysLeft'));

    const borderColor = goal.completed
        ? Colors.success
        : goal.pinned
            ? Colors.accentDark
            : overdue
                ? Colors.danger
                : Colors.border;

    const cardBg = goal.pinned ? Colors.pinned : Colors.surface;
    const cardBorderColor = goal.pinned ? Colors.pinnedBorder : Colors.border;

    const daysNumColor = goal.completed
        ? Colors.success
        : overdue
            ? Colors.danger
            : Colors.text;

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorderColor }]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <View style={[styles.strip, { backgroundColor: borderColor }]} />

            <TouchableOpacity
                style={[styles.checkbox, goal.completed && styles.checkboxDone]}
                onPress={() => onToggleComplete(goal.id)}
                activeOpacity={0.7}
            >
                {goal.completed && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <View style={styles.body}>
                <View style={styles.meta}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                            {icon} {getCategoryLabel(goal.category, t)}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.name, goal.completed && styles.nameCompleted]} numberOfLines={2}>
                    {goal.name}
                </Text>

                {!!goal.description && (
                    <Text style={styles.desc} numberOfLines={2}>{goal.description}</Text>
                )}

                <Text style={styles.dateInfo}>📅 {formatDate(goal.deadline, locale)}</Text>
            </View>

            <View style={styles.right}>
                <View style={styles.daysBlock}>
                    <Text style={[styles.daysNumber, { color: daysNumColor }]}>{dayDisplay}</Text>
                    <Text style={styles.daysLabel}>{dayTextLabel}</Text>
                    <ChipView chipInfo={chipInfo} t={t} />
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onTogglePin(goal.id)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.actionIcon, goal.pinned && styles.pinnedIcon]}>
                            {goal.pinned ? '⭐' : '☆'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onDelete(goal.id)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.actionIcon}>🗑</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const chipStyles = {
    done: { bg: Colors.successSoft, text: '#2E8B44' },
    good: { bg: Colors.successSoft, text: '#2E8B44' },
    warning: { bg: '#FFF9E6', text: '#C28000' },
    urgent: { bg: Colors.dangerSoft, text: Colors.danger },
};

function ChipView({ chipInfo, t }) {
    const style = chipStyles[chipInfo.type] || chipStyles.good;
    return (
        <View style={[styles.chip, { backgroundColor: style.bg }]}>
            <Text style={[styles.chipText, { color: style.text }]}>
                {t(chipInfo.key, chipInfo.params)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: Radii.md,
        borderWidth: 1,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm + 2,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: Spacing.md,
        paddingRight: Spacing.md,
        paddingLeft: Spacing.sm,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    strip: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderTopLeftRadius: Radii.md,
        borderBottomLeftRadius: Radii.md,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Colors.border,
        marginTop: 2,
        marginLeft: Spacing.sm,
        marginRight: Spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    checkboxDone: {
        backgroundColor: Colors.success,
        borderColor: Colors.success,
    },
    checkmark: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    body: {
        flex: 1,
        minWidth: 0,
        marginRight: Spacing.sm,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    categoryBadge: {
        backgroundColor: Colors.bg,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radii.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    categoryBadgeText: {
        fontSize: Typography.xs,
        fontWeight: '600',
        color: Colors.textMuted,
    },
    name: {
        fontSize: Typography.base,
        fontWeight: '600',
        color: Colors.text,
        lineHeight: 20,
        marginBottom: 3,
    },
    nameCompleted: {
        textDecorationLine: 'line-through',
        color: Colors.textMuted,
    },
    desc: {
        fontSize: Typography.sm - 1,
        color: Colors.textMuted,
        marginBottom: 4,
        lineHeight: 18,
    },
    dateInfo: {
        fontSize: Typography.xs,
        color: Colors.textLight,
        marginTop: 4,
    },
    right: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        flexShrink: 0,
        minWidth: 68,
    },
    daysBlock: {
        alignItems: 'center',
    },
    daysNumber: {
        fontSize: 22,
        fontWeight: '700',
        lineHeight: 26,
    },
    daysLabel: {
        fontSize: Typography.xs,
        fontWeight: '500',
        color: Colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    chip: {
        borderRadius: Radii.full,
        paddingHorizontal: 7,
        paddingVertical: 2,
        marginTop: 2,
    },
    chipText: {
        fontSize: 10,
        fontWeight: '700',
    },
    actions: {
        flexDirection: 'row',
        gap: 2,
        marginTop: Spacing.sm,
    },
    actionBtn: {
        width: 28,
        height: 28,
        borderRadius: Radii.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionIcon: {
        fontSize: 16,
    },
    pinnedIcon: {
        color: Colors.accentDark,
    },
});
