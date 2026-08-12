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
    <nav className="hidden lg:flex w-24 glass-panel flex-col items-center py-8 z-40">
      {/* Brand Logo */}
      <div 
        className="w-12 h-12 bg-vulcanico/10 rounded-2xl border border-vulcanico/40 text-vulcanico flex items-center justify-center font-sans font-extrabold text-xl tracking-tight mb-10 shadow-[0_0_20px_rgba(255,65,3,0.2)] transition-all hover:scale-105 cursor-default select-none"
        aria-label="Zenlift Brand Logo"
      >
        Z
      </div>
      
      {/* Nav Items */}
      <div className="flex flex-col gap-6 flex-1 w-full px-2" role="tablist">
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
              className={`flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl transition-all duration-200 w-full group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vulcanico ${
                isActive 
                  ? "bg-vulcanico/15 text-white border border-vulcanico/30 shadow-[0_4px_20px_rgba(255,65,3,0.15)]" 
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
              <span className={`font-sans text-xs font-semibold tracking-wide ${
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
          aria-label="Configurações"
          className="text-concrete hover:text-white transition-colors p-3 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vulcanico" 
          title="Configurações"
        >
          <Settings size={20} />
        </button>
        <button 
          aria-label="Sair"
          className="text-concrete hover:text-red-400 transition-colors p-3 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" 
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}
