"use client"

import { useEffect, useState } from "react"
import { PhotoTile } from "./PhotoTile"
import type { PhotoDTO } from "@/types/photo"

function colCount(w: number) {
  if (w >= 1280) return 4
  if (w >= 1024) return 3
  return 2
}

// Greedy: always place next photo in shortest column (by cumulative 1/aspect height).
function distribute(photos: PhotoDTO[], n: number): PhotoDTO[][] {
  const cols: PhotoDTO[][] = Array.from({ length: n }, () => [])
  const heights = new Array<number>(n).fill(0)
  for (const p of photos) {
    const i = heights.indexOf(Math.min(...heights))
    cols[i].push(p)
    heights[i] += p.aspect > 0 ? 1 / p.aspect : 1
  }
  return cols
}

export function MosaicGrid({ photos }: { photos: PhotoDTO[] }) {
  const [n, setN] = useState(4)

  useEffect(() => {
    const update = () => setN(colCount(window.innerWidth))
    update()
    const mq1 = matchMedia("(min-width:640px)")
    const mq2 = matchMedia("(min-width:1024px)")
    mq1.addEventListener("change", update)
    mq2.addEventListener("change", update)
    return () => {
      mq1.removeEventListener("change", update)
      mq2.removeEventListener("change", update)
    }
  }, [])

  if (photos.length === 0) return null
  const idxMap = new Map(photos.map((p, i) => [p.id, i]))
  const cols = distribute(photos, n)

  return (
    <div className="flex gap-[8px] px-2 sm:gap-[10px] sm:px-4 lg:gap-[12px] lg:px-6">
      {cols.map((col, c) => (
        <div key={c} className="flex flex-1 flex-col gap-[8px] sm:gap-[10px] lg:gap-[12px]">
          {col.map((photo) => {
            const idx = idxMap.get(photo.id)!
            return <PhotoTile key={photo.id} photo={photo} index={idx} priority={idx < 12} />
          })}
        </div>
      ))}
    </div>
  )
}
