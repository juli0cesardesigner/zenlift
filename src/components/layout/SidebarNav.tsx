import React from 'react';
import { Dumbbell, Plus, BarChart3, Activity } from 'lucide-react';

export function SidebarNav(props: any) {
  const { activeTab, setActiveTab } = props;

  const navItems = [
    { id: 'plans', label: 'Planos', icon: Dumbbell },
    { id: 'exercises', label: 'Exercícios', icon: Plus },
    { id: 'history', label: 'Estatísticas', icon: BarChart3 },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-24 h-full bg-noturno/95 border-r border-concrete/15 items-center py-8 z-30 shadow-2xl backdrop-blur-xl">
      <div className="mb-10 flex flex-col items-center gap-1.5 text-vulcanico">
        <Activity size={30} className="animate-pulse" />
        <span className="font-sans font-bold text-xs tracking-wider uppercase text-white">Zenlift</span>
      </div>

      <nav className="flex flex-col gap-6 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl transition-all duration-200 w-full group relative ${
                isActive 
                  ? "bg-vulcanico/15 text-white border border-vulcanico/30 shadow-[0_4px_20px_rgba(255,65,3,0.2)]" 
                  : "text-concrete hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-vulcanico rounded-r-full shadow-[0_0_8px_#FF4103]" />
              )}
              <Icon 
                size={22} 
                className={`transition-transform duration-200 ${
                  isActive ? "text-vulcanico scale-110" : "group-hover:scale-110 group-hover:text-white"
                }`} 
              />
              <span className={`font-sans text-[11px] font-semibold tracking-wide ${
                isActive ? "text-white" : "text-concrete group-hover:text-white"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
