"use client"

import { useEffect, useRef, useState } from "react"
import { computeRows } from "@/lib/justified"
import { PhotoTile } from "./PhotoTile"
import type { PhotoDTO } from "@/types/photo"

const GAP = 12
const TARGET = 300

export function MosaicGrid({ photos }: { photos: PhotoDTO[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const target = w < 640 ? 200 : TARGET
  const rows = w > 0 ? computeRows(photos.map((p) => ({ id: p.id, aspect: p.aspect })), { containerWidth: w, targetHeight: target, gap: GAP }) : []
  const byId = new Map(photos.map((p, i) => [p.id, { p, i }]))

  return (
    <div ref={ref} className="px-5">
      <div className="flex flex-col" style={{ gap: GAP }}>
        {rows.map((row, ri) => (
          <div key={ri} className="flex" style={{ gap: GAP }}>
            {row.boxes.map((b) => {
              const entry = byId.get(b.id)!
              return <PhotoTile key={b.id} photo={entry.p} width={b.width} height={b.height} index={entry.i} priority={ri === 0} />
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
