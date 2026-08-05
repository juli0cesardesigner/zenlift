import { describe, it, expect } from 'vitest';
import { calculateMuscleRank, recommendOptimalMuscles, semanticExerciseSearch } from '../muscleRank';
import { ExerciseDef, HistoryLog } from '../../types';

describe('MuscleRank & Semantic Search Unit Tests', () => {
  const mockNow = 1750000000000; // Fixed timestamp

  const mockHistory: HistoryLog[] = [
    {
      id: 'h1',
      name: 'Treino Peito Heavy',
      date: mockNow - 1000 * 60 * 60 * 12, // 12h ago
      durationMs: 3600000,
      volumeKg: 5000,
      exercises: [
        {
          name: 'Supino Reto',
          sets: [
            { weight: '100', reps: '10', minReps: 8, maxReps: 12, isDropSet: false, isToFailure: false }
          ]
        }
      ]
    }
  ];

  const mockExercises: ExerciseDef[] = [
    { id: 'e1', name: 'Supino Reto Barbell', muscle: 'Peito', equipment: 'Barra', exerciseCategory: 'Hipertrofia' },
    { id: 'e2', name: 'Agachamento Livre', muscle: 'Pernas', equipment: 'Barra', exerciseCategory: 'Força' },
    { id: 'e3', name: 'Rosca Direta Halter', muscle: 'Braços', equipment: 'Halter', secondaryMuscles: ['Antebraço'] }
  ];

  describe('calculateMuscleRank', () => {
    it('calculates fatigue scores and recovery percentages correctly', () => {
      const rank = calculateMuscleRank(mockHistory, mockNow);
      expect(rank['Peito']).toBeDefined();
      expect(rank['Peito'].lastTrainedHoursAgo).toBe(12);
      expect(rank['Peito'].recoveryPercentage).toBeLessThan(100);
      expect(rank['Pernas'].recoveryPercentage).toBe(100);
    });
  });

  describe('recommendOptimalMuscles', () => {
    it('recommends muscles with highest recovery percentage', () => {
      const rank = calculateMuscleRank(mockHistory, mockNow);
      const recommended = recommendOptimalMuscles(rank);
      expect(recommended).not.toContain('Outros');
      expect(recommended.length).toBeLessThanOrEqual(3);
      expect(recommended).toContain('Pernas');
    });
  });

  describe('semanticExerciseSearch', () => {
    it('ranks exercises semantically by query terms', () => {
      const results = semanticExerciseSearch('barra peito', mockExercises);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('Supino Reto Barbell');
    });

    it('returns all exercises when query is empty', () => {
      const results = semanticExerciseSearch('', mockExercises);
      expect(results).toHaveLength(3);
    });
  });
});
