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

// ---------------------------------------------------------------------------
// AI generation
// ---------------------------------------------------------------------------

export type SourceKind =
  | "text"
  | "pdf"
  | "pptx"
  | "docx"
  | "hwpx"
  | "youtube"

export type GenerateSource = {
  kind: SourceKind
  origin?: string | null
  lang?: string | null
}

export type GenerateBody = {
  title?: string | null
  source: GenerateSource
  content: string
}

// /api/extract response (frontend server route)
export type ExtractResult = {
  kind: SourceKind
  origin: string | null
  content: string
}

// Streamed concept tree (no id/mastery/position yet — depth <= 4)
export type GeneratedNode = {
  label?: string
  detail?: string
  children?: GeneratedNode[]
}

export type GeneratedTree = {
  title?: string
  concepts?: GeneratedNode[]
}

// ---------------------------------------------------------------------------
// AI chat & edit (assist / ops)
// ---------------------------------------------------------------------------

export type ChatMessage = { role: "user" | "assistant"; content: string }

export type Op =
  | {
      op: "add"
      tempId: string
      parentId?: string | null
      label: string
      detail?: string | null
      mastery?: Mastery
      position?: number
    }
  | {
      op: "update"
      id: string
      label?: string
      detail?: string | null
      mastery?: Mastery
      parentId?: string | null
      position?: number
    }
  | { op: "delete"; id: string }
  | { op: "move"; id: string; parentId?: string | null; position?: number }

// streamed proposal from /assist (fields fill in incrementally)
export type AssistProposal = { summary?: string; ops?: Op[] }

// /ops response = updated map + full tree + created-id mapping
export type ApplyOpsResult = MindmapDetail & {
  idMap?: Record<string, string>
}
