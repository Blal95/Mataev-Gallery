"use client"

import { useState } from "react"
import { flagEmoji } from "@/lib/format"
import { staticMapUrl } from "@/lib/maptiler"
import type { PhotoDTO } from "@/types/photo"

export function MapChip({ photo, mapKey }: { photo: PhotoDTO; mapKey: string }) {
  const [mapFailed, setMapFailed] = useState(false)

  // No coordinates — show the place name only (or nothing).
  if (photo.lat == null || photo.lon == null) {
    if (!photo.place) return null
    return (
      <div className="text-right">
        <div className="text-[11px] text-text">
          {flagEmoji(photo.countryCode)} {photo.place}
        </div>
      </div>
    )
  }

  const url = staticMapUrl({ lat: photo.lat, lon: photo.lon, zoom: 9, w: 116, h: 78, key: mapKey })
  // Show the map only if we have a URL AND it actually loaded. A missing or
  // invalid MapTiler key (the tile would render an "invalid key" error image)
  // falls back gracefully to place + coordinates text.
  const showMap = Boolean(url) && !mapFailed

  return (
    <div className="w-[116px] shrink-0 text-right">
      {showMap && (
        <div className="relative h-[78px] overflow-hidden rounded-[5px] border border-line-2 bg-[#0a1322]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url!}
            alt={photo.place ?? "Map"}
            className="h-full w-full object-cover"
            onError={() => setMapFailed(true)}
          />
          <div className="absolute left-[58%] top-[42%] h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan shadow-[0_0_0_4px_rgba(91,192,235,0.22),0_0_14px_#5BC0EB]" />
        </div>
      )}
      <div className="mt-1.5 text-[11px] text-text">
        {flagEmoji(photo.countryCode)} {photo.place}
      </div>
      <div className="mt-0.5 font-mono text-[8.5px] tracking-[0.06em] text-muted">
        {photo.lat.toFixed(2)}°{photo.lat >= 0 ? "N" : "S"} {Math.abs(photo.lon).toFixed(2)}°{photo.lon >= 0 ? "E" : "W"}
      </div>
    </div>
  )
}
