-- ============================================================
-- policies.sql — Referencia de políticas RLS de ReadHub
-- Este archivo es solo referencia; las migraciones son la
-- fuente de verdad para la base de datos.
-- ============================================================

-- Función auxiliar: devuelve TRUE si el usuario actual es admin.
-- SECURITY DEFINER evita recursión al leer profiles con RLS activo.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ============================================================
-- PROFILES
-- Regla: cada usuario solo ve y edita su propio perfil.
-- ============================================================

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Nota: no se define INSERT porque el trigger handle_new_user()
-- crea el perfil automáticamente al registrar el usuario.

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING    (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ============================================================
-- ARTICLES
-- ============================================================

-- SELECT: artículos públicos visibles para todos;
--         el autor también ve sus artículos privados.
CREATE POLICY "articles_select"
  ON public.articles FOR SELECT
  USING (is_public = TRUE OR auth.uid() = author_id);

-- INSERT: solo autenticados; fuerza que author_id = usuario actual.
CREATE POLICY "articles_insert"
  ON public.articles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- UPDATE/DELETE: exclusivo del autor.
CREATE POLICY "articles_update"
  ON public.articles FOR UPDATE
  USING    (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "articles_delete"
  ON public.articles FOR DELETE
  USING (auth.uid() = author_id);


-- ============================================================
-- VIEWS
-- ============================================================

-- SELECT: el admin ve todas las vistas; el autor solo ve las
--         de sus propios artículos.
CREATE POLICY "views_select"
  ON public.views FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id      = views.article_id
        AND articles.author_id = auth.uid()
    )
  );

-- INSERT: cualquier usuario autenticado puede registrar una vista.
CREATE POLICY "views_insert"
  ON public.views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- LIKES
-- ============================================================

-- SELECT: público (necesario para mostrar contadores en la UI).
CREATE POLICY "likes_select"
  ON public.likes FOR SELECT
  USING (TRUE);

-- INSERT: solo autenticados; fuerza user_id = usuario actual.
--         La constraint UNIQUE(article_id, user_id) impide duplicados.
CREATE POLICY "likes_insert"
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- DELETE: solo el propietario puede retirar su like.
CREATE POLICY "likes_delete"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- COMMENTS
-- ============================================================

-- SELECT: lectura pública.
CREATE POLICY "comments_select"
  ON public.comments FOR SELECT
  USING (TRUE);

-- INSERT: solo autenticados; fuerza user_id = usuario actual.
CREATE POLICY "comments_insert"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: solo el autor del comentario puede editarlo.
CREATE POLICY "comments_update"
  ON public.comments FOR UPDATE
  USING    (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: el autor del comentario O un administrador.
CREATE POLICY "comments_delete"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());


-- ============================================================
-- FAVORITES
-- Acceso exclusivo del propietario en todas las operaciones.
-- ============================================================

CREATE POLICY "favorites_select"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert"
  ON public.favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- SESIÓN 4 — ARTICLE_CHUNKS (infraestructura vectorial RAG)
-- Visibilidad idéntica a articles_select, replicada vía JOIN.
-- Fuente de verdad real: supabase/migrations/20260709041204_*.sql
-- y 20260709041322_*.sql (versión optimizada con (select auth.uid())).
-- ============================================================

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

-- El indexado (fase posterior) se ejecuta bajo la sesión autenticada
-- del propio autor (Route Handler con cookies del usuario, no un job
-- con service-role) → restringido a artículos propios.
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

-- Sin política UPDATE: el re-indexado reemplaza filas completas vía
-- DELETE + INSERT, igual que likes/views/favorites.
