import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-10 sm:px-10">
        <div className="flex flex-col justify-between gap-12 sm:flex-row sm:items-start">
          <div className="max-w-sm">
            <p className="text-2xl leading-snug font-medium tracking-tight text-balance text-white/90">
              Every idea deserves
              <br />a place to take shape.
            </p>
            <p className="mt-4 text-sm text-white/45">
              Imeji turns scattered thoughts into living maps you can see, grow,
              and revisit.
            </p>
          </div>

          <nav className="flex flex-col gap-3 text-sm text-white/55">
            <span className="mb-1 text-xs tracking-[0.2em] text-white/35 uppercase">
              More
            </span>
            <Link href="/" className="w-fit transition-colors hover:text-white">
              Home
            </Link>
            <Link
              href="/privacy"
              className="w-fit transition-colors hover:text-white"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="w-fit transition-colors hover:text-white"
            >
              Terms
            </Link>
          </nav>
        </div>

        {/* oversized wordmark */}
        <div className="mt-20 overflow-hidden">
          <div
            aria-hidden
            className="leading-[0.8] font-semibold tracking-tighter text-white/90 select-none"
            style={{ fontSize: "clamp(5rem, 22vw, 18rem)" }}
          >
            imeji
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Imeji. All rights reserved.</span>
          <span>Made for thinkers.</span>
        </div>
      </div>
    </footer>
  )
}
