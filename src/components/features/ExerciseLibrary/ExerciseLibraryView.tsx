import React, { useState } from 'react';
import { Dumbbell, FileText, ChevronDown, Play, Trash2, Search } from 'lucide-react';
import { EXERCISE_VIEW_MODE_LABEL_MAP, muscleColors } from '../../../lib/constants';
import { semanticExerciseSearch } from '../../../lib/muscleRank';
import { ExerciseDef } from '../../../types';

export function ExerciseLibraryView(props: any) {
  const {
    activeTab, exercises, exerciseViewMode, setExerciseViewMode, renderSyncButton, setIsImportModalOpen, handleAddExercise, newExerciseName, setNewExerciseName, setIsMuscleDropdownOpen, isMuscleDropdownOpen, newExerciseMuscle, setNewExerciseMuscle, exercisesByMuscle, setEditingExercise, handleDeleteExercise, sortedExercisesFlat,
  } = props;

  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = searchQuery.trim() ? semanticExerciseSearch(searchQuery, exercises) : null;

  return (
    <>
        
          <div className="p-6 flex flex-col min-h-full">
            <div className="flex justify-between items-center mb-8">
              <h1 className="font-sans font-extrabold text-3xl sm:text-4xl uppercase text-white tracking-tight leading-none">Biblioteca de Exercícios</h1>
              <div className="flex flex-col items-end gap-3">
                {renderSyncButton()}
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-2 font-sans text-xs font-semibold uppercase bg-white/5 border border-concrete/20 px-3 py-2 rounded-xl text-white hover:bg-white/10 transition-all shadow-sm"
                >
                  <FileText size={14} className="text-vulcanico" /> Importar (Planilha)
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleAddExercise} className="flex flex-col gap-4 mb-10">
              <h2 className="font-mono text-vulcanico uppercase text-xs font-bold tracking-widest">Novo Exercício Base</h2>
              
              <div className="flex flex-col gap-1">
                <input 
                  type="text" 
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="NOME DO EXERCÍCIO (EX: REMADA CAVALINHO)"
                  className="w-full bg-transparent border-b border-concrete/30 py-2 font-display text-lg text-white focus:outline-none focus:border-vulcanico transition-colors"
                />
              </div>

              <div className="flex items-center justify-between gap-4 mt-2 relative">
                <div className="flex-1 relative">
                  <button
                    type="button"
                    onClick={() => setIsMuscleDropdownOpen(!isMuscleDropdownOpen)}
                    className="w-full bg-noturno border border-concrete/30 text-white font-mono text-xs uppercase px-3 py-2 flex justify-between items-center focus:outline-none focus:border-vulcanico text-left rounded-lg"
                  >
                    <span>{newExerciseMuscle}</span>
                    <ChevronDown size={14} className="text-concrete" />
                  </button>
                  {isMuscleDropdownOpen && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 bg-noturno border border-concrete/30 z-20 flex flex-col max-h-48 overflow-y-auto rounded-lg">
                      {["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core", "Cardio", "Outros"].map((muscle) => (
                        <button
                          key={muscle}
                          type="button"
                          onClick={() => {
                            setNewExerciseMuscle(muscle);
                            setIsMuscleDropdownOpen(false);
                          }}
                          className="w-full text-left font-mono text-xs uppercase px-3 py-2 text-white hover:bg-vulcanico hover:text-noturno transition-colors"
                        >
                          {muscle}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={!newExerciseName.trim()}
                  className="bg-vulcanico hover:bg-white text-noturno font-display text-sm uppercase px-4 py-2 disabled:opacity-30 transition-colors rounded-lg font-bold"
                >
                  Adicionar
                </button>
              </div>
            </form>

            {/* Semantic Search Bar (Page & Brin Requirement) */}
            <div className="relative mb-6">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-concrete" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busca Semântica por exercício, músculo ou equipamento (ex: peito barra)..."
                className="w-full bg-white/5 border border-concrete/20 rounded-xl pl-10 pr-4 py-2.5 font-sans text-xs text-white placeholder:text-concrete/60 focus:outline-none focus:border-vulcanico transition-all"
              />
            </div>

            {/* View Mode Toggle */}
            {!searchResults && (
              <div className="flex gap-2 mb-6 max-w-xs">
                {(["muscle", "alphabetical"] as const).map((mode) => {
                  const labelMap = { muscle: "Por Músculo", alphabetical: "Ordem A-Z" };
                  const isActive = exerciseViewMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setExerciseViewMode(mode)}
                      className={`flex-1 py-1.5 font-mono text-[10px] uppercase rounded-lg border transition-colors ${
                        isActive 
                          ? "bg-vulcanico border-vulcanico text-noturno font-bold" 
                          : "border-concrete/30 text-concrete hover:border-white hover:text-white"
                      }`}
                    >
                      {labelMap[mode]}
                    </button>
                  );
                })}
              </div>
            )}

            {/* List of exercises */}
            <div className="flex flex-col gap-8 pb-10">
              {searchResults ? (
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] text-vulcanico uppercase tracking-widest mb-1">
                    {searchResults.length} {searchResults.length === 1 ? "resultado encontrado" : "resultados encontrados"} (Busca Semântica)
                  </span>
                  {searchResults.map(ex => (
                    <div key={ex.id} className="flex justify-between items-center py-2 group cursor-pointer hover:bg-concrete/5 px-2 -mx-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 flex-1" onClick={() => setEditingExercise(ex)}>
                        {ex.thumbnailUrl ? (
                          <img src={ex.thumbnailUrl} alt={ex.name} className="w-10 h-10 object-cover rounded-md" />
                        ) : (
                          <div className="w-10 h-10 bg-concrete/10 rounded-md flex items-center justify-center">
                            <Dumbbell size={16} className="text-concrete" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-display text-xl uppercase text-white group-hover:text-vulcanico transition-colors flex items-center gap-2">
                            {ex.name}
                          </span>
                          <span className="font-mono text-[9px] text-concrete uppercase tracking-wider">
                            {ex.muscle} {ex.equipment ? `• ${ex.equipment}` : ""}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteExercise(ex.id)}
                        className="text-concrete hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : exercises.length === 0 ? (
                <p className="font-mono text-xs text-concrete uppercase">Nenhum exercício na biblioteca.</p>
              ) : exerciseViewMode === "muscle" ? (
                Object.entries(exercisesByMuscle).map(([muscle, list]) => (
                  <div key={muscle} className="flex flex-col">
                    <span className="font-mono text-concrete text-[10px] tracking-widest uppercase border-b border-concrete/10 pb-1 mb-3">
                      {muscle}
                    </span>
                    <div className="flex flex-col gap-2">
                      {(list as ExerciseDef[]).map((ex: ExerciseDef) => (
                        <div key={ex.id} className="flex justify-between items-center py-2 group cursor-pointer hover:bg-concrete/5 px-2 -mx-2 rounded-lg transition-colors">
                          <div className="flex items-center gap-3 flex-1" onClick={() => setEditingExercise(ex)}>
                            {ex.thumbnailUrl ? (
                              <img src={ex.thumbnailUrl} alt={ex.name} className="w-10 h-10 object-cover rounded-md" />
                            ) : (
                              <div className="w-10 h-10 bg-concrete/10 rounded-md flex items-center justify-center">
                                <Dumbbell size={16} className="text-concrete" />
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-display text-xl uppercase text-white group-hover:text-vulcanico transition-colors flex items-center gap-2">
                                {ex.name}
                                {ex.isRepsOnly && (
                                  <span className="text-[8px] font-mono bg-vulcanico/20 text-vulcanico px-1 rounded font-bold uppercase">Calistenia</span>
                                )}
                              </span>
                              {ex.videoUrl && (
                                <span className="font-mono text-[9px] text-vulcanico uppercase tracking-widest flex items-center gap-1">
                                  <Play size={8} fill="currentColor" /> Tem Vídeo
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteExercise(ex.id)}
                            className="text-concrete hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col gap-2">
                  {(sortedExercisesFlat as ExerciseDef[]).map((ex: ExerciseDef) => (
                    <div key={ex.id} className="flex justify-between items-center py-2 group cursor-pointer hover:bg-concrete/5 px-2 -mx-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 flex-1" onClick={() => setEditingExercise(ex)}>
                        {ex.thumbnailUrl ? (
                          <img src={ex.thumbnailUrl} alt={ex.name} className="w-10 h-10 object-cover rounded-md" />
                        ) : (
                          <div className="w-10 h-10 bg-concrete/10 rounded-md flex items-center justify-center">
                            <Dumbbell size={16} className="text-concrete" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-display text-xl uppercase text-white group-hover:text-vulcanico transition-colors flex items-center gap-2">
                            {ex.name}
                            {ex.isRepsOnly && (
                              <span className="text-[8px] font-mono bg-vulcanico/20 text-vulcanico px-1 rounded font-bold uppercase">Calistenia</span>
                            )}
                          </span>
                          <span className="font-mono text-[9px] text-concrete uppercase tracking-wider">
                            {ex.muscle} {ex.videoUrl && "• Tem Vídeo"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteExercise(ex.id)}
                        className="text-concrete hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
    </>
  );
}
