import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, StatusBar, FlatList,
  StyleSheet, Platform,
} from 'react-native';

import { useGoals } from './src/hooks/useGoals';
import AppHeader from './src/components/AppHeader';
import ControlsBar from './src/components/ControlsBar';
import FilterTabs from './src/components/FilterTabs';
import GoalCard from './src/components/GoalCard';
import EmptyState from './src/components/EmptyState';
import AddGoalModal from './src/components/AddGoalModal';
import GoalDetailModal from './src/components/GoalDetailModal';
import Toast from './src/components/Toast';
import AdBannerComponent from './src/components/AdBannerComponent';
import { Colors } from './src/constants/theme';
import { LanguageProvider, useLanguage } from './src/i18n/LanguageContext';

function AppContent() {
  const { t } = useLanguage();

  const {
    goals,
    rawGoals,
    loaded,
    sortBy, setSortBy,
    filterBy, setFilterBy,
    addGoal,
    updateGoal,
    toggleComplete,
    togglePin,
    deleteGoal,
    addUpdate,
    editUpdate,
    deleteUpdate,
    totalCount,
    dueCount,
  } = useGoals();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailGoalId, setDetailGoalId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const rawGoalsRef = useRef(rawGoals);
  useEffect(() => { rawGoalsRef.current = rawGoals; }, [rawGoals]);

  const detailGoal = detailGoalId
    ? rawGoals.find(g => g.id === detailGoalId) ?? null
    : null;

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
  }, []);

  const handleAddGoal = useCallback((data) => {
    addGoal(data);
    showToast(t('toast.goalAdded'));
  }, [addGoal, showToast, t]);

  const handleToggleComplete = useCallback((id) => {
    const g = rawGoalsRef.current.find(x => x.id === id);
    toggleComplete(id);
    showToast(g?.completed ? t('toast.undone') : t('toast.goalCompleted'));
  }, [toggleComplete, showToast, t]);

  const handleTogglePin = useCallback((id) => {
    const g = rawGoalsRef.current.find(x => x.id === id);
    togglePin(id);
    showToast(g?.pinned ? t('toast.unpinned') : t('toast.pinned'));
  }, [togglePin, showToast, t]);

  const handleDelete = useCallback((id) => {
    deleteGoal(id);
    showToast(t('toast.goalDeleted'));
  }, [deleteGoal, showToast, t]);

  const handleUpdateGoal = useCallback((id, data) => {
    updateGoal(id, data);
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
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.surface}
        translucent={false}
      />

      <View style={styles.topFixed}>
        <AppHeader totalCount={totalCount} dueCount={dueCount} />
        <ControlsBar
          sortBy={sortBy}
          onSortChange={setSortBy}
          onAddPress={() => setAddModalVisible(true)}
        />
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
      />

      <Toast message={toastMsg} onHide={() => setToastMsg(null)} />
    </View>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
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
