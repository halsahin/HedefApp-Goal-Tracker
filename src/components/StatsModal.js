import React, { useMemo } from 'react';
import {
    Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Spacing, Radii, Typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { CATEGORIES, getCategoryLabel, CATEGORY_ICON_MAP } from '../constants/categories';
import { calcRemainingDays } from '../utils/dateUtils';
import { trackingStats } from '../utils/tracking';

export default function StatsModal({ visible, onClose, goals }) {
    const { colors } = useTheme();
    const { t } = useLanguage();

    const stats = useMemo(() => {
        const total = goals.length;
        const completed = goals.filter(g => g.completed).length;
        const active = goals.filter(g => !g.completed).length;
        const overdue = goals.filter(g => !g.completed && calcRemainingDays(g.deadline) < 0).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        const byCategory = CATEGORIES.map(cat => ({
            key: cat.key,
            icon: CATEGORY_ICON_MAP[cat.key],
            label: getCategoryLabel(cat.key, t),
            count: goals.filter(g => g.category === cat.key).length,
        })).filter(c => c.count > 0);

        // Günlük takip hedefleri: toplam yapılan gün, en uzun seri ve tutturma oranı
        const tracked = goals.filter(g => g.tracking);
        let trackDone = 0, trackMissed = 0, trackLongest = 0;
        for (const g of tracked) {
            const s = trackingStats(g);
            trackDone += s.done;
            trackMissed += s.missed;
            if (s.longest > trackLongest) trackLongest = s.longest;
        }
        const tracking = {
            count: tracked.length,
            done: trackDone,
            longest: trackLongest,
            rate: trackDone + trackMissed > 0 ? Math.round(trackDone / (trackDone + trackMissed) * 100) : 0,
        };

        return { total, completed, active, overdue, rate, byCategory, tracking };
    }, [goals, t]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.root, { backgroundColor: colors.bg }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.text }]}>{t('stats.title')}</Text>
                    <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                        <Text style={[styles.closeBtn, { color: colors.textMuted }]}>{t('stats.close')}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={[styles.grid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <StatBox label={t('stats.total')} value={stats.total} icon={<Feather name="target" size={24} color={colors.text} />} colors={colors} />
                        <StatBox label={t('stats.active')} value={stats.active} icon={<Feather name="zap" size={24} color={colors.accentDark} />} colors={colors} accent />
                        <StatBox label={t('stats.completed')} value={stats.completed} icon={<Feather name="check-circle" size={24} color={colors.success} />} colors={colors} success />
                        <StatBox label={t('stats.overdue')} value={stats.overdue} icon={<Feather name="clock" size={24} color={colors.danger} />} colors={colors} danger />
                    </View>

                    <View style={[styles.rateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.rateLabel, { color: colors.textMuted }]}>{t('stats.rate')}</Text>
                        <Text style={[styles.rateValue, { color: colors.accent }]}>{stats.rate}%</Text>
                        <View style={[styles.rateBarBg, { backgroundColor: colors.border }]}>
                            <View
                                style={[styles.rateBarFill, {
                                    width: `${stats.rate}%`,
                                    backgroundColor: colors.accent,
                                }]}
                            />
                        </View>
                    </View>

                    {stats.tracking.count > 0 && (
                        <View style={[styles.catCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                                {t('tracking.title')}
                            </Text>
                            <View style={styles.trackRow}>
                                <TrackStat value={stats.tracking.count} label={t('stats.trackingGoals')} colors={colors} />
                                <TrackStat value={stats.tracking.done} label={t('tracking.doneLabel')} colors={colors} color={colors.success} />
                                <TrackStat value={stats.tracking.longest} label={t('stats.trackingLongest')} colors={colors} color={colors.accentDark} />
                                <TrackStat value={`${stats.tracking.rate}%`} label={t('stats.trackingRate')} colors={colors} />
                            </View>
                        </View>
                    )}

                    {stats.byCategory.length > 0 && (
                        <View style={[styles.catCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                                {t('stats.byCategory')}
                            </Text>
                            {stats.byCategory.map(cat => (
                                <View key={cat.key} style={styles.catRow}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 8 }}>
                                        <Feather name={cat.icon} size={14} color={colors.textMuted} />
                                        <Text style={[styles.catLabel, { color: colors.text, marginLeft: 6, flex: 0 }]} numberOfLines={1}>
                                            {cat.label}
                                        </Text>
                                    </View>
                                    <View style={styles.catRight}>
                                        <View style={[styles.catBar, { backgroundColor: colors.border }]}>
                                            <View style={[styles.catBarFill, {
                                                width: `${stats.total > 0 ? Math.round(cat.count / stats.total * 100) : 0}%`,
                                                backgroundColor: colors.accentDark,
                                            }]} />
                                        </View>
                                        <Text style={[styles.catCount, { color: colors.textMuted }]}>{cat.count}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}

function TrackStat({ value, label, colors, color }) {
    return (
        <View style={styles.trackStat}>
            <Text style={[styles.trackValue, { color: color || colors.text }]}>{value}</Text>
            <Text style={[styles.trackLabel, { color: colors.textMuted }]}>{label}</Text>
        </View>
    );
}

function StatBox({ label, value, icon, colors, accent, success, danger }) {
    const valueColor = accent ? colors.accentDark : success ? colors.success : danger ? colors.danger : colors.text;
    return (
        <View style={[styles.statBox, { borderColor: colors.border }]}>
            <View style={styles.statIconWrapper}>
                {icon}
            </View>
            <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    trackRow: { flexDirection: 'row' },
    trackStat: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
    trackValue: { fontSize: 22, fontWeight: '700' },
    trackLabel: { fontSize: Typography.xs, marginTop: 2, textAlign: 'center' },
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + Spacing.md : 44 + Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
    },
    title: { fontSize: Typography.md, fontWeight: '700' },
    closeBtn: { fontSize: Typography.sm, fontWeight: '600' },
    content: { padding: Spacing.lg, gap: Spacing.md },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderRadius: Radii.md,
        borderWidth: 1,
        overflow: 'hidden',
    },
    statBox: {
        width: '50%',
        alignItems: 'center',
        padding: Spacing.lg,
        borderRightWidth: 1,
        borderBottomWidth: 1,
    },
    statIcon: { fontSize: 22, marginBottom: 4 },
    statValue: { fontSize: Typography.xl, fontWeight: '700' },
    statLabel: { fontSize: Typography.xs, marginTop: 2, textAlign: 'center' },
    rateCard: {
        borderRadius: Radii.md,
        borderWidth: 1,
        padding: Spacing.lg,
        alignItems: 'center',
    },
    rateLabel: { fontSize: Typography.sm, marginBottom: 4 },
    rateValue: { fontSize: 40, fontWeight: '700' },
    rateBarBg: {
        width: '100%',
        height: 8,
        borderRadius: Radii.full,
        marginTop: Spacing.md,
        overflow: 'hidden',
    },
    rateBarFill: { height: '100%', borderRadius: Radii.full },
    catCard: {
        borderRadius: Radii.md,
        borderWidth: 1,
        padding: Spacing.lg,
    },
    sectionTitle: {
        fontSize: Typography.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.md,
    },
    catRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    catLabel: { flex: 1, fontSize: Typography.sm },
    catRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    catBar: {
        width: 80,
        height: 6,
        borderRadius: Radii.full,
        overflow: 'hidden',
    },
    catBarFill: { height: '100%', borderRadius: Radii.full },
    catCount: { fontSize: Typography.sm, fontWeight: '600', minWidth: 20, textAlign: 'right' },
});
