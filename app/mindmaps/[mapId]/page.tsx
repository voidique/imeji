"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/hooks/use-auth"
import {
  ApiError,
  createConcept,
  deleteConcept,
  getMindmap,
  getMindmapGraph,
  getMindmapMarkdown,
  updateConcept,
} from "@/lib/api"
import type {
  ConceptNode,
  GraphData,
  Mastery,
  MindmapDetail,
} from "@/lib/types"
import { findNode } from "@/lib/tree"
import { AppHeader } from "@/components/app-header"
import { ConceptTree } from "@/components/concept-tree"
import {
  ConceptDialog,
  type ConceptDialogState,
  type ConceptFormValues,
} from "@/components/concept-dialog"
import { MarkmapView } from "@/components/markmap-view"
import { GraphView } from "@/components/graph-view"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

const MASTERY_CYCLE: Record<Mastery, Mastery> = {
  unknown: "learning",
  learning: "known",
  known: "unknown",
}

export default function MindmapDetailPage() {
  const params = useParams<{ mapId: string }>()
  const mapId = params.mapId
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth("/login")

  const [detail, setDetail] = useState<MindmapDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState("tree")
  const [dialog, setDialog] = useState<ConceptDialogState>(null)
  const [busy, setBusy] = useState(false)

  // bumped after every successful mutation to invalidate visualization fetches
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
    // on-mount fetch; loadTree() only setState()s after an await, so it isn't synchronous
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) loadTree()
  }, [user, loadTree])

  // lazy-load the active visualization, refetch when data changes
  useEffect(() => {
    if (!user || notFound) return
    if (tab === "markmap") {
      getMindmapMarkdown(mapId)
        .then(setMarkdown)
        .catch((err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't load the markdown.",
          ),
        )
    } else if (tab === "graph") {
      getMindmapGraph(mapId)
        .then(setGraph)
        .catch((err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't load the graph.",
          ),
        )
    }
  }, [tab, version, mapId, user, notFound])

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
    const childCount = node.children.length
    const msg = childCount
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
      await updateConcept(mapId, node.id, {
        mastery: MASTERY_CYCLE[node.mastery],
      })
      await afterMutation()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update mastery.")
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">
          This map doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Button variant="outline" onClick={() => router.push("/mindmaps")}>
          <ArrowLeft className="size-4" /> Back to maps
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-svh flex-col">
      <AppHeader user={user} onSignOut={signOut}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/mindmaps")}
          title="Back to maps"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="truncate text-base font-semibold">
          {detail?.title ?? "Loading…"}
        </span>
      </AppHeader>

      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <TabsList>
            <TabsTrigger value="tree">Tree</TabsTrigger>
            <TabsTrigger value="markmap">Mind map</TabsTrigger>
            <TabsTrigger value="graph">Knowledge graph</TabsTrigger>
          </TabsList>
          {tab === "tree" && (
            <Button
              size="sm"
              onClick={() => setDialog({ mode: "create", parent: null })}
            >
              <Plus className="size-4" /> Root concept
            </Button>
          )}
        </div>

        <TabsContent value="tree" className="min-h-0 flex-1 overflow-auto p-4">
          {!detail ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : detail.concepts.length === 0 ? (
            <div className="mx-auto mt-16 flex max-w-sm flex-col items-center text-center">
              <p className="font-medium">No concepts yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Add a root concept to start brainstorming.
              </p>
              <Button
                className="mt-4"
                onClick={() => setDialog({ mode: "create", parent: null })}
              >
                <Plus className="size-4" /> Add root concept
              </Button>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              <ConceptTree
                nodes={detail.concepts}
                actions={{
                  onAddChild: (parent) =>
                    setDialog({ mode: "create", parent }),
                  onEdit: (node) => setDialog({ mode: "edit", node }),
                  onDelete: handleDelete,
                  onCycleMastery: handleCycleMastery,
                }}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="markmap" className="min-h-0 flex-1">
          {markdown === null ? (
            <CenterLoading />
          ) : (
            <MarkmapView markdown={markdown} />
          )}
        </TabsContent>

        <TabsContent value="graph" className="min-h-0 flex-1">
          {graph === null ? (
            <CenterLoading />
          ) : graph.nodes.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Nothing to show yet.
              </p>
            </div>
          ) : (
            <GraphView data={graph} />
          )}
        </TabsContent>
      </Tabs>

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

function CenterLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading…</p>
    </div>
  )
}
