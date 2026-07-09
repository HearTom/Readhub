-- ============================================================
-- MIGRATION: create_initial_schema
-- Versión: 20260702012314
-- Proyecto: ReadHub
-- ============================================================

-- 1. Tipo enum para roles de usuario
CREATE TYPE public.user_role AS ENUM ('reader', 'writer', 'admin');

-- ============================================================
-- TABLAS
-- ============================================================

-- 2. PROFILES — extiende auth.users con relación 1:1
CREATE TABLE public.profiles (
  id         UUID             PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_date DATE,
  phone      TEXT,
  role       public.user_role NOT NULL DEFAULT 'reader',
  created_at TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Extiende auth.users con datos de perfil y rol de negocio';

-- 3. ARTICLES
CREATE TABLE public.articles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  summary       TEXT,
  document_path TEXT,
  image_path    TEXT,
  is_public     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.articles           IS 'Artículos publicados por los usuarios';
COMMENT ON COLUMN public.articles.is_public IS 'TRUE = visible para todos; FALSE = solo el autor';

-- 4. VIEWS — evento por visualización, sin contador
CREATE TABLE public.views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.views IS 'Registro de eventos de visualización; cada fila es una apertura independiente';

-- 5. LIKES — un like por usuario por artículo (UNIQUE constraint)
CREATE TABLE public.likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT likes_unique_per_user UNIQUE (article_id, user_id)
);

-- 6. COMMENTS
CREATE TABLE public.comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  comment    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. FAVORITES
CREATE TABLE public.favorites (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT favorites_unique_per_user UNIQUE (article_id, user_id)
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- articles: consultas por autor y por visibilidad
CREATE INDEX idx_articles_author_id ON public.articles(author_id);
CREATE INDEX idx_articles_is_public ON public.articles(is_public);

-- views: consultas por artículo y por usuario
CREATE INDEX idx_views_article_id ON public.views(article_id);
CREATE INDEX idx_views_user_id    ON public.views(user_id);

-- likes: consultas por artículo y por usuario
CREATE INDEX idx_likes_article_id ON public.likes(article_id);
CREATE INDEX idx_likes_user_id    ON public.likes(user_id);

-- comments: consultas por artículo y por usuario
CREATE INDEX idx_comments_article_id ON public.comments(article_id);
CREATE INDEX idx_comments_user_id    ON public.comments(user_id);

-- favorites: consultas por artículo y por usuario
CREATE INDEX idx_favorites_article_id ON public.favorites(article_id);
CREATE INDEX idx_favorites_user_id    ON public.favorites(user_id);

-- ============================================================
-- ROW LEVEL SECURITY — habilitado; políticas en migración 002
-- ============================================================
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.views     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TRIGGER — crea perfil automáticamente al registrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'reader');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
