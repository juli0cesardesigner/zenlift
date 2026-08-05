import React from 'react';
import { Dumbbell, Plus, BarChart3, Settings, LogOut } from 'lucide-react';
import { triggerHapticFeedback } from '../../lib/utils';

interface DesktopNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export function DesktopNav({ activeTab, setActiveTab }: DesktopNavProps) {
  const navItems = [
    { id: 'plans', label: 'Planos', icon: Dumbbell },
    { id: 'exercises', label: 'Biblioteca', icon: Plus },
    { id: 'history', label: 'Estatísticas', icon: BarChart3 },
  ];

  return (
    <nav className="hidden lg:flex w-24 bg-noturno/95 border-r border-concrete/15 flex-col items-center py-8 z-40 shadow-2xl backdrop-blur-xl">
      {/* Brand Logo */}
      <div className="w-12 h-12 bg-vulcanico/10 rounded-2xl border border-vulcanico/50 text-vulcanico flex items-center justify-center font-sans font-extrabold text-xl tracking-tight mb-10 shadow-[0_0_20px_rgba(255,65,3,0.25)] transition-all hover:scale-105 cursor-default select-none">
        Z
      </div>
      
      {/* Nav Items */}
      <div className="flex flex-col gap-6 flex-1 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => {
                triggerHapticFeedback('light');
                setActiveTab(item.id);
              }}
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
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-4 mt-auto">
        <button 
          className="text-concrete hover:text-white transition-colors p-3 hover:bg-white/5 rounded-xl border border-transparent hover:border-concrete/10" 
          title="Configurações"
        >
          <Settings size={20} />
        </button>
        <button 
          className="text-concrete hover:text-red-400 transition-colors p-3 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20" 
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}
