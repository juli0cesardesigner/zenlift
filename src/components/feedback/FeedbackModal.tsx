"use client";

import { useState } from "react";
import { TargetElementInfo, FeedbackType, FeedbackPriority } from "../../types/feedback";
import { FEEDBACK_TYPE_LABELS, FEEDBACK_PRIORITY_LABELS, createFeedback } from "../../lib/feedbackService";
import { X, Send, Tag, AlertTriangle, Sparkles } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  targetElement: TargetElementInfo | null;
  currentRoute?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function FeedbackModal({
  isOpen,
  targetElement,
  currentRoute = "/",
  onClose,
  onCreated,
}: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>("visual");
  const [priority, setPriority] = useState<FeedbackPriority>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const defaultTitle = targetElement?.textSnippet 
    ? `${FEEDBACK_TYPE_LABELS[type].label}: "${targetElement.textSnippet.slice(0, 35)}..."`
    : `${FEEDBACK_TYPE_LABELS[type].label} no componente`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createFeedback({
        type,
        priority,
        title: title.trim() || defaultTitle,
        description: description.trim(),
        route: currentRoute,
        targetElement: targetElement || undefined,
      });

      onCreated();
      onClose();
    } catch (err) {
      console.error("Erro ao criar feedback:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      data-dev-feedback-ui="true" 
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-lg bg-noturno border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-white/5"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-vulcanico/20 border border-vulcanico/40 flex items-center justify-center text-vulcanico">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Novo Feedback Visual</h3>
              <p className="text-xs text-concrete">Vincule anotações e bugs diretamente ao elemento selecionado</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-concrete hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Elemento Alvo Detectado */}
          {targetElement && (
            <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs text-concrete">
                <span className="flex items-center gap-1.5 font-medium">
                  <Tag className="w-3.5 h-3.5 text-vulcanico" />
                  Elemento Selecionado
                </span>
                <span className="font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded text-concrete">
                  &lt;{targetElement.tagName.toLowerCase()}&gt;
                </span>
              </div>
              <p className="text-xs font-mono text-white/90 bg-black/30 p-2 rounded border border-white/5 truncate">
                {targetElement.textSnippet || "(Elemento sem texto visível)"}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-concrete font-mono">
                <span>Posição X: {targetElement.xPercentage.toFixed(1)}%</span>
                <span>•</span>
                <span>Posição Y: {targetElement.yPercentage.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Tipo de Feedback */}
          <div>
            <label className="block text-xs font-semibold text-concrete uppercase tracking-wider mb-2">
              Tipo do Apontamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(FEEDBACK_TYPE_LABELS) as FeedbackType[]).map((t) => {
                const conf = FEEDBACK_TYPE_LABELS[t];
                const isSelected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? "border-transparent shadow-lg text-white"
                        : "border-white/10 bg-white/[0.02] text-concrete hover:bg-white/[0.06] hover:text-white"
                    }`}
                    style={{
                      backgroundColor: isSelected ? conf.bg : undefined,
                      borderColor: isSelected ? conf.border : undefined,
                      color: isSelected ? conf.color : undefined,
                    }}
                  >
                    <span>{conf.icon}</span>
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nível de Prioridade */}
          <div>
            <label className="block text-xs font-semibold text-concrete uppercase tracking-wider mb-2">
              Prioridade
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(FEEDBACK_PRIORITY_LABELS) as FeedbackPriority[]).map((p) => {
                const conf = FEEDBACK_PRIORITY_LABELS[p];
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center ${
                      isSelected
                        ? "bg-white/15 border-white/30 text-white shadow-sm"
                        : "bg-white/[0.02] border-white/10 text-concrete hover:bg-white/[0.05]"
                    }`}
                    style={{
                      color: isSelected ? conf.color : undefined,
                    }}
                  >
                    {conf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-concrete uppercase tracking-wider mb-1.5">
              Título / Assunto (Opcional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-concrete/50 focus:outline-none focus:border-vulcanico transition-colors"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-concrete uppercase tracking-wider mb-1.5">
              Comentário / Detalhes do Ajuste *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Este título está subindo para a borda ao rolar a página. Ajustar padding ou fixar altura do cabeçalho..."
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-concrete/50 focus:outline-none focus:border-vulcanico transition-colors custom-scrollbar resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-concrete hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="px-5 py-2.5 text-xs font-bold bg-vulcanico text-noturno hover:bg-vulcanico/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-vulcanico/25 flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Salvando..." : "Registrar Feedback"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
