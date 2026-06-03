import type { Metadata } from "next"
import { db } from "@/lib/db"
import { cdnBase } from "@/lib/env"
import { listGeoPhotos } from "@/lib/photos"
import { flagEmoji } from "@/lib/format"
import { AtlasMap, type AtlasPin } from "@/components/AtlasMap"
import { EmptyState } from "@/components/EmptyState"
import { NoScroll } from "@/components/NoScroll"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Atlas — Mataev",
  description: "Every geotagged photograph, plotted on a map.",
}

export default async function AtlasPage({ searchParams }: { searchParams: Promise<{ lat?: string; lon?: string; z?: string }> }) {
  const sp = await searchParams
  const centerLat = sp.lat ? parseFloat(sp.lat) : null
  const centerLon = sp.lon ? parseFloat(sp.lon) : null
  const initialCenter = centerLat != null && centerLon != null && !isNaN(centerLat) && !isNaN(centerLon)
    ? ([centerLat, centerLon] as [number, number])
    : undefined
  const initialZoom = sp.z ? parseInt(sp.z) : 11

  const cdn = cdnBase()
  const geo = await listGeoPhotos(db())
  const pins: AtlasPin[] = geo.map((p) => ({
    slug: p.slug,
    lat: p.lat,
    lon: p.lon,
    thumb: `${cdn}/${p.thumb}`,
    caption: p.caption,
    place: p.place,
    flag: flagEmoji(p.countryCode),
  }))

  // Distinct countries, for the small caption line under the header.
  const countries = new Set(geo.map((p) => p.countryCode).filter(Boolean)).size

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <NoScroll />
      <div className="flex items-baseline justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
        <h1 className="font-mono text-[11px] uppercase tracking-[0.28em] text-text">
          <span className="text-amber">▸</span> Atlas
        </h1>
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
          {pins.length} {pins.length === 1 ? "frame" : "frames"}
          {countries > 0 && ` · ${countries} ${countries === 1 ? "country" : "countries"}`}
        </p>
      </div>

      {pins.length === 0 ? (
        <EmptyState label="No geotagged photos yet" />
      ) : (
        <AtlasMap pins={pins} className="flex-1" initialCenter={initialCenter} initialZoom={initialZoom} />
      )}
    </main>
  )
}
