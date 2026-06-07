"use client"

import { useEffect, useRef } from "react"

// markmap-view touches the DOM/window, so everything is loaded lazily in-effect.
type MarkmapInstance = {
  setData: (data: unknown) => void
  fit: () => Promise<void>
  destroy: () => void
}

export function MarkmapView({ markdown }: { markdown: string }) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const mmRef = useRef<MarkmapInstance | null>(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      const [{ Transformer }, { Markmap }] = await Promise.all([
        import("markmap-lib"),
        import("markmap-view"),
      ])
      if (cancelled || !svgRef.current) return

      const { root } = new Transformer().transform(markdown || "# (empty map)")

      if (!mmRef.current) {
        mmRef.current = Markmap.create(
          svgRef.current,
          undefined,
          root,
        ) as unknown as MarkmapInstance
      } else {
        mmRef.current.setData(root)
      }
      await mmRef.current.fit()
    }

    render()
    return () => {
      cancelled = true
    }
  }, [markdown])

  // tear down on unmount
  useEffect(() => {
    return () => {
      mmRef.current?.destroy()
      mmRef.current = null
    }
  }, [])

  return <svg ref={svgRef} className="h-full w-full" />
}
