"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Allow, parse } from "partial-json"
import { toast } from "sonner"

import { useAuth } from "@/hooks/use-auth"
import { ApiError, generateMindmapStream } from "@/lib/api"
import type {
  ExtractResult,
  GeneratedNode,
  GeneratedTree,
  GenerateSource,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Mode = "file" | "text" | "youtube"

export default function NewMindmapPage() {
  const router = useRouter()
  useAuth("/login")

  const [mode, setMode] = useState<Mode>("file")
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState("")
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const fileInput = useRef<HTMLInputElement | null>(null)

  const [phase, setPhase] = useState<"idle" | "extracting" | "generating">(
    "idle",
  )
  const [tree, setTree] = useState<GeneratedTree | null>(null)

  const busy = phase !== "idle"

  async function extract(): Promise<{
    content: string
    source: GenerateSource
  }> {
    if (mode === "text") {
      const t = text.trim()
      if (!t) throw new Error("Paste some text first.")
      const content = title.trim() ? `# ${title.trim()}\n\n${t}` : t
      return { content, source: { kind: "text", origin: null, lang: null } }
    }

    const fd = new FormData()
    if (mode === "file") {
      if (!file) throw new Error("Choose a file to import.")
      fd.append("file", file)
    } else {
      if (!url.trim()) throw new Error("Paste a YouTube URL.")
      fd.append("url", url.trim())
    }
    setPhase("extracting")
    const res = await fetch("/api/extract", { method: "POST", body: fd })
    const data = (await res.json()) as ExtractResult & { error?: string }
    if (!res.ok) throw new Error(data.error || "Couldn't read that source.")
    return {
      content: data.content,
      source: { kind: data.kind, origin: data.origin, lang: null },
    }
  }

  async function handleGenerate() {
    if (busy) return
    try {
      const { content, source } = await extract()

      setPhase("generating")
      setTree({})
      const res = await generateMindmapStream({
        title: title.trim() || null,
        source,
        content,
      })
      const mapId = res.headers.get("x-mindmap-id")

      let final: GeneratedTree = {}
      const reader = res.body?.getReader()
      if (reader) {
        const decoder = new TextDecoder()
        let buf = ""
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          try {
            final = parse(buf, Allow.ALL) as GeneratedTree
            setTree(final)
          } catch {
            // partial chunk not parseable yet — keep accumulating
          }
        }
      }

      // Empty generation persists nothing (the id 404s). Don't strand the user
      // on a missing map — surface it and let them retry.
      if (!final.concepts?.length) {
        throw new Error(
          "The source didn't yield any concepts. Try a longer or clearer source.",
        )
      }

      toast.success("Mind map created.")
      router.replace(mapId ? `/mindmaps/${mapId}` : "/mindmaps")
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Generation failed.",
      )
      setPhase("idle")
      setTree(null)
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Link
          href="/mindmaps"
          className="font-serif text-2xl font-medium tracking-tight"
        >
          Imeji
        </Link>
        <Link
          href="/mindmaps"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ← Back to maps
        </Link>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-4xl font-medium tracking-tight">
            Generate a mind map
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm text-balance">
            Drop in a document, paste text, or link a YouTube video. AI turns it
            into a concept map you can edit.
          </p>
        </div>

        {phase === "generating" || tree ? (
          <GeneratingView tree={tree} />
        ) : (
          <div className="flex flex-col gap-5">
            {/* mode picker */}
            <div className="bg-muted/70 grid grid-cols-3 gap-1 rounded-full p-1">
              {(
                [
                  { k: "file", label: "Upload" },
                  { k: "text", label: "Text" },
                  { k: "youtube", label: "YouTube" },
                ] as const
              ).map((it) => (
                <button
                  key={it.k}
                  onClick={() => setMode(it.k)}
                  className={cn(
                    "rounded-full py-2 text-sm font-medium transition-colors",
                    mode === it.k
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {it.label}
                </button>
              ))}
            </div>

            {mode === "file" && (
              <div>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,.pptx,.docx,.hwpx,.txt,.md,.markdown"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button
                  onClick={() => fileInput.current?.click()}
                  className="hover:border-foreground/30 hover:bg-muted/40 flex w-full flex-col items-center gap-1.5 rounded-2xl border border-dashed py-12 transition-colors"
                >
                  <span className="text-sm font-medium">
                    {file ? file.name : "Choose a file"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    PDF, PPTX, DOCX, HWPX, or TXT
                  </span>
                </button>
              </div>
            )}

            {mode === "text" && (
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="Paste the text you want to map…"
              />
            )}

            {mode === "youtube" && (
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                inputMode="url"
              />
            )}

            <div className="flex flex-col gap-2">
              <label className="text-muted-foreground text-xs font-medium">
                Title (optional — AI derives one if empty)
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Operating Systems"
                maxLength={200}
              />
            </div>

            <Button
              size="lg"
              className="mt-1 h-12 rounded-full text-base"
              onClick={handleGenerate}
            >
              Generate
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

function GeneratingView({ tree }: { tree: GeneratedTree | null }) {
  const concepts = tree?.concepts ?? []
  return (
    <div className="flex flex-col gap-5">
      <div className="text-muted-foreground animate-pulse text-center text-sm">
        {concepts.length ? "Building your map…" : "Reading your source…"}
      </div>

      {tree?.title && (
        <h2 className="text-center font-serif text-2xl font-medium tracking-tight">
          {tree.title}
        </h2>
      )}

      {concepts.length > 0 && (
        <div className="bg-card/50 rounded-2xl border p-5">
          <GenTree nodes={concepts} />
        </div>
      )}
    </div>
  )
}

function GenTree({ nodes }: { nodes: GeneratedNode[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {nodes.map((n, i) => (
        <li key={i}>
          <div className="flex items-start gap-2">
            <span className="bg-foreground/40 mt-1.5 size-1.5 shrink-0 rounded-full" />
            <div className="min-w-0">
              <span className="text-sm">{n.label || "…"}</span>
              {n.detail && (
                <p className="text-muted-foreground text-xs">{n.detail}</p>
              )}
            </div>
          </div>
          {n.children && n.children.length > 0 && (
            <div className="border-border/60 mt-1 ml-2 border-l pl-3">
              <GenTree nodes={n.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
