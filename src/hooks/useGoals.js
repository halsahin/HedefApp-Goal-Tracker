import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId, calcRemainingDays, toDateStr } from '../utils/dateUtils';
import { TURKISH_LABEL_TO_KEY } from '../constants/categories';
import { scheduleDriveSync } from '../utils/googleDrive';
import { createNextInstance } from '../utils/recurrence';
import { trackingStats, setDayEntry } from '../utils/tracking';

const STORAGE_KEY_V1 = 'goaltracker_v1';
const STORAGE_KEY_V2 = 'goaltracker_v2';

function calcProgressFromSubtasks(subtasks) {
    if (!subtasks || subtasks.length === 0) return 0;
    return Math.round(subtasks.filter(s => s.completed).length / subtasks.length * 100);
}

// Günlük takip hedefinde ilerleme yapılan gün oranıdır; tüm günler işaretlenince hedef tamamlanır
function withTrackingProgress(goal) {
    const { total, done } = trackingStats(goal);
    const progress = total > 0 ? Math.round(done / total * 100) : 0;
    return { ...goal, progress, completed: goal.completed || (total > 0 && done === total) };
}

// Tamamlama geri alındığında kaldırılabilecek, kullanıcının henüz dokunmadığı otomatik örnek mi?
function isUntouchedSpawn(g, parentId) {
    return g.spawnedFrom === parentId
        && !g.completed
        && (g.updates || []).length === 0
        && !(g.subtasks || []).some(s => s.completed);
}

function normaliseGoal(g) {
    const migratedCategory = TURKISH_LABEL_TO_KEY[g.category] ?? g.category;
    return {
        updates: [],
        progress: 0,
        subtasks: [],
        recurring: null,
        startDate: null,
        reminderDays: [3, 1],
        folderId: 'default',
        tracking: false,
        trackingUnit: '',
        dailyReminder: true,
        dayLog: {},
        streak: 0,
        ...g,
        category: migratedCategory,
    };
}

