"use client";

import { useState, useMemo } from "react";
import { AppFeedback, FeedbackStatus, FeedbackType } from "../../types/feedback";
import {
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
  updateFeedbackStatus,
  deleteFeedback,
  formatAsGitHubIssue,
  SUPABASE_SQL_SCHEMA,
} from "../../lib/feedbackService";
import {
  X,
  Search,
  CheckCircle2,
  Trash2,
  Copy,
  ExternalLink,
  MapPin,
  Database,
  RefreshCw,
  SlidersHorizontal,
  FileCode,
  Check,
  Sparkles,
} from "lucide-react";

interface DevFeedbackDrawerProps {
  isOpen: boolean;
  feedbacks: AppFeedback[];
  onClose: () => void;
  onRefresh: () => void;
  onHighlightOnScreen: (feedback: AppFeedback) => void;
}

export function DevFeedbackDrawer({
  isOpen,
  feedbacks,
  onClose,
  onRefresh,
  onHighlightOnScreen,
}: DevFeedbackDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<FeedbackType | "all">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Estatísticas
  const stats = useMemo(() => {
    return {
      total: feedbacks.length,
      open: feedbacks.filter((f) => f.status === "open").length,
      inProgress: feedbacks.filter((f) => f.status === "in_progress").length,
      resolved: feedbacks.filter((f) => f.status === "resolved").length,
      bugs: feedbacks.filter((f) => f.type === "bug").length,
    };
  }, [feedbacks]);

  // Feedbacks filtrados
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      if (statusFilter !== "all" && fb.status !== statusFilter) return false;
      if (typeFilter !== "all" && fb.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = fb.title.toLowerCase().includes(query);
        const matchDesc = fb.description.toLowerCase().includes(query);
        const matchElement = fb.targetElement?.textSnippet?.toLowerCase().includes(query) || false;
        const matchRoute = fb.route.toLowerCase().includes(query);
        return matchTitle || matchDesc || matchElement || matchRoute;
      }
      return true;
    });
  }, [feedbacks, statusFilter, typeFilter, searchQuery]);

  const handleCopyMarkdown = (feedback: AppFeedback) => {
    const md = formatAsGitHubIssue(feedback);
    navigator.clipboard.writeText(md);
    setCopiedId(feedback.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleStatusChange = async (id: string, newStatus: FeedbackStatus) => {
    await updateFeedbackStatus(id, newStatus);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente remover este feedback?")) {
      await deleteFeedback(id);
      onRefresh();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-dev-feedback-ui="true"
      className="fixed inset-0 z-[100000] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl h-full bg-noturno border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ring-1 ring-white/5"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-vulcanico/20 border border-vulcanico/40 flex items-center justify-center text-vulcanico shadow-lg shadow-vulcanico/10">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-white tracking-tight">Central Dev & Feedbacks</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-vulcanico/20 text-vulcanico border border-vulcanico/30">
                  ZENLIFT DEV
                </span>
              </div>
              <p className="text-xs text-concrete">
                {stats.open} pendentes • {stats.resolved} resolvidos • {stats.total} total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSqlModal(true)}
              title="Ver / Copiar SQL do Supabase"
              className="p-2 text-concrete hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">SQL Supabase</span>
            </button>

            <button
              onClick={onRefresh}
              title="Atualizar Feedbacks"
              className="p-2 text-concrete hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-concrete hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="p-4 border-b border-white/10 bg-black/20 space-y-3">
          {/* Busca */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-concrete" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, texto do elemento, rota ou descrição..."
              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-concrete/50 focus:outline-none focus:border-vulcanico transition-colors"
            />
          </div>

          {/* Filtros de Status */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <span className="text-[11px] font-semibold text-concrete mr-1 uppercase tracking-wider">Status:</span>
            {[
              { id: "all", label: `Todos (${stats.total})` },
              { id: "open", label: `Pendentes (${stats.open})` },
              { id: "in_progress", label: `Em Análise (${stats.inProgress})` },
              { id: "resolved", label: `Resolvidos (${stats.resolved})` },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === st.id
                    ? "bg-vulcanico text-noturno font-bold"
                    : "bg-white/5 text-concrete hover:bg-white/10 hover:text-white"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Filtros de Tipo */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <span className="text-[11px] font-semibold text-concrete mr-1 uppercase tracking-wider">Tipo:</span>
            {[
              { id: "all", label: "Todos", icon: "🌐" },
              { id: "bug", label: "Bugs", icon: "🐞" },
              { id: "visual", label: "Visual", icon: "🎨" },
              { id: "suggestion", label: "Sugestões", icon: "💡" },
              { id: "performance", label: "Performance", icon: "⚡" },
            ].map((tp) => (
              <button
                key={tp.id}
                onClick={() => setTypeFilter(tp.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer ${
                  typeFilter === tp.id
                    ? "bg-white/20 text-white border border-white/30"
                    : "bg-white/5 text-concrete hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{tp.icon}</span>
                <span>{tp.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Feedbacks */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
          {filteredFeedbacks.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              <Sparkles className="w-8 h-8 text-concrete/40 mb-2" />
              <p className="text-sm font-semibold text-white">Nenhum feedback encontrado</p>
              <p className="text-xs text-concrete mt-1">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                  ? "Tente ajustar os filtros ou a busca acima."
                  : "Use o botão flutuante para apontar na tela e criar seu primeiro feedback visual!"}
              </p>
            </div>
          ) : (
            filteredFeedbacks.map((fb) => {
              const typeConf = FEEDBACK_TYPE_LABELS[fb.type];
              const priorityConf = FEEDBACK_PRIORITY_LABELS[fb.priority];
              const statusConf = FEEDBACK_STATUS_LABELS[fb.status];
              const isCopied = copiedId === fb.id;

              return (
                <div
                  key={fb.id}
                  className={`p-4 bg-white/[0.02] hover:bg-white/[0.04] border rounded-2xl transition-all space-y-3 ${
                    fb.status === "resolved"
                      ? "border-emerald-500/20 opacity-75"
                      : "border-white/10"
                  }`}
                >
                  {/* Top Bar: Tipo + Prioridade + Status */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                        style={{ backgroundColor: typeConf.bg, color: typeConf.color }}
                      >
                        <span>{typeConf.icon}</span>
                        <span>{typeConf.label}</span>
                      </span>

                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white/5"
                        style={{ color: priorityConf.color }}
                      >
                        {priorityConf.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={fb.status}
                        onChange={(e) => handleStatusChange(fb.id, e.target.value as FeedbackStatus)}
                        className="text-[11px] font-bold px-2 py-1 rounded bg-black/40 border border-white/10 focus:outline-none focus:border-vulcanico transition-colors cursor-pointer"
                        style={{ color: statusConf.color }}
                      >
                        <option value="open" className="bg-noturno text-amber-400">Pendente</option>
                        <option value="in_progress" className="bg-noturno text-blue-400">Em Análise</option>
                        <option value="resolved" className="bg-noturno text-emerald-400">Resolvido ✅</option>
                        <option value="archived" className="bg-noturno text-slate-400">Arquivado</option>
                      </select>
                    </div>
                  </div>

                  {/* Título & Descrição */}
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {fb.title}
                    </h4>
                    {fb.description && (
                      <p className="text-xs text-concrete/90 mt-1 whitespace-pre-wrap leading-relaxed">
                        {fb.description}
                      </p>
                    )}
                  </div>

                  {/* Detalhes Cirúrgicos do Elemento & Código */}
                  {fb.targetElement && (
                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs space-y-2">
                      {/* Linha 1: Arquivo e Linha com botão de cópia */}
                      {fb.targetElement.codeLocation?.fileName && (
                        <div className="flex items-center justify-between gap-2 p-1.5 bg-cyan-950/30 border border-cyan-800/30 rounded-lg text-cyan-300 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5 truncate">
                            <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{fb.targetElement.codeLocation.fileName}</span>
                            {fb.targetElement.codeLocation.lineNumber && (
                              <span className="text-vulcanico font-bold">
                                :{fb.targetElement.codeLocation.lineNumber}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              const path = `${fb.targetElement?.codeLocation?.fileName}${fb.targetElement?.codeLocation?.lineNumber ? `:${fb.targetElement?.codeLocation?.lineNumber}` : ""}`;
                              navigator.clipboard.writeText(path);
                              setCopiedId(`path_${fb.id}`);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="px-1.5 py-0.5 bg-cyan-900/50 hover:bg-cyan-800/60 rounded text-[10px] text-cyan-200 shrink-0 cursor-pointer"
                            title="Copiar arquivo e linha"
                          >
                            {copiedId === `path_${fb.id}` ? "Copiado!" : "Copiar"}
                          </button>
                        </div>
                      )}

                      {/* Linha 2: Componente React */}
                      {fb.targetElement.codeLocation?.componentName && (
                        <div className="flex items-center gap-1.5 text-[11px] text-concrete font-mono">
                          <span className="text-white/60">Componente:</span>
                          <span className="font-bold text-cyan-300">
                            &lt;{fb.targetElement.codeLocation.componentName} /&gt;
                          </span>
                        </div>
                      )}

                      {/* Linha 3: Tag / Ícone / Texto */}
                      <div className="flex items-center justify-between text-concrete font-mono text-[11px]">
                        <span>Alvo: &lt;{fb.targetElement.tagName.toLowerCase()}&gt;</span>
                        {fb.targetElement.iconName && (
                          <span className="text-amber-400 font-bold">Ícone: {fb.targetElement.iconName}</span>
                        )}
                      </div>

                      {fb.targetElement.textSnippet && fb.targetElement.textSnippet !== "(Elemento sem texto visível)" && (
                        <p className="font-mono text-white/80 truncate text-[11px] bg-black/30 p-1.5 rounded border border-white/5">
                          "{fb.targetElement.textSnippet}"
                        </p>
                      )}

                      {fb.targetElement.closestContainerTitle && (
                        <p className="text-[10px] text-concrete/80 truncate">
                          Contexto: {fb.targetElement.closestContainerTitle}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Footer com Metadados e Ações */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px] text-concrete">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{new Date(fb.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span className="font-mono">{fb.route}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Localizar na Tela */}
                      {fb.targetElement && (
                        <button
                          onClick={() => {
                            onHighlightOnScreen(fb);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                          title="Localizar na tela atual"
                        >
                          <MapPin className="w-3 h-3 text-vulcanico" />
                          <span>Localizar</span>
                        </button>
                      )}

                      {/* Copiar para GitHub Issue */}
                      <button
                        onClick={() => handleCopyMarkdown(fb)}
                        className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                          isCopied
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : "bg-white/5 hover:bg-white/10 text-concrete hover:text-white"
                        }`}
                        title="Copiar formatado para GitHub Issue ou Chat"
                      >
                        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? "Copiado!" : "Issue MD"}</span>
                      </button>

                      {/* Excluir */}
                      <button
                        onClick={() => handleDelete(fb.id)}
                        className="p-1.5 bg-white/5 hover:bg-red-500/20 text-concrete hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Excluir feedback"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal do Script SQL Supabase */}
      {showSqlModal && (
        <div
          data-dev-feedback-ui="true"
          className="fixed inset-0 z-[100005] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-noturno border border-white/15 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 ring-1 ring-white/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Tabela Supabase (`app_feedbacks`)</h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-concrete hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-concrete leading-relaxed">
              O ZenLift já salva todos os feedbacks localmente no navegador por padrão. Se desejar sincronizar os feedbacks diretamente na nuvem do Supabase, copie o script abaixo e execute no <strong>SQL Editor</strong> do seu Supabase Dashboard:
            </p>

            <pre className="p-3.5 bg-black/60 border border-white/10 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-56 custom-scrollbar">
              {SUPABASE_SQL_SCHEMA}
            </pre>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 text-xs font-semibold text-concrete hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={handleCopySql}
                className="px-5 py-2 text-xs font-bold bg-emerald-500 text-noturno hover:bg-emerald-400 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? "Copiado para Área de Transferência!" : "Copiar Script SQL"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
