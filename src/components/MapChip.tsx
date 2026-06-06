"use client"

import { flagEmoji, flagUrl } from "@/lib/format"
import { LocationMap } from "./LocationMap"
import type { PhotoDTO } from "@/types/photo"

function FlagDisplay({ countryCode, lat, lon }: { countryCode: string | null; lat: number | null; lon: number | null }) {
  const emoji = flagEmoji(countryCode, lat, lon)
  if (emoji) return <>{emoji} </>
  const src = flagUrl(countryCode, lat, lon)
  if (src) return <img src={src} alt="" aria-hidden className="inline-block h-[11px] w-auto align-middle mr-0.5" />
  return null
}

export function MapChip({ photo }: { photo: PhotoDTO }) {
  // No coordinates — show the place name only (or nothing).
  if (photo.lat == null || photo.lon == null) {
    if (!photo.place) return null
    return (
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
        <FlagDisplay countryCode={photo.countryCode} lat={photo.lat} lon={photo.lon} />{photo.place}
      </div>
    )
  }

  return (
    <div className="w-[116px] shrink-0 text-right">
      <div className="relative h-[116px] overflow-hidden rounded-[5px] border border-line-2 bg-[#0a1322]">
        <LocationMap lat={photo.lat} lon={photo.lon} zoom={9} className="h-full w-full" />
      </div>
      <div className="mt-1.5 text-[11px] text-text">
        <FlagDisplay countryCode={photo.countryCode} lat={photo.lat} lon={photo.lon} />{photo.place}
      </div>
      <div className="mt-0.5 font-mono text-[8.5px] tracking-[0.06em] text-muted">
        {photo.lat.toFixed(2)}°{photo.lat >= 0 ? "N" : "S"} {Math.abs(photo.lon).toFixed(2)}°{photo.lon >= 0 ? "E" : "W"}
      </div>
      <div className="mt-0.5 font-mono text-[7.5px] tracking-[0.04em] text-muted/70">
        © OpenStreetMap · CARTO
      </div>
    </div>
  )
}
