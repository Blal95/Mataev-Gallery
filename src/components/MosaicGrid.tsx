"use client"

import { useEffect, useRef, useState } from "react"
import { computeColumns, columnsForWidth } from "@/lib/masonry"
import { PhotoTile } from "./PhotoTile"
import type { PhotoDTO } from "@/types/photo"

// Every 7th photo (6 normal + 1 full-width) gives VSCO-style size variety
// without cropping — the full image is shown at its natural aspect ratio.
function isFeatured(index: number) {
  return index % 7 === 6
}

export function MosaicGrid({ photos }: { photos: PhotoDTO[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const gap = w < 640 ? 8 : 14
  const isMobile = w > 0 && w < 640

  // ── Mobile: 2-col grid; every 7th photo spans the full row ──
  if (isMobile) {
    const colW = (w - gap) / 2
    return (
      <div ref={ref} className="px-4">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap }}>
          {photos.map((photo, i) => {
            const featured = isFeatured(i)
            return (
              <div key={photo.id} style={featured ? { gridColumn: "1 / -1" } : undefined}>
                <PhotoTile
                  photo={photo}
                  width={Math.round(featured ? w : colW)}
                  index={i}
                  priority={i < 4}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Desktop: balanced masonry ──
  const columns = columnsForWidth(w)
  const cols =
    w > 0
      ? computeColumns(
          photos.map((p) => ({ id: p.id, aspect: p.aspect })),
          { containerWidth: w, columns, gap },
        )
      : []
  const byId = new Map(photos.map((p, i) => [p.id, { p, i }]))

  return (
    <div ref={ref} className="px-4 sm:px-5">
      <div className="flex items-start" style={{ gap }}>
        {cols.map((col, ci) => (
          <div key={ci} className="flex min-w-0 flex-1 flex-col" style={{ gap }}>
            {col.boxes.map((b) => {
              const entry = byId.get(b.id)!
              return (
                <PhotoTile
                  key={b.id}
                  photo={entry.p}
                  width={b.width}
                  index={entry.i}
                  priority={entry.i < columns}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
