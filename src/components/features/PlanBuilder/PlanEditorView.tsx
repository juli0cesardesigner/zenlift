// @ts-nocheck
import React, { useState } from 'react';
import { ChevronRight, ArrowLeft, Save, Plus, Edit3, Check, Trash2, Clock, Dumbbell, Link, X, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export function PlanEditorView(props: any) {
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickMuscle, setQuickMuscle] = useState("Peito");

  const {
    editingPlan, editingWorkoutId, setEditingWorkoutId, handleMoveWorkout, handleRemoveExerciseFromWorkout, handleOpenAddExerciseToWorkout, handleAddWorkoutToBuilder, addingExerciseToWorkoutId, setAddingExerciseToWorkoutId, exerciseSearchQuery, setExerciseSearchQuery, filteredExercises, filteredExercisesByMuscle, handleAddExerciseToWorkout, handleCreateAndAddExerciseInline, configuringExercise, setConfiguringExercise, exerciseMap, handleSaveExerciseConfig, handleApplySetConfigToAll, handleRemoveSetFromConfig, handleUpdateSetConfig, handleAddSetToConfig, handleToggleConjugate, handleSavePlan, setEditingPlan, plans, peIdx, exerciseMapByName, handleUpdateWorkoutNameInBuilder, setConfirmConfig, handleRemoveWorkoutFromBuilder
  } = props;

  return (
    <>
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
                <div className="flex-none p-4 sm:p-6 pb-4 border-b border-concrete/20 flex justify-between items-center bg-noturno">
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
                <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-20">
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
                          {editingWorkout.exercises.map((pe, peIdx) => {
                            const exDef = exerciseMap[pe.exerciseId];
                            const nextPe = editingWorkout.exercises[peIdx + 1];
                            const isGroupedWithNext = !!(pe.supersetGroupId && nextPe && pe.supersetGroupId === nextPe.supersetGroupId);

                            return (
                              <div 
                                key={pe.id} 
                                className={`flex items-center justify-between py-2 border-b border-concrete/10 transition-all ${
                                  pe.supersetGroupId 
                                    ? "border-l-4 border-l-purple-500 pl-3 bg-purple-500/5 my-1 rounded-r-lg" 
                                    : ""
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-display uppercase text-white text-lg">
                                      {exDef?.name || "Desconhecido"}
                                    </span>
                                    {pe.supersetGroupId && (
                                      <span className="font-mono text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                                        Conjugado
                                      </span>
                                    )}
                                  </div>
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
                                        const repsCount = s.reps ?? s.minReps ?? 10;
                                        return `${repsCount}r${methodTag}`;
                                      }).join(" / ")
                                    }
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {peIdx < editingWorkout.exercises.length - 1 && (
                                    <button
                                      onClick={() => handleToggleConjugate(editingWorkout.id, pe.id)}
                                      className={`p-1 transition-colors ${isGroupedWithNext ? "text-purple-400 hover:text-white" : "text-concrete/40 hover:text-purple-400"}`}
                                      title={isGroupedWithNext ? "Desconectar do próximo exercício" : "Conugar com o próximo exercício (Biset / Superset)"}
                                    >
                                      <Link size={16} className={isGroupedWithNext ? "rotate-45" : ""} />
                                    </button>
                                  )}
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
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-2xl uppercase text-white leading-none">
                    {plans.some(p => p.id === editingPlan.id) ? "Editar Plano" : "Novo Plano"}
                  </h2>
                  <div className="flex items-center gap-1 font-mono text-[9px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                    Auto-Salvo
                  </div>
                </div>
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
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-20">
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
                          <div
                            key={w.id}
                            className="w-full border border-concrete/20 hover:border-vulcanico/50 transition-all flex items-center justify-between bg-concrete/5 group rounded-2xl p-2 pr-4"
                          >
                            {/* Reorder Buttons (Up / Down) */}
                            <div className="flex flex-col gap-0.5 shrink-0 border-r border-concrete/15 pr-2 mr-2">
                              <button
                                type="button"
                                disabled={wIdx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveWorkout && handleMoveWorkout(w.id, 'up');
                                }}
                                className="p-1 text-concrete hover:text-vulcanico disabled:opacity-25 disabled:hover:text-concrete transition-colors"
                                title="Mover Treino para Cima"
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={wIdx === editingPlan.workouts.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveWorkout && handleMoveWorkout(w.id, 'down');
                                }}
                                className="p-1 text-concrete hover:text-vulcanico disabled:opacity-25 disabled:hover:text-concrete transition-colors"
                                title="Mover Treino para Baixo"
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>

                            {/* Workout Info & Open Button */}
                            <button
                              type="button"
                              onClick={() => setEditingWorkoutId(w.id)}
                              className="flex-1 flex justify-between items-center text-left py-2 px-2"
                            >
                              <div className="flex flex-col">
                                <span className="font-sans font-bold text-lg text-white group-hover:text-vulcanico transition-colors uppercase tracking-wide">
                                  {w.name || `Treino ${String.fromCharCode(65 + wIdx)}`}
                                </span>
                                <span className="font-mono text-xs text-concrete">
                                  {w.exercises?.length || 0} exercício(s)
                                </span>
                              </div>
                              <ChevronRight size={20} className="text-concrete group-hover:text-vulcanico transition-colors shrink-0 ml-2" />
                            </button>
                          </div>
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

          {/* Quick Create Custom Exercise Inline */}
          <div className="mb-4 bg-white/5 border border-concrete/20 rounded-xl p-3">
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
                  placeholder="Nome (ex: Remada Articulada)"
                  className="w-full bg-noturno border border-concrete/20 rounded-lg px-3 py-1.5 font-sans text-xs text-white outline-none focus:border-vulcanico"
                />
                <div className="flex items-center gap-2">
                  <select 
                    value={quickMuscle}
                    onChange={(e) => setQuickMuscle(e.target.value)}
                    className="flex-1 bg-noturno border border-concrete/20 rounded-lg px-2 py-1.5 font-mono text-xs text-white outline-none"
                  >
                    {["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core", "Cardio", "Outros"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button 
                    type="button"
                    onClick={() => {
                      if (!quickName.trim() || !handleCreateAndAddExerciseInline) return;
                      handleCreateAndAddExerciseInline(quickName, quickMuscle, addingExerciseToWorkoutId);
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-mono text-xs text-concrete uppercase tracking-widest block mb-2 text-center">Repetições</label>
                      <div className="flex items-center justify-between border-b border-concrete/30 py-1 select-none">
                        <button
                          type="button"
                          onClick={() => {
                            const currentReps = set.reps ?? set.minReps ?? 10;
                            const newReps = Math.max(0, currentReps - 1);
                            handleUpdateSetConfig(set.id, { reps: newReps, minReps: newReps, maxReps: newReps });
                          }}
                          className="text-concrete hover:text-white p-1 transition-colors"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <span className="font-mono text-lg text-white font-bold">{set.reps ?? set.minReps ?? 10}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const currentReps = set.reps ?? set.minReps ?? 10;
                            const newReps = currentReps + 1;
                            handleUpdateSetConfig(set.id, { reps: newReps, minReps: newReps, maxReps: newReps });
                          }}
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
    </>
  );
}
