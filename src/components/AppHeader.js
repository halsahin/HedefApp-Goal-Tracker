import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { useLanguage, LANGUAGES } from '../i18n/LanguageContext';

export default function AppHeader({ totalCount, dueCount }) {
    const { t, language, setLanguage } = useLanguage();
    const [langPickerVisible, setLangPickerVisible] = useState(false);

    const currentLang = LANGUAGES.find(l => l.code === language);

    return (
        <View style={styles.header}>
            <View style={styles.logo}>
                <Text style={styles.logoIcon}>✦</Text>
                <Text style={styles.logoText}>{t('header.title')}</Text>
            </View>

            <View style={styles.right}>
                <View style={styles.badges}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{t('header.goals', { n: totalCount })}</Text>
                    </View>
                    {dueCount > 0 && (
                        <View style={[styles.badge, styles.badgeAccent]}>
                            <Text style={[styles.badgeText, styles.badgeTextAccent]}>
                                {t('header.upcoming', { n: dueCount })}
                            </Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.langBtn}
                    onPress={() => setLangPickerVisible(true)}
                    activeOpacity={0.75}
                >
                    <Text style={styles.langBtnText}>{currentLang?.flag} {currentLang?.code.toUpperCase()}</Text>
                </TouchableOpacity>
            </View>

            {/* Dil seçici modal */}
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
                <View style={styles.picker}>
                    {LANGUAGES.map(lang => (
                        <TouchableOpacity
                            key={lang.code}
                            style={[styles.langOption, language === lang.code && styles.langOptionActive]}
                            onPress={() => { setLanguage(lang.code); setLangPickerVisible(false); }}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.langOptionFlag}>{lang.flag}</Text>
                            <Text style={[styles.langOptionLabel, language === lang.code && styles.langOptionLabelActive]}>
                                {lang.label}
                            </Text>
                            {language === lang.code && <Text style={styles.checkmark}>✓</Text>}
                        </TouchableOpacity>
                    ))}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
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
    logoIcon: {
        fontSize: 16,
        color: Colors.accentDark,
    },
    logoText: {
        fontSize: Typography.md,
        fontWeight: '700',
        color: Colors.text,
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
        backgroundColor: Colors.surface2,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radii.full,
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: 3,
    },
    badgeAccent: {
        backgroundColor: Colors.accentBg,
        borderColor: Colors.accent,
    },
    badgeText: {
        fontSize: Typography.xs,
        fontWeight: '600',
        color: Colors.textMuted,
    },
    badgeTextAccent: {
        color: '#8A7200',
    },
    langBtn: {
        backgroundColor: Colors.bg,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        marginLeft: 4,
    },
    langBtnText: {
        fontSize: Typography.xs,
        fontWeight: '700',
        color: Colors.textMuted,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    picker: {
        position: 'absolute',
        top: 72,
        right: Spacing.lg,
        backgroundColor: Colors.surface,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.border,
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
    langOptionActive: {
        backgroundColor: Colors.accentBg,
    },
    langOptionFlag: {
        fontSize: 18,
    },
    langOptionLabel: {
        flex: 1,
        fontSize: Typography.sm,
        fontWeight: '500',
        color: Colors.text,
    },
    langOptionLabelActive: {
        fontWeight: '700',
        color: '#5A4800',
    },
    checkmark: {
        fontSize: Typography.sm,
        fontWeight: '700',
        color: Colors.accentDark,
    },
});
