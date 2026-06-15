"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
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

  useLayoutEffect(() => {
    if (ref.current) setW(ref.current.getBoundingClientRect().width)
  }, [])

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const gap = w < 640 ? 8 : 14
  const isMobile = w > 0 && w < 640

  // ── Mobile: two independent flex columns so tall photos don't create gaps ──
  if (isMobile) {
    const colW = Math.round((w - gap) / 2)
    const left = photos.filter((_, i) => i % 2 === 0)
    const right = photos.filter((_, i) => i % 2 !== 0)
    return (
      <div ref={ref} className="px-4">
        <div className="flex items-start" style={{ gap }}>
          <div className="flex flex-1 flex-col" style={{ gap }}>
            {left.map((photo, li) => (
              <PhotoTile key={photo.id} photo={photo} width={colW} index={li * 2} priority={li * 2 < 6} />
            ))}
          </div>
          <div className="flex flex-1 flex-col" style={{ gap }}>
            {right.map((photo, ri) => (
              <PhotoTile key={photo.id} photo={photo} width={colW} index={ri * 2 + 1} priority={ri * 2 + 1 < 6} />
            ))}
          </div>
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
                  priority={entry.i < columns * 2}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
