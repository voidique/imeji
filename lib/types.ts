// Domain types — mirror of imeji-server LLM CONTEXT SPEC.

export type Mastery = "unknown" | "learning" | "known"

export type User = {
  id: string
  email: string
  name: string
  [key: string]: unknown
}

export type Mindmap = {
  id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
}

export type Concept = {
  id: string
  mapId: string
  parentId: string | null
  label: string
  detail: string | null
  mastery: Mastery
  position: number
  createdAt: string
  updatedAt: string
}

export type ConceptNode = Concept & { children: ConceptNode[] }

// GET /api/mindmaps list item
export type MindmapListItem = {
  id: string
  title: string
  conceptCount: number
  createdAt: string
  updatedAt: string
}

// GET /api/mindmaps/:mapId — tree form
export type MindmapDetail = Mindmap & { concepts: ConceptNode[] }

// GET /api/mindmaps/:mapId/graph
export type GraphData = {
  nodes: Array<{ id: string; name: string; group: Mastery }>
  links: Array<{ source: string; target: string }>
}

// Request bodies
export type CreateConceptInput = {
  label: string
  detail?: string | null
  parentId?: string | null
  mastery?: Mastery
  position?: number
}

export type UpdateConceptInput = {
  label?: string
  detail?: string | null
  parentId?: string | null
  mastery?: Mastery
  position?: number
}

export const MASTERY_VALUES: Mastery[] = ["unknown", "learning", "known"]
