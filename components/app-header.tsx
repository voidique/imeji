"use client"

import Link from "next/link"

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
        className="font-serif text-xl font-medium tracking-tight"
      >
        Imeji
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      {user ? (
        <span className="text-muted-foreground hidden text-sm sm:inline">
          {user.name || user.email}
        </span>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={onSignOut}
      >
        Sign out
      </Button>
    </header>
  )
}
