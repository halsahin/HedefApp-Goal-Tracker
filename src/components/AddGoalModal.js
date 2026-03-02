import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/theme';
import { CATEGORIES } from '../constants/categories';
import { defaultDeadline, deadlineFromDays } from '../utils/dateUtils';
import { useLanguage } from '../i18n/LanguageContext';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_CLOSE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 0.5;

export default function AddGoalModal({ visible, onClose, onSubmit }) {
  const { t, locale } = useLanguage();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [deadlineMode, setDeadlineMode] = useState('date');
  const [selectedDate, setSelectedDate] = useState(new Date(defaultDeadline() + 'T12:00:00'));
  const [daysInput, setDaysInput] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const nameRef = useRef(null);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setName('');
      setCategory(CATEGORIES[0].label);
      setDeadlineMode('date');
      setSelectedDate(new Date(defaultDeadline() + 'T12:00:00'));
      setDaysInput('');
      setDescription('');
      setNameError(false);
      setShowDatePicker(false);
      translateY.setValue(SCREEN_HEIGHT);

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start(() => {
        setTimeout(() => nameRef.current?.focus(), 200);
      });
    }
  }, [visible]);

  function animatedClose() {
    Keyboard.dismiss();
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 260,
      useNativeDriver: true,
    }).start(() => onClose());
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onMoveShouldSetPanResponderCapture: (_, g) =>
        g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > SWIPE_CLOSE_THRESHOLD || g.vy > SWIPE_VELOCITY_THRESHOLD) {
          animatedClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    })
  ).current;

  function handleSubmit() {
    if (!name.trim()) {
      setNameError(true);
      nameRef.current?.focus();
      return;
    }

    let deadline;
    if (deadlineMode === 'date') {
      deadline = [
        selectedDate.getFullYear(),
        String(selectedDate.getMonth() + 1).padStart(2, '0'),
        String(selectedDate.getDate()).padStart(2, '0'),
      ].join('-');
    } else {
      const d = parseInt(daysInput, 10);
      if (isNaN(d) || d < 1) return;
      deadline = deadlineFromDays(d);
    }

    onSubmit({ name, category, deadline, description });
    animatedClose();
  }

  const formattedDate = selectedDate.toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={animatedClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={animatedClose}
      />

      <KeyboardAvoidingView
        style={styles.kavWrapper}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          <View
            style={styles.handleArea}
            {...panResponder.panHandlers}
            hitSlop={{ top: 10, bottom: 10, left: 40, right: 40 }}
          >
            <View style={styles.handle} />
          </View>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('addModal.title')}</Text>
            <TouchableOpacity
              onPress={animatedClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Hedef Adı */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {t('addModal.goalName')} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                ref={nameRef}
                style={[styles.input, nameError && styles.inputError]}
                placeholder={t('addModal.placeholder.name')}
                placeholderTextColor={Colors.textLight}
                value={name}
                onChangeText={txt => { setName(txt); setNameError(false); }}
                maxLength={100}
                returnKeyType="next"
              />
              {nameError && (
                <Text style={styles.errorText}>{t('addModal.error.name')}</Text>
              )}
              <Text style={styles.charCounter}>{name.length}/100</Text>
            </View>

            {/* Kategori */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('addModal.category')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesRow}
                keyboardShouldPersistTaps="handled"
              >
                {CATEGORIES.map(cat => {
                  const active = category === cat.label;
                  return (
                    <TouchableOpacity
                      key={cat.label}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                      onPress={() => setCategory(cat.label)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                        {cat.icon} {t(`cat.${cat.key}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Bitiş Tarihi Toggle */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('addModal.deadline')}</Text>
              <View style={styles.toggle}>
                {['date', 'days'].map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.toggleBtn, deadlineMode === mode && styles.toggleBtnActive]}
                    onPress={() => { setDeadlineMode(mode); setShowDatePicker(false); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.toggleBtnText, deadlineMode === mode && styles.toggleBtnTextActive]}>
                      {mode === 'date' ? t('addModal.pickDate') : t('addModal.countDays')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {deadlineMode === 'date' && (
              <View style={styles.formGroup}>
                <TouchableOpacity
                  style={styles.dateTrigger}
                  onPress={() => setShowDatePicker(v => !v)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dateTriggerText}>📅 {formattedDate}</Text>
                  <Text style={styles.dateTriggerArrow}>{showDatePicker ? '▴' : '▾'}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    minimumDate={new Date()}
                    onChange={(_, date) => {
                      if (Platform.OS === 'android') setShowDatePicker(false);
                      if (date) setSelectedDate(date);
                    }}
                    style={styles.datePicker}
                  />
                )}
              </View>
            )}

            {deadlineMode === 'days' && (
              <View style={styles.formGroup}>
                <View style={styles.daysRow}>
                  <TextInput
                    style={[styles.input, styles.daysInput]}
                    placeholder={t('addModal.placeholder.days')}
                    placeholderTextColor={Colors.textLight}
                    value={daysInput}
                    onChangeText={setDaysInput}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <Text style={styles.daysUnit}>{t('addModal.days')}</Text>
                </View>
              </View>
            )}

            {/* Notlar */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {t('addModal.notes')} <Text style={styles.optional}>{t('addModal.optional')}</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder={t('addModal.placeholder.notes')}
                placeholderTextColor={Colors.textLight}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={300}
                textAlignVertical="top"
              />
            </View>

            {/* Butonlar */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={animatedClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>{t('addModal.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.submitBtnText}>{t('addModal.submit')}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 28 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,30,0.45)',
  },
  kavWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    maxHeight: SCREEN_HEIGHT * 0.92,
    ...Shadows.lg,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: Radii.full,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.md,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  required: { color: Colors.danger },
  optional: {
    fontWeight: '400',
    color: Colors.textLight,
    textTransform: 'none',
    letterSpacing: 0,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: Typography.base,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    fontSize: Typography.xs,
    color: Colors.danger,
    marginTop: 4,
  },
  charCounter: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.xs,
    fontSize: Typography.xs,
    color: Colors.textLight,
  },
  categoriesRow: {
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: Colors.accentBg,
    borderColor: Colors.accentDark,
  },
  categoryChipText: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  categoryChipTextActive: {
    fontWeight: '700',
    color: '#5A4800',
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    padding: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  toggleBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.sm - 2,
  },
  toggleBtnActive: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  toggleBtnText: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  toggleBtnTextActive: {
    fontWeight: '700',
    color: Colors.text,
  },
  dateTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surface,
  },
  dateTriggerText: {
    fontSize: Typography.base,
    color: Colors.text,
  },
  dateTriggerArrow: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  datePicker: {
    marginTop: Spacing.xs,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  daysInput: {
    flex: 1,
  },
  daysUnit: {
    fontSize: Typography.base,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  textarea: {
    minHeight: 80,
    paddingTop: Spacing.sm,
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md - 2,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: Typography.base - 1,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: Spacing.md - 2,
    borderRadius: Radii.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: Typography.base - 1,
    fontWeight: '700',
    color: '#5A4800',
  },
});
