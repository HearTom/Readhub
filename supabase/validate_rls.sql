-- ============================================================
-- validate_rls.sql — Validación de políticas RLS para ReadHub
-- ============================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Requiere:    seed.sql aplicado previamente
--
-- El script cambia el rol de la sesión (SET LOCAL ROLE) para
-- simular cada contexto de usuario y verifica que RLS permita
-- o rechace cada operación según lo especificado.
-- Todo el DML de prueba se revierte al finalizar.
--
-- Usuarios de prueba (UUID fijos del seed.sql):
--   reader  → 00000000-0000-0000-0000-000000000001
--   writer  → 00000000-0000-0000-0000-000000000002
--   admin   → 00000000-0000-0000-0000-000000000003
--
-- Artículos de prueba:
--   art1 → 10000000-0000-0000-0000-000000000001  (público)
--   art2 → 10000000-0000-0000-0000-000000000002  (público)
--   art3 → 10000000-0000-0000-0000-000000000003  (privado)
-- ============================================================

DO $$
DECLARE
  v     INTEGER;
  pass  INTEGER := 0;
  fail  INTEGER := 0;

  r_id  CONSTANT UUID := '00000000-0000-0000-0000-000000000001';  -- reader
  w_id  CONSTANT UUID := '00000000-0000-0000-0000-000000000002';  -- writer
  a_id  CONSTANT UUID := '00000000-0000-0000-0000-000000000003';  -- admin
  art1  CONSTANT UUID := '10000000-0000-0000-0000-000000000001';  -- público
  art2  CONSTANT UUID := '10000000-0000-0000-0000-000000000002';  -- público
  art3  CONSTANT UUID := '10000000-0000-0000-0000-000000000003';  -- privado
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE '  VALIDACION DE POLITICAS RLS — ReadHub';
  RAISE NOTICE '================================================';

  -- ======================================================
  -- PROFILES (P1-P5)
  -- Regla: cada usuario solo ve y modifica su propio perfil.
  -- ======================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- PROFILES ---';

  -- P1: Anon NO puede ver ningún perfil
  -- Esperado: 0 filas | RLS: profiles_select_own requiere auth.uid()
  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM set_config('request.jwt.claims', '{}', true);
  SELECT COUNT(*) INTO v FROM public.profiles;
  IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] P1 | Anon no ve perfiles               → 0 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] P1 | Anon no ve perfiles               → esperado 0, obtenido %', v; END IF;

  -- P2: Reader puede ver su propio perfil
  -- Esperado: 1 fila | RLS: auth.uid() = id
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', r_id), true);
  SELECT COUNT(*) INTO v FROM public.profiles WHERE id = r_id;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] P2 | Reader ve su propio perfil         → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] P2 | Reader ve su propio perfil         → esperado 1, obtenido %', v; END IF;

  -- P3: Reader NO puede ver perfil de otro usuario
  -- Esperado: 0 filas | RLS: auth.uid() = id es FALSE para w_id
  SELECT COUNT(*) INTO v FROM public.profiles WHERE id = w_id;
  IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] P3 | Reader no ve perfil ajeno          → 0 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] P3 | Reader no ve perfil ajeno          → esperado 0, obtenido %', v; END IF;

  -- P4: Reader puede actualizar su propio perfil
  -- Esperado: 1 fila actualizada | RLS: auth.uid() = id
  UPDATE public.profiles SET phone = '+99 000 000 000' WHERE id = r_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] P4 | Reader actualiza su perfil         → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] P4 | Reader actualiza su perfil         → esperado 1, obtenido %', v; END IF;

  -- P5: Reader NO puede actualizar perfil de otro usuario
  -- Esperado: 0 filas | RLS: auth.uid() = id es FALSE para w_id
  UPDATE public.profiles SET phone = '+99 999 999 999' WHERE id = w_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] P5 | Reader no actualiza perfil ajeno   → 0 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] P5 | Reader no actualiza perfil ajeno   → esperado 0, obtenido %', v; END IF;

  -- ======================================================
  -- ARTICLES (A1-A10)
  -- SELECT: públicos para todos; autor ve los suyos.
  -- INSERT/UPDATE/DELETE: solo el autor.
  -- ======================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- ARTICLES ---';

  -- A1: Anon solo ve artículos públicos (2 de 3)
  -- Esperado: 2 filas | RLS: is_public = TRUE
  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM set_config('request.jwt.claims', '{}', true);
  SELECT COUNT(*) INTO v FROM public.articles;
  IF v = 2 THEN pass := pass+1; RAISE NOTICE '[PASS] A1 | Anon ve solo artículos públicos    → 2 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] A1 | Anon ve artículos                 → esperado 2, obtenido %', v; END IF;

  -- A2: Anon NO ve artículo privado del writer
  -- Esperado: 0 filas | RLS: art3 tiene is_public=FALSE y anon no es el autor
  SELECT COUNT(*) INTO v FROM public.articles WHERE id = art3;
  IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] A2 | Anon no ve artículo privado        → 0 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] A2 | Anon no ve artículo privado        → esperado 0, obtenido %', v; END IF;

  -- A3: Reader ve solo artículos públicos (no es autor de ninguno)
  -- Esperado: 2 filas | RLS: is_public = TRUE OR author_id = r_id (ninguno)
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', r_id), true);
  SELECT COUNT(*) INTO v FROM public.articles;
  IF v = 2 THEN pass := pass+1; RAISE NOTICE '[PASS] A3 | Reader ve solo artículos públicos  → 2 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] A3 | Reader ve artículos               → esperado 2, obtenido %', v; END IF;

  -- A4: Writer ve sus 3 artículos incluido el privado
  -- Esperado: 3 filas | RLS: is_public = TRUE (2) OR author_id = w_id (3, incluye privado)
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', w_id), true);
  SELECT COUNT(*) INTO v FROM public.articles;
  IF v = 3 THEN pass := pass+1; RAISE NOTICE '[PASS] A4 | Writer ve sus 3 artículos          → 3 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] A4 | Writer ve artículos               → esperado 3, obtenido %', v; END IF;

  -- A5: Writer puede insertar artículo con su propio author_id
  -- Esperado: 1 fila insertada | RLS: auth.uid() = author_id
  INSERT INTO public.articles (author_id, title, is_public) VALUES (w_id, 'Artículo de prueba RLS', FALSE);
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] A5 | Writer inserta artículo            → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] A5 | Writer inserta artículo           → esperado 1, obtenido %', v; END IF;

  -- A6: Reader NO puede insertar con author_id ajeno
  -- Esperado: bloqueado | RLS WITH CHECK: auth.uid() = author_id es FALSE
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', r_id), true);
  BEGIN
    INSERT INTO public.articles (author_id, title, is_public) VALUES (w_id, 'Intento ilegal', FALSE);
    GET DIAGNOSTICS v = ROW_COUNT;
    IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] A6 | Reader no inserta con author_id ajeno → 0 filas';
    ELSE fail := fail+1; RAISE WARNING '[FAIL] A6 | Reader no inserta con author_id ajeno → % fila(s)', v; END IF;
  EXCEPTION WHEN OTHERS THEN
    pass := pass+1; RAISE NOTICE '[PASS] A6 | Reader no inserta con author_id ajeno → bloqueado por RLS';
  END;

  -- A7: Writer puede actualizar su propio artículo
  -- Esperado: 1 fila | RLS USING: auth.uid() = author_id
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', w_id), true);
  UPDATE public.articles SET summary = 'Actualizado en test RLS' WHERE id = art1;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] A7 | Writer actualiza su artículo       → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] A7 | Writer actualiza artículo         → esperado 1, obtenido %', v; END IF;

  -- A8: Reader NO puede actualizar artículo ajeno
  -- Esperado: 0 filas | RLS: auth.uid() = author_id es FALSE
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', r_id), true);
  UPDATE public.articles SET summary = 'Intento no autorizado' WHERE id = art1;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] A8 | Reader no actualiza artículo ajeno → 0 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] A8 | Reader no actualiza artículo ajeno → esperado 0, obtenido %', v; END IF;

  -- A9: Writer puede eliminar su propio artículo (el creado en A5)
  -- Esperado: 1 fila | RLS: auth.uid() = author_id
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', w_id), true);
  DELETE FROM public.articles WHERE author_id = w_id AND title = 'Artículo de prueba RLS';
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] A9 | Writer elimina su artículo         → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] A9 | Writer elimina artículo           → esperado 1, obtenido %', v; END IF;

  -- A10: Reader NO puede eliminar artículo ajeno
  -- Esperado: 0 filas | RLS: auth.uid() = author_id es FALSE
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', r_id), true);
  DELETE FROM public.articles WHERE id = art1;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] A10| Reader no elimina artículo ajeno   → 0 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] A10| Reader no elimina artículo ajeno  → esperado 0, obtenido %', v; END IF;

  -- ======================================================
  -- VIEWS (V1-V5)
  -- SELECT: admin o el autor del artículo.
  -- INSERT: autenticado con su propio user_id.
  -- ======================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- VIEWS ---';

  -- V1: Admin ve todas las vistas
  -- Esperado: 5 filas | RLS: is_admin() = TRUE
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', a_id), true);
  SELECT COUNT(*) INTO v FROM public.views;
  IF v = 5 THEN pass := pass+1; RAISE NOTICE '[PASS] V1 | Admin ve todas las vistas          → 5 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] V1 | Admin ve vistas                   → esperado 5, obtenido %', v; END IF;

  -- V2: Writer (autor de los artículos) ve todas las vistas de sus artículos
  -- Esperado: 5 filas | RLS: EXISTS(articles WHERE author_id = auth.uid())
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', w_id), true);
  SELECT COUNT(*) INTO v FROM public.views;
  IF v = 5 THEN pass := pass+1; RAISE NOTICE '[PASS] V2 | Writer ve vistas de sus artículos  → 5 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] V2 | Writer ve vistas                  → esperado 5, obtenido %', v; END IF;

  -- V3: Reader NO puede ver vistas (no es admin ni autor)
  -- Esperado: 0 filas | RLS: is_admin()=FALSE y no es autor de ningún artículo
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', r_id), true);
  SELECT COUNT(*) INTO v FROM public.views;
  IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] V3 | Reader no puede ver vistas         → 0 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] V3 | Reader no puede ver vistas        → esperado 0, obtenido %', v; END IF;

  -- V4: Authenticated registra vista con su propio user_id
  -- Esperado: 1 fila | RLS WITH CHECK: auth.uid() = user_id
  INSERT INTO public.views (article_id, user_id) VALUES (art1, r_id);
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] V4 | Reader registra su propia vista    → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] V4 | Reader registra vista             → esperado 1, obtenido %', v; END IF;

  -- V5: Authenticated NO puede registrar vista con user_id ajeno
  -- Esperado: bloqueado | RLS WITH CHECK: auth.uid() = user_id es FALSE para w_id
  BEGIN
    INSERT INTO public.views (article_id, user_id) VALUES (art1, w_id);
    GET DIAGNOSTICS v = ROW_COUNT;
    IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] V5 | Reader no registra vista ajena   → 0 filas';
    ELSE fail := fail+1; RAISE WARNING '[FAIL] V5 | Reader no registra vista ajena   → % fila(s)', v; END IF;
  EXCEPTION WHEN OTHERS THEN
    pass := pass+1; RAISE NOTICE '[PASS] V5 | Reader no registra vista ajena        → bloqueado por RLS';
  END;

  -- ======================================================
  -- LIKES (L1-L4)
  -- SELECT: público. INSERT: autenticado. DELETE: propietario.
  -- ======================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- LIKES ---';

  -- L1: Anon puede ver todos los likes (lectura pública para contadores)
  -- Esperado: 3 filas | RLS: USING (TRUE)
  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM set_config('request.jwt.claims', '{}', true);
  SELECT COUNT(*) INTO v FROM public.likes;
  IF v = 3 THEN pass := pass+1; RAISE NOTICE '[PASS] L1 | Anon ve todos los likes            → 3 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] L1 | Anon ve likes                     → esperado 3, obtenido %', v; END IF;

  -- L2: Authenticated puede dar like con su propio user_id
  -- Esperado: 1 fila | RLS WITH CHECK: auth.uid() = user_id
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', r_id), true);
  INSERT INTO public.likes (article_id, user_id) VALUES (art3, r_id);
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] L2 | Reader da like                     → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] L2 | Reader da like                    → esperado 1, obtenido %', v; END IF;

  -- L3: Reader puede eliminar su propio like
  -- Esperado: 1 fila | RLS: auth.uid() = user_id
  DELETE FROM public.likes WHERE article_id = art3 AND user_id = r_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] L3 | Reader elimina su like             → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] L3 | Reader elimina su like            → esperado 1, obtenido %', v; END IF;

  -- L4: Reader NO puede eliminar like de otro usuario
  -- Esperado: 0 filas | RLS: auth.uid() = user_id es FALSE para a_id
  DELETE FROM public.likes WHERE article_id = art1 AND user_id = a_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] L4 | Reader no elimina like ajeno       → 0 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] L4 | Reader no elimina like ajeno      → esperado 0, obtenido %', v; END IF;

  -- ======================================================
  -- COMMENTS (C1-C7)
  -- SELECT: público. INSERT: autenticado. UPDATE: autor.
  -- DELETE: autor O admin.
  -- ======================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- COMMENTS ---';

  -- C1: Anon puede ver todos los comentarios
  -- Esperado: 4 filas | RLS: USING (TRUE)
  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM set_config('request.jwt.claims', '{}', true);
  SELECT COUNT(*) INTO v FROM public.comments;
  IF v = 4 THEN pass := pass+1; RAISE NOTICE '[PASS] C1 | Anon ve todos los comentarios      → 4 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] C1 | Anon ve comentarios               → esperado 4, obtenido %', v; END IF;

  -- C2: Authenticated puede insertar comentario con su user_id
  -- Esperado: 1 fila | RLS WITH CHECK: auth.uid() = user_id
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', r_id), true);
  INSERT INTO public.comments (article_id, user_id, comment) VALUES (art1, r_id, 'Comentario de prueba RLS');
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] C2 | Reader inserta comentario          → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] C2 | Reader inserta comentario         → esperado 1, obtenido %', v; END IF;

  -- C3: Reader puede actualizar su propio comentario
  -- Esperado: 1 fila | RLS USING: auth.uid() = user_id
  UPDATE public.comments SET comment = 'Comentario editado RLS'
  WHERE article_id = art1 AND user_id = r_id AND comment = 'Comentario de prueba RLS';
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] C3 | Reader actualiza su comentario     → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] C3 | Reader actualiza su comentario    → esperado 1, obtenido %', v; END IF;

  -- C4: Reader NO puede actualizar comentario de otro usuario
  -- Esperado: 0 filas | RLS: auth.uid() = user_id es FALSE para a_id
  UPDATE public.comments SET comment = 'Intento no autorizado' WHERE article_id = art1 AND user_id = a_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] C4 | Reader no actualiza comentario ajeno → 0 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] C4 | Reader no actualiza comentario ajeno → esperado 0, obtenido %', v; END IF;

  -- C5: Reader puede eliminar su propio comentario
  -- Esperado: 1 fila | RLS: auth.uid() = user_id
  DELETE FROM public.comments WHERE article_id = art1 AND user_id = r_id AND comment = 'Comentario editado RLS';
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] C5 | Reader elimina su comentario       → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] C5 | Reader elimina su comentario      → esperado 1, obtenido %', v; END IF;

  -- C6: Admin puede eliminar comentario de otro usuario
  -- Setup: reader inserta comentario; luego admin lo elimina
  -- Esperado: 1 fila | RLS: is_admin() = TRUE
  INSERT INTO public.comments (article_id, user_id, comment) VALUES (art2, r_id, 'Para borrar por admin');
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', a_id), true);
  DELETE FROM public.comments WHERE article_id = art2 AND user_id = r_id AND comment = 'Para borrar por admin';
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] C6 | Admin elimina comentario ajeno     → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] C6 | Admin elimina comentario ajeno    → esperado 1, obtenido %', v; END IF;

  -- C7: Reader NO puede eliminar comentario del admin
  -- Esperado: 0 filas | RLS: auth.uid() = user_id es FALSE y is_admin()=FALSE
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', r_id), true);
  DELETE FROM public.comments WHERE article_id = art1 AND user_id = a_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] C7 | Reader no elimina comentario ajeno → 0 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] C7 | Reader no elimina comentario ajeno → esperado 0, obtenido %', v; END IF;

  -- ======================================================
  -- FAVORITES (F1-F5)
  -- Acceso exclusivo del propietario en SELECT/INSERT/DELETE.
  -- ======================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- FAVORITES ---';

  -- Setup: admin agrega un favorito para validar aislamiento en F2
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', a_id), true);
  INSERT INTO public.favorites (article_id, user_id) VALUES (art2, a_id);

  -- F1: Reader ve solo sus propios favoritos (2 del seed)
  -- Esperado: 2 filas | RLS: auth.uid() = user_id filtra solo los de reader
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', r_id), true);
  SELECT COUNT(*) INTO v FROM public.favorites;
  IF v = 2 THEN pass := pass+1; RAISE NOTICE '[PASS] F1 | Reader ve solo sus 2 favoritos     → 2 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] F1 | Reader ve favoritos               → esperado 2, obtenido %', v; END IF;

  -- F2: Reader NO puede ver favoritos del admin
  -- Esperado: 0 filas | RLS: auth.uid() = user_id oculta filas de a_id
  SELECT COUNT(*) INTO v FROM public.favorites WHERE user_id = a_id;
  IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] F2 | Reader no ve favoritos ajenos      → 0 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] F2 | Reader no ve favoritos ajenos     → esperado 0, obtenido %', v; END IF;

  -- F3: Reader puede agregar su propio favorito
  -- Esperado: 1 fila | RLS WITH CHECK: auth.uid() = user_id
  INSERT INTO public.favorites (article_id, user_id) VALUES (art3, r_id);
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] F3 | Reader agrega favorito             → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] F3 | Reader agrega favorito            → esperado 1, obtenido %', v; END IF;

  -- F4: Reader puede eliminar su propio favorito
  -- Esperado: 1 fila | RLS: auth.uid() = user_id
  DELETE FROM public.favorites WHERE article_id = art3 AND user_id = r_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 1 THEN pass := pass+1; RAISE NOTICE '[PASS] F4 | Reader elimina su favorito         → 1 fila';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] F4 | Reader elimina su favorito        → esperado 1, obtenido %', v; END IF;

  -- F5: Reader NO puede eliminar favorito de otro usuario
  -- Esperado: 0 filas | RLS: auth.uid() = user_id es FALSE para a_id
  DELETE FROM public.favorites WHERE article_id = art2 AND user_id = a_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v = 0 THEN pass := pass+1; RAISE NOTICE '[PASS] F5 | Reader no elimina favorito ajeno   → 0 filas';
  ELSE fail := fail+1; RAISE WARNING '[FAIL] F5 | Reader no elimina favorito ajeno  → esperado 0, obtenido %', v; END IF;

  -- ======================================================
  -- Rollback intencional: revierte todo el DML de prueba
  -- ======================================================
  RAISE EXCEPTION 'rls_test_rollback:% pass:% fail', pass, fail;

EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'rls_test_rollback:%' THEN
    DECLARE
      p INT := (regexp_match(SQLERRM, 'pass:(\d+)'))[1]::INT;
      f INT := (regexp_match(SQLERRM, 'fail:(\d+)'))[1]::INT;
    BEGIN
      RAISE NOTICE '';
      RAISE NOTICE '================================================';
      RAISE NOTICE '  RESULTADO: % / % tests pasaron', p, (p + f);
      IF f = 0 THEN
        RAISE NOTICE '  Todas las politicas RLS son correctas.';
      ELSE
        RAISE WARNING '  % test(s) fallaron. Revisar avisos anteriores.', f;
      END IF;
      RAISE NOTICE '  Todo el DML de prueba fue revertido.';
      RAISE NOTICE '================================================';
    END;
  ELSE
    RAISE WARNING 'Error inesperado: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END IF;
END;
$$ LANGUAGE plpgsql;
