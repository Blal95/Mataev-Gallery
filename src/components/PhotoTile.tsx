"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { thumbhashToUrl } from "@/lib/thumbhash"
import type { PhotoDTO } from "@/types/photo"

function Tick({ pos }: { pos: string }) {
  return <span aria-hidden className={`pointer-events-none absolute h-2 w-2 border-amber/0 transition-colors duration-300 group-hover:border-amber/70 ${pos}`} />
}

export function PhotoTile({
  photo, width, index, priority,
}: { photo: PhotoDTO; width: number; index: number; priority?: boolean }) {
  const delay = `${Math.min(index, 24) * 28}ms`
  const [loaded, setLoaded] = useState(false)
  const placeholder = useMemo(() => thumbhashToUrl(photo.thumbhash), [photo.thumbhash])
  const colW = Math.round(width)
  const frame = String(index + 1).padStart(3, "0")

  // Optimized srcSet calculation ensures we serve the right resolution for the grid column
  const srcSet = useMemo(() => {
    const longEdge = Math.max(photo.width, photo.height) || 1
    const thumbW = Math.max(1, Math.round(photo.width * Math.min(1, 500 / longEdge)))
    const largeW = Math.max(1, Math.round(photo.width * Math.min(1, 1600 / longEdge)))
    if (thumbW === largeW) return `${photo.url.thumb} ${thumbW}w`
    return `${photo.url.thumb} ${thumbW}w, ${photo.url.large} ${largeW}w`
  }, [photo.width, photo.height, photo.url.thumb, photo.url.large])

  return (
    <Link
      href={`/p/${photo.slug}`}
      scroll={false}
      className="group relative block w-full overflow-hidden border border-line bg-bg-2 outline-none transition-[transform,border-color,box-shadow] duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-10 hover:-translate-y-[3px] hover:border-line-2 hover:shadow-[0_18px_44px_-14px_rgba(0,0,0,0.8)]"
      style={{ 
        aspectRatio: photo.aspect > 0 ? photo.aspect : 1, 
        animation: `tile-in 0.45s cubic-bezier(0.16,1,0.3,1) ${delay} both` 
      }}
    >
      {/* Thumbhash placeholder - shown until the main image loads */}
      {placeholder && !loaded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={placeholder} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-105 object-cover blur-[2px]" />
      )}

      {/* Main content image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url.thumb}
        srcSet={srcSet}
        sizes={`${colW}px`}
        alt={photo.caption ?? `Frame ${frame}`}
        width={photo.width}
        height={photo.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`relative h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out group-hover:scale-[1.03] ${loaded ? "opacity-100" : "opacity-0"}`}
      />

      {/* Archival frame marker */}
      <span className="pointer-events-none absolute left-2 top-2 font-mono text-[9px] tracking-[0.14em] text-amber/85 mix-blend-screen drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        F{frame}
      </span>

      {/* Video indicator badge */}
      {photo.mediaType === "video" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg/50 backdrop-blur-sm ring-1 ring-amber/40">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 translate-x-0.5 text-amber/90" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Registration corners */}
      <Tick pos="left-1 top-1 border-l border-t" />
      <Tick pos="right-1 top-1 border-r border-t" />
      <Tick pos="left-1 bottom-1 border-l border-b" />
      <Tick pos="right-1 bottom-1 border-r border-b" />

      {/* Caption overlay - Location/Flag logic removed for cleaner UI */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0908]/85 via-[#0a0908]/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 px-3 pb-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        {photo.caption && (
          <p className="mb-0.5 line-clamp-1 font-serif text-[15px] italic leading-tight text-text">
            {photo.caption}
          </p>
        )}
      </div>

      {/* Animated amber accent line on hover */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-amber transition-transform duration-300 ease-out group-hover:scale-x-100" />
    </Link>
  )
}