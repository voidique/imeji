"use client"

import { useEffect, useRef, useState } from "react"
import { Allow, parse } from "partial-json"
import { toast } from "sonner"

import { ApiError, applyOps, assistStream, chatStream } from "@/lib/api"
import type {
  AssistProposal,
  ChatMessage,
  ConceptNode,
  MindmapDetail,
  Op,
} from "@/lib/types"
import { findNode } from "@/lib/tree"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Tab = "chat" | "edit"

export type AssistantSeed = {
  nonce: number
  text: string
  selection: string[]
}

// assist returns every Op key with null for "unset". /ops treats an explicit
// null (e.g. parentId:null) as a real value (move-to-root / clear), so strip
// null-valued keys before previewing and applying — null === unset.
function cleanOps(ops: Op[]): Op[] {
  return ops.map((o) => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(o)) if (v !== null) out[k] = v
    return out as unknown as Op
  })
}

export function AssistantPanel({
  mapId,
  tree,
  seed,
  onApplied,
  onPreview,
  onClose,
}: {
  mapId: string
  tree: ConceptNode[]
  seed: AssistantSeed | null
  onApplied: (detail: MindmapDetail) => void
  onPreview: (ops: Op[] | null) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>("chat")

  // chat state (lifted so Edit can reuse the conversation as context)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatBusy, setChatBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // edit state
  const [editInput, setEditInput] = useState("")
  const [selection, setSelection] = useState<string[]>([])
  const [proposing, setProposing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [proposal, setProposal] = useState<AssistProposal | null>(null)

  const ops = cleanOps((proposal?.ops ?? []).filter(Boolean) as Op[])

  // node -> Edit prefill (sync incoming seed into local form state)
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!seed) return
    setTab("edit")
    setEditInput(seed.text)
    setSelection(seed.selection)
    setProposal(null)
  }, [seed?.nonce])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // mirror the live proposal to the tree overlay
  useEffect(() => {
    onPreview(proposal ? ops : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal])

  // clear overlay on unmount
  useEffect(() => () => onPreview(null), []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function sendChat() {
    const content = chatInput.trim()
    if (!content || chatBusy) return
    const base = [...messages, { role: "user" as const, content }]
    setMessages([...base, { role: "assistant", content: "" }])
    setChatInput("")
    setChatBusy(true)
    try {
      const res = await chatStream({ mapId, messages: base })
      const reader = res.body?.getReader()
      const dec = new TextDecoder()
      if (reader)
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          const chunk = dec.decode(value, { stream: true })
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = {
              role: "assistant",
              content: next[next.length - 1].content + chunk,
            }
            return next
          })
        }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Chat failed.")
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setChatBusy(false)
    }
  }

  function handoff() {
    setTab("edit")
    if (!editInput.trim())
      setEditInput("Apply the suggestions from our conversation.")
  }

  async function propose() {
    const instruction = editInput.trim()
    if (!instruction || proposing) return
    setProposal({})
    setProposing(true)
    try {
      const res = await assistStream(mapId, {
        instruction,
        selection: selection.length ? selection : null,
        messages: messages.length ? messages : null,
      })
      const reader = res.body?.getReader()
      const dec = new TextDecoder()
      let buf = ""
      if (reader)
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          try {
            setProposal(parse(buf, Allow.ALL) as AssistProposal)
          } catch {
            // partial chunk
          }
        }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't propose changes.")
      setProposal(null)
    } finally {
      setProposing(false)
    }
  }

  async function apply() {
    if (!ops.length || applying) return
    if (
      ops.some((o) => o.op === "delete") &&
      !confirm("This will delete concepts and all of their children. Continue?")
    )
      return
    setApplying(true)
    try {
      const detail = await applyOps(mapId, ops)
      onApplied(detail)
      onPreview(null)
      setProposal(null)
      setEditInput("")
      setSelection([])
      toast.success("Changes applied.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't apply changes.")
    } finally {
      setApplying(false)
    }
  }

  function discard() {
    setProposal(null)
    onPreview(null)
  }

  return (
    <aside className="bg-card/40 flex h-svh w-96 shrink-0 flex-col border-l backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-2 border-b px-4">
        <div className="bg-muted/70 flex items-center gap-0.5 rounded-full p-1">
          {(
            [
              ["chat", "Chat"],
              ["edit", "Edit"],
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "rounded-full px-3.5 py-1 text-sm font-medium transition-colors",
                tab === k
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          Close
        </button>
      </div>

      {tab === "chat" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
          >
            {messages.length === 0 ? (
              <p className="text-muted-foreground mt-8 text-center text-sm text-balance">
                Ask anything about this map. Answers are grounded in your concepts.
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-sm leading-relaxed",
                    m.role === "user" ? "flex justify-end" : "",
                  )}
                >
                  <div
                    className={cn(
                      "whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-muted max-w-[85%] rounded-2xl px-3.5 py-2"
                        : "text-foreground",
                    )}
                  >
                    {m.content ||
                      (chatBusy && i === messages.length - 1 ? "…" : "")}
                  </div>
                </div>
              ))
            )}
          </div>

          {messages.length > 0 && !chatBusy && (
            <button
              onClick={handoff}
              className="text-muted-foreground hover:text-foreground border-t px-4 py-2 text-left text-xs transition-colors"
            >
              Turn this into edits →
            </button>
          )}

          <Composer
            value={chatInput}
            onChange={setChatInput}
            onSubmit={sendChat}
            busy={chatBusy}
            placeholder="Message…"
            cta="Send"
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {selection.length > 0 && (
              <p className="text-muted-foreground mb-3 text-xs">
                Focused on {selection.length} selected concept
                {selection.length > 1 ? "s" : ""}.
              </p>
            )}
            {proposal === null ? (
              <p className="text-muted-foreground mt-8 text-center text-sm text-balance">
                Describe a change and review it before applying. Example: “Add a
                Deadlock concept under Processes and mark Paging as known.”
              </p>
            ) : (
              <div className="space-y-4">
                {proposal.summary && (
                  <p className="text-sm leading-relaxed">{proposal.summary}</p>
                )}
                {proposing && !ops.length && (
                  <p className="text-muted-foreground animate-pulse text-sm">
                    Proposing changes…
                  </p>
                )}
                {ops.length > 0 && <OpsPreview ops={ops} tree={tree} />}
                {!proposing && ops.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    No changes proposed.
                  </p>
                )}
              </div>
            )}
          </div>

          {proposal && ops.length > 0 && !proposing ? (
            <div className="flex items-center gap-2 border-t p-3">
              <Button
                className="flex-1 rounded-full"
                disabled={applying}
                onClick={apply}
              >
                {applying
                  ? "Applying…"
                  : `Apply ${ops.length} change${ops.length > 1 ? "s" : ""}`}
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                disabled={applying}
                onClick={discard}
              >
                Discard
              </Button>
            </div>
          ) : (
            <Composer
              value={editInput}
              onChange={setEditInput}
              onSubmit={propose}
              busy={proposing}
              placeholder="Describe a change…"
              cta="Propose"
            />
          )}
        </div>
      )}
    </aside>
  )
}

