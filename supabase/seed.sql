-- ============================================================
-- seed.sql — Datos de prueba para ReadHub
-- ============================================================
-- Contraseña de todos los usuarios de prueba: ReadHub2024!
--
-- Usuarios:
--   reader@readhub.com  → role: reader
--   writer@readhub.com  → role: writer
--   admin@readhub.com   → role: admin
--
-- Para ejecutar:
--   supabase db execute --file supabase/seed.sql
-- ============================================================

DO $$
DECLARE
  -- UUIDs fijos para reproducibilidad en pruebas
  v_reader_id  UUID := '00000000-0000-0000-0000-000000000001';
  v_writer_id  UUID := '00000000-0000-0000-0000-000000000002';
  v_admin_id   UUID := '00000000-0000-0000-0000-000000000003';

  v_article_1  UUID := '10000000-0000-0000-0000-000000000001';
  v_article_2  UUID := '10000000-0000-0000-0000-000000000002';
  v_article_3  UUID := '10000000-0000-0000-0000-000000000003';

  v_password   TEXT;
BEGIN

  -- --------------------------------------------------------
  -- Limpieza idempotente: borrar por email elimina en cascada
  -- profiles, articles, views, likes, comments y favorites.
  -- --------------------------------------------------------
  DELETE FROM auth.users
  WHERE email IN ('reader@readhub.com', 'writer@readhub.com', 'admin@readhub.com');

  -- --------------------------------------------------------
  -- Hash de la contraseña de prueba: ReadHub2024!
  -- --------------------------------------------------------
  v_password := extensions.crypt('ReadHub2024!', extensions.gen_salt('bf', 10));

  -- --------------------------------------------------------
  -- USUARIOS en auth.users
  -- El trigger on_auth_user_created crea los profiles
  -- automáticamente con role = 'reader'.
  -- --------------------------------------------------------
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES
    (
      v_reader_id, '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'reader@readhub.com',
      v_password, NOW(),
      '{"provider":"email","providers":["email"]}', '{}',
      FALSE, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days',
      '', '', '', ''
    ),
    (
      v_writer_id, '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'writer@readhub.com',
      v_password, NOW(),
      '{"provider":"email","providers":["email"]}', '{}',
      FALSE, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days',
      '', '', '', ''
    ),
    (
      v_admin_id, '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'admin@readhub.com',
      v_password, NOW(),
      '{"provider":"email","providers":["email"]}', '{}',
      FALSE, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days',
      '', '', '', ''
    );

  -- Identidades requeridas para login por email/contraseña
  -- provider_id = email para el proveedor 'email'
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES
    (
      gen_random_uuid(), v_reader_id, 'reader@readhub.com',
      jsonb_build_object('sub', v_reader_id::text, 'email', 'reader@readhub.com'),
      'email', NOW(), NOW(), NOW()
    ),
    (
      gen_random_uuid(), v_writer_id, 'writer@readhub.com',
      jsonb_build_object('sub', v_writer_id::text, 'email', 'writer@readhub.com'),
      'email', NOW(), NOW(), NOW()
    ),
    (
      gen_random_uuid(), v_admin_id, 'admin@readhub.com',
      jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@readhub.com'),
      'email', NOW(), NOW(), NOW()
    );

  -- --------------------------------------------------------
  -- PROFILES — actualizar roles y datos personales
  -- (el trigger ya creó las filas con role='reader')
  -- --------------------------------------------------------
  UPDATE public.profiles SET
    birth_date = '1995-06-15',
    phone      = '+51 912 345 678'
  WHERE id = v_reader_id;

  UPDATE public.profiles SET
    role       = 'writer',
    birth_date = '1988-03-22',
    phone      = '+51 987 654 321'
  WHERE id = v_writer_id;

  UPDATE public.profiles SET
    role       = 'admin',
    birth_date = '1982-11-08',
    phone      = '+51 999 888 777'
  WHERE id = v_admin_id;

  -- --------------------------------------------------------
  -- ARTICLES
  -- 2 públicos + 1 borrador privado, todos del writer
  -- --------------------------------------------------------
  INSERT INTO public.articles
    (id, author_id, title, summary, is_public, created_at)
  VALUES
    (
      v_article_1, v_writer_id,
      'Introducción a Next.js 15 con App Router',
      'Una guía completa para comenzar con Next.js 15, React Server Components y el nuevo App Router.',
      TRUE,  NOW() - INTERVAL '10 days'
    ),
    (
      v_article_2, v_writer_id,
      'Row Level Security en Supabase: guía práctica',
      'Aprende a implementar políticas RLS en PostgreSQL para proteger cada fila de tu base de datos.',
      TRUE,  NOW() - INTERVAL '5 days'
    ),
    (
      v_article_3, v_writer_id,
      '[Borrador] Arquitectura escalable con TypeScript',
      'Patrones avanzados de arquitectura usando TypeScript en proyectos de gran escala.',
      FALSE, NOW() - INTERVAL '1 day'
    );

  -- --------------------------------------------------------
  -- VIEWS — eventos independientes (sin contador)
  -- reader visita article_1 dos veces → dos filas distintas
  -- --------------------------------------------------------
  INSERT INTO public.views (article_id, user_id, viewed_at) VALUES
    (v_article_1, v_reader_id, NOW() - INTERVAL '9 days'),
    (v_article_1, v_admin_id,  NOW() - INTERVAL '8 days'),
    (v_article_1, v_reader_id, NOW() - INTERVAL '3 days'),  -- segunda visita
    (v_article_2, v_reader_id, NOW() - INTERVAL '4 days'),
    (v_article_2, v_admin_id,  NOW() - INTERVAL '2 days');

  -- --------------------------------------------------------
  -- LIKES — máximo uno por (usuario, artículo)
  -- --------------------------------------------------------
  INSERT INTO public.likes (article_id, user_id, created_at) VALUES
    (v_article_1, v_reader_id, NOW() - INTERVAL '9 days'),
    (v_article_1, v_admin_id,  NOW() - INTERVAL '8 days'),
    (v_article_2, v_reader_id, NOW() - INTERVAL '4 days');

  -- --------------------------------------------------------
  -- COMMENTS
  -- --------------------------------------------------------
  INSERT INTO public.comments (article_id, user_id, comment, created_at) VALUES
    (v_article_1, v_reader_id,
     'Excelente artículo, el apartado de Server Components quedó muy claro.',
     NOW() - INTERVAL '8 days'),
    (v_article_1, v_admin_id,
     'El ejemplo del App Router simplifica mucho la gestión de layouts anidados.',
     NOW() - INTERVAL '7 days'),
    (v_article_2, v_reader_id,
     'Nunca había entendido RLS tan bien. Los ejemplos con auth.uid() son perfectos.',
     NOW() - INTERVAL '3 days'),
    (v_article_2, v_admin_id,
     'Muy buena cobertura de los casos de uso con políticas por rol.',
     NOW() - INTERVAL '1 day');

  -- --------------------------------------------------------
  -- FAVORITES
  -- --------------------------------------------------------
  INSERT INTO public.favorites (article_id, user_id, created_at) VALUES
    (v_article_1, v_reader_id, NOW() - INTERVAL '9 days'),
    (v_article_2, v_reader_id, NOW() - INTERVAL '4 days');

  RAISE NOTICE 'Seed completado: 3 usuarios | 3 articulos | 5 vistas | 3 likes | 4 comentarios | 2 favoritos';
END;
$$;
