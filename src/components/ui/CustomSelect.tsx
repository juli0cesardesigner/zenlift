import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface CustomSelectOption {
  label: string;
  value: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  allowCustom?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  allowCustom = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent | MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (isCustomMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCustomMode]);

  const selectedOption = options.find((o) => o.value.toLowerCase() === (value || "").toLowerCase());
  const displayLabel = selectedOption ? selectedOption.label : (value || "");

  if (isCustomMode) {
    return (
      <div className="relative w-full flex items-center gap-2" ref={containerRef}>
        <input
          ref={inputRef}
          type="text"
          value={customInputValue}
          onChange={(e) => {
            setCustomInputValue(e.target.value);
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              setIsCustomMode(false);
            }
          }}
          placeholder="Digite o valor personalizado..."
          className="w-full bg-transparent border-b border-vulcanico py-2 font-display text-lg text-white focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={() => setIsCustomMode(false)}
          className="text-xs font-mono uppercase bg-concrete/20 text-white px-2 py-1 rounded hover:bg-concrete/40 transition-colors shrink-0"
        >
          Opções
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={containerRef} data-component="CustomSelect">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full bg-transparent border-b border-concrete/30 py-2 font-display text-lg text-white text-left focus:outline-none focus:border-vulcanico transition-colors flex justify-between items-center active:opacity-80"
      >
        <span className={!displayLabel ? "text-concrete" : "text-white"}>
          {displayLabel || placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`text-concrete transition-transform duration-200 ${
            isOpen ? "rotate-180 text-vulcanico" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-[99] mt-1 bg-noturno border border-concrete/20 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.9)] overflow-hidden backdrop-blur-md"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-white/5">
              {options.map((opt) => {
                const isSelected = (value || "").toLowerCase() === opt.value.toLowerCase();
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 font-display text-base transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-vulcanico/20 text-vulcanico font-bold"
                        : "text-white hover:bg-white/5 active:bg-white/10"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={16} className="text-vulcanico" />}
                  </button>
                );
              })}

              {allowCustom && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomInputValue(value || "");
                    setIsCustomMode(true);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 font-mono text-xs uppercase text-vulcanico hover:bg-vulcanico/10 active:bg-vulcanico/20 transition-colors flex items-center gap-2 font-bold"
                >
                  <Plus size={14} />
                  <span>Outro (Personalizado)...</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
