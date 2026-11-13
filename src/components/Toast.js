import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Typography, Spacing, Radii } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const DURATION = 2800;
const DURATION_WITH_ACTION = 5000;

/**
 * Toast — animated notification that slides up from bottom and auto-hides.
 *
 * Usage: pass `toast` ({ id, message, actionLabel?, onAction? } | null). A new `id`
 * re-shows the toast even when the message text is the same; parent clears it with onHide.
 * With `actionLabel` the toast stays longer and shows a tappable action (e.g. "Undo").
 */
export default function Toast({ toast, onHide }) {
    const { colors, isDark } = useTheme();
    const translateY = useRef(new Animated.Value(80)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const timerRef = useRef(null);
    const animRef = useRef(null);

    const toastId = toast?.id ?? null;
    const hasAction = !!(toast?.actionLabel && toast?.onAction);

    useEffect(() => {
        if (!toastId) return;

        // Önceki animasyonu durdur
        animRef.current?.stop();

        // Show
        const showAnim = Animated.parallel([
            Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]);
        animRef.current = showAnim;
        showAnim.start();

        // Auto-hide
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const hideAnim = Animated.parallel([
                Animated.timing(translateY, { toValue: 80, duration: 280, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]);
            animRef.current = hideAnim;
            hideAnim.start(({ finished }) => { if (finished) onHide?.(); });
        }, hasAction ? DURATION_WITH_ACTION : DURATION);

        return () => {
            clearTimeout(timerRef.current);
            animRef.current?.stop();
        };
    }, [toastId]);

    if (!toast?.message) return null;

    const textColor = isDark ? '#0F0F1A' : '#FFFFFF';

    return (
        <Animated.View
            style={[
                styles.toast,
                {
                    backgroundColor: colors.text,
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
            pointerEvents={hasAction ? 'box-none' : 'none'}
        >
            <Text style={[styles.text, { color: textColor }]}>{toast.message}</Text>
            {hasAction && (
                <TouchableOpacity
                    onPress={toast.onAction}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel={toast.actionLabel}
                >
                    <Text style={[styles.action, { color: colors.accent }]}>{toast.actionLabel}</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        bottom: 90,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm + 2,
        borderRadius: Radii.full,
        maxWidth: '85%',
    },
    text: {
        flexShrink: 1,
        fontSize: Typography.sm,
        fontWeight: '500',
        textAlign: 'center',
    },
    action: {
        fontSize: Typography.sm,
        fontWeight: '800',
    },
});
