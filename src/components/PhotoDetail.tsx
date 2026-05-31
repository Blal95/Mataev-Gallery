"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ExposureStrip } from "./ExposureStrip"
import { MapChip } from "./MapChip"
import { Filmstrip } from "./Filmstrip"
import { ShortcutsOverlay } from "./ShortcutsOverlay"
import { site } from "@/config/site"
import type { PhotoDTO } from "@/types/photo"

export function PhotoDetail({
  photo, neighbours, index, total, asModal,
}: {
  photo: PhotoDTO; neighbours: PhotoDTO[]; index: number; total: number; asModal: boolean
}) {
  const router = useRouter()
  const prev = neighbours[index - 1]
  const next = neighbours[index + 1]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && asModal) router.back()
      if (e.key === "ArrowLeft" && prev) router.push(`/p/${prev.slug}`)
      if (e.key === "ArrowRight" && next) router.push(`/p/${next.slug}`)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router, asModal, prev, next])

  const date = photo.takenAt
    ? new Date(photo.takenAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : null

  return (
    <div className="bg-[#06080d]">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">{site.name} <span className="text-cyan">·</span></span>
        {asModal ? (
          <button onClick={() => router.back()} aria-label="Close" className="font-mono text-[13px] text-muted-2 hover:text-text">✕</button>
        ) : (
          <Link href="/" aria-label="Close" className="font-mono text-[13px] text-muted-2 hover:text-text">✕</Link>
        )}
      </div>

      <div className="mx-auto max-w-[640px] px-4 pb-4">
        <div className="rounded-[4px] border border-line-2 bg-bg-2 p-[7px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url.large} alt={photo.caption ?? ""} width={photo.width} height={photo.height} className="mx-auto block max-h-[58vh] w-auto max-w-full rounded-[2px] object-contain" />
        </div>
        <div className="mt-1.5 flex justify-between px-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
          <span>{String(index + 1).padStart(2, "0")} — {total}</span>
          <span>← → / SWIPE</span>
        </div>

        <div className="mt-4 flex items-start gap-4 border-t border-line pt-4">
          <div className="min-w-0 flex-1">
            {photo.caption && <p className="mb-3 font-serif text-[18px] italic leading-[1.4] text-[#eaf0f8]">{photo.caption}</p>}
            <ExposureStrip photo={photo} />
            {date && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{date}</div>}
            {photo.tags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2 font-mono text-[10px] text-cyan">
                {photo.tags.map((t) => (
                  <Link key={t} href={`/t/${t}`} className="hover:underline">#{t}</Link>
                ))}
              </div>
            )}
            <a
              href={photo.url.original}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-cyan transition-colors"
            >
              Full size ↗
            </a>
          </div>
          <MapChip photo={photo} />
        </div>
      </div>

      <Filmstrip photos={neighbours} activeId={photo.id} />
      <ShortcutsOverlay />
    </div>
  )
}
