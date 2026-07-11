-- ============================================================
-- MIGRATION: optimize_vector_infrastructure
-- Sesión 4 — Correcciones señaladas por los advisors de Supabase
-- sobre la infraestructura vectorial recién creada (no toca ninguna
-- migración ni política preexistente de sesiones anteriores).
-- ============================================================

-- 1) extension_in_public (SECURITY, WARN): el resto de extensiones en uso
--    de este proyecto (pgcrypto, uuid-ossp) viven en el esquema
--    `extensions`, no en `public`. Se mueve `vector` para mantener la
--    misma convención. El search_path del proyecto ya incluye
--    `extensions` (gen_random_uuid(), de pgcrypto, ya se usa sin
--    calificar en articles/comments/etc.), por lo que la columna
--    `vector(384)` de article_chunks sigue resolviendo igual.
ALTER EXTENSION vector SET SCHEMA extensions;

-- 2) auth_rls_initplan (PERFORMANCE, WARN): las 3 políticas creadas en
--    esta misma sesión para article_chunks reevaluaban auth.uid() por
--    fila. Se reemplazan por la forma (select auth.uid()), que Postgres
--    evalúa una sola vez por consulta. No se toca ninguna política de
--    profiles/articles/views/likes/comments/favorites (preexistentes).
DROP POLICY "article_chunks_select" ON public.article_chunks;
CREATE POLICY "article_chunks_select"
  ON public.article_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = article_chunks.article_id
        AND (articles.is_public = TRUE OR articles.author_id = (SELECT auth.uid()))
    )
  );

DROP POLICY "article_chunks_insert" ON public.article_chunks;
CREATE POLICY "article_chunks_insert"
  ON public.article_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = article_chunks.article_id
        AND articles.author_id = (SELECT auth.uid())
    )
  );

DROP POLICY "article_chunks_delete" ON public.article_chunks;
CREATE POLICY "article_chunks_delete"
  ON public.article_chunks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = article_chunks.article_id
        AND articles.author_id = (SELECT auth.uid())
    )
  );
