-- ============================================================
-- MIGRATION: create_rls_policies
-- Versión: 20260702013354
-- Proyecto: ReadHub
-- ============================================================

-- Función auxiliar: verifica si el usuario autenticado es admin.
-- SECURITY DEFINER garantiza que la consulta a profiles
-- omita RLS y no genere recursión.
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
-- Cada usuario solo puede ver y modificar su propio perfil.
-- ============================================================

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING    (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- ARTICLES
-- SELECT : artículos públicos para todos; el autor ve los suyos.
-- INSERT : solo autenticados; author_id debe ser el propio usuario.
-- UPDATE : solo el autor.
-- DELETE : solo el autor.
-- ============================================================

CREATE POLICY "articles_select"
  ON public.articles
  FOR SELECT
  USING (is_public = TRUE OR auth.uid() = author_id);

CREATE POLICY "articles_insert"
  ON public.articles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "articles_update"
  ON public.articles
  FOR UPDATE
  USING    (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "articles_delete"
  ON public.articles
  FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================
-- VIEWS
-- SELECT : solo el admin o el autor del artículo.
-- INSERT : solo autenticados; user_id debe ser el propio usuario.
-- ============================================================

CREATE POLICY "views_select"
  ON public.views
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id      = views.article_id
        AND articles.author_id = auth.uid()
    )
  );

CREATE POLICY "views_insert"
  ON public.views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- LIKES
-- SELECT : todos (necesario para mostrar contadores públicos).
-- INSERT : solo autenticados; user_id debe ser el propio usuario.
-- DELETE : solo el propietario del like.
-- ============================================================

CREATE POLICY "likes_select"
  ON public.likes
  FOR SELECT
  USING (TRUE);

CREATE POLICY "likes_insert"
  ON public.likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete"
  ON public.likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- COMMENTS
-- SELECT : todos pueden leer comentarios.
-- INSERT : solo autenticados; user_id debe ser el propio usuario.
-- UPDATE : solo el autor del comentario.
-- DELETE : el autor del comentario o un admin.
-- ============================================================

CREATE POLICY "comments_select"
  ON public.comments
  FOR SELECT
  USING (TRUE);

CREATE POLICY "comments_insert"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update"
  ON public.comments
  FOR UPDATE
  USING    (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete"
  ON public.comments
  FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- FAVORITES
-- Acceso exclusivo del propietario en todas las operaciones.
-- ============================================================

CREATE POLICY "favorites_select"
  ON public.favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert"
  ON public.favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete"
  ON public.favorites
  FOR DELETE
  USING (auth.uid() = user_id);
