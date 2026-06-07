"use client"

import { useEffect, useState } from "react"

import type { ConceptNode, Mastery } from "@/lib/types"
import { MASTERY_VALUES } from "@/lib/types"
import { flattenTree, getSubtreeIds } from "@/lib/tree"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MASTERY_LABEL: Record<Mastery, string> = {
  unknown: "Unknown",
  learning: "Learning",
  known: "Known",
}

const ROOT_VALUE = "__root__"

export type ConceptFormValues = {
  label: string
  detail: string
  mastery: Mastery
  parentId: string | null
}

export type ConceptDialogState =
  | { mode: "create"; parent: ConceptNode | null }
  | { mode: "edit"; node: ConceptNode }
  | null

export function ConceptDialog({
  state,
  tree,
  busy,
  onClose,
  onSubmit,
}: {
  state: ConceptDialogState
  tree: ConceptNode[]
  busy: boolean
  onClose: () => void
  onSubmit: (values: ConceptFormValues) => void
}) {
  const [label, setLabel] = useState("")
  const [detail, setDetail] = useState("")
  const [mastery, setMastery] = useState<Mastery>("learning")
  const [parentId, setParentId] = useState<string | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect -- sync dialog props into form state on open */
  useEffect(() => {
    if (!state) return
    if (state.mode === "create") {
      setLabel("")
      setDetail("")
      setMastery("learning")
      setParentId(state.parent?.id ?? null)
    } else {
      setLabel(state.node.label)
      setDetail(state.node.detail ?? "")
      setMastery(state.node.mastery)
      setParentId(state.node.parentId)
    }
  }, [state])
  /* eslint-enable react-hooks/set-state-in-effect */

  // For edit mode, exclude the node itself and its descendants (no cycles).
  const excluded =
    state?.mode === "edit" ? getSubtreeIds(state.node) : new Set<string>()
  const parentOptions = flattenTree(tree).filter((o) => !excluded.has(o.id))

  const isEdit = state?.mode === "edit"
  const title = isEdit ? "Edit concept" : "Add concept"

  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = label.trim()
            if (!trimmed) return
            onSubmit({
              label: trimmed,
              detail: detail.trim(),
              mastery,
              parentId,
            })
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Edit this concept's content, position, and mastery."
                : state?.mode === "create" && state.parent
                  ? `Add a child concept under "${state.parent.label}".`
                  : "Add a root concept."}
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-label">Label</Label>
              <Input
                id="c-label"
                value={label}
                maxLength={500}
                autoFocus
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Concept name"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="c-detail">Detail (optional)</Label>
              <Textarea
                id="c-detail"
                value={detail}
                maxLength={5000}
                rows={3}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Add more detail about this concept"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Mastery</Label>
                <Select
                  value={mastery}
                  onValueChange={(v) => setMastery(v as Mastery)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MASTERY_VALUES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MASTERY_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Parent</Label>
                <Select
                  value={parentId ?? ROOT_VALUE}
                  onValueChange={(v) =>
                    setParentId(v === ROOT_VALUE ? null : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROOT_VALUE}>(Root)</SelectItem>
                    {parentOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {" ".repeat(o.depth * 2)}
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={busy || !label.trim()}>
              {busy ? "Saving…" : isEdit ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