function OpsPreview({ ops, tree }: { ops: Op[]; tree: ConceptNode[] }) {
  const tempLabels = new Map<string, string>()
  for (const o of ops) if (o.op === "add") tempLabels.set(o.tempId, o.label)
  const label = (id?: string | null) => {
    if (!id) return "root"
    return tempLabels.get(id) ?? findNode(tree, id)?.label ?? "—"
  }

  return (
    <ul className="space-y-1.5">
      {ops.map((o, i) => {
        let sign = ""
        let text = ""
        let tone = "text-muted-foreground"
        if (o.op === "add") {
          sign = "+"
          tone = "text-green-600 dark:text-green-400"
          text = `${o.label}  ·  under ${label(o.parentId)}`
        } else if (o.op === "delete") {
          sign = "−"
          tone = "text-destructive"
          text = label(o.id)
        } else if (o.op === "update") {
          sign = "~"
          tone = "text-amber-600 dark:text-amber-400"
          const parts: string[] = []
          if (o.label != null) parts.push(`label → ${o.label}`)
          if (o.mastery != null) parts.push(`mastery → ${o.mastery}`)
          if (o.detail !== undefined) parts.push("detail")
          if (o.parentId !== undefined) parts.push(`move → ${label(o.parentId)}`)
          text = `${label(o.id)}${parts.length ? `  (${parts.join(", ")})` : ""}`
        } else {
          sign = "→"
          text = `${label(o.id)}  ·  under ${label(o.parentId)}`
        }
        return (
          <li key={i} className="flex gap-2 text-sm">
            <span className={cn("w-3 shrink-0 font-medium", tone)}>{sign}</span>
            <span className="min-w-0 break-words">{text}</span>
          </li>
        )
      })}
    </ul>
  )
}

function Composer({
  value,
  onChange,
  onSubmit,
  busy,
  placeholder,
  cta,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  busy: boolean
  placeholder: string
  cta: string
}) {
  return (
    <div className="border-t p-3">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            onSubmit()
          }
        }}
      />
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          className="rounded-full"
          disabled={busy || !value.trim()}
          onClick={onSubmit}
        >
          {busy ? "…" : cta}
        </Button>
      </div>
    </div>
  )
}
