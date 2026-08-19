import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AthleteInputDropdownProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  accentColor?: "vulcanico" | "cyan";
}

export const AthleteInputDropdown: React.FC<AthleteInputDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Nome do atleta",
  accentColor = "vulcanico",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent | MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const isCyan = accentColor === "cyan";
  const focusBorder = isCyan ? "focus-within:border-cyan-400" : "focus-within:border-vulcanico";
  const labelColor = isCyan ? "text-cyan-400" : "text-vulcanico";
  const chipActive = isCyan
    ? "bg-cyan-500/25 text-cyan-300 border-cyan-500 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]"
    : "bg-vulcanico/25 text-vulcanico border-vulcanico font-bold shadow-[0_0_8px_rgba(255,65,3,0.3)]";

  // Filter out default labels and current value duplicates
  const uniqueOptions = Array.from(
    new Set(options.map((o) => o.trim()).filter((o) => Boolean(o) && o !== "Atleta 1" && o !== "Atleta 2"))
  );

  return (
    <div className="relative flex flex-col gap-1.5 w-full" ref={containerRef}>
      <div className="flex justify-between items-center px-0.5">
        <label className={`font-mono text-[10px] uppercase font-bold tracking-wider ${labelColor}`}>
          {label}
        </label>
        {uniqueOptions.length > 0 && (
          <span className="font-mono text-[8px] text-concrete/70 uppercase">
            {uniqueOptions.length} atleta(s) salvo(s)
          </span>
        )}
      </div>

      <div
        className={`relative flex items-center bg-noturno border border-concrete/30 rounded-xl transition-all ${focusBorder}`}
      >
        <div className="pl-3 text-concrete/60 flex items-center justify-center">
          <User size={14} className={isCyan ? "text-cyan-400/80" : "text-vulcanico/80"} />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (uniqueOptions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-2 font-mono text-sm text-white focus:outline-none placeholder:text-concrete/40"
        />
        {uniqueOptions.length > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-2.5 text-concrete hover:text-white transition-colors active:scale-95"
            title="Abrir lista de atletas"
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${
                isOpen ? "rotate-180 text-white" : ""
              }`}
            />
          </button>
        )}
      </div>

      {/* Floating Dropdown */}
      <AnimatePresence>
        {isOpen && uniqueOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-[calc(100%+4px)] left-0 right-0 z-[100] bg-noturno border border-concrete/30 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-xl"
          >
            <div className="px-3 py-2 bg-white/5 border-b border-concrete/10 flex justify-between items-center">
              <span className="font-mono text-[9px] uppercase tracking-widest text-concrete font-bold">
                Selecionar Atleta
              </span>
              <span className="font-mono text-[8px] text-concrete/60">Toque para preencher</span>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-white/5">
              {uniqueOptions.map((name) => {
                const isSelected = value.trim().toLowerCase() === name.toLowerCase();
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onChange(name);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 font-mono text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-white/10 text-white font-bold"
                        : "text-concrete hover:text-white hover:bg-white/5 active:bg-white/10"
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    {isSelected && (
                      <Check size={14} className={isCyan ? "text-cyan-400" : "text-vulcanico"} />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Chips for One-Tap Selection */}
      {uniqueOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {uniqueOptions.slice(0, 5).map((name) => {
            const isSelected = value.trim().toLowerCase() === name.toLowerCase();
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onChange(name);
                  setIsOpen(false);
                }}
                className={`font-mono text-[9px] px-2 py-0.5 rounded-md border transition-all ${
                  isSelected
                    ? chipActive
                    : "bg-white/5 border-concrete/15 text-concrete hover:text-white hover:bg-white/10 active:scale-95"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
