import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Typography, Spacing, Radii, Shadows } from '../constants/theme';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const FEATURES = ['f1', 'f2', 'f3', 'f4'];

export default function EmptyState({ onAddPress }) {
    const { t } = useLanguage();
    const { colors, isDark } = useTheme();

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            bounces={false}
        >
            {/* Hero */}
            <View style={styles.hero}>
                <Text style={styles.heroIcon}>🎯</Text>
                <Text style={[styles.title, { color: colors.text }]}>{t('empty.title')}</Text>
                <Text style={[styles.desc, { color: colors.textMuted }]}>{t('empty.desc')}</Text>
            </View>

            {/* Feature cards */}
            <View style={styles.features}>
                {FEATURES.map(key => (
                    <View
                        key={key}
                        style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <Text style={styles.featureIcon}>{t(`empty.${key}.icon`)}</Text>
                        <View style={styles.featureText}>
                            <Text style={[styles.featureTitle, { color: colors.text }]}>
                                {t(`empty.${key}.title`)}
                            </Text>
                            <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
                                {t(`empty.${key}.desc`)}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* CTA */}
            <TouchableOpacity style={styles.btn} onPress={onAddPress} activeOpacity={0.8}>
                <Text style={styles.btnText}>{t('empty.btn')}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xxl,
    },
    hero: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    heroIcon: {
        fontSize: 64,
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: Typography.lg,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: Spacing.xs,
        letterSpacing: -0.3,
    },
    desc: {
        fontSize: Typography.base - 1,
        textAlign: 'center',
        lineHeight: 22,
    },
    features: {
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: Radii.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
        ...Shadows.sm,
    },
    featureIcon: {
        fontSize: 28,
        width: 36,
        textAlign: 'center',
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: Typography.base - 1,
        fontWeight: '700',
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: Typography.sm,
        lineHeight: 18,
    },
    btn: {
        backgroundColor: '#F9E55A',
        borderRadius: Radii.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        shadowColor: '#F9E55A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 3,
    },
    btnText: {
        fontSize: Typography.base,
        fontWeight: '700',
        color: '#5A4800',
    },
});
