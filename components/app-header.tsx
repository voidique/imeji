"use client"

import Link from "next/link"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { User } from "@/lib/types"

export function AppHeader({
  user,
  onSignOut,
  children,
}: {
  user: User | null
  onSignOut: () => void
  children?: React.ReactNode
}) {
  return (
    <header className="glass sticky top-0 z-10 mx-3 mt-3 flex h-14 items-center gap-3 rounded-2xl px-4">
      <Link
        href="/mindmaps"
        className="flex items-center gap-2 text-lg font-semibold tracking-tight"
      >
        <span className="grid size-5 grid-cols-2 gap-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="rounded-full bg-foreground"
              style={{ opacity: 0.5 + i * 0.15 }}
            />
          ))}
        </span>
        Imeji
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      {user ? (
        <span className="text-muted-foreground hidden text-sm sm:inline">
          {user.name || user.email}
        </span>
      ) : null}
      <Button variant="ghost" size="icon" onClick={onSignOut} title="Sign out">
        <LogOut className="size-4" />
      </Button>
    </header>
  )
}
