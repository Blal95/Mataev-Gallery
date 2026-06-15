"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { LocationMap } from "./LocationMap"
import { PhotoComments } from "./PhotoComments"
import { ShortcutsOverlay } from "./ShortcutsOverlay"
import { flagEmoji, flagUrl, displayCountry, isInChechnya, formatDuration, formatBytes, formatExposure, formatAperture, formatFocal } from "@/lib/format"
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
  // sessionStorage is unavailable during SSR, so the persisted info-panel
  // state has to load in an effect — a lazy useState initializer would render
  // different HTML on the server and trip hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInfo(sessionStorage.getItem("detail-info") === "1")
  }, [])
  const [transitioning, setTransitioning] = useState(false)
  // Start unmuted: opening a photo is a user gesture, so most browsers allow
  // audible autoplay. The autoplay effect falls back to muted if blocked.
  const [isMuted, setIsMuted] = useState(false)
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
  const rootRef = useRef<HTMLDivElement>(null)
  const infoRef = useRef<HTMLDivElement>(null)
  const bottomBarRef = useRef<HTMLDivElement>(null)

  // Discrete zoom changes (double-tap, keys, reset) animate; continuous
  // gestures (pinch, wheel, drag) must track the pointer with no easing.
  const [smoothZoom, setSmoothZoom] = useState(true)

  const applyZoom = (z: number, px: number, py: number, smooth = false) => {
    setSmoothZoom(smooth)
    zoomRef.current = z
    panRef.current = { x: px, y: py }
    setZoom(z); setPanX(px); setPanY(py)
  }
  const resetZoom = () => applyZoom(1, 0, 0, true)

  /** Zoom anchored at a viewport point so it stays put under cursor/finger. */
  const zoomAt = (clientX: number, clientY: number, z1: number, smooth = false) => {
    const stage = stageRef.current
    if (!stage) return
    if (z1 <= 1.001) { resetZoom(); return }
    const r = stage.getBoundingClientRect()
    const cx = clientX - (r.left + r.width / 2)
    const cy = clientY - (r.top + r.height / 2)
    const z0 = zoomRef.current
    const px = cx - (z1 / z0) * (cx - panRef.current.x)
    const py = cy - (z1 / z0) * (cy - panRef.current.y)
    applyZoom(z1, px, py, smooth)
  }
  const videoRef = useRef<HTMLVideoElement>(null)
  const [canPlay, setCanPlay] = useState(false)
  const [largeLoaded, setLargeLoaded] = useState(false)
  const isVideo = photo.mediaType === "video"

  // Render-time reset when navigating between photos (the React-endorsed
  // alternative to a photo.id effect — no flash of stale zoom/video state).
  // The refs mirror zoom/pan state for gesture math and must reset in the
  // same pass, hence the targeted disable.
  if (seenId !== photo.id) {
    setSeenId(photo.id); setTransitioning(false); setShowComments(false)
    // eslint-disable-next-line react-hooks/refs
    zoomRef.current = 1; panRef.current = { x: 0, y: 0 }
    setZoom(1); setPanX(0); setPanY(0)
    setCanPlay(false); setVideoTime(0); setIsPlaying(false)
    setLargeLoaded(false)
  }
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const placeholder = thumbhashToUrl(photo.thumbhash)

  const close = () => {
    if (asModal) router.back()
    else router.push("/")
  }

  // Info sheet only exists below lg — desktop has the permanent sidebar
  const toggleInfo = () => {
    if (typeof window !== "undefined" && (window.innerWidth >= 1024 || window.matchMedia("(orientation: landscape)").matches)) return
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
    if (zoomRef.current > 1) {
      panStart.current = { tx: e.touches[0].clientX, ty: e.touches[0].clientY, px: panRef.current.x, py: panRef.current.y }
    }
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (pinchStartDist.current != null) {
      pinchStartDist.current = null
      if (zoomRef.current <= 1.05) resetZoom()
      return
    }
    panStart.current = null
    if (touchStartX.current == null || touchStartY.current == null) return
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const dx = endX - touchStartX.current
    const dy = endY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    // Tap: little movement. Double-tap toggles zoom; a single tap does nothing —
    // info is opened via the header button, never by tapping the photo.
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      if ((e.target as HTMLElement).tagName === "VIDEO") return
      const now = Date.now()
      if (now - lastTapTime.current < 300) {
        lastTapTime.current = 0
        if (zoomRef.current > 1) resetZoom()
        else zoomAt(endX, endY, 2.5, true)
      } else {
        lastTapTime.current = now
      }
      return
    }

    // Swipe nav only when not zoomed (panning owns the gesture while zoomed)
    if (zoomRef.current > 1) return

    // Vertical swipe — open/close info sheet on portrait mobile
    if (Math.abs(dy) > Math.abs(dx)) {
      const isPortraitMobile = typeof window !== "undefined"
        && window.innerWidth < 1024
        && !window.matchMedia("(orientation: landscape)").matches
      if (isPortraitMobile) {
        if (dy < -50 && !info) { setInfo(true); return }
        if (dy > 50 && info) { setInfo(false); return }
      }
      return
    }

    // Horizontal swipe — navigate between photos
    if (Math.abs(dx) < 50) return
    if (dx < 0 && next) goto(next.slug)
    if (dx > 0 && prev) goto(prev.slug)
  }

  // Mouse: drag pans while zoomed, double-click toggles zoom, wheel zooms
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoomRef.current <= 1 || e.button !== 0) return
    e.preventDefault()
    const start = { tx: e.clientX, ty: e.clientY, px: panRef.current.x, py: panRef.current.y }
    const move = (ev: MouseEvent) => {
      setSmoothZoom(false)
      panRef.current = { x: start.px + (ev.clientX - start.tx), y: start.py + (ev.clientY - start.ty) }
      setPanX(panRef.current.x); setPanY(panRef.current.y)
    }
    const up = () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
    }
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "VIDEO") return
    e.preventDefault()
    if (zoomRef.current > 1) resetZoom()
    else zoomAt(e.clientX, e.clientY, 2.5, true)
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
      if ((e.key === "i" || e.key === "I") && window.innerWidth < 1024 && !window.matchMedia("(orientation: landscape)").matches) setInfo((v) => !v)
      if (e.key === " " && isVideo) { e.preventDefault(); togglePlayback() }
      if ((e.key === "m" || e.key === "M") && isVideo) setIsMuted((v) => !v)
      if (e.key === "+" || e.key === "=") zoomAt(window.innerWidth / 2, window.innerHeight / 2, Math.min(5, zoomRef.current * 1.4), true)
      if (e.key === "-") zoomAt(window.innerWidth / 2, window.innerHeight / 2, zoomRef.current / 1.4, true)
      if (e.key === "0") resetZoom()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, asModal, prev, next, info, isVideo])

  // Lock body scroll and disable pull-to-refresh while photo detail is open
  useEffect(() => {
    const { style } = document.body
    const htmlStyle = document.documentElement.style
    const prevOverflow = style.overflow
    const prevOverscroll = style.overscrollBehavior
    const prevHtmlOverscroll = htmlStyle.overscrollBehavior
    style.overflow = "hidden"
    style.overscrollBehavior = "none"
    htmlStyle.overscrollBehavior = "none"   // Chrome Android needs html, not just body
    return () => {
      style.overflow = prevOverflow
      style.overscrollBehavior = prevOverscroll
      htmlStyle.overscrollBehavior = prevHtmlOverscroll
    }
  }, [])

  // Reset any page-level pinch zoom carried over from the gallery and keep
  // page zoom locked while the detail view is open — zooming in here is the
  // custom transform kind. Restored on close so the feed stays zoomable.
  // useLayoutEffect (not useEffect) so this fires before the first paint;
  // useEffect fires after paint, meaning the user would see the modal zoomed in
  // for one frame before the viewport snapped back.
  // minimum-scale + maximum-scale both set to 1 forces the viewport to snap
  // exactly to scale=1 on iOS and Android.
  useLayoutEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    if (!meta) return
    const original = meta.content
    meta.content = "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no"
    return () => { meta.content = original }
  }, [])

  // Desktop browsers ignore the viewport meta tag entirely, and there is no
  // JS API to reset trackpad pinch zoom (window.visualViewport is read-only).
  // Instead, counter-transform the detail view: translate it to the visual
  // viewport's origin and scale it by 1/scale, so it renders at apparent
  // scale 1 and fills the screen regardless of any lingering pinch zoom.
  // The element's CSS size equals the layout viewport, so after scaling by
  // 1/scale its footprint exactly matches the visible region.
  // Cleared on close so the gallery keeps the user's zoom level.
  useLayoutEffect(() => {
    const vv = window.visualViewport
    const el = rootRef.current
    if (!vv || !el) return
    const apply = () => {
      if (vv.scale > 1.001) {
        el.style.transformOrigin = "0 0"
        el.style.transform = `translate(${vv.offsetLeft}px, ${vv.offsetTop}px) scale(${1 / vv.scale})`
      } else {
        el.style.transform = ""
        el.style.transformOrigin = ""
      }
    }
    apply()
    vv.addEventListener("resize", apply)
    vv.addEventListener("scroll", apply)
    return () => {
      vv.removeEventListener("resize", apply)
      vv.removeEventListener("scroll", apply)
      el.style.transform = ""
      el.style.transformOrigin = ""
    }
  }, [])

  // Persist info panel open/close state across navigation
  useEffect(() => {
    sessionStorage.setItem("detail-info", info ? "1" : "0")
  }, [info])

  // Drive the info panel position from React state — all gesture handlers
  // manipulate the DOM directly during drags; state change snaps via this effect.
  useEffect(() => {
    const el = infoRef.current
    if (!el) return
    el.style.transition = "transform 0.45s cubic-bezier(0.16,1,0.3,1)"
    el.style.transform = info ? "translateY(0)" : "translateY(100%)"
  }, [info])

  // Real-time drag on the panel itself (when open → drag down to close).
  // Uses native listeners so touchmove can be { passive: false } for preventDefault.
  useEffect(() => {
    const el = infoRef.current
    if (!el) return
    let startY = 0, startT = 0, t0 = 0
    const getT = () => new DOMMatrix(getComputedStyle(el).transform).m42
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      startT = getT()
      t0 = Date.now()
      el.style.transition = "none"
    }
    const onMove = (e: TouchEvent) => {
      e.preventDefault()
      const dy = e.touches[0].clientY - startY
      el.style.transform = `translateY(${Math.max(0, startT + dy)}px)`
    }
    const onEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY
      const vel = dy / Math.max(1, Date.now() - t0)
      const h = el.offsetHeight
      const cur = Math.max(0, startT + dy)
      const close = vel > 0.5 || (vel > -0.3 && cur > h * 0.38)
      el.style.transition = "transform 0.42s cubic-bezier(0.16,1,0.3,1)"
      el.style.transform = close ? `translateY(${h}px)` : "translateY(0)"
      setInfo(!close)
    }
    el.addEventListener("touchstart", onStart, { passive: true })
    el.addEventListener("touchmove", onMove, { passive: false })
    el.addEventListener("touchend", onEnd, { passive: true })
    return () => {
      el.removeEventListener("touchstart", onStart)
      el.removeEventListener("touchmove", onMove)
      el.removeEventListener("touchend", onEnd)
    }
  }, [])

  // Swipe-up from bottom bar opens panel with real-time peek.
  useEffect(() => {
    const bar = bottomBarRef.current
    const panel = infoRef.current
    if (!bar || !panel) return
    let startY = 0, t0 = 0
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY; t0 = Date.now() }
    const onMove = (e: TouchEvent) => {
      e.preventDefault()
      const dy = e.touches[0].clientY - startY
      if (dy < 0) {
        panel.style.transition = "none"
        panel.style.transform = `translateY(${Math.max(0, panel.offsetHeight + dy)}px)`
      }
    }
    const onEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY
      const vel = dy / Math.max(1, Date.now() - t0)
      const open = dy < -40 || vel < -0.3
      panel.style.transition = "transform 0.42s cubic-bezier(0.16,1,0.3,1)"
      panel.style.transform = open ? "translateY(0)" : `translateY(${panel.offsetHeight}px)`
      setInfo(open)
    }
    bar.addEventListener("touchstart", onStart, { passive: true })
    bar.addEventListener("touchmove", onMove, { passive: false })
    bar.addEventListener("touchend", onEnd, { passive: true })
    return () => {
      bar.removeEventListener("touchstart", onStart)
      bar.removeEventListener("touchmove", onMove)
      bar.removeEventListener("touchend", onEnd)
    }
  }, [])

  // Count a view once per photo per browser session — covers both the full
  // page and the intercepted modal route.
  useEffect(() => {
    const key = `viewed-${photo.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")
    fetch(`/api/photos/${photo.id}/view`, { method: "POST" }).catch(() => {})
  }, [photo.id])

  // Autoplay shortly after the video is ready. Try with sound first (opening the
  // photo is a user gesture, so this is usually allowed); fall back to muted
  // autoplay if the browser blocks audible playback.
  useEffect(() => {
    if (!isVideo || !canPlay) return
    const t = setTimeout(() => {
      const v = videoRef.current
      if (!v) return
      v.play().catch(() => {
        v.muted = true
        setIsMuted(true)
        v.play().catch(() => {})
      })
    }, 300)
    return () => clearTimeout(t)
  }, [isVideo, canPlay])

  // Safety timeout so blur removes even if onLoad never fires (e.g. cached
  // image). The reset itself happens in the render-time seenId block above.
  useEffect(() => {
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
    const zoomAtPoint = (clientX: number, clientY: number, z1: number) => {
      setSmoothZoom(false)
      if (z1 <= 1.001) {
        zoomRef.current = 1; panRef.current = { x: 0, y: 0 }
        setZoom(1); setPanX(0); setPanY(0)
        return
      }
      const r = stage.getBoundingClientRect()
      const cx = clientX - (r.left + r.width / 2)
      const cy = clientY - (r.top + r.height / 2)
      const z0 = zoomRef.current
      const px = cx - (z1 / z0) * (cx - panRef.current.x)
      const py = cy - (z1 / z0) * (cy - panRef.current.y)
      zoomRef.current = z1; panRef.current = { x: px, y: py }
      setZoom(z1); setPanX(px); setPanY(py)
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current != null) {
        e.preventDefault()
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const newZoom = Math.max(1, Math.min(5, pinchStartZoom.current * (dist / pinchStartDist.current)))
        zoomAtPoint(midX, midY, newZoom)
        return
      }
      if (e.touches.length === 1 && zoomRef.current > 1 && panStart.current) {
        e.preventDefault()
        setSmoothZoom(false)
        const nx = panStart.current.px + (e.touches[0].clientX - panStart.current.tx)
        const ny = panStart.current.py + (e.touches[0].clientY - panStart.current.ty)
        panRef.current = { x: nx, y: ny }
        setPanX(nx); setPanY(ny)
        return
      }
      // Not zoomed: swallow vertical drags so the page never scrolls or
      // rubber-bands while a photo is open.
      if (e.touches.length === 1) e.preventDefault()
    }
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const z1 = Math.max(1, Math.min(5, zoomRef.current * Math.exp(-e.deltaY * 0.0022)))
      zoomAtPoint(e.clientX, e.clientY, z1)
    }
    stage.addEventListener("touchmove", handleTouchMove, { passive: false })
    stage.addEventListener("wheel", handleWheel, { passive: false })
    return () => {
      stage.removeEventListener("touchmove", handleTouchMove)
      stage.removeEventListener("wheel", handleWheel)
    }
  }, [])

  // Pause playback when navigating away — playback state itself resets in
  // the render-time seenId block above.
  useEffect(() => {
    if (!isVideo) return
    videoRef.current?.pause()
  }, [photo.id, isVideo])

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
  const locationLine = [photo.place, displayCountry(photo.country, photo.countryCode, photo.lat, photo.lon)].filter(Boolean).join(", ")

  // Header nav buttons — prev/next live in the top bar so nothing ever overlays
  // the photograph (mobile also swipes; desktop also uses arrow keys).
  const hdrBtn = "inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-2 transition-colors hover:text-amber disabled:pointer-events-none disabled:opacity-25"

  return (
    <div ref={rootRef} className="flex h-dvh w-full overflow-hidden bg-bg">
      {/* Progress bar */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 z-50 h-[2px] bg-amber origin-left transition-transform duration-300 ease-out ${transitioning ? "scale-x-[0.85]" : "scale-x-0"}`}
        style={{ transitionDuration: transitioning ? "1200ms" : "150ms" }}
      />

      {/* Desktop sidebar — always visible on lg+, all metadata lives here */}
      <aside className="relative z-30 hidden w-[260px] shrink-0 flex-col border-r border-line bg-bg-2/50 landscape:flex lg:w-[340px] lg:flex">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-8 pt-6">
          {/* Frame counter */}
          <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.28em] text-amber">
            Frame <span className="text-text">{String(index + 1).padStart(3, "0")}</span>
            <span className="text-muted"> / {String(total).padStart(3, "0")}</span>
          </p>

          {/* Caption — primary read */}
          {photo.caption && (
            <div className="mb-6">
              <p className="mb-2 font-mono text-[8.5px] uppercase tracking-[0.24em] text-muted/60">Caption</p>
              <p className="font-serif text-[23px] italic leading-[1.35] tracking-[-0.01em] text-text">
                {photo.caption}
              </p>
            </div>
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
                  <LocationMap lat={photo.lat} lon={photo.lon} zoom={8} className="h-44 w-full" label={isInChechnya(photo.lat, photo.lon) ? "Chechnya" : undefined} />
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
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">

      {/* Portrait: floating gradient + controls overlay — zero in-flow height, photo gets full stage */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-40 h-28 bg-gradient-to-b from-bg/80 to-transparent landscape:hidden lg:hidden" />
      <div className="absolute left-0 right-0 top-0 z-50 flex items-start justify-between px-3 pt-[max(0.625rem,env(safe-area-inset-top))] landscape:hidden lg:hidden backdrop-blur-sm bg-bg/60">
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.28em] text-amber drop-shadow-sm">
          Frame <span className="text-text">{String(index + 1).padStart(3, "0")}</span>
          <span className="text-muted"> / {String(total).padStart(3, "0")}</span>
        </span>
        <button onClick={close} aria-label="Close" className="inline-flex h-11 w-11 items-center justify-center text-muted-2 transition-colors hover:text-text">
          <Icon d="M18 6L6 18M6 6l12 12" className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Landscape/desktop in-flow header */}
      <div className="relative z-30 hidden shrink-0 items-center justify-between gap-4 px-4 pb-3 pt-[max(0.875rem,env(safe-area-inset-top))] landscape:flex sm:px-6 sm:py-4 lg:flex">
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.28em] text-amber landscape:invisible lg:invisible">
          Frame <span className="text-text">{String(index + 1).padStart(3, "0")}</span>
          <span className="text-muted"> / {String(total).padStart(3, "0")}</span>
        </span>
        {!info && (
          <p className="hidden min-w-0 flex-1 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted sm:block">
            <span className="text-muted-2">← →</span> previous / next
          </p>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          <div className="hidden items-center landscape:flex lg:flex">
            <button onClick={() => prev && goto(prev.slug)} disabled={!prev} aria-label="Previous frame" className={hdrBtn}>
              <Icon d="M15 18l-6-6 6-6" className="h-5 w-5" />
            </button>
            <button onClick={() => next && goto(next.slug)} disabled={!next} aria-label="Next frame" className={hdrBtn}>
              <Icon d="M9 18l6-6-6-6" className="h-5 w-5" />
            </button>
          </div>
          <button onClick={close} aria-label="Close" className="inline-flex h-11 w-11 items-center justify-center text-muted-2 transition-colors hover:text-text">
            <Icon d="M18 6L6 18M6 6l12 12" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* Stage — fills remaining viewport; the whole frame is always contained,
          so the info sheet below shrinks the image instead of covering it */}
      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
      >
        <div className="pointer-events-none absolute inset-y-0 inset-x-2 sm:inset-x-14">
          {/* Thumbhash blur placeholder — wrapper sized to the photo's actual rendered
              footprint so the blur never bleeds into the letterbox areas */}
          {placeholder && !isVideo && (
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-full max-w-full overflow-hidden transition-opacity duration-500 ${largeLoaded ? "opacity-0" : "opacity-80"}`}
              style={{ aspectRatio: photo.aspect > 0 ? photo.aspect : 1 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={placeholder} alt="" aria-hidden className="h-full w-full scale-105 object-cover blur-[8px]" />
            </div>
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
              className={`pointer-events-auto max-h-full max-w-full cursor-pointer object-contain transition-opacity duration-200 ${transitioning ? "opacity-30" : "opacity-100"}`}
              style={{ transform: zoom !== 1 ? `scale(${zoom}) translate(${panX/zoom}px, ${panY/zoom}px)` : undefined, transition: smoothZoom ? "transform 0.3s cubic-bezier(0.16,1,0.3,1)" : "none", transformOrigin: "center center" }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url.large}
              alt={photo.caption ?? `Frame ${index + 1}`}
              draggable={false}
              onLoad={() => { setTransitioning(false); setLargeLoaded(true) }}
              className={`pointer-events-auto absolute inset-0 h-full w-full object-contain [filter:drop-shadow(0_30px_80px_rgba(0,0,0,0.9))] transition-opacity duration-300 ${zoom > 1 ? "cursor-grab" : "cursor-zoom-in"} ${transitioning ? "opacity-30" : "opacity-100"}`}
              style={{ transform: zoom !== 1 ? `scale(${zoom}) translate(${panX/zoom}px, ${panY/zoom}px)` : undefined, transition: smoothZoom ? "transform 0.3s cubic-bezier(0.16,1,0.3,1)" : "none", transformOrigin: "center center" }}
            />
          )}
        </div>
      </div>

      {/* Video scrubber */}
      {isVideo && (
        <div className="relative z-20 flex items-center gap-3 border-t border-line bg-bg px-3 py-2.5 sm:px-5">
          <button
            onClick={togglePlayback}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-muted-2 transition-colors hover:text-amber"
          >
            {isPlaying
              ? <Icon d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" className="h-4 w-4" />
              : <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-current"><path d="M8 5v14l11-7z" /></svg>
            }
          </button>
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
          <button
            onClick={() => setIsMuted((v) => !v)}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-muted-2 transition-colors hover:text-amber"
          >
            {isMuted
              ? <Icon d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" className="h-4 w-4" />
              : <Icon d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" className="h-4 w-4" />
            }
          </button>
        </div>
      )}

      {/* Bottom action bar — portrait phones/tablets only.
          Houses prev/next nav and an info trigger (caption preview + pill).
          Replaces the old caption strip + header INFO button. */}
      <div
        ref={bottomBarRef}
        className="relative z-30 flex shrink-0 items-center border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] landscape:hidden lg:hidden"
      >
        <button
          onClick={() => prev && goto(prev.slug)}
          disabled={!prev}
          aria-label="Previous frame"
          className={`${hdrBtn} ml-1 shrink-0`}
        >
          <Icon d="M15 18l-6-6 6-6" className="h-5 w-5" />
        </button>

        <button
          onClick={toggleInfo}
          aria-expanded={info}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-3"
        >
          {!info && photo.caption && (
            <p className="line-clamp-1 px-2 font-serif text-[15px] italic leading-tight text-text/80">
              {photo.caption}
            </p>
          )}
          {!info && (locationLine || date) && (
            <p className="truncate px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {locationLine
                ? <>{flag ? <span className="mr-1">{flag}</span> : flagSrc ? <img src={flagSrc} alt="" aria-hidden className="mr-1 inline-block h-[10px] w-auto align-middle" /> : null}{locationLine}</>
                : date}
            </p>
          )}
          <span aria-hidden className={`h-[3px] w-8 rounded-full transition-colors duration-200 ${info ? "bg-amber/50" : "bg-line-2"}`} />
        </button>

        <button
          onClick={() => next && goto(next.slug)}
          disabled={!next}
          aria-label="Next frame"
          className={`${hdrBtn} mr-1 shrink-0`}
        >
          <Icon d="M9 18l6-6-6-6" className="h-5 w-5" />
        </button>
      </div>

      {/* Info sheet — absolute bottom sheet, slides up over the action bar.
          GPU-composited translateY animation; real-time drag via native listeners above. */}
      <div
        ref={infoRef}
        aria-hidden={!info}
        className={`absolute inset-x-0 bottom-0 z-50 landscape:hidden lg:hidden ${info ? "" : "pointer-events-none"}`}
        style={{ transform: "translateY(100%)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center rounded-t-2xl border-t border-line-2 bg-bg-2 pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-line-2" />
        </div>

        <div className="bg-bg-2 pb-[env(safe-area-inset-bottom)]">
          {/* Main metadata — scrollable, capped height */}
          <div
            className="mx-auto max-w-[900px] overflow-y-auto overscroll-contain px-4 pb-5 pt-2 sm:px-6"
            style={{ maxHeight: "min(55vh, 400px)" }}
          >
              {/* Caption + location + date — repeated here so it never hides under the sheet */}
              {photo.caption && (
                <>
                  <p className="mb-1.5 font-mono text-[8.5px] uppercase tracking-[0.24em] text-muted/60">Caption</p>
                  <p className="mb-3 font-serif text-[19px] italic leading-[1.35] text-text">
                    {photo.caption}
                  </p>
                </>
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

            {/* Comments */}
            <div className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${showComments ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div
                  className="mx-auto max-w-[900px] overflow-y-auto overscroll-contain px-4 pb-6 sm:px-6"
                  style={{ maxHeight: "min(25vh, 220px)" }}
                >
                  {showComments && <PhotoComments photoId={photo.id} />}
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
  