"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { LocationMap } from "./LocationMap"
import { PhotoComments } from "./PhotoComments"
import { ShortcutsOverlay } from "./ShortcutsOverlay"
import { flagEmoji, flagUrl, formatDuration, formatBytes, formatExposure, formatAperture, formatFocal } from "@/lib/format"
import { thumbhashToUrl } from "@/lib/thumbhash"
import type { PhotoDTO } from "@/types/photo"

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  )
}

/** Archive-card section: micro eyebrow label over content, hairline rule above. */
function Section({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`border-t border-line pt-4 ${className}`}>
      <p className="mb-2.5 font-mono text-[8.5px] uppercase tracking-[0.24em] text-muted/60">{label}</p>
      {children}
    </section>
  )
}

/** Labelled spec value for the 2-col camera/file grids. */
function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted/50">{label}</p>
      <p className="font-mono text-[11.5px] tabular-nums tracking-[0.04em] text-text/90">{value}</p>
    </div>
  )
}

export function PhotoDetail({
  photo, prev, next, index, total, asModal,
}: {
  photo: PhotoDTO; prev: PhotoDTO | null; next: PhotoDTO | null; index: number; total: number; asModal: boolean
}) {
  const router = useRouter()
  const [info, setInfo] = useState(false)
  useEffect(() => {
    setInfo(sessionStorage.getItem("detail-info") === "1")
  }, [])
  const [transitioning, setTransitioning] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(photo.duration ?? 0)

  const [showComments, setShowComments] = useState(false)
  const [seenId, setSeenId] = useState(photo.id)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const pinchStartDist = useRef<number | null>(null)
  const pinchStartZoom = useRef(1)
  const panStart = useRef<{ tx: number; ty: number; px: number; py: number } | null>(null)
  const lastTapTime = useRef(0)
  const stageRef = useRef<HTMLDivElement>(null)
  if (seenId !== photo.id) {
    setSeenId(photo.id); setTransitioning(false); setShowComments(false)
    zoomRef.current = 1; panRef.current = { x: 0, y: 0 }
    setZoom(1); setPanX(0); setPanY(0)
  }

  const videoRef = useRef<HTMLVideoElement>(null)
  const [canPlay, setCanPlay] = useState(false)
  const [largeLoaded, setLargeLoaded] = useState(false)
  const isVideo = photo.mediaType === "video"
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const placeholder = thumbhashToUrl(photo.thumbhash)

  const close = () => {
    if (asModal) router.back()
    else router.push("/")
  }

  // Info sheet only exists below lg — desktop has the permanent sidebar
  const toggleInfo = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) return
    setInfo((v) => !v)
  }

  const goto = (slug: string) => {
    setTransitioning(true)
    if (asModal) router.replace(`/image/${slug}`)
    else router.push(`/image/${slug}`)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      pinchStartDist.current = Math.sqrt(dx * dx + dy * dy)
      pinchStartZoom.current = zoomRef.current
      touchStartX.current = null
      touchStartY.current = null
      return
    }
    const now = Date.now()
    if (now - lastTapTime.current < 300 && zoomRef.current > 1) {
      zoomRef.current = 1; panRef.current = { x: 0, y: 0 }
      setZoom(1); setPanX(0); setPanY(0)
      lastTapTime.current = 0
      return
    }
    lastTapTime.current = now
    if (zoomRef.current > 1) {
      panStart.current = { tx: e.touches[0].clientX, ty: e.touches[0].clientY, px: panRef.current.x, py: panRef.current.y }
      touchStartX.current = null
      touchStartY.current = null
      return
    }
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (pinchStartDist.current != null) {
      pinchStartDist.current = null
      if (zoomRef.current <= 1.05) {
        zoomRef.current = 1; panRef.current = { x: 0, y: 0 }
        setZoom(1); setPanX(0); setPanY(0)
      }
      return
    }
    panStart.current = null
    if (zoomRef.current > 1) return
    if (touchStartX.current == null || touchStartY.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
    if (dx < 0 && next) goto(next.slug)
    if (dx > 0 && prev) goto(prev.slug)
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
      if ((e.key === "i" || e.key === "I") && window.innerWidth < 1024) setInfo((v) => !v)
      if (e.key === " " && isVideo) { e.preventDefault(); togglePlayback() }
      if ((e.key === "m" || e.key === "M") && isVideo) setIsMuted((v) => !v)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, asModal, prev, next, info, isVideo])

  // Lock body scroll and disable pull-to-refresh while photo detail is open
  useEffect(() => {
    const { style } = document.body
    const prevOverflow = style.overflow
    const prevOverscroll = style.overscrollBehavior
    style.overflow = "hidden"
    style.overscrollBehavior = "none"
    return () => {
      style.overflow = prevOverflow
      style.overscrollBehavior = prevOverscroll
    }
  }, [])

  // Persist info panel open/close state across navigation
  useEffect(() => {
    sessionStorage.setItem("detail-info", info ? "1" : "0")
  }, [info])

  // Count a view once per photo per browser session — covers both the full
  // page and the intercepted modal route.
  useEffect(() => {
    const key = `viewed-${photo.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")
    fetch(`/api/photos/${photo.id}/view`, { method: "POST" }).catch(() => {})
  }, [photo.id])

  // Autoplay 1s after canplay fires
  useEffect(() => {
    if (!isVideo || !canPlay) return
    const t = setTimeout(() => { videoRef.current?.play().catch(() => {}) }, 1000)
    return () => clearTimeout(t)
  }, [isVideo, canPlay])

  // Reset large-image loaded state when photo changes. Includes a safety
  // timeout so blur removes even if onLoad never fires (e.g. cached image).
  useEffect(() => {
    setLargeLoaded(false)
    const t = setTimeout(() => setLargeLoaded(true), 1500)
    return () => clearTimeout(t)
  }, [photo.id])

  // Preload neighbor large images so prev/next nav feels instant.
  // Plain Image() triggers browser cache without inserting into DOM.
  useEffect(() => {
    const urls: string[] = []
    if (prev && prev.mediaType !== "video") urls.push(prev.url.large)
    if (next && next.mediaType !== "video") urls.push(next.url.large)
    const imgs = urls.map((u) => { const i = new Image(); i.src = u; return i })
    return () => { imgs.forEach((i) => { i.src = "" }) }
  }, [prev, next])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current != null) {
        e.preventDefault()
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const newZoom = Math.max(1, Math.min(5, pinchStartZoom.current * (dist / pinchStartDist.current)))
        zoomRef.current = newZoom
        setZoom(newZoom)
        if (newZoom <= 1) { panRef.current = { x: 0, y: 0 }; setPanX(0); setPanY(0) }
        return
      }
      if (e.touches.length === 1 && zoomRef.current > 1 && panStart.current) {
        e.preventDefault()
        const nx = panStart.current.px + (e.touches[0].clientX - panStart.current.tx)
        const ny = panStart.current.py + (e.touches[0].clientY - panStart.current.ty)
        panRef.current = { x: nx, y: ny }
        setPanX(nx); setPanY(ny)
      }
    }
    stage.addEventListener("touchmove", handleTouchMove, { passive: false })
    return () => stage.removeEventListener("touchmove", handleTouchMove)
  }, [])

  // Pause + reset when navigating away
  useEffect(() => {
    if (!isVideo) return
    videoRef.current?.pause()
    setCanPlay(false)
    setVideoTime(0)
    setIsPlaying(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.id])

  const takenDate = photo.takenAt ? new Date(photo.takenAt) : null
  const date = takenDate
    ? takenDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : null
  const time = takenDate
    ? takenDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null
  const coords = photo.lat != null && photo.lon != null
    ? `${photo.lat.toFixed(5)}, ${photo.lon.toFixed(5)}`
    : null

  const cameraSpecs = [
    { label: "Focal", value: formatFocal(photo.focal) },
    { label: "Aperture", value: formatAperture(photo.fNumber) },
    { label: "Shutter", value: formatExposure(photo.exposure) },
    { label: "ISO", value: photo.iso != null ? String(photo.iso) : null },
  ].filter((s): s is { label: string; value: string } => s.value != null)

  const fileSpecs = [
    { label: "Duration", value: isVideo ? formatDuration(photo.duration) : null },
    { label: "Size", value: photo.width > 0 ? `${photo.width} × ${photo.height}` : null },
    { label: "Format", value: photo.format ? photo.format.toUpperCase() : null },
    { label: "Weight", value: formatBytes(photo.bytes) },
    { label: "Views", value: photo.views > 0 ? photo.views.toLocaleString() : null },
  ].filter((s): s is { label: string; value: string } => s.value != null)

  const flag = flagEmoji(photo.countryCode, photo.lat, photo.lon)
  const flagSrc = flag == null ? flagUrl(photo.countryCode, photo.lat, photo.lon) : null
  const locationLine = [photo.place, photo.country].filter(Boolean).join(", ")

  const navBtn = "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-line-2/60 bg-bg/40 text-muted-2 opacity-80 backdrop-blur-sm transition-all hover:border-amber/60 hover:text-amber hover:opacity-100 sm:opacity-50 disabled:pointer-events-none disabled:opacity-0"

  return (
    <div className="flex min-h-dvh w-full bg-bg sm:h-full sm:overflow-hidden">
      {/* Progress bar */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 z-50 h-[2px] bg-amber origin-left transition-transform duration-300 ease-out ${transitioning ? "scale-x-[0.85]" : "scale-x-0"}`}
        style={{ transitionDuration: transitioning ? "1200ms" : "150ms" }}
      />

      {/* Desktop sidebar — always visible on lg+, all metadata lives here */}
      <aside className="relative z-30 hidden w-[340px] shrink-0 border-r border-line bg-bg-2/50 lg:flex lg:flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-8 pt-6">
          {/* Frame counter */}
          <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.28em] text-amber">
            Frame <span className="text-text">{String(index + 1).padStart(3, "0")}</span>
            <span className="text-muted"> / {String(total).padStart(3, "0")}</span>
          </p>

          {/* Caption — primary read */}
          {photo.caption && (
            <p className="mb-6 font-serif text-[23px] italic leading-[1.35] tracking-[-0.01em] text-text">
              {photo.caption}
            </p>
          )}

          {/* When */}
          {date && (
            <Section label="When" className="mb-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text/90">
                {date}{time ? <span className="text-muted-2"> · {time}</span> : null}
              </p>
            </Section>
          )}

          {/* Where */}
          {(locationLine || coords) && (
            <Section label="Where" className="mb-5">
              {locationLine && (
                <a
                  href={photo.lat != null && photo.lon != null
                    ? `/atlas?lat=${photo.lat}&lon=${photo.lon}&z=13&slug=${photo.slug}`
                    : "/atlas"}
                  className="group/loc flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[11px] w-[11px] shrink-0 text-amber/50 transition-colors group-hover/loc:text-amber" aria-hidden>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text/90 transition-colors group-hover/loc:text-amber">
                    {flag ? <span className="mr-1">{flag}</span> : flagSrc ? <img src={flagSrc} alt="" aria-hidden className="mr-1 inline-block h-[10px] w-auto align-middle" /> : null}{locationLine}
                  </span>
                </a>
              )}
              {photo.lat != null && photo.lon != null && (
                <div className="mt-3 overflow-hidden rounded-lg border border-line-2">
                  <LocationMap lat={photo.lat} lon={photo.lon} zoom={8} className="h-44 w-full" />
                </div>
              )}
              {coords && (
                <p className="mt-2 font-mono text-[9px] tabular-nums tracking-[0.08em] text-muted/60">{coords}</p>
              )}
            </Section>
          )}

          {/* Camera */}
          {!isVideo && (photo.camera || photo.lens || cameraSpecs.length > 0) && (
            <Section label="Camera" className="mb-5">
              {photo.camera && (
                <p className="font-mono text-[11px] uppercase leading-snug tracking-[0.08em] text-text/90">{photo.camera}</p>
              )}
              {photo.lens && (
                <p className="mt-0.5 font-mono text-[9.5px] uppercase leading-snug tracking-[0.08em] text-muted-2">{photo.lens}</p>
              )}
              {cameraSpecs.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  {cameraSpecs.map((s) => <SpecCell key={s.label} label={s.label} value={s.value} />)}
                </div>
              )}
            </Section>
          )}

          {/* File */}
          {fileSpecs.length > 0 && (
            <Section label="File" className="mb-5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {fileSpecs.map((s) => <SpecCell key={s.label} label={s.label} value={s.value} />)}
              </div>
            </Section>
          )}

          {/* Tags */}
          {photo.tags.length > 0 && (
            <Section label="Tags" className="mb-5">
              <div className="flex flex-wrap gap-1.5">
                {photo.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/t/${t}`}
                    className="rounded-full border border-amber/25 px-3 py-1.5 font-mono text-[10px] text-amber transition-colors hover:bg-amber/10"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Full size + comments */}
          <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
            <a
              href={photo.url.original}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-amber"
            >
              Full size ↗
            </a>
            <button
              onClick={() => setShowComments((v) => !v)}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-amber"
            >
              {showComments ? "Hide comments" : "Comments →"}
            </button>
          </div>
          {showComments && (
            <div className="mt-4">
              <PhotoComments photoId={photo.id} />
            </div>
          )}
        </div>
      </aside>

      {/* Right column — stage + mobile chrome */}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col sm:h-full sm:min-h-0 sm:overflow-hidden">

      {/* Header */}
      <div className="relative z-30 flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.28em] text-amber lg:invisible">
          Frame <span className="text-text">{String(index + 1).padStart(3, "0")}</span>
          <span className="text-muted"> / {String(total).padStart(3, "0")}</span>
        </span>
        {!info && (
          <p className="hidden min-w-0 flex-1 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted sm:block">
            <span className="text-muted-2">← →</span> previous / next
            <span className="lg:hidden">
              <span className="mx-2 text-line-2">·</span>
              <span className="text-muted-2">I</span> details
            </span>
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
            onClick={toggleInfo}
            aria-pressed={info}
            className={`mr-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors lg:hidden ${info ? "border-amber/60 bg-amber/10 text-amber" : "border-line-2 text-muted-2 hover:text-text"}`}
          >
            <Icon d="M12 16v-5M12 8h.01" className="h-3.5 w-3.5" /> Info
          </button>
          <button onClick={close} aria-label="Close" className="inline-flex h-11 w-11 items-center justify-center text-muted-2 transition-colors hover:text-text">
            <Icon d="M18 6L6 18M6 6l12 12" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* Stage — auto height on mobile (image fills width), flex-1 on desktop */}
      <div
        ref={stageRef}
        className="relative sm:min-h-0 sm:flex-1"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="absolute inset-0" onClick={toggleInfo} aria-hidden />

        <div className="pointer-events-none relative flex justify-center sm:h-full sm:items-center sm:px-14">
          {/* Thumbhash blur placeholder */}
          {placeholder && !isVideo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={placeholder}
              alt=""
              aria-hidden
              style={{ aspectRatio: photo.aspect > 0 ? photo.aspect : 1 }}
              className={`pointer-events-none absolute inset-0 h-full w-full object-cover blur-[18px] transition-opacity duration-500 ${largeLoaded ? "opacity-0" : "opacity-80"}`}
            />
          )}
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
              onClick={togglePlayback}
              className={`pointer-events-auto w-full cursor-pointer object-contain sm:max-h-full sm:w-auto transition-opacity duration-200 ${transitioning ? "opacity-30" : "opacity-100"}`}
              style={{ transform: zoom !== 1 ? `scale(${zoom}) translate(${panX/zoom}px, ${panY/zoom}px)` : undefined, transition: zoom === 1 ? "transform 0.25s ease" : "none", transformOrigin: "center center" }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url.large}
              alt={photo.caption ?? `Frame ${index + 1}`}
              width={photo.width}
              height={photo.height}
              onClick={toggleInfo}
              onLoad={() => { setTransitioning(false); setLargeLoaded(true) }}
              className={`pointer-events-auto relative w-full cursor-pointer object-contain sm:max-h-full sm:w-auto sm:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] transition-opacity duration-300 ${transitioning ? "opacity-30" : "opacity-100"}`}
              style={{ transform: zoom !== 1 ? `scale(${zoom}) translate(${panX/zoom}px, ${panY/zoom}px)` : undefined, transition: zoom === 1 ? "transform 0.25s ease" : "none", transformOrigin: "center center" }}
            />
          )}
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

      {/* Caption + location + date — directly below image (mobile/tablet) */}
      {!info && (photo.caption || locationLine || date) && (
        <div className="relative z-20 bg-bg px-5 pb-6 pt-4 sm:px-7 lg:hidden">
          {photo.caption && (
            <p className="mb-3 font-serif text-[21px] italic leading-[1.3] tracking-[-0.01em] text-text sm:text-[23px]">
              {photo.caption}
            </p>
          )}
          {(locationLine || date) && (
            <div className="flex items-center justify-between gap-3">
              {locationLine ? (
                <a
                  href={photo.lat != null && photo.lon != null
                    ? `/atlas?lat=${photo.lat}&lon=${photo.lon}&z=13&slug=${photo.slug}`
                    : "/atlas"}
                  className="group/loc flex min-w-0 items-center gap-1.5 py-1"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[10px] w-[10px] shrink-0 text-amber/50 transition-colors group-hover/loc:text-amber" aria-hidden>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors group-hover/loc:text-amber">
                    {flag ? <span className="mr-1">{flag}</span> : flagSrc ? <img src={flagSrc} alt="" aria-hidden className="mr-1 inline-block h-[10px] w-auto align-middle" /> : null}{locationLine}
                  </span>
                </a>
              ) : <span />}
              {date && (
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted/60">
                  {date}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info panel — fixed bottom sheet on mobile/tablet; desktop uses sidebar */}
      <div
        aria-hidden={!info}
        className={`fixed inset-x-0 bottom-0 z-40 grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:static sm:inset-x-auto sm:bottom-auto sm:z-auto lg:hidden ${info ? "grid-rows-[1fr]" : "pointer-events-none grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-line-2 bg-bg-2/95 backdrop-blur-md">

            {/* Main metadata — scrollable, capped height */}
            <div
              className="mx-auto max-w-[900px] overflow-y-auto overscroll-contain px-4 pb-5 pt-6 sm:px-6"
              style={{ maxHeight: "min(55vh, 380px)" }}
            >
              {/* Caption + location + date — repeated here so it never hides under the sheet */}
              {photo.caption && (
                <p className="mb-3 font-serif text-[19px] italic leading-[1.35] text-text">
                  {photo.caption}
                </p>
              )}
              {(locationLine || date) && (
                <div className="mb-5 flex items-center justify-between gap-3">
                  {locationLine ? (
                    <a
                      href={photo.lat != null && photo.lon != null
                        ? `/atlas?lat=${photo.lat}&lon=${photo.lon}&z=13&slug=${photo.slug}`
                        : "/atlas"}
                      className="group/loc flex min-w-0 items-center gap-1.5"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-[11px] w-[11px] shrink-0 text-amber/50 transition-colors group-hover/loc:text-amber" aria-hidden>
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors group-hover/loc:text-amber">
                        {flag ? <span className="mr-1">{flag}</span> : flagSrc ? <img src={flagSrc} alt="" aria-hidden className="mr-1 inline-block h-[10px] w-auto align-middle" /> : null}{locationLine}
                      </span>
                    </a>
                  ) : <span />}
                  {date && (
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted/60">
                      {date}{time ? ` · ${time}` : ""}
                    </span>
                  )}
                </div>
              )}

              {/* Camera */}
              {!isVideo && (photo.camera || photo.lens || cameraSpecs.length > 0) && (
                <Section label="Camera" className="mb-5">
                  {photo.camera && (
                    <p className="font-mono text-[11px] uppercase leading-snug tracking-[0.08em] text-text/90">{photo.camera}</p>
                  )}
                  {photo.lens && (
                    <p className="mt-0.5 font-mono text-[9.5px] uppercase leading-snug tracking-[0.08em] text-muted-2">{photo.lens}</p>
                  )}
                  {cameraSpecs.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-x-3 gap-y-3 max-[420px]:grid-cols-2">
                      {cameraSpecs.map((s) => <SpecCell key={s.label} label={s.label} value={s.value} />)}
                    </div>
                  )}
                </Section>
              )}

              {/* File */}
              {fileSpecs.length > 0 && (
                <Section label="File" className="mb-5">
                  <div className="grid grid-cols-4 gap-x-3 gap-y-3 max-[420px]:grid-cols-2">
                    {fileSpecs.map((s) => <SpecCell key={s.label} label={s.label} value={s.value} />)}
                  </div>
                </Section>
              )}

              {/* Tags */}
              {photo.tags.length > 0 && (
                <Section label="Tags" className="mb-5">
                  <div className="flex flex-wrap gap-1.5">
                    {photo.tags.map((t) => (
                      <Link
                        key={t}
                        href={`/t/${t}`}
                        className="rounded-full border border-amber/25 px-3 py-1.5 font-mono text-[10px] text-amber transition-colors hover:bg-amber/10"
                      >
                        #{t}
                      </Link>
                    ))}
                  </div>
                </Section>
              )}

              {/* Full size + Comments toggle */}
              <div className="flex items-center justify-between gap-4">
                <a
                  href={photo.url.original}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-amber"
                >
                  Full size ↗
                </a>
                <button
                  onClick={() => setShowComments((v) => !v)}
                  className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-amber"
                >
                  {showComments ? "Hide comments" : "Comments →"}
                </button>
              </div>
            </div>

            {/* Comments — outside scrollable div so expansion grows the panel upward */}
            <div className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${showComments ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div
                  className="mx-auto max-w-[900px] overflow-y-auto overscroll-contain px-4 pb-6 sm:px-6"
                  style={{ maxHeight: "min(35vh, 280px)" }}
                >
                  {showComments && <PhotoComments photoId={photo.id} />}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      </div>{/* /right column */}

      <ShortcutsOverlay />
    </div>
  )
}
  