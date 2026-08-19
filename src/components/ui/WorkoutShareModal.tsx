import React, { useState } from 'react';
import { X, Share2, Copy, Check, Trophy, Flame, Clock, Dumbbell, Users } from 'lucide-react';
import { HistoryLog } from '../../types';
import { formatTime, generateWorkoutShareText, triggerHapticFeedback } from '../../lib/utils';

interface WorkoutShareModalProps {
  workout: HistoryLog;
  onClose: () => void;
}

export function WorkoutShareModal({ workout, onClose }: WorkoutShareModalProps) {
  const [copied, setCopied] = useState(false);

  const durationStr = formatTime(workout.durationMs);
  const shareText = generateWorkoutShareText(workout);

  const handleCopyText = () => {
    triggerHapticFeedback('medium');
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    triggerHapticFeedback('pr');
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Zenlift: ${workout.name}`,
          text: shareText,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        });
      } catch (err) {
        // Fallback to copy if share was cancelled or failed
        handleCopyText();
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" data-component="WorkoutShareModal">
      <div className="bg-noturno border border-white/15 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-concrete/15">
          <div className="flex items-center gap-2">
            <Flame className="text-vulcanico fill-vulcanico" size={20} />
            <h3 className="font-display text-xl uppercase text-white tracking-wide">Compartilhar Treino</h3>
          </div>
          <button
            onClick={() => {
              triggerHapticFeedback('light');
              onClose();
            }}
            className="text-concrete hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Social Share Card Preview (Instagram Stories Style) */}
        <div className="p-6 flex flex-col items-center">
          <div className="w-full bg-gradient-to-b from-[#001E2E] to-[#00121C] border-2 border-vulcanico/40 rounded-2xl p-6 shadow-[0_0_30px_rgba(255,65,3,0.15)] flex flex-col gap-5 relative overflow-hidden">
            {/* Ambient Tiffany Glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-vulcanico/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex justify-between items-start z-10">
              <div>
                <span className="font-mono text-[10px] text-vulcanico uppercase tracking-widest font-bold">
                  ZENLIFT UNICORN • SILICON VALLEY
                </span>
                <h2 className="font-display text-2xl uppercase text-white font-extrabold mt-0.5 leading-tight">
                  {workout.name}
                </h2>
              </div>
              <div className="w-9 h-9 rounded-xl bg-vulcanico text-noturno font-display font-extrabold flex items-center justify-center text-lg shadow-[0_0_12px_#FF4103]">
                Z
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-3 z-10">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col">
                <span className="font-mono text-[9px] text-concrete uppercase tracking-wider flex items-center gap-1">
                  <Clock size={10} className="text-vulcanico" /> Duração
                </span>
                <span className="font-mono text-xl font-bold text-white mt-1">
                  {durationStr}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col">
                <span className="font-mono text-[9px] text-concrete uppercase tracking-wider flex items-center gap-1">
                  <Dumbbell size={10} className="text-vulcanico" /> Volume Total
                </span>
                <span className="font-mono text-xl font-bold text-vulcanico mt-1">
                  {workout.volumeKg.toLocaleString()} <span className="text-xs text-concrete">kg</span>
                </span>
              </div>
            </div>

            {/* Dual Partner Badge */}
            {workout.partner1Name && workout.partner2Name && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-2.5 flex items-center gap-2 z-10">
                <Users size={14} className="text-cyan-400" />
                <span className="font-mono text-xs text-cyan-300 font-semibold">
                  DUAL SESSION: {workout.partner1Name} & {workout.partner2Name}
                </span>
              </div>
            )}

            {/* PRs Section */}
            {workout.prs && workout.prs.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 z-10">
                <span className="font-mono text-[10px] text-amber-400 uppercase tracking-widest font-bold flex items-center gap-1 mb-1">
                  <Trophy size={12} className="text-amber-400" /> Personal Records
                </span>
                <div className="flex flex-col gap-1">
                  {workout.prs.map((pr, idx) => (
                    <span key={idx} className="font-sans text-xs text-white font-medium">
                      • {pr}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[10px] font-mono text-concrete z-10">
              <span>{new Date(workout.date).toLocaleDateString('pt-BR')}</span>
              <span className="text-vulcanico font-bold">#ZENLIFTGAINS</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 flex flex-col gap-2">
          <button
            onClick={handleNativeShare}
            className="w-full bg-vulcanico hover:bg-white text-noturno font-display text-lg uppercase py-3.5 rounded-xl font-extrabold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,65,3,0.3)] active:scale-[0.98]"
          >
            <Share2 size={18} />
            Compartilhar nos Stories / Threads
          </button>

          <button
            onClick={handleCopyText}
            className="w-full bg-concrete/10 hover:bg-concrete/20 text-white font-mono text-xs uppercase py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-concrete/20"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span className="text-emerald-400">Copiado para a Área de Transferência!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                Copiar Resumo em Texto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
