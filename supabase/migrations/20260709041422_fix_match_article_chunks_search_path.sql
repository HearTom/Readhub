-- ============================================================
-- MIGRATION: fix_match_article_chunks_search_path
-- Sesión 4 — Corrección: tras mover la extensión `vector` al esquema
-- `extensions` (migración 20260709041322), el operador de distancia
-- coseno `<=>` quedó en ese mismo esquema. La función
-- match_article_chunks fija `SET search_path = public` por endurecimiento
-- de seguridad (evita search_path hijacking en SECURITY INVOKER/DEFINER),
-- por lo que dejó de resolver el operador. Se agrega `extensions` al
-- search_path fijo de la función — no se relaja a un search_path abierto.
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
SET search_path = public, extensions
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
