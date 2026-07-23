import { ExerciseDef } from "../types";

export const EXERCISE_FIELDS_LABEL_MAP: Record<string, string> = {
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

export const EXERCISE_VIEW_MODE_LABEL_MAP = {
  muscle: "Por Músculo",
  alphabetical: "Ordem A-Z"
};

export const STATS_PERIOD_LABEL_MAP = {
  week: "Semana",
  month: "Mês",
  year: "Ano",
  all: "Todos"
};

export const defaultExercises: ExerciseDef[] = [
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

export const muscleColors: Record<string, string> = {
  Peito: "#FF4103",
  Costas: "#A855F7",
  Pernas: "#3B82F6",
  Ombros: "#EAB308",
  Braços: "#06B6D4",
  Core: "#10B981",
  Cardio: "#EC4899",
  Outros: "#6B7280"
};

export const nodePositions: Record<string, { x: number; y: number }> = {
  Peito: { x: 150, y: 35 },
  Costas: { x: 245, y: 80 },
  Pernas: { x: 220, y: 175 },
  Ombros: { x: 150, y: 200 },
  Braços: { x: 80, y: 175 },
  Core: { x: 55, y: 80 },
  Outros: { x: 150, y: 120 }
};
