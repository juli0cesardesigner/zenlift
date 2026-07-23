import React from 'react';
import { Dumbbell, Plus, History } from 'lucide-react';

export function MobileNav(props: any) {
  const { activeWorkout, isWorkoutMinimized, activeTab, setActiveTab } = props;

  if (activeWorkout && !isWorkoutMinimized) return null;

  return (
    <nav className="flex-none w-full h-20 bg-noturno border-t border-concrete/10 flex lg:hidden justify-around items-center px-4 z-30">
      <button 
        onClick={() => setActiveTab("plans")}
        className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === "plans" ? "text-vulcanico" : "text-concrete"}`}
      >
        <Dumbbell size={24} />
        <span className="font-mono text-[10px] uppercase">Planos</span>
      </button>

      <button 
        onClick={() => setActiveTab("exercises")}
        className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === "exercises" ? "text-vulcanico" : "text-concrete"}`}
      >
        <Plus size={24} />
        <span className="font-mono text-[10px] uppercase">Exercícios</span>
      </button>

      <button 
        onClick={() => setActiveTab("history")}
        className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === "history" ? "text-vulcanico" : "text-concrete"}`}
      >
        <History size={24} />
        <span className="font-mono text-[10px] uppercase">Estatísticas</span>
      </button>
    </nav>
  );
}
