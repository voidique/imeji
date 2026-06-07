"use client"

import { useEffect, useRef } from "react"

/**
 * Renders an image as a field of dots that scatter in and converge into place
 * — echoing imeji's node/graph motif. Samples the source image on a grid and
 * animates each dot from a random position to its pixel target.
 *
 * Requires the image to be CORS-enabled (crossOrigin anonymous) so the canvas
 * stays readable.
 */
export function DotImage({
  src,
  alt,
  className,
  gap = 6,
  dotRadius = 2,
  delay = 0,
}: {
  src: string
  alt?: string
  className?: string
  gap?: number
  dotRadius?: number
  delay?: number
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let raf = 0
    let cancelled = false
    let started = false
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches

    type P = { tx: number; ty: number; x: number; y: number; c: string }
    let particles: P[] = []
    let W = 0
    let H = 0
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    img.crossOrigin = "anonymous"

    function build() {
      const rect = container!.getBoundingClientRect()
      W = Math.round(rect.width)
      H = Math.round(rect.height)
      if (!W || !H) return
      canvas!.width = W * dpr
      canvas!.height = H * dpr
      canvas!.style.width = `${W}px`
      canvas!.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const off = document.createElement("canvas")
      off.width = W
      off.height = H
      const octx = off.getContext("2d", { willReadFrequently: true })!
      // cover-fit the source into the tile
      const ir = img.width / img.height
      const cr = W / H
      let dw, dh, dx, dy
      if (ir > cr) {
        dh = H
        dw = H * ir
        dx = (W - dw) / 2
        dy = 0
      } else {
        dw = W
        dh = W / ir
        dx = 0
        dy = (H - dh) / 2
      }
      octx.drawImage(img, dx, dy, dw, dh)
      const data = octx.getImageData(0, 0, W, H).data

      particles = []
      for (let y = gap / 2; y < H; y += gap) {
        for (let x = gap / 2; x < W; x += gap) {
          const i = (Math.floor(y) * W + Math.floor(x)) * 4
          if (data[i + 3] < 128) continue
          particles.push({
            tx: x,
            ty: y,
            x: reduce ? x : W / 2 + (Math.random() - 0.5) * W * 1.6,
            y: reduce ? y : H / 2 + (Math.random() - 0.5) * H * 1.6,
            c: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
          })
        }
      }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H)
      let moving = false
      for (const p of particles) {
        p.x += (p.tx - p.x) * 0.1
        p.y += (p.ty - p.y) * 0.1
        if (Math.abs(p.tx - p.x) > 0.4 || Math.abs(p.ty - p.y) > 0.4)
          moving = true
        ctx.fillStyle = p.c
        ctx.beginPath()
        ctx.arc(p.x, p.y, dotRadius, 0, 6.2832)
        ctx.fill()
      }
      if (moving && !cancelled) raf = requestAnimationFrame(frame)
    }

    function start() {
      if (started || cancelled) return
      started = true
      build()
      if (!particles.length) return
      raf = requestAnimationFrame(frame)
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          io.disconnect()
          if (img.complete && img.naturalWidth) {
            window.setTimeout(start, delay)
          } else {
            img.onload = () => window.setTimeout(start, delay)
          }
        }
      },
      { threshold: 0.15 },
    )

    img.onerror = () => {} // leave blank on failure (gradient bg shows through)
    img.src = src
    io.observe(container)

    return () => {
      cancelled = true
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [src, gap, dotRadius, delay])

  return (
    <div ref={containerRef} className={className} role="img" aria-label={alt}>
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}
