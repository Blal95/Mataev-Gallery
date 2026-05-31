"use client"

import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"

/**
 * A compact interactive locator map. Replaces the old MapTiler static image
 * (static maps are a paid MapTiler feature). Uses Leaflet with CARTO's free,
 * key-less dark raster tiles, so it matches the site's dark theme and needs
 * no API key or build-time generation.
 *
 * Leaflet itself is imported lazily inside the effect so it never ends up in
 * the server bundle (it touches `window`) and is fetched only when a detail
 * view actually renders a map.
 */
export function LocationMap({
  lat,
  lon,
  zoom = 9,
  className,
}: {
  lat: number
  lon: number
  zoom?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let map: import("leaflet").Map | undefined
    let cancelled = false

    void (async () => {
      const mod = await import("leaflet")
      const L = mod.default ?? mod
      if (cancelled || !ref.current) return

      map = L.map(ref.current, {
        center: [lat, lon],
        zoom,
        zoomControl: true,
        attributionControl: false, // credited in the caption instead (tiny box)
        scrollWheelZoom: false, // don't hijack page scroll
        dragging: true,
        doubleClickZoom: true,
      })

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 19,
          minZoom: 2,
        }
      ).addTo(map)

      // Amber locator dot — a divIcon so we ship no marker image assets.
      L.marker([lat, lon], {
        keyboard: false,
        icon: L.divIcon({
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          html: '<div style="width:14px;height:14px;border-radius:9999px;background:#e3a857;box-shadow:0 0 0 4px rgba(227,168,87,0.22),0 0 14px #e3a857"></div>',
        }),
      }).addTo(map)
    })()

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [lat, lon, zoom])

  return <div ref={ref} className={className} aria-label="Location map" />
}
