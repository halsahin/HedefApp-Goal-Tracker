import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, StatusBar as RNStatusBar, FlatList,
  StyleSheet, Platform, AppState, Alert, BackHandler,
} from 'react-native';
import Constants from 'expo-constants';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './src/i18n/LanguageContext';
import { useGoals } from './src/hooks/useGoals';
import AppHeader from './src/components/AppHeader';
import ControlsBar from './src/components/ControlsBar';
import SelectionBar from './src/components/SelectionBar';
import FilterTabs from './src/components/FilterTabs';
import SearchBar from './src/components/SearchBar';
import GoalCard from './src/components/GoalCard';
import EmptyState from './src/components/EmptyState';
import AddGoalModal from './src/components/AddGoalModal';
import GoalDetailModal from './src/components/GoalDetailModal';
import StatsModal from './src/components/StatsModal';
import CalendarModal from './src/components/CalendarModal';
import Toast from './src/components/Toast';
import SideDrawer from './src/components/SideDrawer';
import FolderPickerModal from './src/components/FolderPickerModal';
import CounterModal from './src/components/CounterModal';
import { useCounterRecords } from './src/hooks/useCounterRecords';
import AdBannerComponent from './src/components/AdBannerComponent';
import { useFolders } from './src/hooks/useFolders';
import {
  setupNotifications,
  scheduleGoalNotifications,
  cancelGoalNotifications,
  rescheduleAllNotifications,
  listenForGoalNotificationTaps,
} from './src/utils/notifications';
import { configureGoogleSignIn, flushDriveSync } from './src/utils/googleDrive';
import { logEvent, logScreenView } from './src/utils/analytics';
import { initAdsWithConsent } from './src/utils/consent';
import { toDateStr } from './src/utils/dateUtils';
import { setDayEntry } from './src/utils/tracking';

