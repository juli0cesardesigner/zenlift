import { describe, it, expect } from 'vitest';
import { ActiveWorkoutSession, ActiveExercise, ActiveSet } from '../../types';

// Helper function tested to guarantee superset sequencing logic
function getActiveSetAndExercise(activeWorkout: ActiveWorkoutSession | null) {
  if (!activeWorkout || !activeWorkout.exercises.length) {
    return { activeExerciseIndex: -1, globalActiveSetId: null };
  }

  const isDual = activeWorkout.sessionMode === "dual";
  const isSetCompleted = (s: ActiveSet) => isDual ? (s.completed && s.completedP2) : s.completed;

  let i = 0;
  while (i < activeWorkout.exercises.length) {
    const ex = activeWorkout.exercises[i];
    if (ex.supersetGroupId) {
      const groupExercises: { ex: ActiveExercise; originalIndex: number }[] = [];
      let j = i;
      while (j < activeWorkout.exercises.length && activeWorkout.exercises[j].supersetGroupId === ex.supersetGroupId) {
        groupExercises.push({ ex: activeWorkout.exercises[j], originalIndex: j });
        j++;
      }

      const maxSets = Math.max(...groupExercises.map(g => g.ex.sets.length), 0);

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
}

describe('Active Workout Superset / Dupla Round-Robin Sequencing', () => {
  it('alternates across exercises in a superset group before moving to next set round', () => {
    const session: ActiveWorkoutSession = {
      id: 'ws_1',
      name: 'Treino A',
      workoutType: 'rotina',
      sessionMode: 'single',
      exercises: [
        {
          id: 'ae_1',
          exerciseId: 'ex_1',
          supersetGroupId: 'group_A',
          sets: [
            { id: 's1_ex1', minReps: 10, maxReps: 12, isDropSet: false, isToFailure: false, restSeconds: 60, weight: '40', reps: '10', completed: false },
            { id: 's2_ex1', minReps: 10, maxReps: 12, isDropSet: false, isToFailure: false, restSeconds: 60, weight: '40', reps: '10', completed: false }
          ]
        },
        {
          id: 'ae_2',
          exerciseId: 'ex_2',
          supersetGroupId: 'group_A',
          sets: [
            { id: 's1_ex2', minReps: 12, maxReps: 15, isDropSet: false, isToFailure: false, restSeconds: 60, weight: '15', reps: '12', completed: false },
            { id: 's2_ex2', minReps: 12, maxReps: 15, isDropSet: false, isToFailure: false, restSeconds: 60, weight: '15', reps: '12', completed: false }
          ]
        }
      ]
    };

    // Step 1: Initial state -> Ex 1 Set 1
    let state = getActiveSetAndExercise(session);
    expect(state.activeExerciseIndex).toBe(0);
    expect(state.globalActiveSetId).toBe('s1_ex1');

    // Step 2: Complete Ex 1 Set 1 -> Must advance to Ex 2 Set 1 (NOT Ex 1 Set 2!)
    session.exercises[0].sets[0].completed = true;
    state = getActiveSetAndExercise(session);
    expect(state.activeExerciseIndex).toBe(1);
    expect(state.globalActiveSetId).toBe('s1_ex2');

    // Step 3: Complete Ex 2 Set 1 -> Must advance to Ex 1 Set 2
    session.exercises[1].sets[0].completed = true;
    state = getActiveSetAndExercise(session);
    expect(state.activeExerciseIndex).toBe(0);
    expect(state.globalActiveSetId).toBe('s2_ex1');

    // Step 4: Complete Ex 1 Set 2 -> Must advance to Ex 2 Set 2
    session.exercises[0].sets[1].completed = true;
    state = getActiveSetAndExercise(session);
    expect(state.activeExerciseIndex).toBe(1);
    expect(state.globalActiveSetId).toBe('s2_ex2');

    // Step 5: Complete Ex 2 Set 2 -> All completed
    session.exercises[1].sets[1].completed = true;
    state = getActiveSetAndExercise(session);
    expect(state.globalActiveSetId).toBeNull();
  });
});
