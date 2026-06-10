"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/cn"
import type { PhotoDTO } from "@/types/photo"

export function Filmstrip({
  photos, activeId, onNavigate,
}: {
  photos: PhotoDTO[]
  activeId: string
  onNavigate?: (slug: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Scroll active thumb into view when frame changes
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [activeId])

  // Track scroll edges to show/hide fade gradients
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }

    update()
    el.addEventListener("scroll", update, { passive: true })
    // Re-check on resize (e.g. window resize, panel open/close)
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener("scroll", update); ro.disconnect() }
  }, [])

  const thumbClass = (active: boolean) =>
    cn("h-[52px] w-auto rounded-[2px]", active ? "outline outline-2 outline-cyan outline-offset-1" : "opacity-45 hover:opacity-80")

  return (
    <div className="relative border-t border-line bg-bg">
      {/* left fade — visible when scrolled right */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-bg to-transparent transition-opacity duration-200 ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
      />
      {/* right fade — visible when more content to the right */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-bg to-transparent transition-opacity duration-200 ${canScrollRight ? "opacity-100" : "opacity-0"}`}
      />

      <div ref={ref} className="flex gap-[5px] overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((p) => {
          const active = p.id === activeId
          return onNavigate ? (
            <button key={p.id} onClick={() => onNavigate(p.slug)} data-active={active} aria-label={p.caption ?? "View frame"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url.thumb} alt={p.caption ?? ""} loading="lazy" decoding="async" className={thumbClass(active)} />
            </button>
          ) : (
            <Link key={p.id} href={`/image/${p.slug}`} scroll={false} data-active={active}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url.thumb} alt={p.caption ?? ""} loading="lazy" decoding="async" className={thumbClass(active)} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
