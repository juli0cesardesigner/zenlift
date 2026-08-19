"use client";
import { DesktopPlanEditor } from '../components/features/PlanBuilder/DesktopPlanEditor';
import { AdvancedStatsDashboard } from '../components/features/Stats/AdvancedStatsDashboard';
import { MobileNav } from '../components/layout/MobileNav';
import { DesktopNav } from '../components/layout/DesktopNav';
import { ActiveWorkoutView } from '../components/features/ActiveWorkout/ActiveWorkoutView';
import { PlanEditorView } from '../components/features/PlanBuilder/PlanEditorView';
import { PlanListView } from '../components/features/PlanBuilder/PlanListView';
import { ExerciseLibraryView } from '../components/features/ExerciseLibrary/ExerciseLibraryView';
import { HistoryView } from '../components/features/History/HistoryView';
import { WorkoutShareModal } from '../components/ui/WorkoutShareModal';

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  Play,
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  History, 
  Dumbbell, 
  Clock, 
  ArrowLeft, 
  Copy, 
  Save, 
  X, 
  ChevronRight, 
  Check,
  Edit3,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudOff,
  RefreshCw,
  Database,
  FileText,
  AlertCircle,
  AlertTriangle,
  Upload,
  Link,
  Users,
  ArrowUpDown
} from "lucide-react";
import { supabase } from "./supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

