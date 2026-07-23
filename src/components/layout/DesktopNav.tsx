// @ts-nocheck
import React from 'react';
import { Dumbbell, Plus, History, Settings, LogOut } from 'lucide-react';

interface DesktopNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export function DesktopNav({ activeTab, setActiveTab }: DesktopNavProps) {
  return (
    <nav className="hidden lg:flex w-24 bg-noturno border-r border-concrete/10 flex-col items-center py-8 z-40 shadow-[10px_0_20px_rgba(0,0,0,0.5)]">
      {/* Logo Placeholder */}
      <div className="w-12 h-12 bg-vulcanico/10 rounded-xl border-2 border-vulcanico text-vulcanico flex items-center justify-center font-display text-2xl tracking-widest mb-12 shadow-[0_0_15px_rgba(255,65,3,0.3)] cursor-default">
        Z
      </div>
      
      <div className="flex flex-col gap-8 flex-1">
        <button 
          onClick={() => setActiveTab("plans")}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all w-20 group ${activeTab === "plans" ? "bg-vulcanico/10 text-vulcanico shadow-[0_0_10px_rgba(255,65,3,0.2)]" : "text-concrete hover:text-white hover:bg-white/5"}`}
        >
          <Dumbbell size={28} className={activeTab === "plans" ? "animate-pulse" : "group-hover:scale-110 transition-transform"} />
          <span className="font-mono text-[9px] uppercase tracking-widest">Planos</span>
        </button>

        <button 
          onClick={() => setActiveTab("exercises")}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all w-20 group ${activeTab === "exercises" ? "bg-vulcanico/10 text-vulcanico shadow-[0_0_10px_rgba(255,65,3,0.2)]" : "text-concrete hover:text-white hover:bg-white/5"}`}
        >
          <Plus size={28} className={activeTab === "exercises" ? "animate-pulse" : "group-hover:scale-110 transition-transform"} />
          <span className="font-mono text-[9px] uppercase tracking-widest">Biblioteca</span>
        </button>

        <button 
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all w-20 group ${activeTab === "history" ? "bg-vulcanico/10 text-vulcanico shadow-[0_0_10px_rgba(255,65,3,0.2)]" : "text-concrete hover:text-white hover:bg-white/5"}`}
        >
          <History size={28} className={activeTab === "history" ? "animate-pulse" : "group-hover:scale-110 transition-transform"} />
          <span className="font-mono text-[9px] uppercase tracking-widest">Command</span>
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-6 mt-auto">
        <button className="text-concrete hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg" title="Configurações">
          <Settings size={20} />
        </button>
        <button className="text-concrete hover:text-red-500 transition-colors p-2 hover:bg-red-500/10 rounded-lg" title="Sair">
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}
