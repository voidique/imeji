"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { getToken } from "@/lib/api"
import { DotImage } from "@/components/dot-image"
import { GraphShowcase } from "@/components/graph-showcase"
import { SiteFooter } from "@/components/site-footer"

const ART = [
  { src: "/art/parasol.jpg", alt: "Claude Monet, Woman with a Parasol", tint: "#7a9bc4" },
  { src: "/art/starry.jpg", alt: "Vincent van Gogh, The Starry Night", tint: "#2a3a6b" },
  { src: "/art/sunrise.jpg", alt: "Claude Monet, Impression, Sunrise", tint: "#b89169" },
  { src: "/art/galette.jpg", alt: "Renoir, Bal du moulin de la Galette", tint: "#9a7b5a" },
  { src: "/art/rhone.jpg", alt: "Van Gogh, Starry Night Over the Rhône", tint: "#27406b" },
  { src: "/art/lilies.jpg", alt: "Claude Monet, Water Lilies", tint: "#5a8a7a" },
]

export default function LandingPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    // read persisted token on mount to decide CTA destination
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(!!getToken())
  }, [])

  const start = () => router.push(authed ? "/mindmaps" : "/login")

  return (
    <div className="relative flex min-h-svh flex-col">
      {/* top bar */}
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="font-serif text-2xl font-medium tracking-tight">
          Imeji
        </span>
        <button
          onClick={start}
          className="clay-pill text-foreground focus-visible:ring-ring/40 h-10 rounded-full px-5 text-sm font-medium outline-none focus-visible:ring-4"
        >
          {authed ? "Open app" : "Sign in"}
        </button>
      </header>

      {/* hero */}
      <main className="flex flex-col items-center px-6 pt-20 text-center sm:pt-28">
        <h1 className="text-foreground font-serif text-5xl font-medium leading-[1.05] tracking-tight text-balance sm:text-7xl">
          Turn scattered ideas
          <br />
          into a single map
        </h1>

        <div className="mt-10">
          <button
            onClick={start}
            className="clay-pill text-foreground focus-visible:ring-ring/40 h-14 rounded-full px-9 text-base font-medium outline-none focus-visible:ring-4"
          >
            {authed ? "Open your maps" : "Get started"}
          </button>
        </div>

        {/* dot-assembled artwork grid */}
        <div className="mt-20 grid w-full max-w-5xl grid-cols-2 gap-4 sm:mt-24 sm:grid-cols-3 sm:gap-6">
          {ART.map((a, i) => (
            <div
              key={a.src}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5"
              style={{ backgroundColor: a.tint }}
            >
              <DotImage
                src={a.src}
                alt={a.alt}
                delay={i * 110}
                gap={6}
                dotRadius={2}
                className="h-full w-full"
              />
            </div>
          ))}
        </div>
      </main>

      {/* colorful knowledge-graph showcase */}
      <section className="mx-auto w-full max-w-6xl px-6 py-28 sm:py-36">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
            Your knowledge, connected
          </span>
          <h2 className="text-foreground mt-4 font-serif text-3xl font-medium tracking-tight text-balance sm:text-5xl">
            Watch the dots connect
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-md text-balance">
            Every concept becomes a node, every relationship an edge. Color shows
            how well you know each idea — green for mastered, amber for learning,
            gray for the unknown.
          </p>
        </div>

        <div className="bg-card/50 mt-14 overflow-hidden rounded-[28px] p-4 ring-1 ring-black/5 backdrop-blur-sm sm:p-8">
          <GraphShowcase className="h-auto w-full" />
        </div>
      </section>

      {/* manifesto */}
      <section className="mx-auto w-full max-w-4xl px-6 pb-28 sm:pb-36">
        <h2 className="text-foreground text-center font-serif text-3xl leading-[1.15] font-medium tracking-tight text-balance sm:text-5xl">
          Every big idea begins
          <br className="hidden sm:block" /> as a scattered thought.
        </h2>
        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-center text-balance">
          Imeji gathers those fragments, gives them shape, and lets you see how
          everything connects.
        </p>

        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.k} className="bg-card/60 px-7 py-9 backdrop-blur-sm">
              <span className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
                {s.k}
              </span>
              <h3 className="text-foreground mt-3 text-xl font-semibold tracking-tight">
                {s.title}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

const STEPS = [
  {
    k: "01 — Capture",
    title: "Jot it down",
    body: "Drop every concept as it comes to mind — no structure required up front.",
  },
  {
    k: "02 — Connect",
    title: "Link the dots",
    body: "Arrange concepts into a tree and watch scattered pieces become one context.",
  },
  {
    k: "03 — See it whole",
    title: "Zoom out",
    body: "Explore your knowledge as a mind map and a living, color-coded graph.",
  },
]
