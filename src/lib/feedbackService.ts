import { AppFeedback, FeedbackStatus, FeedbackType, FeedbackPriority, TargetElementInfo } from '../types/feedback';
import { supabase } from '../app/supabase';

const LOCAL_STORAGE_KEY = 'zenlift_app_feedbacks';

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, { label: string; icon: string; color: string; bg: string; border: string }> = {
  bug: { 
    label: 'Bug / Erro', 
    icon: '🐞', 
    color: '#EF4444', 
    bg: 'rgba(239, 68, 68, 0.15)', 
    border: 'rgba(239, 68, 68, 0.4)' 
  },
  visual: { 
    label: 'Visual / UI', 
    icon: '🎨', 
    color: '#A855F7', 
    bg: 'rgba(168, 85, 247, 0.15)', 
    border: 'rgba(168, 85, 247, 0.4)' 
  },
  suggestion: { 
    label: 'Sugestão', 
    icon: '💡', 
    color: '#EAB308', 
    bg: 'rgba(234, 179, 8, 0.15)', 
    border: 'rgba(234, 179, 8, 0.4)' 
  },
  performance: { 
    label: 'Performance / Fluxo', 
    icon: '⚡', 
    color: '#06B6D4', 
    bg: 'rgba(6, 182, 212, 0.15)', 
    border: 'rgba(6, 182, 212, 0.4)' 
  },
};

export const FEEDBACK_PRIORITY_LABELS: Record<FeedbackPriority, { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#8A99A8' },
  medium: { label: 'Média', color: '#F59E0B' },
  high: { label: 'Alta', color: '#FF4103' },
  critical: { label: 'Crítica 🚨', color: '#DC2626' },
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Pendente', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  in_progress: { label: 'Em Análise', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
  resolved: { label: 'Resolvido ✅', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  archived: { label: 'Arquivado', color: '#64748B', bg: 'rgba(100, 116, 139, 0.15)' },
};

// SQL Schema for in-app copy
export const SUPABASE_SQL_SCHEMA = `-- Copie e execute este SQL no SQL Editor do seu Supabase Dashboard:
CREATE TABLE IF NOT EXISTS public.app_feedbacks (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  type TEXT NOT NULL CHECK (type IN ('bug', 'visual', 'suggestion', 'performance')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'archived')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  route TEXT NOT NULL DEFAULT '/',
  target_element JSONB,
  device_info JSONB,
  sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_app_feedbacks_created_at ON public.app_feedbacks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_feedbacks_status ON public.app_feedbacks (status);

ALTER TABLE public.app_feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir operacoes de feedback" ON public.app_feedbacks;
CREATE POLICY "Permitir operacoes de feedback" 
  ON public.app_feedbacks 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);
`;

/**
 * Lê os feedbacks armazenados no localStorage
 */
export function getLocalFeedbacks(): AppFeedback[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[FeedbackService] Falha ao ler localStorage:', err);
    return [];
  }
}

/**
 * Salva a lista de feedbacks no localStorage
 */
export function saveLocalFeedbacks(feedbacks: AppFeedback[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(feedbacks));
  } catch (err) {
    console.warn('[FeedbackService] Falha ao salvar no localStorage:', err);
  }
}

/**
 * Busca todos os feedbacks (LocalStorage + sincroniza com Supabase se disponível)
 */
export async function fetchAllFeedbacks(): Promise<AppFeedback[]> {
  const localList = getLocalFeedbacks();

  try {
    const { data, error } = await supabase
      .from('app_feedbacks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Se a tabela ainda não existir no Supabase, continua suavemente com o local
      return localList;
    }

    if (data && Array.isArray(data)) {
      const remoteFeedbacks: AppFeedback[] = data.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        type: row.type,
        priority: row.priority,
        status: row.status,
        title: row.title,
        description: row.description,
        route: row.route,
        targetElement: row.target_element,
        deviceInfo: row.device_info,
        syncStatus: 'synced',
      }));

      // Mescla local e remoto por ID
      const map = new Map<string, AppFeedback>();
      remoteFeedbacks.forEach((f) => map.set(f.id, f));

      const pendingSyncList: AppFeedback[] = [];
      localList.forEach((f) => {
        if (!map.has(f.id)) {
          const syncedItem = { ...f, syncStatus: 'synced' as const };
          map.set(f.id, syncedItem);
          pendingSyncList.push(syncedItem);
        }
      });

      // Se existirem feedbacks locais que ainda não foram gravados no Supabase, sincroniza agora em lote
      if (pendingSyncList.length > 0) {
        supabase
          .from('app_feedbacks')
          .upsert(
            pendingSyncList.map((f) => ({
              id: f.id,
              created_at: f.createdAt,
              updated_at: f.updatedAt,
              type: f.type,
              priority: f.priority,
              status: f.status,
              title: f.title,
              description: f.description,
              route: f.route,
              target_element: f.targetElement,
              device_info: f.deviceInfo,
              sync_status: 'synced',
            }))
          )
          .then(({ error: upsertErr }) => {
            if (upsertErr) {
              console.warn('[FeedbackService] Erro ao sincronizar pendências locais com o Supabase:', upsertErr);
            }
          });
      }

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      saveLocalFeedbacks(merged);
      return merged;
    }
  } catch (err) {
    console.warn('[FeedbackService] Supabase offline ou indisponível:', err);
  }

  return localList;
}

/**
 * Cria um novo feedback
 */
