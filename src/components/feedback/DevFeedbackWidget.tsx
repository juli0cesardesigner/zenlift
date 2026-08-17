"use client";

import { useState, useEffect, useCallback } from "react";
import { AppFeedback, TargetElementInfo } from "../../types/feedback";
import { fetchAllFeedbacks } from "../../lib/feedbackService";
import { FeedbackInspector } from "./FeedbackInspector";
import { FeedbackModal } from "./FeedbackModal";
import { FeedbackPinsOverlay } from "./FeedbackPinsOverlay";
import { DevFeedbackDrawer } from "./DevFeedbackDrawer";
import {
  Target,
  SlidersHorizontal,
  MapPin,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Bug,
} from "lucide-react";

export function DevFeedbackWidget() {
  const [feedbacks, setFeedbacks] = useState<AppFeedback[]>([]);
  const [isInspectorActive, setIsInspectorActive] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<TargetElementInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPinsVisible, setIsPinsVisible] = useState(false);
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentRoute, setCurrentRoute] = useState("/");

  // Carrega feedbacks
  const loadFeedbacks = useCallback(async () => {
    try {
      const list = await fetchAllFeedbacks();
      setFeedbacks(list);
    } catch (err) {
      console.warn("Erro ao carregar feedbacks:", err);
    }
  }, []);

  useEffect(() => {
    loadFeedbacks();
    if (typeof window !== "undefined") {
      setCurrentRoute(window.location.pathname || "/");
    }
  }, [loadFeedbacks]);

  // Quantidade de feedbacks abertos/pendentes
  const openCount = feedbacks.filter((f) => f.status === "open").length;

  // Atalho de teclado: Ctrl + Shift + F / Cmd + Shift + F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        setIsInspectorActive((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Ao selecionar um elemento no modo de inspeção
  const handleSelectElement = (elementInfo: TargetElementInfo) => {
    setSelectedTarget(elementInfo);
    setIsInspectorActive(false);
    setIsModalOpen(true);
  };

  // Ao clicar em "Localizar na Tela"
  const handleHighlightOnScreen = (feedback: AppFeedback) => {
    setHighlightedFeedbackId(feedback.id);
    setIsPinsVisible(true);
    setTimeout(() => {
      setHighlightedFeedbackId(null);
    }, 6000);
  };

  return (
    <>
      {/* Camada de Inspeção Ativa */}
      <FeedbackInspector
        isActive={isInspectorActive}
        onCancel={() => setIsInspectorActive(false)}
        onSelectElement={handleSelectElement}
      />

      {/* Camada de Pins na Tela */}
      <FeedbackPinsOverlay
        feedbacks={feedbacks}
        isVisible={isPinsVisible}
        highlightedFeedbackId={highlightedFeedbackId}
        onOpenFeedback={(fb) => {
          setIsDrawerOpen(true);
        }}
        onResolveFeedback={async (id) => {
          const { updateFeedbackStatus } = await import("../../lib/feedbackService");
          await updateFeedbackStatus(id, "resolved");
          loadFeedbacks();
        }}
      />

      {/* Modal de Novo Feedback */}
      <FeedbackModal
        isOpen={isModalOpen}
        targetElement={selectedTarget}
        currentRoute={currentRoute}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTarget(null);
        }}
        onCreated={() => {
          loadFeedbacks();
          setIsPinsVisible(true);
        }}
      />

      {/* Central / Drawer de Feedbacks */}
      <DevFeedbackDrawer
        isOpen={isDrawerOpen}
        feedbacks={feedbacks}
        onClose={() => setIsDrawerOpen(false)}
        onRefresh={loadFeedbacks}
        onHighlightOnScreen={handleHighlightOnScreen}
      />

      {/* Widget Flutuante Trigger (Borda Inferior Direita) */}
      <aside
        data-dev-feedback-ui="true"
        aria-label="Controles de Feedback e Desenvolvimento"
        className="fixed bottom-20 md:bottom-6 right-4 z-[99995] flex flex-col items-end gap-2 select-none"
      >
        {/* Menu Expandido de Ações Rápidas */}
        {isExpanded && (
          <div className="flex flex-col items-end gap-2 p-2 bg-noturno/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl ring-1 ring-white/5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Botão: Iniciar Inspeção / Apontar na Tela */}
            <button
              onClick={() => {
                setIsExpanded(false);
                setIsInspectorActive(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-vulcanico text-noturno font-bold text-xs hover:bg-vulcanico/90 transition-all shadow-md shadow-vulcanico/20 cursor-pointer"
            >
              <Target className="w-4 h-4" />
              <span>🎯 Apontar na Tela</span>
            </button>

            {/* Botão: Abrir Central de Feedbacks */}
            <button
              onClick={() => {
                setIsExpanded(false);
                setIsDrawerOpen(true);
              }}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-concrete" />
                <span>Central de Feedbacks</span>
              </div>
              {openCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-vulcanico text-noturno">
                  {openCount}
                </span>
              )}
            </button>

            {/* Botão: Alternar Exibição de Pins */}
            <button
              onClick={() => setIsPinsVisible(!isPinsVisible)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isPinsVisible
                  ? "bg-white/15 text-vulcanico border border-vulcanico/30"
                  : "bg-white/5 hover:bg-white/10 text-concrete hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>Pins na Tela</span>
              </div>
              <span className="text-[10px] font-mono font-bold">
                {isPinsVisible ? "ON" : "OFF"}
              </span>
            </button>

            <div className="pt-1 px-1 border-t border-white/5 w-full text-center">
              <span className="text-[9px] font-mono text-concrete/70">
                Atalho: Ctrl + Shift + F
              </span>
            </div>
          </div>
        )}

        {/* Botão Pílula Principal */}
        <div className="flex items-center bg-noturno/90 backdrop-blur-xl border border-white/15 hover:border-vulcanico/50 rounded-full shadow-2xl p-1 transition-all group ring-1 ring-white/5">
          <button
            onClick={() => setIsInspectorActive(true)}
            title="Apontar elemento na tela (Ctrl + Shift + F)"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-vulcanico/15 hover:bg-vulcanico text-white hover:text-noturno font-bold text-xs transition-all cursor-pointer shadow-sm"
          >
            <Bug className="w-3.5 h-3.5 text-vulcanico group-hover:text-noturno" />
            <span className="hidden sm:inline">Feedback Dev</span>
            {openCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-vulcanico text-noturno text-[10px] font-mono font-black flex items-center justify-center">
                {openCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title="Opções de desenvolvedor"
            className="w-7 h-7 rounded-full flex items-center justify-center text-concrete hover:text-white transition-colors cursor-pointer ml-1"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}
