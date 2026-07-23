import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const CustomSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: {label: string, value: string}[], placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-noturno border-b border-concrete/30 py-2 font-display text-lg text-white text-left focus:outline-none focus:border-vulcanico transition-colors flex justify-between items-center"
      >
        <span className={!selectedOption ? "text-concrete" : ""}>{selectedOption ? selectedOption.label : (placeholder || "Selecione...")}</span>
        <ChevronDown size={18} className={`text-concrete transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[60] w-full mt-1 bg-noturno border border-concrete/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-3 font-display text-base transition-colors flex items-center justify-between
                    ${value === opt.value ? 'bg-vulcanico/20 text-vulcanico' : 'text-white hover:bg-concrete/10'}
                  `}
                >
                  {opt.label}
                  {value === opt.value && <Check size={16} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
