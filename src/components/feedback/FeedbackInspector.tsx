"use client";

import { useEffect, useState, useRef } from "react";
import { TargetElementInfo } from "../../types/feedback";
import { inspectElementSurgically } from "../../lib/reactSourceInspector";
import { X, Target, MousePointer, Code2, Sparkles } from "lucide-react";

interface FeedbackInspectorProps {
  isActive: boolean;
  onCancel: () => void;
  onSelectElement: (elementInfo: TargetElementInfo) => void;
}

interface HoveredInfo {
  top: number;
  left: number;
  width: number;
  height: number;
  badgeLabel: string;
  subLabel?: string;
  isComponent: boolean;
}

export function FeedbackInspector({ isActive, onCancel, onSelectElement }: FeedbackInspectorProps) {
  const [hoveredInfo, setHoveredInfo] = useState<HoveredInfo | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Manipulação de eventos no modo de inspeção
  useEffect(() => {
    if (!isActive) {
      setHoveredInfo(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      // Ignora elementos dentro do container de feedback de dev
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!target || target.closest('[data-dev-feedback-ui="true"]')) {
        setHoveredInfo(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      const inspected = inspectElementSurgically(target, e.clientX, e.clientY);

      // Constrói badge inteligente
      let badgeLabel = `<${target.tagName.toLowerCase()}>`;
      let subLabel = inspected.textSnippet !== "(Elemento sem texto visível)" ? inspected.textSnippet : undefined;
      let isComponent = false;

      if (inspected.codeLocation?.componentName) {
        badgeLabel = `<${inspected.codeLocation.componentName} />`;
        isComponent = true;
        if (inspected.codeLocation.fileName) {
          const shortFile = inspected.codeLocation.fileName.split("/").pop();
          subLabel = `${shortFile}${inspected.codeLocation.lineNumber ? `:${inspected.codeLocation.lineNumber}` : ""}`;
        }
      } else if (inspected.iconName) {
        badgeLabel = inspected.iconName;
      }

      setHoveredInfo({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        badgeLabel,
        subLabel,
        isComponent,
      });
    };

    const handleClick = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!target || target.closest('[data-dev-feedback-ui="true"]')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const elementInfo = inspectElementSurgically(target, e.clientX, e.clientY);
      onSelectElement(elementInfo);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
      if (!target || target.closest('[data-dev-feedback-ui="true"]')) return;

      const rect = target.getBoundingClientRect();
      const inspected = inspectElementSurgically(target, touch.clientX, touch.clientY);

      let badgeLabel = `<${target.tagName.toLowerCase()}>`;
      if (inspected.codeLocation?.componentName) {
        badgeLabel = `<${inspected.codeLocation.componentName} />`;
      } else if (inspected.iconName) {
        badgeLabel = inspected.iconName;
      }

      setHoveredInfo({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        badgeLabel,
        subLabel: inspected.textSnippet,
        isComponent: !!inspected.codeLocation?.componentName,
      });

      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        const elementInfo = inspectElementSurgically(target, touch.clientX, touch.clientY);
        onSelectElement(elementInfo);
      }, 450);
    };

    const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isActive, onCancel, onSelectElement]);

  if (!isActive) return null;

  return (
    <div
      data-dev-feedback-ui="true"
      className="fixed inset-0 z-[99999] pointer-events-none select-none"
    >
      {/* Banner superior com instruções */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 px-4 py-2.5 bg-noturno/95 backdrop-blur-xl border border-vulcanico/50 rounded-full shadow-2xl shadow-vulcanico/25 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="w-2.5 h-2.5 rounded-full bg-vulcanico animate-ping" />
        <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-white">
          <Target className="w-4 h-4 text-vulcanico" />
          <span>Modo Cirúrgico Dev: Clique em qualquer ícone, título, card ou botão</span>
        </div>
        <button
          onClick={onCancel}
          className="ml-2 px-2.5 py-1 text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-concrete hover:text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>ESC</span>
        </button>
      </div>

      {/* Caixa de destaque sobre o elemento com hover */}
      {hoveredInfo && (
        <div
          style={{
            top: `${hoveredInfo.top}px`,
            left: `${hoveredInfo.left}px`,
            width: `${hoveredInfo.width}px`,
            height: `${hoveredInfo.height}px`,
          }}
          className="fixed transition-all duration-75 pointer-events-none rounded-lg border-2 border-vulcanico bg-vulcanico/15 shadow-[0_0_24px_rgba(255,65,3,0.4)] ring-4 ring-vulcanico/25"
        >
          {/* Badge superior com nome do componente/código */}
          <div className="absolute -top-8 left-0 flex items-center gap-1.5 px-2.5 py-1 bg-noturno/95 border border-vulcanico text-white font-mono font-bold text-[11px] rounded-lg shadow-xl uppercase tracking-wider backdrop-blur-md whitespace-nowrap z-50">
            {hoveredInfo.isComponent ? (
              <Code2 className="w-3 h-3 text-cyan-400" />
            ) : (
              <MousePointer className="w-3 h-3 text-vulcanico" />
            )}
            <span className={hoveredInfo.isComponent ? "text-cyan-300 font-extrabold" : "text-white"}>
              {hoveredInfo.badgeLabel}
            </span>
            {hoveredInfo.subLabel && (
              <span className="text-[10px] text-concrete font-normal max-w-[180px] truncate border-l border-white/20 pl-1.5 ml-0.5 lowercase">
                {hoveredInfo.subLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
