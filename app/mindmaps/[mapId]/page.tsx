"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { useAuth } from "@/hooks/use-auth"
import {
  ApiError,
  createConcept,
  deleteConcept,
  getMindmap,
  getMindmapGraph,
  getMindmapMarkdown,
  renameMindmap,
  updateConcept,
} from "@/lib/api"
import type {
  ConceptNode,
  GraphData,
  Mastery,
  MindmapDetail,
  Op,
} from "@/lib/types"
import { findNode } from "@/lib/tree"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { AssistantPanel, type AssistantSeed } from "@/components/assistant-panel"
import { ConceptTree } from "@/components/concept-tree"
import {
  ConceptDialog,
  type ConceptDialogState,
  type ConceptFormValues,
} from "@/components/concept-dialog"
import { MarkmapView } from "@/components/markmap-view"
import { GraphView } from "@/components/graph-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

const MASTERY_CYCLE: Record<Mastery, Mastery> = {
  unknown: "learning",
  learning: "known",
  known: "unknown",
}

type View = "map" | "graph"

export default function MindmapDetailPage() {
  const params = useParams<{ mapId: string }>()
  const mapId = params.mapId
  const router = useRouter()
  const { user, signOut } = useAuth("/login")

  const [detail, setDetail] = useState<MindmapDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [view, setView] = useState<View>("graph")
  const [dialog, setDialog] = useState<ConceptDialogState>(null)
  const [busy, setBusy] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantSeed, setAssistantSeed] = useState<AssistantSeed | null>(null)
  const [previewOps, setPreviewOps] = useState<Op[] | null>(null)

  function assistNode(node: ConceptNode) {
    setAssistantOpen(true)
    setAssistantSeed((prev) => ({
      nonce: (prev?.nonce ?? 0) + 1,
      text: `Expand "${node.label}" with concrete subtopics.`,
      selection: [node.id],
    }))
  }

  const [version, setVersion] = useState(0)
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [graph, setGraph] = useState<GraphData | null>(null)

  const loadTree = useCallback(async () => {
    try {
      const d = await getMindmap(mapId)
      setDetail(d)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true)
        return
      }
      if (err instanceof ApiError && err.status === 401) return
      toast.error(err instanceof ApiError ? err.message : "Couldn't load this map.")
    }
  }, [mapId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) loadTree()
  }, [user, loadTree])

  // reset transient state when switching maps
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetail(null)
    setNotFound(false)
    setMarkdown(null)
    setGraph(null)
  }, [mapId])

  // lazy-load the active visualization, refetch when data changes
  useEffect(() => {
    if (!user || notFound) return
    if (view === "map") {
      getMindmapMarkdown(mapId)
        .then(setMarkdown)
        .catch((err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't load the markdown.",
          ),
        )
    } else {
      getMindmapGraph(mapId)
        .then(setGraph)
        .catch((err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't load the graph.",
          ),
        )
    }
  }, [view, version, mapId, user, notFound])

  const afterMutation = useCallback(async () => {
    await loadTree()
    setVersion((v) => v + 1)
  }, [loadTree])

  function countSiblings(parentId: string | null): number {
    if (!detail) return 0
    if (parentId === null) return detail.concepts.length
    const parent = findNode(detail.concepts, parentId)
    return parent?.children.length ?? 0
  }

  async function handleSubmit(values: ConceptFormValues) {
    if (!dialog) return
    setBusy(true)
    try {
      if (dialog.mode === "create") {
        await createConcept(mapId, {
          label: values.label,
          detail: values.detail || null,
          parentId: values.parentId,
          mastery: values.mastery,
          position: countSiblings(values.parentId),
        })
        toast.success("Concept added.")
      } else {
        await updateConcept(mapId, dialog.node.id, {
          label: values.label,
          detail: values.detail || null,
          parentId: values.parentId,
          mastery: values.mastery,
        })
        toast.success("Concept updated.")
      }
      setDialog(null)
      await afterMutation()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save the concept.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(node: ConceptNode) {
    const msg = node.children.length
      ? `Delete "${node.label}" and all of its children?`
      : `Delete "${node.label}"?`
    if (!confirm(msg)) return
    try {
      await deleteConcept(mapId, node.id)
      toast.success("Deleted.")
      await afterMutation()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the concept.")
    }
  }

  async function handleCycleMastery(node: ConceptNode) {
    try {
      await updateConcept(mapId, node.id, { mastery: MASTERY_CYCLE[node.mastery] })
      await afterMutation()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update mastery.")
    }
  }

  async function saveTitle(next: string) {
    setEditingTitle(false)
    const title = next.trim()
    if (!detail || !title || title === detail.title) return
    try {
      await renameMindmap(mapId, title)
      setDetail({ ...detail, title })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't rename the map.")
    }
  }

  const empty = detail && detail.concepts.length === 0

  return (
    <div className="flex h-svh overflow-hidden">
      <AppSidebar activeMapId={mapId} user={user} onSignOut={signOut}>
        {/* concepts section */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase">
            Concepts
          </span>
          <button
            onClick={() => setDialog({ mode: "create", parent: null })}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Add
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {!detail ? (
            <div className="flex flex-col gap-1.5 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded-md" />
              ))}
            </div>
          ) : detail.concepts.length === 0 ? (
            <p className="text-muted-foreground px-2 py-3 text-sm">
              No concepts yet. Add a root concept to begin.
            </p>
          ) : (
            <ConceptTree
              nodes={detail.concepts}
              preview={previewOps}
              actions={{
                onAddChild: (parent) => setDialog({ mode: "create", parent }),
                onEdit: (node) => setDialog({ mode: "edit", node }),
                onDelete: handleDelete,
                onCycleMastery: handleCycleMastery,
                onAssist: assistNode,
              }}
            />
          )}
        </div>
      </AppSidebar>

      {/* main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* toolbar */}
        <div className="flex h-14 items-center justify-between gap-3 border-b px-5">
          <div className="min-w-0 flex-1">
            {editingTitle && detail ? (
              <Input
                autoFocus
                defaultValue={detail.title}
                className="h-9 max-w-xs text-base font-medium"
                onBlur={(e) => saveTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle(e.currentTarget.value)
                  if (e.key === "Escape") setEditingTitle(false)
                }}
              />
            ) : detail ? (
              <button
                onClick={() => setEditingTitle(true)}
                className="hover:bg-muted -mx-2 block max-w-full truncate rounded-md px-2 py-1 font-serif text-xl font-medium tracking-tight transition-colors"
                title="Rename"
              >
                {detail.title}
              </button>
            ) : (
              <Skeleton className="h-7 w-48 rounded-md" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Segmented value={view} onChange={setView} />
            <Button
              variant={assistantOpen ? "secondary" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setAssistantOpen((o) => !o)}
            >
              Assistant
            </Button>
          </div>
        </div>

        {/* content */}
        <div className="relative min-h-0 flex-1">
          {notFound ? (
            <NotFound onBack={() => router.push("/mindmaps")} />
          ) : empty ? (
            <EmptyState
              onAdd={() => setDialog({ mode: "create", parent: null })}
            />
          ) : view === "map" ? (
            markdown === null ? (
              <ContentSkeleton />
            ) : (
              <MarkmapView markdown={markdown} />
            )
          ) : graph === null || graph.nodes.length === 0 ? (
            <ContentSkeleton />
          ) : (
            <GraphView
              data={graph}
              onNodeClick={(id) => {
                const node = detail && findNode(detail.concepts, id)
                if (node) setDialog({ mode: "edit", node })
              }}
            />
          )}
        </div>
      </main>

      {assistantOpen && (
        <AssistantPanel
          mapId={mapId}
          tree={detail?.concepts ?? []}
          seed={assistantSeed}
          onApplied={(d) => {
            setDetail(d)
            setVersion((v) => v + 1)
          }}
          onPreview={setPreviewOps}
          onClose={() => setAssistantOpen(false)}
        />
      )}

      <ConceptDialog
        state={dialog}
        tree={detail?.concepts ?? []}
        busy={busy}
        onClose={() => setDialog(null)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

function Segmented({
  value,
  onChange,
}: {
  value: View
  onChange: (v: View) => void
}) {
  const items: { key: View; label: string }[] = [
    { key: "map", label: "Mind map" },
    { key: "graph", label: "Graph" },
  ]
  return (
    <div className="bg-muted/70 flex shrink-0 items-center gap-0.5 rounded-full p-1">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            value === it.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-3xl font-medium tracking-tight">
        Start your map
      </p>
      <p className="text-muted-foreground mt-2 max-w-xs text-sm text-balance">
        Add your first concept and watch it grow into a tree and a graph.
      </p>
      <Button className="mt-5 rounded-full" onClick={onAdd}>
        Add a concept
      </Button>
    </div>
  )
}

function ContentSkeleton() {
  // node-like pulses hinting the graph/map is loading (no blocking text)
  const sizes = ["size-16", "size-24", "size-12", "size-20", "size-14"]
  return (
    <div className="flex h-full items-center justify-center gap-6">
      {sizes.map((s, i) => (
        <Skeleton key={i} className={cn(s, "rounded-full")} />
      ))}
    </div>
  )
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <p className="text-muted-foreground">
        This map doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Button variant="outline" className="rounded-full" onClick={onBack}>
        Back to maps
      </Button>
    </div>
  )
}
