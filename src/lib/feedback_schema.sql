-- ==============================================================================
-- Schema para a tabela app_feedbacks (ZenLift Dev Overlay & Visual Feedback)
-- ==============================================================================

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

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_app_feedbacks_created_at ON public.app_feedbacks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_feedbacks_status ON public.app_feedbacks (status);
CREATE INDEX IF NOT EXISTS idx_app_feedbacks_type ON public.app_feedbacks (type);
CREATE INDEX IF NOT EXISTS idx_app_feedbacks_route ON public.app_feedbacks (route);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.app_feedbacks ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Permitir leitura, inserção e atualização anônima/autenticada em Dev)
DROP POLICY IF EXISTS "Permitir leitura publica de feedbacks" ON public.app_feedbacks;
CREATE POLICY "Permitir leitura publica de feedbacks" 
  ON public.app_feedbacks 
  FOR SELECT 
  TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "Permitir insercao publica de feedbacks" ON public.app_feedbacks;
CREATE POLICY "Permitir insercao publica de feedbacks" 
  ON public.app_feedbacks 
  FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao publica de feedbacks" ON public.app_feedbacks;
CREATE POLICY "Permitir atualizacao publica de feedbacks" 
  ON public.app_feedbacks 
  FOR UPDATE 
  TO anon, authenticated 
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusao publica de feedbacks" ON public.app_feedbacks;
CREATE POLICY "Permitir exclusao publica de feedbacks" 
  ON public.app_feedbacks 
  FOR DELETE 
  TO anon, authenticated 
  USING (true);
