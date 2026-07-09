import type { User, Session } from '@supabase/supabase-js'
import type { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/user'
import type { ServiceResult } from './types'

// Usar el tipo exacto que devuelve createBrowserClient<Database>,
// cuyo schema hace fallback a 'any' (no 'never') cuando Database
// no satisface GenericSchema al 100%.
type Client = ReturnType<typeof createClient>

// ─────────────────────────────────────────────────────────────────────────────
// SIGN IN
// ─────────────────────────────────────────────────────────────────────────────

export async function signIn(
  client: Client,
  email: string,
  password: string
): Promise<ServiceResult<User>> {
  const { data, error } = await client.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return { data: null, error: error?.message ?? 'Error al iniciar sesión' }
  }
  return { data: data.user, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGN UP
// Crea el usuario en auth.users; el trigger handle_new_user crea el perfil
// con role='reader'. Si hay sesión inmediata, actualiza birth_date y phone.
// ─────────────────────────────────────────────────────────────────────────────

export interface SignUpPayload {
  email: string
  password: string
  birth_date: string
  phone: string
}

export async function signUp(
  client: Client,
  payload: SignUpPayload
): Promise<ServiceResult<User>> {
  const { data, error } = await client.auth.signUp({
    email: payload.email,
    password: payload.password,
  })

  if (error || !data.user) {
    return { data: null, error: error?.message ?? 'No se pudo crear el usuario' }
  }

  // Si la confirmación de email está deshabilitada, data.session existe
  // y podemos actualizar el perfil inmediatamente.
  if (data.session) {
    await client
      .from('profiles')
      .update({ birth_date: payload.birth_date, phone: payload.phone } as never)
      .eq('id', data.user.id)
    // No falla el signup si el update del perfil falla
  }

  return { data: data.user, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────────────────────────────────────

export async function signOut(client: Client): Promise<{ error: string | null }> {
  const { error } = await client.auth.signOut()
  return { error: error?.message ?? null }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET CURRENT USER
// Verifica con el servidor (no usa solo la sesión local).
// ─────────────────────────────────────────────────────────────────────────────

export async function getUser(client: Client): Promise<ServiceResult<User | null>> {
  const { data, error } = await client.auth.getUser()

  if (error) return { data: null, error: error.message }
  return { data: data.user, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET PROFILE
// RLS profiles_select_own: solo el propio usuario puede leer su perfil.
// ─────────────────────────────────────────────────────────────────────────────

export async function getProfile(
  client: Client,
  userId: string
): Promise<ServiceResult<Profile>> {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Perfil no encontrado' }
  }
  return { data: data as Profile, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfileUpdates {
  birth_date?: string | null
  phone?: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIBE TO AUTH STATE CHANGES
// Encapsula client.auth.onAuthStateChange para que useAuth no llame al SDK
// directamente (mantiene la capa Hooks → Services → Supabase).
// ─────────────────────────────────────────────────────────────────────────────

export type AuthStateCallback = (event: string, session: Session | null) => void | Promise<void>

export function subscribeToAuthChanges(
  client: Client,
  callback: AuthStateCallback
): { unsubscribe: () => void } {
  const { data: { subscription } } = client.auth.onAuthStateChange(callback)
  return { unsubscribe: () => subscription.unsubscribe() }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProfile(
  client: Client,
  userId: string,
  updates: ProfileUpdates
): Promise<ServiceResult<Profile>> {
  const { data, error } = await client
    .from('profiles')
    .update(updates as never)
    .eq('id', userId)
    .select()
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Error al actualizar el perfil' }
  }
  return { data: data as Profile, error: null }
}
