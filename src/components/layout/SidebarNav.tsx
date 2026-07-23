import React from 'react';
import { Dumbbell, Plus, History, Activity } from 'lucide-react';

export function SidebarNav(props: any) {
  const { activeTab, setActiveTab } = props;

  return (
    <aside className="hidden lg:flex flex-col w-24 h-full bg-noturno border-r border-concrete/10 items-center py-8 z-30 shadow-2xl">
      <div className="mb-12 flex flex-col items-center gap-2 text-vulcanico">
        <Activity size={32} />
        <span className="font-display uppercase font-black text-xs tracking-widest text-white">Zenlift</span>
      </div>

      <nav className="flex flex-col gap-8 w-full">
        <button 
          onClick={() => setActiveTab("plans")}
          className={`flex flex-col items-center gap-2 p-2 transition-colors ${activeTab === "plans" ? "text-vulcanico" : "text-concrete hover:text-white"}`}
        >
          <Dumbbell size={28} />
          <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Planos</span>
        </button>

        <button 
          onClick={() => setActiveTab("exercises")}
          className={`flex flex-col items-center gap-2 p-2 transition-colors ${activeTab === "exercises" ? "text-vulcanico" : "text-concrete hover:text-white"}`}
        >
          <Plus size={28} />
          <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Exercícios</span>
        </button>

        <button 
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-2 p-2 transition-colors ${activeTab === "history" ? "text-vulcanico" : "text-concrete hover:text-white"}`}
        >
          <History size={28} />
          <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Estatísticas</span>
        </button>
      </nav>
    </aside>
  );
}
