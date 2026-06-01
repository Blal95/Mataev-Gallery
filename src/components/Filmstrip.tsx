"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/cn"
import type { PhotoDTO } from "@/types/photo"

export function Filmstrip({
  photos, activeId, onNavigate,
}: {
  photos: PhotoDTO[]
  activeId: string
  // When provided (modal), navigation goes through this handler so it can
  // REPLACE history; otherwise the thumbnails behave as plain links.
  onNavigate?: (slug: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [activeId])

  const thumbClass = (active: boolean) =>
    cn("h-[42px] w-auto rounded-[2px]", active ? "outline outline-2 outline-cyan outline-offset-1" : "opacity-45 hover:opacity-80")

  return (
    <div ref={ref} className="flex gap-[5px] overflow-x-auto border-t border-line bg-[#070a11] px-4 py-3">
      {photos.map((p) => {
        const active = p.id === activeId
        return onNavigate ? (
          <button key={p.id} onClick={() => onNavigate(p.slug)} data-active={active} aria-label={p.caption ?? "View frame"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url.thumb} alt={p.caption ?? ""} className={thumbClass(active)} />
          </button>
        ) : (
          <Link key={p.id} href={`/p/${p.slug}`} scroll={false} data-active={active}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url.thumb} alt={p.caption ?? ""} className={thumbClass(active)} />
          </Link>
        )
      })}
    </div>
  )
}