function AppContent({ onRestore }) {
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();

  const {
    folders,
    activeFolderId,
    setActiveFolderId,
    addFolder,
    renameFolder,
    deleteFolder,
    getLocalizedFolders,
  } = useFolders();

  const localizedFolders = getLocalizedFolders(t);
  const activeFolder = localizedFolders.find(f => f.id === activeFolderId) ?? null;

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
    restoreGoal,
    toggleDay,
    setDayDetails,
    moveGoalsToFolder,
    moveGoalsToDefaultFolder,
    addUpdate,
    editUpdate,
    deleteUpdate,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    totalCount,
    dueCount,
  } = useGoals(activeFolderId);

  // BUG-14: move goals to default folder before deleting the folder
  const handleDeleteFolder = useCallback((id) => {
    moveGoalsToDefaultFolder(id);
    deleteFolder(id);
  }, [moveGoalsToDefaultFolder, deleteFolder]);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailGoalId, setDetailGoalId] = useState(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [folderPickerVisible, setFolderPickerVisible] = useState(false);
  const [counterVisible, setCounterVisible] = useState(false);
  const [toast, setToast] = useState(null);
  const [adsReady, setAdsReady] = useState(false);
  // Toplu seçim: null = kapalı, Set = seçim modu (boş olabilir)
  const [selectedIds, setSelectedIds] = useState(null);
  const selectionMode = selectedIds !== null;
  const [moveVisible, setMoveVisible] = useState(false);

  const {
    records: counterRecords,
    addRecord, addNote: addCounterNote, editNote: editCounterNote,
    deleteNote: deleteCounterNote, deleteRecord,
  } = useCounterRecords();

  const rawGoalsRef = useRef(rawGoals);
  useEffect(() => { rawGoalsRef.current = rawGoals; }, [rawGoals]);

  useEffect(() => {
    let active = true;
    configureGoogleSignIn();
    // Önce kullanıcı onayı (UMP), sonra reklam SDK'sı ve analitik
    initAdsWithConsent().then(canRequestAds => {
      if (!active) return;
      setAdsReady(canRequestAds);
      logScreenView('HomeScreen');
      logEvent('app_open');
    });
    // Arka plana geçerken bekleyen Drive senkronunu beklemeden gönder
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') flushDriveSync();
    });
    return () => { active = false; sub.remove(); };
  }, []);

  // Veri yüklenince: bildirim izni iste, ardından tüm hatırlatıcıları güncel veriye göre baştan kur.
  // Her açılışta, yedekten geri yüklemede ve dil değişince çalışır; silinmiş hedeflerin bildirimleri
  // temizlenir, metinler güncel dile geçer, sınır nedeniyle kurulamayan hatırlatıcılar sıraya girer.
  useEffect(() => {
    if (!loaded) return;
    setupNotifications().then(() => rescheduleAllNotifications(rawGoalsRef.current, t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, language]);

  // Bildirime dokunulunca ilgili hedefin detayını aç
  useEffect(() => {
    if (!loaded) return;
    return listenForGoalNotificationTaps(goalId => {
      if (rawGoalsRef.current.some(g => g.id === goalId)) {
        setDrawerVisible(false);
        setDetailGoalId(goalId);
      }
    });
  }, [loaded]);

  const detailGoal = detailGoalId
    ? rawGoals.find(g => g.id === detailGoalId) ?? null
    : null;

  // action: { label, onPress } verilirse Toast'ta dokunulabilir buton gösterilir (ör. "Geri al")
  const showToast = useCallback((message, action) => {
    setToast({
      id: `${Date.now()}-${Math.random()}`,
      message,
      actionLabel: action?.label,
      onAction: action?.onPress,
    });
  }, []);

  const handleAddGoal = useCallback((data) => {
    const newGoal = addGoal({ ...data, folderId: activeFolderId ?? 'default' });
    scheduleGoalNotifications(newGoal, t);
    showToast(t('toast.goalAdded'));
    logEvent('add_goal', { category: data.category || 'general' });
  }, [addGoal, showToast, t, activeFolderId]);

  const handleToggleComplete = useCallback((id) => {
    const g = rawGoalsRef.current.find(x => x.id === id);
    cancelGoalNotifications(id);
    const { created, removedId } = toggleComplete(id);
    if (created) scheduleGoalNotifications(created, t);
    // Tamamlama geri alındıysa otomatik oluşturulan sonraki örnek de kaldırıldı
    if (removedId) cancelGoalNotifications(removedId);
    // Tamamlanmış hedef geri açılırsa hatırlatıcıları yeniden kur
    if (g?.completed) scheduleGoalNotifications({ ...g, completed: false }, t);
    showToast(g?.completed ? t('toast.undone') : t('toast.goalCompleted'));
    if (!g?.completed) {
      logEvent('complete_goal');
    }
  }, [toggleComplete, showToast, t]);

  const handleTogglePin = useCallback((id) => {
    const g = rawGoalsRef.current.find(x => x.id === id);
    togglePin(id);
    showToast(g?.pinned ? t('toast.unpinned') : t('toast.pinned'));
  }, [togglePin, showToast, t]);

  const handleDelete = useCallback((id) => {
    const index = rawGoalsRef.current.findIndex(x => x.id === id);
    const removed = index >= 0 ? rawGoalsRef.current[index] : null;
    cancelGoalNotifications(id);
    deleteGoal(id);
    logEvent('delete_goal');
    if (!removed) {
      showToast(t('toast.goalDeleted'));
      return;
    }
    showToast(t('toast.goalDeleted'), {
      label: t('toast.undo'),
      onPress: () => {
        restoreGoal(removed, index);
        scheduleGoalNotifications(removed, t);
        showToast(t('toast.undone'));
      },
    });
  }, [deleteGoal, restoreGoal, showToast, t]);

  // ── Günlük takip ────────────────────────────────────────────
  const handleToggleDay = useCallback((goalId, date) => {
    const before = rawGoalsRef.current.find(g => g.id === goalId);
    const result = toggleDay(goalId, date);
    if (!result) return;
    // İşaretlenen günün "bugünü işaretle" hatırlatması kalksın (ya da işaret kaldırıldıysa geri gelsin)
    if (before && !result.autoCompleted) {
      scheduleGoalNotifications({ ...before, dayLog: setDayEntry(before.dayLog, date, { done: result.done }) }, t);
    }
    if (result.autoCompleted) {
      // Son gün de işaretlendi: hedef tamamlandı
      cancelGoalNotifications(goalId);
      showToast(t('toast.goalCompleted'));
      logEvent('complete_goal');
    } else if (date === toDateStr(new Date())) {
      showToast(result.done ? t('toast.dayDone') : t('toast.dayUndone'));
    }
  }, [toggleDay, showToast, t]);

  const handleToggleToday = useCallback((goalId) => {
    handleToggleDay(goalId, toDateStr(new Date()));
  }, [handleToggleDay]);

  // ── Toplu seçim ─────────────────────────────────────────────
  const exitSelection = useCallback(() => setSelectedIds(null), []);

  const handleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Listede şu an görünen (filtre/arama sonrası) hedeflerin tamamını seç ya da seçimi boşalt
  const visibleIdsRef = useRef([]);
  visibleIdsRef.current = goals.map(g => g.id);
  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const visible = visibleIdsRef.current;
      const all = visible.length > 0 && visible.every(id => prev?.has(id));
      return new Set(all ? [] : visible);
    });
  }, []);

  const selectedGoals = useCallback(() => {
    const ids = selectedIds ?? new Set();
    return rawGoalsRef.current.filter(g => ids.has(g.id));
  }, [selectedIds]);

  const handleBulkComplete = useCallback(() => {
    const targets = selectedGoals().filter(g => !g.completed);
    for (const g of targets) {
      cancelGoalNotifications(g.id);
      const { created } = toggleComplete(g.id);
      if (created) scheduleGoalNotifications(created, t);
    }
    if (targets.length > 0) logEvent('bulk_complete', { count: targets.length });
    showToast(t('toast.bulkCompleted', { n: targets.length }));
    exitSelection();
  }, [selectedGoals, toggleComplete, showToast, exitSelection, t]);

  // Seçilenlerin hepsi favoriyse favoriden çıkarır, değilse hepsini favoriye alır
  const handleBulkPin = useCallback(() => {
    const targets = selectedGoals();
    const allPinned = targets.length > 0 && targets.every(g => g.pinned);
    const toToggle = targets.filter(g => g.pinned === allPinned);
    for (const g of toToggle) togglePin(g.id);
    showToast(t(allPinned ? 'toast.bulkUnpinned' : 'toast.bulkPinned', { n: toToggle.length }));
    exitSelection();
  }, [selectedGoals, togglePin, showToast, exitSelection, t]);

  const handleBulkMove = useCallback((folderId) => {
    const ids = selectedGoals().map(g => g.id);
    moveGoalsToFolder(ids, folderId ?? 'default');
    showToast(t('toast.bulkMoved', { n: ids.length }));
    exitSelection();
  }, [selectedGoals, moveGoalsToFolder, showToast, exitSelection, t]);

  const handleBulkDelete = useCallback(() => {
    const targets = selectedGoals();
    if (targets.length === 0) return;
    Alert.alert(
      t('bulk.deleteTitle', { n: targets.length }),
      t('bulk.deleteMsg', { n: targets.length }),
      [
        { text: t('delete.cancel'), style: 'cancel' },
        {
          text: t('delete.confirm'),
          style: 'destructive',
          onPress: () => {
            // Geri alma için hedefleri ve listedeki sıralarını sakla (küçük indeksten büyüğe eklenir)
            const removed = targets
              .map(g => ({ goal: g, index: rawGoalsRef.current.findIndex(x => x.id === g.id) }))
              .sort((a, b) => a.index - b.index);
            for (const { goal } of removed) {
              cancelGoalNotifications(goal.id);
              deleteGoal(goal.id);
            }
            logEvent('bulk_delete', { count: removed.length });
            exitSelection();
            showToast(t('toast.bulkDeleted', { n: removed.length }), {
              label: t('toast.undo'),
              onPress: () => {
                for (const { goal, index } of removed) {
                  restoreGoal(goal, index);
                  scheduleGoalNotifications(goal, t);
                }
                showToast(t('toast.undone'));
              },
            });
          },
        },
      ]
    );
  }, [selectedGoals, deleteGoal, restoreGoal, showToast, exitSelection, t]);

  // Android geri tuşu seçim modundan çıkarır
  useEffect(() => {
    if (!selectionMode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedIds(null);
      return true;
    });
    return () => sub.remove();
  }, [selectionMode]);

  const handleReminderTimeChange = useCallback(() => {
    rescheduleAllNotifications(rawGoalsRef.current, t);
  }, [t]);

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
      onToggleToday={handleToggleToday}
      selectionMode={selectionMode}
      selected={!!selectedIds?.has(item.id)}
      onSelect={handleSelect}
      onLongPress={handleSelect}
    />
  ), [handleToggleComplete, handleTogglePin, handleDelete, handleToggleToday, handleSelect, selectionMode, selectedIds]);

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
          onMenuPress={() => setDrawerVisible(true)}
          folderName={activeFolder?.name ?? t('folder.all')}
          onFolderPress={() => setFolderPickerVisible(true)}
        />
        {selectionMode ? (
          <SelectionBar
            count={selectedIds.size}
            allSelected={goals.length > 0 && goals.every(g => selectedIds.has(g.id))}
            onCancel={exitSelection}
            onSelectAll={handleSelectAll}
            onComplete={handleBulkComplete}
            onPin={handleBulkPin}
            onMove={() => setMoveVisible(true)}
            onDelete={handleBulkDelete}
          />
        ) : (
          <ControlsBar
            sortBy={sortBy}
            onSortChange={setSortBy}
            onAddPress={() => setAddModalVisible(true)}
            onSelectPress={goals.length > 0 ? () => setSelectedIds(new Set()) : undefined}
          />
        )}
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

      {adsReady && <AdBannerComponent />}

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
        onToggleDay={handleToggleDay}
        onSetDayDetails={setDayDetails}
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

      <Toast toast={toast} onHide={() => setToast(null)} />

      <SideDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onStatsPress={() => setStatsVisible(true)}
        onCalendarPress={() => setCalendarVisible(true)}
        onCounterPress={() => setCounterVisible(true)}
        onRestoreSuccess={() => { setDrawerVisible(false); onRestore(); }}
        folders={localizedFolders}
        activeFolderId={activeFolderId}
        onSelectFolder={setActiveFolderId}
        onManageFolders={() => setFolderPickerVisible(true)}
        onReminderTimeChange={handleReminderTimeChange}
      />

      <CounterModal
        visible={counterVisible}
        onClose={() => setCounterVisible(false)}
        records={counterRecords}
        onAddRecord={addRecord}
        onAddNote={addCounterNote}
        onEditNote={editCounterNote}
        onDeleteNote={deleteCounterNote}
        onDeleteRecord={deleteRecord}
      />

      <FolderPickerModal
        visible={folderPickerVisible}
        onClose={() => setFolderPickerVisible(false)}
        folders={localizedFolders}
        activeFolderId={activeFolderId}
        onSelectFolder={setActiveFolderId}
        onAddFolder={addFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={handleDeleteFolder}
      />

      {/* Toplu taşıma: aynı klasör listesi, seçim hedefleri taşır */}
      <FolderPickerModal
        visible={moveVisible}
        onClose={() => setMoveVisible(false)}
        title={t('bulk.moveTitle')}
        hideAll
        folders={localizedFolders}
        activeFolderId="__none__"
        onSelectFolder={handleBulkMove}
        onAddFolder={addFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={handleDeleteFolder}
      />
    </View>
  );
}

export default function App() {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    // key: yedekten geri yüklemede tema/dil ayarları da değişebildiği için tüm ağaç yeniden kurulur
    <ThemeProvider key={reloadKey}>
      <LanguageProvider>
        <AppContent onRestore={() => setReloadKey(k => k + 1)} />
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: Constants.statusBarHeight ?? (Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 44),
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
