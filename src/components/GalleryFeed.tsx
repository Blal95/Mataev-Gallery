"use client"

import { useEffect, useRef, useState } from "react"
import { MosaicGrid } from "./MosaicGrid"
import type { PhotoDTO } from "@/types/photo"

const PAGE = 48

export function GalleryFeed({
  initialPhotos,
  initialNextOffset,
  tag,
}: {
  initialPhotos: PhotoDTO[]
  initialNextOffset: number | null
  tag?: string
}) {
  const [photos, setPhotos] = useState<PhotoDTO[]>(initialPhotos)
  const [nextOffset, setNextOffset] = useState<number | null>(initialNextOffset)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const fetchingRef = useRef(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        if (nextOffset == null) return
        if (fetchingRef.current) return

        fetchingRef.current = true
        setLoading(true)

        const url = `/api/photos?limit=${PAGE}&offset=${nextOffset}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`

        fetch(url)
          .then((r) => r.json() as Promise<{ photos: PhotoDTO[]; nextOffset?: number | null }>)
          .then((data) => {
            setPhotos((prev) => {
              const existingIds = new Set(prev.map((p) => p.id))
              const fresh = data.photos.filter((p) => !existingIds.has(p.id))
              return [...prev, ...fresh]
            })
            setNextOffset(data.nextOffset ?? null)
          })
          .catch(() => {
            // silently ignore — user can scroll again
          })
          .finally(() => {
            setLoading(false)
            fetchingRef.current = false
          })
      },
      { rootMargin: "400px" },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [nextOffset, tag])

  return (
    <>
      <MosaicGrid photos={photos} />
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      {loading && (
        <div className="flex justify-center py-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted animate-pulse">
            Loading
          </span>
        </div>
      )}
    </>
  )
}
