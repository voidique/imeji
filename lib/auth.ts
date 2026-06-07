// better-auth (bearer plugin) client helpers.
// Token comes back in the response body `token` (and `set-auth-token` header);
// we persist the body token and attach it as Bearer on every protected call.

import { apiFetch, clearToken, setToken } from "@/lib/api"
import type { User } from "@/lib/types"

type AuthResponse = { token: string; user: User }

export async function signUp(input: {
  email: string
  password: string
  name: string
}): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>("/api/auth/sign-up/email", {
    method: "POST",
    body: input,
    auth: false,
  })
  if (res.token) setToken(res.token)
  return res
}

export async function signIn(input: {
  email: string
  password: string
}): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>("/api/auth/sign-in/email", {
    method: "POST",
    body: input,
    auth: false,
  })
  if (res.token) setToken(res.token)
  return res
}

export async function signOut(): Promise<void> {
  try {
    await apiFetch("/api/auth/sign-out", { method: "POST", body: {} })
  } catch {
    // ignore network/None — clearing the local token is what matters
  } finally {
    clearToken()
  }
}

// GET /me -> { user, session } (null, null if unauthenticated)
export async function getMe(): Promise<{
  user: User | null
  session: unknown | null
}> {
  return apiFetch("/me")
}
