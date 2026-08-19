export type Tab = "plans" | "exercises" | "history";

export type ExerciseDef = {
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
  isRepsOnly?: boolean;
  isDeleted?: boolean;
};

export type PlannedSet = {
  id: string;
  reps?: number;
  minReps?: number;
  maxReps?: number;
  isDropSet: boolean;
  isToFailure: boolean;
  restSeconds: number;
  methodType?: string;
  customMethodName?: string;
  dropCount?: number;
  restPauseSets?: number;
  restPauseSeconds?: number;
  failureType?: string;
  isDeleted?: boolean;
};

export type PlannedExercise = {
  id: string;
  exerciseId: string;
  sets: PlannedSet[];
  isDeleted?: boolean;
  supersetGroupId?: string;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  exercises: PlannedExercise[];
  isDeleted?: boolean;
};

export type Plan = {
  id: string;
  name: string;
  workouts: WorkoutTemplate[];
  isDeleted?: boolean;
};

export type SessionMode = "solo" | "dual";

export type ActiveSet = {
  id: string;
  repsTarget?: number;
  minReps?: number;
  maxReps?: number;
  isDropSet: boolean;
  isToFailure: boolean;
  restSeconds: number;
  weight: string;
  reps: string;
  completed: boolean;
  weightP2?: string;
  repsP2?: string;
  completedP2?: boolean;
  methodType?: string;
  customMethodName?: string;
  dropCount?: number;
  restPauseSets?: number;
  restPauseSeconds?: number;
  failureType?: string;
  suggestedWeight?: string;
  suggestedReps?: string;
  suggestedWeightP2?: string;
  suggestedRepsP2?: string;
};

export type ActiveExercise = {
  id: string;
  exerciseId: string;
  sets: ActiveSet[];
  elapsedSeconds?: number;
  overloadSuggestion?: string;
  supersetGroupId?: string;
};

export type WorkoutType = "rotina" | "forca";

export type ActiveWorkoutSession = {
  planId: string;
  workoutId: string;
  name: string;
  startTime: number;
  exercises: ActiveExercise[];
  lastInteractionTime: number;
  totalIdleTimeMs: number;
  isPaused?: boolean;
  pauseStartTime?: number;
  workoutType?: WorkoutType;
  sessionMode?: SessionMode;
  partner1Name?: string;
  partner2Name?: string;
};

export type HistoryLog = {
  id: string;
  name: string;
  date: number;
  durationMs: number;
  volumeKg: number;
  idleTimeMs?: number;
  prs?: string[];
  workoutType?: WorkoutType;
  sessionMode?: SessionMode;
  partner1Name?: string;
  partner2Name?: string;
  volumeKgP1?: number;
  volumeKgP2?: number;
  exercises: {
    name: string;
    elapsedSeconds?: number;
    supersetGroupId?: string;
    sets: {
      repsTarget?: number;
      minReps?: number;
      maxReps?: number;
      isDropSet: boolean;
      isToFailure: boolean;
      weight: string;
      reps: string;
      weightP2?: string;
      repsP2?: string;
      completedP2?: boolean;
      methodType?: string;
      customMethodName?: string;
      dropCount?: number;
      restPauseSets?: number;
      restPauseSeconds?: number;
      failureType?: string;
    }[];
  }[];
  isDeleted?: boolean;
};

export type ActiveInputModalState = {
  exerciseId: string;
  setId: string;
  field: "weight" | "reps";
  partner?: "p1" | "p2";
  initialValue: string;
  suggestedValue: string;
};

export type RestTimerState = {
  exerciseId?: string;
  setId?: string;
  targetTime?: number;
  duration?: number;
  endTime?: number;
  exerciseIndex?: number;
  totalExercises?: number;
  exerciseName?: string;
  setIndex?: number;
  nextExerciseName?: string;
  nextExerciseLastWeight?: string;
};

export interface ActiveWorkoutViewProps {
  activeWorkout: ActiveWorkoutSession | null;
  isWorkoutMinimized: boolean;
  setIsWorkoutMinimized: (value: boolean | ((prev: boolean) => boolean)) => void;
  formatTime: (ms: number) => string;
  handleEndWorkout?: () => void;
  handleAddExerciseToActiveWorkout: (exercise: any) => void;
  handleUpdateActiveSet: (exerciseId: string, setId: string, field: any, val: any, partner?: "p1" | "p2", propagateToFollowing?: boolean) => void;
  handleToggleActiveSet?: (exerciseId: string, setId: string, partner?: "p1" | "p2") => void;
  exerciseMap: Record<string, ExerciseDef>;
  plans: Plan[];
  isEditingDirectly: boolean;
  setIsEditingDirectly: (value: boolean | ((prev: boolean) => boolean)) => void;
  activeInputModal: ActiveInputModalState | null;
  setActiveInputModal: (val: ActiveInputModalState | null) => void;
  modalTempValue: string;
  setModalTempValue: React.Dispatch<React.SetStateAction<string>>;
  restTimer: RestTimerState | null;
  setRestTimer: (val: any) => void;
  restRemainingMs: number;
  formatRestTime: (ms: number) => string;
  handleAddRestTime: (sec: number) => void;
  addingExerciseToActiveWorkout: boolean;
  setAddingExerciseToActiveWorkout: (val: boolean) => void;
  replacingActiveExerciseId: string | null;
  setReplacingActiveExerciseId: (val: string | null) => void;
  handleReplaceExerciseInActiveWorkout: (arg1: any, arg2?: any) => void;
  exerciseSearchQuery: string;
  setExerciseSearchQuery: (query: string) => void;
  filteredExercises: ExerciseDef[];
  filteredExercisesByMuscle: Record<string, ExerciseDef[]>;
  slideX: number;
  setSlideX: (x: number) => void;
  isSliding: boolean;
  setIsSliding: (val: boolean) => void;
  handleFinishWorkout: () => void;
  handleCancelWorkout: () => void;
  setActiveWorkout: React.Dispatch<React.SetStateAction<ActiveWorkoutSession | null>>;
  resolvedActiveExerciseIndex: number;
  expandedCompletedExercises: Record<string, boolean>;
  setExpandedCompletedExercises: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleSkipExercise: (exerciseId: string) => void;
  globalActiveSetId?: string | null;
  activeStopwatchSetId: string | null;
  activeStopwatchElapsedMs: number;
  setActiveStopwatchSetId: (id: string | null) => void;
  setActiveStopwatchStartTime: (time: number | null) => void;
  setActiveStopwatchElapsedMs: (ms: number | ((prev: number) => number)) => void;
  handleAddActiveSet: (exerciseId: string) => void;
  handleRemoveActiveSet: (exerciseId: string, setId: string) => void;
  elapsedTime: number;
  maxDrag?: number;
}
