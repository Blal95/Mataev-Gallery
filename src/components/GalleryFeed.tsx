"use client"

import { useEffect, useRef, useState } from "react"
import { MosaicGrid } from "./MosaicGrid"
import type { PhotoDTO } from "@/types/photo"
import { PAGE_SIZE } from "@/config/site"

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
  const [error, setError] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const fetchingRef = useRef(false)

  // Keep mutable refs in sync so the mount-only observer effect can read
  // the latest values without being recreated on every page load.
  const nextOffsetRef = useRef<number | null>(initialNextOffset)
  const tagRef = useRef<string | undefined>(tag)

  useEffect(() => { nextOffsetRef.current = nextOffset }, [nextOffset])
  useEffect(() => { tagRef.current = tag }, [tag])

  // Mount-only observer — reads mutable refs in the callback.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        if (nextOffsetRef.current == null) return
        if (fetchingRef.current) return

        fetchingRef.current = true
        setLoading(true)
        setError(false)

        const currentTag = tagRef.current
        const offset = nextOffsetRef.current
        const url = `/api/photos?limit=${PAGE_SIZE}&offset=${offset}${currentTag ? `&tag=${encodeURIComponent(currentTag)}` : ""}`

        fetch(url)
          .then((r) => r.json() as Promise<{ photos: PhotoDTO[]; nextOffset?: number | null }>)
          .then((data) => {
            setPhotos((prev) => {
              const existingIds = new Set(prev.map((p) => p.id))
              const fresh = data.photos.filter((p) => !existingIds.has(p.id))
              return [...prev, ...fresh]
            })
            const next = data.nextOffset ?? null
            nextOffsetRef.current = next
            setNextOffset(next)
          })
          .catch(() => {
            setError(true)
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
  }, [])

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
      {error && !loading && (
        <div className="flex justify-center py-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Couldn&apos;t load more — scroll to retry
          </span>
        </div>
      )}
    </>
  )
}
