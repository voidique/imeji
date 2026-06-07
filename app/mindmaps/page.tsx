"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/hooks/use-auth"
import {
  ApiError,
  createMindmap,
  deleteMindmap,
  listMindmaps,
  renameMindmap,
} from "@/lib/api"
import type { MindmapListItem } from "@/lib/types"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

export default function MindmapsPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth("/login")

  const [items, setItems] = useState<MindmapListItem[] | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [renaming, setRenaming] = useState<MindmapListItem | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const { items } = await listMindmaps({ limit: 100 })
      setItems(items)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return // guard handles redirect
      toast.error(err instanceof ApiError ? err.message : "Couldn't load your maps.")
      setItems([])
    }
  }, [])

  useEffect(() => {
    // on-mount fetch; load() only setState()s after an await, so it isn't synchronous
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) load()
  }, [user, load])

  async function handleCreate(title: string) {
    setBusy(true)
    try {
      const map = await createMindmap(title)
      setCreateOpen(false)
      router.push(`/mindmaps/${map.id}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create the map.")
    } finally {
      setBusy(false)
    }
  }

  async function handleRename(id: string, title: string) {
    setBusy(true)
    try {
      await renameMindmap(id, title)
      setRenaming(null)
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't rename the map.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(item: MindmapListItem) {
    if (!confirm(`Delete "${item.title}"? All of its concepts will be deleted too.`))
      return
    try {
      await deleteMindmap(item.id)
      setItems((prev) => prev?.filter((m) => m.id !== item.id) ?? null)
      toast.success("Deleted.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the map.")
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-svh">
      <AppHeader user={user} onSignOut={signOut} />

      <main className="mx-auto max-w-5xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Your maps</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New map
          </Button>
        </div>

        {items === null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Card
                key={item.id}
                className="group hover:border-primary/50 cursor-pointer transition-colors"
                onClick={() => router.push(`/mindmaps/${item.id}`)}
              >
                <CardHeader className="flex-row items-start justify-between gap-2">
                  <CardTitle className="truncate text-base">{item.title}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="-mt-1 -mr-1 size-7">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem onSelect={() => setRenaming(item)}>
                        <Pencil className="size-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => handleDelete(item)}
                      >
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {item.conceptCount} concepts
                </CardContent>
                <CardFooter className="text-muted-foreground text-xs">
                  Updated {new Date(item.updatedAt).toLocaleDateString("en-US")}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      <TitleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New map"
        description="Name the topic you want to explore."
        confirmLabel="Create"
        busy={busy}
        onSubmit={handleCreate}
      />
      <TitleDialog
        open={renaming !== null}
        onOpenChange={(o) => !o && setRenaming(null)}
        title="Rename"
        description="Enter a new title."
        confirmLabel="Save"
        initialValue={renaming?.title ?? ""}
        busy={busy}
        onSubmit={(t) => renaming && handleRename(renaming.id, t)}
      />
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
      <p className="font-medium">No maps yet</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Create your first topic to start brainstorming.
      </p>
      <Button className="mt-4" onClick={onCreate}>
        <Plus className="size-4" /> New map
      </Button>
    </div>
  )
}

function TitleDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  initialValue = "",
  busy,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  initialValue?: string
  busy: boolean
  onSubmit: (value: string) => void
}) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    // reset the field to its initial value each time the dialog opens
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setValue(initialValue)
  }, [open, initialValue])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const v = value.trim()
            if (v) onSubmit(v)
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="my-4 flex flex-col gap-2">
            <Label htmlFor="map-title">Title</Label>
            <Input
              id="map-title"
              value={value}
              maxLength={200}
              autoFocus
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. Operating Systems"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy || !value.trim()}>
              {busy ? "Saving…" : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