import { Tab, ExerciseDef, PlannedSet, PlannedExercise, WorkoutTemplate, Plan, ActiveSet, ActiveExercise, ActiveWorkoutSession, HistoryLog } from '../types';
import { EXERCISE_FIELDS_LABEL_MAP, EXERCISE_VIEW_MODE_LABEL_MAP, STATS_PERIOD_LABEL_MAP, defaultExercises, muscleColors, nodePositions } from '../lib/constants';
import { isValidVideoUrl, formatTime, formatRestTime, generateId } from '../lib/utils';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { CustomSelect } from '../components/ui/CustomSelect';
import { AthleteInputDropdown } from '../components/ui/AthleteInputDropdown';
export default function AppContainer() {
  const [activeTab, setActiveTab] = useState<Tab>("plans");
  const [exerciseViewMode, setExerciseViewMode] = useState<"muscle" | "alphabetical">("muscle");
  const [isLoaded, setIsLoaded] = useState(false);

  // Custom UI States
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, message: string, onConfirm: () => void} | null>(null);
  const [shareWorkoutModalData, setShareWorkoutModalData] = useState<HistoryLog | null>(null);

  const showToast = (message: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3500);
  };

  // Core Persistent States
  const [exercises, setExercises] = useState<ExerciseDef[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [workoutSummary, setWorkoutSummary] = useState<HistoryLog | null>(null);
  const [reviewingWorkoutLog, setReviewingWorkoutLog] = useState<HistoryLog | null>(null);
  const [reviewName, setReviewName] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [reviewTime, setReviewTime] = useState("");
  const [reviewDurationMins, setReviewDurationMins] = useState("");

  // Per-Partner Historical Performance Lookup
  const getPartnerPerformance = useCallback((exerciseName: string, partnerName?: string) => {
    const performances: { weight: number; reps: number; date: number }[] = [];
    
    history.filter(log => !log.isDeleted && (log.workoutType || "rotina") === "rotina").forEach(log => {
      let partnerRole: "p1" | "p2" | "any" = "any";

      if (partnerName && partnerName.trim()) {
        const target = partnerName.trim().toLowerCase();
        const p1 = log.partner1Name?.trim().toLowerCase();
        const p2 = log.partner2Name?.trim().toLowerCase();

        if (log.sessionMode === "dual") {
          if (p1 === target) partnerRole = "p1";
          else if (p2 === target) partnerRole = "p2";
          else return; // Partner didn't participate in this log!
        } else {
          if (p1 && p1 !== target) partnerRole = "any";
        }
      }

      log.exercises.forEach(he => {
        if (he.name === exerciseName) {
          let maxW = 0;
          let maxR = 0;
          he.sets.forEach(hs => {
            const rawW = partnerRole === "p2" ? (hs.weightP2 || hs.weight) : hs.weight;
            const rawR = partnerRole === "p2" ? (hs.repsP2 || hs.reps) : hs.reps;
            const w = parseFloat(rawW) || 0;
            const r = parseInt(rawR) || 0;
            if (w > maxW || (w === maxW && r > maxR)) {
              maxW = w;
              maxR = r;
            }
          });
          if (maxW > 0) {
            performances.push({ weight: maxW, reps: maxR, date: log.date });
          }
        }
      });
    });

    performances.sort((a, b) => b.date - a.date);
    return performances;
  }, [history]);

  // Active Workout Session
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutSession | null>(null);
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Stopwatch States for Time-based Exercises
  const [activeStopwatchSetId, setActiveStopwatchSetId] = useState<string | null>(null);
  const [activeStopwatchStartTime, setActiveStopwatchStartTime] = useState<number | null>(null);
  const [activeStopwatchElapsedMs, setActiveStopwatchElapsedMs] = useState<number>(0);

  // References
  const blurMaskRef = useRef<HTMLDivElement>(null);

  const [activeInputModal, setActiveInputModal] = useState<{
    exerciseId: string;
    setId: string;
    field: "weight" | "reps";
    partner?: "p1" | "p2";
    initialValue: string;
    suggestedValue: string;
  } | null>(null);
  const [modalTempValue, setModalTempValue] = useState<string>("");
  const [isEditingDirectly, setIsEditingDirectly] = useState(false);

  // Starting Workout Mode Modal (Solo vs Dual)
  const [startingWorkoutModal, setStartingWorkoutModal] = useState<{
    workout: WorkoutTemplate;
    planName: string;
  } | null>(null);
  const [selectedSessionMode, setSelectedSessionMode] = useState<"solo" | "dual">("solo");
  const [partner1NameInput, setPartner1NameInput] = useState("Atleta 1");
  const [partner2NameInput, setPartner2NameInput] = useState("Atleta 2");
  const [partnerHistory, setPartnerHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("zenlift_partner_history");
      if (saved) {
        setPartnerHistory(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const savePartnerName = (name: string) => {
    if (!name || !name.trim() || name === "Atleta 1" || name === "Atleta 2") return;
    const clean = name.trim();
    setPartnerHistory(prev => {
      const updated = Array.from(new Set([clean, ...prev])).slice(0, 20);
      try {
        localStorage.setItem("zenlift_partner_history", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const allKnownPartners = useMemo(() => {
    const set = new Set<string>();
    partnerHistory.forEach(p => {
      if (p && p.trim() && p !== "Atleta 1" && p !== "Atleta 2") set.add(p.trim());
    });
    history.forEach(log => {
      if (log.partner1Name && log.partner1Name.trim() && log.partner1Name !== "Atleta 1" && log.partner1Name !== "Atleta 2") {
        set.add(log.partner1Name.trim());
      }
      if (log.partner2Name && log.partner2Name.trim() && log.partner2Name !== "Atleta 1" && log.partner2Name !== "Atleta 2") {
        set.add(log.partner2Name.trim());
      }
    });
    return Array.from(set);
  }, [partnerHistory, history]);

  useEffect(() => {
    setIsEditingDirectly(false);
  }, [activeInputModal]);

  const activeWorkoutState = useMemo(() => {
    if (!activeWorkout || !activeWorkout.exercises.length) {
      return { activeExerciseIndex: -1, globalActiveSetId: null };
    }

    const isDual = activeWorkout.sessionMode === "dual";
    const isSetCompleted = (s: ActiveSet) => isDual ? (s.completed && s.completedP2) : s.completed;

    let i = 0;
    while (i < activeWorkout.exercises.length) {
      const ex = activeWorkout.exercises[i];
      if (ex.supersetGroupId) {
        // Collect all contiguous exercises in this superset group
        const groupExercises: { ex: ActiveExercise; originalIndex: number }[] = [];
        let j = i;
        while (j < activeWorkout.exercises.length && activeWorkout.exercises[j].supersetGroupId === ex.supersetGroupId) {
          groupExercises.push({ ex: activeWorkout.exercises[j], originalIndex: j });
          j++;
        }

        const maxSets = Math.max(...groupExercises.map(g => g.ex.sets.length), 0);

        // Interleaved round-robin: Set 0 for each exercise in group, then Set 1, then Set 2...
        for (let sIdx = 0; sIdx < maxSets; sIdx++) {
          for (const g of groupExercises) {
            const set = g.ex.sets[sIdx];
            if (set && !isSetCompleted(set)) {
              return {
                activeExerciseIndex: g.originalIndex,
                globalActiveSetId: set.id
              };
            }
          }
        }
        i = j;
      } else {
        // Single exercise: process sets in sequence
        for (const set of ex.sets) {
          if (!isSetCompleted(set)) {
            return {
              activeExerciseIndex: i,
              globalActiveSetId: set.id
            };
          }
        }
        i++;
      }
    }

    return {
      activeExerciseIndex: activeWorkout.exercises.length - 1,
      globalActiveSetId: null
    };
  }, [activeWorkout]);

  const globalActiveSetId = activeWorkoutState.globalActiveSetId;

  // Rest Timer
  const [restTimer, setRestTimer] = useState<{
    duration: number;
    endTime: number;
    exerciseName: string;
    setIndex: number;
    nextExerciseName?: string;
    nextExerciseLastWeight?: string;
    exerciseIndex?: number;
    totalExercises?: number;
  } | null>(null);
  const [restRemainingMs, setRestRemainingMs] = useState(0);
  const restTimerRef = useRef(restTimer);

  useEffect(() => {
    restTimerRef.current = restTimer;
  }, [restTimer]);

  // Plan Builder States
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [addingExerciseToWorkoutId, setAddingExerciseToWorkoutId] = useState<string | null>(null);
  const [configuringExercise, setConfiguringExercise] = useState<{
    workoutId: string;
    exercise: PlannedExercise;
  } | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);

  // Carousel Pagination States
  const [activeWorkoutIndex, setActiveWorkoutIndex] = useState(0);
  const [activeBuilderWorkoutIndex, setActiveBuilderWorkoutIndex] = useState(0);

  // Carousel dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftVal, setScrollLeftVal] = useState(0);

  // Exercise Library States
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseMuscle, setNewExerciseMuscle] = useState("Peito");
  const [editingExercise, setEditingExercise] = useState<ExerciseDef | null>(null);
  const [editingExerciseVideoFile, setEditingExerciseVideoFile] = useState<File | null>(null);
  const [editingExerciseThumbnailFile, setEditingExerciseThumbnailFile] = useState<File | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [isMuscleDropdownOpen, setIsMuscleDropdownOpen] = useState(false);

  // Custom dialog/alert state
  const [dialog, setDialog] = useState<{
    title?: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  const [expandedCompletedExercises, setExpandedCompletedExercises] = useState<Record<string, boolean>>({});

  // Slide to unlock states
  const [slideX, setSlideX] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [maxDrag, setMaxDrag] = useState(0);

  // Statistics and Focus states
  const [statsPeriod, setStatsPeriod] = useState<"week" | "month" | "year" | "all">("all");
  const [focusedExercises, setFocusedExercises] = useState<string[]>([]);
  const [isAddingFocusModalOpen, setIsAddingFocusModalOpen] = useState(false);
  const [hoveredLogIdx, setHoveredLogIdx] = useState<number | null>(null);

  // Supabase Auth and Sync States
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [lastSyncedTime, setLastSyncedTime] = useState<number | null>(null);

  // Synced tracking refs (prevent resurrection of deleted items)
  const syncedPlanIdsRef = useRef<string[]>([]);
  const syncedExerciseIdsRef = useRef<string[]>([]);
  const syncedHistoryIdsRef = useRef<string[]>([]);

  // Flag to suppress push-backs when state changes originate from Realtime events
  const isSyncingFromRemoteRef = useRef(false);

  // Broadcast channel ref (accessible from watchers)
  const broadcastChannelRef = useRef<any>(null);

  // Pre-compute an exercise map for O(1) lookups instead of O(N) .find() inside loops
  const exerciseMap = useMemo(() => {
    return exercises.reduce((acc, ex) => {
      if (ex) {
        acc[ex.id] = ex;
        if (ex.name) acc[ex.name] = ex;
      }
      return acc;
    }, {} as Record<string, ExerciseDef>);
  }, [exercises]);

  const exerciseMapByName = useMemo(() => {
    return exercises.reduce((acc, ex) => {
      if (ex && ex.name) acc[ex.name] = ex;
      return acc;
    }, {} as Record<string, ExerciseDef>);
  }, [exercises]);

  // Ensure default exercises are never lost when merging local/custom exercises
  const ensureDefaultExercises = (customList: ExerciseDef[] = []): ExerciseDef[] => {
    const map = new Map<string, ExerciseDef>();
    defaultExercises.forEach(ex => map.set(ex.id, ex));
    (customList || []).forEach(ex => {
      if (ex && !ex.isDeleted) {
        map.set(ex.id, ex);
      }
    });
    return Array.from(map.values());
  };

  // Load state from local storage on mount
  useEffect(() => {
    const storedEx = localStorage.getItem("is_exercises_v3");
    const storedPlans = localStorage.getItem("is_plans_v3");
    const storedActivePlan = localStorage.getItem("is_active_plan_v3");
    const storedHistory = localStorage.getItem("is_history_v4");
    const storedActiveWorkout = localStorage.getItem("is_active_workout_v4");

    if (storedEx) {
      try {
        const parsed = JSON.parse(storedEx);
        setExercises(ensureDefaultExercises(parsed));
      } catch {
        setExercises(defaultExercises);
      }
    } else {
      setExercises(defaultExercises);
    }

    // Starts completely empty unless plans exist in localStorage
    if (storedPlans) {
      const parsedPlans: Plan[] = JSON.parse(storedPlans);
      setPlans(parsedPlans);
      const validPlans = parsedPlans.filter(p => !p.isDeleted);
      if (storedActivePlan && validPlans.some(p => p.id === storedActivePlan)) {
        setActivePlanId(storedActivePlan);
      } else if (validPlans.length > 0) {
        setActivePlanId(validPlans[0].id);
      } else {
        setActivePlanId(null);
      }
    } else {
      setPlans([]);
      setActivePlanId(null);
    }

    if (storedHistory) setHistory(JSON.parse(storedHistory));
    if (storedActiveWorkout) setActiveWorkout(JSON.parse(storedActiveWorkout));

    const storedEditingPlan = localStorage.getItem("is_editing_plan_v3");
    if (storedEditingPlan) {
      try {
        setEditingPlan(JSON.parse(storedEditingPlan));
      } catch (e) {
        // ignore
      }
    }

    const storedFocused = localStorage.getItem("is_focused_exercises_v1");
    if (storedFocused) setFocusedExercises(JSON.parse(storedFocused));



    const storedSyncedPlans = localStorage.getItem("is_synced_plans_v1");
    if (storedSyncedPlans) syncedPlanIdsRef.current = JSON.parse(storedSyncedPlans);

    const storedSyncedExercises = localStorage.getItem("is_synced_exercises_v1");
    if (storedSyncedExercises) syncedExerciseIdsRef.current = JSON.parse(storedSyncedExercises);

    const storedSyncedHistory = localStorage.getItem("is_synced_history_v1");
    if (storedSyncedHistory) syncedHistoryIdsRef.current = JSON.parse(storedSyncedHistory);

    setIsLoaded(true);
  }, []);

  // Supabase Auth session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- SUPABASE SYNCHRONIZATION HELPERS ---
  const pushCustomExercisesToSupabase = async (userId: string, localExercises: ExerciseDef[]) => {
    try {
      // 1. Upsert custom exercises (including deleted ones)
      const customLocal = localExercises.filter(ex => ex.id.startsWith("ex_"));
      if (customLocal.length === 0) return;

      const customToUpsert = customLocal.map(ex => ({
        id: ex.id,
        name: ex.name,
        muscle: ex.muscle,
        user_id: userId,
        video_url: ex.videoUrl || null,
        thumbnail_url: ex.thumbnailUrl || null,
        secondary_muscles: ex.secondaryMuscles || [],
        mechanic_type: ex.mechanicType || null,
        equipment: ex.equipment || null,
        grip_type: ex.gripType || null,
        stance: ex.stance || null,
        instructions: ex.instructions || null,
        common_mistakes: ex.commonMistakes || null,
        breathing: ex.breathing || null,
        difficulty_level: ex.difficultyLevel || null,
        exercise_category: ex.exerciseCategory || null,
        visible_fields: ex.visibleFields || [],
        is_time_based: ex.isTimeBased || false,
        is_reps_only: ex.isRepsOnly || false,
        is_deleted: ex.isDeleted || false
      }));
      const { error: upErr } = await supabase.from("exercises").upsert(customToUpsert);
      if (upErr) throw upErr;

      const upsertedIds = customLocal.filter(ex => !ex.isDeleted).map(ex => ex.id);
      const next = [...syncedExerciseIdsRef.current];
      upsertedIds.forEach(id => {
        if (!next.includes(id)) next.push(id);
      });
      syncedExerciseIdsRef.current = next;
      localStorage.setItem("is_synced_exercises_v1", JSON.stringify(next));
    } catch (e) {
      console.error("pushCustomExercisesToSupabase error:", e);
    }
  };

  const pullCustomExercisesFromSupabase = async (userId: string): Promise<ExerciseDef[]> => {
    try {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, muscle, video_url, thumbnail_url, secondary_muscles, mechanic_type, equipment, grip_type, stance, instructions, common_mistakes, breathing, difficulty_level, exercise_category, visible_fields, is_time_based, is_reps_only")
        .eq("user_id", userId)
        .eq("is_deleted", false);

      if (error) throw error;
      if (!data) return [];
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        muscle: row.muscle,
        videoUrl: row.video_url || undefined,
        thumbnailUrl: row.thumbnail_url || undefined,
        secondaryMuscles: row.secondary_muscles || [],
        mechanicType: row.mechanic_type || undefined,
        equipment: row.equipment || undefined,
        gripType: row.grip_type || undefined,
        stance: row.stance || undefined,
        instructions: row.instructions || undefined,
        commonMistakes: row.common_mistakes || undefined,
        breathing: row.breathing || undefined,
        difficultyLevel: row.difficulty_level || undefined,
        exerciseCategory: row.exercise_category || undefined,
        visibleFields: row.visible_fields || [],
        isTimeBased: row.is_time_based || false,
        isRepsOnly: row.is_reps_only || false
      }));
    } catch (e) {
      console.error("pullCustomExercisesFromSupabase error:", e);
      return [];
    }
  };

  const pushPlansToSupabase = async (
    userId: string,
    localPlans: Plan[]
  ): Promise<boolean> => {
    try {
      if (localPlans.length === 0) return true;

      // 1. Upsert plans
      const plansToUpsert = localPlans.map(p => ({
        id: p.id,
        name: p.name,
        user_id: userId,
        is_deleted: p.isDeleted || false
      }));
      const { error: pErr } = await supabase.from("plans").upsert(plansToUpsert);
      if (pErr) throw pErr;

      // 2. Upsert workouts
      const workoutsToUpsert: any[] = [];
      localPlans.forEach(p => {
        p.workouts.forEach((w, wIdx) => {
          workoutsToUpsert.push({
            id: w.id,
            plan_id: p.id,
            name: w.name,
            order_index: wIdx,
            user_id: userId,
            is_deleted: w.isDeleted || p.isDeleted || false
          });
        });
      });
      if (workoutsToUpsert.length > 0) {
        const { error: wErr } = await supabase.from("workouts").upsert(workoutsToUpsert);
        if (wErr) throw wErr;
      }

      // 3. Upsert planned exercises
      const peToUpsert: any[] = [];
      localPlans.forEach(p => {
        p.workouts.forEach(w => {
          w.exercises.forEach((pe, peIdx) => {
            peToUpsert.push({
              id: pe.id,
              workout_id: w.id,
              exercise_id: pe.exerciseId,
              order_index: peIdx,
              user_id: userId,
              is_deleted: pe.isDeleted || w.isDeleted || p.isDeleted || false,
              superset_group_id: pe.supersetGroupId || null
            });
          });
        });
      });
      if (peToUpsert.length > 0) {
        const { error: peErr } = await supabase.from("planned_exercises").upsert(peToUpsert);
        if (peErr) throw peErr;
      }

      // 4. Upsert planned sets
      const psToUpsert: any[] = [];
      localPlans.forEach(p => {
        p.workouts.forEach(w => {
          w.exercises.forEach(pe => {
            pe.sets.forEach((s, sIdx) => {
              psToUpsert.push({
                id: s.id,
                planned_exercise_id: pe.id,
                min_reps: s.minReps,
                max_reps: s.maxReps,
                rest_seconds: s.restSeconds,
                is_drop_set: s.isDropSet,
                is_to_failure: s.isToFailure,
                method_type: s.methodType || null,
                custom_method_name: s.customMethodName || null,
                drop_count: s.dropCount || null,
                rest_pause_sets: s.restPauseSets || null,
                rest_pause_seconds: s.restPauseSeconds || null,
                failure_type: s.failureType || null,
                order_index: sIdx,
                user_id: userId,
                is_deleted: s.isDeleted || pe.isDeleted || w.isDeleted || p.isDeleted || false
              });
            });
          });
        });
      });
      if (psToUpsert.length > 0) {
        const { error: psErr } = await supabase.from("planned_sets").upsert(psToUpsert);
        if (psErr) throw psErr;
      }

      const upsertedIds = localPlans.filter(p => !p.isDeleted).map(p => p.id);
      const next = [...syncedPlanIdsRef.current];
      upsertedIds.forEach(id => {
        if (!next.includes(id)) next.push(id);
      });
      syncedPlanIdsRef.current = next;
      localStorage.setItem("is_synced_plans_v1", JSON.stringify(next));
      return true;
    } catch (e) {
      console.error("pushPlansToSupabase error:", e);
      return false;
    }
  };

  const pullPlansFromSupabase = async (userId: string): Promise<Plan[]> => {
    try {
      const { data, error } = await supabase
        .from("plans")
        .select(`
          id, name,
          workouts (
            id, name, order_index, is_deleted,
            planned_exercises (
              id, exercise_id, order_index, is_deleted, superset_group_id,
              planned_sets (
                id, min_reps, max_reps, rest_seconds, is_drop_set, is_to_failure,
                method_type, custom_method_name, drop_count, rest_pause_sets, rest_pause_seconds, failure_type, order_index, is_deleted
              )
            )
          )
        `)
        .eq("user_id", userId)
        .eq("is_deleted", false);

      if (error) throw error;
      if (!data) return [];

      return data.map((p: any) => {
        const workouts = (p.workouts || [])
          .filter((w: any) => !w.is_deleted)
          .map((w: any) => {
            const exercises = (w.planned_exercises || [])
              .filter((pe: any) => !pe.is_deleted)
              .map((pe: any) => {
                const sets = (pe.planned_sets || [])
                  .filter((s: any) => !s.is_deleted)
                  .map((s: any) => ({
                    id: s.id,
                    minReps: s.min_reps,
                    maxReps: s.max_reps,
                    restSeconds: s.rest_seconds,
                    isDropSet: s.is_drop_set,
                    isToFailure: s.is_to_failure,
                    methodType: s.method_type,
                    customMethodName: s.custom_method_name,
                    dropCount: s.drop_count,
                    restPauseSets: s.rest_pause_sets,
                    restPauseSeconds: s.rest_pause_seconds,
                    failureType: s.failure_type,
                    order_index: s.order_index
                  })).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

                return {
                  id: pe.id,
                  exerciseId: pe.exercise_id,
                  sets,
                  order_index: pe.order_index,
                  supersetGroupId: pe.superset_group_id || undefined
                };
              }).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

            return {
              id: w.id,
              name: w.name,
              exercises,
              order_index: w.order_index
            };
          }).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

        return {
          id: p.id,
          name: p.name,
          workouts
        };
      });
    } catch (e) {
      console.error("pullPlansFromSupabase error:", e);
      return [];
    }
  };

  const pushHistoryToSupabase = async (userId: string, localHistory: HistoryLog[]) => {
    try {
      if (localHistory.length === 0) return;

      // 1. Upsert history logs (including soft-deleted ones)
      const logsToUpsert = localHistory.map(log => ({
        id: log.id,
        user_id: userId,
        name: log.name,
        date: log.date,
        duration_ms: log.durationMs,
        volume_kg: log.volumeKg,
        idle_time_ms: log.idleTimeMs || 0,
        prs: log.prs || [],
        workout_type: log.workoutType || "rotina",
        session_mode: log.sessionMode || "solo",
        partner1_name: log.partner1Name || null,
        partner2_name: log.partner2Name || null,
        volume_kg_p1: log.volumeKgP1 || null,
        volume_kg_p2: log.volumeKgP2 || null,
        is_deleted: log.isDeleted || false
      }));
      let { error: lErr } = await supabase.from("history_logs").upsert(logsToUpsert);
      if (lErr) {
        // Fallback for legacy database schemas missing new columns
        const legacyLogsToUpsert = logsToUpsert.map(({ workout_type, session_mode, partner1_name, partner2_name, volume_kg_p1, volume_kg_p2, ...rest }) => rest);
        const { error: fallbackErr } = await supabase.from("history_logs").upsert(legacyLogsToUpsert);
        if (fallbackErr) throw fallbackErr;
      }

      // 2. Upsert log exercises and sets only for active (non-deleted) logs
      const activeLogs = localHistory.filter(log => !log.isDeleted);

      const exercisesToUpsert: any[] = [];
      activeLogs.forEach(log => {
        log.exercises.forEach((ex, exIdx) => {
          const hleId = `hle_${log.id}_${exIdx}`;
          exercisesToUpsert.push({
            id: hleId,
            history_log_id: log.id,
            name: ex.name,
            elapsed_seconds: ex.elapsedSeconds || 0,
            order_index: exIdx,
            superset_group_id: ex.supersetGroupId || null
          });
        });
      });
      if (exercisesToUpsert.length > 0) {
        const { error: exErr } = await supabase.from("history_log_exercises").upsert(exercisesToUpsert);
        if (exErr) throw exErr;
      }

      // 3. Upsert log sets
      const setsToUpsert: any[] = [];
      activeLogs.forEach(log => {
        log.exercises.forEach((ex, exIdx) => {
          const hleId = `hle_${log.id}_${exIdx}`;
          ex.sets.forEach((s, sIdx) => {
            const hlsId = `hls_${hleId}_${sIdx}`;
            setsToUpsert.push({
              id: hlsId,
              history_log_exercise_id: hleId,
              min_reps: s.minReps,
              max_reps: s.maxReps,
              is_drop_set: s.isDropSet,
              is_to_failure: s.isToFailure,
              weight: s.weight,
              reps: s.reps,
              weight_p2: s.weightP2 || null,
              reps_p2: s.repsP2 || null,
              completed_p2: s.completedP2 || false,
              method_type: s.methodType || null,
              custom_method_name: s.customMethodName || null,
              drop_count: s.dropCount || null,
              rest_pause_sets: s.restPauseSets || null,
              rest_pause_seconds: s.restPauseSeconds || null,
              failure_type: s.failureType || null,
              order_index: sIdx
            });
          });
        });
      });
      if (setsToUpsert.length > 0) {
        let { error: sErr } = await supabase.from("history_log_sets").upsert(setsToUpsert);
        if (sErr) {
          // Fallback if sets table missing P2 columns
          const legacySetsToUpsert = setsToUpsert.map(({ weight_p2, reps_p2, completed_p2, ...rest }) => rest);
          const { error: sFallbackErr } = await supabase.from("history_log_sets").upsert(legacySetsToUpsert);
          if (sFallbackErr) throw sFallbackErr;
        }
      }

      const upsertedIds = activeLogs.map(log => log.id);
      const next = [...syncedHistoryIdsRef.current];
      upsertedIds.forEach(id => {
        if (!next.includes(id)) next.push(id);
      });
      syncedHistoryIdsRef.current = next;
      localStorage.setItem("is_synced_history_v1", JSON.stringify(next));
    } catch (e) {
      console.error("pushHistoryToSupabase error:", e);
    }
  };

  const pullHistoryFromSupabase = async (userId: string): Promise<HistoryLog[]> => {
    try {
      let fetchedData: any[] | null = null;
      const { data, error } = await supabase
        .from("history_logs")
        .select(`
          id, name, date, duration_ms, volume_kg, workout_type, session_mode, partner1_name, partner2_name, volume_kg_p1, volume_kg_p2,
          history_log_exercises (
            id, name, elapsed_seconds, order_index, superset_group_id,
            history_log_sets (
              id, min_reps, max_reps, is_drop_set, is_to_failure, weight, reps, weight_p2, reps_p2, completed_p2,
              method_type, custom_method_name, drop_count, rest_pause_sets, rest_pause_seconds, failure_type, order_index
            )
          )
        `)
        .eq("user_id", userId)
        .eq("is_deleted", false);

      if (error) {
        // Fallback query if history_logs table doesn't have workout_type / dual columns yet
        const res = await supabase
          .from("history_logs")
          .select(`
            id, name, date, duration_ms, volume_kg,
            history_log_exercises (
              id, name, elapsed_seconds, order_index, superset_group_id,
              history_log_sets (
                id, min_reps, max_reps, is_drop_set, is_to_failure, weight, reps,
                method_type, custom_method_name, drop_count, rest_pause_sets, rest_pause_seconds, failure_type, order_index
              )
            )
          `)
          .eq("user_id", userId)
          .eq("is_deleted", false);
        fetchedData = res.data;
        if (res.error) throw res.error;
      } else {
        fetchedData = data;
      }
      if (!fetchedData) return [];

      return fetchedData.map((log: any) => {
        const exercises = (log.history_log_exercises || []).map((ex: any) => {
          const sets = (ex.history_log_sets || []).map((s: any) => ({
            minReps: s.min_reps,
            maxReps: s.max_reps,
            isDropSet: s.is_drop_set,
            isToFailure: s.is_to_failure,
            weight: s.weight,
            reps: s.reps,
            weightP2: s.weight_p2 || undefined,
            repsP2: s.reps_p2 || undefined,
            completedP2: s.completed_p2 || false,
            methodType: s.method_type,
            customMethodName: s.custom_method_name,
            dropCount: s.drop_count,
            restPauseSets: s.rest_pause_sets,
            restPauseSeconds: s.rest_pause_seconds,
            failureType: s.failure_type,
            order_index: s.order_index
          })).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

          return {
            name: ex.name,
            elapsedSeconds: ex.elapsed_seconds,
            supersetGroupId: ex.superset_group_id || undefined,
            sets,
            order_index: ex.order_index
          };
        }).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

        return {
          id: log.id,
          name: log.name,
          date: parseInt(log.date) || Date.now(),
          durationMs: log.duration_ms,
          volumeKg: log.volume_kg,
          idleTimeMs: log.idle_time_ms || 0,
          prs: log.prs || [],
          workoutType: log.workout_type || "rotina",
          sessionMode: log.session_mode || "solo",
          partner1Name: log.partner1_name || undefined,
          partner2Name: log.partner2_name || undefined,
          volumeKgP1: log.volume_kg_p1 || undefined,
          volumeKgP2: log.volume_kg_p2 || undefined,
          exercises
        };
      });
    } catch (e) {
      console.error("pullHistoryFromSupabase error:", e);
      return [];
    }
  };

  const pushFocusedExercisesToSupabase = async (userId: string, localFocus: string[]) => {
    try {
      // Delete all user's focused exercises first, then insert remaining
      const { error: delErr } = await supabase
        .from("focused_exercises")
        .delete()
        .eq("user_id", userId);
      if (delErr) throw delErr;

      if (localFocus.length === 0) return;

      const focusToUpsert = localFocus.map(name => ({
        user_id: userId,
        exercise_name: name
      }));
      const { error: upErr } = await supabase.from("focused_exercises").upsert(focusToUpsert);
      if (upErr) throw upErr;
    } catch (e) {
      console.error("pushFocusedExercisesToSupabase error:", e);
    }
  };

  const pullFocusedExercisesFromSupabase = async (userId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from("focused_exercises")
        .select("exercise_name")
        .eq("user_id", userId);

      if (error) throw error;
      if (!data) return [];
      return data.map((item: any) => item.exercise_name);
    } catch (e) {
      console.error("pullFocusedExercisesFromSupabase error:", e);
      return [];
    }
  };

  const syncAllData = async (currentUser: SupabaseUser) => {
    setSyncStatus("syncing");
    isSyncingFromRemoteRef.current = true;
    try {
      // 1. PULL & MERGE Exercises (Server-First)
      const pulledCustom = await pullCustomExercisesFromSupabase(currentUser.id);
      let exercisesToPush: ExerciseDef[] = [];
      setExercises(prev => {
        const pulledIds = pulledCustom.map(pe => pe.id);
        // Clean up soft-deleted exercises from local state
        const filteredPrev = prev.filter(ex => {
          if (ex.isDeleted) return false;
          if (!ex.id.startsWith("ex_")) return true;
          const wasSynced = syncedExerciseIdsRef.current.includes(ex.id);
          const isPulled = pulledIds.includes(ex.id);
          if (wasSynced && !isPulled) return false;
          return true;
        });

        const merged = [...filteredPrev];
        pulledCustom.forEach(pe => {
          if (!merged.some(me => me.id === pe.id)) {
            merged.push(pe);
          }
        });

        const newSyncedIds = merged.filter(ex => ex.id.startsWith("ex_") && pulledIds.includes(ex.id)).map(ex => ex.id);
        syncedExerciseIdsRef.current = newSyncedIds;
        localStorage.setItem("is_synced_exercises_v1", JSON.stringify(newSyncedIds));
        exercisesToPush = ensureDefaultExercises(merged);
        return exercisesToPush;
      });
      // PUSH unsynced custom exercises
      if (exercisesToPush.length > 0) {
        await pushCustomExercisesToSupabase(currentUser.id, exercisesToPush);
      }

      // 2. PULL & MERGE Plans (Server-First)
      const pulledPlans = await pullPlansFromSupabase(currentUser.id);
      let plansToPush: Plan[] = [];
      setPlans(prev => {
        const pulledIds = pulledPlans.map(pp => pp.id);
        // Clean up soft-deleted plans and sub-elements from local state
        const filteredPrev = prev
          .filter(p => {
            if (p.isDeleted) return false;
            const wasSynced = syncedPlanIdsRef.current.includes(p.id);
            const isPulled = pulledIds.includes(p.id);
            if (wasSynced && !isPulled) return false;
            return true;
          })
          .map(p => ({
            ...p,
            workouts: p.workouts
              .filter(w => !w.isDeleted)
              .map(w => ({
                ...w,
                exercises: w.exercises
                  .filter(ex => !ex.isDeleted)
                  .map(ex => ({
                    ...ex,
                    sets: ex.sets.filter(s => !s.isDeleted)
                  }))
              }))
          }));

        // Server version takes priority for matching IDs
        const mergedMap = new Map(filteredPrev.map(p => [p.id, p]));
        pulledPlans.forEach(pp => {
          mergedMap.set(pp.id, pp);
        });
        const merged = Array.from(mergedMap.values());

        const newSyncedIds = merged.filter(p => pulledIds.includes(p.id)).map(p => p.id);
        syncedPlanIdsRef.current = newSyncedIds;
        localStorage.setItem("is_synced_plans_v1", JSON.stringify(newSyncedIds));

        // Auto-select active plan if null or invalid
        const validPlans = merged.filter(p => !p.isDeleted);
        setActivePlanId(currentActive => {
          if (currentActive && validPlans.some(p => p.id === currentActive)) {
            return currentActive;
          }
          return validPlans.length > 0 ? validPlans[0].id : null;
        });

        plansToPush = merged;
        return merged;
      });

      // PUSH unsynced/merged plans back to server
      if (plansToPush.length > 0) {
        await pushPlansToSupabase(currentUser.id, plansToPush);
      }

      // 3. PULL & MERGE History Logs (Server-First)
      const pulledHistory = await pullHistoryFromSupabase(currentUser.id);
      let historyToPush: HistoryLog[] = [];
      setHistory(prev => {
        const pulledIds = pulledHistory.map(ph => ph.id);
        // Clean up soft-deleted history logs from local state
        const filteredPrev = prev.filter(log => {
          if (log.isDeleted) return false;
          const wasSynced = syncedHistoryIdsRef.current.includes(log.id);
          const isPulled = pulledIds.includes(log.id);
          if (wasSynced && !isPulled) return false;
          return true;
        });

        const merged = [...filteredPrev];
        pulledHistory.forEach(ph => {
          if (!merged.some(mh => mh.id === ph.id)) {
            merged.push(ph);
          }
        });

        const newSyncedIds = merged.filter(log => pulledIds.includes(log.id)).map(log => log.id);
        syncedHistoryIdsRef.current = newSyncedIds;
        localStorage.setItem("is_synced_history_v1", JSON.stringify(newSyncedIds));
        historyToPush = merged.sort((a, b) => b.date - a.date);
        return historyToPush;
      });

      // PUSH unsynced history logs back to server
      if (historyToPush.length > 0) {
        await pushHistoryToSupabase(currentUser.id, historyToPush);
      }

      // 4. PULL & MERGE Focus (Server-First)
      const pulledFocus = await pullFocusedExercisesFromSupabase(currentUser.id);
      let focusToPush: string[] = [];
      setFocusedExercises(prev => {
        const merged = [...prev];
        pulledFocus.forEach(pf => {
          if (!merged.includes(pf)) {
            merged.push(pf);
          }
        });
        focusToPush = merged;
        return merged;
      });

      if (focusToPush.length > 0) {
        await pushFocusedExercisesToSupabase(currentUser.id, focusToPush);
      }

      setLastSyncedTime(Date.now());
      setSyncStatus("synced");
    } catch (err) {
      console.error("Erro geral na sincronização:", err);
      setSyncStatus("error");
    } finally {
      setTimeout(() => {
        isSyncingFromRemoteRef.current = false;
      }, 500);
    }
  };

  // Trigger sync on load/user login
  useEffect(() => {
    if (user && isLoaded) {
      syncAllData(user);
    }
  }, [user, isLoaded]);

  // Re-sync on tab visibility or window focus (crucial for mobile when unlocking phone or reopening browser)
  useEffect(() => {
    if (!user || !isLoaded) return;

    const handleFocusOrVisible = () => {
      if (document.visibilityState === "visible" && !isSyncingFromRemoteRef.current) {
        syncAllData(user);
      }
    };

    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    return () => {
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    };
  }, [user, isLoaded]);

  // Supabase Broadcast & Realtime Listener for Sync
  useEffect(() => {
    if (!user || !isLoaded) return;

    const channel = supabase.channel(`sync-${user.id}`, {
      config: {
        broadcast: { self: false },
      },
    });

    broadcastChannelRef.current = channel;

    channel
      .on("broadcast", { event: "data_changed" }, async () => {
        if (!isSyncingFromRemoteRef.current) {
          syncAllData(user);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      broadcastChannelRef.current = null;
    };
  }, [user, isLoaded]);

  const handleAuthAction = async () => {
    setSyncStatus("syncing");
    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
        setUser(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
        setUser(data.user);
        setDialog({
          title: "Conta Criada!",
          message: "Sua conta foi criada. Se um e-mail de confirmação foi exigido, confirme-o para liberar o sincronismo."
        });
      }
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      console.error(err);
      setSyncStatus("error");
      setDialog({
        title: "Erro de Autenticação",
        message: err.message || "Falha ao processar autenticação."
      });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSyncStatus("idle");
      setLastSyncedTime(null);
      setIsAuthModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleForceSync = () => {
    if (user) {
      syncAllData(user);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("is_exercises_v3", JSON.stringify(exercises));
    if (user && !isSyncingFromRemoteRef.current) {
      pushCustomExercisesToSupabase(user.id, exercises).then(() => {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.send({
            type: "broadcast",
            event: "data_changed",
            payload: { table: "exercises" },
          });
        }
      });
    }
  }, [exercises, isLoaded, user]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("is_plans_v3", JSON.stringify(plans));
    if (user && !isSyncingFromRemoteRef.current) {
      pushPlansToSupabase(
        user.id,
        plans
      ).then((success) => {
        if (success && broadcastChannelRef.current) {
          broadcastChannelRef.current.send({
            type: "broadcast",
            event: "data_changed",
            payload: { table: "plans" },
          });
        }
      });
    }
  }, [plans, isLoaded, user]);

  useEffect(() => {
    if (!isLoaded) return;
    if (activePlanId) {
      localStorage.setItem("is_active_plan_v3", activePlanId);
    } else {
      localStorage.removeItem("is_active_plan_v3");
    }
  }, [activePlanId, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (editingPlan) {
      localStorage.setItem("is_editing_plan_v3", JSON.stringify(editingPlan));
    } else {
      localStorage.removeItem("is_editing_plan_v3");
    }
  }, [editingPlan, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("is_history_v4", JSON.stringify(history));
    if (user && !isSyncingFromRemoteRef.current) {
      pushHistoryToSupabase(user.id, history).then(() => {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.send({
            type: "broadcast",
            event: "data_changed",
            payload: { table: "history_logs" },
          });
        }
      });
    }
  }, [history, isLoaded, user]);

  useEffect(() => {
    if (!isLoaded) return;
    if (activeWorkout) {
      localStorage.setItem("is_active_workout_v4", JSON.stringify(activeWorkout));
    } else {
      localStorage.removeItem("is_active_workout_v4");
    }
  }, [activeWorkout, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("is_focused_exercises_v1", JSON.stringify(focusedExercises));
    if (user && !isSyncingFromRemoteRef.current) {
      pushFocusedExercisesToSupabase(user.id, focusedExercises).then(() => {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.send({
            type: "broadcast",
            event: "data_changed",
            payload: { table: "focused_exercises" },
          });
        }
      });
    }
  }, [focusedExercises, isLoaded, user]);

  // Reset active workout index when active plan changes
  useEffect(() => {
    setActiveWorkoutIndex(0);
  }, [activePlanId]);

  // Active session timer
  const activeWorkoutRef = useRef<ActiveWorkoutSession | null>(null);
  useEffect(() => {
    activeWorkoutRef.current = activeWorkout;
  }, [activeWorkout]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeWorkout) {
      interval = setInterval(() => {
        const currentWorkout = activeWorkoutRef.current;
        if (!currentWorkout) return;
        const now = Date.now();

        if (currentWorkout.isPaused) {
          setElapsedTime(currentWorkout.pauseStartTime! - currentWorkout.startTime - currentWorkout.totalIdleTimeMs);
          return;
        }

        setElapsedTime(now - currentWorkout.startTime - currentWorkout.totalIdleTimeMs);

        // Check for Auto-Pause (5 minutes of inactivity)
        const IDLE_THRESHOLD = 5 * 60 * 1000;
        if (now - currentWorkout.lastInteractionTime > IDLE_THRESHOLD) {
          setActiveWorkout(prev => prev ? { ...prev, isPaused: true, pauseStartTime: now } : null);
          return;
        }

        // Only increment active exercise time if rest timer is not running
        if (!restTimerRef.current) {
          setActiveWorkout(prev => {
            if (!prev) return null;
            if (prev.isPaused) return prev;
            const activeIdx = prev.exercises.findIndex(ae => ae.sets.some(s => !s.completed));
            const resolvedIdx = activeIdx === -1 ? prev.exercises.length - 1 : activeIdx;
            if (resolvedIdx < 0 || resolvedIdx >= prev.exercises.length) return prev;
            return {
              ...prev,
              exercises: prev.exercises.map((ex, idx) => {
                if (idx === resolvedIdx) {
                  return { ...ex, elapsedSeconds: (ex.elapsedSeconds || 0) + 1 };
                }
                return ex;
              })
            };
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeWorkout ? activeWorkout.startTime : null]);

  // Rest countdown timer (high frequency for millisecond/centisecond telemetry)
  useEffect(() => {
    let animationFrameId: number;
    if (restTimer) {
      const update = () => {
        const now = Date.now();
        const diff = restTimer.endTime - now;
        if (diff <= 0) {
          setRestTimer(null);
          setRestRemainingMs(0);
        } else {
          setRestRemainingMs(diff);
          animationFrameId = requestAnimationFrame(update);
        }
      };
      animationFrameId = requestAnimationFrame(update);
    } else {
      setRestRemainingMs(0);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [restTimer]);
  // Stopwatch timer (for Time-based exercises)
  useEffect(() => {
    let animationFrameId: number;
    if (activeStopwatchSetId && activeStopwatchStartTime) {
      const update = () => {
        setActiveStopwatchElapsedMs(Date.now() - activeStopwatchStartTime);
        animationFrameId = requestAnimationFrame(update);
      };
      animationFrameId = requestAnimationFrame(update);
    } else {
      setActiveStopwatchElapsedMs(0);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeStopwatchSetId, activeStopwatchStartTime]);

  // Auto-scroll active exercise to top when rest timer ends or is skipped
  const prevRestTimerRef = useRef<any>(null);
  useEffect(() => {
    if (prevRestTimerRef.current && !restTimer && activeWorkout) {
      setTimeout(() => {
        const activeExEl = document.querySelector('[data-active-exercise="true"]');
        if (activeExEl) {
          activeExEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
    prevRestTimerRef.current = restTimer;
  }, [restTimer, activeWorkout]);

  // --------------------------------------------------------------------------
  // WAKE LOCK API (Previne a tela de apagar durante o treino)
  // --------------------------------------------------------------------------
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const shouldKeepAwake = activeWorkout !== null && !activeWorkout.isPaused;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && shouldKeepAwake) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldKeepAwake) {
        requestWakeLock();
      }
    };

    if (shouldKeepAwake) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
          .then(() => { wakeLockRef.current = null; })
          .catch(() => {});
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
          .then(() => { wakeLockRef.current = null; })
          .catch(() => {});
      }
    };
  }, [activeWorkout !== null, activeWorkout?.isPaused]);

  // Format Elapsed Time (ms -> MM:SS)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Format Rest Countdown Time (ms -> MM:SS.CC)
  const formatRestTime = (ms: number) => {
    if (ms < 0) ms = 0;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    
    const mm = minutes.toString().padStart(2, "0");
    const ss = seconds.toString().padStart(2, "0");
    const cc = centiseconds.toString().padStart(2, "0");
    return `${mm}:${ss}.${cc}`;
  };

  const handleAddRestTime = (seconds: number) => {
    setRestTimer(prev => {
      if (!prev) return null;
      return {
        ...prev,
        duration: prev.duration + seconds,
        endTime: prev.endTime + seconds * 1000
      };
    });
  };

  const renderSyncButton = () => {
    return (
      <button
        onClick={() => {
          if (user) {
            syncAllData(user);
          } else {
            setIsAuthModalOpen(true);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsAuthModalOpen(true);
        }}
        className="p-2 text-concrete hover:text-white transition-colors relative flex items-center justify-center rounded-xl bg-concrete/5 border border-concrete/10 hover:border-vulcanico"
        title={user ? "Clique para sincronizar agora com a Nuvem (ou botão direito para Login/Conta)" : "Configurações de Sincronismo"}
      >
        {syncStatus === "syncing" ? (
          <RefreshCw size={16} className="text-vulcanico animate-spin" />
        ) : user ? (
          syncStatus === "error" ? (
            <CloudOff size={16} className="text-red-500" />
          ) : (
            <Cloud size={16} className="text-vulcanico" />
          )
        ) : (
          <CloudOff size={16} className="text-concrete" />
        )}
      </button>
    );
  };

  // --- ACTIONS: EXERCISE LIBRARY ---
  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExerciseName.trim()) return;

    const newEx: ExerciseDef = {
      id: `ex_${generateId()}`,
      name: newExerciseName.trim(),
      muscle: newExerciseMuscle
    };

    setExercises(prev => [...prev, newEx]);
    setNewExerciseName("");
  };

  const handleImportExercises = () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n');
    const parsedExs: ExerciseDef[] = [];
    
    // Check if the first line is likely a header. If so, skip it.
    let startIndex = 0;
    if (lines.length > 0) {
      const firstLineLower = lines[0].toLowerCase();
      if (firstLineLower.includes("nome") && firstLineLower.includes("músculo") || firstLineLower.includes("musculo")) {
        startIndex = 1;
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split('\t');
      // Esperado: Nome | Musculo | Equipamento | Dificuldade | Categoria | Mecânica | Secundários
      if (cols.length >= 2) {
        const name = cols[0]?.trim();
        const muscle = cols[1]?.trim() || "Geral";
        if (name) {
          const newEx: ExerciseDef = {
            id: `ex_${generateId()}`,
            name: name,
            muscle: muscle,
            equipment: cols[2]?.trim() || undefined,
            difficultyLevel: cols[3]?.trim() || undefined,
            exerciseCategory: cols[4]?.trim() || undefined,
            mechanicType: cols[5]?.trim() || undefined,
            secondaryMuscles: cols[6] ? cols[6].split(',').map(s => s.trim()).filter(Boolean) : [],
          };
          parsedExs.push(newEx);
        }
      }
    }

    if (parsedExs.length > 0) {
      setExercises(prev => [...prev, ...parsedExs]);
      setImportText("");
      setIsImportModalOpen(false);
      showToast(`${parsedExs.length} exercícios importados com sucesso!`, 'success');
    } else {
      showToast("Nenhum exercício válido foi encontrado. Verifique o formato e tente novamente.", 'error');
    }
  };

  const toggleVisibleField = (field: string, checked: boolean) => {
    if (!editingExercise) return;
    const current = editingExercise.visibleFields || [];
    setEditingExercise({
      ...editingExercise,
      visibleFields: checked ? [...current, field] : current.filter(f => f !== field)
    });
  };

  const handleSaveExerciseDetails = async () => {
    if (!editingExercise) return;
    
    setIsUploadingMedia(true);
    let videoUrl = editingExercise.videoUrl;
    let thumbnailUrl = editingExercise.thumbnailUrl;

    try {
      if (editingExerciseVideoFile) {
        const ext = editingExerciseVideoFile.name.split('.').pop();
        const filePath = `videos/${generateId()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("exercise_media").upload(filePath, editingExerciseVideoFile);
        if (!uploadErr) {
          const { data } = supabase.storage.from("exercise_media").getPublicUrl(filePath);
          videoUrl = data.publicUrl;
        }
      }

      if (editingExerciseThumbnailFile) {
        const ext = editingExerciseThumbnailFile.name.split('.').pop();
        const filePath = `thumbnails/${generateId()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("exercise_media").upload(filePath, editingExerciseThumbnailFile);
        if (!uploadErr) {
          const { data } = supabase.storage.from("exercise_media").getPublicUrl(filePath);
          thumbnailUrl = data.publicUrl;
        }
      }
    } catch (err) {
      console.error("Error uploading media:", err);
    }

    const updatedEx: ExerciseDef = {
      ...editingExercise,
      videoUrl,
      thumbnailUrl,
    };

    setExercises(prev => prev.map(ex => ex.id === updatedEx.id ? updatedEx : ex));
    setEditingExercise(null);
    setEditingExerciseVideoFile(null);
    setEditingExerciseThumbnailFile(null);
    setIsUploadingMedia(false);
  };

  const handleDeleteExercise = (id: string) => {
    setDialog({
      title: "Excluir Exercício",
      message: "Deseja realmente excluir este exercício da biblioteca?",
      confirmText: "Excluir",
      onConfirm: () => {
        setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, isDeleted: true } : ex));
      }
    });
  };

  // --- ACTIONS: PLAN BUILDER ---
  const handleStartCreatePlan = () => {
    setEditingPlan({
      id: `plan_${generateId()}`,
      name: "",
      workouts: []
    });
    setAddingExerciseToWorkoutId(null);
    setConfiguringExercise(null);
    setActiveBuilderWorkoutIndex(0);
    setEditingWorkoutId(null);
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(JSON.parse(JSON.stringify(plan))); // Deep clone
    setAddingExerciseToWorkoutId(null);
    setConfiguringExercise(null);
    setActiveBuilderWorkoutIndex(0);
    setEditingWorkoutId(null);
  };

  const handleSavePlan = () => {
    if (!editingPlan) return;
    if (!editingPlan.name.trim()) {
      setDialog({
        title: "Nome do Plano Requerido",
        message: "Por favor, insira o nome do plano antes de salvar."
      });
      return;
    }

    setPlans(prev => {
      const idx = prev.findIndex(p => p.id === editingPlan.id);
      if (idx !== -1) {
        const oldPlan = prev[idx];

        const mergedWorkouts: WorkoutTemplate[] = [];

        // 1. Process workouts that are in the new editing plan
        editingPlan.workouts.forEach(newW => {
          const oldW = oldPlan.workouts.find(w => w.id === newW.id);
          if (!oldW) {
            mergedWorkouts.push(newW);
          } else {
            const mergedExercises: PlannedExercise[] = [];

            // 1.1 Process exercises in the new workout
            newW.exercises.forEach(newEx => {
              const oldEx = oldW.exercises.find(e => e.id === newEx.id);
              if (!oldEx) {
                mergedExercises.push(newEx);
              } else {
                const mergedSets: PlannedSet[] = [];

                // Process sets in new exercise
                newEx.sets.forEach(newS => {
                  mergedSets.push(newS);
                });

                // Find deleted sets in this exercise
                oldEx.sets.forEach(oldS => {
                  if (!newEx.sets.some(s => s.id === oldS.id)) {
                    mergedSets.push({ ...oldS, isDeleted: true });
                  }
                });

                mergedExercises.push({
                  ...newEx,
                  sets: mergedSets
                });
              }
            });

            // 1.2 Find deleted exercises in this workout
            oldW.exercises.forEach(oldEx => {
              if (!newW.exercises.some(e => e.id === oldEx.id)) {
                mergedExercises.push({
                  ...oldEx,
                  isDeleted: true,
                  sets: oldEx.sets.map(s => ({ ...s, isDeleted: true }))
                });
              }
            });

            mergedWorkouts.push({
              ...newW,
              exercises: mergedExercises
            });
          }
        });

        // 2. Process workouts that were deleted from the plan
        oldPlan.workouts.forEach(oldW => {
          if (!editingPlan.workouts.some(w => w.id === oldW.id)) {
            mergedWorkouts.push({
              ...oldW,
              isDeleted: true,
              exercises: oldW.exercises.map(ex => ({
                ...ex,
                isDeleted: true,
                sets: ex.sets.map(s => ({ ...s, isDeleted: true }))
              }))
            });
          }
        });

        const finalPlan = {
          ...editingPlan,
          workouts: mergedWorkouts
        };

        const copy = [...prev];
        copy[idx] = finalPlan;
        return copy;
      } else {
        return [...prev, editingPlan];
      }
    });

    setActivePlanId(editingPlan.id);
    setEditingPlan(null);
  };

  const handleDeletePlan = (planId: string) => {
    setDialog({
      title: "Excluir Plano",
      message: "Deseja realmente excluir este plano?",
      confirmText: "Excluir",
      onConfirm: () => {
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, isDeleted: true } : p));
        if (activePlanId === planId) {
          const remainingPlans = plans.filter(p => p.id !== planId && !p.isDeleted);
          setActivePlanId(remainingPlans.length > 0 ? remainingPlans[0].id : null);
        }
        showToast("Plano excluído com sucesso!", "success");
      }
    });
  };

  const handleAddWorkoutToBuilder = () => {
    if (!editingPlan) return;
    const newWorkout: WorkoutTemplate = {
      id: `wk_${generateId()}`,
      name: `Treino ${String.fromCharCode(65 + editingPlan.workouts.length)}`,
      exercises: []
    };
    setEditingPlan({
      ...editingPlan,
      workouts: [...editingPlan.workouts, newWorkout]
    });
    setEditingWorkoutId(newWorkout.id);
  };

  
  const handleMoveWorkout = (resultOrId: any, direction?: 'up' | 'down') => {
    if (!editingPlan) return;
    
    // Case 1: Direction-based reorder ('up' | 'down')
    if (typeof resultOrId === 'string' && direction) {
      const index = editingPlan.workouts.findIndex(w => w.id === resultOrId);
      if (index === -1) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= editingPlan.workouts.length) return;

      const newWorkouts = [...editingPlan.workouts];
      const [moved] = newWorkouts.splice(index, 1);
      newWorkouts.splice(targetIndex, 0, moved);

      setEditingPlan({
        ...editingPlan,
        workouts: newWorkouts
      });
      return;
    }

    // Case 2: Drag & Drop DropResult
    if (!resultOrId || !resultOrId.destination) return;
    const sourceIndex = resultOrId.source.index;
    const destinationIndex = resultOrId.destination.index;
    if (sourceIndex === destinationIndex) return;
    
    const newWorkouts = Array.from(editingPlan.workouts);
    const [moved] = newWorkouts.splice(sourceIndex, 1);
    newWorkouts.splice(destinationIndex, 0, moved);
    
    setEditingPlan({
      ...editingPlan,
      workouts: newWorkouts
    });
  };

  const handleMoveExerciseInWorkout = (workoutId: string, exerciseId: string, direction: 'up' | 'down') => {
    if (!editingPlan) return;
    const wIdx = editingPlan.workouts.findIndex(w => w.id === workoutId);
    if (wIdx === -1) return;

    const targetWorkout = editingPlan.workouts[wIdx];
    const exIdx = targetWorkout.exercises.findIndex(pe => pe.id === exerciseId);
    if (exIdx === -1) return;

    const targetExIdx = direction === 'up' ? exIdx - 1 : exIdx + 1;
    if (targetExIdx < 0 || targetExIdx >= targetWorkout.exercises.length) return;

    const newExercises = [...targetWorkout.exercises];
    const [moved] = newExercises.splice(exIdx, 1);
    newExercises.splice(targetExIdx, 0, moved);

    const updatedWorkout = {
      ...targetWorkout,
      exercises: newExercises
    };

    setEditingPlan({
      ...editingPlan,
      workouts: editingPlan.workouts.map((w, idx) => idx === wIdx ? updatedWorkout : w)
    });
  };

  const handleRemoveWorkoutFromBuilder = (workoutId: string) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      workouts: editingPlan.workouts.filter(w => w.id !== workoutId)
    });
  };

  const handleUpdateWorkoutNameInBuilder = (workoutId: string, name: string) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      workouts: editingPlan.workouts.map(w => w.id === workoutId ? { ...w, name } : w)
    });
  };

  const handleOpenAddExerciseToWorkout = (workoutId: string) => {
    setAddingExerciseToWorkoutId(workoutId);
    setExerciseSearchQuery("");
  };

  const handleAddExerciseToWorkout = (exerciseDefOrWorkoutId: any, exerciseDefParam?: ExerciseDef) => {
    if (!editingPlan) return;

    let exerciseDef: ExerciseDef;
    let targetWorkoutId: string | null = null;

    if (typeof exerciseDefOrWorkoutId === 'string') {
      targetWorkoutId = exerciseDefOrWorkoutId;
      exerciseDef = exerciseDefParam!;
    } else {
      exerciseDef = exerciseDefOrWorkoutId;
      targetWorkoutId = addingExerciseToWorkoutId || editingWorkoutId || (editingPlan.workouts[0]?.id || null);
    }

    if (!exerciseDef) return;

    let updatedWorkouts = [...editingPlan.workouts];

    // If plan has no workouts yet or target workout not found, auto-create a workout
    if (updatedWorkouts.length === 0 || (targetWorkoutId && !updatedWorkouts.some(w => w.id === targetWorkoutId))) {
      const newWkId = targetWorkoutId || `wk_${generateId()}`;
      const newWkName = `Treino ${String.fromCharCode(65 + updatedWorkouts.length)}`;
      const newWorkout: WorkoutTemplate = {
        id: newWkId,
        name: newWkName,
        exercises: []
      };
      updatedWorkouts.push(newWorkout);
      targetWorkoutId = newWkId;
      setEditingWorkoutId(newWkId);
    } else if (!targetWorkoutId && updatedWorkouts.length > 0) {
      targetWorkoutId = updatedWorkouts[0].id;
    }

    const plannedEx: PlannedExercise = {
      id: `pe_${generateId()}`,
      exerciseId: exerciseDef.id,
      sets: [
        { id: `ps_${generateId()}`, minReps: 8, maxReps: 12, isDropSet: false, isToFailure: false, restSeconds: 60 }
      ]
    };
    (plannedEx as any).plannedSets = plannedEx.sets;

    const nextWorkouts = updatedWorkouts.map(w => {
      if (w.id !== targetWorkoutId) return w;
      return {
        ...w,
        exercises: [...(w.exercises || []), plannedEx]
      };
    });

    setEditingPlan({
      ...editingPlan,
      workouts: nextWorkouts
    });

    if (addingExerciseToWorkoutId) {
      setAddingExerciseToWorkoutId(null);
      setConfiguringExercise({
        workoutId: targetWorkoutId!,
        exercise: plannedEx
      });
    }
  };

  const handleCreateAndAddExerciseInline = (name: string, muscle: string, targetWorkoutId?: string) => {
    if (!name.trim()) return;
    const newEx: ExerciseDef = {
      id: `ex_${generateId()}`,
      name: name.trim(),
      muscle: muscle || "Outros"
    };
    setExercises(prev => [...prev, newEx]);
    handleAddExerciseToWorkout(targetWorkoutId || addingExerciseToWorkoutId || editingWorkoutId, newEx);
  };

  const handleRemoveExerciseFromWorkout = (workoutId: string, plannedExId: string) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      workouts: editingPlan.workouts.map(w => {
        if (w.id !== workoutId) return w;
        return {
          ...w,
          exercises: w.exercises.filter(pe => pe.id !== plannedExId)
        };
      })
    });
  };

  const handleToggleConjugate = (workoutId: string, peId: string) => {
    if (!editingPlan) return;
    setEditingPlan(prev => {
      if (!prev) return null;
      return {
        ...prev,
        workouts: prev.workouts.map(w => {
          if (w.id !== workoutId) return w;
          const idx = w.exercises.findIndex(e => e.id === peId);
          if (idx === -1 || idx === w.exercises.length - 1) return w;
          
          const currentEx = w.exercises[idx];
          const nextEx = w.exercises[idx + 1];
          
          const isGrouped = !!(currentEx.supersetGroupId && nextEx.supersetGroupId && currentEx.supersetGroupId === nextEx.supersetGroupId);
          const newGroupId = isGrouped ? undefined : (currentEx.supersetGroupId || nextEx.supersetGroupId || `ss_${generateId()}`);
          
          return {
            ...w,
            exercises: w.exercises.map((e, eIdx) => {
              if (eIdx === idx || eIdx === idx + 1) {
                return { ...e, supersetGroupId: newGroupId };
              }
              return e;
            })
          };
        })
      };
    });
  };

  // --- ACTIONS: EXERCISE SET CONFIGURATION ---
  const handleSaveExerciseConfig = () => {
    if (!editingPlan || !configuringExercise) return;

    setEditingPlan({
      ...editingPlan,
      workouts: editingPlan.workouts.map(w => {
        if (w.id !== configuringExercise.workoutId) return w;
        return {
          ...w,
          exercises: w.exercises.map(pe => pe.id === configuringExercise.exercise.id ? configuringExercise.exercise : pe)
        };
      })
    });

    setConfiguringExercise(null);
  };

  const handleAddSetToConfig = () => {
    if (!configuringExercise) return;
    const sets = configuringExercise.exercise.sets;
    const firstSet = sets[0];

    const newSet: PlannedSet = {
      id: `ps_${generateId()}`,
      minReps: firstSet ? firstSet.minReps : 8,
      maxReps: firstSet ? firstSet.maxReps : 12,
      isDropSet: firstSet ? firstSet.isDropSet : false,
      isToFailure: firstSet ? firstSet.isToFailure : false,
      restSeconds: firstSet ? firstSet.restSeconds : 60,
      methodType: firstSet ? firstSet.methodType : undefined,
      customMethodName: firstSet ? firstSet.customMethodName : undefined,
      dropCount: firstSet ? firstSet.dropCount : undefined,
      restPauseSets: firstSet ? firstSet.restPauseSets : undefined,
      restPauseSeconds: firstSet ? firstSet.restPauseSeconds : undefined,
      failureType: firstSet ? firstSet.failureType : undefined
    };

    setConfiguringExercise({
      ...configuringExercise,
      exercise: {
        ...configuringExercise.exercise,
        sets: [...sets, newSet]
      }
    });
  };

  const handleRemoveSetFromConfig = (setId: string) => {
    if (!configuringExercise) return;
    const sets = configuringExercise.exercise.sets;
    if (sets.length <= 1) return;

    setConfiguringExercise({
      ...configuringExercise,
      exercise: {
        ...configuringExercise.exercise,
        sets: sets.filter(s => s.id !== setId)
      }
    });
  };

  const handleUpdateSetConfig = (setId: string, updates: Partial<PlannedSet>) => {
    setConfiguringExercise(prev => {
      if (!prev) return null;
      return {
        ...prev,
        exercise: {
          ...prev.exercise,
          sets: prev.exercise.sets.map(s => s.id === setId ? { ...s, ...updates } : s)
        }
      };
    });
  };

  const handleApplySetConfigToAll = (setId: string) => {
    if (!configuringExercise) return;
    const sourceSet = configuringExercise.exercise.sets.find(s => s.id === setId);
    if (!sourceSet) return;

    const updatedSets = configuringExercise.exercise.sets.map(s => ({
      ...s,
      minReps: sourceSet.minReps,
      maxReps: sourceSet.maxReps,
      isDropSet: sourceSet.isDropSet,
      isToFailure: sourceSet.isToFailure,
      restSeconds: sourceSet.restSeconds,
      methodType: sourceSet.methodType,
      customMethodName: sourceSet.customMethodName,
      dropCount: sourceSet.dropCount,
      restPauseSets: sourceSet.restPauseSets,
      restPauseSeconds: sourceSet.restPauseSeconds,
      failureType: sourceSet.failureType
    }));

    setConfiguringExercise({
      ...configuringExercise,
      exercise: {
        ...configuringExercise.exercise,
        sets: updatedSets
      }
    });
  };

  // --- ACTIONS: ACTIVE WORKOUT ---
  const handleStartWorkout = (workout: WorkoutTemplate, planName: string) => {
    setSelectedSessionMode("solo");
    const p1Default = partnerHistory[0] || "Atleta 1";
    const p2Default = partnerHistory[1] || "Atleta 2";
    setPartner1NameInput(p1Default);
    setPartner2NameInput(p2Default);
    setStartingWorkoutModal({ workout, planName });
  };

  const executeStartWorkout = (
    workout: WorkoutTemplate,
    planName: string,
    sessionMode: "solo" | "dual" = "solo",
    partner1Name: string = "Atleta 1",
    partner2Name: string = "Atleta 2"
  ) => {
    if (sessionMode === "dual") {
      savePartnerName(partner1Name);
      savePartnerName(partner2Name);
    }
    const session: ActiveWorkoutSession = {
      planId: activePlanId || "",
      workoutId: workout.id,
      name: `${planName} - ${workout.name}`,
      startTime: Date.now(),
      lastInteractionTime: Date.now(),
      totalIdleTimeMs: 0,
      sessionMode,
      partner1Name: sessionMode === "dual" ? partner1Name : undefined,
      partner2Name: sessionMode === "dual" ? partner2Name : undefined,
      exercises: workout.exercises.map(pe => {
        const exDef = exerciseMap[pe.exerciseId];
        let suggestedW: string | undefined = undefined;
        let suggestedR: string | undefined = undefined;
        let suggestedWP2: string | undefined = undefined;
        let suggestedRP2: string | undefined = undefined;
        let overloadSuggestion: string | undefined = undefined;

        if (exDef) {
          const p1Perf = getPartnerPerformance(exDef.name, sessionMode === "dual" ? partner1Name : undefined);
          const p2Perf = getPartnerPerformance(exDef.name, sessionMode === "dual" ? partner2Name : undefined);

          if (p1Perf.length > 0) {
            const lastP1 = p1Perf[0];
            suggestedW = lastP1.weight.toString();
            suggestedR = lastP1.reps.toString();

            if (p1Perf.length >= 2) {
              const prevP1 = p1Perf[1];
              if (lastP1.weight === prevP1.weight && lastP1.reps === prevP1.reps && lastP1.weight > 0) {
                const step = lastP1.weight >= 40 ? 5 : 2; // +5kg for heavy, +2kg for light
                const newWeight = lastP1.weight + step;
                suggestedW = newWeight.toString();
                overloadSuggestion = `Você já fez ${lastP1.reps}x ${lastP1.weight}kg por 2 treinos seguidos. Tentar ${newWeight}kg hoje?`;
              }
            }
          }

          if (p2Perf.length > 0) {
            const lastP2 = p2Perf[0];
            suggestedWP2 = lastP2.weight.toString();
            suggestedRP2 = lastP2.reps.toString();
          }
        }

        return {
          id: pe.id,
          exerciseId: pe.exerciseId,
          elapsedSeconds: 0,
          overloadSuggestion,
          supersetGroupId: pe.supersetGroupId,
          sets: pe.sets.map((ps, idx) => ({
            id: `as_${generateId()}`,
            minReps: ps.minReps,
            maxReps: ps.maxReps,
            isDropSet: ps.isDropSet,
            isToFailure: ps.isToFailure,
            restSeconds: ps.restSeconds,
            weight: "",
            reps: "",
            completed: false,
            weightP2: "",
            repsP2: "",
            completedP2: false,
            suggestedWeight: suggestedW,
            suggestedReps: suggestedR || (ps.maxReps ? ps.maxReps.toString() : ps.minReps ? ps.minReps.toString() : undefined),
            suggestedWeightP2: suggestedWP2 || suggestedW,
            suggestedRepsP2: suggestedRP2 || suggestedR || (ps.maxReps ? ps.maxReps.toString() : ps.minReps ? ps.minReps.toString() : undefined),
            methodType: ps.methodType,
            customMethodName: ps.customMethodName,
            dropCount: ps.dropCount,
            restPauseSets: ps.restPauseSets,
            restPauseSeconds: ps.restPauseSeconds,
            failureType: ps.failureType
          }))
        };
      })
    };

    setActiveWorkout(session);
    setElapsedTime(0);
    setRestTimer(null);
    setExpandedCompletedExercises({});
    setStartingWorkoutModal(null);
  };

  const handleUpdateActiveSet = (
    exerciseId: string,
    setId: string,
    field: "weight" | "reps" | "completed",
    value: any,
    partner: "p1" | "p2" = "p1",
    propagateToFollowing: boolean = false
  ) => {
    if (!activeWorkout) return;

    const isDual = activeWorkout.sessionMode === "dual";
    const targetField = partner === "p2"
      ? (field === "weight" ? "weightP2" : field === "reps" ? "repsP2" : "completedP2")
      : field;

    // Determine set completion state
    let justCompletedFully = false;
    let isLastSetOfWorkout = false;

    if (field === "completed") {
      let targetSet: any = null;
      let targetEx: any = null;
      
      activeWorkout.exercises.forEach(ex => {
        ex.sets.forEach(s => {
          if (s.id === setId) {
            targetSet = s;
            targetEx = ex;
          }
        });
      });

      if (targetSet && targetEx) {
        const wasSetFullyCompleted = isDual ? (targetSet.completed && targetSet.completedP2) : targetSet.completed;
        const willP1Complete = partner === "p1" ? value : targetSet.completed;
        const willP2Complete = partner === "p2" ? value : targetSet.completedP2;
        const willSetFullyComplete = isDual ? (willP1Complete && willP2Complete) : willP1Complete;

        if (willSetFullyComplete && !wasSetFullyCompleted) {
          justCompletedFully = true;
          isLastSetOfWorkout = activeWorkout.exercises.every(ex =>
            ex.sets.every(s => s.id === setId ? true : (isDual ? (s.completed && s.completedP2) : s.completed))
          );
        }
      }
    }

    setActiveWorkout(prev => {
      if (!prev) return null;
      return {
        ...prev,
        lastInteractionTime: Date.now(),
        exercises: prev.exercises.map((ex, exIndex) => {
          if (ex.id !== exerciseId) return ex;

          const currentSetIdx = ex.sets.findIndex(s => s.id === setId);

          const updatedSets = ex.sets.map((s, sIdx) => {
            if (s.id === setId) {
              // Check Superset Grouping
              const groupExercises = prev.exercises.filter(e => e.supersetGroupId && e.supersetGroupId === ex.supersetGroupId);
              const isSupersetGroup = groupExercises.length > 1;
              const currentGroupIdx = isSupersetGroup ? groupExercises.findIndex(e => e.id === ex.id) : -1;
              const isLastExerciseInSuperset = isSupersetGroup ? (currentGroupIdx === groupExercises.length - 1) : true;

              if (justCompletedFully && s.restSeconds > 0 && !isLastSetOfWorkout && isLastExerciseInSuperset) {
                const exDef = exerciseMap[ex.exerciseId];
                const setIndex = sIdx + 1;
                
                let nextExName: string | undefined = undefined;
                let nextExLastWeight: string | undefined = undefined;
                
                const isLastSetOfThisExercise = sIdx === ex.sets.length - 1;
                if (isLastSetOfThisExercise) {
                  const nextEx = prev.exercises[exIndex + 1];
                  if (nextEx) {
                    const nextExDef = exerciseMap[nextEx.exerciseId];
                    nextExName = nextExDef?.name;
                    
                    for (let i = 0; i < history.length; i++) {
                      const hLog = history[i];
                      const hEx = hLog.exercises.find(h => h.name === nextExName);
                      if (hEx && hEx.sets.length > 0) {
                        let maxW = 0;
                        hEx.sets.forEach(hs => {
                          const w = parseFloat(hs.weight) || 0;
                          if (w > maxW) maxW = w;
                        });
                        if (maxW > 0) nextExLastWeight = maxW.toString();
                        break;
                      }
                    }
                  }
                }

                setRestTimer({
                  duration: s.restSeconds,
                  endTime: Date.now() + s.restSeconds * 1000,
                  exerciseName: exDef?.name || "Exercício",
                  setIndex,
                  nextExerciseName: nextExName,
                  nextExerciseLastWeight: nextExLastWeight,
                  exerciseIndex: exIndex + 1,
                  totalExercises: prev.exercises.length
                });
              }

              return { ...s, [targetField]: value };
            }

            // Propagate changes to following incomplete sets if requested or when adjusting
            if (sIdx > currentSetIdx && currentSetIdx !== -1) {
              const isSetIncomplete = partner === "p2" ? !s.completedP2 : !s.completed;
              if (isSetIncomplete) {
                if (field === "weight") {
                  if (partner === "p2") {
                    return {
                      ...s,
                      suggestedWeightP2: value,
                      ...(propagateToFollowing ? { weightP2: value } : {})
                    };
                  } else {
                    return {
                      ...s,
                      suggestedWeight: value,
                      ...(propagateToFollowing ? { weight: value } : {})
                    };
                  }
                }
                if (field === "reps") {
                  if (partner === "p2") {
                    return {
                      ...s,
                      suggestedRepsP2: value,
                      ...(propagateToFollowing ? { repsP2: value } : {})
                    };
                  } else {
                    return {
                      ...s,
                      suggestedReps: value,
                      ...(propagateToFollowing ? { reps: value } : {})
                    };
                  }
                }
              }
            }

            return s;
          });

          // Auto-propagate weight and reps to subsequent sets as placeholders when clicking "completed"
          if (field === "completed" && value === true && currentSetIdx !== -1) {
            const completedWeight = partner === "p2" 
              ? (updatedSets[currentSetIdx]?.weightP2 || updatedSets[currentSetIdx]?.suggestedWeightP2) 
              : (updatedSets[currentSetIdx]?.weight || updatedSets[currentSetIdx]?.suggestedWeight);
            const completedReps = partner === "p2" 
              ? (updatedSets[currentSetIdx]?.repsP2 || updatedSets[currentSetIdx]?.suggestedRepsP2) 
              : (updatedSets[currentSetIdx]?.reps || updatedSets[currentSetIdx]?.suggestedReps);

            for (let i = currentSetIdx + 1; i < updatedSets.length; i++) {
              if (partner === "p1" && !updatedSets[i].completed) {
                if (!updatedSets[i].weight && completedWeight) updatedSets[i].suggestedWeight = completedWeight;
                if (!updatedSets[i].reps && completedReps) updatedSets[i].suggestedReps = completedReps;
              } else if (partner === "p2" && !updatedSets[i].completedP2) {
                if (!updatedSets[i].weightP2 && completedWeight) updatedSets[i].suggestedWeightP2 = completedWeight;
                if (!updatedSets[i].repsP2 && completedReps) updatedSets[i].suggestedRepsP2 = completedReps;
              }
            }
          }

          return { ...ex, sets: updatedSets };
        })
      };
    });

    if (isLastSetOfWorkout) {
      setTimeout(() => {
        setDialog({
          title: "Treino Concluído!",
          message: isDual 
            ? "Ambos os atletas concluíram a última série de todos os exercícios! Deseja finalizar o treino?"
            : "Você finalizou a última série de todos os exercícios. Deseja finalizar o treino?",
          confirmText: "Finalizar Treino",
          cancelText: "Voltar",
          onConfirm: () => {
            handleFinishWorkout();
          }
        });
      }, 300);
    }
  };

  const handleSkipExercise = (exerciseId: string) => {
    if (!activeWorkout) return;
    
    setActiveWorkout(prev => {
      if (!prev) return null;
      const exIndex = prev.exercises.findIndex(e => e.id === exerciseId);
      if (exIndex === -1) return prev;
      
      const newExercises = [...prev.exercises];
      const [skippedEx] = newExercises.splice(exIndex, 1);
      newExercises.push(skippedEx);
      
      return { ...prev, lastInteractionTime: Date.now(), exercises: newExercises };
    });
  };

  const handleAddActiveSet = (exerciseId: string) => {
    if (!activeWorkout) return;

    setActiveWorkout(prev => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;

          const firstSet = ex.sets[0];
          const lastSet = ex.sets[ex.sets.length - 1];
          const newSet: ActiveSet = {
            id: `as_${generateId()}`,
            minReps: firstSet ? firstSet.minReps : 8,
            maxReps: firstSet ? firstSet.maxReps : 12,
            isDropSet: firstSet ? firstSet.isDropSet : false,
            isToFailure: firstSet ? firstSet.isToFailure : false,
            restSeconds: firstSet ? firstSet.restSeconds : 60,
            weight: "",
            reps: "",
            completed: false,
            weightP2: "",
            repsP2: "",
            completedP2: false,
            suggestedWeight: lastSet?.weight || lastSet?.suggestedWeight || firstSet?.suggestedWeight,
            suggestedReps: lastSet?.reps || lastSet?.suggestedReps || firstSet?.suggestedReps,
            suggestedWeightP2: lastSet?.weightP2 || lastSet?.suggestedWeightP2 || firstSet?.suggestedWeightP2,
            suggestedRepsP2: lastSet?.repsP2 || lastSet?.suggestedRepsP2 || firstSet?.suggestedRepsP2,
            methodType: firstSet ? firstSet.methodType : undefined,
            customMethodName: firstSet ? firstSet.customMethodName : undefined,
            dropCount: firstSet ? firstSet.dropCount : undefined,
            restPauseSets: firstSet ? firstSet.restPauseSets : undefined,
            restPauseSeconds: firstSet ? firstSet.restPauseSeconds : undefined,
            failureType: firstSet ? firstSet.failureType : undefined
          };

          return { ...ex, sets: [...ex.sets, newSet] };
        })
      };
    });
  };

  const handleRemoveActiveSet = (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;
    setActiveWorkout(prev => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          if (ex.sets.length <= 1) return ex;
          return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
        })
      };
    });
  };

  const [addingExerciseToActiveWorkout, setAddingExerciseToActiveWorkout] = useState(false);
  const [replacingActiveExerciseId, setReplacingActiveExerciseId] = useState<string | null>(null);

  const handleReplaceExerciseInActiveWorkout = (arg1: any, arg2?: any) => {
    let targetActiveExId = replacingActiveExerciseId;
    let newDef: ExerciseDef | undefined;

    if (typeof arg1 === 'string' && arg2) {
      targetActiveExId = arg1;
      newDef = typeof arg2 === 'string' ? (exercises.find(e => e.id === arg2) || exerciseMap[arg2]) : arg2;
    } else if (typeof arg1 === 'string') {
      newDef = exercises.find(e => e.id === arg1) || exerciseMap[arg1];
    } else {
      newDef = arg1;
    }

    if (!activeWorkout || !targetActiveExId || !newDef) return;

    let suggestedW: string | undefined = undefined;
    let suggestedR: string | undefined = undefined;
    let suggestedWP2: string | undefined = undefined;
    let suggestedRP2: string | undefined = undefined;

    if (newDef) {
      const p1Perf = getPartnerPerformance(newDef.name, activeWorkout.sessionMode === "dual" ? activeWorkout.partner1Name : undefined);
      const p2Perf = getPartnerPerformance(newDef.name, activeWorkout.sessionMode === "dual" ? activeWorkout.partner2Name : undefined);
      if (p1Perf.length > 0) {
        suggestedW = p1Perf[0].weight.toString();
        suggestedR = p1Perf[0].reps.toString();
      }
      if (p2Perf.length > 0) {
        suggestedWP2 = p2Perf[0].weight.toString();
        suggestedRP2 = p2Perf[0].reps.toString();
      }
    }

    setActiveWorkout(prev => {
      if (!prev) return null;
      return {
        ...prev,
        lastInteractionTime: Date.now(),
        exercises: prev.exercises.map(ex => {
          if (ex.id !== targetActiveExId) return ex;

          // Reset set inputs but preserve targets and methods
          const updatedSets = ex.sets.map(s => ({
            ...s,
            completed: false,
            completedP2: false,
            weight: "",
            reps: "",
            weightP2: "",
            repsP2: "",
            suggestedWeight: suggestedW,
            suggestedReps: suggestedR || (s.maxReps ? s.maxReps.toString() : s.minReps ? s.minReps.toString() : undefined),
            suggestedWeightP2: suggestedWP2 || suggestedW,
            suggestedRepsP2: suggestedRP2 || suggestedR || (s.maxReps ? s.maxReps.toString() : s.minReps ? s.minReps.toString() : undefined)
          }));

          return {
            ...ex,
            exerciseId: newDef!.id,
            elapsedSeconds: 0,
            sets: updatedSets,
            overloadSuggestion: undefined
          };
        })
      };
    });

    setReplacingActiveExerciseId(null);
  };

  const handleAddExerciseToActiveWorkout = (exerciseInput: ExerciseDef | string) => {
    if (!activeWorkout) return;

    const exerciseDef = typeof exerciseInput === 'string'
      ? (exercises.find(e => e.id === exerciseInput) || exerciseMap[exerciseInput])
      : exerciseInput;

    const exId = exerciseDef?.id || (typeof exerciseInput === 'string' ? exerciseInput : `ex_${generateId()}`);

    let suggestedW: string | undefined = undefined;
    let suggestedR: string | undefined = undefined;
    let suggestedWP2: string | undefined = undefined;
    let suggestedRP2: string | undefined = undefined;

    if (exerciseDef) {
      const p1Perf = getPartnerPerformance(exerciseDef.name, activeWorkout.sessionMode === "dual" ? activeWorkout.partner1Name : undefined);
      const p2Perf = getPartnerPerformance(exerciseDef.name, activeWorkout.sessionMode === "dual" ? activeWorkout.partner2Name : undefined);
      if (p1Perf.length > 0) {
        suggestedW = p1Perf[0].weight.toString();
        suggestedR = p1Perf[0].reps.toString();
      }
      if (p2Perf.length > 0) {
        suggestedWP2 = p2Perf[0].weight.toString();
        suggestedRP2 = p2Perf[0].reps.toString();
      }
    }

    const newActiveEx: ActiveExercise = {
      id: `ae_${generateId()}`,
      exerciseId: exId,
      elapsedSeconds: 0,
      sets: [
        {
          id: `as_${generateId()}`,
          minReps: 8,
          maxReps: 12,
          isDropSet: false,
          isToFailure: false,
          restSeconds: 60,
          weight: "",
          reps: "",
          completed: false,
          weightP2: "",
          repsP2: "",
          completedP2: false,
          suggestedWeight: suggestedW,
          suggestedReps: suggestedR || "10",
          suggestedWeightP2: suggestedWP2 || suggestedW,
          suggestedRepsP2: suggestedRP2 || suggestedR || "10"
        }
      ]
    };

    setActiveWorkout({
      ...activeWorkout,
      lastInteractionTime: Date.now(),
      exercises: [...activeWorkout.exercises, newActiveEx]
    });
    setAddingExerciseToActiveWorkout(false);
  };

  const updatePlanWithActiveExercises = (planId: string, workoutId: string, activeExercises: ActiveExercise[]) => {
    setPlans(prevPlans => {
      const updatedPlans = prevPlans.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          workouts: p.workouts.map(w => {
            if (w.id !== workoutId) return w;
            const newPlannedExercises: PlannedExercise[] = activeExercises.map(ae => ({
              id: ae.id.startsWith("ae_") ? `pe_${generateId()}` : ae.id,
              exerciseId: ae.exerciseId,
              supersetGroupId: ae.supersetGroupId,
              sets: ae.sets.map(s => ({
                id: s.id.startsWith("as_") ? `ps_${generateId()}` : s.id,
                minReps: s.minReps || 8,
                maxReps: s.maxReps || 12,
                isDropSet: !!s.isDropSet,
                isToFailure: !!s.isToFailure,
                restSeconds: s.restSeconds || 60,
                methodType: s.methodType,
                customMethodName: s.customMethodName,
                dropCount: s.dropCount,
                restPauseSets: s.restPauseSets,
                restPauseSeconds: s.restPauseSeconds,
                failureType: s.failureType
              }))
            }));
            return {
              ...w,
              exercises: newPlannedExercises
            };
          })
        };
      });

      localStorage.setItem("is_plans_v3", JSON.stringify(updatedPlans));
      if (user) {
        pushPlansToSupabase(user.id, updatedPlans);
      }
      return updatedPlans;
    });
    showToast("Plano de treino atualizado com a nova sequência!", "success");
  };

  const handleFinishWorkout = () => {
    if (!activeWorkout) return;

    let totalVolume = 0;
    let volumeKgP1 = 0;
    let volumeKgP2 = 0;
    const isDual = activeWorkout.sessionMode === "dual";

    const completedExercises = activeWorkout.exercises.map(ae => {
      const exDef = exerciseMap[ae.exerciseId];
      const doneSets = ae.sets.filter(s => s.completed || (isDual && s.completedP2));

      const mappedSets = doneSets.map(s => {
        const resolvedWeight = (exDef?.isTimeBased || exDef?.isRepsOnly)
          ? ""
          : (s.weight || s.suggestedWeight || "0");
        const resolvedReps = s.reps || s.suggestedReps || "0";

        const w1 = parseFloat(resolvedWeight) || 0;
        const r1 = parseInt(resolvedReps) || 0;
        const vol1 = w1 * r1;
        totalVolume += vol1;
        volumeKgP1 += vol1;

        let resolvedWeightP2 = "";
        let resolvedRepsP2 = "";
        if (isDual) {
          resolvedWeightP2 = (exDef?.isTimeBased || exDef?.isRepsOnly)
            ? ""
            : (s.weightP2 || s.suggestedWeightP2 || "0");
          resolvedRepsP2 = s.repsP2 || s.suggestedRepsP2 || "0";

          const w2 = parseFloat(resolvedWeightP2) || 0;
          const r2 = parseInt(resolvedRepsP2) || 0;
          const vol2 = w2 * r2;
          totalVolume += vol2;
          volumeKgP2 += vol2;
        }

        return {
          minReps: s.minReps,
          maxReps: s.maxReps,
          isDropSet: s.isDropSet,
          isToFailure: s.isToFailure,
          weight: resolvedWeight,
          reps: resolvedReps,
          weightP2: isDual ? resolvedWeightP2 : undefined,
          repsP2: isDual ? resolvedRepsP2 : undefined,
          completedP2: isDual ? s.completedP2 : undefined,
          methodType: s.methodType,
          customMethodName: s.customMethodName,
          dropCount: s.dropCount,
          restPauseSets: s.restPauseSets,
          restPauseSeconds: s.restPauseSeconds,
          failureType: s.failureType
        };
      });

      return {
        name: exDef?.name || "Exercício",
        elapsedSeconds: ae.elapsedSeconds || 0,
        sets: mappedSets
      };
    }).filter(ex => ex.sets.length > 0);

    if (completedExercises.length > 0) {
      const prs: string[] = [];

      completedExercises.forEach(ce => {
        let currentMaxW = 0;
        ce.sets.forEach(s => {
          const w = parseFloat(s.weight) || 0;
          if (w > currentMaxW) currentMaxW = w;
        });

        let historyMaxW = 0;
        history.filter(log => !log.isDeleted).forEach(log => {
          log.exercises.forEach(he => {
            if (he.name === ce.name) {
              he.sets.forEach(hs => {
                const w = parseFloat(hs.weight) || 0;
                if (w > historyMaxW) historyMaxW = w;
              });
            }
          });
        });

        if (currentMaxW > historyMaxW && historyMaxW > 0) {
          prs.push(`${ce.name}: ${currentMaxW}kg`);
        } else if (currentMaxW > 0 && historyMaxW === 0) {
          prs.push(`${ce.name}: ${currentMaxW}kg (Primeiro registro)`);
        }
      });

      let finalIdleTime = activeWorkout.totalIdleTimeMs || 0;
      if (activeWorkout.isPaused && activeWorkout.pauseStartTime) {
        finalIdleTime += Date.now() - activeWorkout.pauseStartTime;
      }

      const newLog: HistoryLog = {
        id: `h_${generateId()}`,
        name: activeWorkout.name,
        date: activeWorkout.startTime,
        durationMs: Date.now() - activeWorkout.startTime - finalIdleTime,
        idleTimeMs: finalIdleTime,
        volumeKg: Math.round(totalVolume),
        prs,
        workoutType: activeWorkout.workoutType || "rotina",
        sessionMode: activeWorkout.sessionMode || "solo",
        partner1Name: activeWorkout.partner1Name,
        partner2Name: activeWorkout.partner2Name,
        volumeKgP1: isDual ? Math.round(volumeKgP1) : undefined,
        volumeKgP2: isDual ? Math.round(volumeKgP2) : undefined,
        exercises: completedExercises
      };

      const proceedToReview = () => {
        setReviewingWorkoutLog(newLog);
        
        const d = new Date(activeWorkout.startTime);
        // Adjust to local timezone to prevent offset issues with input type="date"
        const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const localTime = d.toTimeString().split(' ')[0].slice(0, 5); // HH:MM

        setReviewName(activeWorkout.name);
        setReviewDate(localDate);
        setReviewTime(localTime);
        setReviewDurationMins(Math.floor((Date.now() - activeWorkout.startTime - finalIdleTime) / 60000).toString());

        // Pause active workout while reviewing
        setActiveWorkout(prev => prev ? {
          ...prev,
          isPaused: true,
          pauseStartTime: prev.isPaused ? prev.pauseStartTime : Date.now()
        } : null);
      };

      const currentPlan = plans.find(p => p.id === activeWorkout.planId);
      const originalWorkout = currentPlan?.workouts.find(w => w.id === activeWorkout.workoutId);

      let isSequenceModified = false;
      if (originalWorkout) {
        if (originalWorkout.exercises.length !== activeWorkout.exercises.length) {
          isSequenceModified = true;
        } else {
          for (let i = 0; i < activeWorkout.exercises.length; i++) {
            if (activeWorkout.exercises[i].exerciseId !== originalWorkout.exercises[i].exerciseId) {
              isSequenceModified = true;
              break;
            }
          }
        }
      }

      if (isSequenceModified && originalWorkout && currentPlan) {
        setDialog({
          title: "Atualizar Plano de Treino?",
          message: `Você alterou a sequência de exercícios durante este treino. Deseja atualizar a rotina "${originalWorkout.name}" no plano "${currentPlan.name}" com essa nova sequência?`,
          confirmText: "Sim, Atualizar Plano",
          cancelText: "Não, Apenas Histórico",
          onConfirm: () => {
            updatePlanWithActiveExercises(activeWorkout.planId, activeWorkout.workoutId, activeWorkout.exercises);
            proceedToReview();
          },
          onCancel: () => {
            proceedToReview();
          }
        });
      } else {
        proceedToReview();
      }
    } else {
      // If no exercises completed, just cancel
      setActiveWorkout(null);
      setRestTimer(null);
    }
  };

  const handleDeleteHistoryLog = (logId: string) => {
    setDialog({
      title: "Excluir Treino",
      message: "Tem certeza que deseja excluir este treino do histórico?",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      onConfirm: () => {
        setHistory(prev => prev.map(log => log.id === logId ? { ...log, isDeleted: true } : log));
      }
    });
  };

  const handleCancelWorkout = () => {
    setDialog({
      title: "Cancelar Treino",
      message: "Deseja realmente cancelar o treino ativo? Todos os dados salvos nesta sessão serão perdidos.",
      confirmText: "Sim, Cancelar",
      onConfirm: () => {
        setActiveWorkout(null);
        setRestTimer(null);
      }
    });
  };

  // Helper for UI grouping (alphabetically sorted muscle categories and exercise names)
  const exercisesByMuscle = useMemo(() => {
    const grouped = exercises.filter(ex => !ex.isDeleted).reduce((acc, ex) => {
      if (!acc[ex.muscle]) acc[ex.muscle] = [];
      acc[ex.muscle].push(ex);
      return acc;
    }, {} as Record<string, ExerciseDef[]>);

    // Sort exercises within each group alphabetically
    Object.keys(grouped).forEach(muscle => {
      grouped[muscle].sort((a, b) => a.name.localeCompare(b.name));
    });

    // Sort muscle groups alphabetically
    const sortedGrouped: Record<string, ExerciseDef[]> = {};
    Object.keys(grouped).sort().forEach(muscle => {
      sortedGrouped[muscle] = grouped[muscle];
    });

    return sortedGrouped;
  }, [exercises]);

  // Search filter for exercise lists
  const filteredExercises = useMemo(() => exercises.filter(ex => !ex.isDeleted).filter(ex => 
    ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) || 
    ex.muscle.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
  ), [exercises, exerciseSearchQuery]);

  const filteredExercisesByMuscle = useMemo(() => {
    const grouped = filteredExercises.reduce((acc, ex) => {
      if (!acc[ex.muscle]) acc[ex.muscle] = [];
      acc[ex.muscle].push(ex);
      return acc;
    }, {} as Record<string, ExerciseDef[]>);

    // Sort exercises within each group alphabetically
    Object.keys(grouped).forEach(muscle => {
      grouped[muscle].sort((a, b) => a.name.localeCompare(b.name));
    });

    // Sort muscle groups alphabetically
    const sortedGrouped: Record<string, ExerciseDef[]> = {};
    Object.keys(grouped).sort().forEach(muscle => {
      sortedGrouped[muscle] = grouped[muscle];
    });

    return sortedGrouped;
  }, [filteredExercises]);

  // Flat alphabetical selectors
  const sortedExercisesFlat = useMemo(() => {
    return exercises.filter(ex => !ex.isDeleted).sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises]);

  const filteredExercisesFlat = useMemo(() => {
    return filteredExercises.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredExercises]);

  const activePlan = plans.find(p => p.id === activePlanId && !p.isDeleted);
  const activePlanWorkouts = useMemo(() => {
    if (!activePlan) return [];
    return activePlan.workouts.filter(w => !w.isDeleted);
  }, [activePlan]);

  // --- STATS COMPUTATIONS ---
  const statsData = useMemo(() => {
    const filteredLogs = history.filter(log => {
      if (log.isDeleted) return false;
      const logDate = new Date(log.date);
      const now = new Date();
      const diffMs = now.getTime() - logDate.getTime();
      if (statsPeriod === "week") return diffMs <= 7 * 24 * 60 * 60 * 1000;
      if (statsPeriod === "month") return diffMs <= 30 * 24 * 60 * 60 * 1000;
      if (statsPeriod === "year") return diffMs <= 365 * 24 * 60 * 60 * 1000;
      return true;
    });

    const muscleSets: Record<string, number> = {};
    let totalSetsAggregated = 0;
    const connections: Record<string, number> = {};
    const muscleTotalSets: Record<string, number> = {};

    filteredLogs.forEach(log => {
      const sessionMuscles = new Set<string>();
      log.exercises.forEach(ex => {
        const def = exerciseMapByName[ex.name];
        const muscle = def?.muscle || "Outros";
        const count = ex.sets.length;
        
        muscleSets[muscle] = (muscleSets[muscle] || 0) + count;
        totalSetsAggregated += count;

        sessionMuscles.add(muscle);
        muscleTotalSets[muscle] = (muscleTotalSets[muscle] || 0) + count;
      });

      const musclesArr = Array.from(sessionMuscles);
      for (let i = 0; i < musclesArr.length; i++) {
        for (let j = i + 1; j < musclesArr.length; j++) {
          const key = [musclesArr[i], musclesArr[j]].sort().join("-");
          connections[key] = (connections[key] || 0) + 1;
        }
      }
    });

    let accumulatedPercent = 0;
    const donutSlices = Object.entries(muscleSets).map(([muscle, count]) => {
      const percent = totalSetsAggregated > 0 ? (count / totalSetsAggregated) * 100 : 0;
      const strokeDasharray = `${percent} 100`;
      const strokeDashoffset = -accumulatedPercent;
      accumulatedPercent += percent;
      return {
        muscle,
        count,
        percent,
        strokeDasharray,
        strokeDashoffset,
        color: muscleColors[muscle] || "#6B7280"
      };
    });

    const linesToDraw: { x1: number; y1: number; x2: number; y2: number; weight: number; key: string }[] = [];
    Object.entries(connections).forEach(([key, weight]) => {
      const [m1, m2] = key.split("-");
      const pos1 = nodePositions[m1] || nodePositions["Outros"];
      const pos2 = nodePositions[m2] || nodePositions["Outros"];
      if (pos1 && pos2) {
        linesToDraw.push({
          x1: pos1.x,
          y1: pos1.y,
          x2: pos2.x,
          y2: pos2.y,
          weight,
          key
        });
      }
    });

    const nodesToDraw = Object.entries(nodePositions).map(([muscle, pos]) => {
      const sets = muscleTotalSets[muscle] || 0;
      const radius = 6 + Math.min(10, sets / 3);
      const color = muscleColors[muscle] || "#6B7280";
      return {
        muscle,
        pos,
        sets,
        radius,
        color
      };
    });

    return { filteredLogs, donutSlices, linesToDraw, nodesToDraw, totalSetsAggregated };
  }, [history, statsPeriod, exerciseMapByName]);

  const { filteredLogs, donutSlices, linesToDraw, nodesToDraw, totalSetsAggregated } = statsData;

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 bg-noturno flex items-center justify-center font-mono text-vulcanico uppercase text-xs">
        Carregando...
      </div>
    );
  }

  // --- ZERADO STATE (IF NO PLANS AT ALL AND NOT BUILDING) ---
  const isZerado = plans.filter(p => !p.isDeleted).length === 0 && !editingPlan && !activeWorkout;

  if (isZerado) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-noturno text-white p-6 select-none">
        <button 
          onClick={handleStartCreatePlan}
          className="group flex flex-col items-center gap-4 text-vulcanico hover:text-white transition-colors"
          id="btn-construir-plano"
        >
          <div className="w-24 h-24 border border-vulcanico group-hover:border-white flex items-center justify-center transition-colors">
            <Plus size={48} strokeWidth={1} />
          </div>
          <span className="font-display text-2xl uppercase tracking-widest leading-none">
            Construir Plano
          </span>
        </button>
      </div>
    );
  }

  const activeExerciseIndex = activeWorkoutState.activeExerciseIndex;
  const resolvedActiveExerciseIndex = activeWorkout && activeExerciseIndex === -1
    ? activeWorkout.exercises.length - 1
    : activeExerciseIndex;

  return (
    <div className="absolute inset-0 flex flex-row overflow-hidden bg-noturno text-white">
      <DesktopNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
      
      {/* -------------------- IMPORT MODAL -------------------- */}
      {isImportModalOpen && (
        <div className="absolute inset-0 z-50 bg-noturno flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex-none p-6 pb-4 border-b border-concrete/20 flex justify-between items-center bg-noturno z-10 shadow-md">
            <div>
              <span className="font-mono text-[10px] text-concrete uppercase tracking-widest">Ação em Lote</span>
              <h2 className="font-display text-3xl uppercase text-white leading-none mt-1">Importar (Planilha)</h2>
            </div>
            <button 
              onClick={() => {
                setIsImportModalOpen(false);
                setImportText("");
              }} 
              className="text-concrete hover:text-white transition-colors p-2"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <div className="bg-concrete/10 border border-concrete/20 rounded-xl p-4">
              <h3 className="font-mono text-xs uppercase text-white font-bold mb-2">Instruções:</h3>
              <p className="font-mono text-[10px] text-concrete mb-3 leading-relaxed">
                Copie a tabela do seu Excel ou Google Sheets contendo seus exercícios e cole na caixa abaixo.
              </p>
              <p className="font-mono text-[10px] text-white font-bold mb-1">A ordem das colunas esperada é:</p>
              <div className="bg-noturno p-2 rounded border border-concrete/10 overflow-x-auto whitespace-nowrap">
                <code className="font-mono text-[9px] text-concrete">
                  NOME | MUSCULO | EQUIPAMENTO | DIFICULDADE | CATEGORIA | MECÂNICA | SECUNDÁRIOS
                </code>
              </div>
            </div>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Cole os dados da planilha aqui (Ctrl+V)..."
              className="flex-1 min-h-[300px] bg-concrete/5 border border-concrete/20 rounded-xl p-4 font-mono text-[10px] text-white focus:outline-none focus:border-vulcanico transition-colors resize-none whitespace-pre"
            />
          </div>

          <div className="flex-none p-6 bg-noturno border-t border-concrete/20">
            <button 
              onClick={handleImportExercises}
              disabled={!importText.trim()}
              className="w-full bg-vulcanico hover:bg-white text-noturno font-display text-xl uppercase py-4 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              Processar e Importar
            </button>
          </div>
        </div>
      )}
      {/* -------------------- EDIT EXERCISE MODAL -------------------- */}
      {editingExercise && (
        <div className="absolute inset-0 z-50 bg-noturno flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex-none p-6 pb-4 border-b border-concrete/20 flex justify-between items-center bg-noturno z-10 shadow-md">
            <div className="flex flex-col flex-1 mr-4">
              <input
                type="text"
                value={editingExercise.muscle}
                onChange={(e) => setEditingExercise({...editingExercise, muscle: e.target.value})}
                className="font-mono text-[10px] text-concrete uppercase tracking-widest bg-transparent border-b border-transparent hover:border-concrete/30 focus:border-vulcanico focus:outline-none transition-colors w-1/2 p-0"
              />
              <input 
                type="text" 
                value={editingExercise.name} 
                onChange={(e) => setEditingExercise({...editingExercise, name: e.target.value})}
                className="font-display text-2xl sm:text-3xl uppercase text-white leading-tight mt-1 bg-transparent border-b border-transparent hover:border-concrete/30 focus:border-vulcanico focus:outline-none transition-colors w-full p-0"
              />
            </div>
            <button 
              onClick={() => {
                setEditingExercise(null);
                setEditingExerciseVideoFile(null);
                setEditingExerciseThumbnailFile(null);
              }} 
              className="text-concrete hover:text-white transition-colors p-2"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 pb-32 max-w-2xl mx-auto w-full">
            
            {/* Secao de Midia */}
            <div className="flex flex-col gap-4">
              <h3 className="font-mono text-vulcanico text-xs uppercase font-bold tracking-widest border-b border-concrete/10 pb-2">Mídia Demonstrativa</h3>
              
              <div className="flex flex-col gap-2">
                <label className="font-mono text-concrete text-[10px] uppercase tracking-widest">Thumbnail (Imagem)</label>
                {editingExercise.thumbnailUrl && !editingExerciseThumbnailFile && (
                   <img src={editingExercise.thumbnailUrl} alt="Thumbnail" className="w-24 h-24 object-cover rounded-lg border border-concrete/20 mb-2" />
                )}
                <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-concrete/30 hover:border-vulcanico bg-concrete/5 hover:bg-vulcanico/10 py-4 rounded-xl cursor-pointer transition-colors text-concrete hover:text-white group">
                  <Upload size={16} className="group-hover:text-vulcanico transition-colors" />
                  <span className="font-mono text-[10px] uppercase tracking-wider">{editingExerciseThumbnailFile ? editingExerciseThumbnailFile.name : "Selecionar Imagem"}</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setEditingExerciseThumbnailFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="font-mono text-concrete text-[10px] uppercase tracking-widest">Vídeo/GIF Demonstrativo</label>
                {isValidVideoUrl(editingExercise.videoUrl) && !editingExerciseVideoFile && (
                   <video src={editingExercise.videoUrl} className="w-full max-h-[200px] object-cover rounded-lg border border-concrete/20 mb-2 bg-black" controls />
                )}
                <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-concrete/30 hover:border-vulcanico bg-concrete/5 hover:bg-vulcanico/10 py-4 rounded-xl cursor-pointer transition-colors text-concrete hover:text-white group">
                  <Upload size={16} className="group-hover:text-vulcanico transition-colors" />
                  <span className="font-mono text-[10px] uppercase tracking-wider">{editingExerciseVideoFile ? editingExerciseVideoFile.name : "Selecionar Vídeo/GIF"}</span>
                  <input 
                    type="file" 
                    accept="video/*,image/gif"
                    onChange={(e) => setEditingExerciseVideoFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Secao Detalhes Tecnicos */}
            <div className="flex flex-col gap-4">
              <h3 className="font-mono text-vulcanico text-xs uppercase font-bold tracking-widest border-b border-concrete/10 pb-2">Detalhes Técnicos</h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 bg-vulcanico/10 p-3 rounded-lg border border-vulcanico/30">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-white text-[10px] uppercase font-bold tracking-widest">Apenas Tempo (Sem Carga)</label>
                    <ToggleSwitch checked={editingExercise.isTimeBased || false} onChange={(c) => setEditingExercise({...editingExercise, isTimeBased: c, isRepsOnly: c ? false : (editingExercise.isRepsOnly || false)})} />
                  </div>
                  <p className="font-mono text-[9px] text-concrete/80 leading-relaxed mt-1">Se ativado, este exercício não pedirá peso/repetições e exibirá um cronômetro na tela de treino.</p>
                </div>
                <div className="flex flex-col gap-1 bg-vulcanico/10 p-3 rounded-lg border border-vulcanico/30">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-white text-[10px] uppercase font-bold tracking-widest">Apenas Repetições (Sem Carga)</label>
                    <ToggleSwitch checked={editingExercise.isRepsOnly || false} onChange={(c) => setEditingExercise({...editingExercise, isRepsOnly: c, isTimeBased: c ? false : (editingExercise.isTimeBased || false)})} />
                  </div>
                  <p className="font-mono text-[9px] text-concrete/80 leading-relaxed mt-1">Se ativado, este exercício não pedirá peso (ocultando a coluna de carga) e focará apenas em repetições.</p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-concrete text-[10px] uppercase">Músculos Secundários</label>
                    <ToggleSwitch checked={editingExercise.visibleFields?.includes('secondaryMuscles') || false} onChange={(c) => toggleVisibleField('secondaryMuscles', c)} />
                  </div>
                  <input type="text" value={editingExercise.secondaryMuscles?.join(", ") || ""} onChange={(e) => setEditingExercise({...editingExercise, secondaryMuscles: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} placeholder="Ex: Tríceps, Ombro" className="w-full bg-transparent border-b border-concrete/30 py-2 font-display text-lg text-white focus:outline-none focus:border-vulcanico transition-colors" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-concrete text-[10px] uppercase">Mecânica</label>
                    <ToggleSwitch checked={editingExercise.visibleFields?.includes('mechanicType') || false} onChange={(c) => toggleVisibleField('mechanicType', c)} />
                  </div>
                  <CustomSelect
                    value={editingExercise.mechanicType || ""}
                    onChange={(val) => setEditingExercise({...editingExercise, mechanicType: val})}
                    options={[
                      {label: "Composto", value: "Composto"},
                      {label: "Isolado", value: "Isolado"}
                    ]}
                    placeholder="Selecione..."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-concrete text-[10px] uppercase">Equipamento</label>
                    <ToggleSwitch checked={editingExercise.visibleFields?.includes('equipment') || false} onChange={(c) => toggleVisibleField('equipment', c)} />
                  </div>
                  <CustomSelect
                    value={editingExercise.equipment || ""}
                    onChange={(val) => setEditingExercise({...editingExercise, equipment: val})}
                    options={[
                      { label: "Halter", value: "Halter" },
                      { label: "Barra", value: "Barra" },
                      { label: "Máquina", value: "Máquina" },
                      { label: "Polia / Cabo", value: "Polia / Cabo" },
                      { label: "Barra Fixa", value: "Barra Fixa" },
                      { label: "Peso Corporal", value: "Peso Corporal" },
                      { label: "Smith", value: "Smith" },
                      { label: "Kettlebell", value: "Kettlebell" },
                      { label: "Elástico / Faixa", value: "Elástico / Faixa" },
                    ]}
                    placeholder="Selecione..."
                    allowCustom={true}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-concrete text-[10px] uppercase">Dificuldade</label>
                    <ToggleSwitch checked={editingExercise.visibleFields?.includes('difficultyLevel') || false} onChange={(c) => toggleVisibleField('difficultyLevel', c)} />
                  </div>
                  <CustomSelect
                    value={editingExercise.difficultyLevel || ""}
                    onChange={(val) => setEditingExercise({...editingExercise, difficultyLevel: val})}
                    options={[
                      {label: "Iniciante", value: "Iniciante"},
                      {label: "Intermediário", value: "Intermediário"},
                      {label: "Avançado", value: "Avançado"}
                    ]}
                    placeholder="Selecione..."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-concrete text-[10px] uppercase">Pegada</label>
                    <ToggleSwitch checked={editingExercise.visibleFields?.includes('gripType') || false} onChange={(c) => toggleVisibleField('gripType', c)} />
                  </div>
                  <CustomSelect
                    value={editingExercise.gripType || ""}
                    onChange={(val) => setEditingExercise({...editingExercise, gripType: val})}
                    options={[
                      { label: "Pronada", value: "Pronada" },
                      { label: "Supinada", value: "Supinada" },
                      { label: "Neutra", value: "Neutra" },
                      { label: "Mista", value: "Mista" },
                      { label: "Aberta", value: "Aberta" },
                      { label: "Fechada", value: "Fechada" },
                    ]}
                    placeholder="Selecione..."
                    allowCustom={true}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-concrete text-[10px] uppercase">Postura</label>
                    <ToggleSwitch checked={editingExercise.visibleFields?.includes('stance') || false} onChange={(c) => toggleVisibleField('stance', c)} />
                  </div>
                  <CustomSelect
                    value={editingExercise.stance || ""}
                    onChange={(val) => setEditingExercise({...editingExercise, stance: val})}
                    options={[
                      { label: "Em Pé", value: "Em Pé" },
                      { label: "Sentado", value: "Sentado" },
                      { label: "Deitado (Reto)", value: "Deitado (Reto)" },
                      { label: "Inclinado", value: "Inclinado" },
                      { label: "Declinado", value: "Declinado" },
                      { label: "Unilateral", value: "Unilateral" },
                      { label: "Bilateral", value: "Bilateral" },
                    ]}
                    placeholder="Selecione..."
                    allowCustom={true}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-concrete text-[10px] uppercase">Categoria</label>
                  <ToggleSwitch checked={editingExercise.visibleFields?.includes('exerciseCategory') || false} onChange={(c) => toggleVisibleField('exerciseCategory', c)} />
                </div>
                <CustomSelect
                  value={editingExercise.exerciseCategory || ""}
                  onChange={(val) => setEditingExercise({...editingExercise, exerciseCategory: val})}
                  options={[
                    { label: "Hipertrofia", value: "Hipertrofia" },
                    { label: "Força", value: "Força" },
                    { label: "Resistência", value: "Resistência" },
                    { label: "Funcional", value: "Funcional" },
                    { label: "Cardio", value: "Cardio" },
                    { label: "Alongamento / Mobilidade", value: "Alongamento / Mobilidade" },
                  ]}
                  placeholder="Selecione..."
                  allowCustom={true}
                />
              </div>

              <div className="flex flex-col gap-1 mt-2">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-concrete text-[10px] uppercase">Instruções Passo a Passo</label>
                  <ToggleSwitch checked={editingExercise.visibleFields?.includes('instructions') || false} onChange={(c) => toggleVisibleField('instructions', c)} />
                </div>
                <textarea value={editingExercise.instructions || ""} onChange={(e) => setEditingExercise({...editingExercise, instructions: e.target.value})} placeholder="Descreva os passos para a execução correta" className="w-full bg-concrete/5 border border-concrete/20 rounded-lg p-3 font-display text-lg text-white focus:outline-none focus:border-vulcanico transition-colors resize-none h-32" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-concrete text-[10px] uppercase">Erros Comuns</label>
                  <ToggleSwitch checked={editingExercise.visibleFields?.includes('commonMistakes') || false} onChange={(c) => toggleVisibleField('commonMistakes', c)} />
                </div>
                <textarea value={editingExercise.commonMistakes || ""} onChange={(e) => setEditingExercise({...editingExercise, commonMistakes: e.target.value})} placeholder="O que não fazer" className="w-full bg-concrete/5 border border-concrete/20 rounded-lg p-3 font-display text-lg text-white focus:outline-none focus:border-vulcanico transition-colors resize-none h-24" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-concrete text-[10px] uppercase">Respiração</label>
                  <ToggleSwitch checked={editingExercise.visibleFields?.includes('breathing') || false} onChange={(c) => toggleVisibleField('breathing', c)} />
                </div>
                <input type="text" value={editingExercise.breathing || ""} onChange={(e) => setEditingExercise({...editingExercise, breathing: e.target.value})} placeholder="Ex: Expire na subida" className="w-full bg-transparent border-b border-concrete/30 py-2 font-display text-lg text-white focus:outline-none focus:border-vulcanico transition-colors" />
              </div>
            </div>
            
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-noturno via-noturno/90 to-transparent pt-12">
            <button 
              onClick={handleSaveExerciseDetails}
              disabled={isUploadingMedia}
              className="w-full bg-vulcanico hover:bg-white text-noturno font-display text-xl uppercase py-4 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {isUploadingMedia ? "Salvando Mídia..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      )}
      <ActiveWorkoutView activeWorkout={activeWorkout} isWorkoutMinimized={isWorkoutMinimized} setIsWorkoutMinimized={setIsWorkoutMinimized} formatTime={formatTime}  handleAddExerciseToActiveWorkout={handleAddExerciseToActiveWorkout} handleUpdateActiveSet={handleUpdateActiveSet} exerciseMap={exerciseMap} plans={plans} isEditingDirectly={isEditingDirectly} setIsEditingDirectly={setIsEditingDirectly} activeInputModal={activeInputModal} setActiveInputModal={setActiveInputModal} modalTempValue={modalTempValue} setModalTempValue={setModalTempValue} restTimer={restTimer} setRestTimer={setRestTimer} restRemainingMs={restRemainingMs} formatRestTime={formatRestTime} handleAddRestTime={handleAddRestTime} addingExerciseToActiveWorkout={addingExerciseToActiveWorkout} setAddingExerciseToActiveWorkout={setAddingExerciseToActiveWorkout} replacingActiveExerciseId={replacingActiveExerciseId} setReplacingActiveExerciseId={setReplacingActiveExerciseId} handleReplaceExerciseInActiveWorkout={handleReplaceExerciseInActiveWorkout} exerciseSearchQuery={exerciseSearchQuery} setExerciseSearchQuery={setExerciseSearchQuery} filteredExercises={filteredExercises} filteredExercisesByMuscle={filteredExercisesByMuscle} slideX={slideX} setSlideX={setSlideX} isSliding={isSliding} setIsSliding={setIsSliding} maxDrag={maxDrag} handleFinishWorkout={handleFinishWorkout}  handleCancelWorkout={handleCancelWorkout} setActiveWorkout={setActiveWorkout} resolvedActiveExerciseIndex={resolvedActiveExerciseIndex} expandedCompletedExercises={expandedCompletedExercises} setExpandedCompletedExercises={setExpandedCompletedExercises} handleSkipExercise={handleSkipExercise} globalActiveSetId={globalActiveSetId} activeStopwatchSetId={activeStopwatchSetId} activeStopwatchElapsedMs={activeStopwatchElapsedMs} setActiveStopwatchSetId={setActiveStopwatchSetId} setActiveStopwatchStartTime={setActiveStopwatchStartTime} setActiveStopwatchElapsedMs={setActiveStopwatchElapsedMs} handleAddActiveSet={handleAddActiveSet} handleRemoveActiveSet={handleRemoveActiveSet} elapsedTime={elapsedTime} />

      {editingPlan && (
        <>
          <div className="block lg:hidden absolute inset-0 z-50 bg-noturno flex-col overflow-hidden">
            <PlanEditorView editingPlan={editingPlan} editingWorkoutId={editingWorkoutId} setEditingWorkoutId={setEditingWorkoutId} handleMoveWorkout={handleMoveWorkout} handleMoveExerciseInWorkout={handleMoveExerciseInWorkout} handleRemoveExerciseFromWorkout={handleRemoveExerciseFromWorkout} handleOpenAddExerciseToWorkout={handleOpenAddExerciseToWorkout} handleAddWorkoutToBuilder={handleAddWorkoutToBuilder} addingExerciseToWorkoutId={addingExerciseToWorkoutId} setAddingExerciseToWorkoutId={setAddingExerciseToWorkoutId} exerciseSearchQuery={exerciseSearchQuery} setExerciseSearchQuery={setExerciseSearchQuery} filteredExercises={filteredExercises} filteredExercisesByMuscle={filteredExercisesByMuscle} handleAddExerciseToWorkout={handleAddExerciseToWorkout} handleCreateAndAddExerciseInline={handleCreateAndAddExerciseInline} configuringExercise={configuringExercise} setConfiguringExercise={setConfiguringExercise} exerciseMap={exerciseMap} handleSaveExerciseConfig={handleSaveExerciseConfig} handleApplySetConfigToAll={handleApplySetConfigToAll} handleRemoveSetFromConfig={handleRemoveSetFromConfig} handleUpdateSetConfig={handleUpdateSetConfig} handleAddSetToConfig={handleAddSetToConfig} handleToggleConjugate={handleToggleConjugate} handleSavePlan={handleSavePlan} setEditingPlan={setEditingPlan} plans={plans} exerciseMapByName={exerciseMapByName}  handleUpdateWorkoutNameInBuilder={handleUpdateWorkoutNameInBuilder} setConfirmConfig={setConfirmConfig} handleRemoveWorkoutFromBuilder={handleRemoveWorkoutFromBuilder} />
          </div>
          <div className="hidden lg:flex absolute inset-0 z-50 bg-noturno flex-col overflow-hidden">
            <DesktopPlanEditor editingPlan={editingPlan} editingWorkoutId={editingWorkoutId} setEditingWorkoutId={setEditingWorkoutId} handleMoveWorkout={handleMoveWorkout} handleMoveExerciseInWorkout={handleMoveExerciseInWorkout} handleRemoveExerciseFromWorkout={handleRemoveExerciseFromWorkout} handleOpenAddExerciseToWorkout={handleOpenAddExerciseToWorkout} handleAddWorkoutToBuilder={handleAddWorkoutToBuilder} addingExerciseToWorkoutId={addingExerciseToWorkoutId} setAddingExerciseToWorkoutId={setAddingExerciseToWorkoutId} exerciseSearchQuery={exerciseSearchQuery} setExerciseSearchQuery={setExerciseSearchQuery} filteredExercises={filteredExercises} filteredExercisesByMuscle={filteredExercisesByMuscle} handleAddExerciseToWorkout={handleAddExerciseToWorkout} handleCreateAndAddExerciseInline={handleCreateAndAddExerciseInline} configuringExercise={configuringExercise} setConfiguringExercise={setConfiguringExercise} exerciseMap={exerciseMap} handleSaveExerciseConfig={handleSaveExerciseConfig} handleApplySetConfigToAll={handleApplySetConfigToAll} handleRemoveSetFromConfig={handleRemoveSetFromConfig} handleUpdateSetConfig={handleUpdateSetConfig} handleAddSetToConfig={handleAddSetToConfig} handleToggleConjugate={handleToggleConjugate} handleSavePlan={handleSavePlan} setEditingPlan={setEditingPlan} plans={plans} exerciseMapByName={exerciseMapByName} handleUpdateWorkoutNameInBuilder={handleUpdateWorkoutNameInBuilder} setConfirmConfig={setConfirmConfig} handleRemoveWorkoutFromBuilder={handleRemoveWorkoutFromBuilder} />
          </div>
        </>
      )}

      {/* -------------------- MAIN TABS -------------------- */}
      <div className={`flex-1 overflow-y-auto ${activeWorkout && !isWorkoutMinimized ? "hidden" : "block"}`}>
        
        {/* TAB: PLANOS */}
        {activeTab === "plans" && !editingPlan && <PlanListView setIsWorkoutMinimized={setIsWorkoutMinimized} handleEditPlan={handleEditPlan} activeTab={activeTab} activePlan={activePlan} activePlanWorkouts={activePlanWorkouts} activeWorkoutIndex={activeWorkoutIndex} setActiveWorkoutIndex={setActiveWorkoutIndex} activePlanId={activePlanId} setActivePlanId={setActivePlanId}  editingPlan={editingPlan} plans={plans} handleStartCreatePlan={handleStartCreatePlan} renderSyncButton={renderSyncButton} handleStartWorkout={handleStartWorkout} setEditingPlan={setEditingPlan} handleDeletePlan={handleDeletePlan} activeWorkout={activeWorkout} />}

        {/* TAB: BIBLIOTECA EXERCICIOS */}
        {activeTab === "exercises" && <ExerciseLibraryView activeTab={activeTab} exercises={exercises} exerciseViewMode={exerciseViewMode} setExerciseViewMode={setExerciseViewMode} renderSyncButton={renderSyncButton} setIsImportModalOpen={setIsImportModalOpen} handleAddExercise={handleAddExercise} newExerciseName={newExerciseName} setNewExerciseName={setNewExerciseName} setIsMuscleDropdownOpen={setIsMuscleDropdownOpen} isMuscleDropdownOpen={isMuscleDropdownOpen} newExerciseMuscle={newExerciseMuscle} setNewExerciseMuscle={setNewExerciseMuscle} exercisesByMuscle={exercisesByMuscle} setEditingExercise={setEditingExercise} handleDeleteExercise={handleDeleteExercise} sortedExercisesFlat={sortedExercisesFlat} />}

        {/* TAB: ESTATISTICAS (EX-HISTORICO) */}
        {activeTab === "history" && <>
            <div className="block lg:hidden w-full h-full">
              <HistoryView activeTab={activeTab} history={history} statsPeriod={statsPeriod} setStatsPeriod={setStatsPeriod} workoutSummary={workoutSummary} setWorkoutSummary={setWorkoutSummary} reviewingWorkoutLog={reviewingWorkoutLog} setReviewingWorkoutLog={setReviewingWorkoutLog} expandedCompletedExercises={expandedCompletedExercises} setExpandedCompletedExercises={setExpandedCompletedExercises} hoveredLogIdx={hoveredLogIdx} setHoveredLogIdx={setHoveredLogIdx} statsData={statsData} handleDeleteHistoryLog={handleDeleteHistoryLog} filteredLogs={filteredLogs} setIsAddingFocusModalOpen={setIsAddingFocusModalOpen} focusedExercises={focusedExercises} exerciseMapByName={exerciseMapByName} setFocusedExercises={setFocusedExercises} totalSetsAggregated={totalSetsAggregated} donutSlices={donutSlices} linesToDraw={linesToDraw} nodesToDraw={nodesToDraw} renderSyncButton={renderSyncButton} formatTime={formatTime} />
            </div>
            <div className="hidden lg:block w-full h-full">
              <AdvancedStatsDashboard activeTab={activeTab} history={history} statsPeriod={statsPeriod} setStatsPeriod={setStatsPeriod} workoutSummary={workoutSummary} setWorkoutSummary={setWorkoutSummary} reviewingWorkoutLog={reviewingWorkoutLog} setReviewingWorkoutLog={setReviewingWorkoutLog} expandedCompletedExercises={expandedCompletedExercises} setExpandedCompletedExercises={setExpandedCompletedExercises} hoveredLogIdx={hoveredLogIdx} setHoveredLogIdx={setHoveredLogIdx} statsData={statsData} handleDeleteHistoryLog={handleDeleteHistoryLog} filteredLogs={filteredLogs} setIsAddingFocusModalOpen={setIsAddingFocusModalOpen} focusedExercises={focusedExercises} exerciseMapByName={exerciseMapByName} setFocusedExercises={setFocusedExercises} totalSetsAggregated={totalSetsAggregated} donutSlices={donutSlices} linesToDraw={linesToDraw} nodesToDraw={nodesToDraw} renderSyncButton={renderSyncButton} formatTime={formatTime} />
            </div>
          </>}
      </div>


      {/* BOTTOM NAVIGATION BAR */}
      <MobileNav activeWorkout={activeWorkout} isWorkoutMinimized={isWorkoutMinimized} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* CUSTOM MODAL DIALOG (REPLACES WINDOW.ALERT/WINDOW.CONFIRM) */}
      {dialog && (
        <div className="absolute inset-0 z-50 bg-black/85 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-noturno border border-concrete/30 p-6 max-w-sm w-full flex flex-col gap-4 rounded-xl">
            {dialog.title && (
              <h3 className="font-display text-lg uppercase text-vulcanico font-bold tracking-wider border-b border-concrete/10 pb-2">
                {dialog.title}
              </h3>
            )}
            <p className="font-mono text-[11px] text-white uppercase leading-relaxed">
              {dialog.message}
            </p>
            <div className="flex gap-3 justify-end mt-2">
              {dialog.onConfirm ? (
                <>
                  <button
                    onClick={() => {
                      if (dialog.onCancel) dialog.onCancel();
                      setDialog(null);
                    }}
                    className="px-4 py-2 border border-concrete/30 hover:border-white font-mono text-[10px] uppercase rounded-lg text-concrete hover:text-white transition-colors"
                  >
                    {dialog.cancelText || "Cancelar"}
                  </button>
                  <button
                    onClick={() => {
                      dialog.onConfirm?.();
                      setDialog(null);
                    }}
                    className="px-4 py-2 bg-vulcanico hover:bg-white text-noturno font-display text-[11px] uppercase rounded-lg font-bold transition-colors"
                  >
                    {dialog.confirmText || "Confirmar"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setDialog(null)}
                  className="px-6 py-2 bg-vulcanico hover:bg-white text-noturno font-display text-[11px] uppercase rounded-lg font-bold transition-colors"
                >
                  Ok
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD EXERCISE FOCUS OVERLAY */}
      {isAddingFocusModalOpen && (
        <div className="absolute inset-0 z-50 bg-noturno/95 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display text-2xl uppercase">Foco: Exercício</h3>
            <button 
              onClick={() => setIsAddingFocusModalOpen(false)}
              className="text-concrete hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Search bar */}
          <div className="mb-4">
            <input 
              type="text" 
              value={exerciseSearchQuery}
              onChange={(e) => setExerciseSearchQuery(e.target.value)}
              placeholder="Pesquisar exercício ou grupo muscular..."
              className="w-full bg-transparent border-b border-concrete/30 py-2 font-sans text-sm text-white focus:outline-none focus:border-vulcanico"
            />
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-1">
            {filteredExercises.length === 0 ? (
              <p className="font-mono text-xs text-concrete uppercase">Nenhum exercício correspondente encontrado.</p>
            ) : (
              Object.entries(filteredExercisesByMuscle).map(([muscle, list]) => (
                <div key={muscle} className="flex flex-col">
                  <span className="font-mono text-concrete text-[10px] tracking-widest uppercase mb-2">
                    {muscle}
                  </span>
                  <div className="flex flex-col gap-2">
                    {list.map(ex => {
                      const isAlreadyFocused = focusedExercises.includes(ex.name);
                      return (
                        <button
                          key={ex.id}
                          disabled={isAlreadyFocused}
                          onClick={() => {
                            setFocusedExercises(prev => [...prev, ex.name]);
                            setIsAddingFocusModalOpen(false);
                          }}
                          className={`text-left py-3 border-b border-concrete/10 transition-colors flex justify-between items-center ${
                            isAlreadyFocused ? "opacity-30 cursor-default" : "hover:text-vulcanico"
                          }`}
                        >
                          <span className="font-display text-lg uppercase">{ex.name}</span>
                          {isAlreadyFocused && (
                            <span className="font-mono text-[9px] text-vulcanico uppercase">Já adicionado</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* WORKOUT REVIEW MODAL (Pre-Strava) */}
      {reviewingWorkoutLog && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fade-in pb-safe pt-safe overflow-y-auto">
          <div className="flex-1 flex flex-col p-6 max-w-md w-full mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-display text-2xl text-white uppercase">Revisão do Treino</h2>
              <button onClick={() => setReviewingWorkoutLog(null)} className="text-concrete hover:text-white p-2">
                <X size={24} />
              </button>
            </div>
            
            <div className="bg-vulcanico/10 border border-vulcanico/30 rounded-2xl p-6 flex flex-col gap-6 mb-8 flex-1">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] text-concrete uppercase tracking-widest font-bold">Nome do Treino</label>
                <input 
                  type="text" 
                  value={reviewName}
                  onChange={e => setReviewName(e.target.value)}
                  className="w-full bg-noturno border-b border-concrete/30 py-2 font-display text-lg text-white focus:outline-none focus:border-vulcanico transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[10px] text-concrete uppercase tracking-widest font-bold">Data</label>
                  <input 
                    type="date" 
                    value={reviewDate}
                    onChange={e => setReviewDate(e.target.value)}
                    className="w-full bg-noturno/50 border border-concrete/20 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-vulcanico transition-colors [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 hover:[&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[10px] text-concrete uppercase tracking-widest font-bold">Hora Início</label>
                  <input 
                    type="time" 
                    value={reviewTime}
                    onChange={e => setReviewTime(e.target.value)}
                    className="w-full bg-noturno/50 border border-concrete/20 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-vulcanico transition-colors [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 hover:[&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] text-concrete uppercase tracking-widest font-bold">Duração (minutos)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1"
                    value={reviewDurationMins}
                    onChange={e => setReviewDurationMins(e.target.value)}
                    className="w-full bg-noturno border-b border-concrete/30 py-2 font-display text-2xl text-white focus:outline-none focus:border-vulcanico transition-colors"
                  />
                  <span className="text-concrete font-mono text-sm">min</span>
                </div>
              </div>
              
              <div className="mt-auto bg-black/40 p-4 rounded-xl flex items-center justify-center gap-2 border border-concrete/5">
                <span className="text-lg">🔥</span>
                <span className="font-mono text-[10px] text-concrete uppercase font-bold tracking-widest">
                  Gasto Est.: <span className="text-white">~{Math.round((parseInt(reviewDurationMins) || 0) * 6)} kcal</span>
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setReviewingWorkoutLog(null)} 
                className="flex-1 py-4 font-display uppercase tracking-widest text-sm text-concrete border border-concrete/20 rounded-xl hover:bg-concrete/10 transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={() => {
                  // Reconstruct date timestamp
                  const [year, month, day] = reviewDate.split('-').map(Number);
                  const [hours, minutes] = reviewTime.split(':').map(Number);
                  let finalTimestamp = reviewingWorkoutLog.date;
                  
                  if (!isNaN(year) && !isNaN(hours)) {
                    const newD = new Date();
                    newD.setFullYear(year, month - 1, day);
                    newD.setHours(hours, minutes, 0, 0);
                    finalTimestamp = newD.getTime();
                  }

                  const durMs = (parseInt(reviewDurationMins) || Math.floor(reviewingWorkoutLog.durationMs / 60000)) * 60000;

                  const finalizedLog = {
                    ...reviewingWorkoutLog,
                    name: reviewName || reviewingWorkoutLog.name,
                    date: finalTimestamp,
                    durationMs: durMs
                  };

                  setHistory(prev => [finalizedLog, ...prev]);
                  setWorkoutSummary(finalizedLog);
                  setReviewingWorkoutLog(null);
                  setActiveWorkout(null);
                  setRestTimer(null);
                  setActiveTab("history");
                }} 
                className="flex-[2] py-4 font-display uppercase tracking-widest text-sm bg-white text-black rounded-xl hover:bg-concrete transition-colors flex items-center justify-center gap-2 shadow-xl shadow-white/10"
              >
                <Save size={18} />
                Salvar Treino
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WORKOUT SUMMARY / STRAVA STYLE MODAL */}
      {workoutSummary && (() => {
        const handleShare = () => {
          const prText = workoutSummary.prs && workoutSummary.prs.length > 0 
            ? `\n🏆 ${workoutSummary.prs.length} Recordes Pessoais Quebrados!\n${workoutSummary.prs.map(pr => `- ${pr}`).join("\n")}` 
            : "";
          
          const exText = workoutSummary.exercises.map(ex => {
            const vol = ex.sets.reduce((acc, set) => acc + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0);
            return `- ${ex.name} (${ex.sets.length} séries, ${vol}kg)`;
          }).join("\n");

          const text = `ZenLift: Treino "${workoutSummary.name}" Concluído! 🏋️‍♂️\n⏱️ ${Math.floor(workoutSummary.durationMs / 60000)} minutos\n⚖️ ${workoutSummary.volumeKg}kg levantados${prText}\n\nExercícios:\n${exText}`;
          
          if (navigator.share) {
            navigator.share({
              title: 'Meu Treino no ZenLift',
              text: text
            }).catch(console.error);
          } else {
            navigator.clipboard.writeText(text).then(() => {
              showToast("Resumo copiado para a área de transferência!", 'success');
            }).catch(console.error);
          }
        };

        return (
          <div className="absolute inset-0 z-[70] bg-noturno flex flex-col overflow-y-auto animate-slide-up">
            <div className="flex-none p-6 pb-2 border-b border-concrete/10 flex justify-between items-center sticky top-0 bg-noturno z-10">
              <h2 className="font-display text-2xl uppercase text-vulcanico font-bold tracking-widest">Resumo do Treino</h2>
              <button onClick={() => setWorkoutSummary(null)} className="text-concrete hover:text-white p-2">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 p-6 flex flex-col gap-8 pb-24">
              <div className="text-center flex flex-col gap-2">
                <h1 className="font-display text-4xl text-white uppercase">{workoutSummary.name}</h1>
                <p className="font-mono text-concrete">
                  {new Date(workoutSummary.date).toLocaleDateString("pt-BR", { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-concrete/5 border border-concrete/10 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                  <Clock size={24} className="text-concrete mb-1" />
                  <span className="font-mono text-[10px] text-concrete uppercase tracking-widest">Tempo Ativo</span>
                  <span className="font-display text-3xl text-white">{Math.floor(workoutSummary.durationMs / 60000)}<span className="text-sm text-concrete ml-1">min</span></span>
                </div>
                <div className="bg-concrete/5 border border-concrete/10 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                  <Dumbbell size={24} className="text-concrete mb-1" />
                  <span className="font-mono text-[10px] text-concrete uppercase tracking-widest">Volume Total</span>
                  <span className="font-display text-3xl text-white">{workoutSummary.volumeKg}<span className="text-sm text-concrete ml-1">kg</span></span>
                </div>
              </div>

              {/* Idle Time and Calories estimation */}
              <div className="flex gap-4">
                {workoutSummary.idleTimeMs !== undefined && workoutSummary.idleTimeMs > 0 && (
                  <div className="flex-1 bg-black/40 border border-concrete/10 p-4 rounded-xl flex items-center justify-center gap-2 text-center">
                    <span className="font-mono text-[9px] text-concrete uppercase">
                      {Math.floor(workoutSummary.idleTimeMs / 60000)} min ociosos removidos
                    </span>
                  </div>
                )}
                <div className="flex-1 bg-vulcanico/10 border border-vulcanico/30 p-4 rounded-xl flex items-center justify-center gap-2 text-center">
                  <span className="text-lg">🔥</span>
                  <span className="font-mono text-[10px] text-white uppercase font-bold tracking-widest">
                    ~{Math.round((workoutSummary.durationMs / 60000) * 6)} kcal
                  </span>
                </div>
              </div>

              {workoutSummary.prs && workoutSummary.prs.length > 0 && (
                <div className="bg-vulcanico/10 border border-vulcanico/30 p-6 rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-vulcanico">
                    <span className="text-xl">🏆</span>
                    <h3 className="font-display text-lg uppercase font-bold tracking-widest">Recordes Pessoais</h3>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {workoutSummary.prs.map((pr, idx) => (
                      <li key={idx} className="font-mono text-xs text-white bg-vulcanico/20 p-3 rounded-xl border border-vulcanico/10 flex items-start gap-2">
                        <span className="text-vulcanico mt-0.5">★</span> {pr}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <h3 className="font-display text-lg uppercase text-concrete tracking-widest border-b border-concrete/20 pb-2">Exercícios Realizados</h3>
                <div className="flex flex-col gap-3">
                  {workoutSummary.exercises.map((ex, idx) => {
                    const vol = ex.sets.reduce((acc, set) => acc + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0);
                    return (
                      <div key={idx} className="bg-concrete/5 p-4 rounded-xl flex justify-between items-center border border-concrete/10">
                        <div className="flex flex-col gap-1">
                          <span className="font-display text-white uppercase">{ex.name}</span>
                          <span className="font-mono text-[10px] text-concrete">{ex.sets.length} séries concluídas</span>
                        </div>
                        <div className="font-mono text-xs text-vulcanico font-bold">
                          {vol} kg
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-noturno/90 backdrop-blur-md p-6 border-t border-concrete/10">
              <button 
                onClick={() => setShareWorkoutModalData(workoutSummary)}
                className="w-full bg-vulcanico text-noturno font-display uppercase tracking-widest py-4 rounded-xl text-lg font-bold flex justify-center items-center gap-3 hover:bg-white transition-colors"
              >
                Compartilhar Treino
              </button>
            </div>
          </div>
        );
      })()}

      {/* STARTING WORKOUT MODE SELECTION MODAL (Solo vs Dual) */}
      {startingWorkoutModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-noturno border border-concrete/30 p-6 max-w-sm w-full flex flex-col gap-6 rounded-2xl relative shadow-2xl">
            <div className="flex justify-between items-center border-b border-concrete/10 pb-3">
              <h3 className="font-display text-xl uppercase text-white tracking-wider font-bold">
                Iniciar Treino
              </h3>
              <button
                onClick={() => setStartingWorkoutModal(null)}
                className="text-concrete hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <p className="font-mono text-xs text-concrete uppercase">Escolha a modalidade de treino:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSessionMode("solo")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    selectedSessionMode === "solo"
                      ? "bg-vulcanico/20 border-vulcanico text-white font-bold"
                      : "bg-concrete/5 border-concrete/20 text-concrete hover:border-concrete/50"
                  }`}
                >
                  <Dumbbell size={24} className={selectedSessionMode === "solo" ? "text-vulcanico" : "text-concrete"} />
                  <span className="font-display text-sm uppercase">Solo (1 P)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSessionMode("dual")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    selectedSessionMode === "dual"
                      ? "bg-cyan-500/20 border-cyan-500 text-white font-bold"
                      : "bg-concrete/5 border-concrete/20 text-concrete hover:border-concrete/50"
                  }`}
                >
                  <Users size={24} className={selectedSessionMode === "dual" ? "text-cyan-400" : "text-concrete"} />
                  <span className="font-display text-sm uppercase">Dual (Dupla)</span>
                </button>
              </div>
            </div>

            {selectedSessionMode === "dual" && (
              <div className="flex flex-col gap-3 bg-black/40 p-4 rounded-xl border border-white/10 animate-fade-in">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <p className="font-mono text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                    <Users size={12} />
                    Configuração da Dupla
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const temp = partner1NameInput;
                      setPartner1NameInput(partner2NameInput);
                      setPartner2NameInput(temp);
                    }}
                    className="flex items-center gap-1 font-mono text-[9px] text-concrete hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors"
                    title="Inverter Posições da Dupla"
                  >
                    <ArrowUpDown size={11} />
                    Inverter
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <AthleteInputDropdown
                    label="Parceiro 1 (P1)"
                    value={partner1NameInput}
                    onChange={setPartner1NameInput}
                    options={allKnownPartners}
                    placeholder="Nome do Atleta 1"
                    accentColor="vulcanico"
                  />

                  <AthleteInputDropdown
                    label="Parceiro 2 (P2)"
                    value={partner2NameInput}
                    onChange={setPartner2NameInput}
                    options={allKnownPartners}
                    placeholder="Nome do Atleta 2"
                    accentColor="cyan"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => {
                executeStartWorkout(
                  startingWorkoutModal.workout,
                  startingWorkoutModal.planName,
                  selectedSessionMode,
                  partner1NameInput || "Atleta 1",
                  partner2NameInput || "Atleta 2"
                );
              }}
              className="w-full py-3.5 bg-vulcanico hover:bg-white text-noturno font-display uppercase tracking-widest text-sm rounded-xl font-bold transition-colors shadow-lg shadow-vulcanico/20 flex items-center justify-center gap-2"
            >
              <Play size={16} className="fill-noturno" />
              Começar Treino
            </button>
          </div>
        </div>
      )}

      {/* SYNC CONTROL CENTER / AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-noturno border border-concrete/30 p-6 max-w-sm w-full flex flex-col gap-5 rounded-2xl relative shadow-2xl">
            
            {/* Close Button */}
            <button 
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-concrete hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            {/* Title */}
            <div className="border-b border-concrete/10 pb-3 flex items-center gap-2">
              <Database size={18} className="text-vulcanico" />
              <h3 className="font-display text-lg uppercase text-white tracking-wider font-bold">
                Nuvem & Sincronismo
              </h3>
            </div>

            {/* Sync Telemetry Status */}
            <div className="bg-concrete/5 border border-concrete/10 p-3 rounded-xl flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9px] text-concrete uppercase">Status de Conectividade:</span>
                <span className="font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  {user ? (
                    syncStatus === "syncing" ? (
                      <span className="text-yellow-500 flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> Sincronizando</span>
                    ) : syncStatus === "error" ? (
                      <span className="text-red-500 flex items-center gap-1"><CloudOff size={10} /> Falha</span>
                    ) : (
                      <span className="text-vulcanico flex items-center gap-1"><Cloud size={10} /> Conectado & Sincronizado</span>
                    )
                  ) : (
                    <span className="text-concrete">Local-Only (Sem Nuvem)</span>
                  )}
                </span>
              </div>
              {lastSyncedTime && (
                <div className="flex justify-between items-center border-t border-concrete/5 pt-1.5 mt-1.5">
                  <span className="font-mono text-[9px] text-concrete uppercase">Último Sincronismo:</span>
                  <span className="font-mono text-[9px] text-concrete">
                    {new Date(lastSyncedTime).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {user ? (
              // LOGGED IN VIEW
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[9px] text-concrete uppercase">Conta Ativa:</span>
                  <span className="font-mono text-xs text-white truncate uppercase font-bold">{user.email}</span>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={() => handleForceSync()}
                    disabled={syncStatus === "syncing"}
                    className="w-full bg-vulcanico hover:bg-white text-noturno font-display text-[11px] uppercase py-3 font-bold transition-all rounded-xl active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={12} className={syncStatus === "syncing" ? "animate-spin" : ""} />
                    Sincronizar Agora
                  </button>
                  <button
                    onClick={() => handleLogout()}
                    className="w-full border border-concrete/30 hover:border-red-500 text-concrete hover:text-red-500 font-mono text-[10px] uppercase py-3 transition-colors rounded-xl flex items-center justify-center gap-2"
                  >
                    Desconectar Conta
                  </button>
                </div>
              </div>
            ) : (
              // LOGGED OUT VIEW (AUTH FORM)
              <div className="flex flex-col gap-4">
                <p className="font-mono text-[10px] text-concrete uppercase leading-relaxed">
                  Crie uma conta para sincronizar seus planos, treinos e estatísticas de forma segura entre seu PC, Celular e outros dispositivos.
                </p>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] text-concrete uppercase">E-mail</label>
                    <input 
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="ex: voce@email.com"
                      className="bg-transparent border-b border-concrete/30 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-vulcanico transition-colors uppercase"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] text-concrete uppercase">Senha</label>
                    <input 
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-transparent border-b border-concrete/30 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-vulcanico transition-colors"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={() => handleAuthAction()}
                    disabled={!authEmail.trim() || authPassword.length < 6 || syncStatus === "syncing"}
                    className="w-full bg-vulcanico hover:bg-white text-noturno font-display text-[11px] uppercase py-3 font-bold transition-all rounded-xl active:scale-98 disabled:opacity-50"
                  >
                    {authMode === "login" ? "Entrar" : "Criar Conta"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                    className="font-mono text-[9px] text-vulcanico uppercase tracking-wider text-center underline hover:text-white mt-1"
                  >
                    {authMode === "login" ? "Não possui conta? Cadastre-se" : "Já possui conta? Faça o Login"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* GLOBAL TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-full flex items-center gap-2 shadow-2xl border ${
              toast.type === 'success' ? 'bg-green-900/90 border-green-500/50 text-white' :
              toast.type === 'error' ? 'bg-red-900/90 border-red-500/50 text-white' :
              'bg-vulcanico border-white/20 text-noturno font-bold'
            }`}
          >
            {toast.type === 'success' ? <Check size={16} /> : toast.type === 'error' ? <AlertTriangle size={16} /> : <AlertCircle size={16} />}
            <span className="font-display text-sm whitespace-nowrap">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GLOBAL CONFIRM DIALOG */}
      <AnimatePresence>
        {confirmConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-noturno/80 backdrop-blur-sm"
              onClick={() => setConfirmConfig(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-noturno border border-concrete/20 p-6 rounded-2xl shadow-2xl w-full max-w-sm relative z-10"
            >
              <h3 className="font-display text-xl text-white mb-2 uppercase tracking-widest">Confirmar Ação</h3>
              <p className="text-concrete text-sm mb-6">{confirmConfig.message}</p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setConfirmConfig(null)}
                  className="px-4 py-2 font-mono text-xs uppercase tracking-wider text-concrete hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    confirmConfig.onConfirm();
                    setConfirmConfig(null);
                  }}
                  className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-mono text-xs uppercase tracking-wider rounded-lg transition-colors border border-red-500/30"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {shareWorkoutModalData && (
          <WorkoutShareModal workout={shareWorkoutModalData} onClose={() => setShareWorkoutModalData(null)} />
        )}
      </AnimatePresence>

      </div>
    </div>
  );
}

