import { ExerciseDef, HistoryLog } from '../types';

export type MuscleFatigueInfo = {
  muscle: string;
  fatigueScore: number; // 0 to 100 (100 = max fatigue)
  status: 'recuperado' | 'em_recuperacao' | 'fadigado';
  recoveryPercentage: number; // 0 to 100% (100% = fully recovered)
  lastTrainedHoursAgo: number | null;
};

const MUSCLE_GROUPS = ["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core", "Cardio"];

export function calculateMuscleRank(
  history: HistoryLog[],
  nowMs: number = Date.now()
): Record<string, MuscleFatigueInfo> {
  const result: Record<string, MuscleFatigueInfo> = {};
  const muscleTension: Record<string, number> = {};
  const lastTrainedMs: Record<string, number> = {};

  MUSCLE_GROUPS.forEach(m => {
    muscleTension[m] = 0;
    lastTrainedMs[m] = 0;
  });

  // Sort history newest to oldest
  const sortedHistory = [...history].sort((a, b) => b.date - a.date);

  for (const log of sortedHistory) {
    if (log.isDeleted) continue;
    const hoursAgo = Math.max(0, (nowMs - log.date) / (1000 * 60 * 60));
    // Skip workouts older than 7 days (168h)
    if (hoursAgo > 168) continue;

    // Decay factor over time (half-life of 36 hours)
    const decay = Math.exp(-hoursAgo / 36);

    for (const ex of log.exercises) {
      // Basic muscle mapping heuristic
      const name = ex.name.toLowerCase();
      let targetMuscle = "Outros";
      if (name.includes("supino") || name.includes("crucifixo") || name.includes("peito")) targetMuscle = "Peito";
      else if (name.includes("remada") || name.includes("puxada") || name.includes("terra") || name.includes("costas")) targetMuscle = "Costas";
      else if (name.includes("agachamento") || name.includes("leg press") || name.includes("extensora") || name.includes("perna") || name.includes("stiff")) targetMuscle = "Pernas";
      else if (name.includes("desenvolvimento") || name.includes("elevação") || name.includes("ombro")) targetMuscle = "Ombros";
      else if (name.includes("rosca") || name.includes("tríceps") || name.includes("bíceps") || name.includes("pulley")) targetMuscle = "Braços";
      else if (name.includes("prancha") || name.includes("abdominal") || name.includes("core")) targetMuscle = "Core";

      if (muscleTension[targetMuscle] !== undefined) {
        const volume = ex.sets.reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
        muscleTension[targetMuscle] += volume * decay * 0.01;
        if (!lastTrainedMs[targetMuscle] || log.date > lastTrainedMs[targetMuscle]) {
          lastTrainedMs[targetMuscle] = log.date;
        }
      }
    }
  }

  MUSCLE_GROUPS.forEach(m => {
    const tension = muscleTension[m] || 0;
    // Cap score at 100
    const fatigueScore = Math.min(100, Math.round(tension));
    const recoveryPercentage = Math.max(0, 100 - fatigueScore);
    const lastMs = lastTrainedMs[m];
    const lastTrainedHoursAgo = lastMs ? Math.round((nowMs - lastMs) / (1000 * 60 * 60)) : null;

    let status: 'recuperado' | 'em_recuperacao' | 'fadigado' = 'recuperado';
    if (fatigueScore > 65) status = 'fadigado';
    else if (fatigueScore > 25) status = 'em_recuperacao';

    result[m] = {
      muscle: m,
      fatigueScore,
      status,
      recoveryPercentage,
      lastTrainedHoursAgo,
    };
  });

  return result;
}

export function recommendOptimalMuscles(muscleRankData: Record<string, MuscleFatigueInfo>): string[] {
  return Object.values(muscleRankData)
    .filter(info => info.muscle !== "Cardio" && info.muscle !== "Outros")
    .sort((a, b) => b.recoveryPercentage - a.recoveryPercentage)
    .slice(0, 3)
    .map(info => info.muscle);
}

export function semanticExerciseSearch(query: string, exercises: ExerciseDef[]): ExerciseDef[] {
  if (!query || !query.trim()) return exercises;
  const terms = query.toLowerCase().trim().split(/\s+/);

  return exercises
    .map(ex => {
      let score = 0;
      const name = ex.name.toLowerCase();
      const muscle = ex.muscle.toLowerCase();
      const equipment = (ex.equipment || "").toLowerCase();
      const category = (ex.exerciseCategory || "").toLowerCase();
      const mechanic = (ex.mechanicType || "").toLowerCase();
      const secondary = (ex.secondaryMuscles || []).join(" ").toLowerCase();

      for (const term of terms) {
        if (name.includes(term)) score += 10;
        if (muscle.includes(term)) score += 7;
        if (secondary.includes(term)) score += 5;
        if (equipment.includes(term)) score += 4;
        if (category.includes(term)) score += 3;
        if (mechanic.includes(term)) score += 2;
      }

      return { ex, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.ex);
}
