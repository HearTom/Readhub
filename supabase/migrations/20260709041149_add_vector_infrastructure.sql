-- ============================================================
-- MIGRATION: add_vector_infrastructure
-- Sesión 4 — Infraestructura vectorial para RAG (solo estructura)
-- No incluye políticas RLS (ver migración siguiente) ni datos.
-- ============================================================

-- Extensión pgvector — ya disponible en este proyecto Supabase (v0.8.2),
-- se habilita explícitamente en el esquema public.
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- ARTICLE_CHUNKS
-- Un fragmento de texto por fila (no un embedding por artículo completo).
--
-- Justificación: aunque los artículos de ReadHub son publicaciones cortas
-- y la mayoría producirá un único chunk, el diseño debe soportar
-- documentos largos sin requerir un cambio estructural futuro, y la
-- futura capa de construcción de contexto (context-builder.service.ts,
-- fase de Services) necesita poder ordenar y limitar por relevancia
-- entre MÚLTIPLES fragmentos recuperados — algo que un esquema de
-- "un embedding por artículo completo" no permitiría sin migrar de nuevo.
-- ============================================================
CREATE TABLE public.article_chunks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  chunk_index INT         NOT NULL,
  content     TEXT        NOT NULL,
  embedding   vector(384) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT article_chunks_unique_chunk UNIQUE (article_id, chunk_index)
);

COMMENT ON TABLE public.article_chunks IS
  'Fragmentos de texto de artículos con su embedding vectorial (384 dimensiones, modelo sentence-transformers/all-MiniLM-L6-v2 vía Hugging Face Inference API) para búsqueda semántica RAG. Estructura preparada en la fase de infraestructura; el llenado de embeddings reales corresponde a una fase posterior.';

COMMENT ON COLUMN public.article_chunks.chunk_index IS
  'Orden del fragmento dentro del artículo (0-based). La mayoría de artículos de ReadHub producirá un único chunk (index 0).';

COMMENT ON COLUMN public.article_chunks.embedding IS
  '384 dimensiones — dimensión de salida de sentence-transformers/all-MiniLM-L6-v2. Cambiar de modelo de embeddings a uno con otra dimensión requerirá una migración nueva.';

-- Índice B-tree estándar para joins/filtros por artículo (ej. borrar todos
-- los chunks de un artículo antes de re-indexar en la fase de Services).
CREATE INDEX idx_article_chunks_article_id ON public.article_chunks(article_id);

-- Índice vectorial especializado — ver justificación HNSW vs IVFFlat
-- en el informe técnico de esta fase.
CREATE INDEX idx_article_chunks_embedding_hnsw
  ON public.article_chunks
  USING hnsw (embedding vector_cosine_ops);

-- RLS habilitado ahora; las políticas se definen en la migración
-- siguiente — mismo patrón que 20260702012314_create_initial_schema.sql
-- (habilita RLS) + 20260702013354_create_rls_policies.sql (políticas).
ALTER TABLE public.article_chunks ENABLE ROW LEVEL SECURITY;
