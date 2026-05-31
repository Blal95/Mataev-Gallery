"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ExposureStrip } from "./ExposureStrip"
import { MapChip } from "./MapChip"
import { Filmstrip } from "./Filmstrip"
import type { PhotoDTO } from "@/types/photo"

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  )
}

export function PhotoDetail({
  photo, neighbours, index, total, asModal,
}: {
  photo: PhotoDTO; neighbours: PhotoDTO[]; index: number; total: number; asModal: boolean
}) {
  const router = useRouter()
  const [info, setInfo] = useState(false)
  // Reset the info panel when navigating to a different frame (during render).
  const [seenId, setSeenId] = useState(photo.id)
  if (seenId !== photo.id) { setSeenId(photo.id); setInfo(false) }
  const prev = neighbours[index - 1]
  const next = neighbours[index + 1]

  const close = () => {
    if (asModal) router.back()
    else router.push("/")
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (info) setInfo(false); else close() }
      if (e.key === "ArrowLeft" && prev) router.push(`/p/${prev.slug}`)
      if (e.key === "ArrowRight" && next) router.push(`/p/${next.slug}`)
      if (e.key === "i" || e.key === "I") setInfo((v) => !v)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, asModal, prev, next, info])

  const date = photo.takenAt
    ? new Date(photo.takenAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : null

  const navBtn =
    "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-line-2/60 bg-bg/40 text-muted-2 opacity-50 backdrop-blur-sm transition-all hover:border-amber/60 hover:text-amber hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"

  return (
    <div className="flex h-full min-h-dvh w-full flex-col overflow-hidden bg-bg">
      {/* top chrome */}
      <div className="relative z-30 flex items-center justify-between px-4 py-4 sm:px-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber">
          Frame <span className="text-text">{String(index + 1).padStart(3, "0")}</span>
          <span className="text-muted"> / {String(total).padStart(3, "0")}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setInfo((v) => !v)}
            aria-pressed={info}
            className={`mr-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${info ? "border-amber/60 bg-amber/10 text-amber" : "border-line-2 text-muted-2 hover:text-text"}`}
          >
            <Icon d="M12 16v-5M12 8h.01" className="h-3.5 w-3.5" />
            Info
          </button>
          <button onClick={close} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center text-muted-2 transition-colors hover:text-text">
            <Icon d="M18 6L6 18M6 6l12 12" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* stage */}
      <div className="relative min-h-0 flex-1">
        {/* dark surround click closes (modal) */}
        <div className="absolute inset-0" onClick={asModal ? close : undefined} aria-hidden />

        <div className="pointer-events-none relative flex h-full items-center justify-center px-4 sm:px-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url.large}
            alt={photo.caption ?? `Frame ${index + 1}`}
            width={photo.width}
            height={photo.height}
            onClick={() => setInfo((v) => !v)}
            className="pointer-events-auto max-h-full max-w-full cursor-zoom-in object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
          />
        </div>

        {/* flanking nav */}
        <div className="pointer-events-none absolute inset-y-0 left-2 right-2 z-20 flex items-center justify-between sm:left-4 sm:right-4">
          {prev ? (
            <Link href={`/p/${prev.slug}`} scroll={false} aria-label="Previous frame" className={navBtn}>
              <Icon d="M15 18l-6-6 6-6" className="h-5 w-5" />
            </Link>
          ) : <span className={navBtn} aria-hidden />}
          {next ? (
            <Link href={`/p/${next.slug}`} scroll={false} aria-label="Next frame" className={navBtn}>
              <Icon d="M9 18l6-6-6-6" className="h-5 w-5" />
            </Link>
          ) : <span className={navBtn} aria-hidden />}
        </div>

        {/* hint */}
        {!info && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
            Tap photo or press I for details · ← → to browse
          </div>
        )}
      </div>

      {/* info panel — slides up */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-40 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${info ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="pointer-events-auto border-t border-line-2 bg-bg-2/95 backdrop-blur-md">
          <div className="mx-auto max-w-[900px] px-5 pb-4 pt-5 sm:px-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                {photo.caption && (
                  <p className="mb-3 font-serif text-[22px] italic leading-[1.35] text-text">{photo.caption}</p>
                )}
                <ExposureStrip photo={photo} />
                {date && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{date}</div>}
                {photo.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] text-amber">
                    {photo.tags.map((t) => (
                      <Link key={t} href={`/t/${t}`} className="rounded-full border border-amber/25 px-2 py-0.5 transition-colors hover:bg-amber/10">#{t}</Link>
                    ))}
                  </div>
                )}
                <a
                  href={photo.url.original}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted transition-colors hover:text-amber"
                >
                  Full size ↗
                </a>
              </div>
              <div className="shrink-0"><MapChip photo={photo} /></div>
            </div>
          </div>
          <Filmstrip photos={neighbours} activeId={photo.id} />
        </div>
      </div>
    </div>
  )
}
