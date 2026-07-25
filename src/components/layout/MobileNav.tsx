import React from 'react';
import { Dumbbell, Plus, BarChart3 } from 'lucide-react';

export function MobileNav(props: any) {
  const { activeWorkout, isWorkoutMinimized, activeTab, setActiveTab } = props;

  if (activeWorkout && !isWorkoutMinimized) return null;

  const navItems = [
    { id: 'plans', label: 'Planos', icon: Dumbbell },
    { id: 'exercises', label: 'Exercícios', icon: Plus },
    { id: 'history', label: 'Estatísticas', icon: BarChart3 },
  ];

  return (
    <nav className="flex-none w-full h-20 bg-noturno/95 border-t border-concrete/15 flex lg:hidden justify-around items-center px-4 z-30 backdrop-blur-xl pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center gap-1.5 py-2 px-5 rounded-2xl transition-all duration-200 ${
              isActive 
                ? "bg-vulcanico/15 text-white shadow-[0_2px_12px_rgba(255,65,3,0.15)] border border-vulcanico/25" 
                : "text-concrete active:bg-white/5 border border-transparent"
            }`}
          >
            <Icon 
              size={22} 
              className={`transition-transform duration-200 ${
                isActive ? "text-vulcanico scale-110" : "text-concrete"
              }`} 
            />
            <span className={`font-sans text-[11px] font-semibold tracking-wide ${
              isActive ? "text-white" : "text-concrete"
            }`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
