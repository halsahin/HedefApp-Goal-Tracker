import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Typography, Spacing, Radii } from '../constants/theme';
import { useLanguage, LANGUAGES } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

export default function AppHeader({ totalCount, dueCount, onStatsPress, onCalendarPress }) {
    const { t, language, setLanguage } = useLanguage();
    const { colors, themeMode, setThemeMode, isDark } = useTheme();
    const [langPickerVisible, setLangPickerVisible] = useState(false);

    const currentLang = LANGUAGES.find(l => l.code === language);

    const themeIcon =
        themeMode === 'system' ? '⚙️' :
        isDark ? '🌙' : '☀️';

    const cycleTheme = () => {
        const next =
            themeMode === 'system' ? 'light' :
            themeMode === 'light'  ? 'dark'  : 'system';
        setThemeMode(next);
    };

    return (
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.logo}>
                <Text style={[styles.logoIcon, { color: colors.accentDark }]}>✦</Text>
                <Text style={[styles.logoText, { color: colors.text }]}>{t('header.title')}</Text>
            </View>

            <View style={styles.right}>
                <View style={styles.badges}>
                    <View style={[styles.badge, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                        <Text style={[styles.badgeText, { color: colors.textMuted }]}>
                            {t('header.goals', { n: totalCount })}
                        </Text>
                    </View>
                    {dueCount > 0 && (
                        <View style={[styles.badge, styles.badgeAccent, { backgroundColor: colors.accentBg, borderColor: colors.accent }]}>
                            <Text style={[styles.badgeText, { color: '#8A7200' }]}>
                                {t('header.upcoming', { n: dueCount })}
                            </Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity style={styles.iconBtn} onPress={onStatsPress} activeOpacity={0.75}>
                    <Text style={styles.iconBtnText}>📊</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn} onPress={onCalendarPress} activeOpacity={0.75}>
                    <Text style={styles.iconBtnText}>📅</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn} onPress={cycleTheme} activeOpacity={0.75}>
                    <Text style={styles.iconBtnText}>{themeIcon}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.langBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                    onPress={() => setLangPickerVisible(true)}
                    activeOpacity={0.75}
                >
                    <Text style={[styles.langBtnText, { color: colors.textMuted }]}>
                        {currentLang?.flag} {currentLang?.code.toUpperCase()}
                    </Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={langPickerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setLangPickerVisible(false)}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setLangPickerVisible(false)}
                />
                <View style={[styles.picker, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                }]}>
                    {LANGUAGES.map(lang => (
                        <TouchableOpacity
                            key={lang.code}
                            style={[styles.langOption,
                                language === lang.code && { backgroundColor: colors.accentBg }
                            ]}
                            onPress={() => { setLanguage(lang.code); setLangPickerVisible(false); }}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.langOptionFlag}>{lang.flag}</Text>
                            <Text style={[styles.langOptionLabel, { color: colors.text },
                                language === lang.code && { fontWeight: '700', color: '#5A4800' }
                            ]}>
                                {lang.label}
                            </Text>
                            {language === lang.code && (
                                <Text style={[styles.checkmark, { color: colors.accentDark }]}>✓</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    logo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    logoIcon: { fontSize: 16 },
    logoText: {
        fontSize: Typography.md,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    badges: {
        flexDirection: 'row',
        gap: Spacing.xs,
        alignItems: 'center',
    },
    badge: {
        borderWidth: 1,
        borderRadius: Radii.full,
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: 3,
    },
    badgeAccent: {},
    badgeText: {
        fontSize: Typography.xs,
        fontWeight: '600',
    },
    iconBtn: {
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBtnText: { fontSize: 16 },
    langBtn: {
        borderWidth: 1,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        marginLeft: 2,
    },
    langBtnText: {
        fontSize: Typography.xs,
        fontWeight: '700',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    picker: {
        position: 'absolute',
        top: 72,
        right: Spacing.lg,
        borderRadius: Radii.md,
        borderWidth: 1,
        minWidth: 160,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 10,
        overflow: 'hidden',
    },
    langOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
        gap: Spacing.sm,
    },
    langOptionFlag: { fontSize: 18 },
    langOptionLabel: {
        flex: 1,
        fontSize: Typography.sm,
        fontWeight: '500',
    },
    checkmark: {
        fontSize: Typography.sm,
        fontWeight: '700',
    },
});
