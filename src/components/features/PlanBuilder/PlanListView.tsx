// @ts-nocheck
import React, { useState, useRef } from 'react';
import { Dumbbell, Plus, Trash2, Edit3, Cloud, CloudOff } from 'lucide-react';

export function PlanListView(props: any) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftVal, setScrollLeftVal] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const {
    setIsWorkoutMinimized, handleEditPlan,
    activeTab, editingPlan, plans, handleStartCreatePlan, renderSyncButton,
    handleStartWorkout, setEditingPlan, handleDeletePlan, activeWorkout,
    activePlan, activePlanWorkouts, activeWorkoutIndex, setActiveWorkoutIndex, activePlanId, setActivePlanId
  } = props;

  const activePlansList = (plans || []).filter((p: any) => !p.isDeleted);

  return (
    <>
        <div className="p-6 flex flex-col lg:flex-row gap-8 lg:gap-16 min-h-full max-w-[1920px] mx-auto w-full" data-component="PlanListView">
          
          {/* SIDEBAR DE PLANOS (Esquerda no Desktop) */}
          <div className="w-full lg:w-[350px] shrink-0 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h1 className="font-sans font-extrabold text-3xl lg:text-4xl uppercase text-white tracking-tight leading-none">Planos de Treino</h1>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleStartCreatePlan}
                  className="font-sans text-xs font-semibold text-vulcanico bg-vulcanico/10 border border-vulcanico/30 px-3 py-1.5 rounded-xl uppercase tracking-wider hover:bg-vulcanico hover:text-white transition-all shadow-sm"
                >
                  + Criar Plano
                </button>
                <div className="lg:hidden">{renderSyncButton()}</div>
              </div>
            </div>

            {/* TODOS OS PLANOS */}
            <div className="mt-2 lg:mt-0">
              <div className="flex justify-between items-center mb-4">
                <span className="font-sans text-xs font-semibold text-concrete tracking-wider uppercase">
                  Todos os Planos ({activePlansList.length})
                </span>
                <div className="hidden lg:block">{renderSyncButton()}</div>
              </div>
              <div className="flex flex-col gap-3">
                {activePlansList.map((p) => {
                  const isActive = p.id === activePlanId;
                  return (
                    <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isActive ? "bg-vulcanico/10 border-vulcanico/40 shadow-[0_4px_20px_rgba(255,65,3,0.15)]" : "bg-white/5 border-concrete/15 hover:border-concrete/30"}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-sans font-bold text-lg ${isActive ? "text-vulcanico" : "text-white"}`}>
                            {p.name}
                          </span>
                          {isActive && <span className="font-sans text-[10px] font-bold bg-vulcanico text-white px-2 py-0.5 rounded-md uppercase">Ativo</span>}
                        </div>
                        <span className="font-mono text-xs text-concrete block mt-1">
                          {p.workouts.length} treino(s)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {!isActive && (
                          <button
                            onClick={() => setActivePlanId(p.id)}
                            className="text-concrete hover:text-white font-mono text-[10px] uppercase transition-colors"
                          >
                            Ativar
                          </button>
                        )}
                        <button
                          onClick={() => handleEditPlan(p)}
                          className="text-concrete hover:text-white transition-colors"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(p.id)}
                          className="text-concrete hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ÁREA PRINCIPAL (Direita no Desktop) */}
          <div className="w-full flex-1 flex flex-col">
            {activePlan ? (
              <div className="flex flex-col gap-6 w-full">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-concrete/20 pb-6">
                  <div>
                    <span className="font-mono text-vulcanico text-[12px] tracking-widest block mb-2">PLANO ATIVO ATUAL</span>
                    <h2 className="font-display text-4xl lg:text-5xl text-white uppercase tracking-tight leading-none">{activePlan.name}</h2>
                  </div>
                </div>

                <div className="mt-4">
                  {/* Grid no Desktop, Carrossel no Mobile */}
                  <div 
                    ref={sliderRef}
                    onScroll={(e) => {
                      if (isDragging || window.innerWidth >= 1024) return;
                      const container = e.currentTarget;
                      const slideWidth = container.clientWidth * 0.9;
                      const index = slideWidth > 0 ? Math.round(container.scrollLeft / slideWidth) : 0;
                      setActiveWorkoutIndex(index);
                    }}
                    onMouseDown={(e) => {
                      if (window.innerWidth >= 1024) return;
                      const container = e.currentTarget;
                      setIsDragging(true);
                      setStartX(e.pageX - container.offsetLeft);
                      setScrollLeftVal(container.scrollLeft);
                    }}
                    onMouseMove={(e) => {
                      if (!isDragging || window.innerWidth >= 1024) return;
                      e.preventDefault();
                      const container = e.currentTarget;
                      const x = e.pageX - container.offsetLeft;
                      const walk = (x - startX) * 1.5;
                      container.scrollLeft = scrollLeftVal - walk;
                    }}
                    onMouseUp={(e) => {
                      if (!isDragging || window.innerWidth >= 1024) return;
                      setIsDragging(false);
                      const container = e.currentTarget;
                      const slideWidth = container.clientWidth * 0.9;
                      const index = slideWidth > 0 ? Math.round(container.scrollLeft / slideWidth) : 0;
                      container.scrollTo({
                        left: index * slideWidth,
                        behavior: 'smooth'
                      });
                      setActiveWorkoutIndex(index);
                    }}
                    onMouseLeave={(e) => {
                      if (!isDragging || window.innerWidth >= 1024) return;
                      setIsDragging(false);
                      const container = e.currentTarget;
                      const slideWidth = container.clientWidth * 0.9;
                      const index = slideWidth > 0 ? Math.round(container.scrollLeft / slideWidth) : 0;
                      container.scrollTo({
                        left: index * slideWidth,
                        behavior: 'smooth'
                      });
                      setActiveWorkoutIndex(index);
                    }}
                    className={`flex overflow-x-auto flex-nowrap scrollbar-none lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-6 lg:overflow-visible ${
                      isDragging ? "cursor-grabbing select-none" : "snap-x snap-mandatory cursor-grab lg:cursor-auto"
                    }`}
                  >
                    {activePlanWorkouts.length === 0 ? (
                      <div className="col-span-full py-12 border-2 border-dashed border-concrete/20 rounded-2xl flex flex-col items-center justify-center text-center">
                        <Dumbbell size={32} className="text-concrete/40 mb-4" />
                        <p className="font-mono text-sm text-concrete uppercase">Este plano não possui treinos cadastrados.</p>
                        <button onClick={() => handleEditPlan(activePlan)} className="mt-4 text-vulcanico font-mono text-xs uppercase underline">Adicionar Treinos</button>
                      </div>
                    ) : (
                      activePlanWorkouts.map((w, idx) => {
                        const isCurrentMobile = idx === activeWorkoutIndex;
                        return (
                          <div key={w.id} className="w-[90%] lg:w-full shrink-0 snap-center px-2 lg:px-0 flex flex-col group">
                            <div className={`w-full aspect-[4/3] lg:aspect-auto lg:h-64 border transition-colors p-6 flex flex-col justify-center rounded-2xl relative overflow-hidden ${isCurrentMobile ? "border-vulcanico/50 bg-vulcanico/5 lg:border-concrete/20 lg:bg-concrete/5 lg:hover:border-vulcanico/50 lg:hover:bg-vulcanico/5" : "border-concrete/20 bg-concrete/5 hover:border-vulcanico/50 hover:bg-vulcanico/5"}`}>
                              
                              <h3 className="font-display text-4xl text-white uppercase leading-none text-center relative z-10">{w.name}</h3>
                              
                              <div className="mt-6 flex flex-col gap-2 relative z-10 w-full px-4">
                                <button
                                  onClick={() => handleStartWorkout(w, activePlan.name)}
                                  className="w-full bg-vulcanico hover:bg-white text-noturno font-display text-base lg:text-lg uppercase py-3 rounded-xl tracking-wide font-bold transition-all duration-200 shadow-lg shadow-vulcanico/20 active:scale-98"
                                >
                                  Iniciar Treino
                                </button>
                              </div>

                              {/* Decorative bg element */}
                              <Dumbbell size={120} className="absolute -bottom-8 -right-8 text-white/5 -rotate-12 pointer-events-none" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dot Indicators for Mobile Only */}
                  {activePlanWorkouts.length > 1 && (
                    <div className="flex lg:hidden justify-center gap-1.5 mt-6">
                      {activePlanWorkouts.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`h-1.5 transition-all duration-300 rounded-full ${
                            idx === activeWorkoutIndex ? "w-4 bg-vulcanico" : "w-1.5 bg-concrete/40"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Start Workout Button for Mobile Only */}
                  {activePlanWorkouts.length > 0 && (
                    <div className="lg:hidden mt-6 px-2">
                      <button
                        onClick={() => {
                          const currentWorkout = activePlanWorkouts[activeWorkoutIndex];
                          if (currentWorkout) {
                            handleStartWorkout(currentWorkout, activePlan.name);
                            setIsWorkoutMinimized(false);
                          }
                        }}
                        className={`font-display text-lg uppercase py-4 transition-colors w-full text-center tracking-wider rounded-2xl bg-vulcanico text-noturno`}
                      >
                        Iniciar Treino
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-concrete/20 rounded-3xl mx-4 lg:mx-0">
                <Dumbbell size={48} className="text-concrete/30 mb-6" />
                <span className="font-mono text-concrete text-sm uppercase mb-6 tracking-widest">Nenhum plano ativo</span>
                <button 
                  onClick={handleStartCreatePlan}
                  className="bg-vulcanico hover:bg-white text-noturno font-display text-xl uppercase py-4 px-8 rounded-xl tracking-wide transition-colors shadow-xl shadow-vulcanico/20"
                >
                  Criar Primeiro Plano
                </button>
              </div>
            )}
          </div>

        </div>
    </>
  );
}
