import React, { useRef, useState } from 'react';
import { ChevronRight, ArrowLeft, Save, Plus, Edit3, Check, Trash2, Clock, Dumbbell, Play, X, Settings, Info, ChevronDown, ChevronUp, Maximize2, Minimize2, CheckSquare, Square, Zap, Users } from 'lucide-react';
import { ExerciseDef, ActiveWorkoutViewProps } from '../../../types';
import { isValidVideoUrl, triggerHapticFeedback } from '../../../lib/utils';

export function ActiveWorkoutView(props: ActiveWorkoutViewProps) {
  const blurMaskRef = useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState(0);
  const {
    activeWorkout, isWorkoutMinimized, setIsWorkoutMinimized, formatTime, 
    handleEndWorkout, handleAddExerciseToActiveWorkout, handleUpdateActiveSet,
    handleToggleActiveSet, exerciseMap, plans, isEditingDirectly, setIsEditingDirectly, activeInputModal, setActiveInputModal, modalTempValue, setModalTempValue, restTimer, setRestTimer, restRemainingMs, formatRestTime, handleAddRestTime, addingExerciseToActiveWorkout, setAddingExerciseToActiveWorkout, replacingActiveExerciseId, setReplacingActiveExerciseId, handleReplaceExerciseInActiveWorkout, exerciseSearchQuery, setExerciseSearchQuery, filteredExercises, filteredExercisesByMuscle, slideX, setSlideX, isSliding, setIsSliding, handleFinishWorkout, handleCancelWorkout, setActiveWorkout, resolvedActiveExerciseIndex, expandedCompletedExercises, setExpandedCompletedExercises, handleSkipExercise, globalActiveSetId, activeStopwatchSetId, activeStopwatchElapsedMs, setActiveStopwatchSetId, setActiveStopwatchStartTime, setActiveStopwatchElapsedMs, handleAddActiveSet, handleRemoveActiveSet, elapsedTime
  } = props;

  const currentWorkoutType = activeWorkout?.workoutType || "rotina";

  return (
    <>
      {/* -------------------- ACTIVE WORKOUT OVERLAY -------------------- */}
{activeWorkout && !isWorkoutMinimized && (
        <div className="absolute inset-0 z-40 bg-noturno flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-none p-3.5 sm:p-5 border-b border-concrete/20 bg-noturno z-10 flex flex-col gap-2">
            {/* Line 1: Workout Name on Left + Minimize & Cancel on Right */}
            <div className="flex justify-between items-center w-full">
              <h2 className="font-display text-2xl uppercase text-white leading-none truncate">
                {activeWorkout.name}
              </h2>
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                <button 
                  onClick={() => setIsWorkoutMinimized(true)} 
                  className="text-concrete hover:text-white transition-colors flex items-center gap-1 font-mono text-[10px] uppercase font-bold"
                  title="Minimizar Treino"
                >
                  <ChevronDown size={18} />
                  <span>Minimizar</span>
                </button>
                <button 
                  onClick={handleCancelWorkout} 
                  className="text-concrete hover:text-white transition-colors flex items-center gap-1 font-mono text-[10px] uppercase font-bold"
                  title="Cancelar Treino"
                >
                  <X size={18} />
                  <span>Cancelar</span>
                </button>
              </div>
            </div>

            {/* Line 2: Workout Type & Dual/Solo Mode Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setActiveWorkout((prev: any) => prev ? {
                    ...prev,
                    workoutType: (prev.workoutType || "rotina") === "rotina" ? "forca" : "rotina"
                  } : null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border transition-all ${
                  currentWorkoutType === "forca"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30"
                    : "bg-concrete/10 text-concrete border-concrete/30 hover:border-concrete/50"
                }`}
                title="Clique para alternar entre Treino de Rotina e Treino de Força"
              >
                {currentWorkoutType === "forca" ? (
                  <>
                    <Zap size={12} className="text-amber-400 fill-amber-400" />
                    <span className="font-bold">Treino de Força</span>
                  </>
                ) : (
                  <>
                    <Dumbbell size={12} className="text-concrete" />
                    <span>Treino de Rotina</span>
                  </>
                )}
              </button>

              {activeWorkout.sessionMode === "dual" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  <Users size={12} className="text-cyan-400" />
                  <span>DUAL: {activeWorkout.partner1Name || "P1"} & {activeWorkout.partner2Name || "P2"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Workout Screen Scroll */}
          <div 
            className="flex-1 overflow-y-auto p-3 sm:p-5 pb-36 relative"
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
                  const exDef = exerciseMap ? (typeof (exerciseMap as any).get === 'function' ? (exerciseMap as any).get(ae.exerciseId) : exerciseMap[ae.exerciseId]) : undefined;
                  const activeEx = activeWorkout.exercises[resolvedActiveExerciseIndex];
                  const isInActiveSuperset = !!(activeEx && ae.supersetGroupId && ae.supersetGroupId === activeEx.supersetGroupId);
                  const distance = aeIdx - resolvedActiveExerciseIndex;
                  const isQueued = distance > 0 && !isInActiveSuperset;
                  
                  const isExerciseCompleted = ae.sets.every(s => s.completed);
                  const isGroupCompleted = ae.supersetGroupId
                    ? activeWorkout.exercises
                        .filter(ex => ex.supersetGroupId === ae.supersetGroupId)
                        .every(ex => ex.sets.every(s => s.completed))
                    : isExerciseCompleted;
                  const isCollapsed = isGroupCompleted && !expandedCompletedExercises[ae.id];

                  if (isCollapsed) {
                    return (
                      <div 
                        key={ae.id} 
                        className={`flex flex-col bg-concrete/5 border border-concrete/10 rounded-2xl p-4 transition-all animate-fade-in ${
                          ae.supersetGroupId ? "border-l-4 border-l-purple-500 pl-3 bg-purple-500/5" : ""
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-vulcanico flex items-center justify-center text-noturno shrink-0">
                              <Check size={14} strokeWidth={3} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-display text-lg uppercase text-concrete leading-tight line-through">
                                  {exDef?.name || "Desconhecido"}
                                </h3>
                                {ae.supersetGroupId && (
                                  <span className="text-[8px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.5 rounded font-bold tracking-wider">
                                    Conjugado
                                  </span>
                                )}
                              </div>
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
                      data-active-exercise={aeIdx === resolvedActiveExerciseIndex || isInActiveSuperset}
                      className={`flex flex-col relative transition-all duration-500 ${
                        ae.supersetGroupId 
                          ? "border-l-4 border-l-purple-500 pl-4 py-2 my-2 bg-purple-500/5 rounded-r-xl" 
                          : ""
                      }`}
                      style={
                        isQueued && isWorkoutMinimized
                          ? { opacity: distance === 1 ? 0.75 : distance === 2 ? 0.40 : 0.15 }
                          : undefined
                      }
                    >
                        {/* Exercise Title & Header Controls (2-Line Responsive Layout) */}
                        <div className="flex flex-col gap-2 mb-3">
                          {/* Line 1: Exercise Name Full Width */}
                          <div className="flex justify-between items-center w-full">
                            <h3 className="font-display text-2xl uppercase text-vulcanico leading-tight truncate">
                              {exDef?.name || "Desconhecido"}
                            </h3>
                            {isExerciseCompleted && (
                              <button
                                onClick={() => setExpandedCompletedExercises(prev => ({ ...prev, [ae.id]: false }))}
                                className="text-concrete hover:text-white p-0.5 shrink-0 ml-2"
                                title="Recolher Exercício"
                              >
                                <ChevronUp size={18} />
                              </button>
                            )}
                          </div>

                          {/* Line 2: Actions, Timer & Muscle Badge */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {!isExerciseCompleted && (
                                <>
                                  {distance === 0 && activeWorkout.exercises.length > 1 && (
                                    <button 
                                      onClick={() => handleSkipExercise(ae.id)}
                                      className="text-[9px] font-mono uppercase bg-concrete/10 hover:bg-concrete/20 text-concrete hover:text-white px-2 py-1 rounded border border-concrete/20 transition-colors"
                                      title="Pular para o fim da lista"
                                    >
                                      Pular
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => setReplacingActiveExerciseId(ae.id)}
                                    className="text-[9px] font-mono uppercase bg-concrete/10 hover:bg-concrete/20 text-vulcanico hover:text-white px-2 py-1 rounded border border-concrete/20 transition-colors font-bold"
                                    title="Substituir por outro exercício"
                                  >
                                    Substituir
                                  </button>
                                </>
                              )}
                              {ae.supersetGroupId && (
                                <span className="text-[9px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-bold tracking-wider">
                                  Biset/Conjugado
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {ae.elapsedSeconds !== undefined && ae.elapsedSeconds > 0 && (
                                <span className="font-mono text-[10px] text-vulcanico bg-vulcanico/10 border border-vulcanico/20 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                  <Clock size={11} className={!isQueued && !isExerciseCompleted ? "animate-pulse" : ""} />
                                  {formatTime(ae.elapsedSeconds * 1000)}
                                </span>
                              )}
                              <span className="font-mono text-[10px] text-concrete uppercase bg-concrete/10 px-2 py-0.5 rounded font-semibold">
                                {exDef?.muscle || "Geral"}
                              </span>
                            </div>
                          </div>

                          {isValidVideoUrl(exDef?.videoUrl) && !isQueued && (
                            <div className="w-full mt-1 mb-2 rounded-lg overflow-hidden border border-concrete/20 bg-black">
                              <video 
                                src={exDef?.videoUrl} 
                                className="w-full h-auto max-h-[160px] object-cover mx-auto" 
                                autoPlay 
                                loop 
                                muted 
                                playsInline 
                              />
                            </div>
                          )}
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
                            {exDef.visibleFields.map((field: string) => {
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
                        {activeWorkout.sessionMode === "dual" ? (
                          <div className="grid grid-cols-12 font-mono text-[10px] text-cyan-400 uppercase mb-2 text-center font-bold px-0.5">
                            <div className="col-span-1">Série</div>
                            <div className="col-span-2">Alvo</div>
                            <div className="col-span-9 flex justify-around">
                              <span className="text-vulcanico font-extrabold">{activeWorkout.partner1Name || "P1"}</span>
                              <span className="text-cyan-400 font-extrabold">{activeWorkout.partner2Name || "P2"}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-12 font-mono text-[10px] text-concrete uppercase mb-2 text-center font-bold">
                            <div className="col-span-2">Série</div>
                            <div className="col-span-3">(Reps)</div>
                            {exDef?.isRepsOnly ? (
                              <div className="col-span-5">Reps</div>
                            ) : (
                              <>
                                <div className="col-span-3">Carga (kg)</div>
                                <div className="col-span-2">Reps</div>
                              </>
                            )}
                            <div className="col-span-2">Feito</div>
                          </div>
                        )}

                        {/* Sets Rows */}
                        <div className="flex flex-col gap-2">
                          {ae.sets.map((set, sIdx) => {
                            const hasMinMax = set.minReps !== undefined;
                            const targetText = hasMinMax 
                              ? `${set.minReps}-${set.maxReps}` 
                              : "Livre";

                            const isActiveSet = set.id === globalActiveSetId;
                            const isFullyCompleted = activeWorkout.sessionMode === "dual" ? (set.completed && set.completedP2) : set.completed;

                            return (
                              <div 
                                key={set.id} 
                                className={`grid grid-cols-12 items-center text-center py-2 transition-all rounded-xl ${
                                  isFullyCompleted ? "bg-vulcanico/10 opacity-70" : "bg-concrete/5"
                                } ${isActiveSet ? "ring-2 ring-vulcanico shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse" : ""}`}
                              >
                                <div className={`${activeWorkout.sessionMode === "dual" ? "col-span-1" : "col-span-2"} font-mono text-xs flex flex-col items-center justify-center`}>
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

                                <div className={`${activeWorkout.sessionMode === "dual" ? "col-span-2" : "col-span-3"} font-mono text-[11px] text-concrete`}>
                                  <div>{targetText}</div>
                                </div>

                                {activeWorkout.sessionMode === "dual" ? (
                                  <div className="col-span-9 grid grid-cols-2 gap-1.5 px-0.5">
                                    {/* P1 Box */}
                                    <div className={`p-1.5 rounded-lg border flex items-center justify-between gap-1 transition-all ${
                                      set.completed ? "bg-vulcanico/20 border-vulcanico/50 shadow-[0_0_10px_rgba(255,65,3,0.15)]" : "bg-black/30 border-white/10"
                                    }`}>
                                      <div className="flex items-center justify-center gap-1 font-mono text-xs flex-1">
                                        <button
                                          onClick={() => {
                                            if (!set.completed) {
                                              setActiveInputModal({
                                                exerciseId: ae.id,
                                                setId: set.id,
                                                field: "weight",
                                                partner: "p1",
                                                initialValue: set.weight,
                                                suggestedValue: set.suggestedWeight || ""
                                              });
                                              setModalTempValue(set.weight || set.suggestedWeight || "0");
                                            }
                                          }}
                                          disabled={set.completed}
                                          className={`px-1.5 py-1 rounded border transition-colors ${!set.weight && set.suggestedWeight ? 'text-concrete border-concrete/20' : 'text-white border-white/20 bg-white/5 font-bold'}`}
                                        >
                                          {set.weight || set.suggestedWeight || "0"}<span className="text-[9px] text-concrete font-normal ml-0.5">kg</span>
                                        </button>
                                        <span className="text-concrete text-[10px] px-0.5">×</span>
                                        <button
                                          onClick={() => {
                                            if (!set.completed) {
                                              setActiveInputModal({
                                                exerciseId: ae.id,
                                                setId: set.id,
                                                field: "reps",
                                                partner: "p1",
                                                initialValue: set.reps,
                                                suggestedValue: set.suggestedReps || ""
                                              });
                                              setModalTempValue(set.reps || set.suggestedReps || "0");
                                            }
                                          }}
                                          disabled={set.completed}
                                          className={`px-1.5 py-1 rounded border transition-colors ${!set.reps && set.suggestedReps ? 'text-concrete border-concrete/20' : 'text-white border-white/20 bg-white/5 font-bold'}`}
                                        >
                                          {set.reps || set.suggestedReps || "0"}
                                        </button>
                                      </div>
                                      <button
                                         onClick={() => {
                                           triggerHapticFeedback('medium');
                                           handleUpdateActiveSet(ae.id, set.id, "completed", !set.completed, "p1");
                                         }}
                                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all shrink-0 ${
                                          set.completed ? "bg-vulcanico text-noturno font-bold shadow-[0_0_8px_#FF4103]" : "bg-concrete/20 text-concrete hover:text-white border border-white/10"
                                        }`}
                                        title={`Marcar concluído para ${activeWorkout.partner1Name || "P1"}`}
                                      >
                                        {set.completed ? <Check size={16} strokeWidth={3} /> : <Square size={16} />}
                                      </button>
                                    </div>

                                    {/* P2 Box */}
                                    <div className={`p-1.5 rounded-lg border flex items-center justify-between gap-1 transition-all ${
                                      set.completedP2 ? "bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]" : "bg-black/30 border-white/10"
                                    }`}>
                                      <div className="flex items-center justify-center gap-1 font-mono text-xs flex-1">
                                        <button
                                          onClick={() => {
                                            if (!set.completedP2) {
                                              setActiveInputModal({
                                                exerciseId: ae.id,
                                                setId: set.id,
                                                field: "weight",
                                                partner: "p2",
                                                initialValue: set.weightP2 || "",
                                                suggestedValue: set.suggestedWeightP2 || ""
                                              });
                                              setModalTempValue(set.weightP2 || set.suggestedWeightP2 || "0");
                                            }
                                          }}
                                          disabled={set.completedP2}
                                          className={`px-1.5 py-1 rounded border transition-colors ${!set.weightP2 && set.suggestedWeightP2 ? 'text-concrete border-concrete/20' : 'text-white border-white/20 bg-white/5 font-bold'}`}
                                        >
                                          {set.weightP2 || set.suggestedWeightP2 || "0"}<span className="text-[9px] text-concrete font-normal ml-0.5">kg</span>
                                        </button>
                                        <span className="text-concrete text-[10px] px-0.5">×</span>
                                        <button
                                          onClick={() => {
                                            if (!set.completedP2) {
                                              setActiveInputModal({
                                                exerciseId: ae.id,
                                                setId: set.id,
                                                field: "reps",
                                                partner: "p2",
                                                initialValue: set.repsP2 || "",
                                                suggestedValue: set.suggestedRepsP2 || ""
                                              });
                                              setModalTempValue(set.repsP2 || set.suggestedRepsP2 || "0");
                                            }
                                          }}
                                          disabled={set.completedP2}
                                          className={`px-1.5 py-1 rounded border transition-colors ${!set.repsP2 && set.suggestedRepsP2 ? 'text-concrete border-concrete/20' : 'text-white border-white/20 bg-white/5 font-bold'}`}
                                        >
                                          {set.repsP2 || set.suggestedRepsP2 || "0"}
                                        </button>
                                      </div>
                                      <button
                                         onClick={() => {
                                           triggerHapticFeedback('medium');
                                           handleUpdateActiveSet(ae.id, set.id, "completed", !set.completedP2, "p2");
                                         }}
                                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all shrink-0 ${
                                          set.completedP2 ? "bg-cyan-500 text-noturno font-bold shadow-[0_0_8px_#06b6d4]" : "bg-concrete/20 text-concrete hover:text-white border border-white/10"
                                        }`}
                                        title={`Marcar concluído para ${activeWorkout.partner2Name || "P2"}`}
                                      >
                                        {set.completedP2 ? <Check size={16} strokeWidth={3} /> : <Square size={16} />}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
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
                                    ) : exDef?.isRepsOnly ? (
                                      <div className="col-span-5 px-1">
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
                                        onClick={() => {
                                          triggerHapticFeedback('medium');
                                          if (handleToggleActiveSet) handleToggleActiveSet(ae.id, set.id);
                                          else handleUpdateActiveSet(ae.id, set.id, "completed", !set.completed);
                                        }}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                          set.completed ? "bg-vulcanico text-noturno" : "bg-concrete/10 text-concrete hover:text-white"
                                        }`}
                                      >
                                        {set.completed ? <Check size={18} strokeWidth={3} /> : <Square size={18} />}
                                      </button>
                                    </div>
                                  </>
                                )}
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
                  triggerHapticFeedback('success');
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
            
            // Zoom logic for slider range
            const baseValue = parseFloat(activeInputModal.initialValue || activeInputModal.suggestedValue || "0") || 40;
            const stableMin = Math.max(0, baseValue - 10);
            const stableMax = baseValue + 10;
            const currentVal = parseFloat(modalTempValue) || 0;

            const minVal = isWeight 
              ? (currentVal < stableMin ? Math.max(0, currentVal - 10) : stableMin) 
              : 0;
            const maxVal = isWeight 
              ? (currentVal > stableMax ? currentVal + 10 : stableMax) 
              : 50;

            const handleQuickAction = (val: number) => {
              const current = parseFloat(modalTempValue) || 0;
              const next = Math.max(0, current + val);
              setModalTempValue(next % 1 !== 0 ? next.toFixed(1) : next.toString());
            };

            const handleKeypadPress = (key: string) => {
              setModalTempValue((prev: string) => {
                if (key === "backspace") {
                  if (prev.length <= 1) return "0";
                  return prev.slice(0, -1);
                }
                if (key === ".") {
                  if (!isWeight) return prev; // reps don't have decimal
                  if (prev.includes(".")) return prev;
                  return prev + ".";
                }
                // Digit 0-9
                if (prev === "0") {
                  return key;
                }
                // Limit to sensible digits length (e.g. 5 chars max, like 187.5)
                if (prev.length >= 6) return prev;
                return prev + key;
              });
            };

            const handleConfirm = () => {
              handleUpdateActiveSet(
                activeInputModal.exerciseId,
                activeInputModal.setId,
                activeInputModal.field,
                modalTempValue,
                activeInputModal.partner || "p1"
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
                      {activeWorkout?.sessionMode === "dual" && (
                        <span className="text-cyan-400 font-bold ml-2 text-sm">
                          ({activeInputModal.partner === "p2" ? (activeWorkout.partner2Name || "P2") : (activeWorkout.partner1Name || "P1")})
                        </span>
                      )}
                    </h3>
                    <button onClick={() => setActiveInputModal(null)} className="text-concrete hover:text-white p-2">
                      <X size={24} />
                    </button>
                  </div>

                  {/* Big Number Display */}
                  <div className="flex flex-col items-center justify-center py-4">
                    <button 
                      onClick={() => setIsEditingDirectly(!isEditingDirectly)}
                      className={`font-mono text-8xl font-bold tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] focus:outline-none transition-colors flex items-baseline justify-center w-full ${
                        isEditingDirectly ? "text-vulcanico border-b-2 border-vulcanico pb-1" : "text-white hover:text-vulcanico"
                      }`}
                      title={isEditingDirectly ? "Visualizar Carga" : "Clique para digitar"}
                    >
                      {modalTempValue || "0"}
                      {isEditingDirectly && <span className="animate-pulse text-vulcanico ml-1">|</span>}
                      <span className="text-3xl text-concrete ml-2 font-normal">{isWeight ? "kg" : "reps"}</span>
                    </button>
                  </div>

                  {isEditingDirectly ? (
                    /* Custom Numeric Keypad */
                    <div className="flex flex-col gap-4 animate-fade-in">
                      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto w-full">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleKeypadPress(num.toString())}
                            className="bg-concrete/10 hover:bg-concrete/20 text-white font-display text-2xl py-4 rounded-xl active:scale-95 transition-all font-bold"
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleKeypadPress(".")}
                          disabled={!isWeight}
                          className={`font-display text-2xl py-4 rounded-xl active:scale-95 transition-all font-bold ${
                            isWeight 
                              ? "bg-concrete/10 hover:bg-concrete/20 text-white" 
                              : "opacity-20 text-concrete cursor-not-allowed"
                          }`}
                        >
                          .
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKeypadPress("0")}
                          className="bg-concrete/10 hover:bg-concrete/20 text-white font-display text-2xl py-4 rounded-xl active:scale-95 transition-all font-bold"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKeypadPress("backspace")}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-display text-xl py-4 rounded-xl active:scale-95 transition-all font-bold flex items-center justify-center"
                        >
                          ⌫
                        </button>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setIsEditingDirectly(false)}
                        className="font-mono text-[10px] text-vulcanico uppercase tracking-wider text-center underline hover:text-white"
                      >
                        Voltar para o Slider
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Slider */}
                      <div className="w-full px-2 mt-4">
                        <input 
                          type="range" 
                          min={minVal.toString()} 
                          max={maxVal.toString()} 
                          step={isWeight ? "0.5" : "1"}
                          value={modalTempValue || 0}
                          onChange={(e) => setModalTempValue(e.target.value)}
                          className="w-full h-2 bg-concrete/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-vulcanico [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                        />
                        <div className="flex justify-between text-concrete font-mono text-[10px] mt-2 px-1">
                          <span>{minVal}</span>
                          <span>{maxVal}</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className={isWeight ? "grid grid-cols-6 gap-2 mt-4" : "grid grid-cols-4 gap-3 mt-4"}>
                        {isWeight ? (
                          <>
                            <button onClick={() => handleQuickAction(-10)} className="bg-concrete/10 py-3 rounded-xl font-mono text-[10px] text-concrete hover:bg-concrete/20 hover:text-white active:scale-95 transition-all font-bold">-10</button>
                            <button onClick={() => handleQuickAction(-5)} className="bg-concrete/10 py-3 rounded-xl font-mono text-[10px] text-concrete hover:bg-concrete/20 hover:text-white active:scale-95 transition-all font-bold">-5</button>
                            <button onClick={() => handleQuickAction(-2.5)} className="bg-concrete/10 py-3 rounded-xl font-mono text-[10px] text-concrete hover:bg-concrete/20 hover:text-white active:scale-95 transition-all font-bold">-2.5</button>
                            <button onClick={() => handleQuickAction(2.5)} className="bg-concrete/10 py-3 rounded-xl font-mono text-[10px] text-concrete hover:bg-concrete/20 hover:text-white active:scale-95 transition-all font-bold">+2.5</button>
                            <button onClick={() => handleQuickAction(5)} className="bg-concrete/10 py-3 rounded-xl font-mono text-[10px] text-concrete hover:bg-concrete/20 hover:text-white active:scale-95 transition-all font-bold">+5</button>
                            <button onClick={() => handleQuickAction(10)} className="bg-vulcanico/20 text-vulcanico border border-vulcanico/30 py-3 rounded-xl font-mono text-[10px] hover:bg-vulcanico/30 hover:text-vulcanico active:scale-95 transition-all font-bold">+10</button>
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
                    </>
                  )}

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
                {restTimer.exerciseIndex && restTimer.totalExercises && (
                  <span className="font-mono text-[10px] text-concrete/80 uppercase tracking-wider mb-2 block">
                    Exercício {restTimer.exerciseIndex} de {restTimer.totalExercises}
                  </span>
                )}
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
                <div className="w-48 bg-concrete/20 h-1.5 rounded-full overflow-hidden mt-6 mb-8">
                  <div 
                    className="bg-vulcanico h-full transition-all duration-100 ease-out"
                    style={{ width: `${Math.min(100, (restRemainingMs / ((restTimer.duration || 1) * 1000)) * 100)}%` }}
                  />
                </div>

                {restTimer.nextExerciseName && (
                  <div className="w-full max-w-[280px] bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-sm shadow-xl animate-fade-in">
                    <span className="font-mono text-[9px] text-vulcanico uppercase tracking-widest font-bold mb-1.5 block">
                      Próximo Exercício
                    </span>
                    <h3 className="font-display text-base uppercase text-white font-semibold leading-tight">
                      {restTimer.nextExerciseName}
                    </h3>
                    {restTimer.nextExerciseLastWeight ? (
                      <span className="font-mono text-[10px] text-concrete uppercase tracking-wider mt-2 block">
                        Carga Sugerida: <strong className="text-vulcanico font-bold">{restTimer.nextExerciseLastWeight} kg</strong>
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] text-concrete/60 uppercase mt-1.5 block">
                        Sem carga anterior registrada
                      </span>
                    )}
                  </div>
                )}
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
          {(addingExerciseToActiveWorkout || replacingActiveExerciseId) && (
            <div className="absolute inset-0 z-50 bg-noturno/95 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display text-2xl uppercase">
                  {replacingActiveExerciseId ? "Substituir Exercício" : "Selecionar Exercício"}
                </h3>
                <button 
                  onClick={() => {
                    setAddingExerciseToActiveWorkout(false);
                    setReplacingActiveExerciseId(null);
                  }}
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
                            onClick={() => {
                              if (replacingActiveExerciseId) {
                                handleReplaceExerciseInActiveWorkout(replacingActiveExerciseId, ex.id);
                              } else {
                                handleAddExerciseToActiveWorkout(ex.id);
                              }
                            }}
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
    </>
  );
}
