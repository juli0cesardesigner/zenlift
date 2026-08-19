"use client";

import { useState, useEffect } from "react";
import { TargetElementInfo, FeedbackType, FeedbackPriority, DOMNodeLayer } from "../../types/feedback";
import { FEEDBACK_TYPE_LABELS, FEEDBACK_PRIORITY_LABELS, createFeedback } from "../../lib/feedbackService";
import { X, Send, Code2, Copy, Check, FileCode, Layers, Sparkles, ArrowUp, ArrowDown } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  targetElement: TargetElementInfo | null;
  currentRoute?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function FeedbackModal({
  isOpen,
  targetElement: initialTarget,
  currentRoute = "/",
  onClose,
  onCreated,
}: FeedbackModalProps) {
  const [targetElement, setTargetElement] = useState<TargetElementInfo | null>(initialTarget);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);

  const [type, setType] = useState<FeedbackType>("visual");
  const [priority, setPriority] = useState<FeedbackPriority>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedFile, setCopiedFile] = useState(false);

  useEffect(() => {
    setTargetElement(initialTarget);
    setSelectedLayerIndex(0);
  }, [initialTarget]);

  if (!isOpen) return null;

  const ancestors = initialTarget?.ancestors || [];

  const handleSelectLayer = (layer: DOMNodeLayer, idx: number) => {
    setSelectedLayerIndex(idx);
    if (!initialTarget) return;

    setTargetElement({
      ...initialTarget,
      tagName: layer.tagName,
      selector: layer.selector,
      textSnippet: layer.textSnippet,
      closestContainerTitle: layer.label,
      parentComponent: layer.componentName || initialTarget.parentComponent,
      domPath: layer.domPath,
      boundingRect: layer.boundingRect,
      xPercentage: layer.xPercentage,
      yPercentage: layer.yPercentage,
    });
  };

  const codeLoc = targetElement?.codeLocation;
  const compPrefix = codeLoc?.componentName ? `[${codeLoc.componentName}] ` : "";
  const targetLabel = targetElement?.iconName
    ? `Ícone <${targetElement.iconName}>`
    : targetElement?.textSnippet && targetElement.textSnippet !== "(Elemento sem texto visível)"
    ? `"${targetElement.textSnippet.slice(0, 30)}..."`
    : `<${targetElement?.tagName.toLowerCase() || "componente"}>`;

  const defaultTitle = `${compPrefix}${FEEDBACK_TYPE_LABELS[type].label}: ${targetLabel}`;

  const handleCopyFilePath = () => {
    if (!codeLoc?.fileName) return;
    const pathWithLine = `${codeLoc.fileName}${codeLoc.lineNumber ? `:${codeLoc.lineNumber}` : ""}`;
    navigator.clipboard.writeText(pathWithLine);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

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
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-noturno border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ring-1 ring-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-vulcanico/20 border border-vulcanico/40 flex items-center justify-center text-vulcanico">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Novo Feedback Cirúrgico</h3>
              <p className="text-xs text-concrete">Seletor de camadas e localização no código</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Seletor de Camadas Hierárquicas (Breadcrumbs) */}
          {ancestors.length > 1 && (
            <div className="p-3 bg-white/[0.03] border border-vulcanico/30 rounded-xl space-y-2 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 font-bold text-xs text-vulcanico uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5" />
                  Camada Alvo do Pin (Escopo)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={selectedLayerIndex >= ancestors.length - 1}
                    onClick={() => {
                      const nextIdx = Math.min(ancestors.length - 1, selectedLayerIndex + 1);
                      handleSelectLayer(ancestors[nextIdx], nextIdx);
                    }}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 disabled:opacity-25 text-[10px] font-mono text-white flex items-center gap-1 transition-colors border border-white/10"
                    title="Expandir para o contêiner/card pai"
                  >
                    <ArrowUp size={11} />
                    Expandir Pai
                  </button>
                  <button
                    type="button"
                    disabled={selectedLayerIndex <= 0}
                    onClick={() => {
                      const prevIdx = Math.max(0, selectedLayerIndex - 1);
                      handleSelectLayer(ancestors[prevIdx], prevIdx);
                    }}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 disabled:opacity-25 text-[10px] font-mono text-white flex items-center gap-1 transition-colors border border-white/10"
                    title="Focar no elemento mais interno"
                  >
                    <ArrowDown size={11} />
                    Focar Filho
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {ancestors.map((layer, idx) => {
                  const isSelected = selectedLayerIndex === idx;
                  const icons = ["🎯", "📦", "🎴", "🖼️", "📐", "🌐"];
                  const icon = icons[idx] || "📦";
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectLayer(layer, idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border cursor-pointer ${
                        isSelected
                          ? "bg-vulcanico text-noturno border-vulcanico font-bold shadow-md shadow-vulcanico/30 scale-102"
                          : "bg-black/50 border-white/10 text-concrete hover:text-white hover:border-white/30 hover:bg-white/5"
                      }`}
                    >
                      <span>{icon}</span>
                      <span className="truncate max-w-[180px]">{layer.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card Cirúrgico de Origem do Código */}
          {targetElement && (
            <div className="p-3.5 bg-black/50 border border-cyan-500/30 rounded-xl space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-xs text-cyan-400">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  Origem no Código & Bastidores
                </span>
                {codeLoc?.fileName && (
                  <button
                    type="button"
                    onClick={handleCopyFilePath}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    title="Copiar caminho do arquivo"
                  >
                    {copiedFile ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFile ? "Copiado!" : "Copiar Path"}</span>
                  </button>
                )}
              </div>

              {/* Arquivo e Linha */}
              {codeLoc?.fileName && (
                <div className="flex items-center gap-2 text-xs font-mono bg-white/[0.03] p-2 rounded-lg border border-white/5">
                  <FileCode className="w-3.5 h-3.5 text-vulcanico shrink-0" />
                  <span className="text-white/90 truncate flex-1">{codeLoc.fileName}</span>
                  {codeLoc.lineNumber && (
                    <span className="bg-vulcanico/20 text-vulcanico px-1.5 py-0.5 rounded text-[10px] font-bold">
                      Linha {codeLoc.lineNumber}
                    </span>
                  )}
                </div>
              )}

              {/* Componente React e Stack */}
              <div className="space-y-1 text-xs">
                {(targetElement.parentComponent || codeLoc?.componentName) && (
                  <div className="flex items-center gap-1.5 text-concrete">
                    <span className="text-white/60">Componente:</span>
                    <span className="font-mono font-bold text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40">
                      &lt;{targetElement.parentComponent || codeLoc?.componentName} /&gt;
                    </span>
                  </div>
                )}

                {codeLoc?.componentStack && codeLoc.componentStack.length > 1 && (
                  <div className="flex items-center gap-1 text-[11px] text-concrete font-mono overflow-x-auto py-0.5">
                    <Layers className="w-3 h-3 text-concrete shrink-0" />
                    <span className="truncate">{codeLoc.componentStack.join(" → ")}</span>
                  </div>
                )}
              </div>

              {/* Elemento / Ícone / Texto */}
              <div className="p-2 bg-black/40 rounded-lg border border-white/5 space-y-1 text-xs">
                <div className="flex items-center justify-between text-[11px] text-concrete font-mono">
                  <span>Tag: &lt;{targetElement.tagName.toLowerCase()}&gt;</span>
                  {targetElement.iconName && (
                    <span className="text-amber-400 font-bold">Ícone: {targetElement.iconName}</span>
                  )}
                </div>
                {targetElement.textSnippet && targetElement.textSnippet !== "(Elemento sem texto visível)" && (
                  <p className="font-mono text-white/90 truncate text-[11px]">
                    "{targetElement.textSnippet}"
                  </p>
                )}
                {targetElement.closestContainerTitle && (
                  <p className="text-[10px] text-concrete/80 truncate">
                    Contexto: {targetElement.closestContainerTitle}
                  </p>
                )}
              </div>

              {/* Props vinculadas se houver */}
              {codeLoc?.propsSnippet && (
                <div className="text-[10px] font-mono text-concrete/80 bg-black/60 p-1.5 rounded border border-white/5 truncate">
                  <span className="text-cyan-400 font-bold">Props: </span>
                  {JSON.stringify(codeLoc.propsSnippet)}
                </div>
              )}
            </div>
          )}

          {/* Tipo de Feedback */}
          <div>
            <label className="block text-xs font-semibold text-concrete uppercase tracking-wider mb-1.5">
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
            <label className="block text-xs font-semibold text-concrete uppercase tracking-wider mb-1.5">
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
            <label className="block text-xs font-semibold text-concrete uppercase tracking-wider mb-1">
              Título / Assunto
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-concrete/50 focus:outline-none focus:border-vulcanico transition-colors"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-concrete uppercase tracking-wider mb-1">
              Comentário / Detalhes do Ajuste *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Este container/card deve fechar ao clicar fora..."
              className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-concrete/50 focus:outline-none focus:border-vulcanico transition-colors custom-scrollbar resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
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
              className="px-5 py-2 text-xs font-bold bg-vulcanico text-noturno hover:bg-vulcanico/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-vulcanico/25 flex items-center gap-2 cursor-pointer"
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