export function useGoals(activeFolderId = null) {
    const [goals, setGoals] = useState([]);
    const [sortBy, setSortBy] = useState('days');
    const [filterBy, setFilterBy] = useState('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [loaded, setLoaded] = useState(false);
    const goalsRef = useRef(goals);
    goalsRef.current = goals;

    // ── Load + migrate from AsyncStorage on mount ──────────────
    useEffect(() => {
        (async () => {
            try {
                let raw = await AsyncStorage.getItem(STORAGE_KEY_V2);
                if (raw) {
                    try {
                        setGoals(JSON.parse(raw).map(normaliseGoal));
                    } catch (parseErr) {
                        // Bozuk veri bir sonraki kayıtta ezilmesin diye ham kopyayı sakla
                        await AsyncStorage.setItem(STORAGE_KEY_V2 + '_corrupt', raw).catch(() => {});
                        console.error('[useGoals] corrupt data preserved:', parseErr);
                    }
                    return;
                }
                raw = await AsyncStorage.getItem(STORAGE_KEY_V1);
                if (raw) {
                    const migrated = JSON.parse(raw).map(normaliseGoal);
                    await AsyncStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
                    setGoals(migrated);
                }
            } catch (err) {
                console.error('[useGoals] load error:', err);
            } finally {
                setLoaded(true);
            }
        })();
    }, []);

    // ── Persist to AsyncStorage whenever goals change ──────────
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (!loaded) return;
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        AsyncStorage.setItem(STORAGE_KEY_V2, JSON.stringify(goals)).catch(err => {
            console.error('[useGoals] save error:', err);
        });

        // Google Drive otomatik senkronu açıksa (gecikmeli, birleştirilmiş) yükleme planla
        scheduleDriveSync();
    }, [goals, loaded]);

    // ── CRUD: Goals ────────────────────────────────────────────
    const addGoal = useCallback((data) => {
        const goal = normaliseGoal({
            id: generateId(),
            name: data.name.trim(),
            category: data.category,
            deadline: data.deadline,
            // Günlük takip her zaman bir başlangıç gününe ihtiyaç duyar (varsayılan: bugün)
            startDate: data.startDate || (data.tracking ? toDateStr(new Date()) : null),
            description: (data.description || '').trim(),
            completed: false,
            pinned: false,
            createdAt: new Date().toISOString(),
            progress: data.tracking ? 0 : (data.progress || 0),
            recurring: data.tracking ? null : (data.recurring || null),
            tracking: !!data.tracking,
            trackingUnit: data.tracking ? (data.trackingUnit || '').trim().slice(0, 20) : '',
            dailyReminder: data.dailyReminder !== false,
            dayLog: {},
            subtasks: data.subtasks || [],
            reminderDays: data.reminderDays ?? [3, 1],
            folderId: data.folderId ?? 'default',
            updates: [],
        });
        setGoals(prev => [goal, ...prev]);
        return goal;
    }, []);

    // Tamamlama durumunu değiştirir. { created, removedId } döner:
    //  - created: yinelenen hedef tamamlandıysa oluşturulan bir sonraki örnek
    //  - removedId: tamamlama geri alındıysa kaldırılan (dokunulmamış) sonraki örneğin id'si
    const toggleComplete = useCallback((id) => {
        // State updater'ı React'in zamanlamasına bağlı olduğundan sonucu dışarıda hesapla
        const goal = goalsRef.current.find(g => g.id === id);
        if (!goal) return { created: null, removedId: null };
        const nowCompleted = !goal.completed;
        const created = nowCompleted && goal.recurring ? createNextInstance(goal) : null;
        const removedId = !nowCompleted && goal.recurring
            ? (goalsRef.current.find(g => isUntouchedSpawn(g, id))?.id ?? null)
            : null;
        setGoals(prev => {
            let updated = prev
                .filter(g => g.id !== removedId)
                .map(g => g.id === id ? { ...g, completed: nowCompleted } : g);
            if (created && !updated.some(g => g.id === created.id)) {
                updated = [created, ...updated];
            }
            return updated;
        });
        return { created, removedId };
    }, []);

    // ── Günlük takip ───────────────────────────────────────────
    // Bir günün işaretini değiştirir. { done, autoCompleted } döner; hedef yoksa null.
    const toggleDay = useCallback((goalId, date) => {
        const goal = goalsRef.current.find(g => g.id === goalId);
        if (!goal || !goal.tracking) return null;
        const done = !goal.dayLog?.[date]?.done;
        const after = withTrackingProgress({ ...goal, dayLog: setDayEntry(goal.dayLog, date, { done }) });
        setGoals(prev => prev.map(g =>
            g.id === goalId
                ? withTrackingProgress({ ...g, dayLog: setDayEntry(g.dayLog, date, { done }) })
                : g
        ));
        return { done, autoCompleted: !goal.completed && after.completed };
    }, []);

    // Bir günün notunu ve (varsa) günlük miktarını kaydeder. details: { note, value }
    const setDayDetails = useCallback((goalId, date, details) => {
        const patch = {};
        if (details.note !== undefined) patch.note = (details.note || '').trim().slice(0, 1000);
        if (details.value !== undefined) patch.value = details.value;
        setGoals(prev => prev.map(g =>
            g.id === goalId && g.tracking
                ? { ...g, dayLog: setDayEntry(g.dayLog, date, patch) }
                : g
        ));
    }, []);

    // Toplu taşıma: verilen hedefleri bir klasöre alır
    const moveGoalsToFolder = useCallback((ids, folderId) => {
        const set = new Set(ids);
        setGoals(prev => prev.map(g => set.has(g.id) ? { ...g, folderId } : g));
    }, []);

    const togglePin = useCallback((id) => {
        setGoals(prev =>
            prev.map(g => g.id === id ? { ...g, pinned: !g.pinned } : g)
        );
    }, []);

    const deleteGoal = useCallback((id) => {
        setGoals(prev => prev.filter(g => g.id !== id));
    }, []);

    // Silinen hedefi eski sırasına geri koyar ("Geri al")
    const restoreGoal = useCallback((goal, index = 0) => {
        setGoals(prev => {
            if (prev.some(g => g.id === goal.id)) return prev;
            const next = [...prev];
            next.splice(Math.max(0, Math.min(index, next.length)), 0, goal);
            return next;
        });
    }, []);

    // BUG-14: Move all goals in a folder to 'default' (called before folder deletion)
    const moveGoalsToDefaultFolder = useCallback((folderId) => {
        setGoals(prev => prev.map(g =>
            (g.folderId ?? 'default') === folderId ? { ...g, folderId: 'default' } : g
        ));
    }, []);

    const updateGoal = useCallback((id, data) => {
        setGoals(prev =>
            prev.map(g => {
                if (g.id !== id) return g;
                const next = {
                    ...g,
                    name: data.name.trim(),
                    category: data.category,
                    deadline: data.deadline,
                    startDate: data.startDate !== undefined ? data.startDate : g.startDate,
                    description: (data.description || '').trim(),
                    progress: data.progress !== undefined ? data.progress : g.progress,
                    recurring: data.recurring !== undefined ? data.recurring : g.recurring,
                    reminderDays: data.reminderDays !== undefined ? data.reminderDays : g.reminderDays,
                    trackingUnit: data.trackingUnit !== undefined ? String(data.trackingUnit).trim().slice(0, 20) : g.trackingUnit,
                    dailyReminder: data.dailyReminder !== undefined ? data.dailyReminder : g.dailyReminder,
                };
                if (!g.tracking) return next;
                // Takip hedefinde tarih aralığı değişmiş olabilir: ilerlemeyi günlerden yeniden hesapla
                const { total, done } = trackingStats(next);
                return { ...next, recurring: null, progress: total > 0 ? Math.round(done / total * 100) : 0 };
            })
        );
    }, []);

    // ── CRUD: Progress Updates ─────────────────────────────────
    const addUpdate = useCallback((goalId, text) => {
        const entry = { id: generateId(), text: text.trim(), date: new Date().toISOString() };
        setGoals(prev =>
            prev.map(g =>
                g.id === goalId
                    ? { ...g, updates: [entry, ...(g.updates || [])] }
                    : g
            )
        );
    }, []);

    const editUpdate = useCallback((goalId, updateId, newText) => {
        setGoals(prev =>
            prev.map(g =>
                g.id === goalId
                    ? {
                        ...g,
                        updates: (g.updates || []).map(u =>
                            u.id === updateId ? { ...u, text: newText.trim() } : u
                        ),
                    }
                    : g
            )
        );
    }, []);

    const deleteUpdate = useCallback((goalId, updateId) => {
        setGoals(prev =>
            prev.map(g =>
                g.id === goalId
                    ? { ...g, updates: (g.updates || []).filter(u => u.id !== updateId) }
                    : g
            )
        );
    }, []);

    // ── CRUD: Subtasks ─────────────────────────────────────────
    const addSubtask = useCallback((goalId, text) => {
        const entry = { id: generateId(), text: text.trim(), completed: false };
        setGoals(prev =>
            prev.map(g => {
                if (g.id !== goalId) return g;
                const subtasks = [...(g.subtasks || []), entry];
                return { ...g, subtasks, progress: g.tracking ? g.progress : calcProgressFromSubtasks(subtasks) };
            })
        );
    }, []);

    const toggleSubtask = useCallback((goalId, subtaskId) => {
        setGoals(prev =>
            prev.map(g => {
                if (g.id !== goalId) return g;
                const subtasks = (g.subtasks || []).map(s =>
                    s.id === subtaskId ? { ...s, completed: !s.completed } : s
                );
                return { ...g, subtasks, progress: g.tracking ? g.progress : calcProgressFromSubtasks(subtasks) };
            })
        );
    }, []);

    const deleteSubtask = useCallback((goalId, subtaskId) => {
        setGoals(prev =>
            prev.map(g => {
                if (g.id !== goalId) return g;
                const subtasks = (g.subtasks || []).filter(s => s.id !== subtaskId);
                return { ...g, subtasks, progress: g.tracking ? g.progress : calcProgressFromSubtasks(subtasks) };
            })
        );
    }, []);

    // ── Derived: sorted + filtered + searched ──────────────────
    const sortedFiltered = useMemo(() => {
        // Kalan günü hedef başına bir kez hesapla (sıralama karşılaştırmalarında tekrar tekrar değil)
        const daysLeft = new Map(goals.map(g => [g.id, calcRemainingDays(g.deadline)]));
        let list = [...goals];

        // Klasör filtresi
        if (activeFolderId !== null) {
            list = list.filter(g => (g.folderId ?? 'default') === activeFolderId);
        }

        if (filterBy === 'active')    list = list.filter(g => !g.completed);
        if (filterBy === 'completed') list = list.filter(g => g.completed);
        if (filterBy === 'pinned')    list = list.filter(g => g.pinned);
        if (filterBy === 'overdue')   list = list.filter(g => !g.completed && daysLeft.get(g.id) < 0);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(g =>
                g.name.toLowerCase().includes(q) ||
                (g.description || '').toLowerCase().includes(q)
            );
        }

        list.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            switch (sortBy) {
                case 'days':     return daysLeft.get(a.id) - daysLeft.get(b.id);
                case 'date':     return a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0;
                case 'category': return a.category.localeCompare(b.category);
                case 'name':     return a.name.localeCompare(b.name, 'tr');
                default:         return 0;
            }
        });

        return list;
    }, [goals, activeFolderId, filterBy, searchQuery, sortBy]);

    // ── Stats ──────────────────────────────────────────────────
    const totalCount = goals.length;
    const dueCount = goals.filter(g => {
        if (g.completed) return false;
        const d = calcRemainingDays(g.deadline);
        return d >= 0 && d <= 7;
    }).length;

    return {
        goals: sortedFiltered,
        rawGoals: goals,
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
    };
}
