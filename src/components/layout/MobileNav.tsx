import React from 'react';
import { Dumbbell, Plus, BarChart3 } from 'lucide-react';
import { triggerHapticFeedback } from '../../lib/utils';

export function MobileNav(props: any) {
  const { activeWorkout, isWorkoutMinimized, activeTab, setActiveTab } = props;

  if (activeWorkout && !isWorkoutMinimized) return null;

  const navItems = [
    { id: 'plans', label: 'Planos', icon: Dumbbell },
    { id: 'exercises', label: 'Exercícios', icon: Plus },
    { id: 'history', label: 'Estatísticas', icon: BarChart3 },
  ];

  return (
    <nav className="flex-none w-full h-20 glass-panel border-t border-white/15 flex lg:hidden justify-around items-center px-4 z-30 pb-safe" role="tablist">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button 
            key={item.id}
            role="tab"
            aria-selected={isActive}
            aria-label={item.label}
            onClick={() => {
              triggerHapticFeedback('light');
              setActiveTab(item.id);
            }}
            className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-6 rounded-2xl transition-all duration-200 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vulcanico ${
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
            <span className={`font-sans text-xs font-semibold tracking-wide ${
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
