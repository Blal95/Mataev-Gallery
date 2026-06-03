"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ExposureStrip } from "./ExposureStrip"
import { Filmstrip } from "./Filmstrip"
import { PhotoComments } from "./PhotoComments"
import Logo from "./Logo"
import { ShortcutsOverlay } from "./ShortcutsOverlay"
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
  const [transitioning, setTransitioning] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [indicator, setIndicator] = useState<"play" | "pause" | null>(null)
  
  // Clear transition flag when navigating to a different frame.
  const [seenId, setSeenId] = useState(photo.id)
  if (seenId !== photo.id) { setSeenId(photo.id); setTransitioning(false) }

  const videoRef = useRef<HTMLVideoElement>(null)
  const [canPlay, setCanPlay] = useState(false)
  const isVideo = photo.mediaType === "video"
  
  const prev = neighbours[index - 1]
  const next = neighbours[index + 1]

  // In a modal the photo route was intercepted via the @modal parallel slot.
  // Pushing "/" changes the URL but leaves the intercepted slot painted (Next
  // parallel-route quirk), so the modal stays on screen — only router.back()
  // unwinds the interception. The standalone page has no slot, so it pushes "/".
  const close = () => {
    if (asModal) router.back()
    else router.push("/")
  }

  // Neighbour navigation inside a modal must REPLACE rather than push, so the
  // history never grows past the single modal entry — that keeps close()'s
  // back() reliably landing on the grid instead of a previous frame.
  const goto = (slug: string) => {
    setTransitioning(true)
    if (asModal) router.replace(`/p/${slug}`)
    else router.push(`/p/${slug}`)
  }

  const togglePlayback = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      setIndicator("play")
    } else {
      v.pause()
      setIndicator("pause")
    }
    setTimeout(() => setIndicator(null), 500)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.tagName === "SELECT")
      // Don't toggle info or change frames while typing a comment (e.g. "i" in "writing").
      if (typing && e.key !== "Escape") return

      if (e.key === "Escape") { if (info) setInfo(false); else close() }
      if (e.key === "ArrowLeft" && prev) goto(prev.slug)
      if (e.key === "ArrowRight" && next) goto(next.slug)
      if (e.key === "i" || e.key === "I") setInfo((v) => !v)
      if (e.key === "m" || e.key === "M") setIsMuted((v) => !v)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, asModal, prev, next, info])

  // Autoplay video 1s after it signals canplay
  useEffect(() => {
    if (!isVideo || !canPlay) return
    const t = setTimeout(() => { videoRef.current?.play().catch(() => {}) }, 1000)
    return () => clearTimeout(t)
  }, [isVideo, canPlay])

  // Pause + reset canPlay when navigating to a different item
  useEffect(() => {
    if (!isVideo) return
    videoRef.current?.pause()
    setCanPlay(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.id, isVideo])

  const date = photo.takenAt
    ? new Date(photo.takenAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : null

  const navBtn =
    "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-line-2/60 bg-bg/40 text-muted-2 opacity-80 backdrop-blur-sm transition-all hover:border-amber/60 hover:text-amber hover:opacity-100 sm:opacity-50 disabled:pointer-events-none disabled:opacity-0"

  return (
    <div className="flex h-full min-h-dvh w-full flex-col overflow-hidden bg-bg">
      {/* navigation progress bar */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 z-50 h-[2px] bg-amber origin-left transition-transform duration-300 ease-out ${transitioning ? "scale-x-[0.85]" : "scale-x-0"}`}
        style={{ transitionDuration: transitioning ? "1200ms" : "150ms" }}
      />
      {/* top chrome */}
      <div className="relative z-30 flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.28em] text-amber">
          Frame <span className="text-text">{String(index + 1).padStart(3, "0")}</span>
          <span className="text-muted"> / {String(total).padStart(3, "0")}</span>
        </span>
        {!info && (
          <p className="hidden min-w-0 flex-1 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted sm:block">
            <span className="text-muted-2">← →</span> previous / next
            <span className="mx-2 text-line-2">·</span>
            <span className="text-muted-2">I</span> details
          </p>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {isVideo && (
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className="mr-2 inline-flex h-11 w-11 items-center justify-center text-muted-2 transition-colors hover:text-amber"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
            >
              {isMuted ? (
                <Icon d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" className="h-[18px] w-[18px]" />
              ) : (
                <Icon d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" className="h-[18px] w-[18px]" />
              )}
            </button>
          )}
          <button
            onClick={() => setInfo((v) => !v)}
            aria-pressed={info}
            className={`mr-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${info ? "border-amber/60 bg-amber/10 text-amber" : "border-line-2 text-muted-2 hover:text-text"}`}
          >
            <Icon d="M12 16v-5M12 8h.01" className="h-3.5 w-3.5" />
            Info
          </button>
          <button onClick={close} aria-label="Close" className="inline-flex h-11 w-11 items-center justify-center text-muted-2 transition-colors hover:text-text">
            <Icon d="M18 6L6 18M6 6l12 12" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* stage */}
      <div className="relative min-h-0 flex-1">
        {/* dark surround click closes (modal) */}
        <div className="absolute inset-0" onClick={asModal ? close : undefined} aria-hidden />

        <div className="pointer-events-none relative flex h-full items-center justify-center px-4 sm:px-14">
          <div className="relative animate-photo-reveal">
            {isVideo ? (
              <video
                ref={videoRef}
                src={photo.url.original}
                loop
                muted={isMuted}
                playsInline
                onCanPlay={() => setCanPlay(true)}
                onLoad={() => setTransitioning(false)}
                onClick={togglePlayback}
                className={`pointer-events-auto max-h-full max-w-full cursor-pointer object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] transition-opacity duration-200 ${transitioning ? "opacity-30" : "opacity-100"}`}
              />
            ) : (
              <img
                src={photo.url.large}
                alt={photo.caption ?? `Frame ${index + 1}`}
                width={photo.width}
                height={photo.height}
                onClick={() => setInfo((v) => !v)}
                onLoad={() => setTransitioning(false)}
                className={`pointer-events-auto max-h-full max-w-full cursor-zoom-in object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] transition-opacity duration-200 ${transitioning ? "opacity-30" : "opacity-100"}`}
              />
            )}

            {/* Play/Pause center indicator overlay */}
            {indicator && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 flex h-20 w-20 items-center justify-center rounded-full bg-bg/40 backdrop-blur-sm animate-indicator">
                 {indicator === "play" ? (
                   <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-amber translate-x-1"><path d="M8 5v14l11-7z"/></svg>
                 ) : (
                   <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-amber"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                 )}
              </div>
            )}
          </div>
        </div>

        {/* Tower seal — signs the frame like a darkroom print stamp. Fades
            out while the info panel is open so it never collides with it. */}
        <div
          className={`pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1.5 transition-opacity duration-300 sm:bottom-5 sm:right-6 ${info ? "opacity-0" : "opacity-100"}`}
        >
          <Logo iconOnly className="h-5 w-auto text-amber/55 sm:h-6" title="Mataev" />
          <span className="font-mono text-[8.5px] uppercase tracking-[0.28em] text-muted/70 mix-blend-screen sm:text-[9px]">
            Mataev
          </span>
        </div>

        {/* flanking nav — buttons (not Links) so modal navigation can REPLACE
            history via goto(), keeping the back-stack flat for close(). */}
        <div className="pointer-events-none absolute inset-y-0 left-2 right-2 z-20 flex items-center justify-between sm:left-4 sm:right-4">
          {prev ? (
            <button onClick={() => goto(prev.slug)} aria-label="Previous frame" className={navBtn}>
              <Icon d="M15 18l-6-6 6-6" className="h-5 w-5" />
            </button>
          ) : <span className={navBtn} aria-hidden />}
          {next ? (
            <button onClick={() => goto(next.slug)} aria-label="Next frame" className={navBtn}>
              <Icon d="M9 18l6-6-6-6" className="h-5 w-5" />
            </button>
          ) : <span className={navBtn} aria-hidden />}
        </div>
      </div>

      {/* info panel — slides in from bottom, in-flow so image shrinks rather than gets overlapped */}
      <div
        aria-hidden={!info}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${info ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-line-2 bg-bg-2/95 backdrop-blur-md">
            <div
              className="mx-auto max-w-[900px] overflow-y-auto px-5 pb-8 pt-5 sm:px-6"
              style={{ maxHeight: "min(58vh, 420px)" }}
            >
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
                  <PhotoComments photoId={photo.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* filmstrip — always visible, independent of info panel */}
      <Filmstrip photos={neighbours} activeId={photo.id} onNavigate={asModal ? goto : undefined} />
      <ShortcutsOverlay />
    </div>
  )
}