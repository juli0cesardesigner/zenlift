// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronRight, ArrowLeft, Save, Plus, Edit3, Check, Trash2, Clock, Dumbbell, Play, X, Settings, Info, Search, List, Filter, Flame, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { ExerciseDef, PlannedSet } from '../../../types';
import { muscleColors } from '../../../lib/constants';

export function DesktopPlanEditor(props: any) {
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickMuscle, setQuickMuscle] = useState("Peito");

  const {
    editingPlan,
    editingWorkoutId,
    setEditingWorkoutId,
    handleMoveWorkout,
    handleRemoveExerciseFromWorkout,
    handleAddWorkoutToBuilder,
    exerciseSearchQuery,
    setExerciseSearchQuery,
    filteredExercises,
    handleAddExerciseToWorkout,
    handleCreateAndAddExerciseInline,
    handleSavePlan,
    setEditingPlan,
    exerciseMap,
    exerciseMapByName,
    configuringExercise,
    setConfiguringExercise,
    handleSaveExerciseConfig,
    handleApplySetConfigToAll,
    handleRemoveSetFromConfig,
    handleUpdateSetConfig,
    handleAddSetToConfig
  } = props;

  // Active workout index
  const wIdx = editingPlan.workouts.findIndex((w: any) => w.id === editingWorkoutId);
  const activeWorkout = wIdx !== -1 ? editingPlan.workouts[wIdx] : editingPlan.workouts[0];

  const [batchReps, setBatchReps] = useState("");
  const [batchWeight, setBatchWeight] = useState("");
  const [batchRest, setBatchRest] = useState("");
  
  const handleApplyBatchUpdate = (activeWk: any) => {
    if (!editingPlan || !activeWk) return;
    const reps = parseInt(batchReps);
    const weight = parseFloat(batchWeight);
    const rest = parseInt(batchRest);
    
    if (isNaN(reps) && isNaN(weight) && isNaN(rest)) return;
    
    const updatedWorkout = {
      ...activeWk,
      exercises: activeWk.exercises.map((ex: any) => ({
        ...ex,
        sets: ex.sets.map((s: any) => ({
          ...s,
          ...( !isNaN(reps) && { reps: reps } ),
          ...( !isNaN(weight) && { weight: weight } ),
          ...( !isNaN(rest) && { restTime: rest } )
        }))
      }))
    };
    
    setEditingPlan({
      ...editingPlan,
      workouts: editingPlan.workouts.map((w: any) => w.id === updatedWorkout.id ? updatedWorkout : w)
    });
    
    setBatchReps("");
    setBatchWeight("");
    setBatchRest("");
  };

  const getSynergistSuggestions = (activeWk: any, mapByName: any) => {
    if (!activeWk || !activeWk.exercises || activeWk.exercises.length === 0 || !mapByName) return [];
    
    const targetMuscles = new Set();
    activeWk.exercises.forEach((ex: any) => {
       const def = mapByName[ex.name];
       if (def) targetMuscles.add(def.muscle);
    });
    
    if (targetMuscles.size === 0) return [];
    
    const synergists: Record<string, string[]> = {
       "Peito": ["Tríceps", "Ombro"],
       "Costas": ["Bíceps", "Lombar", "Trapézio"],
       "Pernas": ["Panturrilha", "Glúteo", "Lombar"],
       "Ombro": ["Tríceps", "Trapézio"],
       "Bíceps": ["Antebraço"]
    };
    
    const suggestedMuscles = new Set();
    targetMuscles.forEach((m: any) => {
       if (synergists[m]) {
          synergists[m].forEach((s: string) => suggestedMuscles.add(s));
       }
    });
    
    const currentExNames = new Set(activeWk.exercises.map((e: any) => e.name));
    const suggestionsList: any[] = [];
    
    Object.values(mapByName).forEach((def: any) => {
       if (suggestedMuscles.has(def.muscle) && !currentExNames.has(def.name)) {
          suggestionsList.push(def);
       }
    });
    
    return suggestionsList.sort(() => 0.5 - Math.random()).slice(0, 3);
  };
  
  const suggestions = useMemo(() => getSynergistSuggestions(activeWorkout, exerciseMapByName), [activeWorkout, exerciseMapByName]);

  // Helper to deep update plan
  const updateExerciseSets = (exerciseId: string, newSets: PlannedSet[]) => {
    if (!activeWorkout) return;
    const newWorkouts = [...editingPlan.workouts];
    const wIndex = newWorkouts.findIndex(w => w.id === activeWorkout.id);
    const eIndex = newWorkouts[wIndex].exercises.findIndex(e => e.id === exerciseId);
    
    if (eIndex !== -1) {
      newWorkouts[wIndex].exercises[eIndex].sets = newSets;
      newWorkouts[wIndex].exercises[eIndex].plannedSets = newSets;
      setEditingPlan({ ...editingPlan, workouts: newWorkouts });
    }
  };

  const updateSetInline = (exerciseId: string, setIndex: number, field: keyof PlannedSet, value: any) => {
    if (!activeWorkout) return;
    const exercise = activeWorkout.exercises.find((e: any) => e.id === exerciseId);
    const sets = exercise?.sets || exercise?.plannedSets;
    if (!exercise || !sets) return;
    
    const newSets = [...sets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    updateExerciseSets(exerciseId, newSets);
  };

  const handleToggleConjugate = (exerciseId: string) => {
    if (!activeWorkout) return;
    const newWorkouts = [...editingPlan.workouts];
    const wIndex = newWorkouts.findIndex(w => w.id === activeWorkout.id);
    const eIndex = newWorkouts[wIndex].exercises.findIndex(e => e.id === exerciseId);
    
    if (eIndex !== -1) {
      newWorkouts[wIndex].exercises[eIndex].isConjugated = !newWorkouts[wIndex].exercises[eIndex].isConjugated;
      setEditingPlan({ ...editingPlan, workouts: newWorkouts });
    }
  };

  return (
    <div className="w-full h-full bg-noturno flex flex-col z-50 overflow-hidden font-sans">
      
      {/* TOP HEADER */}
      <div className="flex-none h-20 border-b border-concrete/20 bg-noturno px-8 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setEditingPlan(null)}
            className="text-concrete hover:text-white transition-colors"
          >
            <ArrowLeft size={28} />
          </button>
          
          <div className="flex items-center gap-4">
            <h2 className="font-display text-3xl uppercase tracking-wider text-white">
              {editingPlan.name || "Novo Plano"}
            </h2>
            <button className="text-vulcanico bg-vulcanico/10 p-2 rounded-lg hover:bg-vulcanico/20 transition-colors">
              <Edit3 size={18} />
            </button>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              Auto-Salvo
            </div>
          </div>
        </div>

        <button 
          onClick={handleSavePlan}
          disabled={!editingPlan.name || editingPlan.workouts.length === 0}
          className="bg-vulcanico text-noturno font-bold font-mono text-xs uppercase px-8 py-4 rounded-xl flex items-center gap-2 hover:bg-white transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(255,65,3,0.3)]"
        >
          <Save size={18} /> Salvar Plano
        </button>
      </div>

      {/* THREE-PANE LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMN 1: WORKOUTS LIST (LEFT) */}
        <div className="w-80 border-r border-concrete/20 bg-black/30 flex flex-col">
          <div className="p-6 border-b border-concrete/10 flex justify-between items-center">
            <h3 className="font-display text-lg text-white uppercase tracking-widest">Sessões</h3>
            <button 
              onClick={handleAddWorkoutToBuilder}
              className="text-vulcanico hover:text-white transition-colors"
            >
              <Plus size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <DragDropContext onDragEnd={handleMoveWorkout}>
              <Droppable droppableId="workout-list-desktop">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-3">
                    {editingPlan.workouts.map((w: any, index: number) => (
                      <Draggable key={w.id} draggableId={w.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setEditingWorkoutId(w.id)}
                            className={`p-4 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                              activeWorkout?.id === w.id 
                                ? "bg-vulcanico/10 border-vulcanico shadow-[0_0_10px_rgba(255,65,3,0.2)]" 
                                : "bg-noturno border-concrete/20 hover:border-concrete/50"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-display text-lg text-white uppercase tracking-wider">{w.name}</span>
                              
                              <div className="flex items-center gap-1">
                                <button 
                                  disabled={index === 0}
                                  onClick={(e) => { e.stopPropagation(); handleMoveWorkout && handleMoveWorkout(w.id, 'up'); }} 
                                  className="p-1 text-concrete hover:text-vulcanico disabled:opacity-20 hover:bg-white/10 rounded transition-colors" 
                                  title="Mover Treino para Cima"
                                >
                                  <ChevronUp size={14} />
                                </button>
                                <button 
                                  disabled={index === editingPlan.workouts.length - 1}
                                  onClick={(e) => { e.stopPropagation(); handleMoveWorkout && handleMoveWorkout(w.id, 'down'); }} 
                                  className="p-1 text-concrete hover:text-vulcanico disabled:opacity-20 hover:bg-white/10 rounded transition-colors" 
                                  title="Mover Treino para Baixo"
                                >
                                  <ChevronDown size={14} />
                                </button>
                                {activeWorkout?.id === w.id && <ChevronRight size={18} className="text-vulcanico" />}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCloneWorkout(w); }} 
                                  className="p-1.5 text-concrete hover:text-white hover:bg-white/10 rounded-md transition-colors" 
                                  title="Duplicar Treino"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>

                            </div>
                            <span className="font-mono text-[10px] text-concrete uppercase">{w.exercises.length} Exercícios</span>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        {/* COLUMN 2: EXERCISE BATCH EDITOR (MIDDLE) */}
        <div className="flex-1 bg-noturno flex flex-col shadow-2xl z-10 relative">
          {!activeWorkout ? (
            <div className="flex-1 flex flex-col items-center justify-center text-concrete/40">
              <Dumbbell size={64} className="mb-6 opacity-30" />
              <p className="font-mono text-sm uppercase tracking-widest">Selecione uma sessão ao lado</p>
            </div>
          ) : (
            <>
              {/* Active Workout Header */}
              <div className="p-6 border-b border-concrete/20 flex flex-col bg-noturno sticky top-0 z-20 gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-display text-2xl text-white uppercase tracking-widest">
                    {activeWorkout.name} <span className="text-vulcanico text-sm ml-2">({activeWorkout.exercises.length} Ex.)</span>
                  </h3>
                </div>
                
                {activeWorkout.exercises.length > 0 && (
                  <div className="flex items-center gap-2 bg-black/40 p-3 rounded-lg border border-concrete/10">
                    <span className="font-mono text-xs text-vulcanico uppercase tracking-wider whitespace-nowrap mr-2">
                      Forçar em lote:
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <input type="number" placeholder="Carga (kg)" value={batchWeight} onChange={e => setBatchWeight(e.target.value)} className="bg-transparent border border-concrete/20 rounded font-mono text-xs p-1.5 text-white w-24 text-center placeholder-concrete/50 focus:border-vulcanico outline-none transition-colors" />
                      <input type="number" placeholder="Reps" value={batchReps} onChange={e => setBatchReps(e.target.value)} className="bg-transparent border border-concrete/20 rounded font-mono text-xs p-1.5 text-white w-16 text-center placeholder-concrete/50 focus:border-vulcanico outline-none transition-colors" />
                      <input type="number" placeholder="Desc. (s)" value={batchRest} onChange={e => setBatchRest(e.target.value)} className="bg-transparent border border-concrete/20 rounded font-mono text-xs p-1.5 text-white w-20 text-center placeholder-concrete/50 focus:border-vulcanico outline-none transition-colors" />
                    </div>
                    <button 
                      onClick={() => handleApplyBatchUpdate(activeWorkout)}
                      className="bg-vulcanico/10 hover:bg-vulcanico text-vulcanico hover:text-noturno border border-vulcanico/30 hover:border-vulcanico px-4 py-1.5 rounded text-xs font-display uppercase tracking-widest transition-all"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>

              {/* BATCH EDIT TABLE */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/10">
                {activeWorkout.exercises.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-concrete/40 border-2 border-dashed border-concrete/20 rounded-2xl p-12 text-center">
                    <Search size={48} className="mb-4 opacity-50 text-vulcanico" />
                    <p className="font-display text-xl uppercase text-white mb-2">Treino Vazio</p>
                    <p className="font-mono text-xs uppercase max-w-sm">Busque exercícios na biblioteca à direita e clique no <Plus size={12} className="inline mx-1 text-vulcanico" /> para inseri-los aqui.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {activeWorkout.exercises.map((ex: any, exIdx: number) => {
                      const def = exerciseMap[ex.exerciseId] || (exerciseMapByName && exerciseMapByName[ex.exerciseId]) || (exerciseMap && exerciseMap[ex.name]) || {};
                      const exerciseTitle = def.name || ex.name || ex.exerciseId || "Exercício";
                      const muscleLabel = def.muscle || def.primaryMuscle || ex.muscle || "Geral";
                      return (
                        <div key={ex.id} className="bg-noturno border border-concrete/20 rounded-xl overflow-hidden shadow-lg group">
                          
                          {/* EXERCISE ROW HEADER */}
                          <div className="bg-black/40 p-4 border-b border-concrete/10 flex justify-between items-center cursor-context-menu" onContextMenu={(e) => handleContextMenu(e, ex)}>
                            <div className="flex items-center gap-4">
                              <span className="font-display text-2xl text-vulcanico w-8">{exIdx + 1}.</span>
                              <div>
                                <h4 className="font-display text-lg text-white uppercase">{exerciseTitle}</h4>
                                <span className="font-mono text-[10px] text-concrete uppercase" style={{ color: muscleColors[muscleLabel] || "#8A99A8" }}>
                                  {muscleLabel}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {/* Bi-set Toggle Button */}
                              <button 
                                onClick={() => handleToggleConjugate(ex.id)}
                                className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase font-bold border transition-colors ${
                                  ex.isConjugated 
                                    ? "bg-vulcanico/20 border-vulcanico text-vulcanico" 
                                    : "bg-transparent border-concrete/30 text-concrete hover:border-white hover:text-white"
                                }`}
                              >
                                {ex.isConjugated ? "Bi-set Ativo" : "Ativar Bi-set"}
                              </button>

                              <button 
                                onClick={() => setConfiguringExercise && setConfiguringExercise({ workoutId: activeWorkout.id, exercise: ex })}
                                className="p-2 text-concrete hover:text-vulcanico hover:bg-white/10 rounded-lg transition-colors"
                                title="Configurar Exercício (Métodos / Séries)"
                              >
                                <Edit3 size={18} />
                              </button>

                              <button 
                                onClick={() => handleRemoveExerciseFromWorkout(activeWorkout.id, ex.id)}
                                className="p-2 text-concrete hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remover Exercício"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>

                          {/* BATCH EDIT GRID (SETS) */}
                          <div className="p-4 flex flex-col gap-2">
                            {/* Table Headers */}
                            <div className="grid grid-cols-12 gap-4 px-4 pb-2 border-b border-concrete/10 font-mono text-[10px] text-concrete uppercase tracking-widest font-bold">
                               <div className="col-span-2">Série</div>
                               <div className="col-span-3">Reps Mín</div>
                               <div className="col-span-3">Reps Máx</div>
                               <div className="col-span-3">Descanso</div>
                               <div className="col-span-1 text-center"></div>
                            </div>

                            {/* Set Rows */}
                            {(ex.sets || ex.plannedSets || [])?.map((set: any, setIdx: number) => (
                              <div key={set.id} className="grid grid-cols-12 gap-4 px-4 py-2 items-center hover:bg-black/20 rounded-lg transition-colors">
                                 <div className="col-span-2 font-mono text-xs text-concrete uppercase flex items-center gap-2">
                                   <div className="w-6 h-6 rounded-md bg-vulcanico/10 text-vulcanico flex items-center justify-center font-bold">
                                     {setIdx + 1}
                                   </div>
                                 </div>
                                 
                                 {/* Batch Input: Min Reps */}
                                 <div className="col-span-3 relative">
                                   <input 
                                     type="number" 
                                     inputMode="numeric"
                                     value={set.minReps || ""}
                                     onChange={(e) => updateSetInline(ex.id, setIdx, "minReps", parseInt(e.target.value) || 0)}
                                     placeholder="Mínimo"
                                     className="w-full bg-noturno border border-concrete/20 focus:border-vulcanico rounded-lg px-3 py-2 font-mono text-sm text-white text-center outline-none transition-colors"
                                   />
                                 </div>

                                 {/* Batch Input: Max Reps */}
                                 <div className="col-span-3 relative">
                                   <input 
                                     type="number" 
                                     inputMode="numeric"
                                     value={set.maxReps || ""}
                                     onChange={(e) => updateSetInline(ex.id, setIdx, "maxReps", parseInt(e.target.value) || 0)}
                                     placeholder="Máximo"
                                     className="w-full bg-noturno border border-concrete/20 focus:border-vulcanico rounded-lg px-3 py-2 font-mono text-sm text-white text-center outline-none transition-colors"
                                   />
                                 </div>

                                 {/* Batch Input: Rest */}
                                 <div className="col-span-3 relative">
                                   <div className="flex items-center gap-2 bg-noturno border border-concrete/20 focus-within:border-vulcanico rounded-lg px-3 py-2 transition-colors">
                                     <Clock size={14} className="text-concrete flex-none" />
                                     <input 
                                       type="number" 
                                       value={set.restSeconds || 60}
                                       onChange={(e) => updateSetInline(ex.id, setIdx, "restSeconds", parseInt(e.target.value) || 0)}
                                       className="w-full bg-transparent font-mono text-sm text-white outline-none"
                                     />
                                     <span className="text-concrete text-xs font-mono">s</span>
                                   </div>
                                 </div>

                                 {/* Remove Set Button */}
                                 <div className="col-span-1 flex justify-center">
                                   <button 
                                     onClick={() => {
                                       const currentSets = ex.sets || ex.plannedSets || [];
                                       const newSets = currentSets.filter((s: any) => s.id !== set.id);
                                       updateExerciseSets(ex.id, newSets);
                                     }}
                                     className="text-concrete hover:text-red-500 transition-colors opacity-50 hover:opacity-100"
                                   >
                                     <X size={16} />
                                   </button>
                                 </div>
                              </div>
                            ))}

                            {/* Add Set Button */}
                            <div className="px-4 mt-2">
                              <button 
                                onClick={() => {
                                  const currentSets = ex.sets || ex.plannedSets || [];
                                  const newSets = [...currentSets];
                                  const lastSet = newSets[newSets.length - 1] || { targetWeight: null, targetReps: "", restSeconds: 60 };
                                  newSets.push({
                                    id: Date.now().toString(),
                                    targetWeight: lastSet.targetWeight,
                                    targetReps: lastSet.targetReps,
                                    restSeconds: lastSet.restSeconds
                                  });
                                  updateExerciseSets(ex.id, newSets);
                                }}
                                className="font-mono text-xs text-vulcanico uppercase tracking-wider flex items-center gap-2 hover:text-white transition-colors py-2 px-3 bg-vulcanico/10 hover:bg-vulcanico/20 rounded-lg"
                              >
                                <Plus size={14} /> Adicionar Série
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* COLUMN 3: EXERCISE LIBRARY (RIGHT) */}
        <div className="w-96 border-l border-concrete/20 bg-noturno flex flex-col shadow-[-10px_0_20px_rgba(0,0,0,0.5)] z-20">
          <div className="p-6 border-b border-concrete/20 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-lg text-white uppercase tracking-widest flex items-center gap-2">
                <Search className="text-vulcanico" size={20} />
                Biblioteca
              </h3>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-concrete" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome ou músculo..."
                value={exerciseSearchQuery}
                onChange={(e) => setExerciseSearchQuery(e.target.value)}
                className="w-full bg-black border border-concrete/30 focus:border-vulcanico rounded-xl pl-10 pr-4 py-3 font-mono text-xs text-white placeholder-concrete/50 outline-none transition-colors"
              />
            </div>

            {/* Quick Create Custom Exercise Inline */}
            <div className="bg-white/5 border border-concrete/20 rounded-xl p-3">
              {!showQuickCreate ? (
                <button 
                  type="button"
                  onClick={() => setShowQuickCreate(true)}
                  className="w-full flex items-center justify-between font-mono text-xs text-vulcanico uppercase font-bold tracking-wider hover:text-white transition-colors"
                >
                  <span>+ Criar Exercício Personalizado</span>
                  <Plus size={16} />
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-concrete/10 pb-1">
                    <span className="font-mono text-[10px] text-vulcanico uppercase font-bold">Novo Exercício</span>
                    <button type="button" onClick={() => setShowQuickCreate(false)} className="text-concrete hover:text-white text-xs">
                      Cancelar
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="Nome (ex: Rosca Martelo)"
                    className="w-full bg-black border border-concrete/30 rounded-lg px-3 py-1.5 font-sans text-xs text-white outline-none focus:border-vulcanico"
                  />
                  <div className="flex items-center gap-2">
                    <select 
                      value={quickMuscle}
                      onChange={(e) => setQuickMuscle(e.target.value)}
                      className="flex-1 bg-black border border-concrete/30 rounded-lg px-2 py-1.5 font-mono text-xs text-white outline-none"
                    >
                      {["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core", "Cardio", "Outros"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={() => {
                        if (!quickName.trim() || !handleCreateAndAddExerciseInline) return;
                        handleCreateAndAddExerciseInline(quickName, quickMuscle, activeWorkout?.id);
                        setQuickName("");
                        setShowQuickCreate(false);
                      }}
                      disabled={!quickName.trim()}
                      className="bg-vulcanico hover:bg-white text-noturno font-mono text-xs uppercase px-3 py-1.5 rounded-lg font-bold disabled:opacity-30 transition-colors"
                    >
                      Criar & Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3">
            {suggestions.length > 0 && !exerciseSearchQuery && (
              <div className="mb-4 bg-gradient-to-br from-vulcanico/10 to-vulcanico/5 border border-vulcanico/30 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-vulcanico">
                  <Flame size={16} />
                  <span className="font-display text-sm uppercase tracking-wider">Sugestões (Sinergia)</span>
                </div>
                <div className="flex flex-col gap-2">
                  {suggestions.map((sug: any) => (
                    <button
                      key={sug.id || sug.name}
                      onClick={() => handleAddExerciseToWorkout(activeWorkout?.id, sug)}
                      className="w-full text-left bg-black/40 hover:bg-vulcanico/20 hover:border-vulcanico/50 border border-concrete/10 rounded-lg p-3 transition-colors flex justify-between items-center group"
                    >
                      <div className="flex flex-col">
                        <span className="font-display text-white uppercase text-sm group-hover:text-vulcanico transition-colors">{sug.name}</span>
                        <span className="font-mono text-[9px] text-concrete uppercase">{sug.muscle}</span>
                      </div>
                      <Plus size={16} className="text-concrete group-hover:text-vulcanico transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}
             {filteredExercises.map((ex: any) => (
                <div key={ex.id} className="bg-black/30 border border-concrete/10 hover:border-vulcanico/50 p-4 rounded-xl flex justify-between items-center group transition-colors cursor-pointer" onClick={() => handleAddExerciseToWorkout(activeWorkout?.id, ex)}>
                   <div>
                     <h4 className="font-display text-sm text-white uppercase">{ex.name}</h4>
                     <span className="font-mono text-[10px] text-concrete uppercase mt-1 block" style={{ color: muscleColors[ex.primaryMuscle] }}>
                       {ex.primaryMuscle} {ex.secondaryMuscles?.length > 0 ? ` • ${ex.secondaryMuscles.join(', ')}` : ''}
                     </span>
                   </div>
                   <button className="text-concrete group-hover:text-vulcanico bg-white/5 group-hover:bg-vulcanico/10 p-2 rounded-lg transition-colors">
                     <Plus size={18} />
                   </button>
                </div>
             ))}
             {filteredExercises.length === 0 && (
               <p className="text-center text-concrete font-mono text-xs mt-8">Nenhum exercício encontrado.</p>
             )}
          </div>
        </div>
      </div>

      {/* -------------------- CONFIG EXERCISE SETS PANEL (MODAL DESKTOP) -------------------- */}
      {configuringExercise && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-noturno border border-concrete/20 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex-none p-6 pb-4 border-b border-concrete/20 flex justify-between items-center bg-noturno">
              <div>
                <span className="font-mono text-[9px] text-concrete uppercase tracking-widest">Configurar Séries & Métodos</span>
                <h2 className="font-display text-2xl uppercase text-white leading-none mt-1">
                  {exerciseMap[configuringExercise.exercise.exerciseId]?.name || (exerciseMapByName && exerciseMapByName[configuringExercise.exercise.exerciseId]?.name) || "Exercício"}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setConfiguringExercise && setConfiguringExercise(null)} 
                  className="text-concrete hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
                <button 
                  onClick={handleSaveExerciseConfig} 
                  className="bg-vulcanico text-noturno font-bold font-mono text-xs uppercase px-4 py-2 rounded-xl flex items-center gap-1 hover:bg-white transition-colors"
                  title="Salvar"
                >
                  <Save size={16} /> Salvar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="flex flex-col gap-6">
                {configuringExercise.exercise.sets.map((set: any, sIdx: number) => (
                  <div key={set.id} className="pb-6 border-b border-concrete/10 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs text-vulcanico uppercase font-bold">Série {sIdx + 1}</span>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleApplySetConfigToAll && handleApplySetConfigToAll(set.id)}
                          className="text-concrete hover:text-vulcanico flex items-center gap-1 font-mono text-[9px] uppercase"
                          title="Aplicar esta configuração em todas as outras séries"
                        >
                          <Copy size={12} /> Replicar Config
                        </button>
                        {configuringExercise.exercise.sets.length > 1 && (
                          <button
                            onClick={() => handleRemoveSetFromConfig && handleRemoveSetFromConfig(set.id)}
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
                            onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { minReps: Math.max(0, set.minReps - 1) })}
                            className="text-concrete hover:text-white p-1 transition-colors"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <span className="font-mono text-lg text-white font-bold">{set.minReps}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { minReps: set.minReps + 1 })}
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
                            onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { maxReps: Math.max(0, set.maxReps - 1) })}
                            className="text-concrete hover:text-white p-1 transition-colors"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <span className="font-mono text-lg text-white font-bold">{set.maxReps}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { maxReps: set.maxReps + 1 })}
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
                            onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { restSeconds: Math.max(0, set.restSeconds - 5) })}
                            className="text-concrete hover:text-white p-1 transition-colors"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <span className="font-mono text-lg text-white font-bold">{set.restSeconds}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { restSeconds: set.restSeconds + 5 })}
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
                                handleUpdateSetConfig && handleUpdateSetConfig(set.id, {
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
                                  onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { dropCount: Math.max(1, drops - 1) })}
                                  className="text-purple-400 hover:text-white p-0.5"
                                >
                                  <ChevronDown size={14} />
                                </button>
                                <span className="font-mono text-sm text-purple-300 font-bold">{drops}x drops</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { dropCount: drops + 1 })}
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
                                    onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { failureType: f.id })}
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
                                    onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { restPauseSets: Math.max(1, rpSets - 1) })}
                                    className="text-blue-400 hover:text-white p-0.5"
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                  <span className="font-mono text-xs text-blue-300 font-bold">{rpSets}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { restPauseSets: rpSets + 1 })}
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
                                    onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { restPauseSeconds: Math.max(5, rpSecs - 5) })}
                                    className="text-blue-400 hover:text-white p-0.5"
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                  <span className="font-mono text-xs text-blue-300 font-bold">{rpSecs}s</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { restPauseSeconds: rpSecs + 5 })}
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
                                onChange={(e) => handleUpdateSetConfig && handleUpdateSetConfig(set.id, { customMethodName: e.target.value })}
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
        </div>
      )}
    </div>
  );
}
