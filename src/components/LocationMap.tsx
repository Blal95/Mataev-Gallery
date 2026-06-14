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
  interactive = true,
}: {
  lat: number
  lon: number
  zoom?: number
  className?: string
  interactive?: boolean
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
        zoomControl: interactive,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        keyboard: false,
      })

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 19,
          minZoom: 2,
        }
      ).addTo(map)

      // Concentric-ring amber locator — outer ring + bright center dot with glow.
      L.marker([lat, lon], {
        keyboard: false,
        icon: L.divIcon({
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          html:
            '<div style="width:18px;height:18px;position:relative;display:flex;align-items:center;justify-content:center">' +
            '<div style="position:absolute;inset:0;border-radius:50%;background:rgba(227,168,87,0.08);border:1.5px solid rgba(227,168,87,0.32)"></div>' +
            '<div style="width:7px;height:7px;border-radius:50%;background:#e3a857;box-shadow:0 0 0 2px rgba(227,168,87,0.28),0 0 9px rgba(227,168,87,0.72)"></div>' +
            '</div>',
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
