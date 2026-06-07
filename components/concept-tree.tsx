"use client"

import { useState } from "react"

import type { ConceptNode, Mastery, Op } from "@/lib/types"
import { findNode } from "@/lib/tree"
import { cn } from "@/lib/utils"

const MASTERY: Record<Mastery, { label: string; dot: string }> = {
  known: { label: "Known", dot: "bg-green-500" },
  learning: { label: "Learning", dot: "bg-amber-500" },
  unknown: { label: "Unknown", dot: "bg-zinc-400" },
}

export type TreeActions = {
  onAddChild: (parent: ConceptNode | null) => void
  onEdit: (node: ConceptNode) => void
  onDelete: (node: ConceptNode) => void
  onCycleMastery: (node: ConceptNode) => void
  onAssist?: (node: ConceptNode) => void
}

const ROOT_KEY = "__root__"

type Preview = {
  deleted: Set<string>
  updated: Set<string>
  adds: Map<string, string[]> // parentId | ROOT_KEY -> labels of ghost children
}

function buildPreview(ops: Op[] | null | undefined, tree: ConceptNode[]): Preview {
  const deleted = new Set<string>()
  const updated = new Set<string>()
  const adds = new Map<string, string[]>()
  if (!ops) return { deleted, updated, adds }
  const push = (key: string, label: string) =>
    adds.set(key, [...(adds.get(key) ?? []), label])
  for (const o of ops) {
    if (o.op === "delete") deleted.add(o.id)
    else if (o.op === "update") updated.add(o.id)
    else if (o.op === "add") {
      const p = o.parentId
      if (!p) push(ROOT_KEY, o.label)
      else if (findNode(tree, p)) push(p, o.label)
      // adds parented to a tempId (new under new) only appear after apply
    }
  }
  return { deleted, updated, adds }
}

export function ConceptTree({
  nodes,
  actions,
  preview,
}: {
  nodes: ConceptNode[]
  actions: TreeActions
  preview?: Op[] | null
}) {
  const pv = buildPreview(preview, nodes)
  return (
    <ul className="flex flex-col">
      {nodes.map((node) => (
        <TreeRow key={node.id} node={node} depth={0} actions={actions} pv={pv} />
      ))}
      <Ghosts labels={pv.adds.get(ROOT_KEY)} depth={0} />
    </ul>
  )
}

function TreeRow({
  node,
  depth,
  actions,
  pv,
}: {
  node: ConceptNode
  depth: number
  actions: TreeActions
  pv: Preview
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const m = MASTERY[node.mastery]
  const isDeleted = pv.deleted.has(node.id)
  const isUpdated = pv.updated.has(node.id)

  return (
    <li>
      <div
        className={cn(
          "group hover:bg-muted/70 relative flex items-center gap-1.5 rounded-md py-1 pr-1",
          isUpdated && "bg-amber-500/10",
        )}
        style={{ paddingLeft: depth * 14 + 2 }}
      >
        <button
          type="button"
          onClick={() => hasChildren && setExpanded((v) => !v)}
          className={cn(
            "text-muted-foreground/70 flex size-4 shrink-0 items-center justify-center text-xs transition-transform",
            expanded && "rotate-90",
            !hasChildren && "invisible",
          )}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          ›
        </button>

        <button
          type="button"
          onClick={() => actions.onCycleMastery(node)}
          title={`${m.label} — click to change`}
          className="flex size-4 shrink-0 items-center justify-center"
        >
          <span className={cn("size-2.5 rounded-full", m.dot)} />
        </button>

        <button
          type="button"
          onClick={() => actions.onEdit(node)}
          title="Edit concept"
          className={cn(
            "min-w-0 flex-1 cursor-pointer truncate text-left text-sm",
            isDeleted && "text-destructive line-through",
          )}
        >
          {node.label}
        </button>

        <div className="bg-muted absolute right-1 hidden items-center gap-2.5 rounded-md pr-1 pl-3 text-xs group-hover:flex">
          {actions.onAssist && (
            <button
              type="button"
              title="Edit with AI"
              onClick={() => actions.onAssist?.(node)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              AI
            </button>
          )}
          <button
            type="button"
            title="Add child"
            onClick={() => actions.onAddChild(node)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            title="Edit"
            onClick={() => actions.onEdit(node)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            title="Delete"
            onClick={() => actions.onDelete(node)}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {hasChildren && expanded ? (
        <ul className="flex flex-col">
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              actions={actions}
              pv={pv}
            />
          ))}
          <Ghosts labels={pv.adds.get(node.id)} depth={depth + 1} />
        </ul>
      ) : (
        <Ghosts labels={pv.adds.get(node.id)} depth={depth + 1} />
      )}
    </li>
  )
}

function Ghosts({ labels, depth }: { labels?: string[]; depth: number }) {
  if (!labels?.length) return null
  return (
    <>
      {labels.map((label, i) => (
        <li
          key={`ghost-${i}-${label}`}
          className="flex items-center gap-1.5 py-1 text-sm text-green-600 dark:text-green-400"
          style={{ paddingLeft: depth * 14 + 22 }}
        >
          <span className="w-3 shrink-0 font-medium">+</span>
          <span className="truncate italic">{label}</span>
        </li>
      ))}
    </>
  )
}
