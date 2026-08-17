"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { TargetElementInfo } from "../../types/feedback";
import { X, Target, MousePointer } from "lucide-react";

interface FeedbackInspectorProps {
  isActive: boolean;
  onCancel: () => void;
  onSelectElement: (elementInfo: TargetElementInfo) => void;
}

interface HoveredBox {
  top: number;
  left: number;
  width: number;
  height: number;
  tagName: string;
  textSnippet: string;
}

export function FeedbackInspector({ isActive, onCancel, onSelectElement }: FeedbackInspectorProps) {
  const [hoveredBox, setHoveredBox] = useState<HoveredBox | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Extrai informações ricas do elemento do DOM
  const extractElementInfo = useCallback((element: HTMLElement, clientX: number, clientY: number): TargetElementInfo => {
    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    // Calcula porcentagem na tela (0 a 100%)
    const screenW = window.innerWidth || 1;
    const screenH = window.innerHeight || 1;
    const xPercentage = Math.min(100, Math.max(0, (clientX / screenW) * 100));
    const yPercentage = Math.min(100, Math.max(0, (clientY / screenH) * 100));

    // Snippet do texto
    const rawText = element.innerText || element.textContent || "";
    const textSnippet = rawText.replace(/\s+/g, " ").trim().slice(0, 80);

    // Seletor básico
    let selector = element.tagName.toLowerCase();
    if (element.id) {
      selector += `#${element.id}`;
    } else if (element.className && typeof element.className === 'string') {
      const firstClass = element.className.split(' ').filter(c => c && !c.includes(':'))[0];
      if (firstClass) selector += `.${firstClass}`;
    }

    return {
      selector,
      tagName: element.tagName,
      textSnippet,
      xPercentage,
      yPercentage,
      scrollX,
      scrollY,
      boundingRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    };
  }, []);

  // Manipulação de eventos no modo de inspeção
  useEffect(() => {
    if (!isActive) {
      setHoveredBox(null);
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
        setHoveredBox(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      const rawText = target.innerText || target.textContent || "";
      const textSnippet = rawText.replace(/\s+/g, " ").trim().slice(0, 45);

      setHoveredBox({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        tagName: target.tagName,
        textSnippet,
      });
    };

    const handleClick = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!target || target.closest('[data-dev-feedback-ui="true"]')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const elementInfo = extractElementInfo(target, e.clientX, e.clientY);
      onSelectElement(elementInfo);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
      if (!target || target.closest('[data-dev-feedback-ui="true"]')) return;

      const rect = target.getBoundingClientRect();
      const rawText = target.innerText || target.textContent || "";
      const textSnippet = rawText.replace(/\s+/g, " ").trim().slice(0, 45);

      setHoveredBox({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        tagName: target.tagName,
        textSnippet,
      });

      // Permite toque rápido ou seguro
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        const elementInfo = extractElementInfo(target, touch.clientX, touch.clientY);
        onSelectElement(elementInfo);
      }, 500);
    };

    const handleTouchEnd = (e: TouchEvent) => {
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
  }, [isActive, onCancel, onSelectElement, extractElementInfo]);

  if (!isActive) return null;

  return (
    <div
      data-dev-feedback-ui="true"
      className="fixed inset-0 z-[99999] pointer-events-none select-none"
    >
      {/* Banner superior com instruções */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 px-4 py-2.5 bg-noturno/90 backdrop-blur-xl border border-vulcanico/40 rounded-full shadow-2xl shadow-vulcanico/20 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="w-2.5 h-2.5 rounded-full bg-vulcanico animate-ping" />
        <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-white">
          <Target className="w-4 h-4 text-vulcanico" />
          <span>Modo Inspeção: Clique ou toque em qualquer título, botão ou elemento</span>
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
      {hoveredBox && (
        <div
          style={{
            top: `${hoveredBox.top}px`,
            left: `${hoveredBox.left}px`,
            width: `${hoveredBox.width}px`,
            height: `${hoveredBox.height}px`,
          }}
          className="fixed transition-all duration-75 pointer-events-none rounded-lg border-2 border-vulcanico bg-vulcanico/10 shadow-[0_0_20px_rgba(255,65,3,0.35)] ring-4 ring-vulcanico/20"
        >
          <div className="absolute -top-7 left-0 px-2 py-0.5 bg-vulcanico text-noturno font-mono font-extrabold text-[11px] rounded shadow-md uppercase tracking-wider flex items-center gap-1">
            <MousePointer className="w-3 h-3" />
            <span>{hoveredBox.tagName}</span>
          </div>
        </div>
      )}
    </div>
  );
}
