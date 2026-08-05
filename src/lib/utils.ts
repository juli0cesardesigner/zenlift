export const isValidVideoUrl = (url?: string): boolean => {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  // Prevent XSS vectors like javascript: or data:text/html
  if (clean.startsWith("javascript:") || clean.startsWith("vbscript:") || clean.startsWith("data:text/html")) {
    return false;
  }
  return clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("/") || clean.startsWith("blob:");
};

export const isValidUploadFile = (file?: File, allowedTypes: string[] = []): boolean => {
  if (!file) return false;
  if (allowedTypes.length === 0) return true;
  return allowedTypes.some(type => file.type.startsWith(type));
};

export const formatTime = (ms: number): string => {
  if (!ms || ms < 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export const formatRestTime = (ms: number): string => {
  if (ms < 0) ms = 0;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  const cc = centiseconds.toString().padStart(2, "0");
  return `${mm}:${ss}.${cc}`;
};

export const calculateTotalVolume = (exercises: { sets: { weight: string; reps: string; completed?: boolean; weightP2?: string; repsP2?: string; completedP2?: boolean }[] }[], partner?: "p1" | "p2"): number => {
  let total = 0;
  for (const ex of exercises) {
    for (const set of ex.sets) {
      if (partner === "p2") {
        if (set.completedP2 !== false) {
          const w = parseFloat(set.weightP2 || "0") || 0;
          const r = parseFloat(set.repsP2 || "0") || 0;
          total += w * r;
        }
      } else {
        if (set.completed !== false) {
          const w = parseFloat(set.weight || "0") || 0;
          const r = parseFloat(set.reps || "0") || 0;
          total += w * r;
        }
      }
    }
  }
  return Math.round(total * 100) / 100;
};

export const detectPersonalRecords = (currentMaxes: Record<string, number>, newExercises: { name: string; sets: { weight: string; reps: string; completed?: boolean }[] }[]): { prs: string[]; updatedMaxes: Record<string, number> } => {
  const prs: string[] = [];
  const updatedMaxes = { ...currentMaxes };

  for (const ex of newExercises) {
    let maxWeightInWorkout = 0;
    for (const set of ex.sets) {
      if (set.completed !== false) {
        const w = parseFloat(set.weight || "0") || 0;
        if (w > maxWeightInWorkout) {
          maxWeightInWorkout = w;
        }
      }
    }
    if (maxWeightInWorkout > 0) {
      const prevMax = updatedMaxes[ex.name] || 0;
      if (maxWeightInWorkout > prevMax) {
        prs.push(`${ex.name}: ${maxWeightInWorkout}kg`);
        updatedMaxes[ex.name] = maxWeightInWorkout;
      }
    }
  }

  return { prs, updatedMaxes };
};

export type HapticPattern = "light" | "medium" | "heavy" | "success" | "pr";

export const triggerHapticFeedback = (pattern: HapticPattern = "light"): void => {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;
  try {
    switch (pattern) {
      case "light":
        navigator.vibrate(15);
        break;
      case "medium":
        navigator.vibrate(30);
        break;
      case "heavy":
        navigator.vibrate(50);
        break;
      case "success":
        navigator.vibrate([25, 40, 25]);
        break;
      case "pr":
        navigator.vibrate([40, 50, 40, 50, 100]);
        break;
    }
  } catch (e) {
    // Ignore haptic errors if unsupported
  }
};

export const generateWorkoutShareText = (workout: { name: string; durationMs: number; volumeKg: number; prs?: string[]; partner1Name?: string; partner2Name?: string }): string => {
  const duration = formatTime(workout.durationMs);
  const prsText = workout.prs && workout.prs.length > 0 ? `\n🏆 PRs Batidos:\n${workout.prs.map(p => `• ${p}`).join("\n")}` : "";
  const partnerText = workout.partner1Name && workout.partner2Name ? `\n👥 Modo Dual: ${workout.partner1Name} & ${workout.partner2Name}` : "";

  return `🔥 Treino Concluído no Zenlift!\n💪 ${workout.name}\n⏱️ Duração: ${duration}\n🏋️ Volume Total: ${workout.volumeKg} kg${partnerText}${prsText}\n\n#Zenlift #GymLife #SiliconValleyGains`;
};


