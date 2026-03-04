import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Spacing, Radii, Typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

export default function SearchBar({ value, onChangeText }) {
    const { colors } = useTheme();
    const { t } = useLanguage();

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.icon, { color: colors.textLight }]}>🔍</Text>
            <TextInput
                style={[styles.input, { color: colors.text }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={t('search.placeholder')}
                placeholderTextColor={colors.textLight}
                returnKeyType="search"
                autoCorrect={false}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.7}>
                    <Text style={[styles.clear, { color: colors.textMuted }]}>✕</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
        borderRadius: Radii.md,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    icon: {
        fontSize: 14,
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: Typography.sm,
        paddingVertical: 0,
    },
    clear: {
        fontSize: 14,
        paddingLeft: Spacing.sm,
        fontWeight: '600',
    },
});
