"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import "leaflet/dist/leaflet.css"

export interface AtlasPin {
  slug: string
  lat: number
  lon: number
  thumb: string
  caption: string | null
  place: string | null
  flag: string
}

/**
 * The Atlas — every geotagged photo plotted on one dark map. Click a pin to
 * open that frame. This is the "between the fjell and the Caucasus" story made
 * literal: pan from Norway to the Caucasus and watch the work spread across it.
 *
 * Leaflet is imported lazily inside the effect (it touches `window`, so it must
 * never reach the server bundle) and only loads when this page renders.
 */
export function AtlasMap({ pins, className, initialCenter, initialZoom }: {
  pins: AtlasPin[]; className?: string
  initialCenter?: [number, number]
  initialZoom?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  // Keep the latest pins/router reachable from the mount-only effect without
  // re-initialising the whole map when they change.
  const pinsRef = useRef(pins)
  const initialCenterRef = useRef(initialCenter)
  const initialZoomRef = useRef(initialZoom)
  const routerRef = useRef(router)
  useEffect(() => { pinsRef.current = pins }, [pins])
  useEffect(() => { routerRef.current = router }, [router])

  useEffect(() => {
    let map: import("leaflet").Map | undefined
    let cancelled = false

    void (async () => {
      const mod = await import("leaflet")
      const L = mod.default ?? mod
      if (cancelled || !ref.current) return

      const current = pinsRef.current

      map = L.map(ref.current, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
        worldCopyJump: true,
        minZoom: 2,
      })

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
        minZoom: 2,
      }).addTo(map)

      const markers: import("leaflet").Marker[] = []

      for (const pin of current) {
        const marker = L.marker([pin.lat, pin.lon], {
          keyboard: true,
          title: pin.caption ?? pin.place ?? "View frame",
          icon: L.divIcon({
            className: "",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            html:
              '<div style="width:14px;height:14px;border-radius:9999px;background:#e3a857;' +
              'box-shadow:0 0 0 4px rgba(227,168,87,0.2),0 0 12px rgba(227,168,87,0.8);' +
              'cursor:pointer;transition:transform .18s ease"></div>',
          }),
        })

        const label = [pin.flag, pin.place].filter(Boolean).join(" ")
        marker.bindPopup(
          `<a href="/p/${pin.slug}" data-slug="${pin.slug}" style="display:block;width:150px;text-decoration:none;color:inherit">
             <img src="${pin.thumb}" alt="" style="width:150px;height:100px;object-fit:cover;border-radius:4px;display:block" loading="lazy" />
             ${pin.caption ? `<div style="font-style:italic;font-size:12px;margin-top:6px;line-height:1.3;color:#e8e4dc">${escapeHtml(pin.caption)}</div>` : ""}
             ${label ? `<div style="font-family:ui-monospace,monospace;font-size:9px;text-transform:uppercase;letter-spacing:.12em;margin-top:4px;color:#9a948a">${escapeHtml(label)}</div>` : ""}
           </a>`,
          { closeButton: true, className: "atlas-popup", minWidth: 150, maxWidth: 150 },
        )

        marker.addTo(map!)
        markers.push(marker)
      }

      // Intercept popup link clicks → client-side nav (no full reload).
      map.on("popupopen", (e) => {
        const node = (e.popup as import("leaflet").Popup).getElement()
        const anchor = node?.querySelector<HTMLAnchorElement>("a[data-slug]")
        anchor?.addEventListener("click", (ev) => {
          ev.preventDefault()
          routerRef.current.push(`/p/${anchor.dataset.slug}`)
        })
      })

      // If a specific center was requested (e.g. from a photo location link), use it.
      // Otherwise frame around all pins; fall back to a Norway↔Caucasus view.
      const center = initialCenterRef.current
      if (center) {
        map.setView(center, initialZoomRef.current ?? 10)
      } else if (markers.length > 0) {
        const group = L.featureGroup(markers)
        map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 8 })
      } else {
        map.setView([55, 30], 3)
      }
    })()

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [])

  return (
    <div
      ref={ref}
      className={className ? `atlas-map ${className}` : "atlas-map"}
      aria-label="Map of all photo locations"
    />
  )
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  )
}
