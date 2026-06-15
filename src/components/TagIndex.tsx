"use client"

import { useTransition, useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/cn"
import Link from "next/link"
import type { TagCount } from "@/types/photo"

function Chip({
  href, active, label, count, onClick, loading,
}: {
  href: string; active: boolean; label: string; count?: number
  onClick: () => void; loading: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group inline-flex shrink-0 items-center gap-1.5 border-b-2 pb-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-200",
        active ? "border-amber text-text" : "border-transparent text-muted-2 hover:text-text",
        loading && "opacity-60",
      )}
    >
      <span className={cn("transition-colors", active ? "text-amber" : "text-muted group-hover:text-amber")}>
        {loading ? (
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
        ) : active ? "▸" : ""}
      </span>
      <span>{label}</span>
      {count != null && (
        <span className={cn("text-[9px] tabular-nums", active ? "text-amber" : "text-muted")}>{count}</span>
      )}
    </button>
  )
}

export function TagIndex({ tags, active }: { tags: TagCount[]; active?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Fade affordances: show on whichever side has more content to scroll to.
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const updateFades = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft >= max - 1 || max <= 0)
  }, [])

  useEffect(() => {
    updateFades()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateFades, { passive: true })
    window.addEventListener("resize", updateFades)
    return () => {
      el.removeEventListener("scroll", updateFades)
      window.removeEventListener("resize", updateFades)
    }
  }, [updateFades, tags.length])

  function navigate(href: string) {
    setPendingHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  // Clear pending once transition resolves
  if (!isPending && pendingHref !== null) {
    setPendingHref(null)
  }

  return (
    <nav
      aria-label="Filter by tag"
      className={cn(
        "sticky top-0 z-30 flex items-stretch border-b border-line bg-bg/85 backdrop-blur-md [transform:translateZ(0)] [will-change:transform]",
        // This pseudo-element bleeds the blurry background up into the iOS status bar space
        "before:absolute before:inset-x-0 before:bottom-full before:h-[100px] before:bg-bg/85 before:backdrop-blur-md"
      )}
      style={{ 
        paddingTop: "env(safe-area-inset-top)",
        isolation: "isolate" 
      }}
    >
      <div className="relative flex min-w-0 flex-1">
        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto scroll-smooth px-4 pt-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Chip
            href="/"
            active={!active}
            label="All"
            loading={pendingHref === "/"}
            onClick={() => navigate("/")}
          />
          {tags.map((t) => {
            const href = `/t/${t.name}`
            return (
              <Chip
                key={t.name}
                href={href}
                active={active === t.name}
                label={t.name}
                count={t.count}
                loading={pendingHref === href}
                onClick={() => navigate(href)}
              />
            )
          })}
        </div>
        {/* Left fade — appears once scrolled away from the start */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-bg to-transparent transition-opacity duration-200",
            atStart ? "opacity-0" : "opacity-100",
          )}
        />
        {/* Right fade + chevron — signals more tags to slide to */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-l from-bg via-bg/80 to-transparent pb-1.5 pr-1 transition-opacity duration-200",
            atEnd ? "opacity-0" : "opacity-100",
          )}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-amber/80" aria-hidden>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
      {/* Atlas — pinned right so it never scrolls with the tag list */}
      <Link
        href="/atlas"
        className="group flex shrink-0 items-center gap-1.5 border-l border-line px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-2 transition-colors hover:text-text sm:px-6"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted transition-colors group-hover:text-amber" aria-hidden>
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" />
        </svg>
        Atlas
      </Link>
    </nav>
  )
}