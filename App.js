import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, StatusBar as RNStatusBar, FlatList,
  StyleSheet, Platform,
} from 'react-native';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './src/i18n/LanguageContext';
import { useGoals } from './src/hooks/useGoals';
import AppHeader from './src/components/AppHeader';
import ControlsBar from './src/components/ControlsBar';
import FilterTabs from './src/components/FilterTabs';
import SearchBar from './src/components/SearchBar';
import GoalCard from './src/components/GoalCard';
import EmptyState from './src/components/EmptyState';
import AddGoalModal from './src/components/AddGoalModal';
import GoalDetailModal from './src/components/GoalDetailModal';
import StatsModal from './src/components/StatsModal';
import CalendarModal from './src/components/CalendarModal';
import Toast from './src/components/Toast';
import AdBannerComponent from './src/components/AdBannerComponent';
import {
  setupNotifications,
  scheduleGoalNotifications,
  cancelGoalNotifications,
} from './src/utils/notifications';

function AppContent() {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const {
    goals,
    rawGoals,
    loaded,
    sortBy, setSortBy,
    filterBy, setFilterBy,
    searchQuery, setSearchQuery,
    addGoal,
    updateGoal,
    toggleComplete,
    togglePin,
    deleteGoal,
    addUpdate,
    editUpdate,
    deleteUpdate,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    totalCount,
    dueCount,
  } = useGoals();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailGoalId, setDetailGoalId] = useState(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const rawGoalsRef = useRef(rawGoals);
  useEffect(() => { rawGoalsRef.current = rawGoals; }, [rawGoals]);

  // Request notification permissions once on mount
  useEffect(() => { setupNotifications(); }, []);

  const detailGoal = detailGoalId
    ? rawGoals.find(g => g.id === detailGoalId) ?? null
    : null;

  const showToast = useCallback((msg) => setToastMsg(msg), []);

  const handleAddGoal = useCallback((data) => {
    const newGoal = addGoal(data);
    scheduleGoalNotifications(newGoal, t);
    showToast(t('toast.goalAdded'));
  }, [addGoal, showToast, t]);

  const handleToggleComplete = useCallback((id) => {
    const g = rawGoalsRef.current.find(x => x.id === id);
    cancelGoalNotifications(id);
    toggleComplete(id);
    showToast(g?.completed ? t('toast.undone') : t('toast.goalCompleted'));
  }, [toggleComplete, showToast, t]);

  const handleTogglePin = useCallback((id) => {
    const g = rawGoalsRef.current.find(x => x.id === id);
    togglePin(id);
    showToast(g?.pinned ? t('toast.unpinned') : t('toast.pinned'));
  }, [togglePin, showToast, t]);

  const handleDelete = useCallback((id) => {
    cancelGoalNotifications(id);
    deleteGoal(id);
    showToast(t('toast.goalDeleted'));
  }, [deleteGoal, showToast, t]);

  const handleUpdateGoal = useCallback((id, data) => {
    updateGoal(id, data);
    const existing = rawGoalsRef.current.find(g => g.id === id);
    if (existing) scheduleGoalNotifications({ ...existing, ...data }, t);
    showToast(t('toast.goalUpdated'));
  }, [updateGoal, showToast, t]);

  const handleAddUpdate = useCallback((goalId, text) => {
    addUpdate(goalId, text);
    showToast(t('toast.noteAdded'));
  }, [addUpdate, showToast, t]);

  const handleEditUpdate = useCallback((goalId, updateId, text) => {
    editUpdate(goalId, updateId, text);
    showToast(t('toast.noteUpdated'));
  }, [editUpdate, showToast, t]);

  const handleDeleteUpdate = useCallback((goalId, updateId) => {
    deleteUpdate(goalId, updateId);
    showToast(t('toast.noteDeleted'));
  }, [deleteUpdate, showToast, t]);

  const renderItem = useCallback(({ item }) => (
    <GoalCard
      goal={item}
      onToggleComplete={handleToggleComplete}
      onTogglePin={handleTogglePin}
      onDelete={handleDelete}
      onPress={() => setDetailGoalId(item.id)}
    />
  ), [handleToggleComplete, handleTogglePin, handleDelete]);

  const keyExtractor = useCallback((item) => item.id, []);

  if (!loaded) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
        translucent={false}
      />

      <View style={styles.topFixed}>
        <AppHeader
          totalCount={totalCount}
          dueCount={dueCount}
          onStatsPress={() => setStatsVisible(true)}
          onCalendarPress={() => setCalendarVisible(true)}
        />
        <ControlsBar
          sortBy={sortBy}
          onSortChange={setSortBy}
          onAddPress={() => setAddModalVisible(true)}
        />
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        <FilterTabs filterBy={filterBy} onFilterChange={setFilterBy} />
      </View>

      <View style={styles.listWrapper}>
        <FlatList
          data={goals}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={goals.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <EmptyState onAddPress={() => setAddModalVisible(true)} />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      <AdBannerComponent />

      <AddGoalModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSubmit={handleAddGoal}
      />

      <GoalDetailModal
        goal={detailGoal}
        visible={!!detailGoal}
        onClose={() => setDetailGoalId(null)}
        onUpdateGoal={handleUpdateGoal}
        onAddUpdate={handleAddUpdate}
        onEditUpdate={handleEditUpdate}
        onDeleteUpdate={handleDeleteUpdate}
        onAddSubtask={addSubtask}
        onToggleSubtask={toggleSubtask}
        onDeleteSubtask={deleteSubtask}
      />

      <StatsModal
        visible={statsVisible}
        onClose={() => setStatsVisible(false)}
        goals={rawGoals}
      />

      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        goals={rawGoals}
      />

      <Toast message={toastMsg} onHide={() => setToastMsg(null)} />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 44,
  },
  topFixed: {
    flexShrink: 0,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  emptyContainer: {
    flexGrow: 1,
  },
});
