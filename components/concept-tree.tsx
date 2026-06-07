"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"

import type { ConceptNode, Mastery } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const MASTERY_META: Record<Mastery, { label: string; className: string }> = {
  known: {
    label: "Known",
    className: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  },
  learning: {
    label: "Learning",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  unknown: {
    label: "Unknown",
    className: "border-zinc-400/40 bg-zinc-400/10 text-zinc-600 dark:text-zinc-400",
  },
}

export type TreeActions = {
  onAddChild: (parent: ConceptNode | null) => void
  onEdit: (node: ConceptNode) => void
  onDelete: (node: ConceptNode) => void
  onCycleMastery: (node: ConceptNode) => void
}

export function ConceptTree({
  nodes,
  actions,
}: {
  nodes: ConceptNode[]
  actions: TreeActions
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {nodes.map((node) => (
        <TreeRow key={node.id} node={node} depth={0} actions={actions} />
      ))}
    </ul>
  )
}

function TreeRow({
  node,
  depth,
  actions,
}: {
  node: ConceptNode
  depth: number
  actions: TreeActions
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const mastery = MASTERY_META[node.mastery]

  return (
    <li>
      <div
        className="group hover:bg-muted/60 flex items-center gap-1 rounded-md py-1 pr-1"
        style={{ paddingLeft: depth * 20 }}
      >
        <button
          type="button"
          onClick={() => hasChildren && setExpanded((v) => !v)}
          className={cn(
            "text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded",
            !hasChildren && "invisible",
          )}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>

        <span className="min-w-0 flex-1 truncate text-sm">{node.label}</span>

        <button
          type="button"
          onClick={() => actions.onCycleMastery(node)}
          title="Change mastery"
        >
          <Badge
            variant="outline"
            className={cn("shrink-0 cursor-pointer text-xs", mastery.className)}
          >
            {mastery.label}
          </Badge>
        </button>

        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
          <IconBtn title="Add child" onClick={() => actions.onAddChild(node)}>
            <Plus className="size-4" />
          </IconBtn>
          <IconBtn title="Edit" onClick={() => actions.onEdit(node)}>
            <Pencil className="size-4" />
          </IconBtn>
          <IconBtn title="Delete" onClick={() => actions.onDelete(node)} destructive>
            <Trash2 className="size-4" />
          </IconBtn>
        </div>
      </div>

      {node.detail ? (
        <p
          className="text-muted-foreground truncate py-0.5 text-xs"
          style={{ paddingLeft: depth * 20 + 28 }}
        >
          {node.detail}
        </p>
      ) : null}

      {hasChildren && expanded ? (
        <ul className="flex flex-col gap-0.5">
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              actions={actions}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function IconBtn({
  children,
  onClick,
  title,
  destructive,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  destructive?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-7", destructive && "hover:text-destructive")}
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
