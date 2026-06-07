import Link from "next/link"

import { SiteFooter } from "@/components/site-footer"

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Link
          href="/"
          className="font-serif text-2xl font-medium tracking-tight"
        >
          Imeji
        </Link>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ← Back home
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 sm:py-24">
        <h1 className="font-serif text-5xl font-medium tracking-tight text-balance">
          {title}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Last updated {updated}
        </p>
        <div className="legal mt-12 flex flex-col gap-10">{children}</div>
      </main>

      <SiteFooter />
    </div>
  )
}

export function Section({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
      <div className="text-muted-foreground flex flex-col gap-3 leading-relaxed">
        {children}
      </div>
    </section>
  )
}
