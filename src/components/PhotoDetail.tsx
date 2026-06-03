"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ExposureStrip } from "./ExposureStrip"
import { Filmstrip } from "./Filmstrip"
import { PhotoComments } from "./PhotoComments"
import Logo from "./Logo"
import { ShortcutsOverlay } from "./ShortcutsOverlay"
import { flagEmoji, formatDuration, formatBytes } from "@/lib/format"
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
  const [info, setInfo] = useState(() => {
    if (typeof window === "undefined") return false
    return sessionStorage.getItem("detail-info") === "1"
  })
  const [transitioning, setTransitioning] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(photo.duration ?? 0)

  const [seenId, setSeenId] = useState(photo.id)
  if (seenId !== photo.id) { setSeenId(photo.id); setTransitioning(false) }

  const videoRef = useRef<HTMLVideoElement>(null)
  const [canPlay, setCanPlay] = useState(false)
  const isVideo = photo.mediaType === "video"

  const prev = neighbours[index - 1]
  const next = neighbours[index + 1]

  const close = () => {
    if (asModal) router.back()
    else router.push("/")
  }

  const goto = (slug: string) => {
    setTransitioning(true)
    if (asModal) router.replace(`/p/${slug}`)
    else router.push(`/p/${slug}`)
  }

  const togglePlayback = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT")
      if (typing && e.key !== "Escape") return
      if (e.key === "Escape") { if (info) setInfo(false); else close() }
      if (e.key === "ArrowLeft" && prev) goto(prev.slug)
      if (e.key === "ArrowRight" && next) goto(next.slug)
      if (e.key === "i" || e.key === "I") setInfo((v) => !v)
      if (e.key === " " && isVideo) { e.preventDefault(); togglePlayback() }
      if ((e.key === "m" || e.key === "M") && isVideo) setIsMuted((v) => !v)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, asModal, prev, next, info, isVideo])

  // Persist info panel open/close state across navigation
  useEffect(() => {
    sessionStorage.setItem("detail-info", info ? "1" : "0")
  }, [info])

  // Autoplay 1s after canplay fires
  useEffect(() => {
    if (!isVideo || !canPlay) return
    const t = setTimeout(() => { videoRef.current?.play().catch(() => {}) }, 1000)
    return () => clearTimeout(t)
  }, [isVideo, canPlay])

  // Pause + reset when navigating away
  useEffect(() => {
    if (!isVideo) return
    videoRef.current?.pause()
    setCanPlay(false)
    setVideoTime(0)
    setIsPlaying(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.id])

  const date = photo.takenAt
    ? new Date(photo.takenAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : null

  const flag = flagEmoji(photo.countryCode)
  const locationLine = [photo.place, photo.country].filter(Boolean).join(", ")

  const navBtn = "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-line-2/60 bg-bg/40 text-muted-2 opacity-80 backdrop-blur-sm transition-all hover:border-amber/60 hover:text-amber hover:opacity-100 sm:opacity-50 disabled:pointer-events-none disabled:opacity-0"

  return (
    <div className="flex h-full min-h-dvh w-full flex-col overflow-hidden bg-bg">
      {/* Progress bar */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 z-50 h-[2px] bg-amber origin-left transition-transform duration-300 ease-out ${transitioning ? "scale-x-[0.85]" : "scale-x-0"}`}
        style={{ transitionDuration: transitioning ? "1200ms" : "150ms" }}
      />

      {/* Header */}
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
            <>
              <button
                onClick={togglePlayback}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="inline-flex h-9 w-9 items-center justify-center text-muted-2 transition-colors hover:text-amber"
              >
                {isPlaying
                  ? <Icon d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" className="h-4 w-4" />
                  : <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-current"><path d="M8 5v14l11-7z" /></svg>
                }
              </button>
              <button
                onClick={() => setIsMuted((v) => !v)}
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="inline-flex h-9 w-9 items-center justify-center text-muted-2 transition-colors hover:text-amber"
              >
                {isMuted
                  ? <Icon d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" className="h-4 w-4" />
                  : <Icon d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" className="h-4 w-4" />
                }
              </button>
            </>
          )}
          <button
            onClick={() => setInfo((v) => !v)}
            aria-pressed={info}
            className={`mr-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${info ? "border-amber/60 bg-amber/10 text-amber" : "border-line-2 text-muted-2 hover:text-text"}`}
          >
            <Icon d="M12 16v-5M12 8h.01" className="h-3.5 w-3.5" /> Info
          </button>
          <button onClick={close} aria-label="Close" className="inline-flex h-11 w-11 items-center justify-center text-muted-2 transition-colors hover:text-text">
            <Icon d="M18 6L6 18M6 6l12 12" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0" onClick={asModal ? close : undefined} aria-hidden />

        <div className="pointer-events-none relative flex h-full items-center justify-center px-4 sm:px-14">
          {isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              ref={videoRef}
              src={photo.url.original}
              loop
              muted={isMuted}
              playsInline
              onCanPlay={() => setCanPlay(true)}
              onLoadedMetadata={() => setVideoDuration(videoRef.current?.duration ?? photo.duration ?? 0)}
              onLoadedData={() => setTransitioning(false)}
              onTimeUpdate={() => { setVideoTime(videoRef.current?.currentTime ?? 0) }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={() => setInfo((v) => !v)}
              className={`pointer-events-auto max-h-full max-w-full cursor-pointer object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] transition-opacity duration-200 ${transitioning ? "opacity-30" : "opacity-100"}`}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url.large}
              alt={photo.caption ?? `Frame ${index + 1}`}
              width={photo.width}
              height={photo.height}
              onClick={() => setInfo((v) => !v)}
              onLoad={() => setTransitioning(false)}
              className={`pointer-events-auto max-h-full max-w-full cursor-pointer object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] transition-opacity duration-200 ${transitioning ? "opacity-30" : "opacity-100"}`}
            />
          )}
        </div>

        {/* Branding seal */}
        <div className={`pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1.5 transition-opacity duration-300 sm:bottom-5 sm:right-6 ${info ? "opacity-0" : "opacity-100"}`}>
          <Logo iconOnly className="h-5 w-auto text-amber/55 sm:h-6" title="Mataev" />
          <span className="font-mono text-[8.5px] uppercase tracking-[0.28em] text-muted/70 mix-blend-screen sm:text-[9px]">Mataev</span>
        </div>

        {/* Nav arrows */}
        <div className="pointer-events-none absolute inset-y-0 left-2 right-2 z-20 flex items-center justify-between sm:left-4 sm:right-4">
          {prev ? <button onClick={() => goto(prev.slug)} aria-label="Previous frame" className={navBtn}><Icon d="M15 18l-6-6 6-6" className="h-5 w-5" /></button> : <span className={navBtn} aria-hidden />}
          {next ? <button onClick={() => goto(next.slug)} aria-label="Next frame" className={navBtn}><Icon d="M9 18l6-6-6-6" className="h-5 w-5" /></button> : <span className={navBtn} aria-hidden />}
        </div>
      </div>

      {/* Video scrubber */}
      {isVideo && (
        <div className="relative z-20 flex items-center gap-3 border-t border-line bg-bg px-4 py-2.5 sm:px-6">
          <span className="w-8 shrink-0 text-right font-mono text-[9px] tabular-nums text-muted">
            {formatDuration(videoTime) ?? "0:00"}
          </span>
          <input
            type="range"
            min={0}
            max={videoDuration || 1}
            step={0.1}
            value={videoTime}
            onChange={(e) => {
              const t = parseFloat(e.target.value)
              setVideoTime(t)
              if (videoRef.current) videoRef.current.currentTime = t
            }}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-line-2 accent-amber [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber [&::-webkit-slider-thumb]:shadow-none"
            aria-label="Seek video"
          />
          <span className="w-8 shrink-0 font-mono text-[9px] tabular-nums text-muted">
            {formatDuration(videoDuration) ?? "0:00"}
          </span>
        </div>
      )}

      {/* Info panel */}
      <div
        aria-hidden={!info}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${info ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-line-2 bg-bg-2/95 backdrop-blur-md">
            <div
              className="mx-auto max-w-[900px] overflow-y-auto px-4 pb-6 pt-5 sm:px-6"
              style={{ maxHeight: "min(55vh, 400px)" }}
            >
              {/* Caption */}
              {photo.caption && (
                <p className="mb-4 font-serif text-[19px] italic leading-snug text-text sm:text-[21px]">
                  {photo.caption}
                </p>
              )}

              {/* Location — links to Atlas centered on this photo */}
              {locationLine && (
                <Link
                  href={photo.lat != null && photo.lon != null
                    ? `/atlas?lat=${photo.lat}&lon=${photo.lon}`
                    : "/atlas"}
                  className="mb-4 flex items-center gap-2 group/loc w-fit"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 shrink-0 text-amber/60 transition-colors group-hover/loc:text-amber" aria-hidden>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2 transition-colors group-hover/loc:text-amber">
                    {flag && <span className="mr-1">{flag}</span>}{locationLine}
                  </span>
                </Link>
              )}

              {/* Metadata */}
              {isVideo ? (
                <div className="mb-3 font-mono text-[10px] uppercase leading-[1.8] tracking-[0.08em] text-muted-2">
                  {formatDuration(photo.duration) && (
                    <span className="mr-3 text-cyan">{formatDuration(photo.duration)}</span>
                  )}
                  {photo.width > 0 && <span className="mr-3">{photo.width}×{photo.height}</span>}
                  <span>{formatBytes(photo.bytes)}</span>
                </div>
              ) : (
                <div className="mb-3">
                  <ExposureStrip photo={photo} />
                </div>
              )}

              {/* Date */}
              {date && (
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {date}
                </div>
              )}

              {/* Tags */}
              {photo.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {photo.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/t/${t}`}
                      className="rounded-full border border-amber/25 px-2.5 py-0.5 font-mono text-[10px] text-amber transition-colors hover:bg-amber/10"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              )}

              {/* Full size */}
              <a
                href={photo.url.original}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted transition-colors hover:text-amber"
              >
                Full size ↗
              </a>

              {/* Comments */}
              <PhotoComments photoId={photo.id} />
            </div>
          </div>
        </div>
      </div>

      <Filmstrip photos={neighbours} activeId={photo.id} onNavigate={asModal ? goto : undefined} />
      <ShortcutsOverlay />
    </div>
  )
}
