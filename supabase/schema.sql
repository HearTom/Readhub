-- ============================================================
-- schema.sql — Referencia completa del esquema ReadHub
-- Este archivo es solo referencia; las migraciones son la
-- fuente de verdad para la base de datos.
-- ============================================================

-- ENUM
-- ------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('reader', 'writer', 'admin');


-- TABLAS
-- ------------------------------------------------------------

-- profiles: extiende auth.users (relación 1:1)
-- Trigger on_auth_user_created crea la fila automáticamente
-- al registrar un usuario en Supabase Auth.
CREATE TABLE public.profiles (
  id         UUID             PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_date DATE,
  phone      TEXT,
  role       public.user_role NOT NULL DEFAULT 'reader',
  created_at TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- articles: artículos publicados por escritores
CREATE TABLE public.articles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  summary       TEXT,
  document_path TEXT,           -- ruta en Supabase Storage (PDF / documento)
  image_path    TEXT,           -- ruta en Supabase Storage (imagen de portada)
  is_public     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- views: un evento por apertura (sin contador)
CREATE TABLE public.views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- likes: máximo uno por (usuario, artículo)
CREATE TABLE public.likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT likes_unique_per_user UNIQUE (article_id, user_id)
);

-- comments
CREATE TABLE public.comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  comment    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- favorites: artículos guardados; máximo uno por (usuario, artículo)
CREATE TABLE public.favorites (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT favorites_unique_per_user UNIQUE (article_id, user_id)
);


-- ÍNDICES
-- ------------------------------------------------------------
CREATE INDEX idx_articles_author_id  ON public.articles(author_id);
CREATE INDEX idx_articles_is_public  ON public.articles(is_public);
CREATE INDEX idx_views_article_id    ON public.views(article_id);
CREATE INDEX idx_views_user_id       ON public.views(user_id);
CREATE INDEX idx_likes_article_id    ON public.likes(article_id);
CREATE INDEX idx_likes_user_id       ON public.likes(user_id);
CREATE INDEX idx_comments_article_id ON public.comments(article_id);
CREATE INDEX idx_comments_user_id    ON public.comments(user_id);
CREATE INDEX idx_favorites_article_id ON public.favorites(article_id);
CREATE INDEX idx_favorites_user_id   ON public.favorites(user_id);


-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.views     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;


-- TRIGGER: auto-crear perfil al registrar usuario
-- ------------------------------------------------------------
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
