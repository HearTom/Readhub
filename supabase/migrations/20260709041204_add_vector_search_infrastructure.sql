-- ============================================================
-- MIGRATION: add_vector_search_infrastructure
-- Sesión 4 — Políticas RLS y función SQL reutilizable sobre pgvector
-- No se invoca todavía desde ningún Service/Hook/Componente.
-- ============================================================

-- Visibilidad idéntica a la política articles_select existente
-- (is_public = TRUE OR auth.uid() = author_id), replicada vía JOIN
-- para que un artículo privado nunca sea recuperable por otro usuario
-- a través de búsqueda semántica.
CREATE POLICY "article_chunks_select"
  ON public.article_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = article_chunks.article_id
        AND (articles.is_public = TRUE OR articles.author_id = auth.uid())
    )
  );

-- El indexado (fase posterior) se ejecutará bajo la sesión autenticada
-- del propio autor (arquitectura client-driven de ReadHub: Route Handler
-- con cookies del usuario, no un job con service-role) → restringido a
-- artículos propios.
CREATE POLICY "article_chunks_insert"
  ON public.article_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = article_chunks.article_id
        AND articles.author_id = auth.uid()
    )
  );

CREATE POLICY "article_chunks_delete"
  ON public.article_chunks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = article_chunks.article_id
        AND articles.author_id = auth.uid()
    )
  );

-- Sin política UPDATE: el re-indexado (fase posterior) reemplaza filas
-- completas vía DELETE + INSERT, igual que likes/views/favorites tampoco
-- tienen UPDATE en las políticas existentes de este proyecto.

-- ============================================================
-- FUNCIÓN REUTILIZABLE: match_article_chunks
--
-- Encapsula la búsqueda por similitud coseno. SECURITY INVOKER (no
-- DEFINER): corre con los privilegios del usuario que llama, por lo que
-- la RLS de article_chunks (y de articles vía el JOIN) se aplica
-- automáticamente sin duplicar la regla de visibilidad dentro de la
-- función.
--
-- No se invoca todavía desde ningún Service — queda lista para que la
-- fase de Services la use vía supabase.rpc('match_article_chunks', ...).
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_article_chunks(
  query_embedding vector(384),
  match_count     INT   DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  chunk_id      UUID,
  article_id    UUID,
  article_title TEXT,
  chunk_index   INT,
  content       TEXT,
  similarity    FLOAT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ac.id,
    ac.article_id,
    a.title,
    ac.chunk_index,
    ac.content,
    1 - (ac.embedding <=> query_embedding) AS similarity
  FROM public.article_chunks ac
  JOIN public.articles a ON a.id = ac.article_id
  WHERE 1 - (ac.embedding <=> query_embedding) > match_threshold
  ORDER BY ac.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_article_chunks IS
  'Búsqueda por similitud coseno reutilizable sobre article_chunks. Devuelve el título del artículo unido para evitar N+1 queries en el futuro vector-search.service.ts. No se invoca todavía desde la aplicación (fase de infraestructura únicamente).';
