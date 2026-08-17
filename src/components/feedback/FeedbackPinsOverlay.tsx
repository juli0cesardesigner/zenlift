"use client";

import { useState } from "react";
import { AppFeedback } from "../../types/feedback";
import { FEEDBACK_TYPE_LABELS, FEEDBACK_STATUS_LABELS } from "../../lib/feedbackService";
import { MapPin, X, Check, ExternalLink } from "lucide-react";

interface FeedbackPinsOverlayProps {
  feedbacks: AppFeedback[];
  isVisible: boolean;
  highlightedFeedbackId: string | null;
  onOpenFeedback: (feedback: AppFeedback) => void;
  onResolveFeedback: (id: string) => void;
}

export function FeedbackPinsOverlay({
  feedbacks,
  isVisible,
  highlightedFeedbackId,
  onOpenFeedback,
  onResolveFeedback,
}: FeedbackPinsOverlayProps) {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  if (!isVisible && !highlightedFeedbackId) return null;

  // Filtra feedbacks com coordenadas válidas (e que não estejam arquivados/resolvidos a menos que destacados)
  const pinFeedbacks = feedbacks.filter((f) => {
    if (!f.targetElement?.xPercentage && f.targetElement?.xPercentage !== 0) return false;
    if (highlightedFeedbackId) return f.id === highlightedFeedbackId;
    return f.status !== "archived" && f.status !== "resolved";
  });

  if (pinFeedbacks.length === 0) return null;

  return (
    <div
      data-dev-feedback-ui="true"
      className="fixed inset-0 z-[99990] pointer-events-none"
    >
      {pinFeedbacks.map((fb) => {
        const typeConf = FEEDBACK_TYPE_LABELS[fb.type];
        const statusConf = FEEDBACK_STATUS_LABELS[fb.status];
        const isHighlighted = fb.id === highlightedFeedbackId;
        const isTooltipOpen = activeTooltipId === fb.id || isHighlighted;
        const x = fb.targetElement?.xPercentage ?? 50;
        const y = fb.targetElement?.yPercentage ?? 50;

        return (
          <div
            key={fb.id}
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          >
            {/* Radar ping se estiver destacado */}
            {isHighlighted && (
              <span className="absolute -inset-3 rounded-full bg-vulcanico opacity-75 animate-ping pointer-events-none" />
            )}

            {/* Pin Button */}
            <button
              onClick={() => setActiveTooltipId(isTooltipOpen ? null : fb.id)}
              className={`relative group w-8 h-8 rounded-full flex items-center justify-center shadow-xl border-2 transition-all cursor-pointer ${
                isHighlighted
                  ? "scale-125 ring-4 ring-vulcanico/40 z-20"
                  : "hover:scale-110 z-10"
              }`}
              style={{
                backgroundColor: "#001621",
                borderColor: typeConf.color,
                boxShadow: `0 0 16px ${typeConf.color}66`,
              }}
              title={fb.title}
            >
              <span className="text-xs">{typeConf.icon}</span>
            </button>

            {/* Tooltip Card */}
            {isTooltipOpen && (
              <div 
                className="absolute left-1/2 -translate-x-1/2 top-10 w-64 bg-noturno/95 border border-white/15 rounded-xl shadow-2xl p-3.5 backdrop-blur-xl z-30 animate-in fade-in zoom-in-95 duration-150 text-left"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                    style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
                  >
                    {statusConf.label}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTooltipId(null);
                    }}
                    className="text-concrete hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h4 className="text-xs font-bold text-white leading-tight mb-1 truncate">
                  {fb.title}
                </h4>
                
                {fb.description && (
                  <p className="text-[11px] text-concrete line-clamp-3 mb-2.5">
                    {fb.description}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => onOpenFeedback(fb)}
                    className="text-[11px] font-semibold text-vulcanico hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Detalhes</span>
                  </button>

                  {fb.status !== "resolved" && (
                    <button
                      onClick={() => onResolveFeedback(fb.id)}
                      className="px-2 py-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded border border-emerald-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Resolver</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
