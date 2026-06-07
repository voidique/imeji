"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { clearToken, getToken } from "@/lib/api"
import { getMe, signOut as doSignOut } from "@/lib/auth"
import type { User } from "@/lib/types"

type AuthState = {
  user: User | null
  loading: boolean
}

/**
 * Client auth state. Verifies the persisted bearer token against /me.
 * When `redirectTo` is set, an unauthenticated user is pushed there.
 */
export function useAuth(redirectTo?: string) {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    let active = true

    async function load() {
      if (!getToken()) {
        if (active) setState({ user: null, loading: false })
        if (redirectTo) router.replace(redirectTo)
        return
      }
      try {
        const { user } = await getMe()
        if (!active) return
        // Stale/invalid token: /me succeeds but returns no user. Drop the token
        // so /login won't bounce us straight back here (redirect loop).
        if (!user) clearToken()
        setState({ user, loading: false })
        if (!user && redirectTo) router.replace(redirectTo)
      } catch {
        if (!active) return
        clearToken()
        setState({ user: null, loading: false })
        if (redirectTo) router.replace(redirectTo)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [redirectTo, router])

  const signOut = useCallback(async () => {
    await doSignOut()
    setState({ user: null, loading: false })
    router.replace("/login")
  }, [router])

  return { ...state, signOut }
}
