import { describe, it, expect, vi } from 'vitest'
import {
  signIn,
  signUp,
  signOut,
  getUser,
  getProfile,
  updateProfile,
  subscribeToAuthChanges,
} from './auth.service'
import { createQueryBuilder } from './test/supabase-mock'

function authClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      ...overrides,
    },
    from: vi.fn(),
  } as any
}

describe('signIn', () => {
  it('devuelve el usuario en caso de éxito', async () => {
    const user = { id: 'u1' }
    const client = authClient({ signInWithPassword: vi.fn().mockResolvedValue({ data: { user }, error: null }) })

    const result = await signIn(client, 'a@b.com', 'secret')

    expect(result).toEqual({ data: user, error: null })
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' })
  })

  it('devuelve el mensaje de error de Supabase', async () => {
    const client = authClient({
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'credenciales inválidas' } }),
    })

    const result = await signIn(client, 'a@b.com', 'mala')

    expect(result).toEqual({ data: null, error: 'credenciales inválidas' })
  })

  it('usa un mensaje por defecto si no hay error explícito pero tampoco usuario', async () => {
    const client = authClient({ signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) })

    const result = await signIn(client, 'a@b.com', 'x')

    expect(result).toEqual({ data: null, error: 'Error al iniciar sesión' })
  })
})

describe('signUp', () => {
  const payload = { email: 'a@b.com', password: 'secret', birth_date: '2000-01-01', phone: '123' }

  it('no actualiza el perfil si no hay sesión inmediata (confirmación de email pendiente)', async () => {
    const client = authClient({
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null }),
    })

    const result = await signUp(client, payload)

    expect(result).toEqual({ data: { id: 'u1' }, error: null })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('actualiza birth_date y phone del perfil si hay sesión inmediata', async () => {
    const client = authClient({
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' }, session: { access_token: 'x' } }, error: null }),
    })
    const builder = createQueryBuilder({ data: null, error: null })
    client.from.mockReturnValueOnce(builder)

    await signUp(client, payload)

    expect(client.from).toHaveBeenCalledWith('profiles')
    expect(builder.update).toHaveBeenCalledWith({ birth_date: payload.birth_date, phone: payload.phone })
    expect(builder.eq).toHaveBeenCalledWith('id', 'u1')
  })

  it('no falla el signUp aunque el update del perfil falle', async () => {
    const client = authClient({
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' }, session: { access_token: 'x' } }, error: null }),
    })
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: 'update falló' } }))

    const result = await signUp(client, payload)

    expect(result).toEqual({ data: { id: 'u1' }, error: null })
  })

  it('devuelve el error cuando signUp falla', async () => {
    const client = authClient({ signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'email ya registrado' } }) })

    const result = await signUp(client, payload)

    expect(result).toEqual({ data: null, error: 'email ya registrado' })
  })
})

describe('signOut', () => {
  it('devuelve error null en éxito', async () => {
    const client = authClient({ signOut: vi.fn().mockResolvedValue({ error: null }) })
    expect(await signOut(client)).toEqual({ error: null })
  })

  it('propaga el mensaje de error', async () => {
    const client = authClient({ signOut: vi.fn().mockResolvedValue({ error: { message: 'falló' } }) })
    expect(await signOut(client)).toEqual({ error: 'falló' })
  })
})

describe('getUser', () => {
  it('devuelve el usuario (o null) sin tratarlo como error cuando no hay sesión', async () => {
    const client = authClient({ getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) })
    expect(await getUser(client)).toEqual({ data: null, error: null })
  })

  it('propaga el error del servidor', async () => {
    const client = authClient({ getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'token expirado' } }) })
    expect(await getUser(client)).toEqual({ data: null, error: 'token expirado' })
  })
})

describe('getProfile', () => {
  it('devuelve el perfil encontrado', async () => {
    const client = { from: vi.fn(), auth: {} } as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: { id: 'u1', role: 'reader' }, error: null }))

    const result = await getProfile(client, 'u1')

    expect(result).toEqual({ data: { id: 'u1', role: 'reader' }, error: null })
  })

  it('usa un mensaje por defecto cuando no hay perfil', async () => {
    const client = { from: vi.fn(), auth: {} } as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    const result = await getProfile(client, 'u1')

    expect(result).toEqual({ data: null, error: 'Perfil no encontrado' })
  })
})

describe('updateProfile', () => {
  it('devuelve el perfil actualizado', async () => {
    const client = { from: vi.fn(), auth: {} } as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: { id: 'u1', phone: '999' }, error: null }))

    const result = await updateProfile(client, 'u1', { phone: '999' })

    expect(result).toEqual({ data: { id: 'u1', phone: '999' }, error: null })
  })

  it('usa un mensaje por defecto cuando falla sin error explícito', async () => {
    const client = { from: vi.fn(), auth: {} } as any
    client.from.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    const result = await updateProfile(client, 'u1', {})

    expect(result).toEqual({ data: null, error: 'Error al actualizar el perfil' })
  })
})

describe('subscribeToAuthChanges', () => {
  it('se suscribe con el callback dado y expone unsubscribe', () => {
    const unsubscribe = vi.fn()
    const callback = vi.fn()
    const client = authClient({
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe } } }),
    })

    const sub = subscribeToAuthChanges(client, callback)
    sub.unsubscribe()

    expect(client.auth.onAuthStateChange).toHaveBeenCalledWith(callback)
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
