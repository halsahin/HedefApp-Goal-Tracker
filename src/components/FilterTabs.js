import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { useLanguage } from '../i18n/LanguageContext';

const FILTER_KEYS = [
    { key: 'all', tKey: 'filter.all' },
    { key: 'active', tKey: 'filter.active' },
    { key: 'completed', tKey: 'filter.completed' },
    { key: 'pinned', tKey: 'filter.pinned' },
];

export default function FilterTabs({ filterBy, onFilterChange }) {
    const { t } = useLanguage();

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
        >
            <View style={styles.tabGroup}>
                {FILTER_KEYS.map(f => {
                    const active = filterBy === f.key;
                    return (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.tab, active && styles.tabActive]}
                            onPress={() => onFilterChange(f.key)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.tabText, active && styles.tabTextActive]}>
                                {t(f.tKey)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.sm,
        alignItems: 'flex-start',
    },
    tabGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Spacing.xs,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radii.md,
        padding: 4,
    },
    tab: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: Radii.sm,
    },
    tabActive: {
        backgroundColor: Colors.accent,
    },
    tabText: {
        fontSize: Typography.sm,
        fontWeight: '500',
        color: Colors.textMuted,
        lineHeight: 18,
    },
    tabTextActive: {
        fontWeight: '700',
        color: '#5A4800',
    },
});
