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

export type ActiveSet = {
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

export type ActiveExercise = {
  id: string;
  exerciseId: string;
  sets: ActiveSet[];
  elapsedSeconds?: number;
  overloadSuggestion?: string;
  supersetGroupId?: string;
};

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
};

export type HistoryLog = {
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
    supersetGroupId?: string;
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
  isDeleted?: boolean;
};
