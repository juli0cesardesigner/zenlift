"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  Upload
} from "lucide-react";
import { supabase } from "./supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

// --- TYPES ---
type Tab = "plans" | "exercises" | "history";

type ExerciseDef = {
  id: string;
  name: string;
  muscle: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  secondaryMuscles?: string[];
  mechanicType?: string;
  equipment?: string;
  gripType?: string;
  stance?: string;
  instructions?: string;
  commonMistakes?: string;
  breathing?: string;
  difficultyLevel?: string;
  exerciseCategory?: string;
  visibleFields?: string[];
  isTimeBased?: boolean;
};

type PlannedSet = {
  id: string;
  minReps: number;
  maxReps: number;
  isDropSet: boolean;
  isToFailure: boolean;
  restSeconds: number;
  methodType?: string;
  customMethodName?: string;
  dropCount?: number;
  restPauseSets?: number;
  restPauseSeconds?: number;
  failureType?: string;
};

type PlannedExercise = {
  id: string;
  exerciseId: string;
  sets: PlannedSet[];
};

type WorkoutTemplate = {
  id: string;
  name: string;
  exercises: PlannedExercise[];
};

type Plan = {
  id: string;
  name: string;
  workouts: WorkoutTemplate[];
};

type ActiveSet = {
  id: string;
  minReps: number;
  maxReps: number;
  isDropSet: boolean;
  isToFailure: boolean;
  restSeconds: number;
  weight: string;
  reps: string;
  completed: boolean;
  methodType?: string;
  customMethodName?: string;
  dropCount?: number;
  restPauseSets?: number;
  restPauseSeconds?: number;
  failureType?: string;
  suggestedWeight?: string;
  suggestedReps?: string;
};

type ActiveExercise = {
  id: string;
  exerciseId: string;
  sets: ActiveSet[];
  elapsedSeconds?: number;
  overloadSuggestion?: string;
};

type ActiveWorkoutSession = {
  planId: string;
  workoutId: string;
  name: string;
  startTime: number;
  exercises: ActiveExercise[];
  lastInteractionTime: number;
  totalIdleTimeMs: number;
  isPaused?: boolean;
  pauseStartTime?: number;
};

type HistoryLog = {
  id: string;
  name: string;
  date: number;
  durationMs: number;
  volumeKg: number;
  idleTimeMs?: number;
  prs?: string[];
  exercises: {
    name: string;
    elapsedSeconds?: number;
    sets: {
      minReps: number;
      maxReps: number;
      isDropSet: boolean;
      isToFailure: boolean;
      weight: string;
      reps: string;
      methodType?: string;
      customMethodName?: string;
      dropCount?: number;
      restPauseSets?: number;
      restPauseSeconds?: number;
      failureType?: string;
    }[];
  }[];
};

// --- INITIAL LIBRARY DATA ---
const defaultExercises: ExerciseDef[] = [
  { id: "e1", name: "Supino Reto", muscle: "Peito" },
  { id: "e2", name: "Supino Inclinado H.", muscle: "Peito" },
  { id: "e3", name: "Agachamento Livre", muscle: "Pernas" },
  { id: "e4", name: "Leg Press 45", muscle: "Pernas" },
  { id: "e5", name: "Levantamento Terra", muscle: "Costas" },
  { id: "e6", name: "Remada Curvada", muscle: "Costas" },
  { id: "e7", name: "Desenvolvimento H.", muscle: "Ombros" },
  { id: "e8", name: "Elevação Lateral", muscle: "Ombros" },
  { id: "e9", name: "Rosca Direta", muscle: "Braços" },
  { id: "e10", name: "Tríceps Pulley", muscle: "Braços" },
  { id: "e11", name: "Prancha Abdominal", muscle: "Core" }
];

const muscleColors: Record<string, string> = {
  Peito: "#FF4103",
  Costas: "#A855F7",
  Pernas: "#3B82F6",
  Ombros: "#EAB308",
  Braços: "#06B6D4",
  Core: "#10B981",
  Cardio: "#EC4899",
  Outros: "#6B7280"
};

const nodePositions: Record<string, { x: number; y: number }> = {
  Peito: { x: 150, y: 35 },
  Costas: { x: 245, y: 80 },
  Pernas: { x: 220, y: 175 },
  Ombros: { x: 150, y: 200 },
  Braços: { x: 80, y: 175 },
  Core: { x: 55, y: 80 },
  Outros: { x: 150, y: 120 }
};

const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (c: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-vulcanico' : 'bg-concrete/30'}`}
  >
    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
);

