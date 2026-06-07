"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { forceCollide } from "d3"

import type { GraphData, Mastery } from "@/lib/types"

// react-force-graph-2d relies on the canvas/DOM — never render on the server.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
})

const MASTERY_COLOR: Record<Mastery, string> = {
  known: "#22c55e",
  learning: "#f59e0b",
  unknown: "#9ca3af",
}

type GNode = {
  id: string
  name: string
  group: Mastery
  val: number
  x?: number
  y?: number
}

const nodeR = (n: GNode) => Math.sqrt(n.val) * 3 + 3

export function GraphView({
  data,
  onNodeClick,
}: {
  data: GraphData
  onNodeClick?: (id: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hover, setHover] = useState<string | null>(null)
  const [dark, setDark] = useState(false)
  const [fontFamily, setFontFamily] = useState(
    "Pretendard Variable, ui-sans-serif, sans-serif",
  )

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setDark(document.documentElement.classList.contains("dark"))
    setFontFamily(getComputedStyle(el).fontFamily)
    const rect = el.getBoundingClientRect()
    setSize({ width: rect.width, height: rect.height })
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r) setSize({ width: r.width, height: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // size nodes by degree; copy so the force sim doesn't mutate props
  const graphData = useMemo(() => {
    const degree: Record<string, number> = {}
    for (const l of data.links) {
      degree[l.source] = (degree[l.source] ?? 0) + 1
      degree[l.target] = (degree[l.target] ?? 0) + 1
    }
    return {
      nodes: data.nodes.map((n) => ({ ...n, val: 1 + (degree[n.id] ?? 0) })),
      links: data.links.map((l) => ({ ...l })),
    }
  }, [data])

  // spread nodes out + add collision so labels/nodes don't pile up
  useEffect(() => {
    let raf = 0
    let tries = 0
    const apply = () => {
      const fg = fgRef.current
      if (!fg) {
        if (tries++ < 90) raf = requestAnimationFrame(apply)
        return
      }
      fg.d3Force("charge")?.strength(-340)
      fg.d3Force("link")?.distance(90).strength(0.55)
      fg.d3Force(
        "collide",
        forceCollide((n: GNode) => nodeR(n) + 18).strength(0.9),
      )
      fg.d3ReheatSimulation?.()
    }
    apply()
    return () => cancelAnimationFrame(raf)
  }, [graphData])

  const ring = dark ? "rgba(24,24,24,0.95)" : "rgba(255,255,255,0.95)"
  const labelColor = dark ? "rgba(228,228,228,0.92)" : "rgba(40,40,40,0.9)"
  const labelStrong = dark ? "rgba(245,245,245,1)" : "rgba(15,15,15,1)"
  const labelBg = dark ? "rgba(20,20,20,0.82)" : "rgba(250,250,250,0.85)"
  const linkColor = dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {size.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={5}
          cooldownTicks={140}
          onEngineStop={() => fgRef.current?.zoomToFit(600, 50)}
          linkColor={() => linkColor}
          linkWidth={1}
          onNodeClick={(n) => onNodeClick?.((n as GNode).id)}
          onNodeHover={(n) => setHover((n as GNode | null)?.id ?? null)}
          nodeCanvasObject={(raw, ctx, scale) => {
            const node = raw as GNode
            const x = node.x ?? 0
            const y = node.y ?? 0
            const r = nodeR(node)
            const color = MASTERY_COLOR[node.group ?? "learning"]
            const isHover = hover === node.id

            if (isHover) {
              ctx.beginPath()
              ctx.arc(x, y, r + 4, 0, 2 * Math.PI)
              ctx.fillStyle = color + "33"
              ctx.fill()
            }
            ctx.beginPath()
            ctx.arc(x, y, r, 0, 2 * Math.PI)
            ctx.fillStyle = color
            ctx.fill()
            ctx.lineWidth = 1.5
            ctx.strokeStyle = ring
            ctx.stroke()

            // declutter: only label hubs + everything once zoomed in (or hovered)
            if (!(isHover || scale > 0.6 || node.val >= 3)) return

            const fontSize = Math.max(12 / scale, 2)
            ctx.font = `500 ${fontSize}px ${fontFamily}`
            ctx.textAlign = "center"
            ctx.textBaseline = "top"
            const tw = ctx.measureText(node.name).width
            const padX = 5 / scale
            const padY = 3 / scale
            const ly = y + r + 4 / scale
            // background pill keeps the label readable over nodes/links/other labels
            ctx.fillStyle = labelBg
            ctx.beginPath()
            ctx.roundRect(
              x - tw / 2 - padX,
              ly - padY,
              tw + padX * 2,
              fontSize + padY * 2,
              4 / scale,
            )
            ctx.fill()
            ctx.fillStyle = isHover ? labelStrong : labelColor
            ctx.fillText(node.name, x, ly)
          }}
          nodePointerAreaPaint={(raw, color, ctx) => {
            const node = raw as GNode
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(node.x ?? 0, node.y ?? 0, nodeR(node) + 2, 0, 2 * Math.PI)
            ctx.fill()
          }}
        />
      )}

      {/* zoom / fit controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-1">
        <Ctrl title="Zoom in" onClick={() => zoomBy(fgRef, 1.3)}>
          +
        </Ctrl>
        <Ctrl title="Zoom out" onClick={() => zoomBy(fgRef, 1 / 1.3)}>
          −
        </Ctrl>
        <Ctrl
          title="Fit to view"
          onClick={() => fgRef.current?.zoomToFit(400, 50)}
        >
          <span className="text-[10px] font-medium">Fit</span>
        </Ctrl>
      </div>

      <Legend />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function zoomBy(fgRef: React.RefObject<any>, factor: number) {
  const fg = fgRef.current
  if (!fg) return
  fg.zoom(fg.zoom() * factor, 250)
}

function Ctrl({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="glass text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-lg transition-colors"
    >
      {children}
    </button>
  )
}

function Legend() {
  return (
    <div className="glass text-muted-foreground absolute bottom-4 left-4 flex gap-3 rounded-full px-3.5 py-2 text-xs">
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
