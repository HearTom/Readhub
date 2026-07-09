'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/user'
import {
  signIn as svcSignIn,
  signUp as svcSignUp,
  signOut as svcSignOut,
  getUser,
  getProfile,
  updateProfile as svcUpdateProfile,
  subscribeToAuthChanges,
  type SignUpPayload,
  type ProfileUpdates,
} from '@/services/auth.service'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
}

export interface UseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (payload: SignUpPayload) => Promise<string | null>
  signOut: () => Promise<string | null>
  updateProfile: (updates: ProfileUpdates) => Promise<string | null>
  clearError: () => void
}

export function useAuth(): UseAuthReturn {
  const client = useMemo(() => createClient(), [])

  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    async function init() {
      const userResult = await getUser(client)
      if (!mounted) return

      if (userResult.error || !userResult.data) {
        setState({ user: null, profile: null, loading: false, error: null })
        return
      }

      const user = userResult.data
      const profileResult = await getProfile(client, user.id)
      if (!mounted) return

      setState({
        user,
        profile: profileResult.data,
        loading: false,
        error: null,
      })
    }

    init()

    const sub = subscribeToAuthChanges(client, async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT' || !session) {
        setState({ user: null, profile: null, loading: false, error: null })
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const user = session.user
        const profileResult = await getProfile(client, user.id)
        if (!mounted) return
        setState((prev) => ({
          ...prev,
          user,
          profile: profileResult.data,
          loading: false,
          error: null,
        }))
      }
    })

    return () => {
      mounted = false
      sub.unsubscribe()
    }
  }, [client])

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const result = await svcSignIn(client, email, password)
      if (result.error) {
        setState((prev) => ({ ...prev, loading: false, error: result.error }))
        return result.error
      }
      // onAuthStateChange SIGNED_IN event completes the state update
      return null
    },
    [client],
  )

  const signUp = useCallback(
    async (payload: SignUpPayload): Promise<string | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const result = await svcSignUp(client, payload)
      if (result.error) {
        setState((prev) => ({ ...prev, loading: false, error: result.error }))
        return result.error
      }
      return null
    },
    [client],
  )

  const signOut = useCallback(async (): Promise<string | null> => {
    setState((prev) => ({ ...prev, loading: true }))
    const result = await svcSignOut(client)
    if (result.error) {
      setState((prev) => ({ ...prev, loading: false }))
      return result.error
    }
    // onAuthStateChange SIGNED_OUT event resets the state
    return null
  }, [client])

  const updateProfile = useCallback(
    async (updates: ProfileUpdates): Promise<string | null> => {
      if (!state.user) return 'No hay usuario autenticado'
      const result = await svcUpdateProfile(client, state.user.id, updates)
      if (result.error) return result.error
      setState((prev) => ({ ...prev, profile: result.data }))
      return null
    },
    [client, state.user],
  )

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return { ...state, signIn, signUp, signOut, updateProfile, clearError }
}
