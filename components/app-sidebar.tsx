"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ApiError, createMindmap, listMindmaps } from "@/lib/api"
import type { MindmapListItem, User } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export function AppSidebar({
  activeMapId,
  user,
  onSignOut,
  children,
}: {
  activeMapId?: string
  user: User | null
  onSignOut: () => void
  children?: React.ReactNode
}) {
  const router = useRouter()
  const [maps, setMaps] = useState<MindmapListItem[] | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      const { items } = await listMindmaps({ limit: 100 })
      setMaps(items)
    } catch {
      setMaps([])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  async function newMap() {
    setCreating(true)
    try {
      const map = await createMindmap("Untitled map")
      router.push(`/mindmaps/${map.id}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create the map.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <aside className="bg-card/40 flex h-svh w-72 shrink-0 flex-col border-r backdrop-blur-sm">
      {/* brand */}
      <div className="flex h-14 items-center px-5">
        <Link
          href="/"
          className="font-serif text-xl font-medium tracking-tight"
        >
          Imeji
        </Link>
      </div>

      {/* maps */}
      <div className="flex max-h-[38%] flex-col px-3 pt-1 pb-3">
        <div className="mb-1 flex items-center justify-between px-2">
          <span className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase">
            Maps
          </span>
          <div className="flex items-center gap-2.5 text-xs">
            <Link
              href="/mindmaps/new"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Generate
            </Link>
            <button
              onClick={newMap}
              disabled={creating}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              New
            </button>
          </div>
        </div>
        <nav className="-mr-1 flex flex-col gap-0.5 overflow-y-auto pr-1">
          {maps === null ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))
          ) : maps.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-sm">No maps yet.</p>
          ) : (
            maps.map((m) => (
              <Link
                key={m.id}
                href={`/mindmaps/${m.id}`}
                className={cn(
                  "truncate rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  m.id === activeMapId
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                title={m.title}
              >
                {m.title}
              </Link>
            ))
          )}
        </nav>
      </div>

      {/* concepts slot */}
      <div className="flex min-h-0 flex-1 flex-col border-t">{children}</div>

      {/* footer */}
      <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
        {user ? (
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
            {user.name || user.email}
          </span>
        ) : (
          <Skeleton className="h-4 w-24 rounded" />
        )}
        <button
          onClick={onSignOut}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
