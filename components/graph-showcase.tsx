/**
 * A colorful, abundant knowledge-graph showcase — mirrors the look of the real
 * force-graph view (mastery-colored nodes, gray links, labels) but is a curated,
 * deterministic SVG so it always renders crisp on the landing page.
 */

type M = "known" | "learning" | "unknown"

const COLOR: Record<M, string> = {
  known: "#22c55e",
  learning: "#f59e0b",
  unknown: "#9ca3af",
}

// deterministic jitter so SSR and client match
const j = (i: number, s: number) => Math.sin(i * 999.7 + s) * 0.5 + 0.5
// round so the server- and client-rendered SVG attribute strings are identical
// (irrational floats serialize differently and trip hydration)
const r2 = (v: number) => Math.round(v * 100) / 100

type Cluster = { label: string; x: number; y: number; n: number; seed: number }

const CLUSTERS: Cluster[] = [
  { label: "Operating Systems", x: 200, y: 175, n: 6, seed: 1 },
  { label: "Machine Learning", x: 470, y: 120, n: 7, seed: 2 },
  { label: "Web Architecture", x: 760, y: 200, n: 6, seed: 3 },
  { label: "Design Systems", x: 320, y: 380, n: 6, seed: 4 },
  { label: "Databases", x: 640, y: 400, n: 6, seed: 5 },
]

const MASTERIES: M[] = ["known", "learning", "unknown"]

type Node = {
  id: string
  x: number
  y: number
  r: number
  m: M
  label?: string
  center?: boolean
}

function build() {
  const nodes: Node[] = []
  const edges: [string, string][] = []
  const centers: string[] = []

  CLUSTERS.forEach((c, ci) => {
    const cid = `c${ci}`
    nodes.push({
      id: cid,
      x: c.x,
      y: c.y,
      r: 9,
      m: "known",
      label: c.label,
      center: true,
    })
    centers.push(cid)

    for (let i = 0; i < c.n; i++) {
      const ang = (i / c.n) * Math.PI * 2 + c.seed
      const dist = 58 + j(i, c.seed) * 42
      const x = r2(c.x + Math.cos(ang) * dist)
      const y = r2(c.y + Math.sin(ang) * dist * 0.8)
      const id = `${cid}-${i}`
      nodes.push({
        id,
        x,
        y,
        r: r2(4.5 + j(i, c.seed + 5) * 2.5),
        m: MASTERIES[(i + ci) % 3],
      })
      edges.push([cid, id])
      // occasional child→child link for richness
      if (i > 0 && j(i, c.seed + 9) > 0.55)
        edges.push([`${cid}-${i - 1}`, id])
    }
  })

  // backbone between cluster centers
  edges.push(
    ["c0", "c1"],
    ["c1", "c2"],
    ["c1", "c3"],
    ["c3", "c4"],
    ["c4", "c2"],
    ["c0", "c3"],
  )
  return { nodes, edges }
}

const { nodes, edges } = build()
const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))

export function GraphShowcase({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 920 520"
      className={className}
      role="img"
      aria-label="A knowledge graph of interconnected concepts"
    >
      {edges.map(([a, b], i) => {
        const na = byId[a]
        const nb = byId[b]
        return (
          <line
            key={i}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke="currentColor"
            className="text-foreground/15"
            strokeWidth={na.center && nb.center ? 1.6 : 1}
          />
        )
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={COLOR[n.m]}
            stroke="var(--background)"
            strokeWidth={1.5}
          />
          {n.label && (
            <text
              x={n.x}
              y={n.y + n.r + 15}
              textAnchor="middle"
              className="fill-foreground/70"
              fontSize="13"
              fontWeight="500"
            >
              {n.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
