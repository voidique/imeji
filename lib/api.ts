// Thin typed client over the imeji-server REST API.
// Stateless bearer auth: token persisted in localStorage, attached to every protected call.

import type {
  ApplyOpsResult,
  ChatMessage,
  Concept,
  CreateConceptInput,
  GenerateBody,
  GraphData,
  Mindmap,
  MindmapDetail,
  MindmapListItem,
  Op,
  UpdateConceptInput,
} from "@/lib/types"

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3005"

const TOKEN_KEY = "imeji_token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

type FetchOptions = {
  method?: string
  body?: unknown
  // skip auth header (used for sign-in/up where we may not yet have a token)
  auth?: boolean
  signal?: AbortSignal
}

/**
 * Core fetch wrapper.
 * - Attaches Bearer token by default.
 * - Always sends Content-Type: application/json when a body is present (server
 *   rejects non-json mutating requests with 403 CSRF).
 * - Throws ApiError on non-2xx, surfacing `{ error }` from the body when available.
 */
export async function apiFetch<T>(
  path: string,
  { method = "GET", body, auth = true, signal }: FetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {}

  if (auth) {
    const token = getToken()
    if (token) headers["Authorization"] = `Bearer ${token}`
  }

  // The server's CSRF guard rejects any mutating request that isn't
  // application/json — including bodyless DELETEs — so set it on every
  // non-GET/HEAD method regardless of whether a body is present.
  const mutating = method !== "GET" && method !== "HEAD"
  if (mutating) headers["Content-Type"] = "application/json"

  let payload: BodyInit | undefined
  if (body !== undefined) {
    payload = JSON.stringify(body)
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: payload,
    signal,
  })

  // 204 / empty body
  if (res.status === 204) return undefined as T

  const text = await res.text()
  const data = text ? safeJson(text) : undefined

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null) ?? res.statusText ?? "Request failed"
    throw new ApiError(res.status, message)
  }

  return data as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// ---------------------------------------------------------------------------
// Mindmaps
// ---------------------------------------------------------------------------

export function listMindmaps(
  params: { limit?: number; offset?: number } = {},
): Promise<{ items: MindmapListItem[] }> {
  const q = new URLSearchParams()
  if (params.limit != null) q.set("limit", String(params.limit))
  if (params.offset != null) q.set("offset", String(params.offset))
  const qs = q.toString()
  return apiFetch(`/api/mindmaps${qs ? `?${qs}` : ""}`)
}

/**
 * POST that returns the raw streaming Response (so callers can read headers and
 * consume a growing body). Attaches Bearer + json. Throws ApiError on non-OK,
 * surfacing `{ error }` from the body.
 */
async function postStream(path: string, body: unknown): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  const token = getToken()
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let message = res.statusText || "Request failed"
    try {
      const data = safeJson(await res.text())
      if (data && typeof data === "object" && "error" in data) {
        message = String((data as { error: unknown }).error)
      }
    } catch {
      // keep statusText
    }
    throw new ApiError(res.status, message)
  }
  return res
}

/** AI generation. Stream the growing { title, concepts } body; read x-mindmap-id. */
export function generateMindmapStream(body: GenerateBody): Promise<Response> {
  return postStream(`/api/mindmaps/generate`, body)
}

/** Map-grounded chat. Streams raw assistant text. Read-only. */
export function chatStream(body: {
  mapId: string | null
  messages: ChatMessage[]
}): Promise<Response> {
  return postStream(`/api/chat`, body)
}

/** AI edit proposal. Streams a growing { summary, ops } JSON. No mutation. */
export function assistStream(
  mapId: string,
  body: { instruction: string; selection?: string[] | null; messages?: ChatMessage[] | null },
): Promise<Response> {
  return postStream(`/api/mindmaps/${mapId}/assist`, body)
}

/** Apply edit ops transactionally; returns the updated map + full tree + idMap. */
export function applyOps(mapId: string, ops: Op[]): Promise<ApplyOpsResult> {
  return apiFetch(`/api/mindmaps/${mapId}/ops`, {
    method: "POST",
    body: { ops },
  })
}

export function createMindmap(title: string): Promise<Mindmap> {
  return apiFetch(`/api/mindmaps`, { method: "POST", body: { title } })
}

export function getMindmap(mapId: string): Promise<MindmapDetail> {
  return apiFetch(`/api/mindmaps/${mapId}`)
}

export function renameMindmap(mapId: string, title: string): Promise<Mindmap> {
  return apiFetch(`/api/mindmaps/${mapId}`, { method: "PATCH", body: { title } })
}

export function deleteMindmap(mapId: string): Promise<{ ok: true }> {
  return apiFetch(`/api/mindmaps/${mapId}`, { method: "DELETE" })
}

export function getMindmapMarkdown(mapId: string): Promise<string> {
  return apiFetch(`/api/mindmaps/${mapId}/markdown`)
}

export function getMindmapGraph(mapId: string): Promise<GraphData> {
  return apiFetch(`/api/mindmaps/${mapId}/graph`)
}

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

export function createConcept(
  mapId: string,
  input: CreateConceptInput,
): Promise<Concept> {
  return apiFetch(`/api/mindmaps/${mapId}/concepts`, {
    method: "POST",
    body: input,
  })
}

export function updateConcept(
  mapId: string,
  conceptId: string,
  input: UpdateConceptInput,
): Promise<Concept> {
  return apiFetch(`/api/mindmaps/${mapId}/concepts/${conceptId}`, {
    method: "PATCH",
    body: input,
  })
}

export function deleteConcept(
  mapId: string,
  conceptId: string,
): Promise<{ ok: true }> {
  return apiFetch(`/api/mindmaps/${mapId}/concepts/${conceptId}`, {
    method: "DELETE",
  })
}