export async function createFeedback(input: {
  type: FeedbackType;
  priority: FeedbackPriority;
  title: string;
  description: string;
  route: string;
  targetElement?: TargetElementInfo;
}): Promise<AppFeedback> {
  const now = new Date().toISOString();
  const id = 'fb_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

  const deviceInfo = {
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
    language: typeof window !== 'undefined' ? navigator.language : 'pt-BR',
  };

  const newFeedback: AppFeedback = {
    id,
    createdAt: now,
    updatedAt: now,
    type: input.type,
    priority: input.priority,
    status: 'open',
    title: input.title.trim() || `Ajuste em ${input.targetElement?.tagName || 'elemento'}`,
    description: input.description.trim(),
    route: input.route || '/',
    targetElement: input.targetElement,
    deviceInfo,
    syncStatus: 'local_only',
  };

  // Salva no LocalStorage primeiro
  const localList = getLocalFeedbacks();
  const updatedList = [newFeedback, ...localList];
  saveLocalFeedbacks(updatedList);

  // Tenta sincronizar com Supabase
  try {
    const { error } = await supabase.from('app_feedbacks').upsert({
      id: newFeedback.id,
      created_at: newFeedback.createdAt,
      updated_at: newFeedback.updatedAt,
      type: newFeedback.type,
      priority: newFeedback.priority,
      status: newFeedback.status,
      title: newFeedback.title,
      description: newFeedback.description,
      route: newFeedback.route,
      target_element: newFeedback.targetElement,
      device_info: newFeedback.deviceInfo,
      sync_status: 'synced',
    });

    if (!error) {
      newFeedback.syncStatus = 'synced';
      const refreshedList = updatedList.map((f) => (f.id === id ? { ...f, syncStatus: 'synced' as const } : f));
      saveLocalFeedbacks(refreshedList);
    }
  } catch (err) {
    console.warn('[FeedbackService] Erro ao sincronizar novo feedback no Supabase:', err);
  }

  return newFeedback;
}

/**
 * Atualiza o status de um feedback
 */
export async function updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  const localList = getLocalFeedbacks();
  const now = new Date().toISOString();
  const updatedList = localList.map((item) =>
    item.id === id ? { ...item, status, updatedAt: now } : item
  );
  saveLocalFeedbacks(updatedList);

  try {
    await supabase
      .from('app_feedbacks')
      .update({ status, updated_at: now })
      .eq('id', id);
  } catch (err) {
    console.warn('[FeedbackService] Erro ao atualizar status no Supabase:', err);
  }
}

/**
 * Exclui um feedback
 */
export async function deleteFeedback(id: string): Promise<void> {
  const localList = getLocalFeedbacks();
  const updatedList = localList.filter((item) => item.id !== id);
  saveLocalFeedbacks(updatedList);

  try {
    await supabase.from('app_feedbacks').delete().eq('id', id);
  } catch (err) {
    console.warn('[FeedbackService] Erro ao excluir no Supabase:', err);
  }
}

/**
 * Formata um feedback como Markdown para criar Issue no GitHub ou enviar em chat
 */
export function formatAsGitHubIssue(feedback: AppFeedback): string {
  const typeConfig = FEEDBACK_TYPE_LABELS[feedback.type];
  const priorityConfig = FEEDBACK_PRIORITY_LABELS[feedback.priority];
  const codeLoc = feedback.targetElement?.codeLocation;

  let codeSection = '';
  if (codeLoc?.fileName || codeLoc?.componentName) {
    codeSection = `
---

#### 🔬 Localização Cirúrgica no Código
- **Arquivo de Origem:** \`${codeLoc.fileName || 'N/A'}${codeLoc.lineNumber ? `:${codeLoc.lineNumber}` : ''}\`
- **Componente Principal:** \`<${codeLoc.componentName || feedback.targetElement?.parentComponent || 'Componente'} />\`
${codeLoc.componentStack && codeLoc.componentStack.length > 0 ? `- **Hierarquia:** \`${codeLoc.componentStack.join(' > ')}\`` : ''}
${codeLoc.propsSnippet ? `- **Props Vinculadas:** \`${JSON.stringify(codeLoc.propsSnippet)}\`` : ''}
`;
  }

  return `### ${typeConfig.icon} [${typeConfig.label.toUpperCase()}] ${feedback.title}

**Prioridade:** \`${priorityConfig.label}\`  
**Status:** \`${feedback.status}\`  
**Tela/Rota:** \`${feedback.route}\`  
**Data:** ${new Date(feedback.createdAt).toLocaleString('pt-BR')}

---

#### 📝 Descrição / Ajuste Solicitado
${feedback.description || '_Sem descrição adicional fornecida._'}
${codeSection}
---

#### 🎯 Elemento Alvo
- **Tag:** \`<${feedback.targetElement?.tagName?.toLowerCase() || 'div'}>\`
- **Identificação / Texto:** \`${feedback.targetElement?.textSnippet || 'N/A'}\`
${feedback.targetElement?.iconName ? `- **Ícone Detectado:** \`${feedback.targetElement.iconName}\`` : ''}
${feedback.targetElement?.closestContainerTitle ? `- **Contexto Semântico:** \`${feedback.targetElement.closestContainerTitle}\`` : ''}
${feedback.targetElement?.domPath ? `- **Caminho DOM:** \`${feedback.targetElement.domPath}\`` : ''}
- **Posição na Tela:** \`X: ${feedback.targetElement?.xPercentage?.toFixed(1) || 0}%, Y: ${feedback.targetElement?.yPercentage?.toFixed(1) || 0}%\`

#### 📱 Informações do Ambiente
- **Resolução:** \`${feedback.deviceInfo?.screenWidth}x${feedback.deviceInfo?.screenHeight}\`
- **Navegador:** \`${feedback.deviceInfo?.userAgent}\`
- **Feedback ID:** \`${feedback.id}\`
`;
}
