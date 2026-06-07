"use client"

import { useLayoutEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"

import type { GraphData, Mastery } from "@/lib/types"

// react-force-graph-2d relies on the canvas/DOM — never render on the server.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
})

const MASTERY_COLOR: Record<Mastery, string> = {
  known: "#22c55e", // green
  learning: "#f59e0b", // amber
  unknown: "#9ca3af", // gray
}

export function GraphView({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    // measure synchronously on mount so the canvas gets a non-zero size
    // immediately, then keep it in sync with ResizeObserver.
    const rect = el.getBoundingClientRect()
    setSize({ width: rect.width, height: rect.height })
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r) setSize({ width: r.width, height: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {size.width > 0 && (
        <ForceGraph2D
          graphData={data}
          width={size.width}
          height={size.height}
          nodeLabel="name"
          nodeRelSize={6}
          linkColor={() => "rgba(120,120,120,0.4)"}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as {
              x?: number
              y?: number
              name?: string
              group?: Mastery
            }
            const label = n.name ?? ""
            const color = MASTERY_COLOR[n.group ?? "learning"]
            const x = n.x ?? 0
            const y = n.y ?? 0

            ctx.beginPath()
            ctx.arc(x, y, 5, 0, 2 * Math.PI)
            ctx.fillStyle = color
            ctx.fill()

            const fontSize = 12 / globalScale
            ctx.font = `${fontSize}px sans-serif`
            ctx.textAlign = "center"
            ctx.textBaseline = "top"
            ctx.fillStyle = "rgba(130,130,130,0.95)"
            ctx.fillText(label, x, y + 7)
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const n = node as { x?: number; y?: number }
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(n.x ?? 0, n.y ?? 0, 8, 0, 2 * Math.PI)
            ctx.fill()
          }}
        />
      )}
      <Legend />
    </div>
  )
}

function Legend() {
  return (
    <div className="bg-background/80 absolute bottom-3 left-3 flex gap-3 rounded-md border px-3 py-2 text-xs backdrop-blur">
      {(
        [
          ["known", "Known"],
          ["learning", "Learning"],
          ["unknown", "Unknown"],
        ] as [Mastery, string][]
      ).map(([m, label]) => (
        <span key={m} className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: MASTERY_COLOR[m] }}
          />
          {label}
        </span>
      ))}
    </div>
  )
}