// --- CUSTOM UI COMPONENTS ---
const CustomSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: {label: string, value: string}[], placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-noturno border-b border-concrete/30 py-2 font-display text-lg text-white text-left focus:outline-none focus:border-vulcanico transition-colors flex justify-between items-center"
      >
        <span className={!selectedOption ? "text-concrete" : ""}>{selectedOption ? selectedOption.label : (placeholder || "Selecione...")}</span>
        <ChevronDown size={18} className={`text-concrete transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-grafite border border-concrete/10 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-3 font-display text-base transition-colors flex items-center justify-between
                    ${value === opt.value ? 'bg-vulcanico/20 text-vulcanico' : 'text-white hover:bg-concrete/10'}
                  `}
                >
                  {opt.label}
                  {value === opt.value && <Check size={16} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function AppContainer() {
  const [activeTab, setActiveTab] = useState<Tab>("plans");
  const [isLoaded, setIsLoaded] = useState(false);

  // Custom UI States
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, message: string, onConfirm: () => void} | null>(null);

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
    initialValue: string;
    suggestedValue: string;
  } | null>(null);
  const [modalTempValue, setModalTempValue] = useState<string>("");

  const globalActiveSetId = useMemo(() => {
    if (!activeWorkout) return null;
    for (const ex of activeWorkout.exercises) {
      if (!ex.sets.every(s => s.completed)) {
        const incompleteSet = ex.sets.find(s => !s.completed);
        if (incompleteSet) return incompleteSet.id;
      }
    }
    return null;
  }, [activeWorkout]);

  // Rest Timer
  const [restTimer, setRestTimer] = useState<{
    duration: number;
    endTime: number;
    exerciseName: string;
    setIndex: number;
    nextExerciseName?: string;
    nextExerciseLastWeight?: string;
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

  // Deletion tracking refs (useRef to avoid channel teardown on every delete)
  const deletedPlanIdsRef = useRef<string[]>([]);
  const deletedWorkoutIdsRef = useRef<string[]>([]);
  const deletedPlannedExerciseIdsRef = useRef<string[]>([]);
  const deletedPlannedSetIdsRef = useRef<string[]>([]);
  const deletedExerciseIdsRef = useRef<string[]>([]);
  const deletedHistoryIdsRef = useRef<string[]>([]);

  // Synced tracking refs (prevent resurrection of deleted items)
  const syncedPlanIdsRef = useRef<string[]>([]);
  const syncedExerciseIdsRef = useRef<string[]>([]);
  const syncedHistoryIdsRef = useRef<string[]>([]);

  // Flag to suppress push-backs when state changes originate from Realtime events
  const isSyncingFromRemoteRef = useRef(false);

  // Broadcast channel ref (accessible from watchers)
  const broadcastChannelRef = useRef<any>(null);

  // Helper to update deletedIds refs + persist to localStorage
  const addDeletedPlanId = (id: string) => {
    if (!deletedPlanIdsRef.current.includes(id)) {
      deletedPlanIdsRef.current = [...deletedPlanIdsRef.current, id];
      localStorage.setItem("is_deleted_plans_v1", JSON.stringify(deletedPlanIdsRef.current));
    }
  };

  const addDeletedWorkoutIds = (ids: string[]) => {
    const newIds = ids.filter(id => !deletedWorkoutIdsRef.current.includes(id));
    if (newIds.length > 0) {
      deletedWorkoutIdsRef.current = [...deletedWorkoutIdsRef.current, ...newIds];
      localStorage.setItem("is_deleted_workouts_v1", JSON.stringify(deletedWorkoutIdsRef.current));
    }
  };

  const addDeletedPlannedExerciseIds = (ids: string[]) => {
    const newIds = ids.filter(id => !deletedPlannedExerciseIdsRef.current.includes(id));
    if (newIds.length > 0) {
      deletedPlannedExerciseIdsRef.current = [...deletedPlannedExerciseIdsRef.current, ...newIds];
      localStorage.setItem("is_deleted_planned_exercises_v1", JSON.stringify(deletedPlannedExerciseIdsRef.current));
    }
  };

  const addDeletedPlannedSetIds = (ids: string[]) => {
    const newIds = ids.filter(id => !deletedPlannedSetIdsRef.current.includes(id));
    if (newIds.length > 0) {
      deletedPlannedSetIdsRef.current = [...deletedPlannedSetIdsRef.current, ...newIds];
      localStorage.setItem("is_deleted_planned_sets_v1", JSON.stringify(deletedPlannedSetIdsRef.current));
    }
  };

  // Pre-compute an exercise map for O(1) lookups instead of O(N) .find() inside loops
  const exerciseMap = useMemo(() => {
    return exercises.reduce((acc, ex) => {
      acc[ex.id] = ex;
      return acc;
    }, {} as Record<string, ExerciseDef>);
  }, [exercises]);

  const exerciseMapByName = useMemo(() => {
    return exercises.reduce((acc, ex) => {
      acc[ex.name] = ex;
      return acc;
    }, {} as Record<string, ExerciseDef>);
  }, [exercises]);
  const addDeletedExerciseId = (id: string) => {
    if (!deletedExerciseIdsRef.current.includes(id)) {
      deletedExerciseIdsRef.current = [...deletedExerciseIdsRef.current, id];
      localStorage.setItem("is_deleted_exercises_v1", JSON.stringify(deletedExerciseIdsRef.current));
    }
  };
  const addDeletedHistoryId = (id: string) => {
    if (!deletedHistoryIdsRef.current.includes(id)) {
      deletedHistoryIdsRef.current = [...deletedHistoryIdsRef.current, id];
      localStorage.setItem("is_deleted_history_v1", JSON.stringify(deletedHistoryIdsRef.current));
    }
  };

  // Load state from local storage on mount
  useEffect(() => {
    const storedEx = localStorage.getItem("is_exercises_v3");
    const storedPlans = localStorage.getItem("is_plans_v3");
    const storedActivePlan = localStorage.getItem("is_active_plan_v3");
    const storedHistory = localStorage.getItem("is_history_v4");
    const storedActiveWorkout = localStorage.getItem("is_active_workout_v4");

    if (storedEx) setExercises(JSON.parse(storedEx));
    else setExercises(defaultExercises);

    // Starts completely empty unless plans exist in localStorage
    if (storedPlans) {
      const parsedPlans = JSON.parse(storedPlans);
      setPlans(parsedPlans);
      if (storedActivePlan) {
        setActivePlanId(storedActivePlan);
      } else if (parsedPlans.length > 0) {
        setActivePlanId(parsedPlans[0].id);
      }
    } else {
      setPlans([]);
      setActivePlanId(null);
    }

    if (storedHistory) setHistory(JSON.parse(storedHistory));
    if (storedActiveWorkout) setActiveWorkout(JSON.parse(storedActiveWorkout));

    const storedFocused = localStorage.getItem("is_focused_exercises_v1");
    if (storedFocused) setFocusedExercises(JSON.parse(storedFocused));

    const storedDeletedPlans = localStorage.getItem("is_deleted_plans_v1");
    if (storedDeletedPlans) deletedPlanIdsRef.current = JSON.parse(storedDeletedPlans);

    const storedDeletedWorkouts = localStorage.getItem("is_deleted_workouts_v1");
    if (storedDeletedWorkouts) deletedWorkoutIdsRef.current = JSON.parse(storedDeletedWorkouts);

    const storedDeletedPlannedExs = localStorage.getItem("is_deleted_planned_exercises_v1");
    if (storedDeletedPlannedExs) deletedPlannedExerciseIdsRef.current = JSON.parse(storedDeletedPlannedExs);

    const storedDeletedPlannedSets = localStorage.getItem("is_deleted_planned_sets_v1");
    if (storedDeletedPlannedSets) deletedPlannedSetIdsRef.current = JSON.parse(storedDeletedPlannedSets);

    const storedDeletedExercises = localStorage.getItem("is_deleted_exercises_v1");
    if (storedDeletedExercises) deletedExerciseIdsRef.current = JSON.parse(storedDeletedExercises);

    const storedDeletedHistory = localStorage.getItem("is_deleted_history_v1");
    if (storedDeletedHistory) deletedHistoryIdsRef.current = JSON.parse(storedDeletedHistory);

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
  const pushCustomExercisesToSupabase = async (userId: string, localExercises: ExerciseDef[], deletedIds: string[]) => {
    try {
      // 1. Delete explicitly deleted exercises from Supabase
      if (deletedIds.length > 0) {
        const { error: delErr } = await supabase
          .from("exercises")
          .delete()
          .eq("user_id", userId)
          .in("id", deletedIds);
        if (delErr) throw delErr;
        deletedExerciseIdsRef.current = deletedExerciseIdsRef.current.filter(id => !deletedIds.includes(id));
        localStorage.setItem("is_deleted_exercises_v1", JSON.stringify(deletedExerciseIdsRef.current));
      }

      // 2. Upsert remaining custom exercises
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
        is_time_based: ex.isTimeBased || false
      }));
      const { error: upErr } = await supabase.from("exercises").upsert(customToUpsert);
      if (upErr) throw upErr;

      const upsertedIds = customLocal.map(ex => ex.id);
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
        .select("id, name, muscle, video_url, thumbnail_url, secondary_muscles, mechanic_type, equipment, grip_type, stance, instructions, common_mistakes, breathing, difficulty_level, exercise_category, visible_fields")
        .eq("user_id", userId);

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
        isTimeBased: row.is_time_based || false
      }));
    } catch (e) {
      console.error("pullCustomExercisesFromSupabase error:", e);
      return [];
    }
  };

  const pushPlansToSupabase = async (
    userId: string,
    localPlans: Plan[],
    deletedIds: string[],
    deletedWorkoutIds: string[],
    deletedPlannedExerciseIds: string[],
    deletedPlannedSetIds: string[]
  ): Promise<boolean> => {
    try {
      // 1. Delete items that are explicitly marked as deleted

      // Delete sets
      if (deletedPlannedSetIds.length > 0) {
        const { error } = await supabase.from("planned_sets").delete().in("id", deletedPlannedSetIds);
        if (error) throw error;
        deletedPlannedSetIdsRef.current = deletedPlannedSetIdsRef.current.filter(id => !deletedPlannedSetIds.includes(id));
        localStorage.setItem("is_deleted_planned_sets_v1", JSON.stringify(deletedPlannedSetIdsRef.current));
      }

      // Delete planned exercises
      if (deletedPlannedExerciseIds.length > 0) {
        const { error } = await supabase.from("planned_exercises").delete().in("id", deletedPlannedExerciseIds);
        if (error) throw error;
        deletedPlannedExerciseIdsRef.current = deletedPlannedExerciseIdsRef.current.filter(id => !deletedPlannedExerciseIds.includes(id));
        localStorage.setItem("is_deleted_planned_exercises_v1", JSON.stringify(deletedPlannedExerciseIdsRef.current));
      }

      // Delete workouts
      if (deletedWorkoutIds.length > 0) {
        const { error } = await supabase.from("workouts").delete().in("id", deletedWorkoutIds);
        if (error) throw error;
        deletedWorkoutIdsRef.current = deletedWorkoutIdsRef.current.filter(id => !deletedWorkoutIds.includes(id));
        localStorage.setItem("is_deleted_workouts_v1", JSON.stringify(deletedWorkoutIdsRef.current));
      }

      // Delete plans
      if (deletedIds.length > 0) {
        const { error } = await supabase.from("plans").delete().eq("user_id", userId).in("id", deletedIds);
        if (error) throw error;
        deletedPlanIdsRef.current = deletedPlanIdsRef.current.filter(id => !deletedIds.includes(id));
        localStorage.setItem("is_deleted_plans_v1", JSON.stringify(deletedPlanIdsRef.current));
      }

      if (localPlans.length === 0) return true;

      // 2. Upsert remaining plans
      const plansToUpsert = localPlans.map(p => ({
        id: p.id,
        name: p.name,
        user_id: userId
      }));
      const { error: pErr } = await supabase.from("plans").upsert(plansToUpsert);
      if (pErr) throw pErr;

      // 3. Upsert remaining workouts
      const workoutsToUpsert: any[] = [];
      localPlans.forEach(p => {
        p.workouts.forEach((w, wIdx) => {
          workoutsToUpsert.push({
            id: w.id,
            plan_id: p.id,
            name: w.name,
            order_index: wIdx,
            user_id: userId
          });
        });
      });
      if (workoutsToUpsert.length > 0) {
        const { error: wErr } = await supabase.from("workouts").upsert(workoutsToUpsert);
        if (wErr) throw wErr;
      }

      // 4. Upsert remaining planned exercises
      const peToUpsert: any[] = [];
      localPlans.forEach(p => {
        p.workouts.forEach(w => {
          w.exercises.forEach((pe, peIdx) => {
            peToUpsert.push({
              id: pe.id,
              workout_id: w.id,
              exercise_id: pe.exerciseId,
              order_index: peIdx,
              user_id: userId
            });
          });
        });
      });
      if (peToUpsert.length > 0) {
        const { error: peErr } = await supabase.from("planned_exercises").upsert(peToUpsert);
        if (peErr) throw peErr;
      }

      // 5. Upsert remaining planned sets
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
                user_id: userId
              });
            });
          });
        });
      });
      if (psToUpsert.length > 0) {
        const { error: psErr } = await supabase.from("planned_sets").upsert(psToUpsert);
        if (psErr) throw psErr;
      }

      const upsertedIds = localPlans.map(p => p.id);
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
            id, name, order_index,
            planned_exercises (
              id, exercise_id, order_index,
              planned_sets (
                id, min_reps, max_reps, rest_seconds, is_drop_set, is_to_failure,
                method_type, custom_method_name, drop_count, rest_pause_sets, rest_pause_seconds, failure_type, order_index
              )
            )
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;
      if (!data) return [];

      return data.map((p: any) => {
        const workouts = (p.workouts || []).map((w: any) => {
          const exercises = (w.planned_exercises || []).map((pe: any) => {
            const sets = (pe.planned_sets || []).map((s: any) => ({
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
              order_index: pe.order_index
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

  const pushHistoryToSupabase = async (userId: string, localHistory: HistoryLog[], deletedIds: string[]) => {
    try {
      // 1. Delete history logs that are explicitly marked as deleted
      if (deletedIds.length > 0) {
        const { error: delErr } = await supabase
          .from("history_logs")
          .delete()
          .eq("user_id", userId)
          .in("id", deletedIds);
        if (delErr) throw delErr;
        deletedHistoryIdsRef.current = deletedHistoryIdsRef.current.filter(id => !deletedIds.includes(id));
        localStorage.setItem("is_deleted_history_v1", JSON.stringify(deletedHistoryIdsRef.current));
      }

      if (localHistory.length === 0) return;

      // 2. Upsert remaining history logs
      const logsToUpsert = localHistory.map(log => ({
        id: log.id,
        user_id: userId,
        name: log.name,
        date: log.date,
        duration_ms: log.durationMs,
        volume_kg: log.volumeKg,
        idle_time_ms: log.idleTimeMs || 0,
        prs: log.prs || []
      }));
      const { error: lErr } = await supabase.from("history_logs").upsert(logsToUpsert);
      if (lErr) throw lErr;

      // 3. Upsert log exercises
      const exercisesToUpsert: any[] = [];
      localHistory.forEach(log => {
        log.exercises.forEach((ex, exIdx) => {
          const hleId = `hle_${log.id}_${exIdx}`;
          exercisesToUpsert.push({
            id: hleId,
            history_log_id: log.id,
            name: ex.name,
            elapsed_seconds: ex.elapsedSeconds || 0,
            order_index: exIdx
          });
        });
      });
      if (exercisesToUpsert.length > 0) {
        const { error: exErr } = await supabase.from("history_log_exercises").upsert(exercisesToUpsert);
        if (exErr) throw exErr;
      }

      // 4. Upsert log sets
      const setsToUpsert: any[] = [];
      localHistory.forEach(log => {
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
        const { error: sErr } = await supabase.from("history_log_sets").upsert(setsToUpsert);
        if (sErr) throw sErr;
      }

      const upsertedIds = localHistory.map(log => log.id);
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
      const { data, error } = await supabase
        .from("history_logs")
        .select(`
          id, name, date, duration_ms, volume_kg,
          history_log_exercises (
            id, name, elapsed_seconds, order_index,
            history_log_sets (
              id, min_reps, max_reps, is_drop_set, is_to_failure, weight, reps,
              method_type, custom_method_name, drop_count, rest_pause_sets, rest_pause_seconds, failure_type, order_index
            )
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;
      if (!data) return [];

      return data.map((log: any) => {
        const exercises = (log.history_log_exercises || []).map((ex: any) => {
          const sets = (ex.history_log_sets || []).map((s: any) => ({
            minReps: s.min_reps,
            maxReps: s.max_reps,
            isDropSet: s.is_drop_set,
            isToFailure: s.is_to_failure,
            weight: s.weight,
            reps: s.reps,
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
    try {
      // 1. Exercises
      await pushCustomExercisesToSupabase(currentUser.id, exercises, deletedExerciseIdsRef.current);
      const pulledCustom = await pullCustomExercisesFromSupabase(currentUser.id);
      setExercises(prev => {
        const pulledIds = pulledCustom.map(pe => pe.id);
        const filteredPrev = prev.filter(ex => {
          if (!ex.id.startsWith("ex_")) return true;
          const wasSynced = syncedExerciseIdsRef.current.includes(ex.id);
          const isPulled = pulledIds.includes(ex.id);
          if (wasSynced && !isPulled) return false;
          return true;
        });

        const merged = [...filteredPrev];
        pulledCustom.forEach(pe => {
          if (!merged.some(me => me.id === pe.id) && !deletedExerciseIdsRef.current.includes(pe.id)) {
            merged.push(pe);
          }
        });

        const newSyncedIds = merged.filter(ex => ex.id.startsWith("ex_") && pulledIds.includes(ex.id)).map(ex => ex.id);
        syncedExerciseIdsRef.current = newSyncedIds;
        localStorage.setItem("is_synced_exercises_v1", JSON.stringify(newSyncedIds));
        return merged;
      });

      // 2. Plans
      const plansPushed = await pushPlansToSupabase(
        currentUser.id,
        plans,
        deletedPlanIdsRef.current,
        deletedWorkoutIdsRef.current,
        deletedPlannedExerciseIdsRef.current,
        deletedPlannedSetIdsRef.current
      );
      if (plansPushed) {
        const pulledPlans = await pullPlansFromSupabase(currentUser.id);
      setPlans(prev => {
        const pulledIds = pulledPlans.map(pp => pp.id);
        const filteredPrev = prev.filter(p => {
          const wasSynced = syncedPlanIdsRef.current.includes(p.id);
          const isPulled = pulledIds.includes(p.id);
          if (wasSynced && !isPulled) return false;
          return true;
        });

        const merged = [...filteredPrev];
        pulledPlans.forEach(pp => {
          const idx = merged.findIndex(mp => mp.id === pp.id);
          if (idx !== -1) {
            merged[idx] = pp;
          } else if (!deletedPlanIdsRef.current.includes(pp.id)) {
            merged.push(pp);
          }
        });

        const newSyncedIds = merged.filter(p => pulledIds.includes(p.id)).map(p => p.id);
        syncedPlanIdsRef.current = newSyncedIds;
        localStorage.setItem("is_synced_plans_v1", JSON.stringify(newSyncedIds));
        return merged;
      });
      }

      // 3. History Logs
      await pushHistoryToSupabase(currentUser.id, history, deletedHistoryIdsRef.current);
      const pulledHistory = await pullHistoryFromSupabase(currentUser.id);
      setHistory(prev => {
        const pulledIds = pulledHistory.map(ph => ph.id);
        const filteredPrev = prev.filter(log => {
          const wasSynced = syncedHistoryIdsRef.current.includes(log.id);
          const isPulled = pulledIds.includes(log.id);
          if (wasSynced && !isPulled) return false;
          return true;
        });

        const merged = [...filteredPrev];
        pulledHistory.forEach(ph => {
          if (!merged.some(mh => mh.id === ph.id) && !deletedHistoryIdsRef.current.includes(ph.id)) {
            merged.push(ph);
          }
        });

        const newSyncedIds = merged.filter(log => pulledIds.includes(log.id)).map(log => log.id);
        syncedHistoryIdsRef.current = newSyncedIds;
        localStorage.setItem("is_synced_history_v1", JSON.stringify(newSyncedIds));
        return merged.sort((a, b) => b.date - a.date);
      });

      // 4. Focus
      await pushFocusedExercisesToSupabase(currentUser.id, focusedExercises);
      const pulledFocus = await pullFocusedExercisesFromSupabase(currentUser.id);
      setFocusedExercises(prev => {
        const merged = [...prev];
        pulledFocus.forEach(pf => {
          if (!merged.includes(pf)) {
            merged.push(pf);
          }
        });
        return merged;
      });

      setLastSyncedTime(Date.now());
      setSyncStatus("synced");
    } catch (err) {
      console.error("Erro geral na sincronização:", err);
      setSyncStatus("error");
    }
  };

  // Trigger sync on load/user login
  useEffect(() => {
    if (user && isLoaded) {
      syncAllData(user);
    }
  }, [user, isLoaded]);

  // Supabase Broadcast Listener for Realtime Sync
  useEffect(() => {
    if (!user || !isLoaded) return;

    // We create a channel specific to this user.
    // 'broadcast: { self: false }' ensures we don't receive our own messages,
    // avoiding feedback loops entirely.
    const channel = supabase.channel(`sync-${user.id}`, {
      config: {
        broadcast: { self: false },
      },
    });

    // Save the channel to ref so push functions can broadcast
    broadcastChannelRef.current = channel;

    channel
      .on("broadcast", { event: "data_changed" }, async (payload) => {
        const { table } = payload.payload;

        // Block outgoing pushes briefly while we pull
        isSyncingFromRemoteRef.current = true;

        try {
          if (table === "plans" || table === "workouts" || table === "planned_exercises" || table === "planned_sets") {
            const pulledPlans = await pullPlansFromSupabase(user.id);
            setPlans((prev) => {
              const pulledIds = pulledPlans.map((pp) => pp.id);
              const filteredPrev = prev.filter((p) => {
                const wasSynced = syncedPlanIdsRef.current.includes(p.id);
                const isPulled = pulledIds.includes(p.id);
                if (wasSynced && !isPulled) return false;
                return true;
              });

              const merged = [...filteredPrev];
              pulledPlans.forEach((pp) => {
                const idx = merged.findIndex((mp) => mp.id === pp.id);
                if (idx !== -1) {
                  merged[idx] = pp;
                } else if (!deletedPlanIdsRef.current.includes(pp.id)) {
                  merged.push(pp);
                }
              });

              const newSyncedIds = merged.filter((p) => pulledIds.includes(p.id)).map((p) => p.id);
              syncedPlanIdsRef.current = newSyncedIds;
              localStorage.setItem("is_synced_plans_v1", JSON.stringify(newSyncedIds));
              return merged;
            });
          }

          if (table === "exercises") {
            const pulledCustom = await pullCustomExercisesFromSupabase(user.id);
            setExercises((prev) => {
              const pulledIds = pulledCustom.map((pe) => pe.id);
              const filteredPrev = prev.filter((ex) => {
                if (!ex.id.startsWith("ex_")) return true;
                const wasSynced = syncedExerciseIdsRef.current.includes(ex.id);
                const isPulled = pulledIds.includes(ex.id);
                if (wasSynced && !isPulled) return false;
                return true;
              });

              const merged = [...filteredPrev];
              pulledCustom.forEach((pe) => {
                if (!merged.some((me) => me.id === pe.id) && !deletedExerciseIdsRef.current.includes(pe.id)) {
                  merged.push(pe);
                }
              });

              const newSyncedIds = merged.filter((ex) => ex.id.startsWith("ex_") && pulledIds.includes(ex.id)).map((ex) => ex.id);
              syncedExerciseIdsRef.current = newSyncedIds;
              localStorage.setItem("is_synced_exercises_v1", JSON.stringify(newSyncedIds));
              return merged;
            });
          }

          if (table === "history_logs") {
            const pulledHistory = await pullHistoryFromSupabase(user.id);
            setHistory((prev) => {
              const pulledIds = pulledHistory.map((ph) => ph.id);
              const filteredPrev = prev.filter((log) => {
                const wasSynced = syncedHistoryIdsRef.current.includes(log.id);
                const isPulled = pulledIds.includes(log.id);
                if (wasSynced && !isPulled) return false;
                return true;
              });

              const merged = [...filteredPrev];
              pulledHistory.forEach((ph) => {
                if (!merged.some((mh) => mh.id === ph.id) && !deletedHistoryIdsRef.current.includes(ph.id)) {
                  merged.push(ph);
                }
              });

              const newSyncedIds = merged.filter((log) => pulledIds.includes(log.id)).map((log) => log.id);
              syncedHistoryIdsRef.current = newSyncedIds;
              localStorage.setItem("is_synced_history_v1", JSON.stringify(newSyncedIds));
              return merged.sort((a, b) => b.date - a.date);
            });
          }

          if (table === "focused_exercises") {
            const pulledFocus = await pullFocusedExercisesFromSupabase(user.id);
            setFocusedExercises((prev) => {
              const merged = [...prev];
              pulledFocus.forEach((pf) => {
                if (!merged.includes(pf)) {
                  merged.push(pf);
                }
              });
              return merged;
            });
          }
        } finally {
          setTimeout(() => {
            isSyncingFromRemoteRef.current = false;
          }, 500);
        }
      })
      .subscribe((status) => {
         // Silently subscribe to broadcast channel
      });

    return () => {
      supabase.removeChannel(channel);
      broadcastChannelRef.current = null;
    };
  }, [user, isLoaded]);

  // Auth Handlers
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
      pushCustomExercisesToSupabase(user.id, exercises, deletedExerciseIdsRef.current).then(() => {
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
        plans,
        deletedPlanIdsRef.current,
        deletedWorkoutIdsRef.current,
        deletedPlannedExerciseIdsRef.current,
        deletedPlannedSetIdsRef.current
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
    localStorage.setItem("is_history_v4", JSON.stringify(history));
    if (user && !isSyncingFromRemoteRef.current) {
      pushHistoryToSupabase(user.id, history, deletedHistoryIdsRef.current).then(() => {
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
          console.log('Screen Wake Lock is active');
          wakeLockRef.current.addEventListener('release', () => {
            console.log('Screen Wake Lock was released');
          });
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
        onClick={() => setIsAuthModalOpen(true)}
        className="p-2 text-concrete hover:text-white transition-colors relative flex items-center justify-center rounded-xl bg-concrete/5 border border-concrete/10 hover:border-vulcanico"
        title="Configurações de Sincronismo"
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
      id: `ex_${crypto.randomUUID()}`,
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
            id: `ex_${crypto.randomUUID()}`,
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
        const filePath = `videos/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("exercise_media").upload(filePath, editingExerciseVideoFile);
        if (!uploadErr) {
          const { data } = supabase.storage.from("exercise_media").getPublicUrl(filePath);
          videoUrl = data.publicUrl;
        }
      }

      if (editingExerciseThumbnailFile) {
        const ext = editingExerciseThumbnailFile.name.split('.').pop();
        const filePath = `thumbnails/${crypto.randomUUID()}.${ext}`;
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
        setExercises(prev => prev.filter(ex => ex.id !== id));
        if (id.startsWith("ex_")) {
          addDeletedExerciseId(id);
        }
      }
    });
  };

  // --- ACTIONS: PLAN BUILDER ---
  const handleStartCreatePlan = () => {
    setEditingPlan({
      id: `plan_${crypto.randomUUID()}`,
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

        // Find deleted workouts
        const oldWorkoutIds = oldPlan.workouts.map(w => w.id);
        const newWorkoutIds = editingPlan.workouts.map(w => w.id);
        const deletedWorkouts = oldWorkoutIds.filter(id => !newWorkoutIds.includes(id));
        if (deletedWorkouts.length > 0) addDeletedWorkoutIds(deletedWorkouts);

        // Find deleted planned exercises
        const oldExerciseIds = oldPlan.workouts.flatMap(w => w.exercises.map(e => e.id));
        const newExerciseIds = editingPlan.workouts.flatMap(w => w.exercises.map(e => e.id));
        const deletedExercises = oldExerciseIds.filter(id => !newExerciseIds.includes(id));
        if (deletedExercises.length > 0) addDeletedPlannedExerciseIds(deletedExercises);

        // Find deleted planned sets
        const oldSetIds = oldPlan.workouts.flatMap(w => w.exercises.flatMap(e => e.sets.map(s => s.id)));
        const newSetIds = editingPlan.workouts.flatMap(w => w.exercises.flatMap(e => e.sets.map(s => s.id)));
        const deletedSets = oldSetIds.filter(id => !newSetIds.includes(id));
        if (deletedSets.length > 0) addDeletedPlannedSetIds(deletedSets);

        const copy = [...prev];
        copy[idx] = editingPlan;
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
        setPlans(prev => prev.filter(p => p.id !== planId));
        addDeletedPlanId(planId);
        if (activePlanId === planId) {
          setActivePlanId(null);
        }
      }
    });
  };

  const handleAddWorkoutToBuilder = () => {
    if (!editingPlan) return;
    const newWorkout: WorkoutTemplate = {
      id: `wk_${crypto.randomUUID()}`,
      name: `Treino ${String.fromCharCode(65 + editingPlan.workouts.length)}`,
      exercises: []
    };
    setEditingPlan({
      ...editingPlan,
      workouts: [...editingPlan.workouts, newWorkout]
    });
    setEditingWorkoutId(newWorkout.id);
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

  const handleAddExerciseToWorkout = (exerciseDef: ExerciseDef) => {
    if (!editingPlan || !addingExerciseToWorkoutId) return;

    const plannedEx: PlannedExercise = {
      id: `pe_${crypto.randomUUID()}`,
      exerciseId: exerciseDef.id,
      sets: [
        { id: `ps_${crypto.randomUUID()}`, minReps: 8, maxReps: 12, isDropSet: false, isToFailure: false, restSeconds: 60 }
      ]
    };

    setEditingPlan({
      ...editingPlan,
      workouts: editingPlan.workouts.map(w => {
        if (w.id !== addingExerciseToWorkoutId) return w;
        return {
          ...w,
          exercises: [...w.exercises, plannedEx]
        };
      })
    });

    setAddingExerciseToWorkoutId(null);
    // Open configuration immediately
    setConfiguringExercise({
      workoutId: addingExerciseToWorkoutId,
      exercise: plannedEx
    });
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
      id: `ps_${crypto.randomUUID()}`,
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
    const session: ActiveWorkoutSession = {
      planId: activePlanId || "",
      workoutId: workout.id,
      name: `${planName} - ${workout.name}`,
      startTime: Date.now(),
      lastInteractionTime: Date.now(),
      totalIdleTimeMs: 0,
      exercises: workout.exercises.map(pe => {
        const exDef = exerciseMap[pe.exerciseId];
        let suggestedW: string | undefined = undefined;
        let suggestedR: string | undefined = undefined;
        let overloadSuggestion: string | undefined = undefined;

        if (exDef) {
          const performances: { weight: number, reps: number, date: number }[] = [];
          
          history.forEach(log => {
            log.exercises.forEach(he => {
              if (he.name === exDef.name) {
                let maxW = 0;
                let maxR = 0;
                he.sets.forEach(hs => {
                  const w = parseFloat(hs.weight) || 0;
                  const r = parseInt(hs.reps) || 0;
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

          if (performances.length > 0) {
            const lastP = performances[0];
            suggestedW = lastP.weight.toString();
            suggestedR = lastP.reps.toString();

            if (performances.length >= 2) {
              const prevP = performances[1];
              if (lastP.weight === prevP.weight && lastP.reps === prevP.reps && lastP.weight > 0) {
                const step = lastP.weight >= 40 ? 5 : 2; // +5kg for heavy exercises, +2kg for lighter ones
                const newWeight = lastP.weight + step;
                suggestedW = newWeight.toString();
                overloadSuggestion = `Você já fez ${lastP.reps}x ${lastP.weight}kg por 2 treinos seguidos. Tentar ${newWeight}kg hoje?`;
              }
            }
          }
        }

        return {
          id: pe.id,
          exerciseId: pe.exerciseId,
          elapsedSeconds: 0,
          overloadSuggestion,
          sets: pe.sets.map((ps, idx) => ({
            id: `as_${crypto.randomUUID()}`,
            minReps: ps.minReps,
            maxReps: ps.maxReps,
            isDropSet: ps.isDropSet,
            isToFailure: ps.isToFailure,
            restSeconds: ps.restSeconds,
            weight: "",
            reps: "",
            suggestedWeight: idx === 0 ? suggestedW : undefined,
            suggestedReps: idx === 0 ? suggestedR : undefined,
            completed: false,
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
  };



  const handleUpdateActiveSet = (exerciseId: string, setId: string, field: "weight" | "reps" | "completed", value: any) => {
    if (!activeWorkout) return;

    const isCompleting = field === "completed" && value === true;
    let isLastSetOfWorkout = false;

    if (isCompleting) {
      isLastSetOfWorkout = activeWorkout.exercises.every(ex =>
        ex.sets.every(s => s.id === setId ? true : s.completed)
      );
    }

    setActiveWorkout(prev => {
      if (!prev) return null;
      return {
        ...prev,
        lastInteractionTime: Date.now(),
        exercises: prev.exercises.map((ex, exIndex) => {
          if (ex.id !== exerciseId) return ex;

          const updatedSets = ex.sets.map((s, sIdx) => {
            if (s.id !== setId) return s;

            // Trigger Rest Timer
            if (field === "completed" && value === true && s.restSeconds > 0 && !s.completed && !isLastSetOfWorkout) {
              const exDef = exerciseMap[ex.exerciseId];
              const setIndex = sIdx + 1;
              
              // Determine next exercise
              let nextExName: string | undefined = undefined;
              let nextExLastWeight: string | undefined = undefined;
              
              const isLastSetOfThisExercise = sIdx === ex.sets.length - 1;
              if (isLastSetOfThisExercise) {
                const nextEx = prev.exercises[exIndex + 1];
                if (nextEx) {
                  const nextExDef = exerciseMap[nextEx.exerciseId];
                  nextExName = nextExDef?.name;
                  
                  // Find in history
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
                nextExerciseLastWeight: nextExLastWeight
              });
            }

            return { ...s, [field]: value };
          });

          // Auto-propagate weight and reps to subsequent sets as placeholders if this is the first set and we just clicked "completed"
          if (field === "completed" && value === true && updatedSets[0].id === setId) {
            const firstSetWeight = updatedSets[0].weight || updatedSets[0].suggestedWeight;
            const firstSetReps = updatedSets[0].reps || updatedSets[0].suggestedReps;
            for (let i = 1; i < updatedSets.length; i++) {
              if (!updatedSets[i].completed) {
                if (!updatedSets[i].weight && !updatedSets[i].suggestedWeight && firstSetWeight) updatedSets[i].suggestedWeight = firstSetWeight;
                if (!updatedSets[i].reps && !updatedSets[i].suggestedReps && firstSetReps) updatedSets[i].suggestedReps = firstSetReps;
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
          message: "Você finalizou a última série de todos os exercícios. Deseja finalizar o treino?",
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
            id: `as_${crypto.randomUUID()}`,
            minReps: firstSet ? firstSet.minReps : 8,
            maxReps: firstSet ? firstSet.maxReps : 12,
            isDropSet: firstSet ? firstSet.isDropSet : false,
            isToFailure: firstSet ? firstSet.isToFailure : false,
            restSeconds: firstSet ? firstSet.restSeconds : 60,
            weight: lastSet ? lastSet.weight : "",
            reps: lastSet ? lastSet.reps : "",
            completed: false,
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

  const handleAddExerciseToActiveWorkout = (exerciseDef: ExerciseDef) => {
    if (!activeWorkout) return;

    const newActiveEx: ActiveExercise = {
      id: `ae_${crypto.randomUUID()}`,
      exerciseId: exerciseDef.id,
      elapsedSeconds: 0,
      sets: [
        {
          id: `as_${crypto.randomUUID()}`,
          minReps: 8,
          maxReps: 12,
          isDropSet: false,
          isToFailure: false,
          restSeconds: 60,
          weight: "",
          reps: "",
          completed: false
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

  const handleFinishWorkout = () => {
    if (!activeWorkout) return;

    let totalVolume = 0;
    const completedExercises = activeWorkout.exercises.map(ae => {
      const exDef = exerciseMap[ae.exerciseId];
      const doneSets = ae.sets.filter(s => s.completed && s.reps && s.weight);

      doneSets.forEach(s => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps) || 0;
        totalVolume += (w * r);
      });

      return {
        name: exDef?.name || "Exercício",
        elapsedSeconds: ae.elapsedSeconds || 0,
        sets: doneSets.map(s => ({
          minReps: s.minReps,
          maxReps: s.maxReps,
          isDropSet: s.isDropSet,
          isToFailure: s.isToFailure,
          weight: s.weight,
          reps: s.reps,
          methodType: s.methodType,
          customMethodName: s.customMethodName,
          dropCount: s.dropCount,
          restPauseSets: s.restPauseSets,
          restPauseSeconds: s.restPauseSeconds,
          failureType: s.failureType
        }))
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
        history.forEach(log => {
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
        id: `h_${crypto.randomUUID()}`,
        name: activeWorkout.name,
        date: activeWorkout.startTime,
        durationMs: Date.now() - activeWorkout.startTime - finalIdleTime,
        idleTimeMs: finalIdleTime,
        volumeKg: Math.round(totalVolume),
        prs,
        exercises: completedExercises
      };

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
        setHistory(prev => prev.filter(log => log.id !== logId));
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

  // Helper for UI grouping
  const exercisesByMuscle = useMemo(() => exercises.reduce((acc, ex) => {
    if (!acc[ex.muscle]) acc[ex.muscle] = [];
    acc[ex.muscle].push(ex);
    return acc;
  }, {} as Record<string, ExerciseDef[]>), [exercises]);

  // Search filter for exercise lists
  const filteredExercises = useMemo(() => exercises.filter(ex => 
    ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) || 
    ex.muscle.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
  ), [exercises, exerciseSearchQuery]);

  const filteredExercisesByMuscle = useMemo(() => filteredExercises.reduce((acc, ex) => {
    if (!acc[ex.muscle]) acc[ex.muscle] = [];
    acc[ex.muscle].push(ex);
    return acc;
  }, {} as Record<string, ExerciseDef[]>), [filteredExercises]);

  const activePlan = plans.find(p => p.id === activePlanId);

  // --- STATS COMPUTATIONS ---
  const statsData = useMemo(() => {
    const filteredLogs = history.filter(log => {
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
  const isZerado = plans.length === 0 && !editingPlan && !activeWorkout;

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

  const activeExerciseIndex = activeWorkout
    ? activeWorkout.exercises.findIndex(ae => ae.sets.some(s => !s.completed))
    : -1;
  const resolvedActiveExerciseIndex = activeWorkout && activeExerciseIndex === -1
    ? activeWorkout.exercises.length - 1
    : activeExerciseIndex;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-noturno text-white">
      
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
                {editingExercise.videoUrl && !editingExerciseVideoFile && (
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
                    <ToggleSwitch checked={editingExercise.isTimeBased || false} onChange={(c) => setEditingExercise({...editingExercise, isTimeBased: c})} />
                  </div>
                  <p className="font-mono text-[9px] text-concrete/80 leading-relaxed mt-1">Se ativado, este exercício não pedirá peso/repetições e exibirá um cronômetro na tela de treino.</p>
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
                  <input type="text" value={editingExercise.equipment || ""} onChange={(e) => setEditingExercise({...editingExercise, equipment: e.target.value})} placeholder="Ex: Halter" className="w-full bg-transparent border-b border-concrete/30 py-2 font-display text-lg text-white focus:outline-none focus:border-vulcanico transition-colors" />
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
                  <input type="text" value={editingExercise.gripType || ""} onChange={(e) => setEditingExercise({...editingExercise, gripType: e.target.value})} placeholder="Ex: Pronada" className="w-full bg-transparent border-b border-concrete/30 py-2 font-display text-lg text-white focus:outline-none focus:border-vulcanico transition-colors" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-concrete text-[10px] uppercase">Postura</label>
                    <ToggleSwitch checked={editingExercise.visibleFields?.includes('stance') || false} onChange={(c) => toggleVisibleField('stance', c)} />
                  </div>
                  <input type="text" value={editingExercise.stance || ""} onChange={(e) => setEditingExercise({...editingExercise, stance: e.target.value})} placeholder="Ex: Unilateral" className="w-full bg-transparent border-b border-concrete/30 py-2 font-display text-lg text-white focus:outline-none focus:border-vulcanico transition-colors" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-concrete text-[10px] uppercase">Categoria</label>
                  <ToggleSwitch checked={editingExercise.visibleFields?.includes('exerciseCategory') || false} onChange={(c) => toggleVisibleField('exerciseCategory', c)} />
                </div>
                <input type="text" value={editingExercise.exerciseCategory || ""} onChange={(e) => setEditingExercise({...editingExercise, exerciseCategory: e.target.value})} placeholder="Ex: Hipertrofia, Cardio" className="w-full bg-transparent border-b border-concrete/30 py-2 font-display text-lg text-white focus:outline-none focus:border-vulcanico transition-colors" />
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

      {/* -------------------- ACTIVE WORKOUT OVERLAY -------------------- */}
      {activeWorkout && !isWorkoutMinimized && (
        <div className="absolute inset-0 z-40 bg-noturno flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-none p-6 pb-4 border-b border-concrete/20 flex justify-between items-center bg-noturno z-10">
            <div>
              <h2 className="font-display text-2xl uppercase text-white leading-none">{activeWorkout.name}</h2>
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsWorkoutMinimized(true)} 
                className="text-concrete hover:text-white transition-colors flex flex-col items-center"
              >
                <ChevronDown size={20} />
                <span className="font-mono text-[9px] uppercase mt-1">Minimizar</span>
              </button>
              <button 
                onClick={handleCancelWorkout} 
                className="text-concrete hover:text-white transition-colors flex flex-col items-center"
              >
                <X size={20} />
                <span className="font-mono text-[9px] uppercase mt-1">Cancelar</span>
              </button>
            </div>
          </div>

          {/* Active Workout Screen Scroll */}
          <div 
            className="flex-1 overflow-y-auto p-6 pb-40 relative"
            onScroll={(e) => {
              if (!blurMaskRef.current) return;
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              const distanceToBottom = scrollHeight - scrollTop - clientHeight;
              const fadeThreshold = 250; // Start fading out when 250px from the bottom
              const newOpacity = distanceToBottom < fadeThreshold ? Math.max(0, distanceToBottom / fadeThreshold) : 1;
              blurMaskRef.current.style.opacity = newOpacity.toString();
            }}
          >
            
            {/* Viewport Spotlight Blur Overlay */}
            <div 
              ref={blurMaskRef}
              className="fixed inset-x-0 bottom-[90px] h-[55%] pointer-events-none z-[45] transition-opacity duration-75" 
              style={{
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                maskImage: "linear-gradient(to bottom, transparent 0%, black 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 100%)",
                background: "linear-gradient(to bottom, transparent 0%, rgba(13,13,13,0.85) 100%)"
              }}
            ></div>

            
            {/* Netflix-style Auto-Pause Notification */}
            {activeWorkout.isPaused && (
              <div className="sticky top-0 mb-6 z-50 bg-vulcanico rounded-xl p-4 shadow-2xl border border-white/10 animate-slide-down flex flex-col gap-3">
                <div className="flex gap-3 items-start">
                  <div className="bg-noturno p-2 rounded-full text-vulcanico shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="font-display text-lg uppercase text-noturno leading-tight font-bold">Tudo certo por aí?</h4>
                    <p className="font-mono text-[10px] text-noturno/80 mt-1 uppercase font-bold tracking-widest">Notei um longo período sem atividade. Pausei seu relógio geral só por precaução.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setActiveWorkout(prev => prev ? {
                      ...prev,
                      isPaused: false,
                      totalIdleTimeMs: prev.totalIdleTimeMs + (Date.now() - prev.pauseStartTime!),
                      lastInteractionTime: Date.now(),
                      pauseStartTime: undefined
                    } : null);
                  }}
                  className="bg-noturno text-white font-display uppercase py-3 rounded-lg w-full text-sm hover:bg-black transition-colors shadow-lg"
                >
                  Estou Aqui, Continuar!
                </button>
              </div>
            )}

            <div className="flex flex-col gap-10">
              {activeWorkout.exercises.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-mono text-concrete uppercase text-xs">Sem exercícios adicionados.</p>
                  <button
                    onClick={() => setAddingExerciseToActiveWorkout(true)}
                    className="mt-4 border border-concrete/30 px-4 py-2 font-mono text-xs uppercase text-vulcanico hover:border-vulcanico rounded-xl"
                  >
                    + Adicionar Exercício
                  </button>
                </div>
              ) : (
                activeWorkout.exercises.map((ae, aeIdx) => {
                  const exDef = exerciseMap[ae.exerciseId];
                  const distance = aeIdx - resolvedActiveExerciseIndex;
                  const isQueued = distance > 0;
                  const isExerciseCompleted = ae.sets.every(s => s.completed);
                  const isCollapsed = isExerciseCompleted && !expandedCompletedExercises[ae.id];

                  if (isCollapsed) {
                    return (
                      <div key={ae.id} className="flex flex-col bg-concrete/5 border border-concrete/10 rounded-2xl p-4 transition-all animate-fade-in">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-vulcanico flex items-center justify-center text-noturno shrink-0">
                              <Check size={14} strokeWidth={3} />
                            </div>
                            <div>
                              <h3 className="font-display text-lg uppercase text-concrete leading-tight line-through">
                                {exDef?.name || "Desconhecido"}
                              </h3>
                              <span className="font-mono text-[9px] uppercase text-vulcanico mt-0.5 block">
                                {ae.sets.length} séries concluídas
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {ae.elapsedSeconds !== undefined && ae.elapsedSeconds > 0 && (
                              <span className="font-mono text-[9px] text-concrete bg-concrete/10 px-2 py-0.5 rounded flex items-center gap-1">
                                <Clock size={10} />
                                {formatTime(ae.elapsedSeconds * 1000)}
                              </span>
                            )}
                            <span className="font-mono text-[9px] text-concrete uppercase bg-concrete/10 px-2 py-0.5 rounded">
                              {exDef?.muscle || "Geral"}
                            </span>
                            <button
                              onClick={() => setExpandedCompletedExercises(prev => ({ ...prev, [ae.id]: true }))}
                              className="text-concrete hover:text-white p-1"
                              title="Expandir Exercício"
                            >
                              <ChevronDown size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={ae.id} 
                      className="flex flex-col relative transition-all duration-500"
                      style={
                        isQueued && isWorkoutMinimized
                          ? { opacity: distance === 1 ? 0.75 : distance === 2 ? 0.40 : 0.15 }
                          : undefined
                      }
                    >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col gap-1 w-full max-w-[65%]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-display text-2xl uppercase text-vulcanico leading-tight">
                                {exDef?.name || "Desconhecido"}
                              </h3>
                              {distance === 0 && !isExerciseCompleted && activeWorkout.exercises.length > 1 && (
                                <button 
                                  onClick={() => handleSkipExercise(ae.id)}
                                  className="text-[9px] font-mono uppercase bg-concrete/10 hover:bg-concrete/20 text-concrete hover:text-white px-2 py-1 rounded border border-concrete/20 transition-colors"
                                  title="Pular para o fim da lista"
                                >
                                  Pular
                                </button>
                              )}
                            </div>
                            {exDef?.videoUrl && !isQueued && (
                              <div className="w-full mt-2 mb-2 rounded-lg overflow-hidden border border-concrete/20 bg-black">
                                <video 
                                  src={exDef.videoUrl} 
                                  className="w-full h-auto max-h-[160px] object-cover mx-auto" 
                                  autoPlay 
                                  loop 
                                  muted 
                                  playsInline 
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isExerciseCompleted && (
                              <button
                                onClick={() => setExpandedCompletedExercises(prev => ({ ...prev, [ae.id]: false }))}
                                className="text-concrete hover:text-white p-0.5"
                                title="Recolher Exercício"
                              >
                                <ChevronUp size={18} />
                              </button>
                            )}
                            {ae.elapsedSeconds !== undefined && ae.elapsedSeconds > 0 && (
                              <span className="font-mono text-[10px] text-vulcanico bg-vulcanico/10 border border-vulcanico/20 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                <Clock size={11} className={!isQueued && !isExerciseCompleted ? "animate-pulse" : ""} />
                                {formatTime(ae.elapsedSeconds * 1000)}
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-concrete uppercase bg-concrete/10 px-2 py-0.5 rounded">
                              {exDef?.muscle || "Geral"}
                            </span>
                          </div>
                        </div>

                        {ae.overloadSuggestion && distance === 0 && !isExerciseCompleted && (
                          <div className="mb-4 bg-gradient-to-r from-vulcanico/20 to-transparent border-l-2 border-vulcanico p-3 rounded-r-lg">
                            <span className="font-mono text-xs text-vulcanico font-bold tracking-tight">💡 Desafio: </span>
                            <span className="font-mono text-xs text-white/90">{ae.overloadSuggestion}</span>
                          </div>
                        )}

                        {/* Visible Exercise Details */}
                        {exDef && exDef.visibleFields && exDef.visibleFields.length > 0 && !isQueued && (
                          <div className="flex flex-col gap-2 mt-3 mb-4 p-3 bg-concrete/5 border border-concrete/10 rounded-xl">
                            {exDef.visibleFields.map(field => {
                              const labelMap: Record<string, string> = {
                                secondaryMuscles: "Músculos Secundários",
                                mechanicType: "Mecânica",
                                equipment: "Equipamento",
                                difficultyLevel: "Dificuldade",
                                gripType: "Pegada",
                                stance: "Postura",
                                exerciseCategory: "Categoria",
                                instructions: "Instruções",
                                commonMistakes: "Erros Comuns",
                                breathing: "Respiração"
                              };
                              let value: any = exDef[field as keyof ExerciseDef];
                              if (!value || (Array.isArray(value) && value.length === 0)) return null;
                              if (Array.isArray(value)) value = value.join(', ');
                              
                              const isLongText = ['instructions', 'commonMistakes'].includes(field);
                              
                              return (
                                <div key={field} className={`flex ${isLongText ? 'flex-col gap-1' : 'justify-between items-center border-b border-concrete/5 pb-1 last:border-0 last:pb-0'}`}>
                                  <span className="font-mono text-[9px] text-concrete uppercase">{labelMap[field] || field}</span>
                                  <span className={`font-mono ${isLongText ? 'text-xs text-white' : 'text-[10px] text-white font-bold'} text-right whitespace-pre-wrap`}>
                                    {value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Sets Header */}
                        <div className="grid grid-cols-12 font-mono text-[10px] text-concrete uppercase mb-2 text-center font-bold">
                          <div className="col-span-2">Série</div>
                          <div className="col-span-3">(Reps)</div>
                          <div className="col-span-3">Carga (kg)</div>
                          <div className="col-span-2">Reps</div>
                          <div className="col-span-2">Feito</div>
                        </div>

                        {/* Sets Rows */}
                        <div className="flex flex-col gap-2">
                          {ae.sets.map((set, sIdx) => {
                            const hasMinMax = set.minReps !== undefined;
                            const targetText = hasMinMax 
                              ? `${set.minReps}-${set.maxReps}` 
                              : "Livre";

                            const isActiveSet = set.id === globalActiveSetId;

                            return (
                              <div 
                                key={set.id} 
                                className={`grid grid-cols-12 items-center text-center py-2 transition-all rounded-xl ${
                                  set.completed ? "bg-vulcanico/10 opacity-70" : "bg-concrete/5"
                                } ${isActiveSet ? "ring-2 ring-vulcanico shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse" : ""}`}
                              >
                                <div className="col-span-2 font-mono text-xs flex flex-col items-center justify-center">
                                  <span className="text-white font-bold">{sIdx + 1}</span>
                                  <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                                    {(() => {
                                      const type = set.methodType || (set.isDropSet ? "drop-set" : set.isToFailure ? "failure" : "normal");
                                      if (type === "drop-set") {
                                        const drops = set.dropCount && set.dropCount > 1 ? `x${set.dropCount}` : "";
                                        return <span className="text-[8px] bg-purple-900/50 text-purple-300 px-1 font-bold rounded">DROP{drops}</span>;
                                      }
                                      if (type === "failure") {
                                        const fMap: Record<string, string> = { concentrica: "C", excentrica: "E", isometrica: "I" };
                                        const fLetter = set.failureType ? fMap[set.failureType] || "" : "";
                                        return <span className="text-[8px] bg-red-950 text-red-400 px-1 font-bold rounded">FALHA{fLetter && `-${fLetter}`}</span>;
                                      }
                                      if (type === "rest-pause") {
                                        const sub = set.restPauseSets ? ` x${set.restPauseSets}` : "";
                                        return <span className="text-[8px] bg-blue-950 text-blue-400 px-1 font-bold rounded">RP{sub}</span>;
                                      }
                                      if (type === "warmup") {
                                        return <span className="text-[8px] bg-yellow-950 text-yellow-400 px-1 font-bold rounded">AQUEC</span>;
                                      }
                                      if (type === "custom") {
                                        return <span className="text-[8px] bg-concrete/20 text-white px-1 font-bold rounded uppercase">{set.customMethodName || "MÉT"}</span>;
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </div>

                                <div className="col-span-3 font-mono text-[11px] text-concrete">
                                  <div>{targetText}</div>
                                </div>

                                {exDef?.isTimeBased ? (
                                  <div className="col-span-5 px-1">
                                    <button
                                      onClick={() => {
                                        if (set.completed) {
                                          handleUpdateActiveSet(ae.id, set.id, "completed", false);
                                          return;
                                        }
                                        if (activeStopwatchSetId === set.id) {
                                          // PAUSE/STOP
                                          const finalTime = formatTime(activeStopwatchElapsedMs);
                                          setActiveStopwatchSetId(null);
                                          setActiveStopwatchStartTime(null);
                                          handleUpdateActiveSet(ae.id, set.id, "reps", finalTime);
                                        } else {
                                          // PLAY
                                          setActiveStopwatchSetId(set.id);
                                          setActiveStopwatchStartTime(Date.now());
                                          setActiveStopwatchElapsedMs(0);
                                        }
                                      }}
                                      className={`w-full bg-vulcanico/10 border ${activeStopwatchSetId === set.id ? 'border-vulcanico/80 bg-vulcanico/20' : 'border-vulcanico/30'} rounded-lg flex items-center justify-center gap-2 py-1.5 font-mono focus:outline-none transition-colors ${set.completed ? 'opacity-50 line-through text-concrete' : 'text-vulcanico'}`}
                                    >
                                      {activeStopwatchSetId === set.id ? (
                                        <>
                                          <div className="w-2 h-2 rounded-full bg-vulcanico animate-pulse"></div>
                                          <span className="text-sm font-bold">{formatTime(activeStopwatchElapsedMs)}</span>
                                        </>
                                      ) : set.completed && set.reps ? (
                                        <span className="text-sm">{set.reps}</span>
                                      ) : (
                                        <>
                                          <Play size={12} className="fill-vulcanico" />
                                          <span className="text-[10px] uppercase tracking-widest font-bold">Iniciar</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="col-span-3 px-1">
                                      <button 
                                        onClick={() => {
                                          if (!set.completed) {
                                            setActiveInputModal({
                                              exerciseId: ae.id,
                                              setId: set.id,
                                              field: "weight",
                                              initialValue: set.weight,
                                              suggestedValue: set.suggestedWeight || ""
                                            });
                                            setModalTempValue(set.weight || set.suggestedWeight || "0");
                                          }
                                        }}
                                        className={`w-full bg-transparent border-b border-concrete/30 text-center font-mono text-lg focus:outline-none py-0.5 min-h-[32px] ${!set.weight && set.suggestedWeight ? 'text-concrete/70' : 'text-white'}`}
                                        disabled={set.completed}
                                      >
                                        {set.weight || set.suggestedWeight || "0"}
                                      </button>
                                    </div>

                                    <div className="col-span-2 px-1">
                                      <button 
                                        onClick={() => {
                                          if (!set.completed) {
                                            setActiveInputModal({
                                              exerciseId: ae.id,
                                              setId: set.id,
                                              field: "reps",
                                              initialValue: set.reps,
                                              suggestedValue: set.suggestedReps || ""
                                            });
                                            setModalTempValue(set.reps || set.suggestedReps || "0");
                                          }
                                        }}
                                        className={`w-full bg-transparent border-b border-concrete/30 text-center font-mono text-lg focus:outline-none py-0.5 min-h-[32px] ${!set.reps && set.suggestedReps ? 'text-concrete/70' : 'text-white'}`}
                                        disabled={set.completed}
                                      >
                                        {set.reps || set.suggestedReps || "0"}
                                      </button>
                                    </div>
                                  </>
                                )}

                                <div className="col-span-2 flex justify-center">
                                  <button 
                                    onClick={() => handleUpdateActiveSet(ae.id, set.id, "completed", !set.completed)}
                                    className="text-vulcanico hover:scale-105 transition-transform"
                                  >
                                    {set.completed ? (
                                      <CheckSquare size={24} />
                                    ) : (
                                      <Square size={24} className="text-concrete" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Set actions */}
                        <div className="flex gap-2 mt-3">
                          <button 
                            onClick={() => handleAddActiveSet(ae.id)}
                            className="flex-1 font-mono text-[10px] uppercase text-concrete flex items-center justify-center gap-1 py-1.5 hover:text-white border border-dashed border-concrete/20 rounded-lg"
                          >
                            + Série
                          </button>
                          {ae.sets.length > 1 && (
                            <button 
                              onClick={() => handleRemoveActiveSet(ae.id, ae.sets[ae.sets.length - 1].id)}
                              className="font-mono text-[10px] uppercase text-red-500 hover:text-red-400 flex items-center justify-center px-3 py-1.5 border border-dashed border-red-500/20 rounded-lg"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                  );
                })
              )}

              {/* Add Extra Exercise */}
              {!addingExerciseToActiveWorkout && activeWorkout.exercises.length > 0 && (
                <button
                  onClick={() => setAddingExerciseToActiveWorkout(true)}
                  className="mt-4 border border-dashed border-vulcanico/30 text-vulcanico py-4 font-mono text-xs uppercase hover:bg-vulcanico/5 transition-colors rounded-xl"
                >
                  + Adicionar Exercício Extra
                </button>
              )}
            </div>
          </div>

          {/* Bottom Fixed Action Bar */}
          <div className="flex-none p-6 bg-noturno/95 border-t border-concrete/20 flex justify-between items-center z-30 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-2 text-vulcanico shrink-0">
              <Clock size={22} />
              <span className="font-mono text-2xl font-bold tracking-tight">{formatTime(elapsedTime)}</span>
            </div>

            {/* Slide to Unlock Finish Button */}
            <div 
              className="flex-1 ml-4 h-14 bg-concrete/10 border border-concrete/20 rounded-2xl relative flex items-center select-none overflow-hidden touch-none"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const rect = e.currentTarget.getBoundingClientRect();
                const handleWidth = 48; // w-12 = 48px
                const maximum = rect.width - handleWidth - 8; // 4px padding on each side
                setMaxDrag(maximum);
                setIsSliding(true);
              }}
              onPointerMove={(e) => {
                if (!isSliding) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const handleWidth = 48;
                const maximum = rect.width - handleWidth - 8;
                const clientX = e.clientX;
                const relativeX = clientX - rect.left - handleWidth / 2 - 4;
                const newX = Math.max(0, Math.min(relativeX, maximum));
                setSlideX(newX);
              }}
              onPointerUp={(e) => {
                if (!isSliding) return;
                setIsSliding(false);
                e.currentTarget.releasePointerCapture(e.pointerId);
                if (slideX >= maxDrag * 0.85) {
                  handleFinishWorkout();
                }
                setSlideX(0);
              }}
              onPointerCancel={(e) => {
                if (!isSliding) return;
                setIsSliding(false);
                e.currentTarget.releasePointerCapture(e.pointerId);
                setSlideX(0);
              }}
            >
              {/* Shimmer/fading text background */}
              <div 
                className="absolute inset-0 flex items-center justify-center font-display text-[9px] uppercase tracking-widest text-concrete font-bold transition-opacity duration-200 pointer-events-none select-none"
                style={{
                  opacity: Math.max(0, 1 - (slideX / (maxDrag || 1)) * 1.5),
                }}
              >
                Deslize para finalizar →
              </div>

              {/* Slider Handle */}
              <div 
                className={`w-12 h-12 bg-vulcanico text-noturno rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg hover:scale-105 ${
                  isSliding ? "shadow-vulcanico/30" : "transition-all duration-300"
                }`}
                style={{
                  transform: `translateX(${slideX + 4}px)`,
                }}
              >
                <Check size={20} strokeWidth={3} />
              </div>
            </div>
          </div>

          {/* Smart Input Modal */}
          {activeInputModal && (() => {
            const isWeight = activeInputModal.field === "weight";
            
            const handleQuickAction = (val: number) => {
              const current = parseFloat(modalTempValue) || 0;
              const next = Math.max(0, current + val);
              setModalTempValue(next % 1 !== 0 ? next.toFixed(1) : next.toString());
            };

            const handleConfirm = () => {
              handleUpdateActiveSet(
                activeInputModal.exerciseId,
                activeInputModal.setId,
                activeInputModal.field,
                modalTempValue
              );
              setActiveInputModal(null);
            };

            return (
              <div className="absolute inset-0 z-[60] bg-noturno/80 backdrop-blur-sm flex flex-col justify-end">
                <div className="bg-noturno border-t border-concrete/20 rounded-t-3xl p-6 flex flex-col gap-6 animate-fade-in shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                  
                  {/* Header & Close */}
                  <div className="flex justify-between items-center">
                    <h3 className="font-display text-xl text-concrete uppercase tracking-widest">
                      {isWeight ? "Ajustar Carga" : "Ajustar Repetições"}
                    </h3>
                    <button onClick={() => setActiveInputModal(null)} className="text-concrete hover:text-white p-2">
                      <X size={24} />
                    </button>
                  </div>

                  {/* Big Number Display */}
                  <div className="flex flex-col items-center justify-center py-4">
                    <span className="font-mono text-8xl text-white font-bold tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
                      {modalTempValue || "0"}
                      <span className="text-3xl text-concrete ml-2 font-normal">{isWeight ? "kg" : "reps"}</span>
                    </span>
                  </div>

                  {/* Slider */}
                  <div className="w-full px-2 mt-4">
                    <input 
                      type="range" 
                      min="0" 
                      max={isWeight ? "200" : "50"} 
                      step={isWeight ? "0.5" : "1"}
                      value={modalTempValue || 0}
                      onChange={(e) => setModalTempValue(e.target.value)}
                      className="w-full h-2 bg-concrete/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-vulcanico [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                    />
                    <div className="flex justify-between text-concrete font-mono text-[10px] mt-2 px-1">
                      <span>0</span>
                      <span>{isWeight ? "200" : "50"}</span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {isWeight ? (
                      <>
                        <button onClick={() => handleQuickAction(-5)} className="bg-concrete/10 py-3 rounded-xl font-mono text-sm text-concrete hover:bg-concrete/20 hover:text-white active:scale-95 transition-all">-5</button>
                        <button onClick={() => handleQuickAction(-2.5)} className="bg-concrete/10 py-3 rounded-xl font-mono text-sm text-concrete hover:bg-concrete/20 hover:text-white active:scale-95 transition-all">-2.5</button>
                        <button onClick={() => handleQuickAction(2.5)} className="bg-concrete/10 py-3 rounded-xl font-mono text-sm text-concrete hover:bg-concrete/20 hover:text-white active:scale-95 transition-all">+2.5</button>
                        <button onClick={() => handleQuickAction(5)} className="bg-vulcanico/20 text-vulcanico border border-vulcanico/30 py-3 rounded-xl font-mono text-sm hover:bg-vulcanico/30 hover:text-vulcanico active:scale-95 transition-all">+5</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setModalTempValue("0")} className="bg-red-950/40 text-red-400 py-3 rounded-xl font-mono text-[10px] uppercase font-bold hover:bg-red-900/50 active:scale-95 transition-all">Falhou</button>
                        <button onClick={() => handleQuickAction(-1)} className="bg-concrete/10 py-3 rounded-xl font-mono text-sm text-concrete hover:bg-concrete/20 hover:text-white active:scale-95 transition-all">-1</button>
                        <button onClick={() => handleQuickAction(1)} className="bg-concrete/10 py-3 rounded-xl font-mono text-sm text-concrete hover:bg-concrete/20 hover:text-white active:scale-95 transition-all">+1</button>
                        <button onClick={() => handleQuickAction(5)} className="bg-vulcanico/20 text-vulcanico border border-vulcanico/30 py-3 rounded-xl font-mono text-sm hover:bg-vulcanico/30 hover:text-vulcanico active:scale-95 transition-all">+5</button>
                      </>
                    )}
                  </div>

                  {/* Confirm Button */}
                  <button 
                    onClick={handleConfirm}
                    className="w-full bg-vulcanico text-noturno font-display uppercase tracking-widest py-4 rounded-xl text-xl mt-6 active:scale-95 transition-transform"
                  >
                    Confirmar
                  </button>

                </div>
              </div>
            );
          })()}

          {/* Full-Screen Rest Timer Overlay with Glassmorphism */}
          {restTimer && (
            <div className="absolute inset-0 z-50 bg-noturno/85 backdrop-blur-md flex flex-col justify-between p-8 animate-fade-in select-none">
              
              {/* Top: Context */}
              <div className="flex flex-col items-center text-center mt-12">
                <span className="font-mono text-xs text-vulcanico uppercase tracking-widest font-bold mb-2">
                  Tempo de Descanso
                </span>
                <h2 className="font-display text-3xl uppercase text-white leading-tight max-w-xs">
                  {restTimer.exerciseName}
                </h2>
                <span className="font-mono text-xs text-concrete uppercase tracking-wider mt-1">
                  Série {restTimer.setIndex} Concluída
                </span>
              </div>

              {/* Center: Giant Countdown with Milliseconds */}
              <div className="flex flex-col items-center justify-center my-auto">
                <span className="font-mono text-6xl md:text-7xl font-bold tracking-tight text-white tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
                  {formatRestTime(restRemainingMs)}
                </span>
                <div className="w-48 bg-concrete/20 h-1.5 rounded-full overflow-hidden mt-6">
                  <div 
                    className="bg-vulcanico h-full transition-all duration-100 ease-out"
                    style={{ width: `${Math.min(100, (restRemainingMs / (restTimer.duration * 1000)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Bottom: Interactive Controls */}
              <div className="flex flex-col gap-4 mb-8 w-full max-w-xs mx-auto">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleAddRestTime(10)}
                    className="py-3.5 border border-concrete/30 hover:border-white text-white font-mono text-xs uppercase rounded-xl transition-all font-bold hover:bg-white/5 active:scale-95"
                  >
                    +10s Descanso
                  </button>
                  <button 
                    onClick={() => handleAddRestTime(30)}
                    className="py-3.5 border border-concrete/30 hover:border-white text-white font-mono text-xs uppercase rounded-xl transition-all font-bold hover:bg-white/5 active:scale-95"
                  >
                    +30s Descanso
                  </button>
                </div>

                <button 
                  onClick={() => setRestTimer(null)} 
                  className="bg-vulcanico hover:bg-white text-noturno font-display text-sm font-bold uppercase py-4 rounded-xl transition-colors tracking-wider w-full shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  Pular Descanso
                </button>
              </div>
            </div>
          )}

          {/* Active Workout Select Exercise Overlay */}
          {addingExerciseToActiveWorkout && (
            <div className="absolute inset-0 z-50 bg-noturno/95 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display text-2xl uppercase">Selecionar Exercício</h3>
                <button 
                  onClick={() => setAddingExerciseToActiveWorkout(false)}
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
                        {list.map(ex => (
                          <button
                            key={ex.id}
                            onClick={() => handleAddExerciseToActiveWorkout(ex)}
                            className="text-left py-3 border-b border-concrete/10 hover:text-vulcanico transition-colors"
                          >
                            <span className="font-display text-lg uppercase block">{ex.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- PLAN BUILDER OVERLAY -------------------- */}
      {editingPlan && !configuringExercise && !addingExerciseToWorkoutId && (
        <div className="absolute inset-0 z-40 bg-noturno flex flex-col overflow-hidden">
          
          {editingWorkoutId ? (() => {
            const editingWorkout = editingPlan.workouts.find(w => w.id === editingWorkoutId);
            if (!editingWorkout) {
              setEditingWorkoutId(null);
              return null;
            }
            const wIdx = editingPlan.workouts.findIndex(w => w.id === editingWorkoutId);
            return (
              <>
                {/* Header for Workout Editor */}
                <div className="flex-none p-6 pb-4 border-b border-concrete/20 flex justify-between items-center bg-noturno">
                  <button 
                    onClick={() => setEditingWorkoutId(null)}
                    className="text-concrete hover:text-white transition-colors"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <h2 className="font-display text-2xl uppercase text-white leading-none">
                    Editar Treino
                  </h2>
                  <button 
                    onClick={() => setEditingWorkoutId(null)}
                    className="text-vulcanico hover:text-white transition-colors flex items-center gap-1 font-mono text-xs uppercase"
                  >
                    <Check size={20} /> Feito
                  </button>
                </div>

                {/* Workout Editor Body */}
                <div className="flex-1 overflow-y-auto p-6 pb-20">
                  <div className="flex flex-col gap-8">
                    {/* Workout Name + Delete Button side-by-side */}
                    <div className="flex items-end gap-4">
                      <div className="flex-1 flex flex-col">
                        <label className="font-mono text-[10px] text-concrete uppercase tracking-widest mb-1">Nome do Treino</label>
                        <input 
                          type="text" 
                          value={editingWorkout.name}
                          onChange={(e) => handleUpdateWorkoutNameInBuilder(editingWorkout.id, e.target.value)}
                          placeholder={`Treino ${String.fromCharCode(65 + wIdx)}`}
                          className="bg-transparent border-b border-concrete/30 py-2 font-display text-2xl text-white focus:outline-none focus:border-vulcanico transition-colors w-full"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            message: "Excluir este treino do plano?",
                            onConfirm: () => {
                              handleRemoveWorkoutFromBuilder(editingWorkout.id);
                              setEditingWorkoutId(null);
                            }
                          });
                        }}
                        className="text-concrete hover:text-red-500 pb-2 transition-colors flex-none"
                        title="Excluir Treino"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>

                    {/* Exercises List */}
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center border-b border-concrete/20 pb-2">
                        <span className="font-mono text-[11px] text-vulcanico uppercase tracking-widest font-bold">Exercícios</span>
                      </div>

                      {editingWorkout.exercises.length === 0 ? (
                        <p className="font-mono text-xs text-concrete uppercase text-center py-6">
                          Nenhum exercício neste treino.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {editingWorkout.exercises.map((pe) => {
                            const exDef = exerciseMap[pe.exerciseId];
                            return (
                              <div key={pe.id} className="flex items-center justify-between py-2 border-b border-concrete/10">
                                <div>
                                  <span className="font-display uppercase text-white text-lg">
                                    {exDef?.name || "Desconhecido"}
                                  </span>
                                  <div className="font-mono text-[9px] text-concrete uppercase mt-0.5">
                                    {pe.sets.length} séries • Meta: {
                                      pe.sets.map((s) => {
                                        let methodTag = "";
                                        const type = s.methodType || (s.isDropSet ? "drop-set" : s.isToFailure ? "failure" : "normal");
                                        if (type === "drop-set") {
                                          methodTag = ` [D${s.dropCount && s.dropCount > 1 ? `x${s.dropCount}` : ""}]`;
                                        } else if (type === "failure") {
                                          methodTag = ` [F]`;
                                        } else if (type === "rest-pause") {
                                          methodTag = ` [RP]`;
                                        } else if (type === "warmup") {
                                          methodTag = ` [W]`;
                                        } else if (type === "custom") {
                                          methodTag = ` [${(s.customMethodName || "CST").substring(0,3)}]`;
                                        }
                                        return `${s.minReps}-${s.maxReps}r${methodTag}`;
                                      }).join(" / ")
                                    }
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => setConfiguringExercise({ workoutId: editingWorkout.id, exercise: pe })}
                                    className="text-vulcanico hover:text-white transition-colors"
                                    title="Configurar Exercício"
                                  >
                                    <Edit3 size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleRemoveExerciseFromWorkout(editingWorkout.id, pe.id)}
                                    className="text-concrete hover:text-red-500"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fixed Add Exercise Button stuck to the bottom */}
                <div className="flex-none p-6 border-t border-concrete/10 bg-noturno">
                  <button 
                    onClick={() => handleOpenAddExerciseToWorkout(editingWorkout.id)}
                    className="w-full bg-vulcanico hover:bg-white text-noturno font-display text-sm uppercase py-4 transition-colors text-center tracking-wider rounded-2xl"
                  >
                    + Adicionar Exercício
                  </button>
                </div>
              </>
            );
          })() : (
            <>
              {/* Header for Plan Creator */}
              <div className="flex-none p-6 pb-4 border-b border-concrete/20 flex justify-between items-center bg-noturno">
                <h2 className="font-display text-2xl uppercase text-white leading-none">
                  {plans.some(p => p.id === editingPlan.id) ? "Editar Plano" : "Novo Plano"}
                </h2>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setEditingPlan(null)} 
                    className="text-concrete hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                  <button 
                    onClick={handleSavePlan} 
                    className="text-vulcanico hover:text-white transition-colors flex items-center gap-1 font-mono text-xs uppercase"
                  >
                    <Save size={16} /> Salvar
                  </button>
                </div>
              </div>

              {/* Plan Builder Body */}
              <div className="flex-1 overflow-y-auto p-6 pb-20">
                <div className="flex flex-col gap-8">
                  {/* Plan Name */}
                  <div className="flex flex-col">
                    <label className="font-mono text-[10px] text-concrete uppercase tracking-widest mb-1">Nome do Plano</label>
                    <input 
                      type="text" 
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                      placeholder="EX: HIPERTROFIA ABC"
                      className="bg-transparent border-b border-concrete/30 py-2 font-display text-2xl text-white focus:outline-none focus:border-vulcanico transition-colors"
                    />
                  </div>

                  {/* Workouts Vertical List (Fichas) */}
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center border-b border-concrete/20 pb-2">
                      <span className="font-mono text-[11px] text-vulcanico uppercase tracking-widest font-bold">Treinos do Plano</span>
                      <button 
                        onClick={handleAddWorkoutToBuilder}
                        className="font-mono text-[10px] uppercase text-vulcanico hover:text-white transition-colors"
                      >
                        + Adicionar Treino
                      </button>
                    </div>

                    {editingPlan.workouts.length === 0 ? (
                      <p className="font-mono text-xs text-concrete uppercase text-center py-6">
                        Nenhum treino no plano. Clique acima para adicionar.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {editingPlan.workouts.map((w, wIdx) => (
                          <button
                            key={w.id}
                            onClick={() => setEditingWorkoutId(w.id)}
                            className="w-full text-left py-4 px-6 border border-concrete/20 hover:border-vulcanico hover:text-vulcanico transition-colors flex justify-between items-center bg-concrete/5 group rounded-2xl"
                          >
                            <span className="font-display text-lg uppercase tracking-wider">
                              {w.name || `Treino ${String.fromCharCode(65 + wIdx)}`}
                            </span>
                            <ChevronRight size={18} className="text-concrete group-hover:text-vulcanico transition-colors" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* -------------------- ADD EXERCISE TO WORKOUT OVERLAY -------------------- */}
      {addingExerciseToWorkoutId && (
        <div className="absolute inset-0 z-50 bg-noturno flex flex-col p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display text-2xl uppercase">Selecionar Exercício</h3>
            <button 
              onClick={() => setAddingExerciseToWorkoutId(null)}
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
              <p className="font-mono text-xs text-concrete uppercase">
                Nenhum exercício encontrado.
              </p>
            ) : (
              Object.entries(filteredExercisesByMuscle).map(([muscle, list]) => (
                <div key={muscle} className="flex flex-col">
                  <span className="font-mono text-concrete text-[10px] tracking-widest uppercase mb-2">
                    {muscle}
                  </span>
                  <div className="flex flex-col gap-2">
                    {list.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => handleAddExerciseToWorkout(ex)}
                        className="text-left py-3 border-b border-concrete/10 hover:text-vulcanico transition-colors"
                      >
                        <span className="font-display text-lg uppercase block">{ex.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* -------------------- CONFIG EXERCISE SETS PANEL -------------------- */}
      {configuringExercise && (
        <div className="absolute inset-0 z-50 bg-noturno flex flex-col overflow-hidden">
          <div className="flex-none p-6 pb-4 border-b border-concrete/20 flex justify-between items-center bg-noturno">
            <div>
              <span className="font-mono text-[9px] text-concrete uppercase tracking-widest">Configurar Séries</span>
              <h2 className="font-display text-2xl uppercase text-white leading-none mt-1">
                {exerciseMap[configuringExercise.exercise.exerciseId]?.name || "Exercício"}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setConfiguringExercise(null)} 
                className="text-concrete hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <button 
                onClick={handleSaveExerciseConfig} 
                className="text-vulcanico hover:text-white transition-colors"
                title="Salvar"
              >
                <Save size={24} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pb-20">
            <div className="flex flex-col gap-6">
              {configuringExercise.exercise.sets.map((set, sIdx) => (
                <div key={set.id} className="pb-6 border-b border-concrete/10 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-vulcanico uppercase font-bold">Série {sIdx + 1}</span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleApplySetConfigToAll(set.id)}
                        className="text-concrete hover:text-vulcanico flex items-center gap-1 font-mono text-[9px] uppercase"
                        title="Aplicar esta configuração em todas as outras séries"
                      >
                        <Copy size={12} /> Replicar Config
                      </button>
                      {configuringExercise.exercise.sets.length > 1 && (
                        <button
                          onClick={() => handleRemoveSetFromConfig(set.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Config Inputs */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-mono text-[9px] text-concrete uppercase tracking-widest block mb-2 text-center">Reps Mín</label>
                      <div className="flex items-center justify-between border-b border-concrete/30 py-1 select-none">
                        <button
                          type="button"
                          onClick={() => handleUpdateSetConfig(set.id, { minReps: Math.max(0, set.minReps - 1) })}
                          className="text-concrete hover:text-white p-1 transition-colors"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <span className="font-mono text-lg text-white font-bold">{set.minReps}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateSetConfig(set.id, { minReps: set.minReps + 1 })}
                          className="text-concrete hover:text-white p-1 transition-colors"
                        >
                          <ChevronUp size={16} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="font-mono text-[9px] text-concrete uppercase tracking-widest block mb-2 text-center">Reps Máx</label>
                      <div className="flex items-center justify-between border-b border-concrete/30 py-1 select-none">
                        <button
                          type="button"
                          onClick={() => handleUpdateSetConfig(set.id, { maxReps: Math.max(0, set.maxReps - 1) })}
                          className="text-concrete hover:text-white p-1 transition-colors"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <span className="font-mono text-lg text-white font-bold">{set.maxReps}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateSetConfig(set.id, { maxReps: set.maxReps + 1 })}
                          className="text-concrete hover:text-white p-1 transition-colors"
                        >
                          <ChevronUp size={16} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="font-mono text-[9px] text-concrete uppercase tracking-widest block mb-2 text-center">Descanso (s)</label>
                      <div className="flex items-center justify-between border-b border-concrete/30 py-1 select-none">
                        <button
                          type="button"
                          onClick={() => handleUpdateSetConfig(set.id, { restSeconds: Math.max(0, set.restSeconds - 5) })}
                          className="text-concrete hover:text-white p-1 transition-colors"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <span className="font-mono text-lg text-white font-bold">{set.restSeconds}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateSetConfig(set.id, { restSeconds: set.restSeconds + 5 })}
                          className="text-concrete hover:text-white p-1 transition-colors"
                        >
                          <ChevronUp size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Advanced Methods Selector */}
                  <div className="flex flex-col gap-3 mt-2 border-t border-concrete/10 pt-4">
                    <span className="font-mono text-[9px] text-concrete uppercase tracking-widest block">Método Avançado</span>
                    
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "normal", label: "Normal", color: "border-concrete/30 hover:border-white text-white" },
                        { id: "drop-set", label: "Drop-set", color: "border-purple-500/50 hover:border-purple-500 text-purple-400 bg-purple-950/20" },
                        { id: "failure", label: "Falha", color: "border-red-500/50 hover:border-red-500 text-red-400 bg-red-950/20" },
                        { id: "rest-pause", label: "Rest-Pause", color: "border-blue-500/50 hover:border-blue-500 text-blue-400 bg-blue-950/20" },
                        { id: "warmup", label: "Aquec.", color: "border-yellow-500/50 hover:border-yellow-500 text-yellow-400 bg-yellow-950/20" },
                        { id: "custom", label: "Outro (+)", color: "border-concrete/30 hover:border-vulcanico text-vulcanico" }
                      ].map((btn) => {
                        const currentType = set.methodType || (set.isDropSet ? "drop-set" : set.isToFailure ? "failure" : "normal");
                        const isSelected = currentType === btn.id;
                        
                        return (
                          <button
                            key={btn.id}
                            type="button"
                            onClick={() => {
                              handleUpdateSetConfig(set.id, {
                                methodType: btn.id,
                                isDropSet: btn.id === "drop-set",
                                isToFailure: btn.id === "failure",
                                ...(btn.id === "drop-set" ? { dropCount: set.dropCount || 1 } : {}),
                                ...(btn.id === "rest-pause" ? {
                                  restPauseSets: set.restPauseSets !== undefined ? set.restPauseSets : 3,
                                  restPauseSeconds: set.restPauseSeconds !== undefined ? set.restPauseSeconds : 15
                                } : {}),
                                ...(btn.id === "failure" ? { failureType: set.failureType || "concentrica" } : {}),
                                ...(btn.id === "custom" ? { customMethodName: set.customMethodName || "Cluster" } : {})
                              });
                            }}
                            className={`font-mono text-[10px] uppercase px-3 py-1.5 border transition-all rounded-lg ${
                              isSelected 
                                ? "bg-vulcanico border-vulcanico text-noturno font-bold" 
                                : btn.color
                            }`}
                          >
                            {btn.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Method Details Config */}
                    {(() => {
                      const type = set.methodType || (set.isDropSet ? "drop-set" : set.isToFailure ? "failure" : "normal");
                      
                      if (type === "drop-set") {
                        const drops = set.dropCount || 1;
                        return (
                          <div className="flex items-center gap-4 bg-purple-950/10 p-3 border border-purple-500/20 mt-1 rounded-xl">
                            <span className="font-mono text-[10px] text-purple-300 uppercase">Qtd de Drops:</span>
                            <div className="flex items-center gap-4 border-b border-purple-500/30 py-0.5 select-none">
                              <button
                                type="button"
                                onClick={() => handleUpdateSetConfig(set.id, { dropCount: Math.max(1, drops - 1) })}
                                className="text-purple-400 hover:text-white p-0.5"
                              >
                                <ChevronDown size={14} />
                              </button>
                              <span className="font-mono text-sm text-purple-300 font-bold">{drops}x drops</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateSetConfig(set.id, { dropCount: drops + 1 })}
                                className="text-purple-400 hover:text-white p-0.5"
                              >
                                <ChevronUp size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      if (type === "failure") {
                        const failure = set.failureType || "concentrica";
                        return (
                          <div className="flex flex-col gap-2 bg-red-950/10 p-3 border border-red-500/20 mt-1 rounded-xl">
                            <span className="font-mono text-[10px] text-red-300 uppercase">Tipo de Falha:</span>
                            <div className="flex gap-2">
                              {[
                                { id: "concentrica", label: "Concêntrica" },
                                { id: "excentrica", label: "Excêntrica" },
                                { id: "isometrica", label: "Isométrica" }
                              ].map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => handleUpdateSetConfig(set.id, { failureType: f.id })}
                                  className={`font-mono text-[9px] uppercase px-2 py-1 border border-red-500/30 hover:border-red-400 rounded-lg ${
                                    failure === f.id ? "bg-red-950 text-red-400 border-red-500 font-bold" : "text-concrete"
                                  }`}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (type === "rest-pause") {
                        const rpSets = set.restPauseSets || 3;
                        const rpSecs = set.restPauseSeconds || 15;
                        return (
                          <div className="grid grid-cols-2 gap-4 bg-blue-950/10 p-3 border border-blue-500/20 mt-1 rounded-xl">
                            <div>
                              <span className="font-mono text-[10px] text-blue-300 uppercase block mb-1">Mini-Séries:</span>
                              <div className="flex items-center justify-between border-b border-blue-500/30 py-0.5 select-none">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSetConfig(set.id, { restPauseSets: Math.max(1, rpSets - 1) })}
                                  className="text-blue-400 hover:text-white p-0.5"
                                >
                                  <ChevronDown size={14} />
                                </button>
                                <span className="font-mono text-xs text-blue-300 font-bold">{rpSets}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSetConfig(set.id, { restPauseSets: rpSets + 1 })}
                                  className="text-blue-400 hover:text-white p-0.5"
                                >
                                  <ChevronUp size={14} />
                                </button>
                              </div>
                            </div>
                            <div>
                              <span className="font-mono text-[10px] text-blue-300 uppercase block mb-1">Mini-Descanso:</span>
                              <div className="flex items-center justify-between border-b border-blue-500/30 py-0.5 select-none">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSetConfig(set.id, { restPauseSeconds: Math.max(5, rpSecs - 5) })}
                                  className="text-blue-400 hover:text-white p-0.5"
                                >
                                  <ChevronDown size={14} />
                                </button>
                                <span className="font-mono text-xs text-blue-300 font-bold">{rpSecs}s</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSetConfig(set.id, { restPauseSeconds: rpSecs + 5 })}
                                  className="text-blue-400 hover:text-white p-0.5"
                                >
                                  <ChevronUp size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (type === "custom") {
                        const name = set.customMethodName || "";
                        return (
                          <div className="flex flex-col gap-1.5 bg-concrete/5 p-3 border border-concrete/20 mt-1 rounded-xl">
                            <label className="font-mono text-[10px] text-concrete uppercase">Nome do Método Customizado:</label>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => handleUpdateSetConfig(set.id, { customMethodName: e.target.value })}
                              placeholder="EX: CLUSTER SET"
                              className="bg-transparent border-b border-concrete/30 py-1 font-mono text-xs text-white focus:outline-none focus:border-vulcanico uppercase"
                            />
                          </div>
                        );
                      }

                      return null;
                    })()}
                  </div>
                </div>
              ))}

              <button 
                onClick={handleAddSetToConfig}
                className="mt-2 border border-dashed border-concrete/30 hover:border-vulcanico text-concrete hover:text-white py-3 font-mono text-xs uppercase flex items-center justify-center gap-2 transition-colors rounded-xl"
              >
                <Plus size={14} /> Adicionar Série
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MAIN TABS -------------------- */}
      <div className={`flex-1 overflow-y-auto ${activeWorkout && !isWorkoutMinimized ? "hidden" : "block"}`}>
        
        {/* TAB: PLANOS */}
        {activeTab === "plans" && !editingPlan && (
          <div className="p-6 flex flex-col min-h-full">
            <div className="flex justify-between items-end mb-8">
              <h1 className="font-display text-4xl uppercase text-white tracking-tighter leading-none">Planos</h1>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleStartCreatePlan}
                  className="font-mono text-[11px] text-vulcanico uppercase tracking-widest underline hover:text-white"
                >
                  + Criar Plano
                </button>
                {renderSyncButton()}
              </div>
            </div>

            {/* Active Plan Detail */}
            {activePlan ? (
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <span className="font-mono text-concrete text-[10px] tracking-widest block mb-1">PLANO ATIVO</span>
                  <div className="flex justify-between items-start gap-4">
                    <h2 className="font-display text-3xl text-white uppercase tracking-tight leading-none">{activePlan.name}</h2>
                  </div>
                </div>

                <>
                  <div 
                    onScroll={(e) => {
                      if (isDragging) return;
                      const container = e.currentTarget;
                      const slideWidth = container.clientWidth * 0.9;
                      const index = slideWidth > 0 ? Math.round(container.scrollLeft / slideWidth) : 0;
                      setActiveWorkoutIndex(index);
                    }}
                    onMouseDown={(e) => {
                      const container = e.currentTarget;
                      setIsDragging(true);
                      setStartX(e.pageX - container.offsetLeft);
                      setScrollLeftVal(container.scrollLeft);
                    }}
                    onMouseMove={(e) => {
                      if (!isDragging) return;
                      e.preventDefault();
                      const container = e.currentTarget;
                      const x = e.pageX - container.offsetLeft;
                      const walk = (x - startX) * 1.5;
                      container.scrollLeft = scrollLeftVal - walk;
                    }}
                    onMouseUp={(e) => {
                      if (!isDragging) return;
                      setIsDragging(false);
                      const container = e.currentTarget;
                      const slideWidth = container.clientWidth * 0.9;
                      const index = slideWidth > 0 ? Math.round(container.scrollLeft / slideWidth) : 0;
                      container.scrollTo({
                        left: index * slideWidth,
                        behavior: 'smooth'
                      });
                      setActiveWorkoutIndex(index);
                    }}
                    onMouseLeave={(e) => {
                      if (!isDragging) return;
                      setIsDragging(false);
                      const container = e.currentTarget;
                      const slideWidth = container.clientWidth * 0.9;
                      const index = slideWidth > 0 ? Math.round(container.scrollLeft / slideWidth) : 0;
                      container.scrollTo({
                        left: index * slideWidth,
                        behavior: 'smooth'
                      });
                      setActiveWorkoutIndex(index);
                    }}
                    className={`flex overflow-x-auto flex-nowrap scrollbar-none ${
                      isDragging ? "cursor-grabbing select-none" : "snap-x snap-mandatory cursor-grab"
                    }`}
                  >
                    {activePlan.workouts.length === 0 ? (
                      <p className="font-mono text-xs text-concrete uppercase">Este plano não possui treinos cadastrados.</p>
                    ) : (
                      activePlan.workouts.map((w) => (
                        <div key={w.id} className="w-[90%] shrink-0 snap-center px-2 flex flex-col">
                          <div className="w-full aspect-[4/3] border border-concrete/20 bg-concrete/5 p-6 flex items-center justify-center rounded-2xl">
                            <h3 className="font-display text-3xl text-white uppercase leading-none">{w.name}</h3>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {activePlan.workouts.length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-2">
                      {activePlan.workouts.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`h-1.5 transition-all duration-300 rounded-full ${
                            idx === activeWorkoutIndex ? "w-4 bg-vulcanico" : "w-1.5 bg-concrete/40"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {activePlan.workouts.length > 0 && (
                    <button 
                      onClick={() => {
                        if (activeWorkout) {
                          setIsWorkoutMinimized(false);
                          return;
                        }
                        const currentWorkout = activePlan.workouts[activeWorkoutIndex];
                        if (currentWorkout) {
                          handleStartWorkout(currentWorkout, activePlan.name);
                        }
                      }}
                      className={`font-display text-sm uppercase py-3.5 transition-colors w-full text-center tracking-wider mt-4 rounded-2xl ${
                        activeWorkout 
                          ? "bg-concrete/20 text-concrete hover:bg-concrete/30 hover:text-white"
                          : "bg-vulcanico hover:bg-white text-noturno"
                      }`}
                    >
                      {activeWorkout ? "Treino em Andamento..." : "Iniciar Treino"}
                    </button>
                  )}
                </>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                <span className="font-mono text-concrete text-xs uppercase mb-4">Nenhum plano ativo</span>
                <button 
                  onClick={handleStartCreatePlan}
                  className="bg-vulcanico hover:bg-white text-noturno font-display text-lg uppercase py-3 px-6 tracking-wide transition-colors"
                >
                  + Construir Plano
                </button>
              </div>
            )}

            {/* List all plans if more than 1 */}
            {plans.length > 0 && (
              <div className="mt-8 pt-8 border-t border-concrete/20">
                <span className="font-mono text-concrete text-[10px] tracking-widest block mb-4 uppercase">
                  Todos os Planos ({plans.length})
                </span>
                <div className="flex flex-col gap-4">
                  {plans.map(p => {
                    const isActive = p.id === activePlanId;
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-concrete/10">
                        <div>
                          <span className={`font-display text-xl uppercase ${isActive ? "text-vulcanico font-bold" : "text-white"}`}>
                            {p.name}
                          </span>
                          {isActive && <span className="font-mono text-[9px] text-vulcanico uppercase ml-2">[Ativo]</span>}
                          <span className="font-mono text-[10px] text-concrete block uppercase mt-0.5">
                            {p.workouts.length} treinos
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {!isActive && (
                            <button
                              onClick={() => setActivePlanId(p.id)}
                              className="text-concrete hover:text-white font-mono text-[10px] uppercase"
                            >
                              Ativar
                            </button>
                          )}
                          <button
                            onClick={() => handleEditPlan(p)}
                            className="text-concrete hover:text-white"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeletePlan(p.id)}
                            className="text-concrete hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


          </div>
        )}

        {/* TAB: BIBLIOTECA EXERCICIOS */}
        {activeTab === "exercises" && (
          <div className="p-6 flex flex-col min-h-full">
            <div className="flex justify-between items-start mb-8">
              <h1 className="font-display text-4xl uppercase text-white tracking-tighter leading-none">Exercícios</h1>
              <div className="flex flex-col items-end gap-3">
                {renderSyncButton()}
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-1.5 font-mono text-[9px] uppercase bg-concrete/10 border border-concrete/20 px-2 py-1.5 rounded text-white hover:bg-concrete/20 transition-colors"
                >
                  <FileText size={12} /> Importar (Planilha)
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleAddExercise} className="flex flex-col gap-4 mb-10">
              <h2 className="font-mono text-vulcanico uppercase text-xs font-bold tracking-widest">Novo Exercício Base</h2>
              
              <div className="flex flex-col gap-1">
                <input 
                  type="text" 
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="NOME DO EXERCÍCIO (EX: REMADA CAVALINHO)"
                  className="w-full bg-transparent border-b border-concrete/30 py-2 font-display text-lg text-white focus:outline-none focus:border-vulcanico transition-colors"
                />
              </div>

              <div className="flex items-center justify-between gap-4 mt-2 relative">
                <div className="flex-1 relative">
                  <button
                    type="button"
                    onClick={() => setIsMuscleDropdownOpen(!isMuscleDropdownOpen)}
                    className="w-full bg-noturno border border-concrete/30 text-white font-mono text-xs uppercase px-3 py-2 flex justify-between items-center focus:outline-none focus:border-vulcanico text-left rounded-lg"
                  >
                    <span>{newExerciseMuscle}</span>
                    <ChevronDown size={14} className="text-concrete" />
                  </button>
                  {isMuscleDropdownOpen && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 bg-noturno border border-concrete/30 z-20 flex flex-col max-h-48 overflow-y-auto rounded-lg">
                      {["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core", "Cardio", "Outros"].map((muscle) => (
                        <button
                          key={muscle}
                          type="button"
                          onClick={() => {
                            setNewExerciseMuscle(muscle);
                            setIsMuscleDropdownOpen(false);
                          }}
                          className="w-full text-left font-mono text-xs uppercase px-3 py-2 text-white hover:bg-vulcanico hover:text-noturno transition-colors"
                        >
                          {muscle}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={!newExerciseName.trim()}
                  className="bg-vulcanico hover:bg-white text-noturno font-display text-sm uppercase px-4 py-2 disabled:opacity-30 transition-colors rounded-lg font-bold"
                >
                  Adicionar
                </button>
              </div>
            </form>

            {/* List Grouped by Muscle */}
            <div className="flex flex-col gap-8 pb-10">
              {exercises.length === 0 ? (
                <p className="font-mono text-xs text-concrete uppercase">Nenhum exercício na biblioteca.</p>
              ) : (
                Object.entries(exercisesByMuscle).map(([muscle, list]) => (
                  <div key={muscle} className="flex flex-col">
                    <span className="font-mono text-concrete text-[10px] tracking-widest uppercase border-b border-concrete/10 pb-1 mb-3">
                      {muscle}
                    </span>
                    <div className="flex flex-col gap-2">
                      {list.map(ex => (
                        <div key={ex.id} className="flex justify-between items-center py-2 group cursor-pointer hover:bg-concrete/5 px-2 -mx-2 rounded-lg transition-colors">
                          <div className="flex items-center gap-3 flex-1" onClick={() => setEditingExercise(ex)}>
                            {ex.thumbnailUrl ? (
                              <img src={ex.thumbnailUrl} alt={ex.name} className="w-10 h-10 object-cover rounded-md" />
                            ) : (
                              <div className="w-10 h-10 bg-concrete/10 rounded-md flex items-center justify-center">
                                <Dumbbell size={16} className="text-concrete" />
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-display text-xl uppercase text-white group-hover:text-vulcanico transition-colors">
                                {ex.name}
                              </span>
                              {ex.videoUrl && (
                                <span className="font-mono text-[9px] text-vulcanico uppercase tracking-widest flex items-center gap-1">
                                  <Play size={8} fill="currentColor" /> Tem Vídeo
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteExercise(ex.id)}
                            className="text-concrete hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: ESTATISTICAS (EX-HISTORICO) */}
        {activeTab === "history" && (
          <div className="p-6 flex flex-col min-h-full">
            <div className="flex justify-between items-end mb-4">
              <h1 className="font-display text-[44px] uppercase text-white leading-none tracking-tight">Estatísticas</h1>
              {renderSyncButton()}
            </div>

            {/* Period Filters */}
            <div className="flex gap-2 mb-6 border-b border-concrete/15 pb-4">
              {(["week", "month", "year", "all"] as const).map((period) => {
                const labelMap = { week: "Semana", month: "Mês", year: "Ano", all: "Todos" };
                const isActive = statsPeriod === period;
                return (
                  <button
                    key={period}
                    onClick={() => setStatsPeriod(period)}
                    className={`flex-1 py-1.5 font-mono text-[10px] uppercase rounded-lg border transition-colors ${
                      isActive 
                        ? "bg-vulcanico border-vulcanico text-noturno font-bold" 
                        : "border-concrete/30 text-concrete hover:border-white hover:text-white"
                    }`}
                  >
                    {labelMap[period]}
                  </button>
                );
              })}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4 flex flex-col justify-between aspect-[3/2]">
                <span className="font-mono text-[9px] text-concrete uppercase tracking-widest leading-none">Sessões</span>
                <span className="font-display text-4xl text-white mt-2 leading-none">{filteredLogs.length}</span>
                <span className="font-mono text-[8px] text-concrete uppercase mt-1">Treinos Realizados</span>
              </div>
              
              <div className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4 flex flex-col justify-between aspect-[3/2]">
                <span className="font-mono text-[9px] text-concrete uppercase tracking-widest leading-none">Tempo Total</span>
                <span className="font-display text-4xl text-vulcanico mt-2 leading-none">
                  {((filteredLogs.reduce((acc, log) => acc + log.durationMs, 0)) / (1000 * 60 * 60)).toFixed(1)}h
                </span>
                <span className="font-mono text-[8px] text-concrete uppercase mt-1">Horas de Atividade</span>
              </div>

              <div className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4 flex flex-col justify-between aspect-[3/2]">
                <span className="font-mono text-[9px] text-concrete uppercase tracking-widest leading-none">Média Sessão</span>
                <span className="font-display text-4xl text-white mt-2 leading-none">
                  {filteredLogs.length > 0 
                    ? Math.round((filteredLogs.reduce((acc, log) => acc + log.durationMs, 0) / filteredLogs.length) / 60000)
                    : 0
                  }m
                </span>
                <span className="font-mono text-[8px] text-concrete uppercase mt-1">Minutos por Treino</span>
              </div>

              <div className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4 flex flex-col justify-between aspect-[3/2]">
                <span className="font-mono text-[9px] text-concrete uppercase tracking-widest leading-none">Séries Feitas</span>
                <span className="font-display text-4xl text-white mt-2 leading-none">
                  {filteredLogs.reduce((acc, log) => acc + log.exercises.reduce((exAcc, ex) => exAcc + ex.sets.length, 0), 0)}
                </span>
                <span className="font-mono text-[8px] text-concrete uppercase mt-1">Total de Séries</span>
              </div>
            </div>

            {/* Section: Exercícios em Foco */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex justify-between items-center border-b border-concrete/20 pb-2">
                <h2 className="font-display text-xl uppercase text-white leading-none">Exercícios em Foco</h2>
                <button
                  onClick={() => setIsAddingFocusModalOpen(true)}
                  className="font-mono text-[9px] text-vulcanico uppercase tracking-wider underline hover:text-white"
                >
                  + Adicionar Foco
                </button>
              </div>

              {focusedExercises.length === 0 ? (
                <div className="bg-concrete/5 border border-dashed border-concrete/20 rounded-2xl p-6 text-center">
                  <p className="font-mono text-xs text-concrete uppercase">Nenhum exercício em foco.</p>
                  <p className="font-mono text-[9px] text-concrete/70 uppercase mt-1">Acompanhe seu histórico de cargas máximas e séries.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {focusedExercises.map(focusedName => {
                    const def = exerciseMapByName[focusedName];
                    
                    // Retrieve historical logs containing this exercise
                    let maxWeight = 0;
                    let totalSetsEver = 0;
                    const weightHistory: { date: number; maxWeight: number }[] = [];

                    history.forEach(log => {
                      let sessionMax = 0;
                      log.exercises.forEach(ex => {
                        if (ex.name === focusedName) {
                          ex.sets.forEach(s => {
                            totalSetsEver++;
                            const w = parseFloat(s.weight) || 0;
                            if (w > sessionMax) sessionMax = w;
                          });
                        }
                      });
                      if (sessionMax > 0) {
                        weightHistory.push({ date: log.date, maxWeight: sessionMax });
                        if (sessionMax > maxWeight) maxWeight = sessionMax;
                      }
                    });

                    // Sort chronological history of PRs for sparkline
                    const sortedWeightHistory = weightHistory.sort((a, b) => a.date - b.date);

                    // Generate Sparkline Path
                    let sparklinePath = "";
                    if (sortedWeightHistory.length > 1) {
                      const wMax = Math.max(...sortedWeightHistory.map(h => h.maxWeight));
                      const wMin = Math.min(...sortedWeightHistory.map(h => h.maxWeight));
                      const wDiff = wMax - wMin || 1;
                      const sWidth = 80;
                      const sHeight = 24;
                      const points = sortedWeightHistory.map((h, hIdx) => {
                        const x = (hIdx / (sortedWeightHistory.length - 1)) * sWidth;
                        const y = sHeight - ((h.maxWeight - wMin) / wDiff) * sHeight;
                        return `${x},${y}`;
                      });
                      sparklinePath = `M ${points.join(" L ")}`;
                    }

                    return (
                      <div key={focusedName} className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4 flex justify-between items-center transition-all">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display text-lg uppercase text-white leading-tight truncate">{focusedName}</h3>
                            <button
                              onClick={() => setFocusedExercises(prev => prev.filter(name => name !== focusedName))}
                              className="text-concrete hover:text-red-500 transition-colors shrink-0"
                              title="Remover Foco"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <span className="font-mono text-[9px] text-concrete uppercase bg-concrete/10 px-1.5 py-0.5 rounded">
                            {def?.muscle || "Geral"}
                          </span>
                          
                          <div className="grid grid-cols-2 gap-4 mt-3 pt-2 border-t border-concrete/10">
                            <div>
                              <span className="font-mono text-[8px] text-concrete uppercase block">Carga Máxima (PR)</span>
                              <span className="font-display text-xl text-vulcanico leading-none">{maxWeight} kg</span>
                            </div>
                            <div>
                              <span className="font-mono text-[8px] text-concrete uppercase block">Total de Séries</span>
                              <span className="font-display text-xl text-white leading-none">{totalSetsEver}</span>
                            </div>
                          </div>
                        </div>

                        {/* Sparkline Visual */}
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {sortedWeightHistory.length > 1 ? (
                            <svg className="w-20 h-8" viewBox="0 0 80 24">
                              <path
                                d={sparklinePath}
                                fill="none"
                                stroke="#FF4103"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <span className="font-mono text-[8px] text-concrete uppercase text-right leading-tight max-w-[80px]">
                              Dados insuficientes para gráfico
                            </span>
                          )}
                          <span className="font-mono text-[8px] text-concrete/70 uppercase">Evolução Cargas</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Visuals: Pie Chart & Network Graph */}
            <div className="flex flex-col gap-6 mb-8">
              
              {/* Gráfico de Pizza (Donut SVG) */}
              <div className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4">
                <h3 className="font-mono text-[10px] text-vulcanico uppercase font-bold tracking-widest border-b border-concrete/10 pb-2 mb-4">
                  Séries por Grupo Muscular
                </h3>
                {totalSetsAggregated === 0 ? (
                  <p className="font-mono text-xs text-concrete uppercase text-center py-6">Sem dados neste período.</p>
                ) : (
                  <div className="flex items-center gap-6 justify-center py-2">
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                      {/* Donut SVG */}
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="4.2" />
                        {donutSlices.map((slice, idx) => (
                          <circle 
                            key={idx}
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="4"
                            strokeDasharray={slice.strokeDasharray}
                            strokeDashoffset={slice.strokeDashoffset}
                            transform="rotate(-90 18 18)"
                          />
                        ))}
                      </svg>
                      {/* Central label */}
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="font-display text-2xl text-white leading-none">{totalSetsAggregated}</span>
                        <span className="font-mono text-[7px] text-concrete uppercase mt-0.5 tracking-wider">Séries</span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="flex-1 flex flex-col gap-2 min-w-0 pr-2">
                      {donutSlices.slice(0, 6).map((slice, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                            <span className="font-mono text-[9px] text-white uppercase truncate">{slice.muscle}</span>
                          </div>
                          <span className="font-mono text-[9px] text-concrete font-bold shrink-0">{Math.round(slice.percent)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Gráfico de Rede SVG */}
              <div className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4">
                <h3 className="font-mono text-[10px] text-vulcanico uppercase font-bold tracking-widest border-b border-concrete/10 pb-2 mb-4">
                  Sinergia e Distribuição Muscular
                </h3>
                {totalSetsAggregated === 0 ? (
                  <p className="font-mono text-xs text-concrete uppercase text-center py-6">Sem treinos para mapear rede.</p>
                ) : (
                  <div className="flex flex-col items-center">
                    <svg viewBox="0 0 300 240" className="w-full h-auto max-w-[280px]">
                      {/* Connection Lines */}
                      {linesToDraw.map((line) => (
                        <line
                          key={line.key}
                          x1={line.x1}
                          y1={line.y1}
                          x2={line.x2}
                          y2={line.y2}
                          stroke="#FF4103"
                          strokeOpacity={0.15 + Math.min(0.6, line.weight / 10)}
                          strokeWidth={Math.min(4, 1 + line.weight / 3)}
                          strokeDasharray={line.weight === 1 ? "2,2" : undefined}
                        />
                      ))}

                      {/* Nodes */}
                      {nodesToDraw.map((node) => (
                        <g key={node.muscle}>
                          {node.sets > 0 && (
                            <circle
                              cx={node.pos.x}
                              cy={node.pos.y}
                              r={node.radius + 4}
                              fill="transparent"
                              stroke={node.color}
                              strokeOpacity="0.2"
                              strokeWidth="1.5"
                              className={node.sets > 5 ? "animate-pulse" : ""}
                            />
                          )}
                          <circle
                            cx={node.pos.x}
                            cy={node.pos.y}
                            r={node.radius}
                            fill="#001621"
                            stroke={node.sets > 0 ? node.color : "#555555"}
                            strokeWidth="2.5"
                          />
                          {node.sets > 0 && (
                            <circle
                              cx={node.pos.x}
                              cy={node.pos.y}
                              r={node.radius - 3}
                              fill={node.color}
                              fillOpacity="0.8"
                            />
                          )}
                          <text
                            x={node.pos.x}
                            y={node.pos.y - node.radius - 5}
                            fill={node.sets > 0 ? "#ffffff" : "#555555"}
                            textAnchor="middle"
                            className="font-mono text-[8px] uppercase tracking-wider font-bold select-none"
                          >
                            {node.muscle}
                          </text>
                        </g>
                      ))}
                    </svg>
                    <p className="font-mono text-[8px] text-concrete/70 uppercase text-center mt-2 max-w-xs">
                      Linhas conectam músculos treinados juntos na mesma sessão. Espessura indica frequência.
                    </p>
                  </div>
                )}
              </div>

              {/* Gráfico de Linhas (Volume dos Treinos) */}
              <div className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4">
                <h3 className="font-mono text-[10px] text-vulcanico uppercase font-bold tracking-widest border-b border-concrete/10 pb-2 mb-4">
                  Evolução de Volume de Carga
                </h3>
                {filteredLogs.length === 0 ? (
                  <p className="font-mono text-xs text-concrete uppercase text-center py-6">Sem treinos no período.</p>
                ) : (() => {
                  const sortedLogs = [...filteredLogs].sort((a, b) => a.date - b.date);
                  const wChart = 280;
                  const hChart = 140;
                  const pLeft = 40;
                  const pRight = 10;
                  const pTop = 15;
                  const pBottom = 25;
                  
                  const volumes = sortedLogs.map(l => l.volumeKg);
                  const maxVol = Math.max(...volumes, 500);
                  const minVol = 0;
                  const volDiff = maxVol - minVol || 1;

                  const points = sortedLogs.map((log, idx) => {
                    const x = pLeft + (idx / (sortedLogs.length - 1 || 1)) * (wChart - pLeft - pRight);
                    const y = pTop + (1 - (log.volumeKg - minVol) / volDiff) * (hChart - pTop - pBottom);
                    return { x, y, log, idx };
                  });

                  let pathD = "";
                  let areaD = "";
                  if (points.length > 0) {
                    const lineCoords = points.map(p => `${p.x},${p.y}`);
                    pathD = `M ${lineCoords.join(" L ")}`;
                    areaD = `${pathD} L ${points[points.length - 1].x},${hChart - pBottom} L ${points[0].x},${hChart - pBottom} Z`;
                  }

                  const hoveredPoint = hoveredLogIdx !== null ? points[hoveredLogIdx] : null;

                  return (
                    <div className="flex flex-col relative">
                      <svg viewBox={`0 0 ${wChart} ${hChart}`} className="w-full h-auto">
                        <defs>
                          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF4103" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#FF4103" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Y Axis Grid Lines */}
                        {[0, 0.5, 1].map((ratio) => {
                          const y = pTop + ratio * (hChart - pTop - pBottom);
                          const val = Math.round(maxVol - ratio * volDiff);
                          return (
                            <g key={ratio} className="opacity-20">
                              <line
                                x1={pLeft}
                                y1={y}
                                x2={wChart - pRight}
                                y2={y}
                                stroke="#555555"
                                strokeWidth="0.8"
                                strokeDasharray="3,3"
                              />
                              <text
                                x={pLeft - 6}
                                y={y + 3}
                                fill="#ffffff"
                                textAnchor="end"
                                className="font-mono text-[7px] uppercase"
                              >
                                {val}kg
                              </text>
                            </g>
                          );
                        })}

                        {/* Chart Line Path */}
                        {points.length > 1 && (
                          <>
                            <path d={areaD} fill="url(#chartAreaGrad)" />
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#FF4103"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </>
                        )}

                        {/* Data Node Dots */}
                        {points.map((pt) => (
                          <circle
                            key={pt.idx}
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredLogIdx === pt.idx ? 5.5 : 3.5}
                            fill={hoveredLogIdx === pt.idx ? "#ffffff" : "#FF4103"}
                            stroke="#001621"
                            strokeWidth="1.5"
                            className="cursor-pointer transition-all"
                            onMouseEnter={() => setHoveredLogIdx(pt.idx)}
                            onMouseLeave={() => setHoveredLogIdx(null)}
                            onClick={() => setHoveredLogIdx(pt.idx)}
                          />
                        ))}

                        {/* X-Axis label dates */}
                        {points.length > 0 && (
                          <g className="opacity-40">
                            {[0, points.length - 1].map((pIdx) => {
                              const pt = points[pIdx];
                              if (!pt) return null;
                              const d = new Date(pt.log.date);
                              const label = `${d.getDate()}/${d.getMonth() + 1}`;
                              return (
                                <text
                                  key={pIdx}
                                  x={pt.x}
                                  y={hChart - 8}
                                  fill="#ffffff"
                                  textAnchor={pIdx === 0 ? "start" : "end"}
                                  className="font-mono text-[7px]"
                                >
                                  {label}
                                </text>
                              );
                            })}
                          </g>
                        )}
                      </svg>

                      {/* Tooltip Overlay */}
                      {hoveredPoint && (
                        <div className="absolute top-0 right-0 bg-noturno border border-concrete/30 p-2 rounded-xl flex flex-col gap-0.5 pointer-events-none select-none max-w-[120px] animate-fade-in shadow-xl z-10">
                          <span className="font-mono text-[8px] text-vulcanico uppercase tracking-wider font-bold">
                            {new Date(hoveredPoint.log.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}
                          </span>
                          <span className="font-display text-[9px] text-white uppercase truncate leading-tight">
                            {hoveredPoint.log.name}
                          </span>
                          <span className="font-mono text-[9px] text-white">
                            Vol: <strong className="text-vulcanico">{hoveredPoint.log.volumeKg} kg</strong>
                          </span>
                          <span className="font-mono text-[8px] text-concrete">
                            Tempo: {formatTime(hoveredPoint.log.durationMs)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Workout History Log List */}
            <div className="flex flex-col gap-6">
              <h3 className="font-display text-xl uppercase text-white border-b border-concrete/20 pb-2 mb-2">
                Histórico de Treinos
              </h3>
              
              <div className="flex flex-col gap-8 pb-12">
                {filteredLogs.length === 0 ? (
                  <p className="font-mono text-concrete text-xs uppercase">Nenhum treino concluído no período.</p>
                ) : (() => {
                  const sortedChronological = [...filteredLogs].sort((a, b) => b.date - a.date); // newest first
                  return sortedChronological.map(log => {
                    const dateStr = new Date(log.date).toLocaleDateString("pt-BR", { 
                      weekday: 'short', 
                      day: '2-digit', 
                      month: 'short' 
                    });
                    return (
                      <div key={log.id} className="flex flex-col animate-fade-in">
                        <div className="flex justify-between items-end mb-4 border-b border-concrete/15 pb-2">
                          <div>
                            <p className="font-mono text-vulcanico text-[10px] uppercase mb-1">{dateStr}</p>
                            <h2 className="font-display text-2xl uppercase text-white leading-none">{log.name}</h2>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <button
                              onClick={() => handleDeleteHistoryLog(log.id)}
                              className="text-concrete/50 hover:text-red-500 transition-colors p-1"
                              title="Excluir Treino"
                            >
                              <Trash2 size={14} />
                            </button>
                            <div className="text-right font-mono text-[9px] text-concrete uppercase leading-tight">
                              <p>{formatTime(log.durationMs)}</p>
                              <p className="text-vulcanico font-bold mt-0.5">{log.volumeKg} kg Vol</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 pl-2">
                          {log.exercises.map((ex, i) => (
                            <div key={i} className="flex flex-col">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-display text-sm uppercase text-white">{ex.name}</span>
                                {ex.elapsedSeconds !== undefined && ex.elapsedSeconds > 0 && (
                                  <span className="font-mono text-[9px] text-concrete uppercase flex items-center gap-1">
                                    <Clock size={9} />
                                    {formatTime(ex.elapsedSeconds * 1000)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 font-mono text-[9px] text-concrete uppercase mt-0.5">
                                {ex.sets.map((s, idx) => {
                                  let label = s.weight ? `${s.weight}kg x ${s.reps}` : s.reps;
                                  let methodTag = "";
                                  const type = s.methodType || (s.isDropSet ? "drop-set" : s.isToFailure ? "failure" : "normal");
                                  if (type === "drop-set") {
                                    methodTag = `D${s.dropCount && s.dropCount > 1 ? `x${s.dropCount}` : ""}`;
                                  } else if (type === "failure") {
                                    const fMap: Record<string, string> = { concentrica: "C", excentrica: "E", isometrica: "I" };
                                    const fLetter = s.failureType ? fMap[s.failureType] || "" : "";
                                    methodTag = `F${fLetter ? `-${fLetter}` : ""}`;
                                  } else if (type === "rest-pause") {
                                    const sub = s.restPauseSets ? `x${s.restPauseSets}` : "";
                                    methodTag = `RP${sub ? ` ${sub}` : ""}`;
                                  } else if (type === "warmup") {
                                    methodTag = "W";
                                  } else if (type === "custom") {
                                    methodTag = (s.customMethodName || "CST").substring(0, 3).toUpperCase();
                                  }
                                  if (methodTag) {
                                    label += ` [${methodTag}]`;
                                  }
                                  return (
                                    <span key={idx} className="bg-concrete/5 px-1.5 py-0.5 rounded">
                                      S{idx + 1}: {label}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* -------------------- MINI PLAYER -------------------- */}
      {activeWorkout && isWorkoutMinimized && (
        <div 
          className="absolute bottom-[90px] left-4 right-4 z-40 bg-vulcanico rounded-xl shadow-[0_10px_30px_rgba(255,65,3,0.3)] border border-vulcanico/50 p-4 flex justify-between items-center cursor-pointer animate-slide-up"
          onClick={() => setIsWorkoutMinimized(false)}
        >
          <div className="flex flex-col gap-1">
             <span className="font-display text-base text-noturno uppercase leading-none font-bold">
               {activeWorkout.name}
             </span>
             <span className="font-mono text-[10px] text-noturno/80 uppercase font-bold flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-noturno animate-pulse"></span> Em andamento...
             </span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsWorkoutMinimized(false); }} 
            className="text-noturno bg-black/10 p-2 rounded-full hover:bg-black/20 transition-colors"
          >
            <ChevronUp size={18} />
          </button>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      {(!activeWorkout || isWorkoutMinimized) && (
        <nav className="flex-none w-full h-20 bg-noturno border-t border-concrete/10 flex justify-around items-center px-4 z-30">
          <button 
            onClick={() => setActiveTab("plans")}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === "plans" ? "text-vulcanico" : "text-concrete"}`}
          >
            <Dumbbell size={24} />
            <span className="font-mono text-[10px] uppercase">Planos</span>
          </button>

          <button 
            onClick={() => setActiveTab("exercises")}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === "exercises" ? "text-vulcanico" : "text-concrete"}`}
          >
            <Plus size={24} />
            <span className="font-mono text-[10px] uppercase">Exercícios</span>
          </button>

          <button 
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === "history" ? "text-vulcanico" : "text-concrete"}`}
          >
            <History size={24} />
            <span className="font-mono text-[10px] uppercase">Estatísticas</span>
          </button>
        </nav>
      )}

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
                    onClick={() => setDialog(null)}
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
                onClick={handleShare}
                className="w-full bg-vulcanico text-noturno font-display uppercase tracking-widest py-4 rounded-xl text-lg font-bold flex justify-center items-center gap-3 hover:bg-white transition-colors"
              >
                Compartilhar Treino
              </button>
            </div>
          </div>
        );
      })()}

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
              className="bg-grafite border border-concrete/20 p-6 rounded-2xl shadow-2xl w-full max-w-sm relative z-10"
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
      </AnimatePresence>

    </div>
  );
}
